# Split Button Component

> **Status:** Proposed  
> **Component Count:** 19 of 40+

---

## Definition

A button组合 that provides a primary action and a dropdown menu of related actions. Combines convenience of single click with flexibility of menu access.

---

## Structure

```
┌─────────────────────┬─────┐
│  Primary Action     │  ▼  │
└─────────────────────┴─────┘
         ↓ Click ▼
┌─────────────────────┐
│  Related Action 1   │
│  Related Action 2   │
│  ─────────────────  │
│  Related Action 3   │
└─────────────────────┘
```

---

## Properties

```typescript
interface SplitButtonProps {
  primaryAction: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  menuItems: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    divider?: boolean;
    disabled?: boolean;
  }>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}
```

---

## States

| State | Primary Button | Dropdown Arrow | Menu |
|-------|---------------|----------------|------|
| default | Normal | Normal | Hidden |
| hover | Elevated | Elevated | — |
| open | Elevated | Rotated 180° | Visible |
| disabled | Dimmed | Dimmed | N/A |

---

## Variants

| Variant | Primary Style | Menu Style |
|---------|--------------|------------|
| primary | Accent fill | Default |
| secondary | Outline | Default |
| ghost | Text only | Default |

---

## Usage Guidelines

**Use when:**
- Primary action is common
- Related actions exist but are less frequent
- Space is limited but multiple actions needed

**Avoid when:**
- All actions equally important (use button group)
- Menu has >5 items (use separate button + dropdown)

---

## Accessibility

- Primary button: Enter/Space triggers action
- Dropdown: Arrow down opens, Escape closes
- Menu items: Arrow keys navigate
- Role: buttongroup with buttons

---

## Examples

```tsx
<SplitButton
  primaryAction={{
    label: 'Export',
    icon: <ExportIcon />,
    onClick: handleExport
  }}
  menuItems={[
    { label: 'Export as PDF', onClick: handlePdf },
    { label: 'Export as JSON', onClick: handleJson },
    { divider: true },
    { label: 'Save Report', onClick: handleSave }
  ]}
/>
```
