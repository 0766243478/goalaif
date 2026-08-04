# Skeleton Component

> **Status:** Proposed  
> **Component Count:** 33 of 40+

---

## Definition

A placeholder loading state showing the outline of content before it loads. Provides visual feedback during async operations.

---

## Types

### Text Skeleton
```
━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━
```

### Avatar Skeleton
```
⬤⬤⬤⬤⬤
```

### Card Skeleton
```
┌────────────────────────┐
│ ⬤      Title           │
│ ━━━━━━━━━━━━━━━        │
│ ━━━━━━━                │
│ ━━━━━━━━━━━━━━━━━━━━━  │
│                        │
│      [Button]          │
└────────────────────────┘
```

### List Skeleton
```
┌────────────────────────┐
│ ⬤  Item 1              │
├────────────────────────┤
│ ⬤  Item 2              │
├────────────────────────┤
│ ⬤  Item 3              │
└────────────────────────┘
```

---

## Properties

```typescript
interface SkeletonProps {
  type?: 'text' | 'circle' | 'rect' | 'card' | 'list';
  width?: string | number;
  height?: string | number;
  rows?: number;
  animation?: 'pulse' | 'wave' | 'none';
}
```

---

## Animations

| Animation | Effect | Use Case |
|-----------|--------|----------|
| pulse | Opacity fade | Simple loading |
| wave | Gradient sweep | Content preview |
| none | Static | Print/screenshot |

---

## Usage Examples

```tsx
// Text lines
<Skeleton type="text" width="100%" rows={3} animation="wave" />

// Card
<Skeleton type="card" />

// Avatar
<Skeleton type="circle" width={40} height={40} />

// List
<Skeleton type="list" rows={5} />
```

---

## When to Use

- Before data loads
- During API calls
- While parsing contracts
- During AI processing
