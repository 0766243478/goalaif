# ProgressBar Component

> **File:** `components/AuditProgressBar.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Show progress of multi-stage audit pipeline (planning → research → auditing → done).

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  [▶] Planning ██████████░░░░░░░░░░  40%           │
│      Research ░░░░░░░░░░░░░░░░░░░░  pending        │
│      Auditing ░░░░░░░░░░░░░░░░░░░░  queued         │
│      Done     ░░░░░░░░░░░░░░░░░░░░  queued         │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface AuditProgressBarProps {
  stage: PipelineStage;
  progress?: number; // 0-100
  stages?: PipelineStage[];
  compact?: boolean; // Single-line mode
}
```

## Stages

| Stage | Icon | Color | Description |
|-------|------|-------|-------------|
| idle | ⏸ | `--sireen-text-muted` | Not started |
| planning | 📋 | `--sireen-accent-cyan` | Analyzing structure |
| researching | 🔍 | `--sireen-accent-purple` | Pattern matching |
| auditing | 🛡️ | `--sireen-accent-amber` | Finding vulnerabilities |
| done | ✓ | `--sireen-accent-green` | Complete |

## Variants

### Full Mode (Default)
- Shows all stages vertically
- Current stage highlighted with animation
- Progress bar per stage

### Compact Mode
- Single horizontal bar
- Stage name + percentage
- Used in header/toolbars

## States

| State | Visual |
|-------|--------|
| Idle | Dashed outline, gray |
| Running | Solid bar, animated gradient |
| Paused | Stopped animation, amber tint |
| Complete | Green fill, checkmark |
| Error | Red tint, X icon |

## Accessibility

- `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Stage labels announced by screen readers
- `aria-live="polite"` for progress updates

## CSS

```css
.audit-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.audit-progress__stage {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
}

.audit-progress__bar {
  height: 4px;
  background: var(--sireen-raised);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.audit-progress__fill {
  height: 100%;
  background: var(--sireen-accent-cyan);
  transition: width var(--duration-normal) ease;
}

.audit-progress__fill--active {
  background: linear-gradient(
    90deg,
    var(--sireen-accent-cyan),
    var(--sireen-accent-purple)
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}
```

## Anti-Patterns

- ❌ Hardcoded colors for stages
- ❌ No progress feedback during long operations
- ❌ Blocking UI while audit runs

## Examples

```tsx
<AuditProgressBar 
  stage="auditing" 
  progress={65}
  compact={false}
/>

<AuditProgressBar 
  stage="done" 
  progress={100}
  compact={true}
/>
```
