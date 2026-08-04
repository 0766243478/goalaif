import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { AuditProgressBar } from '../ui/components/AuditProgressBar';
import { Icon } from '../ui/primitives/Icon';
import { Text } from '../ui/primitives/Text';
import { Flex } from '../ui/primitives/Flex';
import { Grid } from '../ui/primitives/Grid';
import { Stack } from '../ui/primitives/Stack';
import { Card } from '../ui/components/Card';
import { Button } from '../ui/components/Button';
import { StatCard } from '../ui/components/StatCard';
import { SeverityBadge } from '../ui/components/SeverityBadge';
import { Chip } from '../ui/components/Chip';

export default function OverviewView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();

  const critCount = state.findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = state.findings.filter(f => f.severity === 'HIGH').length;
  const medCount = state.findings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = state.findings.filter(f => f.severity === 'LOW').length;
  const riskScore = state.protocol?.riskScore ?? 0;

  return (
    <Stack gap={4}>
      {state.protocol && (
        <Flex align="center" gap={3}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--sireen-radius-lg)',
              background: 'var(--sireen-bg-inactive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="brand" size="lg" color="var(--sireen-accent-amber)" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <Text variant="h1" weight="semibold" truncate>
              {state.protocol.name}
            </Text>
            <Text variant="caption" color="muted">
              {state.protocol.totalContracts} contracts · {state.protocol.totalFunctions} functions
            </Text>
          </div>
        </Flex>
      )}

      {!state.protocol && (
        <Stack gap={1}>
          <Text variant="h1" weight="semibold">
            SIREEN
          </Text>
          <Text variant="caption" color="muted">
            Open a smart contract to begin analysis. Right-click a .sol file and select &ldquo;Audit with Sireen&rdquo;.
          </Text>
        </Stack>
      )}

      <AuditProgressBar />

      <Grid columns={2} gap={2}>
        <StatCard value={state.findings.length} label="Findings" icon="findings" />
        <StatCard value={state.exploits.length} label="Exploits" icon="exploits" />
        <StatCard value={state.memoryEntries.length} label="Memory" icon="memory" />
        <StatCard
          value={`${state.protocol?.riskScore || '--'}/100`}
          label="Risk Score"
          icon="gauge"
          color={riskScore > 70 ? 'critical' : riskScore > 40 ? 'medium' : 'low'}
        />
      </Grid>

      {(critCount > 0 || highCount > 0 || medCount > 0 || lowCount > 0) && (
        <Flex gap={1} wrap="wrap">
          {critCount > 0 && <SeverityBadge severity="CRITICAL" size="sm" />}
          {highCount > 0 && <SeverityBadge severity="HIGH" size="sm" />}
          {medCount > 0 && <SeverityBadge severity="MEDIUM" size="sm" />}
          {lowCount > 0 && <SeverityBadge severity="LOW" size="sm" />}
        </Flex>
      )}

      <Stack gap={1}>
        <Text variant="caption" color="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Actions
        </Text>
        <Flex gap={2}>
          <Button
            variant="primary"
            iconLeft="scan"
            onClick={() => {
              const code = state.contractCode || '';
              const filePath = state.contractFilePath || '';
              send('sireen.audit.request', { code, file_path: filePath });
            }}
            style={{ flex: 1 }}
          >
            Full Audit
          </Button>
          <Button variant="secondary" iconLeft="chat" onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })} style={{ flex: 1 }}>
            Chat
          </Button>
          <Button variant="secondary" iconLeft="findings" onClick={() => dispatch({ type: 'SET_VIEW', view: 'findings' })} style={{ flex: 1 }}>
            Findings
          </Button>
        </Flex>
      </Stack>

      {state.suggestions.length > 0 && (
        <Stack gap={1}>
          <Text variant="caption" color="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Suggestions
          </Text>
          {state.suggestions.slice(0, 3).map(s => (
            <Card
              key={s.id}
              variant="interactive"
              onClick={() => {
                if (s.actions?.[0]?.command === 'sireen.navigate') {
                  dispatch({ type: 'SET_VIEW', view: s.actions[0].args?.view as any });
                }
              }}
            >
              <Flex align="center" gap={1} style={{ marginBottom: 'var(--sireen-space-1)' }}>
                <Text
                  variant="caption"
                  weight="semibold"
                  style={{ color: s.priority === 'urgent' ? 'var(--sireen-severity-critical-fg)' : 'var(--sireen-accent-amber)' }}
                >
                  {s.type.toUpperCase()}
                </Text>
                <Text variant="body-sm" weight="semibold">
                  {s.title}
                </Text>
              </Flex>
              <Text variant="caption" color="secondary">
                {s.description}
              </Text>
            </Card>
          ))}
        </Stack>
      )}

      {state.protocol?.attackSurfaces && state.protocol.attackSurfaces.length > 0 && (
        <Stack gap={1}>
          <Text variant="caption" color="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Attack Surfaces
          </Text>
          <Flex wrap="wrap" gap={1}>
            {state.protocol.attackSurfaces.map(surface => (
              <Chip key={surface}>{surface}</Chip>
            ))}
          </Flex>
        </Stack>
      )}
    </Stack>
  );
}
