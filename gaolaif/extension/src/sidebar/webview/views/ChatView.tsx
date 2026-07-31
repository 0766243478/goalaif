import { useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { AuditProgressBar } from '../components/AuditProgressBar';

export default function ChatView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.chatMessages, state.isThinking]);

  const starterQuestions = [
    'Analyze attack surface',
    'Find reentrancy bugs',
    'Generate PoC',
    'Suggest patches',
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
          Chat
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
          Ask Sireen anything about your code
        </div>
      </div>

      <AuditProgressBar />

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
        {state.chatMessages.length === 0 && !state.isThinking && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60%',
            color: 'var(--sireen-text-ghost)',
            textAlign: 'center',
            gap: 12,
          }}>
            <div style={{ fontSize: 'var(--text-md)', color: 'var(--sireen-text-secondary)', fontWeight: 600 }}>
              SIREEN
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--sireen-text-ghost)' }}>
              How can I help with this contract?
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 300 }}>
              {starterQuestions.map((q) => (
                <button
                  key={q}
                  className="btn-secondary"
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                  onClick={() => {
                    dispatch({
                      type: 'ADD_CHAT_MESSAGE',
                      message: { id: crypto.randomUUID(), role: 'user', content: q, timestamp: Date.now() },
                    });
                    send('sireen.chat.send', { message: q });
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.chatMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {state.isThinking && <ThinkingIndicator steps={state.thinkingSteps} />}
      </div>

      <ChatInput
        context={state.chatContext}
        onSubmit={(message) => {
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            message: { id: crypto.randomUUID(), role: 'user', content: message, timestamp: Date.now() },
          });
          send('sireen.chat.send', { message, context: state.chatContext, session_id: state.activeSessionId });
        }}
        onSlashCommand={(command, args) => {
          send('sireen.chat slash', { command, args, context: state.chatContext, session_id: state.activeSessionId });
        }}
      />
    </div>
  );
}