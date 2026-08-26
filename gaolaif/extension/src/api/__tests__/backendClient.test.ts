import { BackendClient, ConnectionState } from '../backendClient';

// Mock the 'ws' module so connectWebSocket never opens real sockets in tests.
jest.mock('ws', () => {
  return class MockWebSocket {
    static OPEN = 1;
    on() { return this; }
    close() {}
    send() {}
    removeAllListeners() {}
    get readyState() { return 0; }
  };
});

describe('BackendClient', () => {
  let client: BackendClient;
  let configStore: Record<string, unknown>;

  beforeEach(() => {
    jest.useFakeTimers();
    configStore = {};
    const vscode = require('vscode');
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: (key: string, def?: unknown) => (key in configStore ? configStore[key] : def),
    });
    const mockContext = {
      extensionPath: '/mock/path',
      extensionUri: { fsPath: '/mock/path' },
      subscriptions: [],
    } as any;
    client = new BackendClient(mockContext);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    // @ts-ignore - global fetch assignment for tests
    delete global.fetch;
    client.stopBackend();
  });

  test('initializes with connected=false', () => {
    expect(client.connected).toBe(false);
  });

  test('stopBackend sets connected to false', () => {
    client.stopBackend();
    expect(client.connected).toBe(false);
  });

  test('onMessage registers handler without error', () => {
    const handler = jest.fn();
    expect(() => client.onMessage('test', handler)).not.toThrow();
  });

  describe('startBackend (P0-1 startup UX)', () => {
    test('connects when the health endpoint responds OK', async () => {
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      const states: ConnectionState[] = [];
      client.on('connectionStateChange', (s: ConnectionState) => states.push(s));
      await client.startBackend();
      // WebSocket handshake completes asynchronously; the REST-side truth is
      // connected=true and the state machine passed through 'connected'.
      expect(client.connected).toBe(true);
      expect(states).toContain<ConnectionState>('connected');
      const vscode = require('vscode');
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    test('never leaves raw "fetch failed": shows actionable warning when unreachable and no spawn path configured', async () => {
      // @ts-ignore
      global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));
      configStore['backendPath'] = ''; // no auto-spawn possible

      const states: ConnectionState[] = [];
      client.on('connectionStateChange', (s: ConnectionState) => states.push(s));

      await client.startBackend();

      expect(client.connectionState).toBe<ConnectionState>('failed');
      expect(states).toContain('failed');
      const vscode = require('vscode');
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
      const warning = (vscode.window.showWarningMessage as jest.Mock).mock.calls[0][0] as string;
      // The message must be actionable, not a raw network error string.
      expect(warning).toContain('backend is not running');
      expect(warning).toContain('gaolaif.backendPath');
      expect(warning).not.toContain('fetch failed');
    });

    test('does not attempt spawn when backendPath points nowhere (fails fast)', async () => {
      // @ts-ignore
      global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed'));
      configStore['backendPath'] = 'Z:/definitely/not/a/backend';

      const start = Date.now();
      await client.startBackend();
      // If it had tried to waitForBackend() after spawning, this would take >15s.
      expect(Date.now() - start).toBeLessThan(5000);
      expect(client.connectionState).toBe<ConnectionState>('failed');
    });
  });
});
