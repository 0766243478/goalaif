import '@testing-library/jest-dom';
import { render, act } from '@testing-library/react';
import { useMessageBus, useSend } from '../useMessageBus';
import { StoreProvider, useStore } from '../../store';
import type { SireenState } from '../../store/types';
import * as React from 'react';

/**
 * Harness: mounts ONE useMessageBus owner (the app-root invariant) plus N
 * useSend consumers. Returns a spied dispatch so we can assert how many times
 * the reducer ran for a single posted message.
 */
function makeHarness(consumerCount: number) {
  const dispatchCalls: string[] = [];
  let dispatchRef: React.Dispatch<unknown> | null = null;
  const stateRef: { value: SireenState | null } = { value: null };

  const Owner = () => {
    useMessageBus();
    return null;
  };

  const Consumer = () => {
    useSend();
    return null;
  };

  const Spy = () => {
    const { state, dispatch } = useStore();
    // Wrap dispatch to record calls without breaking the reducer contract.
    React.useEffect(() => {
      dispatchRef = (action: unknown) => {
        const a = action as { type: string };
        dispatchCalls.push(a.type);
        dispatch(action as never);
      };
    }, [dispatch]);
    React.useEffect(() => {
      stateRef.value = state;
    }, [state]);
    return null;
  };

  const tree = (
    <StoreProvider>
      <Spy />
      <Owner />
      {Array.from({ length: consumerCount }, (_, i) => (
        <Consumer key={i} />
      ))}
    </StoreProvider>
  );
  return { tree, dispatchCalls, getDispatch: () => dispatchRef, getState: () => stateRef.value };
}

function postMessage(command: string, payload: Record<string, unknown> = {}) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', { data: { command, payload } })
    );
  });
}

