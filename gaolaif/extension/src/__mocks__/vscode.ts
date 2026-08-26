export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
  registerWebviewViewProvider: jest.fn(),
  activeTextEditor: undefined,
};

export const env = {
  openExternal: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
  })),
  findFiles: jest.fn().mockResolvedValue([]),
  onDidChangeConfiguration: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const ProgressLocation = {
  Notification: 15,
  SourceControl: 1,
  Window: 10,
};

export class Uri {
  static joinPath(...parts: any[]) {
    return { fsPath: parts.map(p => p.path || p).join('/') };
  }
  static file(path: string) {
    return { fsPath: path };
  }
  static parse(value: string) {
    return { fsPath: value, toString: () => value };
  }
}

type Listener = (...args: unknown[]) => void;

export class EventEmitter {
  private listeners: Listener[] = [];
  event = (listener: Listener) => {
    this.listeners.push(listener);
    return { dispose: jest.fn() };
  };
  fire(data: unknown) {
    this.listeners.forEach(l => l(data));
  }
}

export enum ViewColumn {
  Active = -1,
  One = 1,
}

export function createStatusBarItem() {
  return {
    text: '',
    tooltip: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  };
}
