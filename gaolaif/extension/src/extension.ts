import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { BackendClient } from './api/backendClient';
import { VulnerabilityDecorator } from './decorations/vulnerabilityHighlight';
import { registerCommands } from './commands';
import { MessageRouter } from './messaging/MessageRouter';
import { SireenCodeLensProvider } from './editor/sireenCodeLens';
import { SireenDiagnostics } from './editor/sireenDiagnostics';
import { SireenHoverProvider } from './editor/sireenHover';
import { SireenCodeActionProvider } from './editor/sireenCodeActions';

let backendClient: BackendClient;
let diagnostics: SireenDiagnostics;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Sireen] Extension activating...');
  vscode.window.showInformationMessage('Sireen extension activated successfully!');
  backendClient = new BackendClient(context);

  const sidebarProvider = new SidebarProvider(context.extensionUri, backendClient);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('gaolaif.sidebar', sidebarProvider, {
      retainContextWhenHidden: true,
    } as any)
  );

  const router = new MessageRouter(backendClient, sidebarProvider);
  sidebarProvider.setRouter(router);

  diagnostics = new SireenDiagnostics();
  context.subscriptions.push(diagnostics);

  const codeLensProvider = new SireenCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'solidity', scheme: 'file' },
      codeLensProvider
    )
  );

  const hoverProvider = new SireenHoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: 'solidity', scheme: 'file' },
      hoverProvider
    )
  );

  const codeActionProvider = new SireenCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: 'solidity', scheme: 'file' },
      codeActionProvider,
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  registerCommands(context, backendClient, sidebarProvider);

  backendClient.startBackend().then(() => {
    sidebarProvider.postMessageToWebview({
      command: 'sireen.connection.status',
      payload: { status: 'connected' },
    });
  }).catch(() => {
    sidebarProvider.postMessageToWebview({
      command: 'sireen.connection.status',
      payload: { status: 'disconnected' },
    });
  });

  // Listen for connection state changes (reconnecting, failed, etc.) and forward to UI
  backendClient.on('connectionStateChange', (state) => {
    sidebarProvider.postMessageToWebview({
      command: 'sireen.connection.status',
      payload: { status: state },
    });
  });

  const projectType = await detectProjectType();
  if (projectType) {
    sidebarProvider.postMessageToWebview({
      command: 'sireen.protocol.detected',
      payload: {
        name: projectType === 'solidity' ? 'Solidity Project' : 'Move Project',
        chain: 'unknown',
        totalContracts: 0,
        totalFunctions: 0,
        findingsSummary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        riskScore: 0,
        attackSurfaces: [],
      },
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
  diagnostics?.dispose();
}
