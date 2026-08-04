# SimulationLayout Component

> **Date:** 2026-08-02  
> **Type:** View Layout  
> **Status:** Ready for Implementation

---

## Overview

SimulationLayout provides controls for running smart contract simulations in a sandbox environment.

---

## Structure

```tsx
interface SimulationLayoutProps {
  forkRpc?: string;
  onRpcChange: (rpc: string) => void;
  onRunSimulation: () => void;
  simulationState: SimulationState;
  logEntries: SimulationLogEntry[];
}
```

```tsx
<div class="simulation-layout">
  <SimulationControls 
    forkRpc={forkRpc}
    onRpcChange={handleRpcChange}
    onRun={handleRun}
    state={simulationState}
  />
  <SimulationLog logEntries={logEntries} />
</div>
```

---

## CSS

```css
.simulation-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.simulation-controls {
  padding: var(--space-2);
  border-bottom: 1px solid var(--vscode-sideBar-border);
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.simulation-log {
  flex: 1;
  overflow-y: auto;
  background-color: var(--vscode-terminal-background);
  color: var(--vscode-terminal-foreground);
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  padding: var(--space-2);
}

.log-entry {
  padding: 2px 0;
  border-bottom: 1px solid rgba(128,128,128,0.1);
}

.log-entry.success {
  color: var(--sireen-green);
}

.log-entry.error {
  color: var(--vscode-errorForeground);
}

.log-entry.warning {
  color: var(--vscode-warningForeground);
}
```

---

## States

| State | Visual | Controls |
|-------|--------|----------|
| Idle | Static | Run button enabled |
| Running | Spinner overlay | Run button disabled |
| Success | Green checkmark | Results visible |
| Error | Red X + error message | Retry button enabled |

---

## Accessibility

- **RPC Input:** Label with `aria-describedby` for help text
- **Status Indicators:** Use text labels alongside visual indicators
- **Log Output:** Mark as live region for screen readers
