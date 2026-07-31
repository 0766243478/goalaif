import { Component, memo, Suspense, lazy, type ReactNode } from 'react';
import { useStore } from '../store';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';

const OverviewView = lazy(() => import('../views/OverviewView'));
const ChatView = lazy(() => import('../views/ChatView'));
const FindingsView = lazy(() => import('../views/FindingsView'));
const ExploitsView = lazy(() => import('../views/ExploitsView'));
const MemoryView = lazy(() => import('../views/MemoryView'));
const ResearchNotesView = lazy(() => import('../views/ResearchNotesView'));
const TasksView = lazy(() => import('../views/TasksView'));
const SimulationView = lazy(() => import('../views/SimulationView'));
const SettingsView = lazy(() => import('../views/SettingsView'));
const AttackWorkspace = lazy(() => import('../HackerMode'));

const viewComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
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

class ViewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 12, color: 'var(--sireen-critical)', fontSize: 12 }}>
          This view failed to render. Check the Developer Tools console for details.
        </div>
      );
    }
    return this.props.children;
  }
}

const ViewLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: 'var(--sireen-text-ghost)',
  }}>
    <div className="animate-spin" style={{
      width: 16, height: 16, border: '2px solid var(--sireen-border)',
      borderTopColor: 'var(--sireen-amber)', borderRadius: '50%',
    }} />
  </div>
);

const CopilotLayout = memo(function CopilotLayout() {
  const { state } = useStore();
  const ViewComponent = viewComponents[state.activeView] || OverviewView;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--sireen-abyss)', overflow: 'hidden' }}>
      <LeftSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
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
});

export { CopilotLayout };
