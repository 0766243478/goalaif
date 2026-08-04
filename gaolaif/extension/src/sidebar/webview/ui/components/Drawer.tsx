import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../primitives/Icon';

export type DrawerPlacement = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  placement?: DrawerPlacement;
  size?: DrawerSize;
  title?: ReactNode;
  closable?: boolean;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  children?: ReactNode;
}

export function Drawer({
  open,
  onClose,
  placement = 'right',
  size = 'md',
  title,
  closable = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  children,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="sireen-drawer__overlay"
        onMouseDown={e => {
          if (closeOnOverlay && e.target === e.currentTarget) onClose();
        }}
      />
      <div
        className={['sireen-drawer', `sireen-drawer--${placement}`, `sireen-drawer--${size}`].join(' ')}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Drawer'}
        tabIndex={-1}
      >
        {(title || closable) && (
          <div className="sireen-drawer__header">
            {title && (
              <h2 style={{ margin: 0, fontSize: 'var(--sireen-font-size-h3)', fontWeight: 'var(--sireen-font-weight-semibold)' }}>
                {title}
              </h2>
            )}
            {closable && (
              <button className="sireen-modal__close" onClick={onClose} aria-label="Close drawer">
                <Icon name="x" size="md" />
              </button>
            )}
          </div>
        )}
        <div className="sireen-drawer__body">{children}</div>
      </div>
    </>
  );
}
