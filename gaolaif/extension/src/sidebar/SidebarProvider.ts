import * as vscode from 'vscode';
import * as path from 'path';
import { BackendClient } from '../api/backendClient';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly backendClient: BackendClient
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'gaolaif.auditSelection':
          vscode.commands.executeCommand('gaolaif.auditSelection');
          break;
        case 'gaolaif.exploitSelection':
          vscode.commands.executeCommand('gaolaif.exploitSelection');
          break;
        case 'gaolaif.runSandbox':
          vscode.commands.executeCommand('gaolaif.runSandbox');
          break;
        case 'gaolaif.generateReport':
          vscode.commands.executeCommand('gaolaif.generateReport');
          break;
        case 'gaolaif.executePoC':
          vscode.commands.executeCommand('gaolaif.executePoC');
          break;
        case 'switchMode':
          vscode.commands.executeCommand('gaolaif.switchMode');
          break;
        case 'exploitWithIdea':
          this._handleExploitWithIdea(message);
          break;
        case 'getMemory':
          this._handleGetMemory(message);
          break;
      }
    });
  }

  private async _handleExploitWithIdea(message: any) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const code = editor.document.getText(editor.selection) || message.code;
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Gaolaif: Generating PoC...' },
      async () => {
        try {
          const result = await this.backendClient.post('/exploit/start', {
            code,
            idea: message.idea,
            target_function: message.targetFunction || '',
            session_id: 'exploit-' + Date.now(),
            rpc_url: vscode.workspace.getConfiguration('gaolaif').get('defaultRpcEvm'),
          });

          if (result?.session_id) {
            this.postMessageToWebview({
              command: 'exploitStarted',
              sessionId: result.session_id,
            });

            this.backendClient.onMessage('exploit_result', (data: any) => {
              this.postMessageToWebview({ command: 'exploitResult', ...data });
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.postMessageToWebview({ command: 'exploitError', error: msg });
        }
      }
    );
  }

  private async _handleGetMemory(message: any) {
    try {
      const result = await this.backendClient.get(
        `/memory/similar?code_snippet=${encodeURIComponent(message.snippet)}&mode=${message.mode}`
      );
      this.postMessageToWebview({ command: 'memoryResult', entries: result });
    } catch { /* ignore */ }
  }

  postMessageToWebview(message: any) {
    this._view?.webview.postMessage(message);
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${webview.cspSource};">
  <title>Gaolaif</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
