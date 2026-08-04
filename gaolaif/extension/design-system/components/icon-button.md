# Icon Button Component

> **Status:** Proposed  
> **Component Count:** 18 of 40+

---

## Definition

A compact button displaying only an icon, used in toolbars, headers, and action groups where space is limited.

---

## Specifications

### Sizes

| Size | Width | Height | Icon | Label (optional) |
|------|-------|--------|------|------------------|
| sm | 28px | 28px | 14px | — |
| md | 32px | 32px | 16px | — |
| lg | 36px | 36px | 18px | — |

### Variants

- **default** — Neutral background, appears in groups
- **primary** — Accent color background for main actions
- **ghost** — Transparent, border on hover
- **icon-only** — Square with icon centered

---

## Properties

```typescript
interface IconButtonProps {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'ghost';
  tooltip?: string;
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}
```

---

## States

| State | Background | Border | Opacity | Shadow |
|-------|------------|--------|---------|--------|
| default | transparent | none | 1.0 | none |
| hover | var(--surface-hover) | none | 1.0 | none |
| active | var(--surface-active) | none | 1.0 | none |
| disabled | transparent | none | 0.4 | none |

---

## Usage Guidelines

**Use when:**
- Space is constrained
- Action is purely visual/iconographic
- Part of a button group
- Common action (copy, edit, delete)

**Avoid when:**
- Action requires explanation
- User may not understand the icon
- Primary call-to-action (use labeled button)

---

## Accessibility

- `aria-label` required (no visible label)
- Tooltip on hover/focus for context
- Keyboard accessible (Enter/Space)
- Focus ring: 2px solid var(--accent-blue)

---

## Examples

```tsx
// Copy button
<IconButton 
  icon={<CopyIcon />} 
  size="sm"
  tooltip="Copy code"
  ariaLabel="Copy"
  onClick={handleCopy}
/>

// Settings
<IconButton 
  icon={<SettingsIcon />} 
  size="md"
  variant="ghost"
  ariaLabel="Settings"
/>
```

---

## Design Tokens

```css
--button-icon-size-sm: 14px;
--button-icon-size-md: 16px;
--button-icon-size-lg: 18px;

--button-icon-bg-default: transparent;
--button-icon-bg-hover: var(--surface-hover);
--button-icon-radius: 6px;
```
