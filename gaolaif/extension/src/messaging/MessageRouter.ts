import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';
import { SidebarProvider } from '../sidebar/SidebarProvider';
import { SireenEvent, EventType, EventStatus } from '../sidebar/webview/types';

type Handler = (event: SireenEvent | Record<string, unknown>) => void | Promise<void>;

export class MessageRouter {
  private handlers = new Map<string, Handler>();
  private _onFindingsCallback?: (findings: SireenEvent['payload'][]) => void;

  constructor(
    private backendClient: BackendClient,
    private sidebarProvider: SidebarProvider
  ) {
    this.registerDefaults();
    this.forwardWebSocketEvents();
  }

  /** Register a callback to be invoked when findings arrive. */
  onFindings(callback: (findings: SireenEvent['payload'][]) => void) {
    this._onFindingsCallback = callback;
  }

  /** Generate a canonical SireenEvent with event_id and session_id.
   * All events flow through this central point for one-source-of-truth guarantees.
   */
  private makeEvent(
    type: EventType,
    status: EventStatus,
    payload: any,
    correlation_id?: string,
    agentId?: string
  ): SireenEvent {
    const currentSession = this.sidebarProvider.getSessionId();
    // Inject session_id into payload if not already present
    if (!payload?.session_id) {
      payload = { ...payload, session_id: currentSession };
    }
    return {
      event_id: crypto.randomUUID(),
      session_id: currentSession,
      task_id: payload.task_id,
      agent_id: agentId,
      timestamp: Date.now(),
      type,
      status,
      payload,
      correlation_id,
    };
  }

