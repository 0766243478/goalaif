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
        });

        if (result?.session_id) {
          // Notify webview — WS forwarding (Fix 1) will deliver sireen.audit.complete
          sidebarProvider.postMessageToWebview({
            command: 'sireen.audit.started',
            payload: { sessionId: result.session_id },
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Gaolaif audit failed: ${msg}`);
      }
    }
  );
}
