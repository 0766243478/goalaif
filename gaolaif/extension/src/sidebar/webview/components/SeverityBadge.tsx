interface Props {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  size?: 'sm' | 'md';
}

const config = {
  CRITICAL: { bg: 'var(--sireen-critical-strong)', color: '#fff', label: 'CRITICAL' },
  HIGH: { bg: 'var(--sireen-high)', color: '#000', label: 'HIGH' },
  MEDIUM: { bg: 'var(--sireen-medium)', color: '#000', label: 'MEDIUM' },
  LOW: { bg: 'var(--sireen-low-strong)', color: '#fff', label: 'LOW' },
};

export function SeverityBadge({ severity, size = 'md' }: Props) {
  const c = config[severity];
  return (
    <span
      className="badge"
      style={{
        background: c.bg,
        color: c.color,
        fontSize: size === 'sm' ? '9px' : 'var(--text-xs)',
        padding: size === 'sm' ? '0 3px' : '1px 4px',
      }}
    >
      {c.label}
    </span>
  );
}
