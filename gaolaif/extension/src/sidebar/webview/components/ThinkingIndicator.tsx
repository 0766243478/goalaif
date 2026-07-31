import type { ThinkingStep } from '../store/types';

interface Props {
  steps: ThinkingStep[];
}

export function ThinkingIndicator({ steps }: Props) {
  return (
    <div className="animate-fade-in" style={{
      marginBottom: 12,
      padding: '8px 12px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--sireen-purple-bg)',
      border: '1px solid rgba(168,85,247,0.2)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: steps.length > 0 ? 8 : 0,
      }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--sireen-purple)',
                animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--sireen-purple)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Thinking...
        </span>
      </div>

      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--sireen-text-secondary)',
              display: 'flex',
              gap: 6,
            }}>
              <span style={{ color: 'var(--sireen-purple)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {step.agent}:
              </span>
              <span>{step.thought}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
