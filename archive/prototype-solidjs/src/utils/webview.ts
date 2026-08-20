// ============================================================================
// SIREEN — Webview HTML Generation Utility
// ============================================================================

import * as vscode from 'vscode';

const scriptMap: Record<string, string> = {
  'sidebar': 'dist/webview/sidebar.js',
  'attack-workspace': 'dist/webview/attack-workspace.js',
  'knowledge-graph': 'dist/webview/knowledge-graph.js',
  'report-viewer': 'dist/webview/report-viewer.js',
  'war-room': 'dist/webview/war-room.js',
  'bounty-dashboard': 'dist/webview/bounty-dashboard.js',
  'settings': 'dist/webview/settings.js',
};

const panelTitles: Record<string, string> = {
  'sidebar': 'Sireen — Investigation',
  'attack-workspace': 'Sireen — Live Attack Workspace',
  'knowledge-graph': 'Sireen — Knowledge Graph',
  'report-viewer': 'Sireen — Report Viewer',
  'war-room': 'Sireen — War Room',
  'bounty-dashboard': 'Sireen — Bug Bounty Dashboard',
  'settings': 'Sireen — Settings',
};

export function getWebviewScriptUri(webview: vscode.Webview, extensionUri: vscode.Uri, panelId: string): vscode.Uri {
  const scriptPath = scriptMap[panelId] || scriptMap['sidebar'];
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, scriptPath));
}

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  panelId: string,
  codiconsUri?: vscode.Uri
): string {
  const scriptUri = getWebviewScriptUri(webview, extensionUri, panelId);
  const nonce = getNonce();
  const title = panelTitles[panelId] || 'Sireen';
  const initialState = JSON.stringify({ panelId, version: '0.1.0' }).replace(/'/g, "\\'");

  // CSP: Allow font-src from webview (for codicon.css @font-face) and style-src for inline styles
  const cspFontSrc = `${webview.cspSource}`;
  const cspStyleSrc = `${webview.cspSource} 'unsafe-inline'`;

  const codiconLink = codiconsUri ? `<link href="${codiconsUri}" rel="stylesheet" />` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${cspStyleSrc}; img-src ${webview.cspSource} data:; font-src ${cspFontSrc}; connect-src 'none';">
  <title>${title}</title>
  ${codiconLink}
</head>
<body>
  <div id="root" data-panel="${panelId}" data-state='${initialState}'></div>
  <script nonce="${nonce}">
    window.addEventListener('error', function(e) {
      if (window.acquireVsCodeApi) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage({ type: 'error', payload: { message: e.message || 'Script error' } });
      }
      e.preventDefault();
    });
    window.addEventListener('unhandledrejection', function(e) {
      if (window.acquireVsCodeApi) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage({ type: 'error', payload: { message: e.reason?.message || 'Unhandled Promise rejection' } });
      }
      e.preventDefault();
    });
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  let text = '';
  for (let i = 0; i < 64; i++) {
    text += chars.charAt(array[i] % chars.length);
  }
  return text;
}
