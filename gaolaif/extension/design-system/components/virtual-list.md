# VirtualList Component

> **File:** `components/VirtualList.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Efficiently render large lists by only rendering visible items.

## Anatomy

```
┌─────────────────────────────────────────┐
│  [Viewport: 400px visible]              │
│  ┌───────────────────────────────────┐  │
│  │ Item 1 (rendered)                 │  │
│  │ Item 2 (rendered)                 │  │
│  │ Item 3 (rendered)                 │  │
│  └───────────────────────────────────┘  │
│  [Spacer: 4600px]                       │
└─────────────────────────────────────────┘
  Total height: 5000px (50 items × 100px)
```

## Props

```typescript
interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Extra items to render outside viewport
  className?: string;
  style?: React.CSSProperties;
}
```

## Implementation Options

### Option 1: react-window (Recommended)
```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <FindingCard finding={items[index]} />
    </div>
  )}
</FixedSizeList>
```

### Option 2: Custom Implementation
- Manual scroll calculation
- IntersectionObserver for visibility
- Better for simple use cases

## Threshold

- **Use VirtualList when:** >50 items
- **Below threshold:** Standard map/render (faster for small lists)
- **Dynamic threshold:** Can be configured per list type

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Render time (100 items) | <16ms |
| Memory usage | ~50 items in DOM |
| Scroll smoothness | 60fps |
| Resize handling | Debounced 100ms |

## Accessibility

- `role="list"` on container
- `role="listitem"` on each item
- Keyboard navigation with arrow keys
- Focus management when scrolling

## Anti-Patterns

- ❌ Using VirtualList for <20 items (overhead > benefit)
- ❌ Variable item heights without `VariableSizeList`
- ❌ No key prop causing re-renders
- ❌ Ignoring overscan causing white flash

## Examples

```tsx
<VirtualList
  items={filteredFindings}
  height={400}
  itemHeight={120}
  keyExtractor={(item) => item.id}
  renderItem={(item) => (
    <FindingCard finding={item} />
  )}
  overscan={5}
/>
```
