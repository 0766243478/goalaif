import * as vscode from 'vscode';
import * as path from 'path';
import { BackendClient } from '../api/backendClient';
import { MessageRouter } from '../messaging/MessageRouter';
import { SireenEvent, EventType } from '../sidebar/webview/types';
import { SessionManager, type SessionState } from '../session';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _router?: MessageRouter;
  private _iconUri?: vscode.Uri;
  private _sessionId: string = '';
  private _sessionManager: SessionManager;
  private _sessions: Map<string, SessionState> = new Map();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly backendClient: BackendClient
  ) {
    this._sessionManager = new SessionManager((session) => {
      this._sessions.set(session.id, session);
      this.onSessionChange(session);
    });
  }

  getSessionManager(): SessionManager {
    return this._sessionManager;
  }

  getSessions(): Map<string, SessionState> {
    return this._sessions;
  }

  setRouter(router: MessageRouter) {
    this._router = router;
  }

  /** Get the current session ID, persisted across webview resolves */
  getSessionId(): string {
    return this._sessionId;
  }

  /** Get current session via SessionManager */
  getCurrentSession(): SessionState | null {
    return this._sessionManager.getCurrent();
  }

  /** Switch active session */
  async switchSession(sessionId: string): Promise<boolean> {
    const session = await this._sessionManager.load(sessionId);
    if (session) {
      this._sessionId = sessionId;
      this.postMessageToWebview({
        command: 'sireen.session.switched',
        payload: {
          session_id: sessionId,
          name: session.name,
          project: session.project,
        },
      });
      return true;
    }
    return false;
  }

  /** Create a new session and switch to it */
  async createSession(name?: string, project?: string): Promise<string | null> {
    const session = await this._sessionManager.create({
      name: name || `Session ${this._sessions.size + 1}`,
      project: project || 'default',
    });
    this._sessions.set(session.id, session);
    // Switch to new session
    await this.switchSession(session.id);
    // Notify UI
    this.postMessageToWebview({
      command: 'sireen.session.created',
      payload: {
        session_id: session.id,
        name: session.name,
        project: session.project,
      },
    });
    return session.id;
  }

  /** List all sessions */
  async listSessions(): Promise<SessionState[]> {
    return this._sessionManager.list();
  }

  /** Delete a session */
  async deleteSession(sessionId: string): Promise<boolean> {
    const success = await this._sessionManager.delete(sessionId);
    if (success) {
      this._sessions.delete(sessionId);
      // If we're deleting the current session, switch to first available
      if (this._sessionId === sessionId) {
        const remaining = Array.from(this._sessions.keys());
        if (remaining.length > 0) {
          await this.switchSession(remaining[0]);
        } else {
          this._sessionId = '';
          this.postMessageToWebview({
            command: 'sireen.session.deleted',
            payload: { session_id: sessionId },
          });
        }
      }
    }
    return success;
  }

  /** Restore session from workspace state on startup */
  async restoreSession(): Promise<string | null> {
    const sessions = await this.listSessions();
    if (sessions.length > 0) {
      // Restore last active session or first one
      const lastActive = sessions.find(s => s.status === 'active') || sessions[0];
      await this.switchSession(lastActive.id);
      console.log(`[SidebarProvider] Restored session: ${lastActive.id}`);
      return lastActive.id;
    }
    return null;
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

    // CRITICAL: Register the message listener on EVERY resolve. VS Code can recreate
    // the webview view (e.g. when the user collapses/reopens the sidebar), and the
    // previous webview's onDidReceiveMessage disposable is disposed with it.
    // Without this, the new webview would be silent (no 'message' listener registered).
    // We MUST register on every resolve, not cache a disposable.
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (this._router) {
        await this._router.route(message);
      }
    });

    // If this is a session restore, forward the session ID to the webview
    if (this._sessionId) {
      const session = this._sessions.get(this._sessionId);
      this.postMessageToWebview({
        command: 'sireen.session.restored',
        payload: {
          session_id: this._sessionId,
          name: session?.name || '',
          project: session?.project || '',
        },
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

  /** Forward session-aware events to webview */
  private onSessionChange(session: SessionState) {
    // Update store with session data
    this.postMessageToWebview({
      command: 'sireen.session.update',
      payload: {
        session_id: session.id,
        audit_phase: session.auditPhase,
        audit_progress: session.auditProgress,
        findings_count: session.findings.length,
        exploits_count: session.exploits.length,
      },
    });
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src ${webview.cspSource} 'unsafe-eval'; img-src ${webview.cspSource} data:;">
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
