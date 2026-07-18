// ============================================================================
// SIREEN — VS Code API Wrapper
// ============================================================================

export interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

let _vscode: VSCodeAPI | null = null;

export function getVscodeApi(): VSCodeAPI {
  if (!_vscode) {
    try {
      _vscode = acquireVsCodeApi();
    } catch {
      // Fallback for dev/testing outside VS Code
      _vscode = {
        postMessage: (msg) => console.log('[Sireen] postMessage:', msg),
        getState: () => null,
        setState: (s) => {},
      };
    }
  }
  return _vscode;
}

export function postMessage(message: any) {
  getVscodeApi().postMessage(message);
}

export function getInitialState<T>(): T | null {
  const root = document.getElementById('root');
  if (root?.dataset.state) {
    try {
      return JSON.parse(root.dataset.state);
    } catch {
      return null;
    }
  }
  return null;
}

export function getPanelId(): string {
  const root = document.getElementById('root');
  return root?.dataset.panel || 'sidebar';
}
