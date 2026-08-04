import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'default' | 'selected' | 'interactive';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padded?: boolean;
  flush?: boolean;
  children?: ReactNode;
}

export function Card({
  variant = 'default',
  padded = false,
  flush = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    'sireen-card',
    variant === 'selected' ? 'sireen-card--selected' : '',
    variant === 'interactive' ? 'sireen-card--interactive' : '',
    padded ? 'sireen-card--padded' : '',
    flush ? 'sireen-card--flush' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
