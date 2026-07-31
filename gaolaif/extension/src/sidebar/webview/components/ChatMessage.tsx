import type { ChatMessage as ChatMessageType } from '../store/types';
import { useMessageBus } from '../hooks/useMessageBus';
import { useStore } from '../store';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const { send } = useMessageBus();
  const { dispatch } = useStore();
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className="animate-fade-in"
      style={{
        marginBottom: 12,
        padding: '8px 12px',
        borderRadius: 'var(--radius-lg)',
        background: isUser
          ? 'var(--sireen-amber-bg)'
          : isSystem
          ? 'var(--sireen-purple-bg)'
          : 'var(--sireen-surface)',
        border: `1px solid ${isUser ? 'rgba(245,158,11,0.2)' : isSystem ? 'rgba(168,85,247,0.2)' : 'var(--sireen-border)'}`,
      }}
    >
      <div style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color: isUser ? 'var(--sireen-amber)' : isSystem ? 'var(--sireen-purple)' : 'var(--sireen-info)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {isUser ? 'You' : isSystem ? 'Sireen' : 'AI'}
      </div>
      <div style={{
        fontSize: 'var(--text-sm)',
        color: 'var(--sireen-text-primary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
      </div>

      {message.suggestions && message.suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {message.suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (s.command === 'sireen.navigate') {
                  dispatch({ type: 'SET_VIEW', view: s.args?.view as any });
                } else {
                  send(s.command, s.args);
                }
              }}
              style={{
                padding: '4px 8px',
                background: 'var(--sireen-raised)',
                border: '1px solid var(--sireen-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--sireen-text-secondary)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--sireen-amber)';
                e.currentTarget.style.color = 'var(--sireen-amber)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--sireen-border)';
                e.currentTarget.style.color = 'var(--sireen-text-secondary)';
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}