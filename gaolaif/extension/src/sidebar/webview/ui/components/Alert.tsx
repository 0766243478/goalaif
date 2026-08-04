import type { ReactNode } from 'react';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const ICON_MAP: Record<AlertVariant, IconName> = {
  info: 'info',
  success: 'checkCircle',
  warning: 'warning',
  error: 'alertCircle',
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const classes = ['sireen-alert', `sireen-alert--${variant}`, className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert">
      <span className="sireen-alert__icon">
        <Icon name={ICON_MAP[variant]} size="md" />
      </span>
      <div className="sireen-alert__content">
        {title && <div className="sireen-alert__title">{title}</div>}
        {children && <div>{children}</div>}
      </div>
      {onClose && (
        <button className="sireen-alert__close" onClick={onClose} aria-label="Dismiss">
          <Icon name="x" size="sm" />
        </button>
      )}
    </div>
  );
}
