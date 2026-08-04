# Tabs Component

> **Status:** Proposed  
> **Component Count:** 28 of 40+

---

## Definition

A navigation component that organizes content into switchable panels. Users select tabs to view different sections without leaving the page.

---

## Structure

```
┌─────────────────────────────────────────────────┐
│  [All]  [Patterns]  [Contracts]  [Custom]      │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Content for selected tab appears below        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'segmented' | 'underline' | 'boxed';
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
  children?: React.ReactNode;
}

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  content?: React.ReactNode;
}
```

---

## Variants

| Variant | Style | Use Case |
|---------|-------|----------|
| segmented | Pill-shaped group | Small sets, equal weight |
| underline | Underlined active | Standard navigation |
| boxed | Card-style container | Complex content areas |

---

## Sizes

| Size | Height | Font Size | Padding |
|------|--------|-----------|---------|
| sm | 28px | 11px | 4px 12px |
| md | 32px | 12px | 6px 16px |
| lg | 40px | 13px | 8px 20px |

---

## States

| State | Appearance |
|-------|------------|
| inactive | Muted text, no underline |
| active | Primary text, accent underline |
| hover | Elevated background |
| disabled | Dimmed, no interaction |

---

## Accessibility

- `role="tablist"` on container
- `role="tab"` on each tab
- `role="tabpanel"` on content
- Arrow keys navigate tabs
- Enter/Space activates tab

---

## Usage Examples

```tsx
<Tabs
  tabs={[
    { id: 'all', label: 'All', badge: 47 },
    { id: 'patterns', label: 'Patterns', badge: 12 },
    { id: 'contracts', label: 'Contracts', badge: 8 },
    { id: 'custom', label: 'Custom' }
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```
