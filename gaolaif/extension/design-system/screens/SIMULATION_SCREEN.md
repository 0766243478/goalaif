# Simulation Screen Specification

> **File:** `views/SimulationView.tsx`  
> **Purpose:** Sandbox environment for executing PoC exploits against forked chains

---

## Purpose

Provide a safe, isolated environment to test exploit code against a forked blockchain without risking real assets.

## Primary User

Security researchers validating vulnerability exploits before report submission.

## User Goals

1. Configure sandbox with correct RPC endpoint
2. Deploy exploit contract in isolated environment
3. Execute test and observe results
4. Analyze transaction logs and state changes
5. Export results for reporting

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Simulation                                         │
│  Run exploits in a sandboxed environment            │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │  Sandbox Status        [🟢 READY]            │  │
│  ├──────────────────────────────────────────────┤  │
│  │  [Start Sandbox]                             │  │
│  │  Fork RPC URL: [https://eth.llamarpc.com ]   │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │  Exploit: [ReentrancyPoC ▼]  [▶ Run Test]   │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Log                                                │
│  ┌──────────────────────────────────────────────┐  │
│  │  [10:23:45] Deploying exploit contract...    │  │
│  │  [10:23:47] ✓ Contract deployed              │  │
│  │  [10:23:48] Executing attack function...     │  │
│  │  [10:23:52] ⚠ Reverted: Insufficient balance│  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Dimensions:** Full panel width, log area expandable to full height

## Component Tree

```
SimulationView
├── Header (title + subtitle)
├── SandboxConfigCard
│   ├── StatusBadge (READY/OFFLINE/ERROR)
│   ├── StartButton
│   └── RpcUrlInput
├── ExploitSelector (dropdown)
├── RunButton
└── LogPanel
    ├── LogHeader (title + clear button)
    └── LogEntry[] (virtualized if >100)
```

## Information Hierarchy

1. **Title** — `font-size: var(--text-xl); font-weight: 600`
2. **Sandbox status** — Prominent badge, color-coded
3. **Controls** — Start, select, run buttons
4. **Log output** — Monospace, timestamped, color-coded by level

## Navigation

- **Entry point:** Click "Simulation" icon in LeftSidebar (position 4)
- **Trigger from Findings:** Click "Generate PoC" → opens with exploit pre-selected
- **Back:** Return to Findings or Exploits view

## User Flows

### Primary Flow: Run Exploit

```
1. User ensures sandbox is running (green badge)
2. Selects exploit from dropdown
3. Clicks "Run Test"
4. Log shows execution progress
5. Result displayed: success/error/warning
6. User can export logs or copy output
```

### Edge Case: RPC Failure

```
1. User enters invalid URL
2. "Start Sandbox" fails silently
3. Status badge turns red
4. Error message in log
5. Retry button offered
```

### Edge Case: Test Timeout

```
1. Test exceeds 60-second limit
2. Status shows "Timeout"
3. Partial logs preserved
4. User can retry with different RPC
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Run test (when focused on Run button) |
| `Escape` | Stop running test |
| `Ctrl+R` | Run test (global) |
| `Ctrl+L` | Clear log |

## States

### Idle State (No Sandbox)
```markdown
- SandboxConfigCard visible
- Start button enabled
- Log empty or shows previous session
```

### Running State
```markdown
- Start button disabled ("Running...")
- Run button shows spinner
- Log auto-scrolls
- Status badge: "RUNNING" (amber)
```

### Success State
```markdown
- Log shows green "✓" entries
- Summary card: "Exploit succeeded"
- Money flow visualization if applicable
- Copy/Export buttons available
```

### Error State
```markdown
- Log shows red "✗" entries
- Error details in dedicated panel
- Retry button
- Suggested fixes if available
```

### Warning State
```markdown
- Log shows yellow "⚠" entries
- Non-blocking issues noted
- Continue option offered
```

## Edge Cases

1. **Multiple exploits selected** — Sequential execution with progress
2. **Concurrent tests** — Queued, not parallel
3. **RPC rate limiting** — Backoff with exponential delay
4. **Large log output** — VirtualList for >100 entries
5. **Cross-chain simulation** — Network selector for ETH/BSC/Polygon

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| `aria-live="polite"` | On log container |
| Status announced | Badge has aria-label |
| Focus visible | All buttons have focus ring |
| Reduced motion | No auto-scroll animation |

## Performance Requirements

- **Log render time:** <16ms per entry
- **RPC call timeout:** 60 seconds
- **VirtualList threshold:** >100 log entries
- **Connection reuse:** Keep-alive HTTP connections

## Acceptance Criteria

- [ ] Sandbox starts and reports READY status
- [ ] Exploit runs and completes within timeout
- [ ] Log entries color-coded by severity
- [ ] Error states handled gracefully
- [ ] All keyboard shortcuts functional
- [ ] No hardcoded colors (severity uses tokens)
- [ ] Live region announces new log entries
- [ ] Can clear and restart sandbox
- [ ] Mobile responsive at 375px width
