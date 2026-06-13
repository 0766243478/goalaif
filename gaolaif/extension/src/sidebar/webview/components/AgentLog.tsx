import React, { useRef, useEffect } from 'react';

interface Props {
  entries: string[];
  color?: string;
}

export function AgentLog({ entries, color = '#0EA5E9' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 4, letterSpacing: '0.1em' }}>
        [{color === '#EF4444' ? 'EXPLOIT' : 'AGENT'} LOG]
      </div>
      <div
        ref={ref}
        style={{
          background: '#0D1117', border: '1px solid #1E293B', borderRadius: 4,
          padding: 8, maxHeight: 120, overflowY: 'auto',
          fontSize: 10, lineHeight: 1.6, fontFamily: 'inherit',
        }}
      >
        {entries.map((entry, i) => (
          <div key={i} style={{ color: i === entries.length - 1 ? color : '#475569' }}>
            {'>'} {entry}
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ color: '#1E293B' }}>{'> idle'}</div>
        )}
      </div>
    </div>
  );
}
