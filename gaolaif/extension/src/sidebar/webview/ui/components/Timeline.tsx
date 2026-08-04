import type { ReactNode } from 'react';

export type TimelineStatus = 'pending' | 'active' | 'completed' | 'error';

export interface TimelineEvent {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  status?: TimelineStatus;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const DOT_CLASS: Record<TimelineStatus, string> = {
  pending: '',
  active: 'sireen-timeline__dot--active',
  completed: 'sireen-timeline__dot--completed',
  error: 'sireen-timeline__dot--error',
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={['sireen-timeline', className].filter(Boolean).join(' ')}>
      {events.map(event => (
        <div className="sireen-timeline__item" key={event.id}>
          <div className={['sireen-timeline__dot', DOT_CLASS[event.status ?? 'pending']].filter(Boolean).join(' ')} />
          <div className="sireen-timeline__content">
            <div style={{ fontWeight: 'var(--sireen-font-weight-medium)', fontSize: 'var(--sireen-font-size-body)' }}>
              {event.title}
            </div>
            {event.description && (
              <div style={{ color: 'var(--sireen-fg-secondary)', fontSize: 'var(--sireen-font-size-body-sm)' }}>
                {event.description}
              </div>
            )}
            {event.timestamp && <div className="sireen-timeline__time">{event.timestamp}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
