# Segmented Control Component

> **Status:** Proposed  
> **Component Count:** 37 of 40+

---

## Definition

A set of two or more buttons grouped together where only one can be selected at a time. Used for mutually exclusive options.

---

## Structure

```
┌─────────────────────────────────────────┐
│  [◉ All]  [○ Patterns]  [○ Contracts]  │
└─────────────────────────────────────────┘
```

---

## Properties

```typescript
interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}
```

---

## Sizes

| Size | Height | Font | Padding |
|------|--------|------|---------|
| sm | 24px | 11px | 8px 12px |
| md | 28px | 12px | 10px 16px |
| lg | 32px | 13px | 12px 20px |

---

## Variants

| Variant | Style | Use Case |
|---------|-------|----------|
| filled | Pill background | Primary selection |
| bordered | Outline style | Secondary options |
| plain | Text only | Minimal context |

---

## Accessibility

- `role="radiogroup"`
- `role="radio"` on each segment
- Arrow keys navigate
- Enter/Space selects

---

## Usage Examples

```tsx
<SegmentedControl
  options={[
    { value: 'all', label: 'All' },
    { value: 'patterns', label: 'Patterns' },
    { value: 'contracts', label: 'Contracts' }
  ]}
  value={activeTab}
  onChange={setActiveTab}
/>
```
