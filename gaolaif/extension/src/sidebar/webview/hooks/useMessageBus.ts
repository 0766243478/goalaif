import { useEffect, useCallback, useState, useRef } from 'react';
import { vscode } from '../vscodeApi';
import { useStore } from '../store';
import type { ChatMessage, ThinkingStep, ExploitRecord, MemoryEntry, ProtocolState, PipelineStage, ViewId, TimelineEvent } from '../store/types';

/**
 * Shared icon URI state. Lifted to a module-level singleton so that only the
 * single message-listener owner (useMessageBus) ever mutates it, while any
 * number of consumers can read it via useSend without registering listeners.
 */
const iconUriStore: { value: string; listeners: Set<(v: string) => void> } = {
  value: '',
  listeners: new Set(),
};

function setIconUriGlobal(value: string) {
  if (iconUriStore.value === value) return;
  iconUriStore.value = value;
  for (const l of iconUriStore.listeners) l(value);
}

/**
 * useSend — lightweight hook that returns only the `send` (postMessage) callback
 * and the current `iconUri`. It registers NO window message listener.
 *
 * Use this in any component that only needs to *post* messages to the host.
 * This prevents the duplicate-listener bug where every component calling
 * useMessageBus() registered its own `window.addEventListener('message')`,
 * causing every backend message to be processed N times (duplicate AI replies,
 * duplicate findings, duplicate state updates).
 */
export function useSend() {
  const [iconUri, setIconUri] = useState<string>(iconUriStore.value);

  useEffect(() => {
    const listener = (v: string) => setIconUri(v);
    iconUriStore.listeners.add(listener);
    // The initial useState() already captured the value at mount; the listener
    // covers all subsequent updates. No synchronous setState needed here.
    return () => {
      iconUriStore.listeners.delete(listener);
    };
  }, []);

  const send = useCallback((command: string, payload?: Record<string, unknown>) => {
    vscode.postMessage({ command, payload });
  }, []);

  return { send, iconUri };
}

/**
 * useMessageBus — the SINGLE owner of the window 'message' listener.
 *
 * Mount this EXACTLY ONCE, at the app root (AppContent in App.tsx). It wires
 * every inbound host message to the store reducer. Leaf components must use
 * useSend() instead — never useMessageBus().
 */
