# Alert Component

> **Status:** Proposed  
> **Component Count:** 38 of 40+

---

## Definition

A prominent message box displaying system status, warnings, or important information. Appears inline or as a toast notification.

---

## Types

### Info Alert
```
┌─────────────────────────────────────────┐
│ ℹ️  Tip: Press Cmd+Shift+P for commands │
└─────────────────────────────────────────┘
```

### Success Alert
```
┌─────────────────────────────────────────┐
│ ✓  Audit completed successfully        │
│    Found 12 vulnerabilities            │
└─────────────────────────────────────────┘
```

### Warning Alert
```
┌─────────────────────────────────────────┐
│ ⚠  API rate limit approaching           │
│    80% of daily quota used             │
└─────────────────────────────────────────┘
```

### Error Alert
```
┌─────────────────────────────────────────┐
│ ✕  Connection failed                    │
│    Unable to reach sandbox RPC         │
│    [Retry] [Settings]                  │
└─────────────────────────────────────────┘
```

---

## Properties

```typescript
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
  actions?: Array<{ label: string; onClick: () => void }>;
  dismissible?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
}
```

---

## Colors

| Type | Background | Border | Icon | Text |
|------|------------|--------|------|------|
| info | var(--info-blue-light) | var(--info-blue) | ℹ️ | var(--text-primary) |
| success | var(--success-green-light) | var(--success-green) | ✓ | var(--text-primary) |
| warning | var(--warning-amber-light) | var(--warning-amber) | ⚠ | var(--text-primary) |
| error | var(--error-red-light) | var(--error-red) | ✕ | var(--text-primary) |

---

## Toast Variant

```typescript
interface ToastProps extends Omit<AlertProps, 'type'> {
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
  onClose?: () => void;
}
```

---

## Usage Examples

```tsx
// Inline alert
<Alert
  type="warning"
  title="Rate Limit Warning"
  description="You've used 80% of your API quota"
/>

// Toast
toast.success('Audit completed!', {
  description: 'Found 12 vulnerabilities'
});

// Dismissible
<Alert
  type="info"
  title="New Feature"
  description="Try the new export functionality"
  dismissible
  onClose={() => hideNotice()}
/>
```
