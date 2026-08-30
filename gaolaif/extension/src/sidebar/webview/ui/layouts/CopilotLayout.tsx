import { memo, useEffect, useCallback, Component, type ReactNode, type ComponentType } from 'react';
import { useStore } from '../../store';
import type { ViewId } from '../../store/types';
import { useSend } from '../../hooks/useMessageBus';
import { RightPanel } from '../../layouts/RightPanel';
import { Spinner } from '../components/Spinner';
import { Alert } from '../components/Alert';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';
import { Tooltip } from '../components/Tooltip';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Stack } from '../primitives/Stack';
import { Button } from '../components/Button';

import SessionManagerView from '../../views/SessionManagerView';
import OverviewView from '../../views/OverviewView';
import FindingsView from '../../views/FindingsView';
import ExploitsView from '../../views/ExploitsView';
import ResearchNotesView from '../../views/ResearchNotesView';
import TasksView from '../../views/TasksView';
import SettingsView from '../../views/SettingsView';

const viewComponents: Partial<Record<ViewId, ComponentType<Record<string, unknown>>>> = {
  sessionManager: SessionManagerView,
  overview: OverviewView,
  findings: FindingsView,
  exploits: ExploitsView,
  notes: ResearchNotesView,
  tasks: TasksView,
  settings: SettingsView,
};

interface TabItem {
  id: ViewId;
  icon: IconName;
  label: string;
  badge?: (state: ReturnType<typeof useStore>['state']) => number;
}

const tabs: TabItem[] = [
  { id: 'overview', icon: 'overview', label: 'Overview' },
  { id: 'findings', icon: 'findings', label: 'Findings', badge: s => s.findings.length },
  { id: 'exploits', icon: 'exploits', label: 'Exploits', badge: s => s.exploits.length },
  { id: 'notes', icon: 'notes', label: 'Notes' },
  { id: 'tasks', icon: 'tasks', label: 'Tasks', badge: s => s.tasks.filter(t => t.status === 'open').length },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

function SessionHeader() {
  const { state, dispatch } = useStore();
  const { send } = useSend();
  const saveWorkspace = useCallback(() => {
    if (!state.activeSessionId) return;
    send('sireen.session.saveWorkspace', {
      id: state.activeSessionId,
      state: {
        findings: state.findings,
        exploits: state.exploits,
        chatMessages: state.chatMessages,
        thinkingSteps: state.thinkingSteps,
        notes: state.researchNotes,
        tasks: state.tasks,
        protocol: state.protocol,
        contractCode: state.contractCode,
        contractFilePath: state.contractFilePath,
        auditPhase: state.auditPhase,
        auditProgress: state.auditProgress,
        activeView: state.activeView,
        rightPanelTab: state.rightPanelTab,
        rightPanelOpen: state.rightPanelOpen,
      },
    });
  }, [state, send]);

  // Auto-save workspace state every 30 seconds when a session is active
  useEffect(() => {
    if (!state.activeSessionId) return;
    const timer = setInterval(saveWorkspace, 30000);
    return () => clearInterval(timer);
  }, [state.activeSessionId, saveWorkspace]);

  if (!state.activeSessionId) return null;

  // Determine the current workflow stage to answer "WHAT SHOULD I DO NEXT?"
  const auditPhase = state.auditPhase;
  const hasFindings = state.findings.length > 0;
  const hasExploits = state.exploits.length > 0;
  const hasConfirmedExploits = state.exploits.some(e => e.confirmed);

  let nextStep = '';
  let nextStepAction: (() => void) | null = null;
  if (auditPhase === 'idle' && !state.contractCode) {
    nextStep = 'Open a .sol file and right-click → Audit';
  } else if (auditPhase === 'idle') {
    nextStep = 'Audit the selected Solidity file to start analysis';
    nextStepAction = () => dispatch({ type: 'SET_VIEW', view: 'overview' });
  } else if (auditPhase === 'phase1' || auditPhase === 'phase2' || auditPhase === 'phase3' || auditPhase === 'phase4') {
    nextStep = `Audit running: ${auditPhase}…`;
  } else if (auditPhase === 'complete' && !hasFindings) {
    nextStep = 'Audit complete — no findings. Try an exploit hypothesis.';
    nextStepAction = () => dispatch({ type: 'SET_VIEW', view: 'exploits' });
  } else if (auditPhase === 'complete' && hasFindings && !hasExploits) {
    nextStep = 'Review findings, then generate an exploit';
    nextStepAction = () => dispatch({ type: 'SET_VIEW', view: 'findings' });
  } else if (hasExploits && !hasConfirmedExploits) {
    nextStep = 'Exploit not confirmed — try a different hypothesis';
    nextStepAction = () => dispatch({ type: 'SET_VIEW', view: 'exploits' });
  } else if (hasConfirmedExploits) {
    nextStep = 'Exploit confirmed — generate a report';
    nextStepAction = () => dispatch({ type: 'SET_VIEW', view: 'exploits' });
  }

  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        padding: 'var(--sireen-space-1) var(--sireen-space-3)',
        background: 'var(--sireen-bg-elevated)',
        borderBottom: '1px solid var(--sireen-border-subtle)',
        flexShrink: 0,
      }}
    >
      <Flex gap={2} align="center">
        <Icon name="brand" size="sm" />
        <Text variant="caption" weight="semibold">{state.activeSessionName || 'Session'}</Text>
        {state.protocol && (
          <Text variant="caption" color="muted">· {state.protocol.name}</Text>
        )}
        {state.findings.length > 0 && (
          <Text variant="caption" color="muted">· {state.findings.length} findings</Text>
        )}
        {state.exploits.length > 0 && (
          <Text variant="caption" color="muted">· {state.exploits.length} exploits</Text>
        )}
      </Flex>
      <Flex gap={1} align="center">
        {nextStep && (
          <Text
            variant="caption"
            color="secondary"
            style={{
              cursor: nextStepAction ? 'pointer' : 'default',
              textDecoration: nextStepAction ? 'underline' : 'none',
            }}
            onClick={nextStepAction || undefined}
          >
            {nextStep}
          </Text>
        )}
        <Button size="sm" variant="ghost" onClick={saveWorkspace} iconLeft="download">Save</Button>
        <Button
          size="sm"
          variant="ghost"
          iconLeft="layers"
          onClick={() => {
            saveWorkspace();
            dispatch({ type: 'SET_SESSION_VIEW', view: 'manager' });
            dispatch({ type: 'SET_VIEW', view: 'sessionManager' });
          }}
        >
          Sessions
        </Button>
      </Flex>
    </Flex>
  );
}

class ViewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[SIREEN] View crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--sireen-space-3)' }}>
          <Alert variant="error" title="View failed to render">
            {this.state.error?.message || 'Unknown error'}. Check the Developer Tools console for details.
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}

function ViewLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--sireen-space-2)',
        color: 'var(--sireen-fg-muted)',
      }}
    >
      <Spinner size="md" />
    </div>
  );
}

function TabBar() {
  const { state, dispatch } = useStore();
  return (
    <nav
      role="tablist"
      aria-label="Workspace navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sireen-space-1)',
        padding: '0 var(--sireen-space-2)',
        height: 'var(--sireen-tabbar-height, 36px)',
        minHeight: 'var(--sireen-tabbar-height, 36px)',
        background: 'var(--sireen-bg-secondary)',
        borderBottom: '1px solid var(--sireen-border-subtle)',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
      }}
    >
      {tabs.map(tab => {
        const isActive = state.activeView === tab.id;
        const count = tab.badge?.(state);
        return (
          <Tooltip key={tab.id} content={tab.label} position="bottom">
            <button
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => dispatch({ type: 'SET_VIEW', view: tab.id })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sireen-space-1)',
                padding: 'var(--sireen-space-1) var(--sireen-space-2)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--sireen-accent-amber)' : '2px solid transparent',
                background: isActive ? 'var(--sireen-bg-inactive)' : 'transparent',
                color: isActive ? 'var(--sireen-fg-primary)' : 'var(--sireen-fg-muted)',
                cursor: 'pointer',
                borderRadius: 0,
                whiteSpace: 'nowrap',
                fontSize: 'var(--sireen-font-size-caption)',
                fontWeight: isActive ? 'var(--sireen-font-weight-semibold)' : 'var(--sireen-font-weight-regular)',
                transition: 'background-color var(--sireen-duration-fast) var(--sireen-ease), color var(--sireen-duration-fast) var(--sireen-ease)',
              }}
            >
              <Icon name={tab.icon} size="sm" />
              {tab.label}
              {count != null && count > 0 && (
                <span
                  style={{
                    background: 'var(--sireen-severity-critical-fg)',
                    color: '#fff',
                    fontSize: 'var(--sireen-font-size-overline)',
                    fontWeight: 'var(--sireen-font-weight-semibold)',
                    borderRadius: 'var(--sireen-radius-full)',
                    padding: '1px var(--sireen-space-1)',
                    lineHeight: 1,
                    minWidth: 14,
                    textAlign: 'center',
                  }}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          </Tooltip>
        );
      })}
      <div style={{ flex: 1 }} />
      <Tooltip content={state.connectionStatus === 'connected' ? 'Backend connected' : 'Backend disconnected'} position="bottom">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            color: state.connectionStatus === 'connected' ? 'var(--sireen-success-fg)' : 'var(--sireen-fg-muted)',
          }}
        >
          <Icon name={state.connectionStatus === 'connected' ? 'connected' : 'disconnected'} size="sm" />
        </div>
      </Tooltip>
    </nav>
  );
}

function CopilotLayoutImpl() {
  const { state, dispatch } = useStore();
  const isSessionManager = state.sessionView === 'manager' || !state.activeSessionId;
  const ViewComponent = isSessionManager ? SessionManagerView : (viewComponents[state.activeView] || OverviewView);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 560px)');
    const apply = () => dispatch({ type: 'SET_RIGHT_PANEL', open: !mq.matches });
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [dispatch]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--sireen-bg-primary)',
        overflow: 'hidden',
      }}
    >
      {!isSessionManager && <SessionHeader />}
      {!isSessionManager && <TabBar />}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sireen-space-3) var(--sireen-space-4)' }}>
            <ViewErrorBoundary>
              <ViewComponent />
            </ViewErrorBoundary>
          </div>
        </div>
        {state.rightPanelOpen && !isSessionManager && <RightPanel />}
      </div>
    </div>
  );
}

export const CopilotLayout = memo(CopilotLayoutImpl);
