// ============================================================================
// SIREEN — VS Code Extension Entry Point
// ============================================================================
// Registers providers, commands, and the exploit verification pipeline.

import * as vscode from 'vscode';
import { SidebarProvider } from './providers/SidebarProvider';
import { WarRoomProvider } from './providers/WarRoomProvider';
import { PipelineManager } from './pipeline/PipelineManager';
import type { PipelineConfig } from './pipeline/types';
import { DEFAULT_PIPELINE_CONFIG } from './pipeline/types';
import { checkLicense, activateLicense, showLicenseActivation, createLicenseStatusBarItem, updateLicenseStatusBar } from './license/LicenseManager';

let sidebarProvider: SidebarProvider | undefined;
let warRoomProvider: WarRoomProvider | undefined;
let pipelineManager: PipelineManager | undefined;
let licenseStatusBar: vscode.StatusBarItem | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Sireen] Activating extension...');

  // -------------------------------------------------------------------------
  // 1. Initialize War Room Provider
  // -------------------------------------------------------------------------
  warRoomProvider = new WarRoomProvider(context);

  // -------------------------------------------------------------------------
  // 2b. License check & status bar
  // -------------------------------------------------------------------------
  licenseStatusBar = createLicenseStatusBarItem(context);
  context.subscriptions.push(licenseStatusBar);
  await updateLicenseStatusBar(licenseStatusBar, context);

  // -------------------------------------------------------------------------
  // 2c. Initialize Pipeline Manager from config
  // -------------------------------------------------------------------------
  function initPipeline(): PipelineManager {
    const config = vscode.workspace.getConfiguration('sireen');
    const pipelineCfg: PipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      aiProvider: config.get<'openai' | 'anthropic' | 'openrouter'>('aiProvider', 'openrouter'),
      aiApiKey: config.get<string>('aiApiKey', ''),
      aiModel: config.get<string>('aiModel', 'openai/o3-mini'),
      forgePath: config.get<string>('forgePath', 'forge'),
      dockerImage: config.get<string>('dockerImage', 'ghcr.io/foundry-rs/foundry:latest'),
      forkRpcUrl: config.get<string>('forkRpcUrl', ''),
      maxRetries: config.get<number>('maxRetries', 3),
      workspaceDir: config.get<string>('workspaceDir', ''),
      dockerEnabled: config.get<boolean>('dockerEnabled', false),
    };
    pipelineManager = new PipelineManager(pipelineCfg);
    pipelineManager.setContext(context);
    return pipelineManager;
  }

  // -------------------------------------------------------------------------
  // 3. Register Sidebar Webview
  // -------------------------------------------------------------------------
  sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('sireen.sidebar', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // -------------------------------------------------------------------------
  // 5. Wire up Pipeline Manager to Sidebar Provider
  // -------------------------------------------------------------------------
  const pm = initPipeline();
  sidebarProvider.setPipelineManager(pm);

  // -------------------------------------------------------------------------
  // 6. Register Commands
  // -------------------------------------------------------------------------

  // New Investigation
  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.newInvestigation', () => {
      sidebarProvider?.postMessage({ type: 'investigation:create', payload: {} });
    })
  );

  // Run Pipeline — triggers the full exploit verification pipeline
  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.runPipeline', async () => {
      const pm = initPipeline();
      const errors = pm.validateConfig();
      if (errors.length > 0) {
        vscode.window.showErrorMessage(`Sireen Pipeline: ${errors.join('; ')}`);
        return;
      }

      // Get target from active editor or prompt
      const editor = vscode.window.activeTextEditor;
      let sourceCode = '';
      let targetName = '';

      if (editor) {
        sourceCode = editor.document.getText();
        targetName = editor.document.fileName.split(/[/\\]/).pop()?.replace('.sol', '') || 'contract';
      }

      if (!sourceCode.trim()) {
        // Prompt for contract address or file
        const input = await vscode.window.showInputBox({
          prompt: 'Enter contract address (0x...) or paste Solidity code',
          placeHolder: '0x123... or paste code here',
          ignoreFocusOut: true,
        });
        if (!input) return;

        if (input.startsWith('0x') && input.length === 42) {
          // Contract address - would need RPC to fetch source
          vscode.window.showErrorMessage('Contract address fetching not yet implemented. Please paste Solidity code or open a .sol file.');
          return;
        } else {
          sourceCode = input;
          targetName = 'pasted-contract';
        }
      }

      const chain = await vscode.window.showQuickPick(
        ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'base'],
        { placeHolder: 'Select chain', canPickMany: false }
      );
      if (!chain) return;

      const forkUrl = await vscode.window.showInputBox({
        prompt: 'Optional: RPC URL for mainnet forking (Alchemy, Infura, etc.)',
        placeHolder: 'https://eth-mainnet.g.alchemy.com/v2/...',
        ignoreFocusOut: true,
      });

      // Show War Room
      warRoomProvider.show();

      // Show progress
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Sireen Pipeline: ${targetName}`,
          cancellable: true,
        },
        async (progress, token) => {
          const abortController = new AbortController();
          const cancelListener = token.onCancellationRequested(() => {
            abortController.abort();
            cancelListener.dispose();
            warRoomProvider.postMessage({
              type: 'pipeline:status',
              payload: { stage: 'cancelled', message: 'Pipeline cancelled by user.' },
            });
          });

          try {
            const result = await pm.run({
              target: {
                type: 'source_code',
                value: targetName,
                chain,
                name: targetName,
              },
              sourceCode,
              forkUrl: forkUrl || undefined,
              onEvent: (event) => {
                const msg = `[${event.stage}] ${event.message}`;
                progress.report({ message: msg });

                warRoomProvider.postMessage({
                  type: 'pipeline:status',
                  payload: { stage: event.stage, message: event.message, data: event.data },
                });

                sidebarProvider?.postMessage({
                  type: 'chat:stream',
                  payload: {
                    message: {
                      role: 'assistant',
                      content: msg,
                      status: 'complete' as const,
                      id: `pipeline-${event.stage}-${Date.now()}`,
                      timestamp: Date.now(),
                    },
                  },
                });
              },
              signal: abortController.signal,
            });

            // Send final result
            if (result.success && result.report) {
              warRoomProvider.postMessage({
                type: 'pipeline:complete',
                payload: { report: result.report },
              });

              sidebarProvider?.postMessage({
                type: 'chat:stream',
                payload: {
                  message: {
                    role: 'assistant',
                    content: `## Pipeline Complete\n\n**Verdict:** ${result.report.verdict.toUpperCase()}\n\n${result.report.summary}`,
                    status: 'complete' as const,
                    id: `pipeline-result-${Date.now()}`,
                    timestamp: Date.now(),
                  },
                },
              });

              // Store report in workspace state
              context.workspaceState.update(`report:${result.report.id}`, result.report);
            } else {
              warRoomProvider.postMessage({
                type: 'pipeline:error',
                payload: { error: result.error || 'Unknown error', stage: result.stage },
              });

              sidebarProvider?.postMessage({
                type: 'chat:stream',
                payload: {
                  message: {
                    role: 'assistant',
                    content: `## Pipeline Failed\n\n**Error:** ${result.error || 'Unknown error'}\n**Stage:** ${result.stage}`,
                    status: 'complete' as const,
                    id: `pipeline-error-${Date.now()}`,
                    timestamp: Date.now(),
                  },
                },
              });
            }
          } catch (err) {
            warRoomProvider.postMessage({
              type: 'pipeline:error',
              payload: { error: err instanceof Error ? err.message : 'Unknown error', stage: 'exception' },
            });
          } finally {
            cancelListener.dispose();
          }
        }
      );
    })
  );

  // War Room
  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.openWarRoom', () => {
      warRoomProvider.show();
    })
  );

  // Report Viewer (reuses War Room)
  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.openReportViewer', () => {
      warRoomProvider.show();
    })
  );

  // Focus Input
  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.focusInput', () => {
      sidebarProvider?.postMessage({ type: 'focus:input', payload: {} });
    })
  );

  // License Management
  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.enterLicense', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your Sireen license key',
        placeHolder: 'SIR-XXXX-XXXX-XXXX',
        ignoreFocusOut: true,
        password: false,
      });
      if (key) {
        const valid = validateLicenseKey(key);
        if (valid) {
          await context.globalState.update('sireen.licenseKey', key);
          await context.globalState.update('sireen.licenseValidated', Date.now());
          vscode.window.showInformationMessage('License validated successfully!');
        } else {
          vscode.window.showErrorMessage('Invalid license key format');
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('sireen.checkLicense', async () => {
      const key = context.globalState.get<string>('sireen.licenseKey', '');
      const validated = context.globalState.get<number>('sireen.licenseValidated', 0);
      if (key && validated) {
        vscode.window.showInformationMessage(`License active: ${key.slice(0, 8)}...`);
      } else {
        vscode.window.showInformationMessage('No valid license found. Free trial available.');
      }
    })
  );

  // -------------------------------------------------------------------------
  // 5. Listen for theme changes
  // -------------------------------------------------------------------------
  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      sidebarProvider?.postMessage({
        type: 'theme:change',
        payload: { kind: theme.kind },
      });
      warRoomProvider.postMessage({
        type: 'theme:change',
        payload: { kind: theme.kind },
      });
    })
  );

  // -------------------------------------------------------------------------
  // 6. First-run: Check configuration and show setup wizard
  // -------------------------------------------------------------------------
  const hasRunBefore = context.globalState.get('sireen.hasRunBefore', false);
  if (!hasRunBefore) {
    await runFirstTimeSetup(context);
    context.globalState.update('sireen.hasRunBefore', true);
  }

  console.log('[Sireen] Extension activated successfully.');
}

