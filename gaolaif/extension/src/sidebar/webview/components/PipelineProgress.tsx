import React from 'react';
import type { PipelineStage } from '../types';

interface Props {
  status: PipelineStage;
}

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'planning', label: 'Plan' },
  { key: 'researching', label: 'Research' },
  { key: 'auditing', label: 'Audit' },
];

export function PipelineProgress({ status }: Props) {
  if (status === 'idle' || status === 'done') return null;

  const currentIdx = STAGES.findIndex(s => s.key === status);
  if (currentIdx < 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {STAGES.map((stage, i) => {
          const isActive = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={stage.key}
              style={{
                flex: 1, padding: '4px 0', textAlign: 'center',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                background: isActive ? '#0EA5E9' : '#0F1623',
                color: isActive ? '#000' : '#334155',
                border: '1px solid', borderColor: isCurrent ? '#38BDF8' : '#1E293B',
                transition: 'all 0.3s',
              }}
            >
              {stage.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
