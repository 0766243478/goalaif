// ============================================================================
// SIREEN — Message Bus (Typed Message Router)
// ============================================================================
// Provides typed message sending with request/response correlation,
// timeout handling, error propagation, and logging.
//
// Usage:
//   import { sendMessage } from '../providers/messageBus';
//   const result = await sendMessage('investigation:list', {});
// ============================================================================

import { getVscodeApi, postMessage as rawPostMessage } from './vscode-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type RequestMessage =
  | { type: 'ready'; payload?: Record<string, never> }
  | { type: 'focus:input'; payload?: Record<string, never> }
  | { type: 'chat:send'; payload: { text: string; mode?: string; chain?: string } }
  | { type: 'chat:stop'; payload?: Record<string, never> }
  | { type: 'investigation:create'; payload?: Record<string, unknown> }
  | { type: 'investigation:save'; payload: { id: string; data: unknown } }
  | { type: 'investigation:load'; payload: { id: string } }
  | { type: 'investigation:delete'; payload: { id: string } }
  | { type: 'investigation:list'; payload?: Record<string, never> }
  | { type: 'investigation:mode'; payload: { mode: string } }
  | { type: 'tab:change'; payload: { tab: string } }
  | { type: 'config:save'; payload: { key: string; value: unknown } }
  | { type: 'config:clear'; payload?: Record<string, never> }
  | { type: 'config:get'; payload?: Record<string, never> }
  | { type: 'simulation:start'; payload?: Record<string, unknown> }
  | { type: 'simulation:stop'; payload?: Record<string, never> }
  | { type: 'report:export'; payload: { reportId: string } }
  | { type: 'report:openEvidence'; payload: { url: string } }
  | { type: 'graph:selectNode'; payload: { nodeId: string } }
  | { type: 'graph:refresh'; payload?: Record<string, never> }
  | { type: 'bounty:refresh'; payload?: Record<string, never> }
  | { type: 'bounty:viewDetails'; payload: { id: number } }
  | { type: 'bounty:openExternal'; payload: { id: number; platform: string } }
  | { type: 'war-room:toggle-pin'; payload: { sessionId: string } }
  | { type: 'war-room:new-session'; payload?: Record<string, never> }
  | { type: 'war-room:select-session'; payload: { sessionId: string } }
  | { type: 'war-room:settings'; payload?: Record<string, never> }
  | { type: 'attack:start'; payload?: Record<string, unknown> }
  | { type: 'attack:stop'; payload?: Record<string, never> }
  | { type: 'attack:exportLog'; payload?: Record<string, never> }
  | { type: 'open:panel'; payload: { panel: string } }
  | { type: 'error'; payload: { message: string } };

// ---------------------------------------------------------------------------
// Pending Request Tracking
// ---------------------------------------------------------------------------
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  messageType: string;
}

const pendingRequests = new Map<string, PendingRequest>();
let requestCounter = 0;

const DEFAULT_TIMEOUT = 30_000; // 30s

// ---------------------------------------------------------------------------
// Response Listener
// ---------------------------------------------------------------------------
function setupResponseListener(): void {
  const handler = (event: MessageEvent) => {
    const msg = event.data;
    if (!msg?.type) return;

    // Check if this is a response to a pending request
    const correlationId = msg._correlationId;
    if (correlationId && pendingRequests.has(correlationId)) {
      const pending = pendingRequests.get(correlationId)!;
      clearTimeout(pending.timer);
      pendingRequests.delete(correlationId);

      if (msg._error) {
        pending.reject(new Error(msg._error));
      } else {
        pending.resolve(msg);
      }
      return;
    }
  };

  window.addEventListener('message', handler);
}

// Initialize listener once
let listenerSetup = false;
function ensureListener(): void {
  if (!listenerSetup) {
    setupResponseListener();
    listenerSetup = true;
  }
}

// ---------------------------------------------------------------------------
// sendMessage — Typed request with optional response
// ---------------------------------------------------------------------------
export function sendMessage<T = unknown>(
  message: RequestMessage,
  options?: {
    expectResponse?: boolean;
    timeout?: number;
  }
): Promise<T | void> {
  ensureListener();

  const vscode = getVscodeApi();
  const { expectResponse = false, timeout = DEFAULT_TIMEOUT } = options || {};

  if (!expectResponse) {
    vscode.postMessage(message);
    return Promise.resolve();
  }

  return new Promise<T>((resolve, reject) => {
    const correlationId = `req-${Date.now()}-${++requestCounter}`;

    const timer = setTimeout(() => {
      pendingRequests.delete(correlationId);
      reject(new Error(`MessageBus timeout: ${message.type} (no response in ${timeout}ms)`));
    }, timeout);

    pendingRequests.set(correlationId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timer,
      messageType: message.type,
    });

    vscode.postMessage({
      ...message,
      _correlationId: correlationId,
    });
  });
}

// ---------------------------------------------------------------------------
// Convenience: post message (fire-and-forget)
// ---------------------------------------------------------------------------
export function postMessage(message: RequestMessage): void {
  sendMessage(message);
}

// ---------------------------------------------------------------------------
// Provider-side: send response to a correlated request
// ---------------------------------------------------------------------------
export function sendResponse(
  correlationId: string,
  payload: Record<string, unknown>
): void {
  rawPostMessage({
    type: '_response',
    _correlationId: correlationId,
    ...payload,
  });
}

export function sendError(
  correlationId: string,
  errorMessage: string
): void {
  rawPostMessage({
    type: '_response',
    _correlationId: correlationId,
    _error: errorMessage,
  });
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
export function logMessage(direction: '→' | '←', type: string, payload?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MessageBus] ${direction} ${type}`, payload ?? '');
  }
}
