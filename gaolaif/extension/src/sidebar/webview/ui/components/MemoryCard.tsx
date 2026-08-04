import { memo } from 'react';
import type { MemoryEntry } from '../../store/types';
import { Card } from './Card';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Icon } from '../primitives/Icon';

interface Props {
  entry: MemoryEntry;
  onClick?: () => void;
  selected?: boolean;
}

function MemoryCardImpl({ entry, onClick, selected = false }: Props) {
  const tags = Array.isArray(entry.metadata?.tags) ? (entry.metadata.tags as string[]) : [];
  return (
    <Card
      variant={onClick ? (selected ? 'selected' : 'interactive') : 'default'}
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sireen-space-1)' }}
    >
      <Flex align="center" gap={1}>
        <Icon name="lightbulb" size="sm" color="var(--sireen-accent-amber)" />
        <Text variant="body-sm" weight="semibold" truncate>
          {entry.key}
        </Text>
      </Flex>
      <Text variant="caption" color="secondary" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {entry.content}
      </Text>
      {tags.length > 0 && (
        <Flex wrap="wrap" gap={1}>
          {tags.slice(0, 4).map(tag => (
            <Text key={tag} variant="caption" color="muted" style={{ color: 'var(--sireen-accent-blue)' }}>
              #{tag}
            </Text>
          ))}
        </Flex>
      )}
      {entry.score != null && (
        <Text variant="caption" color="muted">
          Score: {entry.score.toFixed(2)}
        </Text>
      )}
    </Card>
  );
}

export const MemoryCard = memo(MemoryCardImpl);
