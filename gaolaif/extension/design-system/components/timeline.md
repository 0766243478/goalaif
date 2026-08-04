# Timeline Component

> **Status:** Proposed  
> **Component Count:** 34 of 40+

---

## Definition

A vertical timeline displaying events chronologically. Used for audit history, activity feeds, and process tracking.

---

## Structure

```
         ● Event 1: Audit started
         │
    ─────┼────
         │
         ● Event 2: Planning complete
         │
    ─────┼────
         │
         ● Event 3: 3 critical findings
         │
    ─────┼────
         │
         ● Event 4: Report generated
```

---

## Properties

```typescript
interface TimelineProps {
  events: TimelineEvent[];
  variant?: 'default' | 'compact' | 'alternate';
  onClick?: (event: TimelineEvent) => void;
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'pending' | 'active' | 'completed' | 'error';
  metadata?: Record<string, any>;
}
```

---

## Variants

### Default
```
● Event ───────────────────
│
● Event ───────────────────
│
● Event ───────────────────
```

### Compact
```
● Event
● Event
● Event
```

### Alternate
```
      ● Event ────────────
      │
─── ● Event
      │
      ● Event ────────────
```

---

## Status Colors

| Status | Color | Icon |
|--------|-------|------|
| pending | var(--text-muted) | ◌ |
| active | var(--accent-blue) | ● |
| completed | var(--success-green) | ✓ |
| error | var(--error-red) | ✕ |

---

## Usage Examples

```tsx
<Timeline
  events={auditEvents}
  variant="default"
  onClick={(event) => showEventDetails(event)}
/>
```
