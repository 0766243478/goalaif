import * as vscode from 'vscode';

describe('SidebarProvider extension-host and webview smoke checks', () => {
  beforeEach(() => {
    jest.resetModules();
    delete (globalThis as { acquireVsCodeApi?: unknown }).acquireVsCodeApi;
  });

  it('loads in the Node extension host without acquireVsCodeApi and emits renderable production HTML', async () => {
    const { SidebarProvider } = await import('../SidebarProvider');
    const extensionUri = vscode.Uri.parse('C:/extensions/hussein-m.sireen-0.1.1');
    const provider = new SidebarProvider(extensionUri, {} as never);
    const asWebviewUri = jest.fn((uri: vscode.Uri) => vscode.Uri.parse(`vscode-webview://test/${uri.fsPath}`));
    const webview = {
      cspSource: 'vscode-webview://test',
      asWebviewUri,
    } as unknown as vscode.Webview;

    const html = (provider as unknown as { _getHtml(value: vscode.Webview): string })._getHtml(webview);
    const nonce = html.match(/<script nonce="([A-Za-z0-9]{32})"/)?.[1];

    expect(html).toContain('<div id="root"></div>');
    expect(asWebviewUri).toHaveBeenCalledWith(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
    expect(asWebviewUri).toHaveBeenCalledWith(vscode.Uri.joinPath(extensionUri, 'dist', '/'));
    expect(html).toContain('vscode-webview://test/C:/extensions/hussein-m.sireen-0.1.1/dist/webview.js');
    expect(html).toContain("script-src vscode-webview://test 'nonce-");
    expect(nonce).toBeDefined();
    expect(html).toContain(`<script nonce="${nonce}">window.__webpack_public_path__`);
    expect(html).toContain(`<script nonce="${nonce}" src=`);
    expect(html).not.toContain('localhost');
    expect(html).not.toContain('file:///');
    expect(html).not.toContain('C:\\');
  });

  it('configures the extension root so the packaged dist bundle is a permitted webview resource', () => {
    const { SidebarProvider } = require('../SidebarProvider') as typeof import('../SidebarProvider');
    const extensionUri = vscode.Uri.parse('C:/extensions/hussein-m.sireen-0.1.1');
    const provider = new SidebarProvider(extensionUri, {} as never);
    const webview = {
      cspSource: 'vscode-webview://test',
      asWebviewUri: jest.fn((uri: vscode.Uri) => vscode.Uri.parse(`vscode-webview://test/${uri.fsPath}`)),
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn(),
    } as unknown as vscode.Webview;
    const view = { webview } as vscode.WebviewView;

    provider.resolveWebviewView(view);

    expect(view.webview.options.enableScripts).toBe(true);
    expect(view.webview.options.localResourceRoots).toEqual(expect.arrayContaining([
      extensionUri,
      vscode.Uri.joinPath(extensionUri, 'media'),
    ]));
    expect(view.webview.html).toContain('dist/webview.js');
  });
});