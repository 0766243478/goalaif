export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type SeveritySize = 'sm' | 'md';

const LABELS: Record<Severity, string> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
};

const CLASS_MAP: Record<Severity, string> = {
  CRITICAL: 'sireen-severity--critical',
  HIGH: 'sireen-severity--high',
  MEDIUM: 'sireen-severity--medium',
  LOW: 'sireen-severity--low',
  INFO: 'sireen-severity--info',
};

export interface SeverityBadgeProps {
  severity: Severity;
  size?: SeveritySize;
  /** show only a dot without label */
  dotOnly?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, size = 'md', dotOnly = false, className }: SeverityBadgeProps) {
  const classes = ['sireen-severity', `sireen-severity--${size}`, CLASS_MAP[severity], className ?? '']
    .filter(Boolean)
    .join(' ');
  return <span className={classes}>{dotOnly ? <span className="sireen-badge__dot" /> : LABELS[severity]}</span>;
}
