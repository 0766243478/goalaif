# MemoryCard Component

> **File:** `components/MemoryPanel.tsx` (partial)  
> **Status:** ⚠️ Partial implementation  
> **Design Spec:** Formalized specification for future refactor

---

## Purpose

Display saved memory/tactical notes in a card format.

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  💡 Reentrancy Pattern                              │
│                                                     │
│  Check-effects-interactions pattern to prevent     │
│  reentrant calls...                                │
│                                                     │
│  #reentrancy #pattern #solidity                     │
│  Saved: 2026-08-01                                 │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface MemoryCardProps {
  memory: MemoryEntry;
  onDelete?: (id: string) => void;
  onEdit?: (memory: MemoryEntry) => void;
  compact?: boolean;
}

interface MemoryEntry {
  id: string;
  text: string;
  idea?: string;
  suggestion?: string;
  score?: number;
  type?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
```

## States

| State | Visual |
|-------|--------|
| Default | Card with content |
| Hover | Elevated shadow |
| Selected | Border accent |
| Deleted | Fade out animation |

## Accessibility

- Card is focusable
- Delete/edit buttons have aria-labels
- Live region on delete

## CSS

```css
.memory-card {
  background: var(--sireen-surface);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  transition: all var(--duration-fast) ease;
}

.memory-card:hover {
  border-color: var(--sireen-border-focus);
  box-shadow: var(--elevation-1);
}

.memory-card--selected {
  border-color: var(--sireen-info);
  background: var(--sireen-hover);
}

.memory-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.memory-card__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--sireen-text-primary);
}

.memory-card__content {
  font-size: var(--text-sm);
  color: var(--sireen-text-secondary);
  line-height: var(--line-height-body);
  margin-bottom: var(--space-2);
}

.memory-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.memory-card__tag {
  font-size: var(--text-xs);
  padding: 1px 6px;
  background: var(--sireen-raised);
  border-radius: var(--radius-sm);
  color: var(--sireen-text-muted);
}
```

## Anti-Patterns

- ❌ No tags for organization
- ❌ Missing timestamps
- ❌ No deletion confirmation
