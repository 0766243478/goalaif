import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';
import { SidebarProvider } from '../sidebar/SidebarProvider';
import { handleAuditSelection } from './auditSelection';
import { handleExploitSelection } from './exploitSelection';
import { handleRunSandbox } from './runSandbox';
import { handleGenerateReport } from './generateReport';

export function registerCommands(
  context: vscode.ExtensionContext,
  backendClient: BackendClient,
  sidebarProvider: SidebarProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('gaolaif.auditSelection', () =>
      handleAuditSelection(backendClient, sidebarProvider)
    ),
    vscode.commands.registerCommand('gaolaif.exploitSelection', () =>
      handleExploitSelection(backendClient, sidebarProvider)
    ),
    vscode.commands.registerCommand('gaolaif.analyze', () =>
      handleAnalyze(backendClient, sidebarProvider)
    ),
    vscode.commands.registerCommand('gaolaif.analyzeCurrentFile', () =>
      handleAnalyzeCurrentFile(backendClient, sidebarProvider)
    ),
    vscode.commands.registerCommand('gaolaif.runSandbox', () =>
      handleRunSandbox(backendClient)
    ),
    vscode.commands.registerCommand('gaolaif.generateReport', () =>
      handleGenerateReport(backendClient)
    ),
    vscode.commands.registerCommand('gaolaif.executePoC', () => {
      vscode.window.showInformationMessage('Execute PoC: select a generated PoC file first');
    }),
    vscode.commands.registerCommand('gaolaif.switchMode', () => {
      const config = vscode.workspace.getConfiguration('gaolaif');
      const current = config.get('mode', 'protocol');
      const next = current === 'protocol' ? 'hacker' : 'protocol';
      config.update('mode', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Gaolaif switched to ${next} mode`);
    })
  );
}

async function handleAnalyze(
  backendClient: BackendClient,
  sidebarProvider: SidebarProvider
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor. Open a Solidity/Move file first.');
    return;
  }
  const selection = editor.selection;
  const code = editor.document.getText(selection.isEmpty ? undefined : selection);
  const filePath = editor.document.uri.fsPath;
  const language = filePath.endsWith('.sol') ? 'solidity' : filePath.endsWith('.move') ? 'move' : 'solidity';

  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Gaolaif: Analyzing...' },
    async () => {
      try {
        const result = await backendClient.analyze(code, filePath, language);
        sidebarProvider.postMessageToWebview({ type: 'analysisResult', payload: result });
        vscode.window.showInformationMessage(`Gaolaif analysis complete: ${result.findings?.length || 0} findings`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Analysis failed: ${err.message}`);
      }
    }
  );
}

async function handleAnalyzeCurrentFile(
  backendClient: BackendClient,
  sidebarProvider: SidebarProvider
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor.');
    return;
  }
  editor.selection = new vscode.Selection(0, 0, editor.document.lineCount - 1, 0);
  await handleAnalyze(backendClient, sidebarProvider);
}
