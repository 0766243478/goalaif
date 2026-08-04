import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';
import { SidebarProvider } from '../sidebar/SidebarProvider';

type Handler = (payload: Record<string, unknown>) => void | Promise<void>;

export class MessageRouter {
  private handlers = new Map<string, Handler>();

  constructor(
    private backendClient: BackendClient,
    private sidebarProvider: SidebarProvider
  ) {
    this.registerDefaults();
    this.forwardWebSocketEvents();
  }

  private forwardWebSocketEvents() {
    // Map backend WS event names → sireen.* commands that the UI understands
    const eventMap: Record<string, string> = {
      'progress': 'sireen.audit.progress',
      'complete': 'sireen.audit.complete',
      'phase1_complete': 'sireen.audit.phase1_complete',
      'phase2_complete': 'sireen.audit.phase2_complete',
      'phase3_complete': 'sireen.audit.phase3_complete',
      'phase4_complete': 'sireen.audit.phase4_complete',
      'chat.message': 'sireen.chat.message',
      'error': 'sireen.error',
      'thinking.start': 'sireen.thinking.start',
      'thinking.step': 'sireen.thinking.step',
      'thinking.end': 'sireen.thinking.end',
    };
    for (const [backendEvent, uiCommand] of Object.entries(eventMap)) {
      this.backendClient.onMessage(backendEvent, (payload) => {
        this.sidebarProvider.postMessageToWebview({
          command: uiCommand,
          payload,
        });
      });
    }

    // Forward exploit results exactly once to both consumers:
    // HackerMode (exploitResult) and the standard store flow (sireen.exploit.complete).
    this.backendClient.onMessage('exploit_result', (payload) => {
      const p = payload as Record<string, unknown>;
      this.sidebarProvider.postMessageToWebview({
        command: 'exploitResult',
        confirmed: !!p.confirmed,
        poc_code: p.poc_code || '',
        forge_output: p.forge_output || '',
        money_flow: p.money_flow || undefined,
        attack_vector: p.attack_vector || '',
        target_function: p.target_function || '',
        estimated_impact: p.estimated_impact || '',
        log: p.forge_output ? `${p.forge_output}`.slice(0, 500) : '',
      });
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.exploit.complete',
        payload: p,
      });
    });
  }

  private registerDefaults() {
    this.on('sireen.media.request', async () => {
      this.sidebarProvider.sendMediaConfig();
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

    // Bridge: HackerMode (Attack Workspace) exploit flow
    // Maps 'exploitWithIdea' from the webview to the backend exploit pipeline.
    this.on('exploitWithIdea', async (p) => {
      const result = await this.backendClient.post('/exploit/start', {
        code: p.code,
        idea: p.idea,
        target_function: p.targetFunction,
      });
      this.sidebarProvider.postMessageToWebview({
        command: 'exploitStarted',
        sessionId: (result as Record<string, unknown>)?.session_id || '',
      });
    });

    this.on('sireen.chat.send', async (p) => {
      if (this.backendClient.connected) {
        this.backendClient.sendWebSocket({
          type: 'chat',
          payload: {
            message: p.message,
            session_id: p.session_id,
            context: p.context,
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
      const command = p.command as string;
      const args = p.args as string;
      const context = (p.context as Record<string, unknown>) || {};
      // The webview models the active selection as { selection: { code } },
      // not as a flat `code` field. Read both shapes so slash commands act on
      // the currently selected code instead of stale/empty context (H-1 fix).
      const selectedCode =
        ((context.selection as Record<string, unknown> | undefined)?.code as string) ||
        (context.code as string) ||
        '';

      if (command === 'analyze') {
        const result = await this.backendClient.post('/analyze', {
          code: selectedCode,
          file_path: (context.file as string) || '',
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
          target_function: (context.function as string) || '',
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.exploit.started',
          payload: result,
        });
      } else if (command === 'patch') {
        const result = await this.backendClient.post('/patch/generate', {
          code: selectedCode,
          finding: context.finding || {},
        });
        this.sidebarProvider.postMessageToWebview({
          command: 'sireen.patch.result',
          payload: result,
        });
      } else if (command === 'report') {
        const result = await this.backendClient.post('/report/export', {
          session_id: (p.session_id as string) || (context.sessionId as string) || '',
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
      const filePath = p.file as string;
      const line = (p.line as number) || 1;
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
      const result = await this.backendClient.post('/config/set-key', { key: p.key });
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.apiKey.status',
        payload: { configured: (result as Record<string, unknown>)?.status === 'ok' },
      });
    });

    this.on('sireen.navigate', async (p) => {
      this.sidebarProvider.postMessageToWebview({
        command: 'sireen.navigate',
        payload: { view: p.view },
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

    this.on('sireen.sandbox.start', async (p) => {
      const config = vscode.workspace.getConfiguration('gaolaif');
      const rpcUrl = (p.rpcUrl as string) || config.get('defaultRpcEvm', 'https://eth.llamarpc.com');

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
