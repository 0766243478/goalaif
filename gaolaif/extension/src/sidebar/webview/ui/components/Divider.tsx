import type { ReactNode } from 'react';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed';

export interface DividerProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  label?: ReactNode;
  className?: string;
}

export function Divider({ orientation = 'horizontal', variant = 'solid', label, className }: DividerProps) {
  if (label) {
    return (
      <div className={['sireen-divider sireen-divider--label', className].filter(Boolean).join(' ')}>
        {label}
      </div>
    );
  }
  const classes = [
    'sireen-divider',
    `sireen-divider--${orientation}`,
    variant === 'dashed' ? 'sireen-divider--dashed' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <hr className={classes} />;
}
