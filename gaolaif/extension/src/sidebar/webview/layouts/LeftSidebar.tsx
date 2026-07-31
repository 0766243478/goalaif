import { useStore } from '../store';
import type { ViewId } from '../store/types';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';

interface ViewItem {
  id: ViewId;
  icon: IconName;
  label: string;
  badge?: (state: ReturnType<typeof useStore>['state']) => number;
}

const views: ViewItem[] = [
  { id: 'overview', icon: 'overview', label: 'Overview' },
  { id: 'findings', icon: 'findings', label: 'Findings', badge: (s) => s.findings.length },
  { id: 'chat', icon: 'chat', label: 'Chat' },
  { id: 'attackWorkspace', icon: 'attackWorkspace', label: 'Attack Workspace' },
  { id: 'exploits', icon: 'exploits', label: 'Exploits', badge: (s) => s.exploits.length },
  { id: 'memory', icon: 'memory', label: 'Memory', badge: (s) => s.memoryEntries.length },
  { id: 'notes', icon: 'notes', label: 'Notes' },
  { id: 'tasks', icon: 'tasks', label: 'Tasks', badge: (s) => s.tasks.filter(t => t.status === 'open').length },
  { id: 'simulation', icon: 'simulation', label: 'Simulation' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

export function LeftSidebar() {
  const { state, dispatch } = useStore();

  return (
    <div style={{
      width: 48,
      minWidth: 48,
      background: 'var(--sireen-void)',
      borderRight: '1px solid var(--sireen-border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 0',
      gap: 2,
      overflow: 'hidden',
    }}>
      <div style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        background: 'var(--sireen-amber-bg)',
        color: 'var(--sireen-amber)',
        cursor: 'default',
        userSelect: 'none',
      }}>
        <Icon name="brand" size={18} />
      </div>

      <div style={{ width: 24, height: 1, background: 'var(--sireen-border)', margin: '4px 0 8px' }} />

      {views.map((v) => {
        const count = v.badge?.(state);
        const isActive = state.activeView === v.id;
        return (
          <button
            key={v.id}
            onClick={() => dispatch({ type: 'SET_VIEW', view: v.id })}
            title={v.label}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              background: isActive ? 'var(--sireen-raised)' : 'transparent',
              color: isActive ? 'var(--sireen-amber)' : 'var(--sireen-text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name={v.icon} size={16} />
            {count != null && count > 0 && (
              <span style={{
                position: 'absolute',
                top: 2,
                right: 2,
                background: 'var(--sireen-critical)',
                color: '#fff',
                fontSize: 7,
                fontWeight: 700,
                borderRadius: 'var(--radius-full)',
                padding: '1px 3px',
                lineHeight: 1,
                minWidth: 12,
                textAlign: 'center',
              }}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <div style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        color: state.connectionStatus === 'connected' ? 'var(--sireen-green)' : 'var(--sireen-text-ghost)',
      }}
        title={state.connectionStatus === 'connected' ? 'Backend connected' : 'Backend disconnected'}
      >
        <Icon
          name={state.connectionStatus === 'connected' ? 'connected' : 'disconnected'}
          size={14}
        />
      </div>
    </div>
  );
}
