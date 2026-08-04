# SearchInput Component

> **File:** `components/SearchInput.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Searchable input with icon and clear button for filtering lists.

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  🔍 Filter findings...                      [×]    │
└─────────────────────────────────────────────────────┘
```

When focused:
```
┌─────────────────────────────────────────────────────┐
│  🔍 filter                         [×]             │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  clearable?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
```

## Features

- Debounced search (default 300ms)
- Clear button when value exists
- Keyboard shortcut `Ctrl+F` to focus
- Escape to clear

## Accessibility

- `aria-label` or visible label required
- Clear button has `aria-label="Clear search"`
- Search results count announced

## CSS

```css
.search-input {
  position: relative;
  width: 100%;
}

.search-input__icon {
  position: absolute;
  left: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  color: var(--sireen-text-muted);
  pointer-events: none;
}

.search-input__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-left: 36px;
  background: var(--sireen-abyss);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-md);
  color: var(--sireen-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  outline: none;
  transition: border-color var(--duration-fast) ease;
}

.search-input__input:focus {
  border-color: var(--sireen-info);
  box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
}

.search-input__clear {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--sireen-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input__clear:hover {
  background: var(--sireen-raised);
  color: var(--sireen-text-primary);
}
```

## Anti-Patterns

- ❌ No debounce (performance)
- ❌ Missing clear functionality
- ❌ No keyboard shortcuts

## Examples

```tsx
<SearchInput
  placeholder="Filter findings..."
  debounceMs={300}
  onSearch={(value) => setFilter(value)}
/>
```
