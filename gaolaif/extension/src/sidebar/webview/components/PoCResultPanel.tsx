import React from 'react';
import type { PoCResult } from '../types';

interface Props {
  result: PoCResult;
}

export function PoCResultPanel({ result }: Props) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        fontSize: 10, color: result.confirmed ? '#22C55E' : '#EF4444',
        fontWeight: 700, marginBottom: 6, letterSpacing: '0.1em',
      }}>
        {result.confirmed ? '\u2713 EXPLOIT CONFIRMED' : '\u2717 NOT EXPLOITABLE'}
      </div>

      {result.attack_vector && (
        <div style={{ marginBottom: 6, fontSize: 10, color: '#64748B' }}>
          <span style={{ color: '#E2E8F0' }}>Attack vector:</span> {result.attack_vector}
        </div>
      )}

      {result.estimated_impact && (
        <div style={{ marginBottom: 6, fontSize: 10, color: '#64748B' }}>
          <span style={{ color: '#E2E8F0' }}>Impact:</span> {result.estimated_impact}
        </div>
      )}

      {result.poc_code && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 700 }}>
            PoC CODE
          </div>
          <pre style={{
            background: '#0D1117', border: '1px solid #1E293B', borderRadius: 4,
            padding: 8, fontSize: 10, lineHeight: 1.5, overflowX: 'auto',
            color: '#E2E8F0', fontFamily: 'inherit', maxHeight: 200, overflowY: 'auto',
          }}>
            {result.poc_code}
          </pre>
        </div>
      )}

      {result.forge_output && (
        <div>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 700 }}>
            FORGE OUTPUT
          </div>
          <pre style={{
            background: '#0D1117', border: '1px solid #1E293B', borderRadius: 4,
            padding: 8, fontSize: 10, lineHeight: 1.5, overflowX: 'auto',
            color: '#22C55E', fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto',
          }}>
            {result.forge_output}
          </pre>
        </div>
      )}
    </div>
  );
}
