export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      className={['sireen-spinner', `sireen-spinner--${size}`, className].filter(Boolean).join(' ')}
      role="status"
      aria-label={label ?? 'Loading'}
    />
  );
}
