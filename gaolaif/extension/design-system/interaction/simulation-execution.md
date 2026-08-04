# Simulation Execution Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Users run forge tests against generated exploits using an Ethereum fork RPC. The simulation shows real transaction results.

---

## Flow

```
Configure RPC → Select Exploit → Run Test → Show Output
```

---

## RPC Configuration

```tsx
function SimulationControls({ forkRpc, onRpcChange, onRun, state }: Props) {
  return (
    <div className="simulation-controls">
      <div className="rpc-input-group">
        <label htmlFor="fork-rpc">Fork RPC Endpoint</label>
        <input
          id="fork-rpc"
          type="text"
          value={forkRpc}
          onChange={(e) => onRpcChange(e.target.value)}
          placeholder="https://eth.llamarpc.com"
          aria-describedby="rpc-help"
        />
        <span id="rpc-help" className="help-text">
          Enter your Ethereum RPC endpoint for fork simulation
        </span>
      </div>
      
      <Button 
        variant="primary"
        onClick={onRun}
        disabled={!forkRpc || state === 'running'}
        icon={state === 'running' ? 'loading' : 'play'}
      >
        {state === 'running' ? 'Running...' : 'Run Simulation'}
      </Button>
    </div>
  );
}
```

---

## Test Execution States

| State | Visual | Controls |
|-------|--------|----------|
| Idle | Static form | Run button enabled |
| Running | Spinner overlay | Button disabled |
| Success | Green checkmark | Retry button |
| Failure | Red X + output | Retry button |
| Timeout | Clock icon | Retry button |

---

## Output Display

```tsx
function SimulationOutput({ logs, errors }: Props) {
  return (
    <div className="simulation-output" role="log" aria-live="polite">
      {logs.map((log, i) => (
        <div 
          key={i} 
          className={`log-entry ${log.type}`}
        >
          <i className={`codicon codicon-${log.type === 'success' ? 'pass' : log.type === 'error' ? 'error' : 'warning'}`}></i>
          <pre>{log.message}</pre>
        </div>
      ))}
      {errors.length > 0 && (
        <div className="errors">
          <h4>Errors</h4>
          <pre>{errors.join('\n')}</pre>
        </div>
      )}
    </div>
  );
}
```

---

## Timeout Handling

```typescript
const TIMEOUT_MS = 60000; // 60 seconds

async function runSimulation(exploit: Exploit, rpc: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const result = await forgeTest(exploit.code, rpc, {
      signal: controller.signal,
    });
    return { success: true, output: result };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Timeout', output: null };
    }
    return { success: false, error: error.message, output: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## Accessibility

- **Live Region:** Announce test completion and results
- **Error Messages:** Clear and actionable
- **Timeout Warning:** Inform users of time limit
