import { useStore } from '../store';
import { useSend } from '../hooks/useMessageBus';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Card } from '../ui/components/Card';
import { Badge } from '../ui/components/Badge';
import { Button } from '../ui/components/Button';

function StatusBadge({ value, onLabel }: { value: string; onLabel: string }) {
  const on = value === onLabel;
  return (
    <Badge variant="filled" color={on ? 'green' : 'gray'}>
      {on ? '●' : '○'} {value.replace('-', ' ').toUpperCase()}
    </Badge>
  );
}

export default function SettingsView() {
  const { state } = useStore();
  const { send } = useSend();
  const status = state.backendStatus;

  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">Settings</Text>
        <Text variant="caption" color="muted">Backend status — SIREEN never asks for your LLM API key here</Text>
      </Stack>

      <Card padded>
        <Stack gap={2}>
          <Flex align="center" justify="space-between">
            <Text variant="body" weight="semibold">Backend</Text>
            <StatusBadge
              value={status?.backend === 'connected' ? 'connected' : 'unavailable'}
              onLabel="connected"
            />
          </Flex>
          <Flex align="center" justify="space-between">
            <Text variant="caption" color="muted">AI reasoning (OpenRouter key lives in the backend .env)</Text>
            <StatusBadge
              value={status?.llm === 'available' ? 'available' : 'unavailable'}
              onLabel="available"
            />
          </Flex>
          <Flex align="center" justify="space-between">
            <Text variant="caption" color="muted">Forge verification</Text>
            <StatusBadge
              value={status?.forge === 'available' ? 'available' : 'unavailable'}
              onLabel="available"
            />
          </Flex>
          <Flex align="center" justify="space-between">
            <Text variant="caption" color="muted">Connection</Text>
            <Badge
              variant="filled"
              color={
                state.connectionStatus === 'connected'
                  ? 'green'
                  : state.connectionStatus === 'connecting'
                    ? 'blue'
                    : 'gray'
              }
            >
              {state.connectionStatus.toUpperCase()}
            </Badge>
          </Flex>
          {status?.backend !== 'connected' && (
            <Text variant="caption" color="muted">
              Backend unavailable. Start the SIREEN backend to continue.
            </Text>
          )}
          <Flex>
            <Button variant="outline" onClick={() => send('sireen.backend.status', {})}>
              Refresh status
            </Button>
          </Flex>
        </Stack>
      </Card>
    </Stack>
  );
}
