import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { AuditProgressBar } from '../components/AuditProgressBar';

export function RightPanel() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();
  const tabs = ['chat', 'reasoning'] as const;

  return (
    <div style={{
      flex: '0 0 clamp(240px, 30vw, 360px)',
      minWidth: 0,
      background: 'var(--sireen-deep)',
      borderLeft: '1px solid var(--sireen-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--sireen-border)',
        background: 'var(--sireen-void)',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab })}
            style={{
              flex: 1,
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: state.rightPanelTab === tab ? '2px solid var(--sireen-amber)' : '2px solid transparent',
              color: state.rightPanelTab === tab ? 'var(--sireen-text-primary)' : 'var(--sireen-text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={() => dispatch({ type: 'SET_RIGHT_PANEL', open: false })}
          style={{
            padding: '0 8px',
            background: 'transparent',
            border: 'none',
            color: 'var(--sireen-text-ghost)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          x
        </button>
      </div>

      {state.rightPanelTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AuditProgressBar />
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {state.chatMessages.length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--sireen-text-ghost)',
                textAlign: 'center',
                gap: 8,
              }}>
                <div style={{ fontSize: 'var(--text-md)', color: 'var(--sireen-text-secondary)' }}>Ask Sireen</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-ghost)' }}>
                  Try: /analyze, /exploit, /patch, /report
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
                message: {
                  id: crypto.randomUUID(),
                  role: 'user',
                  content: message,
                  timestamp: Date.now(),
                },
              });
              send('sireen.chat.send', { message, context: state.chatContext, session_id: state.activeSessionId });
            }}
            onSlashCommand={(command, args) => {
              send('sireen.chat slash', { command, args, context: state.chatContext, session_id: state.activeSessionId });
            }}
          />
        </div>
      )}

      {state.rightPanelTab === 'reasoning' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {state.thinkingSteps.length === 0 ? (
            <div style={{ color: 'var(--sireen-text-ghost)', textAlign: 'center', marginTop: 40 }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-secondary)' }}>AI reasoning chain appears here</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-ghost)', marginTop: 4 }}>
                Messages are shown during audit execution
              </div>
            </div>
          ) : (
            state.thinkingSteps.map((step, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                marginBottom: 8,
                background: 'var(--sireen-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--sireen-border)',
              }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-purple)', fontWeight: 700, marginBottom: 4 }}>
                  {step.agent}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--sireen-text-secondary)' }}>
                  {step.thought}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}