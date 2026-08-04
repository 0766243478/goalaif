export type ProgressStatus = 'default' | 'success' | 'error' | 'warning';

export interface ProgressProps {
  /** 0-100 */
  value?: number;
  status?: ProgressStatus;
  indeterminate?: boolean;
  className?: string;
  label?: string;
}

export function Progress({ value = 0, status = 'default', indeterminate = false, className, label }: ProgressProps) {
  const classes = [
    'sireen-progress',
    status !== 'default' ? `sireen-progress--${status}` : '',
    indeterminate ? 'sireen-progress--indeterminate' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={classes}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="sireen-progress__bar" style={indeterminate ? undefined : { width: `${clamped}%` }} />
    </div>
  );
}
