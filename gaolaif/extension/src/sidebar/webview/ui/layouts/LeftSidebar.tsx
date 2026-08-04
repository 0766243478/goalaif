import { memo } from 'react';
import { useStore } from '../../store';
import type { ViewId } from '../../store/types';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';
import { Tooltip } from '../components/Tooltip';

interface ViewItem {
  id: ViewId;
  icon: IconName;
  label: string;
  badge?: (state: ReturnType<typeof useStore>['state']) => number;
}

const views: ViewItem[] = [
  { id: 'overview', icon: 'overview', label: 'Overview' },
  { id: 'findings', icon: 'findings', label: 'Findings', badge: s => s.findings.length },
  { id: 'chat', icon: 'chat', label: 'Chat' },
  { id: 'attackWorkspace', icon: 'attackWorkspace', label: 'Attack Workspace' },
  { id: 'exploits', icon: 'exploits', label: 'Exploits', badge: s => s.exploits.length },
  { id: 'memory', icon: 'memory', label: 'Memory', badge: s => s.memoryEntries.length },
  { id: 'notes', icon: 'notes', label: 'Notes' },
  { id: 'tasks', icon: 'tasks', label: 'Tasks', badge: s => s.tasks.filter(t => t.status === 'open').length },
  { id: 'simulation', icon: 'simulation', label: 'Simulation' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

function LeftSidebarImpl() {
  const { state, dispatch } = useStore();

  return (
    <nav
      style={{
        width: 'var(--sireen-sidebar-width)',
        minWidth: 'var(--sireen-sidebar-width)',
        background: 'var(--sireen-bg-secondary)',
        borderRight: '1px solid var(--sireen-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--sireen-space-2) 0',
        gap: 'var(--sireen-space-1)',
        overflow: 'hidden',
      }}
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--sireen-radius-md)',
          background: 'var(--sireen-bg-inactive)',
          color: 'var(--sireen-accent-amber)',
          userSelect: 'none',
        }}
      >
        <Icon name="brand" size="lg" />
      </div>

      <div style={{ width: 24, height: 1, background: 'var(--sireen-border-subtle)', margin: 'var(--sireen-space-1) 0 var(--sireen-space-2)' }} />

      {views.map(v => {
        const count = v.badge?.(state);
        const isActive = state.activeView === v.id;
        return (
          <Tooltip key={v.id} content={v.label} position="right">
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: v.id })}
              aria-label={v.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--sireen-radius-md)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                background: isActive ? 'var(--sireen-bg-inactive)' : 'transparent',
                color: isActive ? 'var(--sireen-fg-primary)' : 'var(--sireen-fg-muted)',
                transition: 'background-color var(--sireen-duration-fast) var(--sireen-ease), color var(--sireen-duration-fast) var(--sireen-ease)',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--sireen-bg-hover)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon name={v.icon} size="md" />
              {count != null && count > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
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

      {/* Connection status */}
      <Tooltip content={state.connectionStatus === 'connected' ? 'Backend connected' : 'Backend disconnected'} position="right">
        <div
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--sireen-radius-md)',
            color: state.connectionStatus === 'connected' ? 'var(--sireen-success-fg)' : 'var(--sireen-fg-muted)',
          }}
        >
          <Icon name={state.connectionStatus === 'connected' ? 'connected' : 'disconnected'} size="sm" />
        </div>
      </Tooltip>
    </nav>
  );
}

export const LeftSidebar = memo(LeftSidebarImpl);
