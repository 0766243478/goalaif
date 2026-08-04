# Terminal Component

> **Status:** Proposed  
> **Component Count:** 20 of 40+

---

## Definition

A monospace output panel displaying command-line results, forge test output, or system logs. Supports scrolling, copying, and clearing.

---

## Structure

```
┌─────────────────────────────────────────────────┐
│  Terminal                              [🗑 Clear]│
├─────────────────────────────────────────────────┤
│  > forge test --match-test testExploit          │
│  Running 1 test for test/ReentrancyPoC.t.sol... │
│                                                 │
│  TestResult:                                    │
│  ✓ testExploit() — 12.3s, Gas: 142,567         │
│                                                 │
│  Test Suites: 1 passed, 1 total                │
│  Tests: 1 passed, 1 total                      │
│  Time: 14.2s                                   │
└─────────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface TerminalProps {
  lines?: string[];
  title?: string;
  maxHeight?: number;
  autoScroll?: boolean;
  showPrompt?: boolean;
  onClear?: () => void;
  children?: React.ReactNode;
}
```

---

## Line Types

| Type | Prefix | Color | Use Case |
|------|--------|-------|----------|
| command | `>` | var(--text-primary) | User input |
| success | `✓` | var(--success-green) | Passed tests |
| error | `✕` | var(--error-red) | Failed tests |
| warning | `⚠` | var(--warning-amber) | Warnings |
| info | `•` | var(--text-muted) | Status messages |
| system | `$` | var(--text-muted) | Shell commands |

---

## Behaviors

- **Auto-scroll**: Follows new content if user at bottom
- **Scroll lock**: Option to stop auto-scroll during review
- **Line wrap**: Optional wrapping for long lines
- **Copy all**: Button to copy entire output
- **Timestamps**: Optional timestamp prefix

---

## Accessibility

- `role="log"` for live regions
- `aria-live="polite"` for streaming output
- Keyboard navigation through lines
- Focus trap within terminal

---

## Usage Examples

```tsx
// Static output
<Terminal title="Forge Output">
  {forgeOutputLines}
</Terminal>

// Streaming output
<Terminal autoScroll title="Simulation Log">
  {logStream.map((line, i) => (
    <TerminalLine key={i} type={line.type}>
      {line.content}
    </TerminalLine>
  ))}
</Terminal>
```

---

## Design Tokens

```css
--terminal-bg: var(--surface-elevated);
--terminal-fg: var(--text-primary);
--terminal-font-family: var(--font-mono);
--terminal-font-size: 12px;
--terminal-padding: 12px;
--terminal-line-height: 1.6;
--terminal-border: 1px solid var(--border-subtle);
```
