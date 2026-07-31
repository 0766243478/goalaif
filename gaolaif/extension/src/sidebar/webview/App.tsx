import { useState, useEffect } from 'react';
import { StoreProvider } from './store';
import { CopilotLayout } from './layouts/CopilotLayout';
import { useMessageBus } from './hooks/useMessageBus';
import { useStore } from './store';
import { Icon } from './components/Icon';
import './styles.css';

function AppContent() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();

  useEffect(() => {
    send('sireen.apiKey.status', {});
  }, [send]);

  if (state.apiKeySet === false) {
    return <ApiKeySetup onDone={() => dispatch({ type: 'SET_API_KEY', set: true })} />;
  }

  return <CopilotLayout />;
}

function ApiKeySetup({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const { state } = useStore();
  const { send } = useMessageBus();

  useEffect(() => {
    if (!sending && state.apiKeySet === true && msg === 'Saving...') {
      onDone();
    }
  }, [state.apiKeySet, sending, msg, onDone]);

  const submit = () => {
    if (key.length < 20) {
      setMsg('Key appears invalid (too short). Get one at openrouter.ai');
      return;
    }
    setSending(true);
    setMsg('Saving...');
    send('sireen.settings.setApiKey', { key });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', padding: 24, background: 'var(--sireen-abyss)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-xl)',
        background: 'var(--sireen-amber-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon name="brand" size={24} color="var(--sireen-amber)" />
      </div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-amber)', marginBottom: 8 }}>
        SIREEN SETUP
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--sireen-text-secondary)', marginBottom: 16, textAlign: 'center', maxWidth: 300 }}>
        Enter your OpenRouter API key to enable AI-powered auditing.
        Free models available at openrouter.ai.
      </div>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="sk-or-v1-..."
        className="input"
        style={{ maxWidth: 320, marginBottom: 8 }}
        disabled={sending}
      />
      <button
        className="btn-primary"
        onClick={submit}
        style={{ maxWidth: 320, width: '100%' }}
        disabled={sending}
      >
        {sending ? 'SAVING...' : 'SAVE KEY'}
      </button>
      {msg && (
        <div style={{ fontSize: 'var(--text-xs)', marginTop: 8,
          color: msg.startsWith('Key') ? 'var(--sireen-critical)' :
                 msg === 'Saving...' ? 'var(--sireen-amber)' : 'var(--sireen-text-muted)',
        }}>
          {msg}
        </div>
      )}
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-ghost)', marginTop: 16 }}>
        You can skip this and set it later via Settings.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
