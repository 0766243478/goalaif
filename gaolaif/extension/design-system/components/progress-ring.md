# Progress Ring Component

> **Status:** Proposed  
> **Component Count:** 30 of 40+

---

## Definition

A circular progress indicator showing completion percentage. Used for audits, simulations, and any multi-step process with known duration.

---

## Structure

```
      ┌─────────┐
     ╱    75%   ╲
    │  ┌─────┐  │
    │  │◉◉◉│  │
    │  └─────┘  │
     ╲         ╱
      └─────────┘
```

---

## Properties

```typescript
interface ProgressRingProps {
  value: number;        // 0-100
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  trackColor?: string;
  fillColor?: string;
  showLabel?: boolean;
  animated?: boolean;
  children?: React.ReactNode;
}
```

---

## Sizes

| Size | Diameter | Stroke | Font |
|------|----------|--------|------|
| sm | 32px | 2px | 10px |
| md | 48px | 3px | 12px |
| lg | 64px | 4px | 14px |

---

## States

| State | Color | Animation |
|-------|-------|-----------|
| idle | var(--border-subtle) | none |
| indeterminate | var(--accent-blue) | spin |
| loading | var(--accent-blue) | animate |
| complete | var(--success-green) | none |
| error | var(--error-red) | none |

---

## Animation

- **Progress animation**: Smooth stroke-dashoffset transition
- **Indeterminate**: Continuous rotation
- **Completion**: Scale bounce effect

---

## Accessibility

- `role="progressbar"`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-label` for description
- Animated when indeterminate

---

## Usage Examples

```tsx
// Percentage display
<ProgressRing value={75} size="lg" showLabel />

// With custom content
<ProgressRing value={progress}>
  <span>Audit</span>
</ProgressRing>

// Indeterminate
<ProgressRing animated size="md" />
```
