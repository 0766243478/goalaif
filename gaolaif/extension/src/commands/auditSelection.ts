import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';
import { SidebarProvider } from '../sidebar/SidebarProvider';

export async function handleAuditSelection(
  backendClient: BackendClient,
  sidebarProvider: SidebarProvider
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Gaolaif: Open a file first');
    return;
  }

  const selection = editor.document.getText(editor.selection);
  if (!selection) {
    vscode.window.showWarningMessage('Gaolaif: Select code to audit');
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const language = editor.document.languageId;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Gaolaif: Auditing code...' },
    async () => {
      try {
        const result = await backendClient.post('/audit/start', {
          code: selection,
          file_path: filePath,
          language,
          session_id: 'session-' + Date.now(),
        });

        if (result?.session_id) {
          // Tell the sidebar to listen for results
          sidebarProvider.postMessageToWebview({
            command: 'auditStarted',
            sessionId: result.session_id,
          });

          // Listen for findings via WebSocket
          backendClient.onMessage('audit_complete', (data: any) => {
            sidebarProvider.postMessageToWebview({
              command: 'auditComplete',
              findings: data.findings,
              patches: data.patches,
            });

            // Apply decorations to editor
            if (data.findings?.length) {
              const { VulnerabilityDecorator } = require('../decorations/vulnerabilityHighlight');
              const decorator = new VulnerabilityDecorator();
              decorator.applyFindings(editor, data.findings);
            }
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Gaolaif audit failed: ${msg}`);
      }
    }
  );
}
