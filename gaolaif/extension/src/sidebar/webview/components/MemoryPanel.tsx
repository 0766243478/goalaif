import React from 'react';
import type { MemoryEntry } from '../types';

interface Props {
  entries: MemoryEntry[];
  label: string;
  color: string;
}

export function MemoryPanel({ entries, label, color }: Props) {
  if (!entries.length) return null;

  const hasDegraded = entries.some(e => e.degraded);

  return (
    <div style={{ marginTop: 8 }}>
      {hasDegraded && (
        <div style={{ color: '#F59E0B', fontSize: 10, padding: '4px 8px', background: '#F59E0B10', borderRadius: 4, marginBottom: 6 }}>
          {'\u26A0'} Memory running in degraded mode &mdash; Ollama offline. Similarity suggestions may be unreliable.
        </div>
      )}
      <div style={{
        fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 6,
        letterSpacing: '0.1em',
      }}>
        {label}
      </div>
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #1E293B', borderRadius: 4, marginBottom: 4,
            padding: '6px 8px', background: '#0F1623', fontSize: 10,
          }}
        >
          {entry.suggestion && (
            <div style={{ color: '#64748B', marginBottom: 2 }}>
              <span style={{ color }}>Suggest:</span> {entry.suggestion}
            </div>
          )}
          {entry.warning && (
            <div style={{ color: '#F97316', marginBottom: 2 }}>
              {'\u26A0'} {entry.warning}
            </div>
          )}
          {entry.idea && (
            <div style={{ color: '#64748B', lineHeight: 1.4 }}>
              {entry.idea.slice(0, 200)}
            </div>
          )}
          {entry.confidence !== undefined && (
            <div style={{ color: '#334155', marginTop: 2 }}>
              confidence: {(entry.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
