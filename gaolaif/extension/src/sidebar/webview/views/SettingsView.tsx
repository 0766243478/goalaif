import { useState } from 'react';
import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';

export default function SettingsView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();
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
    <div className="animate-fade-in">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
          Settings
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
          Configure Sireen
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>API Key</span>
          <span className={`badge ${state.apiKeySet ? 'badge-success' : 'badge-ghost'}`}>
            {state.apiKeySet ? 'CONFIGURED' : 'NOT SET'}
          </span>
        </div>
        <div className="card-body">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)', marginBottom: 8 }}>
            OpenRouter API key for LLM access. Free models available at openrouter.ai
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="input"
              style={{ flex: 1, fontSize: 'var(--text-xs)' }}
            />
            <button className="btn-primary" onClick={saveApiKey} style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
              {saved ? 'SAVED' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>RPC Endpoint</span>
        </div>
        <div className="card-body">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)', marginBottom: 8 }}>
            Default EVM RPC URL for fork simulation
          </div>
          <input
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            className="input"
            style={{ fontSize: 'var(--text-xs)' }}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Connection</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>Backend Status</span>
            <span className={`badge ${state.connectionStatus === 'connected' ? 'badge-success' : state.connectionStatus === 'connecting' ? 'badge-info' : 'badge-ghost'}`}>
              {state.connectionStatus.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>Sandbox</span>
            <span className={`badge ${state.sandboxReady ? 'badge-success' : 'badge-ghost'}`}>
              {state.sandboxReady ? 'READY' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}