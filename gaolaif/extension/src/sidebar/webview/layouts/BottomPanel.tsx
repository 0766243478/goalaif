import { useStore } from '../store';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Button } from '../ui/components/Button';
import { Terminal } from '../ui/components/Terminal';
import type { TerminalLineType } from '../ui/components/Terminal';

export function BottomPanel() {
  const { state, dispatch } = useStore();

  const lines = state.simulationLog.map((entry, i) => ({
    id: `log-${i}`,
    text: (
      <>
        <span style={{ color: 'var(--sireen-fg-muted)' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>{' '}
        <span style={{ color: 'var(--sireen-fg-muted)' }}>[{entry.source}]</span>{' '}
        {entry.message}
      </>
    ),
    type: (entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warning' : 'muted') as TerminalLineType,
  }));

  return (
    <div
      style={{
        height: 200,
        borderTop: '1px solid var(--sireen-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Flex align="center" style={{ borderBottom: '1px solid var(--sireen-border-subtle)', padding: '0 var(--sireen-space-2)' }}>
        <Text
          variant="caption"
          weight="semibold"
          style={{
            padding: 'var(--sireen-space-2) 0',
            color: 'var(--sireen-accent-amber)',
            borderBottom: '2px solid var(--sireen-accent-amber)',
          }}
        >
          Logs
        </Text>
        <div style={{ flex: 1 }} />
        <Button
          variant="ghost"
          size="sm"
          iconOnly="x"
          aria-label="Close panel"
          onClick={() => dispatch({ type: 'SET_BOTTOM_PANEL', open: false })}
        />
      </Flex>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {state.simulationLog.length === 0 ? (
          <div style={{ padding: 'var(--sireen-space-2)' }}>
            <Text variant="caption" color="muted">
              No logs yet. Run an audit or exploit to see output.
            </Text>
          </div>
        ) : (
          <Terminal lines={lines} maxHeight={170} />
        )}
      </div>
    </div>
  );
}
