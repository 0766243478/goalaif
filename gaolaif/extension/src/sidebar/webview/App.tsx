import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store';
import { CopilotLayout } from './ui/layouts/CopilotLayout';
import { ToastProvider } from './ui/components/Toast';
import { useMessageBus } from './hooks/useMessageBus';
import { Text } from './ui/primitives/Text';
import { Stack } from './ui/primitives/Stack';
import { Input } from './ui/components/Input';
import { Button } from './ui/components/Button';
import { Alert } from './ui/components/Alert';
import './ui'; // imports tokens.css + components.css
import './styles.css'; // legacy styles — will be removed after full migration

function AppContent() {
  const { state } = useStore();
  const { send, iconUri } = useMessageBus();

  useEffect(() => {
    send('sireen.apiKey.status', {});
    send('sireen.media.request', {});
  }, [send]);

  if (state.apiKeySet === false) {
    return <ApiKeySetup iconUri={iconUri} />;
  }
  if (state.apiKeySet === null) {
    return (
      <Stack align="center" justify="center" style={{ height: '100vh' }}>
        <Text variant="body-sm" color="muted">Loading SIREEN…</Text>
      </Stack>
    );
  }
  return <CopilotLayout />;
}

function ApiKeySetup({ iconUri }: { iconUri: string }) {
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const { dispatch } = useStore();
  const { send } = useMessageBus();
  
  const submit = () => {
    if (key.length < 20) {
      setMsg('Key appears invalid (too short). Get one at openrouter.ai');
      return;
    }
    setSending(true);
    setMsg('Saving...');
    send('sireen.settings.setApiKey', { key });
    setTimeout(() => {
      setSending(false);
      dispatch({ type: 'SET_API_KEY', set: true });
    }, 2000);
  };

  const isError = msg.startsWith('Key');

  return (
    <Stack
      align="center"
      justify="center"
      gap={3}
      style={{ height: '100vh', padding: 'var(--sireen-space-6)', background: 'var(--sireen-bg-primary)' }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--sireen-radius-lg)',
          background: 'var(--sireen-bg-inactive)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img 
          src={iconUri || ''} 
          alt="SIREEN Logo" 
          style={{ width: 36, height: 36, objectFit: 'contain' }} 
        />
      </div>
      <Text variant="h1" weight="semibold" style={{ color: 'var(--sireen-accent-amber)' }}>
        SIREEN SETUP
      </Text>
      <Text variant="body-sm" color="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
        Enter your OpenRouter API key to enable AI-powered auditing.<br/>
        Free models available at openrouter.ai.
      </Text>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-or-v1-..."
          aria-label="OpenRouter API key"
          disabled={sending}
          invalid={isError}
          style={{ width: '100%' }}
        />
      </div>
      <Button
        variant="primary"
        block
        onClick={submit}
        loading={sending}
        style={{ maxWidth: 320 }}
      >
        {sending ? 'SAVING...' : 'SAVE KEY'}
      </Button>
      {msg && (
        <div style={{ maxWidth: 320, width: '100%' }}>
          {isError ? (
            <Alert variant="error">{msg}</Alert>
          ) : (
            <Alert variant="info">{msg}</Alert>
          )}
        </div>
      )}
      <Text variant="caption" color="muted">
        You can skip this and set it later via Settings.
      </Text>
    </Stack>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  );
}
