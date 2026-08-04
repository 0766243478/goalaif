import type { ReactNode } from 'react';

export type BadgeVariant = 'filled' | 'outline' | 'subtle';
export type BadgeColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'gray';
export type BadgeSize = 'sm' | 'md' | 'lg';

const COLOR_FG: Record<BadgeColor, string> = {
  default: 'var(--sireen-button-bg)',
  red: 'var(--sireen-severity-critical-fg)',
  orange: 'var(--sireen-severity-high-fg)',
  yellow: 'var(--sireen-severity-medium-fg)',
  green: 'var(--sireen-success-fg)',
  blue: 'var(--sireen-severity-low-fg)',
  purple: 'var(--sireen-accent-purple)',
  gray: 'var(--sireen-fg-secondary)',
};

const COLOR_BG: Record<BadgeColor, string> = {
  default: 'var(--sireen-button-bg)',
  red: 'var(--sireen-severity-critical-fg)',
  orange: 'var(--sireen-severity-high-fg)',
  yellow: 'var(--sireen-severity-medium-fg)',
  green: 'var(--sireen-success-fg)',
  blue: 'var(--sireen-severity-low-fg)',
  purple: 'var(--sireen-accent-purple)',
  gray: 'var(--sireen-fg-secondary)',
};

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'subtle',
  color = 'gray',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  const classes = ['sireen-badge', `sireen-badge--${variant}`, `sireen-badge--${size}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties =
    variant === 'filled'
      ? { background: COLOR_BG[color], color: 'var(--sireen-fg-on-accent)' }
      : variant === 'outline'
        ? { color: COLOR_FG[color] }
        : { color: COLOR_FG[color] }; // subtle uses bg-hover from CSS

  return (
    <span className={classes} style={style}>
      {dot && <span className="sireen-badge__dot" />}
      {children}
    </span>
  );
}
