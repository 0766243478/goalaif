import { useState, useEffect } from 'react';
import { vscode } from '../vscodeApi';
import { PoCResultPanel } from '../components/PoCResultPanel';
import { MoneyFlowVisualizer } from '../components/MoneyFlowVisualizer';
import { AgentLog } from '../components/AgentLog';
import { MemoryPanel } from '../components/MemoryPanel';
import { Icon } from '../components/Icon';
import type { PoCResult, MoneyFlowData, TacticEntry, ExploitStage } from '../types';

interface Props {
  sessionId?: string | null;
  setSessionId?: (id: string | null) => void;
}

export function HackerMode({ sessionId = null, setSessionId = () => {} }: Props) {
  const [exploitIdea, setExploitIdea] = useState('');
  const [targetFunction, setTargetFunction] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [pocResult, setPocResult] = useState<PoCResult | null>(null);
  const [status, setStatus] = useState<ExploitStage>('idle');
  const [exploitLog, setExploitLog] = useState<string[]>([]);
  const [moneyFlow, setMoneyFlow] = useState<MoneyFlowData | null>(null);
  const [tactics, setTactics] = useState<TacticEntry[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.command) return;
      switch (msg.command) {
        case 'exploitReady':
          setSelectedCode(msg.code || '');
          setExploitIdea('');
          setPocResult(null);
          setMoneyFlow(null);
          setExploitLog([]);
          setStatus('idle');
          break;
        case 'exploitStarted':
          setSessionId(msg.sessionId);
          setStatus('generating');
          break;
        case 'exploitStatus':
          setStatus(msg.status);
          setExploitLog(prev => [...prev, msg.message || msg.status]);
          break;
        case 'exploitResult':
          setStatus(msg.confirmed ? 'confirmed' : 'failed');
          setPocResult({
            confirmed: msg.confirmed,
            poc_code: msg.poc_code || '',
            forge_output: msg.forge_output || '',
            money_flow: msg.money_flow,
            attack_vector: msg.attack_vector,
            target_function: msg.target_function,
            estimated_impact: msg.estimated_impact,
          });
          if (msg.money_flow) setMoneyFlow(msg.money_flow);
          if (msg.log) setExploitLog(prev => [...prev, msg.log]);
          break;
        case 'exploitError':
          setStatus('failed');
          setExploitLog(prev => [...prev, `ERROR: ${msg.error}`]);
          break;
        case 'memoryResult':
          setTactics(msg.entries || []);
          break;
        // Standard pipeline events (dual delivery with custom events above)
        case 'sireen.exploit.started':
          if (msg.payload?.session_id) setSessionId(msg.payload.session_id);
          setStatus('generating');
          break;
        case 'sireen.exploit.complete': {
          const p = msg.payload || {};
          setStatus(p.confirmed ? 'confirmed' : 'failed');
          setPocResult({
            confirmed: !!p.confirmed,
            poc_code: p.poc_code || '',
            forge_output: p.forge_output || '',
            money_flow: p.money_flow,
            attack_vector: p.attack_vector || '',
            target_function: p.target_function || '',
            estimated_impact: p.estimated_impact || '',
          });
          if (p.money_flow) setMoneyFlow(p.money_flow);
          setExploitLog(prev => [...prev, p.confirmed ? 'Exploit confirmed.' : 'Exploit not reproduced.']);
          break;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setSessionId]);

  const executeExploit = () => {
    setStatus('generating');
    setExploitLog(prev => [...prev, 'Submitting exploit idea to backend...']);
    vscode.postMessage({
      command: 'exploitWithIdea',
      idea: exploitIdea,
      targetFunction,
      code: selectedCode,
    });
  };

  const handleGenerateReport = () => {
    vscode.postMessage({ command: 'gaolaif.generateReport' });
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, color: '#64748B', letterSpacing: '0.1em' }}>
          YOUR EXPLOIT IDEA
        </label>
        <textarea
          value={exploitIdea}
          onChange={e => setExploitIdea(e.target.value)}
          placeholder="e.g. The withdraw function updates state after the external call. Try a reentrancy loop to drain the pool."
          style={{
            width: '100%', marginTop: 4, padding: 8,
            background: '#0D1117', border: '1px solid #1E293B',
            color: '#E2E8F0', fontFamily: 'inherit', fontSize: 11,
            resize: 'vertical', minHeight: 70, borderRadius: 4,
          }}
        />
        <input
          value={targetFunction}
          onChange={e => setTargetFunction(e.target.value)}
          placeholder="Target function name..."
          style={{
            width: '100%', marginTop: 4, padding: '6px 8px',
            background: '#0D1117', border: '1px solid #1E293B',
            color: '#E2E8F0', fontFamily: 'inherit', fontSize: 11, borderRadius: 4,
          }}
        />
      </div>

      <button
        onClick={executeExploit}
        disabled={!exploitIdea || status === 'generating' || status === 'running'}
        style={{
          width: '100%', padding: '10px 0',
          background: status === 'confirmed' ? '#22C55E' : '#EF4444',
          color: '#000', fontWeight: 700, fontSize: 12,
          border: 'none', borderRadius: 4, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.05em',
          opacity: (!exploitIdea || status === 'generating') ? 0.5 : 1,
        }}
      >
        {status === 'idle'       && <><Icon name="zap" size={14} /> EXECUTE EXPLOIT</>}
        {status === 'generating' && <><Icon name="loading" size={14} className="animate-spin" /> Generating PoC...</>}
        {status === 'running'    && <><Icon name="loading" size={14} className="animate-spin" /> Running in Sandbox...</>}
        {status === 'confirmed'  && <><Icon name="checkCircle" size={14} /> EXPLOIT CONFIRMED</>}
        {status === 'failed'     && <><Icon name="warning" size={14} /> Not Exploitable &mdash; Try Again</>}
      </button>

      {pocResult && <PoCResultPanel result={pocResult} />}

      {moneyFlow && <MoneyFlowVisualizer data={moneyFlow} />}

      {exploitLog.length > 0 && (
        <AgentLog entries={exploitLog} color="#EF4444" />
      )}

      {pocResult?.confirmed && (
        <button
          onClick={handleGenerateReport}
          style={{
            width: '100%', marginTop: 8, padding: '8px 0',
            background: 'transparent', border: '1px solid #F59E0B',
            color: '#F59E0B', fontWeight: 700, fontSize: 11,
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Icon name="fileText" size={14} />
          Generate Immunefi Report
        </button>
      )}

      {tactics.length > 0 && (
        <MemoryPanel entries={tactics} label="Exploit Tactics Library" color="#EF4444" />
      )}
    </div>
  );
}

export default HackerMode;
