# FindingCard Component

> **File:** `components/FindingCard.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Display individual vulnerability finding with severity, title, and metadata.

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  ┌────┐                                            │
│  │ 🔴 │  Reentrancy in withdraw()                  │
│  │CRIT│  Line 45 • VulnerableVault.sol             │
│  └────┘  A attacker can repeatedly call...         │
│                                           [▶] [📋] │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface FindingCardProps {
  finding: Finding;
  selected?: boolean;
  onSelect?: (finding: Finding) => void;
  onGeneratePoC?: (finding: Finding) => void;
  onCopy?: (text: string) => void;
  className?: string;
}

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  line_number?: number;
  affected_functions?: string[];
  contract_name?: string;
  category?: string;
}
```

## States

| State | Visual |
|-------|--------|
| Default | Border-left accent by severity |
| Hover | Background shift to `--sireen-raised` |
| Selected | Stronger border, different background |
| Focus | Outline ring per accessibility.md |

## Severity Colors

```css
.finding-card--critical { border-left: 3px solid var(--sireen-critical); }
.finding-card--high     { border-left: 3px solid var(--sireen-high); }
.finding-card--medium   { border-left: 3px solid var(--sireen-medium); }
.finding-card--low      { border-left: 3px solid var(--sireen-low); }
```

## Accessibility

- `role="button"` if clickable
- `aria-pressed` for selected state
- `aria-label` with severity and title
- Keyboard: Enter to select, Escape to deselect

## CSS

```css
.finding-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--sireen-surface);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-md);
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
}

.finding-card:hover {
  background: var(--sireen-raised);
  border-color: var(--sireen-border-focus);
}

.finding-card--selected {
  background: var(--sireen-hover);
  border-color: var(--sireen-info);
}

.finding-card--focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: -2px;
}

.finding-card__severity {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 700;
}

.finding-card__content {
  flex: 1;
  min-width: 0;
}

.finding-card__title {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--sireen-text-primary);
  margin-bottom: var(--space-1);
}

.finding-card__meta {
  font-size: var(--text-xs);
  color: var(--sireen-text-muted);
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.finding-card__actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--duration-fast) ease;
}

.finding-card:hover .finding-card__actions {
  opacity: 1;
}
```

## Anti-Patterns

- ❌ No visual distinction between severities
- ❌ Truncated descriptions without expand
- ❌ Actions always visible (visual noise)

## Examples

```tsx
<FindingCard
  finding={finding}
  selected={selectedId === finding.id}
  onSelect={setSelectedId}
  onGeneratePoC={generatePoC}
/>
```
