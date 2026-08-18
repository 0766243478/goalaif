import '@testing-library/jest-dom';

// Global mock for the webview's acquireVsCodeApi(), used by vscodeApi.ts.
// Provides a postMessage spy + in-memory getState/setState so hooks/components
// that talk to the host can be rendered in jsdom without a real VS Code host.
const store: Record<string, unknown> = {};
(globalThis as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi =
  () => ({
    postMessage: jest.fn(),
    getState: <T = unknown>(): T | undefined => (Object.keys(store).length ? (store as T) : undefined),
    setState: (state: unknown) => {
      Object.assign(store, state as object);
      return state;
    },
  });
