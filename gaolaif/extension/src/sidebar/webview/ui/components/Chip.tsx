import type { ReactNode } from 'react';
import { Icon } from '../primitives/Icon';

export interface ChipProps {
  children: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function Chip({ children, removable = false, onRemove, onClick, className }: ChipProps) {
  const classes = ['sireen-chip', removable ? 'sireen-chip--removable' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {children}
      {removable && (
        <button className="sireen-chip__remove" onClick={onRemove} aria-label="Remove">
          <Icon name="x" size="sm" />
        </button>
      )}
    </span>
  );
}
