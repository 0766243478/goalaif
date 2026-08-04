import { useEffect, useRef, type ReactNode } from 'react';

export type TerminalLineType = 'command' | 'success' | 'error' | 'warning' | 'info' | 'muted' | 'default';

export interface TerminalLine {
  id: string;
  text: ReactNode;
  type?: TerminalLineType;
}

export interface TerminalProps {
  lines: TerminalLine[];
  title?: ReactNode;
  onClear?: () => void;
  autoScroll?: boolean;
  maxHeight?: string | number;
  className?: string;
}

export function Terminal({ lines, title, onClear, autoScroll = true, maxHeight, className }: TerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  return (
    <div className={['sireen-terminal', className].filter(Boolean).join(' ')}>
      {(title || onClear) && (
        <div className="sireen-terminal__header">
          <span>{title ?? 'Terminal'}</span>
          {onClear && (
            <button
              onClick={onClear}
              aria-label="Clear terminal"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sireen-fg-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
      <div
        className="sireen-terminal__body"
        ref={bodyRef}
        style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
        role="log"
        aria-live="polite"
      >
        {lines.map(line => (
          <div key={line.id} className={`sireen-terminal__line sireen-terminal__line--${line.type ?? 'default'}`}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
