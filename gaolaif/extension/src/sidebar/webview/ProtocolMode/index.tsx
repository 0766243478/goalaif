import { useState, useEffect } from 'react';
import { vscode } from '../vscodeApi';
import { ActionButton } from '../components/ActionButton';
import { PipelineProgress } from '../components/PipelineProgress';
import { AgentLog } from '../components/AgentLog';
import { FindingsList } from '../components/FindingsList';
import { MemoryPanel } from '../components/MemoryPanel';
import type { Finding, Patch, MemoryEntry, PipelineStage } from '../types';

interface Props {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
}

export function ProtocolMode({ sessionId, setSessionId }: Props) {
  const [status, setStatus] = useState<PipelineStage>('idle');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [agentLog, setAgentLog] = useState<string[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.command) return;
      switch (msg.command) {
        case 'auditComplete':
          setStatus('done');
          setFindings(msg.findings || []);
          setPatches(msg.patches || []);
          break;
        case 'auditProgress':
          setStatus(msg.stage);
          setAgentLog(prev => [...prev, msg.message]);
          break;
        case 'memoryResult':
          setMemory(msg.entries || []);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleAuditFile = () => {
    vscode.postMessage({ command: 'gaolaif.auditSelection' });
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <ActionButton
          label="Audit Selection"
          shortcut="⌘⇧A"
          color="#0EA5E9"
          onClick={() => vscode.postMessage({ command: 'gaolaif.auditSelection' })}
        />
        <ActionButton
          label="Audit File"
          color="#0EA5E9"
          onClick={handleAuditFile}
        />
      </div>

      <PipelineProgress status={status} />

      {agentLog.length > 0 && (
        <AgentLog entries={agentLog} />
      )}

      {findings.length > 0 && (
        <FindingsList findings={findings} mode="protocol" patches={patches} />
      )}

      {memory.length > 0 && (
        <MemoryPanel entries={memory} label="Knowledge Base" color="#0EA5E9" />
      )}

      {status === 'idle' && (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: '#334155' }}>
          Select Solidity/Move code and run Audit to begin
        </div>
      )}
    </div>
  );
}