  private forwardWebSocketEvents() {
    // Map backend WS event names �+' SireenEvent types that the UI understands
    const eventMap: Record<string, { type: EventType; status: EventStatus }> = {
      'progress': { type: 'audit_progress', status: 'running' },
      'complete': { type: 'audit_complete', status: 'completed' },
      'phase1_complete': { type: 'audit_phase1_complete', status: 'completed' },
      'phase2_complete': { type: 'audit_phase2_complete', status: 'completed' },
      'phase3_complete': { type: 'audit_phase3_complete', status: 'completed' },
      'phase4_complete': { type: 'audit_phase4_complete', status: 'completed' },
      'chat.message': { type: 'chat_message', status: 'completed' },
      'error': { type: 'audit_progress', status: 'failed' },
      'thinking.start': { type: 'thinking_start', status: 'running' },
      'thinking.step': { type: 'thinking_step', status: 'running' },
      'thinking.end': { type: 'thinking_end', status: 'completed' },
    };
    for (const [backendEvent, eventDef] of Object.entries(eventMap)) {
      this.backendClient.onMessage(backendEvent, (payload) => {
        const event = this.makeEvent(eventDef.type, eventDef.status, payload);
        // When audit completes, forward findings to editor integration
        // (diagnostics + decorations) so they appear as squiggles in the code.
        if (event.type === 'audit_complete' && this._onFindingsCallback) {
          const findings = (payload as Record<string, unknown>)?.findings;
          if (findings && Array.isArray(findings) && findings.length > 0) {
            this._onFindingsCallback(findings as SireenEvent['payload'][]);
          } else {
            // Zero-finding rule: Never fabricate success. If no findings,
            // emit AUDIT_INCOMPLETE instead of hiding the failure.
            this.sidebarProvider.postMessageToWebview({
              command: 'sireen.audit.incomplete',
              payload: { reason: findings ? (Array.isArray(findings) && findings.length === 0 ? 'No findings produced' : 'Analysis error') : 'No findings produced' },
            });
          }
        }
        // Forward timeline event to store for UI display
        if (event.type.startsWith('audit_phase')) {
          this.sidebarProvider.postMessageToWebview({
            command: 'sireen.timeline.event',
            payload: event,
          });
        }
        this.sidebarProvider.postMessageToWebview({
          command: `sireen.${event.type}`,
          payload: event,
        });
      });
    }

    // Forward exploit results via the SINGLE canonical 'sireen.exploit.complete' command.
    // Previously we posted BOTH a legacy 'exploitResult' and 'sireen.exploit.complete',
    // which doubled message traffic and forced consumers to dedupe. One command, one source of truth.
    this.backendClient.onMessage('exploit_result', (payload) => {
      const p = payload as Record<string, unknown>;
      const event = this.makeEvent('exploit_complete', 'completed', p);
      // Preserve the legacy field names HackerMode's PoCResultPanel reads,
      // so the component does not need a separate legacy command.
      event.payload.money_flow = p.money_flow || undefined;
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.exploit.complete',
        payload: event,
      });
    });
  }

  private registerDefaults() {
    this.on('sireen.media.request', async () => {
      this.sidebarProvider.sendMediaConfig();
    });

    this.on('sireen.session.create', async (p) => {
      const name = (p as Record<string, unknown>).name as string | undefined;
      const project = (p as Record<string, unknown>).project as string | undefined;
      const sessionId = await this.sidebarProvider.createSession(name, project);
      if (sessionId) {
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.session.created',
          payload: { session_id: sessionId, name, project },
        });
      }
    });

    this.on('sireen.session.switch', async (p) => {
      const sessionId = (p as Record<string, unknown>).session_id as string;
      const success = await this.sidebarProvider.switchSession(sessionId);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.switched',
        payload: { session_id: sessionId, success },
      });
    });

    this.on('sireen.session.list', async (_p) => {
      const sessions = await this.sidebarProvider.listSessions();
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.list',
        payload: { sessions: sessions.map(s => ({
          session_id: s.id,
          name: s.name,
          project: s.project,
          status: s.status,
          audit_phase: s.auditPhase,
          findings_count: s.findings.length,
          exploits_count: s.exploits.length,
          created_at: s.timeline[0]?.timestamp || Date.now(),
        })) },
      });
    });

    this.on('sireen.session.delete', async (p) => {
      const sessionId = (p as Record<string, unknown>).session_id as string;
      const success = await this.sidebarProvider.deleteSession(sessionId);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.deleted',
        payload: { session_id: sessionId, success },
      });
    });

    this.on('sireen.audit.request', async (p) => {
      const result = await this.backendClient.post('/audit/start', p);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.audit.started',
        payload: result,
      });
    });

    this.on('sireen.exploit.request', async (p) => {
      const result = await this.backendClient.post('/exploit/start', p);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.exploit.started',
        payload: result,
      });
    });

    this.on('sireen.chat.send', async (p) => {
      if (this.backendClient.connected) {
        this.backendClient.sendWebSocket({
          type: 'chat',
          payload: {
            message: (p as Record<string, unknown>).message,
            session_id: (p as Record<string, unknown>).session_id,
            context: (p as Record<string, unknown>).context,
          },
        });
      } else {
        try {
          const result = await this.backendClient.post('/chat', p as object);
          this.sidebarProvider.postMessageToWebview({
            command: 'sireen.chat.message',
            payload: result,
          });
        } catch (err) {
          this.sidebarProvider.postMessageToWebview({
            command: 'sireen.error',
            payload: { command: 'sireen.chat.send', error: err instanceof Error ? err.message : String(err) },
          });
        }
      }
    });

    this.on('sireen.chat slash', async (p) => {
      const command = (p as Record<string, unknown>).command as string;
      const args = (p as Record<string, unknown>).args as string;
      const context = (p as Record<string, unknown>).context || {};
      // The webview models the active selection as { selection: { code } },
      // not as a flat `code` field. Read both shapes so slash commands act on
      // the currently selected code instead of stale/empty context (H-1 fix).
      const selectedCode =
        ((context as Record<string, unknown>).selection as Record<string, unknown> | undefined)?.code as string ||
        ((context as Record<string, unknown>).code as string) ||
        '';

      if (command === 'analyze') {
        const result = await this.backendClient.post('/analyze', {
          code: selectedCode,
          file_path: (context as Record<string, unknown>).file as string || '',
          language: 'solidity',
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.audit.complete',
          payload: result,
        });
      } else if (command === 'exploit') {
        const result = await this.backendClient.post('/exploit/start', {
          code: selectedCode,
          idea: args,
          target_function: (context as Record<string, unknown>).function as string || '',
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.exploit.started',
          payload: result,
        });
      } else if (command === 'patch') {
        const result = await this.backendClient.post('/patch/generate', {
          code: selectedCode,
          finding: (context as Record<string, unknown>).finding || {},
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.patch.result',
          payload: result,
        });
      } else if (command === 'report') {
        const result = await this.backendClient.post('/report/export', {
          session_id: (context as Record<string, unknown>).sessionId as string || '',
          format: 'markdown',
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.report.generated',
          payload: result,
        });
      } else if (command === 'search') {
        const result = await this.backendClient.post('/memory/search', {
          query: args,
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.memory.results',
          payload: result,
        });
      } else if (command === 'explain') {
        const result = await this.backendClient.post('/explain', {
          code: selectedCode,
          question: args,
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.chat.message',
          payload: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: (result as Record<string, unknown>)?.explanation || 'Unable to explain.',
            timestamp: Date.now(),
          },
        });
      }
    });

    this.on('sireen.memory.search', async (p) => {
      const result = await this.backendClient.post('/memory/search', p);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.memory.results',
        payload: result,
      });
    });

    this.on('sireen.findings.jumpTo', async (p) => {
      const filePath = (p as Record<string, unknown>).file as string;
      const line = ((p as Record<string, unknown>).line as number) || 1;
      if (filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(line - 1, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      }
    });

    this.on('sireen.patch.request', async (p) => {
      const result = await this.backendClient.post('/patch/generate', p);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.patch.result',
        payload: result,
      });
    });

    this.on('sireen.report.generate', async (p) => {
      const result = await this.backendClient.post('/report/export', p);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.report.generated',
        payload: result,
      });
    });

    this.on('sireen.settings.setApiKey', async (p) => {
      const result = await this.backendClient.post('/config/set-key', { key: (p as Record<string, unknown>).key });
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.apiKey.status',
        payload: { configured: (result as Record<string, unknown>)?.status === 'ok' },
      });
    });

    this.on('sireen.navigate', async (p) => {
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.navigate',
        payload: { view: (p as Record<string, unknown>).view },
      });
    });

    this.on('sireen.apiKey.status', async () => {
      try {
        const health = await this.backendClient.get('/health');
        const configured = !!(health as Record<string, unknown>)?.models_configured;
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.apiKey.status',
          payload: { configured },
        });
      } catch {
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.apiKey.status',
          payload: { configured: false },
        });
      }
    });

    this.on('sireen.setRightPanel', async (p) => {
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.setRightPanel',
        payload: p,
      });
    });

    this.on('sireen.sandbox.start', async (p) => {
      const config = vscode.workspace.getConfiguration('gaolaif');
      const rpcUrl = ((p as Record<string, unknown>).rpcUrl as string) || config.get('defaultRpcEvm', 'https://eth.llamarpc.com');

      const result = await this.backendClient.post('/sandbox/start', {
        language: 'solidity',
        fork_url: rpcUrl,
        session_id: `session-${Date.now()}`,
      });

      if (result?.rpc_url) {
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.sandbox.started',
          payload: { rpc_url: result.rpc_url },
        });
      } else if (result?.container_id) {
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.sandbox.started',
          payload: { container_id: result.container_id },
        });
      }
    });

    // �"?�"? Session Management (SQLite-backed) �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?
    // Every audit, chat, exploit, report, note, and task belongs to a Session.
    // The session persists the ENTIRE workspace state to SQLite so closing
    // VS Code never loses the user's work.

    this.on('sireen.session.create', async (p) => {
      const result = await this.backendClient.post('/sessions/create', p);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.created',
        payload: result,
      });
    });

    this.on('sireen.session.list', async (p) => {
      const params = new URLSearchParams();
      if ((p as Record<string, unknown>).status) params.set('status', (p as Record<string, unknown>).status as string);
      if ((p as Record<string, unknown>).search) params.set('search', (p as Record<string, unknown>).search as string);
      if ((p as Record<string, unknown>).sort_by) params.set('sort_by', (p as Record<string, unknown>).sort_by as string);
      if ((p as Record<string, unknown>).sort_order) params.set('sort_order', (p as Record<string, unknown>).sort_order as string);
      const result = await this.backendClient.get(`/sessions/list?${params.toString()}`);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.listed',
        payload: result,
      });
    });

    this.on('sireen.session.get', async (p) => {
      const result = await this.backendClient.get(`/sessions/${(p as Record<string, unknown>).id}`);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.loaded',
        payload: result,
      });
    });

    this.on('sireen.session.update', async (p) => {
      const { id, ...updates } = p as Record<string, unknown>;
      const result = await this.backendClient.patch(`/sessions/${id}`, updates);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.updated',
        payload: result,
      });
    });

    this.on('sireen.session.delete', async (p) => {
      await this.backendClient.delete(`/sessions/${(p as Record<string, unknown>).id}`);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.deleted',
        payload: { id: (p as Record<string, unknown>).id },
      });
    });

    this.on('sireen.session.duplicate', async (p) => {
      const result = await this.backendClient.post(`/sessions/${(p as Record<string, unknown>).id}/duplicate`, { name: (p as Record<string, unknown>).name || '' });
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.duplicated',
        payload: result,
      });
    });

    this.on('sireen.session.saveWorkspace', async (p) => {
      const { id, state } = p as Record<string, unknown>;
      await this.backendClient.put(`/sessions/${id}/workspace`, state as object);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.workspaceSaved',
        payload: { id },
      });
    });

    this.on('sireen.session.timeline', async (p) => {
      const result = await this.backendClient.get(`/sessions/${(p as Record<string, unknown>).id}/timeline`);
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.session.timeline',
        payload: result,
      });
    });
  }

  on(command: string, handler: Handler) {
    this.handlers.set(command, handler);
  }

  async route(message: { command: string; payload?: Record<string, unknown> }) {
    const handler = this.handlers.get(message.command);
    if (handler) {
      try {
        await handler(message.payload || {});
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.error',
          payload: { command: message.command, error: msg },
        });
      }
    }
  }
}

