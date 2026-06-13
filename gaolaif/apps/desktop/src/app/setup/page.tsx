'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface Step {
  name: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message: string;
}

const STEP_LABELS: Record<string, string> = {
  ollama: 'Local AI Engine (Ollama)',
  foundry: 'Smart Contract Sandbox (Foundry)',
  docker: 'Database Container (Docker)',
  postgres: 'PostgreSQL + pgvector',
  models: 'AI Models (~11GB download)',
};

export default function SetupPage() {
  const [steps, setSteps] = useState<Step[]>(
    Object.keys(STEP_LABELS).map(name => ({
      name,
      label: STEP_LABELS[name],
      status: 'pending' as const,
      message: '',
    }))
  );
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      const unlisten = await listen<Step>('setup-progress', ({ payload }) => {
        setSteps(prev =>
          prev.map(s =>
            s.name === payload.name
              ? { ...s, status: payload.status as Step['status'], message: payload.message }
              : s
          )
        );
        if (payload.name === 'models' && payload.status === 'done') {
          setDone(true);
        }
      });
      return () => { unlisten(); };
    };
    setup();
  }, []);

  const startSetup = async () => {
    setStarted(true);
    setError(null);
    try {
      await invoke('run_setup_wizard');
    } catch (e) {
      setError(String(e));
    }
  };

  const statusIcon = (status: Step['status']) =>
    ({ pending: '\u25CB', running: '\u25CC', done: '\u2713', error: '\u2717' })[status];
  const statusColor = (status: Step['status']) =>
    ({ pending: '#475569', running: '#F59E0B', done: '#22C55E', error: '#EF4444' })[status];

  return (
    <div
      style={{
        background: '#07090F',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div style={{ width: 520, padding: 40 }}>
        <div style={{ color: '#F59E0B', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          GAOLAIF
        </div>
        <div style={{ color: '#94A3B8', fontSize: 14, marginBottom: 40 }}>
          First-time setup &mdash; installs all dependencies locally.
        </div>

        {steps.map(step => (
          <div
            key={step.name}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 20,
              opacity: step.status === 'pending' ? 0.4 : 1,
              transition: 'opacity 0.3s',
            }}
          >
            <span
              style={{
                color: statusColor(step.status),
                fontSize: 18,
                minWidth: 20,
                marginTop: 2,
              }}
            >
              {statusIcon(step.status)}
            </span>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>
                {step.label}
              </div>
              {step.message && (
                <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                  {step.message}
                </div>
              )}
            </div>
          </div>
        ))}

        {!started && (
          <button
            onClick={startSetup}
            style={{
              marginTop: 32,
              width: '100%',
              padding: '14px 0',
              background: '#F59E0B',
              color: '#000000',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Install Everything
          </button>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              color: '#EF4444',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Error: {error}
          </div>
        )}

        {done && (
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              marginTop: 32,
              width: '100%',
              padding: '14px 0',
              background: '#22C55E',
              color: '#000000',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Launch Gaolaif
          </button>
        )}

        <div
          style={{
            color: '#1E293B',
            fontSize: 10,
            marginTop: 40,
            textAlign: 'center',
          }}
        >
          All AI runs locally. Your code never leaves this machine.
        </div>
      </div>
    </div>
  );
}
