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

export default function SettingsView() {
  const { state, dispatch } = useStore();
  const { send } = useSend();
  const [apiKey, setApiKey] = useState('');
  const [rpcUrl, setRpcUrl] = useState('https://eth.llamarpc.com');
  const [saved, setSaved] = useState(false);

  const saveApiKey = () => {
    if (apiKey.length < 10) return;
    send('sireen.settings.setApiKey', { key: apiKey });
    dispatch({ type: 'SET_API_KEY', set: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Stack gap={3}>
      <Stack gap={0}>
        <Text variant="h1" weight="semibold">
          Settings
        </Text>
        <Text variant="caption" color="muted">
          Configure Sireen
        </Text>
      </Stack>

      <Card padded>
        <Stack gap={2}>
          <Flex align="center" justify="space-between">
            <Text variant="body" weight="semibold">
              API Key
            </Text>
            <Badge variant={state.apiKeySet ? 'filled' : 'outline'} color={state.apiKeySet ? 'green' : 'gray'}>
              {state.apiKeySet ? 'CONFIGURED' : 'NOT SET'}
            </Badge>
          </Flex>
          <Text variant="caption" color="muted">
            OpenRouter API key for LLM access. Free models available at openrouter.ai
          </Text>
          <Flex gap={2}>
            <Input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              aria-label="API key"
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={saveApiKey} loading={saved}>
              {saved ? 'SAVED' : 'Save'}
            </Button>
          </Flex>
        </Stack>
      </Card>

      <Card padded>
        <Stack gap={2}>
          <Text variant="body" weight="semibold">
            RPC Endpoint
          </Text>
          <Text variant="caption" color="muted">
            Default EVM RPC URL for fork simulation
          </Text>
          <Input value={rpcUrl} onChange={e => setRpcUrl(e.target.value)} aria-label="RPC URL" />
        </Stack>
      </Card>

      <Card padded>
        <Stack gap={2}>
          <Text variant="body" weight="semibold">
            Connection
          </Text>
          <Flex align="center" justify="space-between">
            <Text variant="caption" color="muted">
              Backend Status
            </Text>
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
          <Flex align="center" justify="space-between">
            <Text variant="caption" color="muted">
              Sandbox
            </Text>
            <Badge variant="filled" color={state.sandboxReady ? 'green' : 'gray'}>
              {state.sandboxReady ? 'READY' : 'OFFLINE'}
            </Badge>
          </Flex>
        </Stack>
      </Card>
    </Stack>
  );
}
