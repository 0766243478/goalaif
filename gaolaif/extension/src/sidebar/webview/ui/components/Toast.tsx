import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert } from './Alert';
import type { AlertVariant } from './Alert';

export type ToastPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface Toast {
  id: string;
  variant: AlertVariant;
  title?: ReactNode;
  message?: ReactNode;
  duration?: number;
}

export interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({
  children,
  position = 'bottom-right',
  defaultDuration = 4000,
}: {
  children: ReactNode;
  position?: ToastPosition;
  defaultDuration?: number;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast-${++counter}`;
      const duration = t.duration ?? defaultDuration;
      setToasts(prev => [...prev, { ...t, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [defaultDuration, dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={`sireen-toast-container sireen-toast-container--${position}`}>
        {toasts.map(t => (
          <div key={t.id} className="sireen-toast">
            <Alert variant={t.variant} title={t.title} onClose={() => dismiss(t.id)}>
              {t.message}
            </Alert>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
