# Divider Component

> **Status:** Proposed  
> **Component Count:** 39 of 40+

---

## Definition

A thin visual line separating content groups or sections. Provides visual breathing room and logical grouping.

---

## Types

### Horizontal Divider
```
Content A
──────────────────────────────────────
Content B
```

### Vertical Divider
```
Content A │ Content B
```

### Inset Divider
```
─────────── Content Label ───────────
```

---

## Properties

```typescript
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  inset?: boolean;
  label?: string;
  thickness?: number;
  color?: string;
  margin?: string;
}
```

---

## Variants

| Variant | Style | Use Case |
|---------|-------|----------|
| solid | Continuous line | Standard separation |
| dashed | Dashed line | Secondary separation |
| dotted | Dotted line | Minimal separation |

---

## Thickness

| Thickness | Use Case |
|-----------|----------|
| 1px | Subtle separation |
| 2px | Section breaks |
| 3px | Major divisions |

---

## Spacing

```css
--divider-margin-vertical: 16px;
--divider-margin-horizontal: 24px;
--divider-color: var(--border-subtle);
```

---

## Usage Examples

```tsx
// Horizontal
<Divider />

// With label
<Divider label="Or continue with" />

// Vertical separator
<View>
  <Text>Left</Text>
  <Divider orientation="vertical" />
  <Text>Right</Text>
</View>
```
