# EmptyState Component

> **File:** `components/EmptyState.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Display contextual empty states when no content is available.

## Anatomy

```
┌─────────────────────────────────────────┐
│                                         │
│            [Icon: 48px]                 │
│                                         │
│       Title: "No findings"              │
│                                         │
│   Description: "Run an audit to         │
│                discover vulnerabilities" │
│                                         │
│         [Action Button]                 │
│                                         │
└─────────────────────────────────────────┘
```

## Props

```typescript
interface EmptyStateProps {
  icon?: 'search' | 'shield' | 'file' | 'warning' | 'check' | 'generic';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: EmptyStateProps['action'];
  className?: string;
  style?: React.CSSProperties;
}
```

## Icon Mapping

| Icon Key | Codicon Name | Size | Color |
|----------|--------------|------|-------|
| search | `search` | 48px | `--sireen-text-muted` |
| shield | `shield` | 48px | `--sireen-accent-amber` |
| file | `file` | 48px | `--sireen-text-secondary` |
| warning | `warning` | 48px | `--sireen-accent-amber` |
| check | `check` | 48px | `--sireen-accent-green` |
| generic | `question` | 48px | `--sireen-text-muted` |

## Variants

### Default
- Centered layout
- Icon + title + description + optional action

### Minimal
- Title + description only
- No icon
- Used in dense layouts

### Illustration
- Custom SVG illustration
- Larger icon area
- Used for onboarding states

## States

| State | Content |
|-------|---------|
| No findings | Search icon, "No findings" title |
| No exploits | Shield icon, "Generate your first exploit" |
| No memories | File icon, "Save your first note" |
| No simulation output | Warning icon, "Start sandbox to see results" |

## Accessibility

- `role="status"` for page-level empties
- `aria-label` describes the empty state
- Action button has proper focus styles

## CSS

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
  min-height: 200px;
}

.empty-state__icon {
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-3);
  color: var(--sireen-text-muted);
}

.empty-state__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--sireen-text-primary);
  margin-bottom: var(--space-2);
}

.empty-state__description {
  font-size: var(--text-sm);
  color: var(--sireen-text-secondary);
  max-width: 300px;
  line-height: var(--line-height-body);
}

.empty-state__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
```

## Anti-Patterns

- ❌ Marketing copy ("Get started with SIREEN!")
- ❌ Generic icons without context
- ❌ No actionable next step
- ❌ Empty space >400px tall without content

## Examples

```tsx
<EmptyState
  icon="search"
  title="No findings"
  description="Run an audit to discover vulnerabilities"
  action={{
    label: "Start Audit",
    onClick: startAudit,
    variant: "primary"
  }}
/>

<EmptyState
  icon="shield"
  title="No exploits generated"
  description="Select a finding to generate a proof-of-concept"
/>
```
