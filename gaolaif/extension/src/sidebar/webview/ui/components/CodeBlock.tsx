import { useState } from 'react';
import { Icon } from '../primitives/Icon';

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  /** show a copy button in the header */
  copyable?: boolean;
  maxHeight?: string | number;
  className?: string;
}

export function CodeBlock({ code, language, filename, copyable = true, maxHeight, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <div className={['sireen-code', className].filter(Boolean).join(' ')}>
      {(filename || copyable) && (
        <div className="sireen-code__header">
          <span>{filename ?? language ?? 'code'}</span>
          {copyable && (
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy code'}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sireen-fg-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--sireen-space-1)',
                fontSize: 'var(--sireen-font-size-caption)',
              }}
            >
              <Icon name={copied ? 'check' : 'copy'} size="sm" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
      <pre className="sireen-code__pre" style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight, overflow: 'auto' } : undefined}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
