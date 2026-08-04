import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../primitives/Icon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: ModalSize;
  /** render a close (X) button in the header */
  closable?: boolean;
  /** close when clicking the overlay */
  closeOnOverlay?: boolean;
  /** close on Escape key */
  closeOnEscape?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  closable = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  children,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // focus the modal container
    modalRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="sireen-modal__overlay"
      onMouseDown={e => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={['sireen-modal', `sireen-modal--${size}`].join(' ')}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sireen-modal-title' : undefined}
        tabIndex={-1}
      >
        {(title || closable) && (
          <div className="sireen-modal__header">
            {title && (
              <h2 id="sireen-modal-title" style={{ margin: 0, fontSize: 'var(--sireen-font-size-h2)', fontWeight: 'var(--sireen-font-weight-semibold)' }}>
                {title}
              </h2>
            )}
            {closable && (
              <button className="sireen-modal__close" onClick={onClose} aria-label="Close dialog">
                <Icon name="x" size="md" />
              </button>
            )}
          </div>
        )}
        <div className="sireen-modal__body">{children}</div>
        {footer && <div className="sireen-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
