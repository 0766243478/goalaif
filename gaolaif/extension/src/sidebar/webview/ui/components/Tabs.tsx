import { useRef, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs({ items, value, onChange, className, style }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    const enabled = items.filter(i => !i.disabled);
    const idx = enabled.findIndex(i => i.id === currentId);
    if (idx === -1) return;
    let next: TabItem | undefined;
    if (e.key === 'ArrowRight') next = enabled[(idx + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(idx - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next.id);
      refs.current[next.id]?.focus();
    }
  };

  return (
    <div className={['sireen-tabs__list', className].filter(Boolean).join(' ')} role="tablist" style={style}>
      {items.map(item => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={el => {
              refs.current[item.id] = el;
            }}
            role="tab"
            aria-selected={active}
            aria-controls={`tabpanel-${item.id}`}
            id={`tab-${item.id}`}
            disabled={item.disabled}
            className={['sireen-tab', active ? 'sireen-tab--active' : '', item.disabled ? 'sireen-tab--disabled' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => !item.disabled && onChange(item.id)}
            onKeyDown={e => onKeyDown(e, item.id)}
          >
            {item.icon}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
