# Toast Notifications Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Non-blocking notifications that appear temporarily and auto-dismiss. Used for status updates and confirmations.

---

## Types

| Type | Use Case | Color |
|------|----------|-------|
| Success | Operation completed | Green |
| Error | Operation failed | Red |
| Warning | Potential issue | Amber |
| Info | General notification | Blue |

---

## Implementation

```tsx
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms, default 4000
}

function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div 
      className="toast-container"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: Props) {
  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, []);
  
  const icons = {
    success: 'check',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };
  
  return (
    <div 
      className={`toast toast-${toast.type}`}
      role="alert"
    >
      <i className={`codicon codicon-${icons[toast.type]}`}></i>
      <span>{toast.message}</span>
      {toast.action && (
        <button onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
      <button className="toast-close" onClick={onRemove} aria-label="Dismiss">
        <i className="codicon codicon-close"></i>
      </button>
    </div>
  );
}
```

---

## CSS

```css
.toast-container {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 1000;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--vscode-notificationToast-background);
  color: var(--vscode-notificationToast-foreground);
  border-radius: var(--radius-sm);
  box-shadow: var(--elevation-overlay);
  min-width: 250px;
  max-width: 400px;
  animation: slideIn var(--duration-normal) ease;
}

.toast-success { border-left: 3px solid var(--sireen-green); }
.toast-error { border-left: 3px solid var(--sireen-critical); }
.toast-warning { border-left: 3px solid var(--sireen-amber); }
.toast-info { border-left: 3px solid var(--sireen-purple); }

.toast-close {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  padding: var(--space-1);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## Usage

```typescript
// Add toast
dispatch(addToast({
  type: 'success',
  message: 'Exploit generated successfully',
}));

// With action button
dispatch(addToast({
  type: 'info',
  message: 'Settings saved',
  action: {
    label: 'Undo',
    onClick: () => undoSave(),
  },
}));
```

---

## Accessibility

- **Live Region:** Use `aria-live="polite"` for announcements
- **Alert Role:** Use `role="alert"` for important messages
- **Dismiss:** Always provide manual dismiss option
- **Duration:** Allow longer duration for critical messages
