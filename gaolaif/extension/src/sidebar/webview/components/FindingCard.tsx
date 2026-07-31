import { memo } from 'react';
import type { Finding } from '../store/types';
import { useMessageBus } from '../hooks/useMessageBus';
import { useStore } from '../store';

interface Props {
  finding: Finding;
  compact?: boolean;
}

const severityConfig = {
  CRITICAL: { color: 'var(--sireen-critical)', bg: 'var(--sireen-critical-bg)', label: 'CRIT' },
  HIGH: { color: 'var(--sireen-high)', bg: 'var(--sireen-high-bg)', label: 'HIGH' },
  MEDIUM: { color: 'var(--sireen-medium)', bg: 'var(--sireen-medium-bg)', label: 'MED' },
  LOW: { color: 'var(--sireen-low)', bg: 'var(--sireen-low-bg)', label: 'LOW' },
};

function FindingCardInner({ finding, compact }: Props) {
  const { send } = useMessageBus();
  const { state } = useStore();
  const sev = severityConfig[finding.severity] || severityConfig.LOW;
  const sourceCode = state.contractCode || '';
  const sourceFile = finding.file_path || state.contractFilePath || '';

  return (
    <div
      className="card card-clickable animate-fade-in"
      style={{ marginBottom: compact ? 6 : 8 }}
      onClick={() => {
        if (finding.file_path && finding.line_number) {
          send('sireen.findings.jumpTo', { file: finding.file_path, line: finding.line_number });
        }
      }}
    >
      <div className="card-header" style={{ padding: compact ? '6px 8px' : '8px 12px' }}>
        <span
          className="badge"
          style={{ background: sev.color, color: finding.severity === 'CRITICAL' || finding.severity === 'LOW' ? '#fff' : '#000' }}
        >
          {sev.label}
        </span>
        <span style={{
          fontSize: compact ? 'var(--text-xs)' : 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--sireen-text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {finding.title}
        </span>
        {finding.confirmed && (
          <span className="badge badge-success" style={{ fontSize: '9px' }}>CONFIRMED</span>
        )}
      </div>

      {!compact && (
        <div className="card-body" style={{ padding: '8px 12px' }}>
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--sireen-text-secondary)',
            marginBottom: 6,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {finding.description}
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
            {finding.affected_functions?.map((fn) => (
              <span key={fn} className="badge badge-ghost" style={{ fontSize: '9px' }}>
                {fn}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '2px 6px' }}
              onClick={(e) => {
                e.stopPropagation();
                send('sireen.exploit.request', {
                  code: sourceCode,
                  file_path: sourceFile,
                  idea: `Exploit ${finding.title}`,
                  target_function: finding.affected_functions?.[0] || '',
                });
              }}
            >
              Exploit
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: 'var(--text-xs)', padding: '2px 6px' }}
              onClick={(e) => {
                e.stopPropagation();
                send('sireen.patch.request', {
                  code: sourceCode,
                  file_path: sourceFile,
                  finding: finding,
                });
              }}
            >
              Patch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const FindingCard = memo(FindingCardInner);