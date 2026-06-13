import React from 'react';
import type { Finding, Patch } from '../types';

interface Props {
  findings: Finding[];
  mode: 'protocol' | 'hacker';
  patches?: Patch[];
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6',
};

export function FindingsList({ findings, mode, patches }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 6,
        letterSpacing: '0.1em',
      }}>
        {mode === 'protocol' ? 'FINDINGS' : 'VULNERABILITIES'} ({findings.length})
      </div>
      {findings.map((f, i) => (
        <div
          key={f.id || i}
          style={{
            border: '1px solid #1E293B', borderRadius: 4, marginBottom: 4,
            background: '#0F1623', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px',
              background: SEV_COLORS[f.severity] || '#475569',
              color: '#000', letterSpacing: '0.05em',
            }}>
              {f.severity}
            </span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{f.title}</span>
            {f.category && (
              <span style={{ fontSize: 9, color: '#475569' }}>{f.category}</span>
            )}
          </div>
          <div style={{ padding: '0 8px 6px', fontSize: 10, color: '#64748B', lineHeight: 1.4 }}>
            {f.description}
            {f.affected_function && (
              <div style={{ marginTop: 2, color: '#475569' }}>
                fn: <code style={{ color: '#E2E8F0' }}>{f.affected_function}</code>
              </div>
            )}
          </div>
          {patches?.[i] && (
            <div style={{ padding: '4px 8px 6px', borderTop: '1px solid #1E293B', fontSize: 10 }}>
              <span style={{ color: '#22C55E' }}>Fix:</span>{' '}
              <span style={{ color: '#64748B' }}>{patches[i].strategy}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
