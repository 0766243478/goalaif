export type SkeletonVariant = 'text' | 'circle' | 'rect';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

export function Skeleton({ variant = 'rect', width, height, rows = 1, className }: SkeletonProps) {
  if (variant === 'text' && rows > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sireen-space-2)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={['sireen-skeleton sireen-skeleton--text', className].filter(Boolean).join(' ')}
            style={{ width: i === rows - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const classes = [
    'sireen-skeleton',
    variant === 'text' ? 'sireen-skeleton--text' : '',
    variant === 'circle' ? 'sireen-skeleton--circle' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} style={style} aria-hidden="true" />;
}
