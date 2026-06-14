import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import WebSocket from 'ws';

export class BackendClient {
  private ws: WebSocket | null = null;
  private backendProcess: cp.ChildProcess | null = null;
  private readonly port: number;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private _connected: boolean = false;

  constructor(private context: vscode.ExtensionContext) {
    this.port = vscode.workspace.getConfiguration('gaolaif').get('backendPort', 7432);
  }

  get connected(): boolean { return this._connected; }

  async startBackend(): Promise<void> {
    const backendPath = path.join(this.context.extensionPath, '..', 'backend');
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';

    try {
      this.backendProcess = cp.spawn(pythonPath, [
        '-m', 'uvicorn', 'main:app',
        '--port', String(this.port),
        '--host', '127.0.0.1',
      ], { cwd: backendPath, stdio: ['ignore', 'pipe', 'pipe'] });

      this.backendProcess.stderr?.on('data', (d: Buffer) => {
        const line = d.toString();
        if (line.includes('Uvicorn running on')) this._connected = true;
      });

      await this.waitForBackend();
      await this.connectWebSocket();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showWarningMessage(`Gaolaif backend: ${msg}. Some features require the backend.`);
    }
  }

  private async waitForBackend(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const resp = await fetch(`http://localhost:${this.port}/health`);
        if (resp.ok) return;
      } catch { /* not ready */ }
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Backend failed to start after 15s');
  }

  private async connectWebSocket(): Promise<void> {
    this.ws = new WebSocket(`ws://localhost:${this.port}/ws`);
    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        const handler = this.messageHandlers.get(msg.type);
        if (handler) handler(msg.payload);
      } catch { /* ignore parse errors */ }
    });
    this.ws.on('close', () => { this._connected = false; });
    this.ws.on('error', () => { /* connection error handled by close */ });
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  async post(endpoint: string, body: object): Promise<any> {
    const resp = await fetch(`http://localhost:${this.port}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => 'Unknown error');
      throw new Error(`Backend ${resp.status}: ${err}`);
    }
    return resp.json();
  }

  async get(endpoint: string): Promise<any> {
    const resp = await fetch(`http://localhost:${this.port}${endpoint}`);
    if (!resp.ok) throw new Error(`Backend GET ${endpoint} returned ${resp.status}`);
    return resp.json();
  }

  async analyze(code: string, filePath: string, language: string): Promise<any> {
    return this.post('/analyze', {
      code,
      file_path: filePath,
      language,
      max_scenarios: 3,
    });
  }

  stopBackend() {
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }
}
