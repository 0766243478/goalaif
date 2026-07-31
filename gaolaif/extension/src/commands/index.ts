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
      vscode.window.showInformationMessage(`Sireen switched to ${next} mode`);
    }),
    vscode.commands.registerCommand('sireen.openChat', () => {
      sidebarProvider.postMessageToWebview({
        command: 'sireen.navigate',
        payload: { view: 'chat' },
      });
    }),
    vscode.commands.registerCommand('sireen.openChatWithContext', (args?: any) => {
      const editor = vscode.window.activeTextEditor;
      let context: any = {};

      if (editor) {
        const selection = editor.selection;
        const code = selection.isEmpty ? '' : editor.document.getText(selection);
        context = {
          file: editor.document.uri.fsPath,
          code,
          function: args?.function,
          selection: selection.isEmpty ? undefined : {
            startLine: selection.start.line + 1,
            endLine: selection.end.line + 1,
            code,
          },
        };
      }

      sidebarProvider.postMessageToWebview({
        command: 'sireen.navigate',
        payload: { view: 'chat' },
      });

      setTimeout(() => {
        sidebarProvider.postMessageToWebview({
          command: 'sireen.chat.context',
          payload: context,
        });
      }, 100);
    }),
    vscode.commands.registerCommand('sireen.generateReport', () => {
      handleGenerateReport(backendClient);
    }),
    vscode.commands.registerCommand('sireen.suggestPatch', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);

      const result = await backendClient.post('/patch/generate', {
        code,
        finding: { title: 'Selected code', severity: 'MEDIUM', description: 'User-requested patch' },
      });

      if (result?.patched_code) {
        const doc = await vscode.workspace.openTextDocument({
          content: result.patched_code,
          language: 'solidity',
        });
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    })
  );
}

async function handleAnalyze(
  backendClient: BackendClient,
  sidebarProvider: SidebarProvider,
  explicitCode?: string
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor. Open a Solidity/Move file first.');
    return;
  }
  const selection = editor.selection;
  const code = explicitCode ?? editor.document.getText(selection.isEmpty ? undefined : selection);
  const filePath = editor.document.uri.fsPath;
  const language = filePath.endsWith('.sol') ? 'solidity' : filePath.endsWith('.move') ? 'move' : 'solidity';

  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Sireen: Analyzing...' },
    async () => {
      try {
        const result = await backendClient.analyze(code, filePath, language);
        sidebarProvider.postMessageToWebview({ command: 'sireen.audit.complete', payload: result });
        vscode.window.showInformationMessage(`Sireen analysis complete: ${result.findings?.length || 0} findings`);
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
  await handleAnalyze(backendClient, sidebarProvider, editor.document.getText());
}
