import { memo, Suspense, lazy, useEffect, Component, type ReactNode } from 'react';
import { useStore } from '../../store';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from '../../layouts/RightPanel';
import { BottomPanel } from '../../layouts/BottomPanel';
import { Spinner } from '../components/Spinner';
import { Alert } from '../components/Alert';

const OverviewView = lazy(() => import('../../views/OverviewView'));
const ChatView = lazy(() => import('../../views/ChatView'));
const FindingsView = lazy(() => import('../../views/FindingsView'));
const ExploitsView = lazy(() => import('../../views/ExploitsView'));
const MemoryView = lazy(() => import('../../views/MemoryView'));
const ResearchNotesView = lazy(() => import('../../views/ResearchNotesView'));
const TasksView = lazy(() => import('../../views/TasksView'));
const SimulationView = lazy(() => import('../../views/SimulationView'));
const SettingsView = lazy(() => import('../../views/SettingsView'));
const AttackWorkspace = lazy(() => import('../../HackerMode'));

const viewComponents: Record<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>> = {
  overview: OverviewView,
  chat: ChatView,
  findings: FindingsView,
  exploits: ExploitsView,
  memory: MemoryView,
  notes: ResearchNotesView,
  tasks: TasksView,
  simulation: SimulationView,
  settings: SettingsView,
  contracts: OverviewView,
  attackSurface: OverviewView,
  warRoom: OverviewView,
  attackWorkspace: AttackWorkspace,
};

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

function CopilotLayoutImpl() {
  const { state, dispatch } = useStore();
  const ViewComponent = viewComponents[state.activeView] || OverviewView;

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
        height: '100vh',
        width: '100vw',
        background: 'var(--sireen-bg-primary)',
        overflow: 'hidden',
      }}
    >
      <LeftSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sireen-space-3) var(--sireen-space-4)' }}>
          <Suspense fallback={<ViewLoader />}>
            <ViewErrorBoundary>
              <ViewComponent />
            </ViewErrorBoundary>
          </Suspense>
        </div>
        {state.bottomPanelOpen && <BottomPanel />}
      </div>
      {state.rightPanelOpen && <RightPanel />}
    </div>
  );
}

export const CopilotLayout = memo(CopilotLayoutImpl);
