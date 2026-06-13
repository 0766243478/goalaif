import React from 'react';

interface Props {
  label: string;
  color: string;
  onClick: () => void;
  shortcut?: string;
}

export function ActionButton({ label, color, onClick, shortcut }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 0', border: 'none', borderRadius: 4,
        cursor: 'pointer', fontSize: 10, fontWeight: 700,
        fontFamily: 'inherit', letterSpacing: '0.05em',
        background: color, color: '#000',
        transition: 'all 0.2s',
      }}
      title={shortcut ? `Shortcut: ${shortcut}` : undefined}
    >
      {label}
    </button>
  );
}
