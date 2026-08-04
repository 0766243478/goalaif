import type { ReactNode } from 'react';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';

export type StatColor = 'default' | 'critical' | 'high' | 'medium' | 'low';

export interface StatCardProps {
  value: ReactNode;
  label: string;
  icon?: IconName;
  color?: StatColor;
  trend?: { value: number; direction: 'up' | 'down' | 'flat'; label?: string };
  className?: string;
}

export function StatCard({ value, label, icon, color = 'default', trend, className }: StatCardProps) {
  const classes = ['sireen-stat', color !== 'default' ? `sireen-stat--${color}` : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="sireen-stat__value">{value}</span>
        {icon && <Icon name={icon} size="md" color="var(--sireen-fg-muted)" />}
      </div>
      <span className="sireen-stat__label">{label}</span>
      {trend && (
        <span
          className="sireen-stat__trend"
          style={{
            color:
              trend.direction === 'up'
                ? 'var(--sireen-success-fg)'
                : trend.direction === 'down'
                  ? 'var(--sireen-error-fg)'
                  : 'var(--sireen-fg-muted)',
          }}
        >
          <Icon
            name={trend.direction === 'up' ? 'arrowUpRight' : trend.direction === 'down' ? 'arrowDownRight' : 'chevronRight'}
            size="sm"
          />
          {trend.value}
          {trend.label ? ` ${trend.label}` : ''}
        </span>
      )}
    </div>
  );
}
