# Modal Component

> **Status:** Proposed  
> **Component Count:** 26 of 40+

---

## Definition

An overlay dialog that demands attention and blocks interaction with the main content until dismissed. Used for critical actions, confirmations, and focused tasks.

---

## Structure

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ⚠ Confirm Export                        │   │
│  │                                         │   │
│  │  This will generate a report with all   │   │
│  │  findings including code snippets.      │   │
│  │                                         │   │
│  │  Format:                                 │   │
│  │  ○ PDF    ● Markdown    ○ JSON          │   │
│  │                                         │   │
│  │  Scope: Critical and above              │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│              [Cancel]  [Export]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
  children: React.ReactNode;
}
```

---

## Sizes

| Size | Max Width | Use Case |
|------|-----------|----------|
| sm | 400px | Alerts, simple confirmations |
| md | 560px | Forms, dialogs |
| lg | 720px | Complex forms, editors |
| xl | 960px | Full-screen tasks |

---

## Variants

| Variant | Header | Footer | Close Button |
|---------|--------|--------|--------------|
| default | Title + icon | Actions | X in corner |
| alert | Warning icon | Confirm only | Hidden |
| form | Title | Submit + Cancel | X in corner |
| fullscreen | Custom | Custom | X in corner |

---

## Behaviors

- **Focus trap**: Keyboard stays within modal
- **Escape closes**: Unless confirmation required
- **Click outside**: Closes (configurable)
- **Body scroll lock**: Prevent background scroll

---

## Accessibility

- `role="dialog"` with `aria-modal="true"`
- `aria-labelledby` points to title
- `aria-describedby` for description
- Focus returns to trigger on close
- Screen reader announcement

---

## Usage Examples

```tsx
<Modal
  title="Confirm Delete"
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  confirmLabel="Delete"
>
  <p>Are you sure you want to delete this memory?</p>
</Modal>
```
