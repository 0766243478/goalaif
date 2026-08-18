import { useState } from 'react';
import { useStore } from '../store';
import { useSend } from '../hooks/useMessageBus';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Card } from '../ui/components/Card';
import { Input } from '../ui/components/Input';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/components/Badge';
import { EmptyState } from '../ui/components/EmptyState';
import { Terminal } from '../ui/components/Terminal';
import type { TerminalLineType } from '../ui/components/Terminal';

export default function SimulationView() {
  const { state } = useStore();
  const { send } = useSend();
  const [forkUrl, setForkUrl] = useState('https://eth.llamarpc.com');

  const lines = state.simulationLog.map((entry, i) => ({
    id: `log-${i}`,
    text: (
      <>
        <span style={{ color: 'var(--sireen-fg-muted)' }}>[{new Date(entry.timestamp).toLocaleTimeString()}]</span>{' '}
        {entry.message}
      </>
    ),
    type: (entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warning' : 'muted') as TerminalLineType,
  }));

  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">
          Simulation
        </Text>
        <Text variant="caption" color="muted">
          Run exploits in a sandboxed environment
        </Text>
      </Stack>

      <Card padded>
        <Stack gap={2}>
          <Flex align="center" justify="space-between">
            <Text variant="body" weight="semibold">
              Sandbox Status
            </Text>
            <Badge variant="filled" color={state.sandboxReady ? 'green' : 'gray'}>
              {state.sandboxReady ? 'READY' : 'OFFLINE'}
            </Badge>
          </Flex>
          <Button
            variant="primary"
            block
            onClick={() => send('sireen.sandbox.start', { rpcUrl: forkUrl })}
            disabled={state.sandboxReady}
          >
            {state.sandboxReady ? 'Running' : 'Start Sandbox'}
          </Button>
          <Text variant="caption" color="muted">
            Fork RPC URL:
          </Text>
          <Input value={forkUrl} onChange={e => setForkUrl(e.target.value)} aria-label="Fork RPC URL" />
        </Stack>
      </Card>

      {state.simulationLog.length > 0 ? (
        <Terminal title="Log" lines={lines} maxHeight={300} />
      ) : (
        <EmptyState
          icon="simulation"
          title="No simulation output"
          message="Start the sandbox and run an exploit to see results"
        />
      )}
    </Stack>
  );
}
