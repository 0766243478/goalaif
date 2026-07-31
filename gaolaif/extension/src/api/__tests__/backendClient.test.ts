import { BackendClient } from '../backendClient';

describe('BackendClient', () => {
  let client: BackendClient;

  beforeEach(() => {
    const mockContext = {
      extensionPath: '/mock/path',
      extensionUri: { fsPath: '/mock/path' },
      subscriptions: [],
    } as any;
    client = new BackendClient(mockContext);
  });

  afterEach(() => {
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
});
