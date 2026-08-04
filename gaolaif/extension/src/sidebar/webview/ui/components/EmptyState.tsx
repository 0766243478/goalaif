import type { ReactNode } from 'react';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: IconName;
  title?: ReactNode;
  message?: ReactNode;
  action?: { label: string; onClick: () => void; icon?: IconName };
  className?: string;
}

export function EmptyState({ icon = 'inbox', title, message, action, className }: EmptyStateProps) {
  return (
    <div className={['sireen-empty', className].filter(Boolean).join(' ')}>
      <div className="sireen-empty__icon">
        <Icon name={icon} size="xl" />
      </div>
      {title && <div className="sireen-empty__title">{title}</div>}
      {message && <div className="sireen-empty__message">{message}</div>}
      {action && (
        <Button variant="primary" iconLeft={action.icon} onClick={action.onClick} style={{ marginTop: 'var(--sireen-space-2)' }}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
