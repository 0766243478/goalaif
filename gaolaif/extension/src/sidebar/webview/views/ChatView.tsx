import { useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { ChatMessage } from '../ui/components/ChatMessage';
import { ChatInput } from '../ui/components/ChatInput';
import { ThinkingIndicator } from '../ui/components/ThinkingIndicator';
import { AuditProgressBar } from '../ui/components/AuditProgressBar';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Stack } from '../ui/primitives/Stack';
import { Button } from '../ui/components/Button';

export default function ChatView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.chatMessages, state.isThinking]);

  const starterQuestions = ['Analyze attack surface', 'Find reentrancy bugs', 'Generate PoC', 'Suggest patches'];

  return (
    <Flex direction="column" style={{ height: '100%' }}>
      <Stack gap={0} style={{ marginBottom: 'var(--sireen-space-3)' }}>
        <Text variant="h1" weight="semibold">
          Chat
        </Text>
        <Text variant="caption" color="muted">
          Ask Sireen anything about your code
        </Text>
      </Stack>

      <AuditProgressBar />

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', paddingRight: 'var(--sireen-space-1)' }}>
        {state.chatMessages.length === 0 && !state.isThinking && (
          <Flex
            direction="column"
            align="center"
            justify="center"
            gap={3}
            style={{ height: '60%', textAlign: 'center' }}
          >
            <Text variant="h2" weight="semibold" color="secondary">
              SIREEN
            </Text>
            <Text variant="body-sm" color="muted">
              How can I help with this contract?
            </Text>
            <Flex wrap="wrap" gap={1} justify="center" style={{ maxWidth: 300 }}>
              {starterQuestions.map(q => (
                <Button
                  key={q}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    dispatch({
                      type: 'ADD_CHAT_MESSAGE',
                      message: { id: crypto.randomUUID(), role: 'user', content: q, timestamp: Date.now() },
                    });
                    send('sireen.chat.send', { message: q });
                  }}
                >
                  {q}
                </Button>
              ))}
            </Flex>
          </Flex>
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
    </Flex>
  );
}
