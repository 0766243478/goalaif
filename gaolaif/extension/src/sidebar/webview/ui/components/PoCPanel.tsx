import { memo } from 'react';
import type { ExploitRecord } from '../../store/types';
import { Card } from './Card';
import { CodeBlock } from './CodeBlock';
import { Terminal } from './Terminal';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Icon } from '../primitives/Icon';
import { Badge } from './Badge';

interface Props {
  exploit: ExploitRecord;
}

function PoCPanelImpl({ exploit }: Props) {
  const lines = exploit.forgeOutput
    .split('\n')
    .filter(Boolean)
    .map((text, i) => ({
      id: `line-${i}`,
      text,
      type: (text.toLowerCase().includes('pass') || text.includes('✓')
        ? 'success'
        : text.toLowerCase().includes('fail') || text.includes('✕') || text.toLowerCase().includes('error')
          ? 'error'
          : text.toLowerCase().includes('warn')
            ? 'warning'
            : 'default') as 'success' | 'error' | 'warning' | 'default',
    }));

  return (
    <Card flush style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sireen-space-2)' }}>
      <Flex align="center" justify="space-between" style={{ padding: 'var(--sireen-space-3)' }}>
        <Flex align="center" gap={2}>
          <Icon name="exploits" size="md" color="var(--sireen-severity-critical-fg)" />
          <Text variant="h3" weight="semibold">
            Proof of Concept
          </Text>
        </Flex>
        <Badge variant={exploit.confirmed ? 'filled' : 'outline'} color={exploit.confirmed ? 'green' : 'yellow'}>
          {exploit.confirmed ? 'Confirmed' : 'Unverified'}
        </Badge>
      </Flex>

      {exploit.hypothesis && (
        <div style={{ padding: '0 var(--sireen-space-3)' }}>
          <Text variant="body-sm" color="secondary">
            {exploit.hypothesis}
          </Text>
        </div>
      )}

      <CodeBlock code={exploit.pocCode} language="solidity" filename="ExploitPoC.sol" />

      {exploit.forgeOutput && (
        <Terminal title="Forge Output" lines={lines} maxHeight={300} />
      )}

      {exploit.estimatedImpact && (
        <div style={{ padding: 'var(--sireen-space-3)' }}>
          <Flex align="center" gap={1}>
            <Icon name="target" size="sm" color="var(--sireen-warning-fg)" />
            <Text variant="caption" color="secondary">
              Impact: {exploit.estimatedImpact}
            </Text>
          </Flex>
        </div>
      )}
    </Card>
  );
}

export const PoCPanel = memo(PoCPanelImpl);
