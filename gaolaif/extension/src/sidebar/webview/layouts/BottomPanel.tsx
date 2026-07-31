import { useStore } from '../store';

export function BottomPanel() {
  const { state, dispatch } = useStore();

  return (
    <div style={{
      height: 200,
      borderTop: '1px solid var(--sireen-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--sireen-border)',
        background: 'var(--sireen-void)',
        padding: '0 8px',
        alignItems: 'center',
      }}>
        <span style={{
          padding: '6px 0',
          color: 'var(--sireen-amber)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'inherit',
          borderBottom: '2px solid var(--sireen-amber)',
        }}>
          Logs
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => dispatch({ type: 'SET_BOTTOM_PANEL', open: false })}
          style={{
            padding: '0 4px',
            background: 'transparent',
            border: 'none',
            color: 'var(--sireen-text-ghost)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          x
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
        {state.simulationLog.length === 0 ? (
          <div style={{ color: 'var(--sireen-text-ghost)', padding: 8 }}>
            No logs yet. Run an audit or exploit to see output.
          </div>
        ) : (
          state.simulationLog.map((entry, i) => (
            <div key={i} style={{
              padding: '2px 0',
              color: entry.level === 'error' ? 'var(--sireen-critical)' :
                     entry.level === 'warn' ? 'var(--sireen-medium)' :
                     'var(--sireen-text-secondary)',
            }}>
              <span style={{ color: 'var(--sireen-text-ghost)' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              {' '}
              <span style={{ color: 'var(--sireen-text-muted)' }}>[{entry.source}]</span>
              {' '}
              {entry.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}