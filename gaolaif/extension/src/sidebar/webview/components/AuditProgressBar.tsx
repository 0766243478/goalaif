import { useStore } from '../store';
import type { AuditPhase, PipelineStage } from '../store/types';

const PHASE_LABELS: Record<AuditPhase, string> = {
  idle: '',
  phase1: 'Phase 1/4',
  phase2: 'Phase 2/4',
  phase3: 'Phase 3/4',
  phase4: 'Phase 4/4',
  complete: 'Complete',
  error: 'Error',
  incomplete: 'Incomplete',
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
      <div style={{
        padding: '6px 12px',
        background: 'var(--sireen-green-bg)',
        border: '1px solid rgba(34,197,94,0.2)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--sireen-green)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {PHASE_LABELS[auditPhase]}
        </span>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--sireen-text-secondary)',
        }}>
          Audit completed successfully
        </span>
      </div>
    );
  }

  if (auditPhase === 'error') {
    return (
      <div style={{
        padding: '6px 12px',
        background: 'var(--sireen-critical-bg)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--sireen-critical)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {PHASE_LABELS[auditPhase]}
        </span>
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--sireen-text-secondary)',
        }}>
          Audit failed
        </span>
      </div>
    );
  }

  const stageLabel = auditProgress?.stage
    ? STAGE_LABELS[auditProgress.stage] || auditProgress.message
    : 'Running...';
  const scenarioInfo = auditProgress?.scenariosTotal && auditProgress.scenariosTotal > 0
    ? ` ${auditProgress.scenariosCompleted}/${auditProgress.scenariosTotal} scenarios`
    : '';

  return (
    <div style={{
      padding: '6px 12px',
      background: 'var(--sireen-amber-bg)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color: 'var(--sireen-amber)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {PHASE_LABELS[auditPhase]}
      </span>
      <div style={{
        flex: 1,
        fontSize: 'var(--text-xs)',
        color: 'var(--sireen-text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {PHASE_SEGMENTS[auditPhase as keyof typeof PHASE_SEGMENTS]?.map((segment, i, arr) => (
          <span key={segment}>
            <span style={{
              color: i < (arr.length - 1) ? 'var(--sireen-amber)' : 'var(--sireen-text-secondary)',
            }}>
              {segment}
            </span>
            {i < arr.length - 1 && (
              <span style={{ color: 'var(--sireen-text-ghost)', margin: '0 4px' }}>/</span>
            )}
          </span>
        ))}
      </div>
      <div style={{
        width: 80,
        height: 3,
        background: 'var(--sireen-raised)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${((auditProgress?.phase || 1) / 4) * 100}%`,
          height: '100%',
          background: 'var(--sireen-amber)',
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--sireen-text-muted)',
        whiteSpace: 'nowrap',
      }}>
        {stageLabel}{scenarioInfo}
      </span>
    </div>
  );
}

const PHASE_SEGMENTS = {
  phase1: ['Contract Analysis', 'Attack Scenarios', 'PoC Simulation', 'Judgment'],
  phase2: ['Contract Analysis', 'Attack Scenarios', 'PoC Simulation', 'Judgment'],
  phase3: ['Contract Analysis', 'Attack Scenarios', 'PoC Simulation', 'Judgment'],
  phase4: ['Contract Analysis', 'Attack Scenarios', 'PoC Simulation', 'Judgment'],
};