async function runFirstTimeSetup(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('sireen');
  const aiApiKey = config.get<string>('aiApiKey', '');

  if (!aiApiKey) {
    const action = await vscode.window.showInformationMessage(
      'Welcome to Sireen! You need an LLM API key to run the exploit verification pipeline.',
      'Set API Key Now',
      'Later'
    );

    if (action === 'Set API Key Now') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'sireen.aiApiKey');
    }
  }

  // Check Docker and Foundry
  const dockerCheck = await checkDockerAndFoundry();
  if (!dockerCheck.docker) {
    vscode.window.showWarningMessage(
      'Docker not detected. Pipeline will run in host mode (requires Foundry installed).',
      'Install Docker',
      'OK'
    ).then((selection) => {
      if (selection === 'Install Docker') {
        vscode.env.openExternal(vscode.Uri.parse('https://www.docker.com/get-started'));
      }
    });
  }

  if (!dockerCheck.foundry) {
    vscode.window.showWarningMessage(
      'Foundry (forge) not found in PATH. Install it for host mode execution.',
      'Install Foundry',
      'OK'
    ).then((selection) => {
      if (selection === 'Install Foundry') {
        vscode.env.openExternal(vscode.Uri.parse('https://getfoundry.sh/'));
      }
    });
  }
}

async function checkDockerAndFoundry(): Promise<{ docker: boolean; foundry: boolean }> {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  let docker = false;
  let foundry = false;

  try {
    await execAsync('docker --version', { timeout: 5000 });
    docker = true;
  } catch {}

  try {
    await execAsync('forge --version', { timeout: 5000 });
    foundry = true;
  } catch {}

  return { docker, foundry };
}

/**
 * Validate license key format: SIR-XXXX-XXXX-XXXX
 * In production, this would verify against a licensing server.
 */
function validateLicenseKey(key: string): boolean {
  // Simple format validation: SIR-XXXX-XXXX-XXXX (X = alphanumeric)
  const pattern = /^SIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key.toUpperCase());
}

export function deactivate() {
  console.log('[Sireen] Extension deactivated.');
}