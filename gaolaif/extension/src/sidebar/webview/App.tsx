import { useState, useEffect, useCallback } from 'react';
import { ProtocolMode } from './ProtocolMode';
import { HackerMode } from './HackerMode';
import { vscode } from './vscodeApi';
import type { Mode, Finding, Patch, MemoryEntry, PoCResult, MoneyFlowData, TacticEntry } from './types';

export default function App() {
  const [mode, setMode] = useState<Mode>('protocol');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sandboxReady, setSandboxReady] = useState(false);

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    vscode.postMessage({ command: 'switchMode', mode: newMode });
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.command) return;
      switch (msg.command) {
        case 'sandboxStatus':
          setSandboxReady(msg.ready);
          break;
        case 'auditStarted':
          setSessionId(msg.sessionId);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div style={{ background: '#07090F', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', marginBottom: 8 }}>
          GAOLAIF
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#0F1623', borderRadius: 6, padding: 3 }}>
          {(['protocol', 'hacker'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '6px 0', border: 'none', borderRadius: 4,
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                fontFamily: 'inherit', letterSpacing: '0.05em',
                background: mode === m
                  ? (m === 'protocol' ? '#0EA5E9' : '#EF4444')
                  : 'transparent',
                color: mode === m ? '#000' : '#475569',
                transition: 'all 0.2s',
              }}
            >
              {m === 'protocol' ? '\u{1F6E1} PROTOCOL' : '\u{2694} HACKER'}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#334155', marginTop: 6, textAlign: 'center' }}>
          {sandboxReady ? '\u25CF Sandbox ready' : '\u25CB Sandbox offline'}
        </div>
      </div>

      {mode === 'protocol'
        ? <ProtocolMode sessionId={sessionId} setSessionId={setSessionId} />
        : <HackerMode   sessionId={sessionId} setSessionId={setSessionId} />
      }
    </div>
  );
}
