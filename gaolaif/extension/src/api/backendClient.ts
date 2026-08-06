import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface BackendClientOptions {
  maxReconnectAttempts?: number;
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  reconnectJitterPercent?: number;
}

const DEFAULT_OPTIONS: Required<BackendClientOptions> = {
  maxReconnectAttempts: 10,
  initialReconnectDelayMs: 1000,
  maxReconnectDelayMs: 30000,
  reconnectJitterPercent: 0.25,
};

/**
 * BackendClient manages the connection to the Sireen backend server.
 * Implements automatic WebSocket reconnection with exponential backoff and jitter.
 */
export class BackendClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private backendProcess: cp.ChildProcess | null = null;
  private readonly port: number;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private _connected: boolean = false;
  private _connectionState: ConnectionState = 'disconnected';
  private readonly options: Required<BackendClientOptions>;
  private reconnectAttempt: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;

  constructor(
    private context: vscode.ExtensionContext,
    options: BackendClientOptions = {}
  ) {
    super();
    this.port = vscode.workspace.getConfiguration('gaolaif').get('backendPort', 7432);
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.setMaxListeners(20); // Allow multiple listeners for connection state
  }

  get connected(): boolean { return this._connected; }
  get connectionState(): ConnectionState { return this._connectionState; }

  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState !== state) {
      this._connectionState = state;
      this.emit('connectionStateChange', state);
    }
  }

  async startBackend(): Promise<void> {
    try {
      const resp = await fetch(`http://127.0.0.1:${this.port}/health`);
      if (resp.ok) {
        this._connected = true;
        this.setConnectionState('connected');
        await this.connectWebSocket();
        return;
      }
    } catch { /* not running */ }

    try {
      await this.waitForBackend();
      this._connected = true;
      this.setConnectionState('connected');
      await this.connectWebSocket();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showWarningMessage(`Sireen backend: ${msg}. Some features require the backend.`);
      this.setConnectionState('failed');
    }
  }

  private async waitForBackend(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (resp.ok) return;
      } catch { /* not ready */ }
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Backend failed to start after 15s');
  }

  private async connectWebSocket(): Promise<void> {
    if (this.isShuttingDown) return;

    this.setConnectionState('connecting');
    this.ws = new WebSocket(`ws://127.0.0.1:${this.port}/ws`);

    this.ws.on('open', () => {
      this._connected = true;
      this.reconnectAttempt = 0;
      this.setConnectionState('connected');
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        const handler = this.messageHandlers.get(msg.type);
        if (handler) handler(msg.payload);
      } catch { /* ignore parse errors */ }
    });

    this.ws.on('close', () => {
      this._connected = false;
      this.setConnectionState('disconnected');
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      // Error is followed by 'close', but we log for diagnostics
      console.error('[Sireen] WebSocket error:', err.message);
    });
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;
    if (this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      this.setConnectionState('failed');
      vscode.window.showWarningMessage(
        `Sireen: Backend connection lost after ${this.options.maxReconnectAttempts} reconnect attempts. ` +
        'Restart the extension or check backend health.'
      );
      return;
    }

    this.reconnectAttempt++;
    const baseDelay = Math.min(
      this.options.initialReconnectDelayMs * Math.pow(2, this.reconnectAttempt - 1),
      this.options.maxReconnectDelayMs
    );
    const jitter = baseDelay * this.options.reconnectJitterPercent * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.round(baseDelay + jitter));

    this.setConnectionState('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  sendWebSocket(message: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async post(endpoint: string, body: object): Promise<any> {
    const resp = await fetch(`http://127.0.0.1:${this.port}${endpoint}`, {
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
    const resp = await fetch(`http://127.0.0.1:${this.port}${endpoint}`);
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
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this._connected = false;
    this.setConnectionState('disconnected');
    this.removeAllListeners();
  }
}
