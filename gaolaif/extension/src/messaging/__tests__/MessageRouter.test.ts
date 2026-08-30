import * as vscode from 'vscode';
import { MessageRouter } from '../MessageRouter';

describe('MessageRouter backend recovery', () => {
  const backendClient = {
    connected: true,
    startBackend: jest.fn(),
    get: jest.fn().mockResolvedValue({ sessions: [] }),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    onMessage: jest.fn(),
  };
  const sidebarProvider = {
    getSessionId: jest.fn().mockReturnValue(''),
    postMessageToWebview: jest.fn(),
    sendMediaConfig: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    backendClient.connected = true;
    backendClient.startBackend.mockResolvedValue(undefined);
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('C:/Sireen/backend'),
    });
  });

  it('retries a configured backend in the active extension host and refreshes sessions', async () => {
    const router = new MessageRouter(backendClient as any, sidebarProvider as any);

    await router.route({ command: 'sireen.backend.configure' });

    expect(backendClient.startBackend).toHaveBeenCalledTimes(1);
    expect(sidebarProvider.postMessageToWebview).toHaveBeenCalledWith({
      command: 'sireen.connection.status',
      payload: { status: 'connected' },
    });
    expect(backendClient.get).toHaveBeenCalledWith('/sessions/list?status=active');
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('opens Backend Path settings when no backend path is configured', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(''),
    });
    const router = new MessageRouter(backendClient as any, sidebarProvider as any);

    await router.route({ command: 'sireen.backend.configure' });

    expect(backendClient.startBackend).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openSettings',
      'gaolaif.backendPath'
    );
  });

  it('forwards a zero-finding completion without synthesizing a competing incomplete event', () => {
    const callbacks = new Map<string, (payload: unknown) => void>();
    backendClient.onMessage.mockImplementation((event: string, callback: (payload: unknown) => void) => {
      callbacks.set(event, callback);
    });
    const router = new MessageRouter(backendClient as any, sidebarProvider as any);
    router.onFindings(jest.fn());

    callbacks.get('complete')?.({
      terminal_state: 'unverified',
      findings: [],
      warnings: ['Model verification is unavailable.'],
    });

    expect(sidebarProvider.postMessageToWebview).toHaveBeenCalledWith(expect.objectContaining({
      command: 'sireen.audit_complete',
    }));
    expect(sidebarProvider.postMessageToWebview).not.toHaveBeenCalledWith(expect.objectContaining({
      command: 'sireen.audit.incomplete',
    }));
  });
});