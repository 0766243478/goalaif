# Tooltip Component

> **Status:** Proposed  
> **Component Count:** 25 of 40+

---

## Definition

A small popup that displays descriptive text when hovering over or focusing an element. Provides context without cluttering the interface.

---

## Structure

```
    ┌─────────────────┐
    │ Copy to clipboard│
    └────────┬────────┘
             ▼
    ┌──────┐
    │ 📋   │
    └──────┘
```

---

## Properties

```typescript
interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  children: React.ReactNode;
}
```

---

## Placement Rules

| Element Position | Preferred Tooltip Position |
|-----------------|---------------------------|
| Top of screen | Bottom |
| Bottom of screen | Top |
| Left edge | Right |
| Right edge | Left |
| Center | Top (default) |

---

## States

| State | Display | Timing |
|-------|---------|--------|
| hidden | Not visible | Default |
| pending | None | Delay period |
| visible | Shown with content | After delay |
| closing | Fading out | On mouse leave |

---

## Design Tokens

```css
--tooltip-bg: var(--surface-elevated);
--tooltip-fg: var(--text-primary);
--tooltip-radius: 6px;
--tooltip-padding: 6px 10px;
--tooltip-font-size: 11px;
--tooltip-shadow: var(--shadow-sm);
--tooltip-delay: 500ms;
--tooltip-transition: 150ms ease;
```

---

## Accessibility

- `aria-describedby` linking to tooltip content
- Triggers on focus, not just hover
- Screen reader announces content
- Does not steal focus

---

## Usage Examples

```tsx
<Tooltip content="Generate proof of concept exploit" position="top">
  <IconButton icon={<BugIcon />} ariaLabel="Generate PoC" />
</Tooltip>

<Tooltip content="View full details" position="right" delay={200}>
  <ActionButton label="Details" />
</Tooltip>
```
