# ThinkingIndicator Component

> **File:** `components/ThinkingIndicator.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Show AI processing steps during streaming responses.

## Anatomy

```
┌─────────────────────────────────────────┐
│  🔄 Thinking...                         │
│  ┌───────────────────────────────────┐  │
│  │  ▶ Analyzing contract structure   │  │
│  │  ✓ Checking known patterns        │  │
│  │  ⏳ Generating exploit code       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Props

```typescript
interface ThinkingIndicatorProps {
  steps: string[];
  currentStep?: number;
  isComplete?: boolean;
  className?: string;
}
```

## States

| State | Visual |
|-------|--------|
| Processing | Spinning icon + active step highlight |
| Complete | Checkmark + all steps shown |
| Error | X icon + error message |

## Animation

- **Spinner:** 1s rotation loop (allowed per animation.md)
- **Step transition:** 0.2s fade (allowed)
- **Bounce:** Only on completed steps (reduced motion support)

## Accessibility

- `role="status"` with `aria-live="polite"`
- Screen reader announces: "AI is thinking: analyzing contract structure"
- Skip link for users who want to wait without watching

## CSS

```css
.thinking-indicator {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--sireen-surface);
  border-radius: var(--radius-md);
}

.thinking-indicator__step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  color: var(--sireen-text-muted);
}

.thinking-indicator__step--active {
  color: var(--sireen-text-primary);
  animation: pulse 1s infinite;
}

.thinking-indicator__step--complete {
  color: var(--sireen-accent-green);
}

.thinking-indicator__spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .thinking-indicator__spinner {
    animation: none;
  }
}
```

## Anti-Patterns

- ❌ No indication of progress during long operations
- ❌ Bouncing animation on every step (motion sickness)
- ❌ Blocking user interaction while thinking

## Examples

```tsx
<ThinkingIndicator
  steps={['Analyzing...', 'Checking patterns...', 'Generating...']}
  currentStep={1}
/>
```
