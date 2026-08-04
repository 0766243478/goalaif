# Drawer Component

> **Status:** Proposed  
> **Component Count:** 27 of 40+

---

## Definition

A panel that slides in from the edge of the screen, overlaying content. Used for secondary workflows that don't require leaving the current view.

---

## Structure

```
┌─────────────────────────────────────────────────┐
│  Main Content Here                     [▶]      │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Main Content (dimmed)          │  Drawer Title │
│                                 │               │
│                                 │  ───────────  │
│                                 │  Panel content│
│                                 │  goes here... │
│                                 │               │
│                                 │  [Close]      │
└─────────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  title?: string;
  closable?: boolean;
  children: React.ReactNode;
}
```

---

## Placements

| Placement | Width/Height | Use Case |
|-----------|--------------|----------|
| left | 320-480px | Sidebar replacement, filters |
| right | 400-600px | Details panel, settings |
| top | 200-400px | Quick actions, search |
| bottom | 300-500px | Mobile sheets, mobile nav |
| full | Full screen | Complex workflows |

---

## Sizes

| Size | Dimensions |
|------|------------|
| sm | 280px wide |
| md | 400px wide |
| lg | 560px wide |
| xl | 720px wide |
| full | 100% width/height |

---

## Backdrop

- Semi-transparent overlay behind drawer
- Click closes drawer
- Can be disabled for non-modal drawers

---

## Animation

| Property | Duration | Easing |
|----------|----------|--------|
| Slide in | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Slide out | 150ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Fade backdrop | 200ms | ease |

---

## Accessibility

- Focus trapped inside drawer
- Escape closes (unless preventing)
- `role="complementary"` or `role="dialog"`
- Screen reader announcement on open

---

## Usage Examples

```tsx
<Drawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  placement="right"
  size="md"
  title="Finding Details"
>
  <FindingDetail finding={selectedFinding} />
</Drawer>
```
