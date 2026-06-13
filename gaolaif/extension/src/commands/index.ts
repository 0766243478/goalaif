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
