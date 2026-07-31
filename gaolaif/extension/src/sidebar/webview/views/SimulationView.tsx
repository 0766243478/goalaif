import { useState } from 'react';
import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { EmptyState } from '../components/EmptyState';

export default function SimulationView() {
  const { state } = useStore();
  const { send } = useMessageBus();
  const [forkUrl, setForkUrl] = useState('https://eth.llamarpc.com');

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
          Simulation
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
          Run exploits in a sandboxed environment
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Sandbox Status</span>
          <span className={`badge ${state.sandboxReady ? 'badge-success' : 'badge-ghost'}`}>
            {state.sandboxReady ? 'READY' : 'OFFLINE'}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              className="btn-primary"
              onClick={() => send('sireen.sandbox.start', { rpcUrl: forkUrl })}
              disabled={state.sandboxReady}
              style={{ flex: 1, fontSize: 'var(--text-xs)' }}
            >
              {state.sandboxReady ? 'Running' : 'Start Sandbox'}
            </button>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)', marginBottom: 4 }}>
            Fork RPC URL:
          </div>
          <input
            value={forkUrl}
            onChange={(e) => setForkUrl(e.target.value)}
            className="input"
            style={{ fontSize: 'var(--text-xs)' }}
          />
        </div>
      </div>

      {state.simulationLog.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Log</span>
          </div>
          <div className="card-body" style={{ maxHeight: 300, overflow: 'auto' }}>
            {state.simulationLog.map((entry, i) => (
              <div key={i} style={{
                padding: '2px 0',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
                color: entry.level === 'error' ? 'var(--sireen-critical)' :
                       entry.level === 'warn' ? 'var(--sireen-medium)' :
                       'var(--sireen-text-secondary)',
              }}>
                <span style={{ color: 'var(--sireen-text-ghost)' }}>
                  [{new Date(entry.timestamp).toLocaleTimeString()}]
                </span>{' '}
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No simulation output"
          message="Start the sandbox and run an exploit to see results"
        />
      )}
    </div>
  );
}