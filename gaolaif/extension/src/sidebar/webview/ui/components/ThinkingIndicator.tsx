import { memo } from 'react';
import type { ThinkingStep } from '../../store/types';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Spinner } from './Spinner';

interface Props {
  steps: ThinkingStep[];
}

function ThinkingIndicatorImpl({ steps }: Props) {
  return (
    <Flex
      direction="column"
      gap={2}
      style={{
        padding: 'var(--sireen-space-2) var(--sireen-space-3)',
        borderRadius: 'var(--sireen-radius-lg)',
        background: 'var(--sireen-bg-inactive)',
        border: '1px solid var(--sireen-border-subtle)',
        alignSelf: 'flex-start',
        maxWidth: '85%',
      }}
    >
      <Flex align="center" gap={2}>
        <Spinner size="sm" />
        <Text variant="caption" weight="semibold" color="secondary">
          Thinking...
        </Text>
      </Flex>
      {steps.length > 0 && (
        <Flex direction="column" gap={1}>
          {steps.map((step, i) => (
            <Flex key={i} gap={1} align="flex-start">
              <Text variant="caption" weight="semibold" style={{ color: 'var(--sireen-accent-purple)', whiteSpace: 'nowrap' }}>
                {step.agent}:
              </Text>
              <Text variant="caption" color="secondary">
                {step.thought}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

export const ThinkingIndicator = memo(ThinkingIndicatorImpl);
