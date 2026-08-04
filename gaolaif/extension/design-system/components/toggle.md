# Toggle Component

> **Status:** Proposed  
> **Component Count:** 36 of 40+

---

## Definition

A binary switch control for toggling between two states. Used for settings, preferences, and option switches.

---

## Structure

```
OFF  ◐───◉───◑  ON
      ┃   ┃
     [■] [■]
```

---

## Properties

```typescript
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}
```

---

## Sizes

| Size | Width | Height | Thumb |
|------|-------|--------|-------|
| sm | 32px | 16px | 12px |
| md | 40px | 20px | 16px |
| lg | 48px | 24px | 20px |

---

## States

| State | Background | Thumb |
|-------|------------|-------|
| off | var(--border-subtle) | var(--surface) |
| on | var(--accent-blue) | var(--surface) |
| disabled-off | var(--surface-hover) | var(--text-muted) |
| disabled-on | var(--accent-blue-disabled) | var(--surface) |

---

## Accessibility

- `role="switch"`
- `aria-checked` reflects state
- Keyboard: Space toggles
- Focus ring visible

---

## Usage Examples

```tsx
<Toggle
  checked={darkMode}
  onChange={setDarkMode}
  label="Dark Mode"
/>

<Toggle
  checked={notifications}
  onChange={setNotifications}
  size="md"
  ariaLabel="Enable notifications"
/>
```