export function useMessageBus() {
  const { dispatch } = useStore();
  const [iconUri, setIconUri] = useState<string>(iconUriStore.value);
  const dispatchRef = useRef(dispatch);

  // Keep the ref current without mutating it during render.
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.command) return;
      // Snapshot the dispatch fn so the listener never needs to re-register
      // when dispatch identity changes (keeps the listener stable = no dupes).
      const dispatch = dispatchRef.current;

      switch (msg.command) {
        case 'sireen.media.config': {
          const uri = (msg.payload?.iconUri as string) || '';
          setIconUriGlobal(uri);
          setIconUri(uri);
          break;
        }

        case 'sireen.connection.status':
          dispatch({ type: 'SET_CONNECTION', status: msg.payload.status });
          break;

        case 'sireen.apiKey.status':
          dispatch({ type: 'SET_API_KEY', set: msg.payload.configured });
          break;

        case 'sireen.audit.started': {
          const sessionId = (msg.payload?.session_id as string) || msg.payload?.sessionId;
          dispatch({ type: 'SET_SESSION', id: sessionId, name: msg.payload?.name });
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'phase1' });
          dispatch({
            type: 'SET_AUDIT_PROGRESS',
            progress: {
              phase: 1,
              message: 'Starting audit...',
              scenariosTotal: 0,
              scenariosCompleted: 0,
              stage: 'understanding',
              startedAt: Date.now(),
            },
          });
          break;
        }

        case 'sireen.audit.progress':
          dispatch({
            type: 'SET_AUDIT_PROGRESS',
            progress: {
              phase: (msg.payload.phase as number) || 0,
              message: (msg.payload.message as string) || '',
              scenariosTotal: (msg.payload.scenariosTotal as number) || 0,
              scenariosCompleted: (msg.payload.scenariosCompleted as number) || 0,
              stage: 'understanding',
              startedAt: Date.now(),
            },
          });
          dispatch({
            type: 'SET_AUDIT_PHASE',
            phase: msg.payload.phase === 1 ? 'phase1' :
                   msg.payload.phase === 2 ? 'phase2' :
                   msg.payload.phase === 3 ? 'phase3' :
                   msg.payload.phase === 4 ? 'phase4' : 'idle',
          });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: msg.payload.message,
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.audit.phase1_complete':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'phase1' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: 'Contract analysis complete. Generating attack scenarios...',
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.audit.phase2_complete':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'phase2' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Generated ${(msg.payload.scenarios as any[])?.length || 0} attack scenarios. Starting simulation...`,
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.audit.phase3_complete':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'phase3' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: 'PoC simulation complete. Judging findings...',
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.audit.phase4_complete':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'phase4' });
          break;

        case 'sireen.audit.complete':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'complete' });
          dispatch({ type: 'SET_AUDIT_PROGRESS', progress: null });
          if (msg.payload.findings) {
            dispatch({ type: 'ADD_FINDINGS', findings: msg.payload.findings });
            // The user just ran an audit — take them straight to the findings
            // (RULE 4: one step, not "wait → read chat → click View Findings").
            // Keep the chat open so the AI summary stays visible.
            dispatch({ type: 'SET_VIEW', view: 'findings' });
            dispatch({ type: 'SET_RIGHT_PANEL', open: true });
            dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'chat' });
          } else {
            // Zero-finding rule: Never fabricate success. If audit completes
            // with no findings, show AUDIT_INCOMPLETE status.
            dispatch({ type: 'SET_AUDIT_PHASE', phase: 'incomplete' });
            dispatch({
              type: 'ADD_CHAT_MESSAGE',
              message: {
                id: crypto.randomUUID(),
                role: 'system',
                content: 'Audit completed but no findings were produced. The code may be secure, or the analysis may need adjustment.',
                timestamp: Date.now(),
              },
            });
          }
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: msg.payload.report || `Audit complete. Found ${msg.payload.findings?.length || 0} findings.`,
              timestamp: Date.now(),
              suggestions: [
                { id: 'view-findings', label: 'View Findings', command: 'sireen.navigate', args: { view: 'findings' } },
                { id: 'generate-report', label: 'Generate Report', command: 'sireen.report.generate' },
              ],
            },
          });
          break;

        case 'sireen.audit.incomplete':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'incomplete' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: msg.payload?.reason || 'Audit completed with no findings produced.',
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.chat.message':
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: msg.payload as ChatMessage });
          dispatch({ type: 'SET_THINKING', thinking: false });
          break;

        case 'sireen.thinking.start':
          dispatch({ type: 'SET_THINKING', thinking: true, steps: [] });
          break;

        case 'sireen.thinking.step':
          dispatch({
            type: 'SET_THINKING',
            thinking: true,
            steps: msg.payload.steps as ThinkingStep[],
          });
          dispatch({
            type: 'SET_AUDIT_PROGRESS',
            progress: {
              phase: (msg.payload.phase as number) || 0,
              message: (msg.payload.message as string) || '',
              scenariosTotal: (msg.payload.scenariosTotal as number) || 0,
              scenariosCompleted: (msg.payload.scenariosCompleted as number) || 0,
              stage: (msg.payload.stage as PipelineStage) || 'idle',
              startedAt: Date.now(),
            },
          });
          dispatch({
            type: 'SET_AUDIT_PHASE',
            phase: msg.payload.phase === 1 ? 'phase1' :
                   msg.payload.phase === 2 ? 'phase2' :
                   msg.payload.phase === 3 ? 'phase3' :
                   msg.payload.phase === 4 ? 'phase4' : 'idle',
          });
          break;

        case 'sireen.thinking.end':
          dispatch({ type: 'SET_THINKING', thinking: false });
          break;

        case 'exploitReady':
          dispatch({
            type: 'SET_CHAT_CONTEXT',
            context: {
              file: (msg.filePath as string) || undefined,
              selection: {
                startLine: (msg.startLine as number) || 0,
                endLine: (msg.endLine as number) || 0,
                code: (msg.code as string) || '',
              },
            },
          });
          dispatch({ type: 'SET_CONTRACT_CODE', code: (msg.code as string) || '', filePath: (msg.filePath as string) || '' });
          dispatch({ type: 'SET_VIEW', view: 'exploits' });
          dispatch({ type: 'SET_RIGHT_PANEL', open: true });
          dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'chat' });
          break;

        case 'sireen.session.created':
        case 'sireen.session.restored':
          dispatch({
            type: 'SET_SESSION',
            id: msg.payload.session_id,
            name: msg.payload.name,
          });
          break;

        case 'sireen.session.switched':
          dispatch({
            type: 'SET_SESSION',
            id: msg.payload.session_id,
            name: msg.payload.name,
          });
          break;

        case 'sireen.session.list':
          dispatch({ type: 'SET_SESSION_LIST', sessions: msg.payload.sessions });
          break;

        case 'sireen.exploit.started':
          dispatch({ type: 'SET_SESSION', id: msg.payload?.session_id || msg.payload?.sessionId });
          // Keep the chat visible so the user can follow AI progress, and make
          // sure the right panel is open (RULE 3: always know what's happening).
          dispatch({ type: 'SET_RIGHT_PANEL', open: true });
          dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'chat' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: 'Exploit generation started...',
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.exploit.complete': {
          const raw = msg.payload as Record<string, unknown>;
          dispatch({
            type: 'ADD_EXPLOIT',
            exploit: {
              id: crypto.randomUUID(),
              findingId: '',
              hypothesis: (raw.hypothesis as string) || '',
              pocCode: (raw.poc_code as string) || '',
              confirmed: !!raw.confirmed,
              forgeOutput: (raw.forge_output as string) || '',
              attackVector: (raw.attack_vector as string) || '',
              estimatedImpact: (raw.estimated_impact as string) || '',
              createdAt: Date.now(),
            } as ExploitRecord,
          });
          // Send the user to where the result lives (RULE 3/4): the Exploits
          // view. They just triggered "Exploit" from a finding — the next step
          // is to inspect the PoC, not to wonder where it went.
          dispatch({ type: 'SET_VIEW', view: 'exploits' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: raw.confirmed
                ? `Exploit confirmed! ${raw.attack_vector ? `Attack vector: ${raw.attack_vector}` : ''}`
                : 'Exploit was not confirmed. Try a different hypothesis.',
              timestamp: Date.now(),
              suggestions: raw.confirmed
                ? [
                    { id: 'view-exploit', label: 'View Exploit', command: 'sireen.navigate', args: { view: 'exploits' } },
                    { id: 'gen-report', label: 'Generate Report', command: 'sireen.report.generate' },
                  ]
                : [
                    { id: 'try-again', label: 'Try Different Hypothesis', command: 'sireen.openChat' },
                  ],
            },
          });
          break;
        }

        case 'sireen.memory.results':
          dispatch({ type: 'SET_MEMORY', entries: msg.payload.results as MemoryEntry[] });
          break;

        case 'sireen.chat.context': {
          const ctx = msg.payload as Record<string, unknown>;
          const sel = ctx.selection as Record<string, unknown> | undefined;
          const code = (ctx.code as string) || (sel?.code as string) || '';
          dispatch({
            type: 'SET_CHAT_CONTEXT',
            context: {
              file: (ctx.file as string) || undefined,
              selection: {
                startLine: (ctx.startLine as number) || (sel?.startLine as number) || 0,
                endLine: (ctx.endLine as number) || (sel?.endLine as number) || 0,
                code,
              },
            },
          });
          // Also set contractCode so ExploitsView's exploit-idea input has
          // the target code available without a separate exploitReady message.
          if (code) {
            dispatch({ type: 'SET_CONTRACT_CODE', code, filePath: (ctx.file as string) || '' });
          }
          break;
        }

        case 'sireen.protocol.detected':
          dispatch({ type: 'SET_PROTOCOL', protocol: msg.payload as ProtocolState });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Protocol detected: ${msg.payload.name || 'Unknown'} (${msg.payload.totalContracts || 0} contracts, ${msg.payload.totalFunctions || 0} functions)`,
              timestamp: Date.now(),
              suggestions: [
                { id: 'full-audit', label: 'Run Full Audit', command: 'sireen.audit.request' },
                { id: 'show-findings', label: 'View Findings', command: 'sireen.navigate', args: { view: 'findings' } },
              ],
            },
          });
          break;

        case 'sireen.sandbox.started':
          dispatch({ type: 'SET_SANDBOX', ready: true });
          break;

        case 'sireen.patch.result':
          dispatch({ type: 'SET_PATCH', result: msg.payload });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: msg.payload.success
                ? `Patch generated for ${msg.payload.finding_title}:\n\n${msg.payload.explanation}`
                : `Failed to generate patch: ${msg.payload.error}`,
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.report.generated':
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Report generated${msg.payload.path ? `: ${msg.payload.path}` : ''}`,
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.navigate':
          dispatch({ type: 'SET_VIEW', view: (msg.payload?.view as ViewId) || 'overview' });
          break;

        case 'sireen.setRightPanel': {
          const p = msg.payload as Record<string, unknown> | undefined;
          if (p?.open !== undefined) dispatch({ type: 'SET_RIGHT_PANEL', open: !!p.open });
          if (p?.tab === 'chat' || p?.tab === 'reasoning') dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: p.tab });
          break;
        }

        case 'sireen.session.created':
        case 'sireen.session.duplicated':
        case 'sireen.session.restored':
          dispatch({
            type: 'SET_SESSION',
            id: msg.payload?.session_id || msg.payload?.id,
            name: msg.payload?.name,
          });
          dispatch({ type: 'SET_SESSION_VIEW', view: 'workspace' });
          dispatch({ type: 'SET_VIEW', view: 'overview' });
          // Refresh the session list
          vscode.postMessage({ command: 'sireen.session.list', payload: { status: 'active' } });
          break;

        case 'sireen.session.switched':
          dispatch({
            type: 'SET_SESSION',
            id: msg.payload?.session_id,
            name: msg.payload?.name,
          });
          vscode.postMessage({ command: 'sireen.session.list', payload: { status: 'active' } });
          break;

        case 'sireen.session.list':
        case 'sireen.session.listed': {
          const sessions = (msg.payload?.sessions || []) as Record<string, unknown>[];
          dispatch({ type: 'SET_SESSION_LIST', sessions: sessions as any });
          break;
        }

        case 'sireen.session.deleted':
          // Refresh the session list after deletion
          vscode.postMessage({ command: 'sireen.session.list', payload: { status: 'active' } });
          break;

        case 'sireen.session.update': {
          // Update session-specific state
          if (msg.payload?.audit_phase) {
            dispatch({ type: 'SET_AUDIT_PHASE', phase: msg.payload.audit_phase as any });
          }
          if (msg.payload?.audit_progress) {
            dispatch({ type: 'SET_AUDIT_PROGRESS', progress: msg.payload.audit_progress });
          }
          break;
        }

        case 'sireen.session.listed': {
          const sessions = (msg.payload?.sessions || []) as Record<string, unknown>[];
          dispatch({ type: 'SET_SESSION_LIST', sessions: sessions as any });
          break;
        }

        case 'sireen.session.loaded': {
          const s = msg.payload as Record<string, unknown>;
          dispatch({ type: 'SET_SESSION', id: s.id as string, name: s.name as string });
          dispatch({ type: 'SET_SESSION_VIEW', view: 'workspace' });
          // Restore the full workspace state from SQLite
          const ws = s.workspace_state as Record<string, unknown> | undefined;
          if (ws && Object.keys(ws).length > 0) {
            dispatch({ type: 'RESTORE_WORKSPACE', state: ws as any });
          } else {
            dispatch({ type: 'SET_VIEW', view: 'overview' });
          }
          break;
        }

        case 'sireen.session.updated':
        case 'sireen.session.deleted':
        case 'sireen.session.workspaceSaved':
          // Refresh the session list after any mutation
          vscode.postMessage({ command: 'sireen.session.list', payload: { status: 'active' } });
          break;

        case 'sireen.session.timeline': {
          const timeline = msg.payload as TimelineEvent[];
          dispatch({ type: 'SET_TIMELINE_EVENTS', events: timeline });
        }

        case 'sireen.timeline.event': {
          const event = msg.payload as TimelineEvent;
          dispatch({ type: 'SET_TIMELINE_EVENTS', events: [event] });
          break;
        }

        case 'sireen.error':
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'error' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Error: ${msg.payload.error}`,
              timestamp: Date.now(),
            },
          });
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // Intentionally empty deps: the listener must be registered ONCE for the
    // lifetime of the app root. dispatch is read via dispatchRef.current.
  }, []);

  const send = useCallback((command: string, payload?: Record<string, unknown>) => {
    vscode.postMessage({ command, payload });
  }, []);

  return { send, iconUri };
}
