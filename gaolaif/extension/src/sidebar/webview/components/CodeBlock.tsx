import { useState, useCallback } from 'react';
import { Icon } from './Icon';

interface Props {
  code: string;
  language?: string;
  maxHeight?: number;
}

export function CodeBlock({ code, language = 'solidity', maxHeight = 200 }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div style={{
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      border: '1px solid var(--sireen-border)',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        background: 'var(--sireen-void)',
        borderBottom: '1px solid var(--sireen-border)',
      }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--sireen-text-ghost)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <Icon name="code" size={12} />
          {language}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? 'var(--sireen-green)' : 'var(--sireen-text-ghost)',
            cursor: 'pointer',
            fontSize: 'var(--text-xs)',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Icon name={copied ? 'copied' : 'copy'} size={12} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: 8,
        background: 'var(--sireen-abyss)',
        overflow: 'auto',
        maxHeight,
        fontSize: 'var(--text-xs)',
        lineHeight: 1.5,
        color: 'var(--sireen-text-primary)',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
