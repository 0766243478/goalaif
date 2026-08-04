# PoCResultPanel Component

> **File:** `components/PoCResultPanel.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Display exploit execution results with success/failure states.

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  Result                              [📋 Copy]     │
├─────────────────────────────────────────────────────┤
│  Status: ✅ Confirmed                               │
│  Impact: High — Direct ETH theft                    │
│  Vector: Reentrancy via withdraw()                  │
├─────────────────────────────────────────────────────┤
│  Output                                             │
│  ┌──────────────────────────────────────────────┐  │
│  │ > Test passed: testReentrancy()              │  │
│  │ Gas used: 142,567                            │  │
│  │ Transaction: 0xabc...                        │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Money Flow                                         │
│  [Graph visualization]                              │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface PoCResultPanelProps {
  result: PoCResult | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

interface PoCResult {
  confirmed: boolean;
  poc_code: string;
  forge_output: string;
  money_flow?: MoneyFlowData;
  attack_vector?: string;
  target_function?: string;
  estimated_impact?: string;
  gas_used?: number;
  transaction_hash?: string;
}
```

## States

| State | Visual |
|-------|--------|
| Loading | Skeleton shimmer |
| Success | Green checkmark, full details |
| Failure | Red X, error details |
| Error | Error banner, retry button |
| Empty | "No results yet" message |

## Accessibility

- Result status announced via `aria-live`
- Code blocks labeled
- Transaction links have proper anchors

## CSS

```css
.poc-result-panel {
  background: var(--sireen-surface);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.poc-result-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--sireen-border);
}

.poc-result-panel__status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
}

.poc-result-panel__status--success {
  color: var(--sireen-green);
}

.poc-result-panel__status--failure {
  color: var(--sireen-critical);
}

.poc-result-panel__body {
  padding: var(--space-3);
}

.poc-result-panel__output {
  background: var(--sireen-abyss);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--line-height-code);
  max-height: 200px;
  overflow: auto;
}
```

## Anti-Patterns

- ❌ No loading state during generation
- ❌ Silent failures
- ❌ No copy functionality
