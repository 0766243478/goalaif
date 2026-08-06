import * as vscode from 'vscode';
import * as path from 'path';
import { BackendClient } from '../api/backendClient';
import { MessageRouter } from '../messaging/MessageRouter';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _router?: MessageRouter;
  private _listenerRegistered = false;
  private _iconUri?: vscode.Uri;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly backendClient: BackendClient
  ) {}

  setRouter(router: MessageRouter) {
    this._router = router;
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    // Include both dist/ AND media/ folders as accessible resource roots
    const mediaRoot = vscode.Uri.joinPath(this.extensionUri, 'media');
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri, mediaRoot],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    // Cache the icon URI so we can send it on demand when the webview requests it.
    this._iconUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'icon.png')
    );

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

  sendMediaConfig() {
    if (this._iconUri) {
      this.postMessageToWebview({
        command: 'sireen.media.config',
        payload: { iconUri: this._iconUri.toString() },
      });
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );

    // The dist folder URI — used as webpack publicPath for dynamic chunk loading
    const distUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', '/')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <title>Sireen</title>
</head>
<body>
  <div id="root"></div>
  <script>
    // Set webpack public path so dynamic imports (lazy chunks) resolve correctly
    window.__webpack_public_path__ = '${distUri}';
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
