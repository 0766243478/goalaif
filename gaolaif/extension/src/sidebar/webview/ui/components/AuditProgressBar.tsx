import { useStore } from '../../store';
import type { AuditPhase, PipelineStage } from '../../store/types';
import { Text } from '../primitives/Text';
import { Flex } from '../primitives/Flex';
import { Progress } from './Progress';
import { Alert } from './Alert';

const PHASE_LABELS: Record<AuditPhase, string> = {
  idle: '',
  phase1: 'Phase 1/4',
  phase2: 'Phase 2/4',
  phase3: 'Phase 3/4',
  phase4: 'Phase 4/4',
  complete: 'Complete',
  error: 'Error',
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: '',
  understanding: 'Understanding contract',
  scenarios: 'Generating attack scenarios',
  compiling: 'Compiling PoC',
  auto_fixing: 'Auto-fixing compilation',
  running_forge: 'Running Forge',
  verifying: 'Verifying exploit',
  judging: 'Judging findings',
  complete: 'Audit complete',
  error: 'Error',
};

export function AuditProgressBar() {
  const { state } = useStore();
  const { auditPhase, auditProgress } = state;

  if (auditPhase === 'idle') return null;

  if (auditPhase === 'complete') {
    return (
      <Alert variant="success" title={PHASE_LABELS[auditPhase]}>
        Audit completed successfully
      </Alert>
    );
  }

  if (auditPhase === 'error') {
    return (
      <Alert variant="error" title={PHASE_LABELS[auditPhase]}>
        Audit failed
      </Alert>
    );
  }

  const stageLabel = auditProgress?.stage ? STAGE_LABELS[auditProgress.stage] || auditProgress.message : 'Running...';
  const scenarioInfo =
    auditProgress?.scenariosTotal && auditProgress.scenariosTotal > 0
      ? ` ${auditProgress.scenariosCompleted}/${auditProgress.scenariosTotal} scenarios`
      : '';
  const phasePercent = ((auditProgress?.phase || 1) / 4) * 100;

  return (
    <div
      style={{
        padding: 'var(--sireen-space-2) var(--sireen-space-3)',
        background: 'var(--sireen-warning-bg)',
        border: '1px solid var(--sireen-warning-border)',
        borderRadius: 'var(--sireen-radius-md)',
      }}
    >
      <Flex align="center" gap={2}>
        <Text variant="caption" weight="semibold" style={{ color: 'var(--sireen-warning-fg)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {PHASE_LABELS[auditPhase]}
        </Text>
        <Text variant="caption" color="secondary" truncate style={{ flex: 1 }}>
          {stageLabel}
          {scenarioInfo}
        </Text>
        <div style={{ width: 80 }}>
          <Progress value={phasePercent} />
        </div>
      </Flex>
    </div>
  );
}
