import { Icon } from './Icon';
import type { IconName } from './Icon';

interface Props {
  icon?: IconName;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = 'inbox', title, message, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={32} />
      </div>
      {title && (
        <div style={{
          fontSize: 'var(--text-md)',
          fontWeight: 600,
          color: 'var(--sireen-text-secondary)',
        }}>
          {title}
        </div>
      )}
      {message && <div className="empty-state-text">{message}</div>}
      {action && (
        <button className="btn-primary" onClick={action.onClick} style={{ marginTop: 8 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
