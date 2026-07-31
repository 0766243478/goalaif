import * as vscode from 'vscode';
import * as path from 'path';
import { BackendClient } from '../api/backendClient';
import { MessageRouter } from '../messaging/MessageRouter';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _router?: MessageRouter;
  private _listenerRegistered = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly backendClient: BackendClient
  ) {}

  setRouter(router: MessageRouter) {
    this._router = router;
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    if (!this._listenerRegistered) {
      this._listenerRegistered = true;
      webviewView.webview.onDidReceiveMessage(async (message) => {
        if (this._router) {
          await this._router.route(message);
        }
      });
    }
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src ${webview.cspSource};">
  <title>Sireen</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
