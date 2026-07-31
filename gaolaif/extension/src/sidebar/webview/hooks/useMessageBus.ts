import { useEffect, useCallback } from 'react';
import { vscode } from '../vscodeApi';
import { useStore } from '../store';
import type { ChatMessage, ThinkingStep, ExploitRecord, MemoryEntry, ProactiveSuggestion, LogEntry, ProtocolState, PipelineStage, ViewId } from '../store/types';

export function useMessageBus() {
  const { dispatch } = useStore();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.command) return;

      switch (msg.command) {
        case 'sireen.connection.status':
          dispatch({ type: 'SET_CONNECTION', status: msg.payload.status });
          break;

        case 'sireen.apiKey.status':
          dispatch({ type: 'SET_API_KEY', set: msg.payload.configured });
          break;

        case 'sireen.audit.started':
          dispatch({ type: 'SET_SESSION', id: msg.payload.sessionId });
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

        case 'sireen.chat.message':
          dispatch({ type: 'ADD_CHAT_MESSAGE', message: msg.payload as ChatMessage });
          dispatch({ type: 'SET_THINKING', thinking: false });
          break;

        case 'sireen.chat.proactive':
          dispatch({ type: 'ADD_SUGGESTION', suggestion: msg.payload as ProactiveSuggestion });
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
          dispatch({ type: 'SET_VIEW', view: 'attackWorkspace' });
          break;

        case 'sireen.exploit.started':
          dispatch({ type: 'SET_SESSION', id: msg.payload.sessionId });
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
                { id: 'show-attack', label: 'Show Attack Surface', command: 'sireen.navigate', args: { view: 'attackSurface' } },
              ],
            },
          });
          break;

        case 'sireen.sandbox.status':
          dispatch({ type: 'SET_SANDBOX', ready: msg.payload.ready });
          break;

        case 'sireen.sandbox.started':
          dispatch({ type: 'SET_SANDBOX', ready: true });
          break;

        case 'sireen.sandbox.log':
          dispatch({ type: 'ADD_SIM_LOG', entry: msg.payload as LogEntry });
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
  }, [dispatch]);

  const send = useCallback((command: string, payload?: Record<string, unknown>) => {
    vscode.postMessage({ command, payload });
  }, []);

  return { send };
}
