import { useState, type ReactNode } from 'react';
import { Icon } from '../primitives/Icon';

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultExpanded?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** allow multiple items open at once */
  multiple?: boolean;
  className?: string;
}

export function Accordion({ items, multiple = false, className }: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    items.forEach(i => {
      if (i.defaultExpanded) initial.add(i.id);
    });
    return initial;
  });

  const toggle = (id: string) => {
    setOpen(prev => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={className}>
      {items.map(item => {
        const isOpen = open.has(item.id);
        return (
          <div className="sireen-accordion__item" key={item.id}>
            <button
              className="sireen-accordion__trigger"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              id={`accordion-trigger-${item.id}`}
              onClick={() => toggle(item.id)}
            >
              <span>{item.title}</span>
              <span className={['sireen-accordion__chevron', isOpen ? 'sireen-accordion__chevron--open' : ''].filter(Boolean).join(' ')}>
                <Icon name="chevronRight" size="sm" />
              </span>
            </button>
            {isOpen && (
              <div
                className="sireen-accordion__content"
                id={`accordion-content-${item.id}`}
                role="region"
                aria-labelledby={`accordion-trigger-${item.id}`}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
