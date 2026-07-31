export interface WebviewMessage {
  command: string;
  payload?: Record<string, unknown>;
  session_id?: string;
  [key: string]: unknown;
}

interface VsCodeApi {
  postMessage(message: WebviewMessage): void;
  getState<T = unknown>(): T | undefined;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;
export const vscode: VsCodeApi = acquireVsCodeApi();
