import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { BackendClient } from './api/backendClient';
import { VulnerabilityDecorator } from './decorations/vulnerabilityHighlight';
import { registerCommands } from './commands';

let backendClient: BackendClient;

export async function activate(context: vscode.ExtensionContext) {
  backendClient = new BackendClient(context);
  await backendClient.startBackend();

  const sidebarProvider = new SidebarProvider(context.extensionUri, backendClient);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gaolaif.sidebar', sidebarProvider)
  );

  registerCommands(context, backendClient, sidebarProvider);

  const projectType = await detectProjectType();
  if (projectType) {
    vscode.window.showInformationMessage(
      `Gaolaif: Detected ${projectType} project. Sandbox ready.`,
      'Start Sandbox'
    ).then(action => {
      if (action === 'Start Sandbox') {
        vscode.commands.executeCommand('gaolaif.runSandbox');
      }
    });
  }
}

async function detectProjectType(): Promise<'solidity' | 'move' | null> {
  const foundryToml = await vscode.workspace.findFiles('**/foundry.toml', null, 1);
  if (foundryToml.length > 0) return 'solidity';
  const moveToml = await vscode.workspace.findFiles('**/Move.toml', null, 1);
  if (moveToml.length > 0) return 'move';
  return null;
}

export function deactivate() {
  backendClient?.stopBackend();
}
