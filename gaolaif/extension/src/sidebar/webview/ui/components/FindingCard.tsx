import { memo } from 'react';
import type { Finding } from '../../store/types';
import { Card } from './Card';
import { SeverityBadge } from './SeverityBadge';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Icon } from '../primitives/Icon';

interface Props {
  finding: Finding;
  selected?: boolean;
  onClick?: () => void;
}

function FindingCardImpl({ finding, selected = false, onClick }: Props) {
  return (
    <Card
      variant={onClick ? (selected ? 'selected' : 'interactive') : 'default'}
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sireen-space-1)' }}
    >
      <Flex align="center" justify="space-between">
        <SeverityBadge severity={finding.severity} size="sm" />
        {finding.confirmed && (
          <Flex align="center" gap={1}>
            <Icon name="checkCircle" size="sm" color="var(--sireen-success-fg)" />
            <Text variant="caption" color="secondary">
              Confirmed
            </Text>
          </Flex>
        )}
      </Flex>
      <Text variant="body" weight="semibold" truncate>
        {finding.title}
      </Text>
      <Text variant="caption" color="secondary" truncate>
        {finding.file_path ? `${finding.file_path.split(/[/\\]/).pop()}` : ''}
        {finding.line_number ? ` · L${finding.line_number}` : ''}
      </Text>
      <Text variant="caption" color="muted" truncate>
        {finding.description}
      </Text>
    </Card>
  );
}

export const FindingCard = memo(FindingCardImpl);
