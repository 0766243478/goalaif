import { useEffect, useCallback, useState, useRef } from 'react';
import { vscode } from '../vscodeApi';
import { useStore } from '../store';
import type { ChatMessage, ThinkingStep, ExploitRecord, Finding, ProtocolState, PipelineStage, ViewId, TimelineEvent } from '../store/types';

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

function unwrapCanonicalPayload(payload: unknown): unknown {
  if (
    payload &&
    typeof payload === 'object' &&
    'event_id' in payload &&
    'type' in payload &&
    'status' in payload &&
    'payload' in payload
  ) {
    return (payload as { payload: unknown }).payload;
  }
  return payload;
}

const canonicalCommandMap: Record<string, string> = {
  'sireen.audit_progress': 'sireen.audit.progress',
  'sireen.audit_complete': 'sireen.audit.complete',
  'sireen.audit_error': 'sireen.audit.error',
  'sireen.audit_phase1_complete': 'sireen.audit.phase1_complete',
  'sireen.audit_phase2_complete': 'sireen.audit.phase2_complete',
  'sireen.audit_phase3_complete': 'sireen.audit.phase3_complete',
  'sireen.audit_phase4_complete': 'sireen.audit.phase4_complete',
  'sireen.chat_message': 'sireen.chat.message',
  'sireen.thinking_start': 'sireen.thinking.start',
  'sireen.thinking_step': 'sireen.thinking.step',
  'sireen.thinking_end': 'sireen.thinking.end',
};

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
  // Some backend transports can flush a generic error after they have already
  // delivered the authoritative completion event. Keep that stale event from
  // replacing a truthful zero-finding terminal result in the UI.
  const protectedTerminalCompletionRef = useRef(false);

  // Keep the ref current without mutating it during render.
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const rawMessage = event.data;
      if (!rawMessage?.command) return;
      const msg = {
        ...rawMessage,
        command: canonicalCommandMap[rawMessage.command] || rawMessage.command,
        payload: unwrapCanonicalPayload(rawMessage.payload),
      };
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

        case 'sireen.backend.status': {
          const status = msg.payload?.status as {
            backend: 'connected' | 'unavailable';
            llm: 'available' | 'unavailable';
            forge: 'available' | 'unavailable';
          } | undefined;
          console.log('[Sireen] backend.status received:', status);
          if (status) {
            dispatch({ type: 'SET_BACKEND_STATUS', status });
          }
          break;
        }

        case 'sireen.audit.started': {
          // A new audit establishes a new terminal-event sequence.
          protectedTerminalCompletionRef.current = false;
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

        case 'sireen.audit.complete': {
          dispatch({ type: 'SET_AUDIT_PROGRESS', progress: null });
          // Core v0.1: truthful terminal state drives the UI phase. Never show
          // generic success for degraded/unverified/failed outcomes.
          const completion = msg.payload as Record<string, unknown>;
          const terminalState = String(completion?.terminal_state || 'unverified');
          const findings = Array.isArray(completion?.findings)
            ? completion.findings as Finding[]
            : [];
          const warnings = Array.isArray(completion?.warnings)
            ? completion.warnings.filter((warning): warning is string => typeof warning === 'string')
            : [];
          const evidenceCount = Array.isArray(completion?.evidence)
            ? completion.evidence.length
            : 0;
          protectedTerminalCompletionRef.current = findings.length === 0
            && (terminalState === 'unverified' || terminalState === 'clean_with_coverage');
          if (terminalState === 'failed') {
            dispatch({ type: 'SET_AUDIT_PHASE', phase: 'error' });
            dispatch({
              type: 'ADD_CHAT_MESSAGE',
              message: {
                id: crypto.randomUUID(),
                role: 'system',
                content: '✗ AUDIT FAILED — see error details above.',
                timestamp: Date.now(),
              },
            });
            break;
          }
          if (findings.length > 0) {
            // Stamp every finding with the durable audit id so the Evidence
            // Pack viewer can fetch exactly this audit's verification record.
            const auditId = String(completion.audit_id || '');
            const stampedFindings: Finding[] = findings.map((f): Finding => ({
              ...f,
              audit_id: f.audit_id || auditId,
            }));
            dispatch({ type: 'ADD_FINDINGS', findings: stampedFindings });
            // The user just ran an audit — take them straight to the findings
            // (RULE 4: one step, not "wait → read chat → click View Findings").
            // Keep the chat open so the AI summary stays visible.
            dispatch({ type: 'SET_VIEW', view: 'findings' });
            dispatch({ type: 'SET_RIGHT_PANEL', open: true });
            dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'chat' });
            dispatch({
              type: 'SET_AUDIT_PHASE',
              phase: terminalState === 'confirmed' || terminalState === 'clean_with_coverage'
                ? 'complete'
                : 'incomplete',
            });
            dispatch({
              type: 'ADD_CHAT_MESSAGE',
              message: {
                id: crypto.randomUUID(),
                role: 'system',
                content:
                  `■ TERMINAL STATE: ${terminalState.toUpperCase()} · ${evidenceCount} evidence pack(s)` +
                  (terminalState === 'degraded'
                    ? ' — some results could not be verified by Forge; manual review required.'
                    : terminalState === 'unverified'
                      ? ' — verifier coverage insufficient to classify this run as clean.'
                      : ''),
                timestamp: Date.now(),
              },
            });
          } else {
            // A completed run with zero findings is not automatically an error.
            // Only Forge coverage may declare it clean; all other terminal
            // outcomes remain explicitly unverified for human review.
            dispatch({
              type: 'SET_AUDIT_PHASE',
              phase: terminalState === 'clean_with_coverage' ? 'complete' : 'incomplete',
            });
            dispatch({
              type: 'ADD_CHAT_MESSAGE',
              message: {
                id: crypto.randomUUID(),
                role: 'system',
                content:
                  `Audit finished [${terminalState.toUpperCase() || 'UNVERIFIED'}] but no findings were produced.` +
                  (terminalState === 'clean_with_coverage'
                    ? ' Every hypothesis was executed by Forge and none reproduced — recorded as CLEAN WITH COVERAGE.'
                    : warnings.length > 0
                      ? ` ${warnings.join(' ')} Configure a backend model to improve verification coverage.`
                      : ' The code may be secure, or analysis coverage was insufficient. Configure a backend model to improve verification coverage.'),
                timestamp: Date.now(),
              },
            });
          }
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: typeof completion.report === 'string'
                ? completion.report
                : `Audit finished [${terminalState.toUpperCase()}]. Found ${findings.length} finding(s), ${evidenceCount} evidence pack(s).`,
              timestamp: Date.now(),
              suggestions: [
                { id: 'view-findings', label: 'View Findings', command: 'sireen.navigate', args: { view: 'findings' } },
                { id: 'open-evidence', label: 'Open Evidence Pack', command: 'sireen.evidence.open', args: { audit_id: (msg.payload as Record<string, unknown>)?.audit_id } },
                { id: 'generate-report', label: 'Generate Report', command: 'sireen.report.generate' },
              ],
            },
          });
          break;
        }

        case 'sireen.audit.incomplete':
          if (protectedTerminalCompletionRef.current) {
            break;
          }
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

        case 'sireen.audit.error':
          if (protectedTerminalCompletionRef.current) {
            break;
          }
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'error' });
          dispatch({ type: 'SET_VIEW', view: 'findings' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: `✗ AUDIT FAILED: ${(msg.payload as Record<string, unknown>)?.message
                || (msg.payload as Record<string, unknown>)?.error
                || 'Audit failed'}`,
              timestamp: Date.now(),
            },
          });
          break;

        case 'sireen.chat.message':
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: msg.payload as ChatMessage });
          dispatch({ type: 'SET_THINKING', thinking: false });
          break;

        // Core v0.1: router-level errors (e.g., "fetch failed" when the
        // backend is unreachable) MUST be visible. Previously this command
        // had no case here and REST failures disappeared silently.
        case 'sireen.error':
          // A REST failure can arrive after the backend has authoritatively
          // completed an audit. It is then stale transport noise, not a
          // reason to replace an UNVERIFIED/CLEAN terminal result with error.
          if (protectedTerminalCompletionRef.current) {
            break;
          }
          dispatch({ type: 'SET_AUDIT_PHASE', phase: 'error' });
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: {
              id: crypto.randomUUID(),
              role: 'system',
              content: `✗ ERROR (${(msg.payload as Record<string, unknown>)?.command || 'request'}): ${(msg.payload as Record<string, unknown>)?.error || 'Unknown error'}. Is the SIREEN backend running? Start it with: uvicorn main:app --port 7432 (see README).`,
              timestamp: Date.now(),
            },
          });
          break;

        // Core v0.1: structured pipeline stages. Human-readable stage lines
        // arrive separately via sireen.chat.message (router synthesizes them),
        // so this case only acknowledges the raw event.
        case 'sireen.stage':
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

        // NOTE: session lifecycle events (created/restored/switched/list/
        // listed/deleted) are handled EXACTLY ONCE in the richer block further
        // below. Do not re-register them here — first-match-wins in a switch
        // would make the richer handlers dead code (P0-4 regression guard).

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
                { id: 'selected-file-audit', label: 'Audit Selected Solidity File', command: 'sireen.audit.request' },
                { id: 'show-findings', label: 'View Findings', command: 'sireen.navigate', args: { view: 'findings' } },
              ],
            },
          });
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

        case 'sireen.session.update': {
          // Update session-specific state
          if (msg.payload?.audit_phase) {
            if (protectedTerminalCompletionRef.current) {
              break;
            }
            dispatch({ type: 'SET_AUDIT_PHASE', phase: msg.payload.audit_phase as any });
          }
          if (msg.payload?.audit_progress) {
            dispatch({ type: 'SET_AUDIT_PROGRESS', progress: msg.payload.audit_progress });
          }
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
          break;
        }

        case 'sireen.timeline.event': {
          const event = msg.payload as TimelineEvent;
          dispatch({ type: 'SET_TIMELINE_EVENTS', events: [event] });
          break;
        }

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
