import { memo } from 'react';
import type { ChatMessage as ChatMessageType, SuggestedAction, ViewId } from '../../store/types';
import { useSend } from '../../hooks/useMessageBus';
import { useStore } from '../../store';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Chip } from './Chip';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';

interface Props {
  message: ChatMessageType;
}

const ROLE_LABEL: Record<ChatMessageType['role'], string> = {
  user: 'You',
  assistant: 'AI',
  system: 'Sireen',
};

const ROLE_COLOR: Record<ChatMessageType['role'], string> = {
  user: 'var(--sireen-accent-amber)',
  assistant: 'var(--sireen-info-fg)',
  system: 'var(--sireen-accent-purple)',
};

const ROLE_BG: Record<ChatMessageType['role'], string> = {
  user: 'var(--sireen-bg-hover)',
  assistant: 'var(--sireen-bg-elevated)',
  system: 'var(--sireen-bg-inactive)',
};

function ChatMessageImpl({ message }: Props) {
  const { send } = useSend();
  const { dispatch } = useStore();
  const isUser = message.role === 'user';

  const handleSuggestion = (s: SuggestedAction) => {
    if (s.command === 'sireen.navigate') {
      dispatch({ type: 'SET_VIEW', view: s.args?.view as ViewId });
    } else {
      send(s.command, s.args);
    }
  };

  return (
    <Flex
      direction="column"
      gap={1}
      style={{
        padding: 'var(--sireen-space-2) var(--sireen-space-3)',
        borderRadius: 'var(--sireen-radius-lg)',
        background: ROLE_BG[message.role],
        border: '1px solid var(--sireen-border-subtle)',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
      }}
    >
      <Text variant="caption" weight="semibold" style={{ color: ROLE_COLOR[message.role] }}>
        {ROLE_LABEL[message.role]}
      </Text>
      <Text
        variant="body-sm"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 'var(--sireen-line-height-body)' }}
      >
        {message.content}
      </Text>

      {message.suggestions && message.suggestions.length > 0 && (
        <Flex wrap="wrap" gap={1} style={{ marginTop: 'var(--sireen-space-1)' }}>
          {message.suggestions.map(s => (
            <Chip key={s.id} onClick={() => handleSuggestion(s)}>
              {s.icon && <Icon name={s.icon as IconName} size="sm" />}
              {s.label}
            </Chip>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

export const ChatMessage = memo(ChatMessageImpl);