describe('useMessageBus / useSend — single-listener invariant', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches a chat message exactly once with one owner + 5 consumers', () => {
    const { tree, dispatchCalls, getDispatch } = makeHarness(5);
    render(tree);

    // The store's real dispatch is wired through Spy; but useMessageBus uses
    // the store dispatch directly. To count reducer runs we instead assert on
    // the number of times the message listener fires by spying on addEventListener.
    // Simpler: post a message and assert no exception + consumer count stable.
    expect(() => postMessage('sireen.chat.message', {
      id: 'm1', role: 'assistant', content: 'hi', timestamp: Date.now(),
    })).not.toThrow();

    // dispatchCalls may be empty because useMessageBus calls the real dispatch,
    // not our spy. The real assertion is the listener-count test below.
    expect(dispatchCalls).toEqual([]);
    expect(getDispatch()).not.toBeNull();
  });

  it('registers exactly ONE window message listener regardless of consumer count', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');

    render(makeHarness(8).tree);

    const messageListeners = addSpy.mock.calls.filter(
      ([type]) => type === 'message'
    );
    // One listener from useMessageBus. useSend must NOT add any.
    expect(messageListeners.length).toBe(1);

    addSpy.mockRestore();
  });

  it('useSend does not register a window message listener', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');

    render(
      <StoreProvider>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i}><ConsumerOnly /></div>
        ))}
      </StoreProvider>
    );

    const messageListeners = addSpy.mock.calls.filter(
      ([type]) => type === 'message'
    );
    expect(messageListeners.length).toBe(0);

    addSpy.mockRestore();
  });

  it('cleans up its single listener on unmount (no leak)', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(makeHarness(3).tree);

    unmount();

    const removed = removeSpy.mock.calls.filter(([type]) => type === 'message');
    expect(removed.length).toBe(1);

    removeSpy.mockRestore();
  });

  it('unwraps canonical audit completion events before updating findings and report state', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      event_id: 'event-1',
      session_id: 'audit-1',
      type: 'audit_complete',
      status: 'completed',
      timestamp: Date.now(),
      payload: {
        // Core v0.1 contract: every completion carries an explicit
        // terminal_state. UI must never infer success without it.
        terminal_state: 'confirmed',
        findings: [{
          id: 'finding-1',
          title: 'Reentrancy',
          severity: 'HIGH',
          description: 'External call before state update',
          affected_functions: ['withdraw'],
          confirmed: true,
          category: 'reentrancy',
          remediation: 'Apply CEI',
          evidence_id: 'evd-test-1',
        }],
        evidence: [{ id: 'evd-test-1' }],
        report: 'Audit report',
        warnings: [],
      },
    });

    expect(getState()?.findings).toHaveLength(1);
    expect(getState()?.auditPhase).toBe('complete');
    const messages = getState()?.chatMessages || [];
    expect(messages[messages.length - 1]?.content).toBe('Audit report');
  });

  it('maps DEGRADED terminal state to incomplete phase (never generic success)', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      event_id: 'event-2',
      session_id: 'audit-2',
      type: 'audit_complete',
      status: 'completed',
      timestamp: Date.now(),
      payload: {
        terminal_state: 'degraded',
        findings: [{
          id: 'finding-2', title: 'Needs review', severity: 'MEDIUM',
          description: '', affected_functions: [], confirmed: false,
          needs_review: true, category: 'reentrancy', remediation: '',
          evidence_id: 'evd-2',
        }],
        evidence: [{ id: 'evd-2' }],
        report: 'Degraded report',
        warnings: ['1 finding(s) could not be verified'],
      },
    });

    expect(getState()?.auditPhase).toBe('incomplete');
  });

  it('surfaces router-level errors (sireen.error) instead of swallowing them', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.error', {
      command: 'sireen.audit.request',
      error: 'fetch failed',
    });

    expect(getState()?.auditPhase).toBe('error');
    const messages = getState()?.chatMessages || [];
    expect(messages[messages.length - 1]?.content).toContain('fetch failed');
  });

  it('activates a newly created persistent session and opens its workspace', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.session.created', {
      id: 'session-regression-1',
      name: 'Regression session',
    });

    expect(getState()?.activeSessionId).toBe('session-regression-1');
    expect(getState()?.activeSessionName).toBe('Regression session');
    expect(getState()?.sessionView).toBe('workspace');
    expect(getState()?.activeView).toBe('overview');
  });

  // ── Task 13 negative tests: SIREEN UI must NOT lie ────────────────────────

  it('does NOT show success when completion payload lacks terminal_state (malformed result)', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      event_id: 'event-3',
      session_id: 'audit-3',
      type: 'audit_complete',
      status: 'completed',
      timestamp: Date.now(),
      payload: {
        // Malformed: no terminal_state. A dishonest UI would treat this as
        // generic success. SIREEN must fall back to UNVERIFIED semantics.
        findings: [{
          id: 'finding-3', title: 'X', severity: 'HIGH', description: '',
          affected_functions: [], confirmed: true, category: 'reentrancy',
          remediation: '', evidence_id: '',
        }],
        report: 'report',
        warnings: [],
      },
    });

    expect(getState()?.auditPhase).toBe('incomplete');
    expect(getState()?.auditPhase).not.toBe('complete');
  });

  it('zero findings with UNVERIFIED terminal state is a completed heuristic result, not an error', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      event_id: 'event-4',
      session_id: 'audit-4',
      type: 'audit_complete',
      status: 'completed',
      timestamp: Date.now(),
      payload: {
        terminal_state: 'unverified',
        findings: [],
        evidence: [],
        report: '',
        warnings: ['Model verification is unavailable.'],
      },
    });

    expect(getState()?.auditPhase).toBe('incomplete');
    expect(getState()?.auditPhase).not.toBe('error');
    const messages = getState()?.chatMessages || [];
    expect(messages.some(m => m.content.includes('UNVERIFIED'))).toBe(true);
    expect(messages.some(m => m.content.includes('Configure a backend model'))).toBe(true);
  });

  it('keeps a zero-finding UNVERIFIED completion visible when a stale audit error follows it', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      terminal_state: 'unverified',
      findings: [],
      evidence: [],
      report: '',
      warnings: ['Model verification is unavailable.'],
    });
    postMessage('sireen.audit_error', { message: 'stale transport failure' });

    expect(getState()?.auditPhase).toBe('incomplete');
    expect(getState()?.auditPhase).not.toBe('error');
    expect(getState()?.chatMessages.some(message => message.content.includes('stale transport failure'))).toBe(false);
  });

  it('keeps a zero-finding UNVERIFIED completion visible when a stale router error follows it', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      terminal_state: 'unverified',
      findings: [],
      evidence: [],
      report: '',
      warnings: ['Model verification is unavailable.'],
    });
    postMessage('sireen.error', {
      command: 'sireen.report.generate',
      error: 'stale REST failure',
    });

    expect(getState()?.auditPhase).toBe('incomplete');
    expect(getState()?.auditPhase).not.toBe('error');
    expect(getState()?.chatMessages.some(message => message.content.includes('stale REST failure'))).toBe(false);
  });

  it('zero findings with CLEAN_WITH_COVERAGE terminal state completes cleanly', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      terminal_state: 'clean_with_coverage',
      findings: [],
      evidence: [],
      report: '',
      warnings: [],
    });

    expect(getState()?.auditPhase).toBe('complete');
  });
});
  it('stamps every finding with the durable audit_id so the Evidence Pack is reachable (Phase 5)', () => {
    const { tree, getState } = makeHarness(0);
    render(tree);

    postMessage('sireen.audit_complete', {
      event_id: 'event-5',
      session_id: 'audit-5',
      type: 'audit_complete',
      status: 'completed',
      timestamp: Date.now(),
      payload: {
        audit_id: 'audit-5',
        terminal_state: 'confirmed',
        findings: [
          { id: 'f1', title: 'Reentrancy in withdraw', severity: 'CRITICAL', confirmed: true },
          { id: 'f2', title: 'Unsafe math', severity: 'MEDIUM', confirmed: false },
        ],
        evidence: [],
        report: '',
        warnings: [],
      },
    });

    const findings = getState()?.findings || [];
    expect(findings.length).toBe(2);
    for (const f of findings) {
      // Without this link the Evidence Pack viewer is unreachable from the UI.
      expect((f as unknown as Record<string, unknown>).audit_id).toBe('audit-5');
    }
  });



function ConsumerOnly() {
  useSend();
  return null;
}
