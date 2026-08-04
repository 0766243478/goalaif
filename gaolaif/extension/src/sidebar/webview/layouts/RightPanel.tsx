import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { ChatMessage } from '../ui/components/ChatMessage';
import { ChatInput } from '../ui/components/ChatInput';
import { ThinkingIndicator } from '../ui/components/ThinkingIndicator';
import { AuditProgressBar } from '../ui/components/AuditProgressBar';
import { Tabs } from '../ui/components/Tabs';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Card } from '../ui/components/Card';
import { Button } from '../ui/components/Button';
import { EmptyState } from '../ui/components/EmptyState';

export function RightPanel() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();

  return (
    <div
      style={{
        flex: '0 0 clamp(240px, 30vw, 360px)',
        minWidth: 0,
        background: 'var(--sireen-bg-secondary)',
        borderLeft: '1px solid var(--sireen-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Flex align="center" style={{ borderBottom: '1px solid var(--sireen-border-subtle)' }}>
        <Tabs
          items={[
            { id: 'chat', label: 'Chat' },
            { id: 'reasoning', label: 'Reasoning' },
          ]}
          value={state.rightPanelTab}
          onChange={tab => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: tab as 'chat' | 'reasoning' })}
          style={{ flex: 1 }}
        />
        <Button
          variant="ghost"
          size="sm"
          iconOnly="x"
          aria-label="Close panel"
          onClick={() => dispatch({ type: 'SET_RIGHT_PANEL', open: false })}
          style={{ margin: '0 var(--sireen-space-1)' }}
        />
      </Flex>

      {state.rightPanelTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--sireen-space-2)' }}>
            <AuditProgressBar />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sireen-space-3)' }}>
            {state.chatMessages.length === 0 && (
              <EmptyState icon="chat" title="Ask Sireen" message="Try: /analyze, /exploit, /patch, /report" />
            )}
            <Stack gap={2}>
              {state.chatMessages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </Stack>
            {state.isThinking && <ThinkingIndicator steps={state.thinkingSteps} />}
          </div>
          <ChatInput
            context={state.chatContext}
            onSubmit={message => {
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
      )}

      {state.rightPanelTab === 'reasoning' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sireen-space-3)' }}>
          {state.thinkingSteps.length === 0 ? (
            <EmptyState icon="memory" title="AI reasoning chain appears here" message="Messages are shown during audit execution" />
          ) : (
            <Stack gap={2}>
              {state.thinkingSteps.map((step, i) => (
                <Card key={i}>
                  <Text variant="caption" weight="semibold" style={{ color: 'var(--sireen-accent-purple)', marginBottom: 'var(--sireen-space-1)' }}>
                    {step.agent}
                  </Text>
                  <Text variant="body-sm" color="secondary">
                    {step.thought}
                  </Text>
                  {step.duration != null && (
                    <Text variant="caption" color="muted" style={{ marginTop: 'var(--sireen-space-1)' }}>
                      {step.duration}ms
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          )}
        </div>
      )}
    </div>
  );
}
