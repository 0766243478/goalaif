# Simulation Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Simulation                                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Sandbox Status         [● READY]              │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  [▶ Start Sandbox]                             │   │
│  │                                                │   │
│  │  Fork RPC URL:                                 │   │
│  │  [https://eth.llamarpc.com_______________]     │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Exploit: [ReentrancyPoC.sol ▼]      [▶ Run Test]      │
├─────────────────────────────────────────────────────────┤
│  Log                                         [🗑 Clear] │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [10:23:45] Starting sandbox...                 │   │
│  │  [10:23:47] ✓ Sandbox ready                     │   │
│  │  [10:23:48] Deploying exploit contract...       │   │
│  │  [10:23:52] ✓ Contract deployed: 0xabc...       │   │
│  │  [10:23:53] Executing attack function...        │   │
│  │  [10:23:58] ⚠ Transaction reverted             │   │
│  │      Reason: ReentrancyGuard: reentrant call    │   │
│  │  [10:24:01] ✓ Attack successful!                │   │
│  │  [10:24:02] Gas used: 142,567                   │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Result: ✅ Confirmed                                  │
│  Impact: High — Direct ETH theft                       │
│  [📋 Copy Output]  [📊 View Flow]                      │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 600-800px
- **Height:** Fill available space
- **Log panel:** Expandable to full height

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Config card | Below header | Full width, auto |
| Controls | Below config | Full width, 40px |
| Log panel | Middle | Flex-grow, scrollable |
| Result summary | Bottom | Full width, 60px |

## Visual Hierarchy

1. **Sandbox status** — Prominent badge (green/red/amber)
2. **Controls** — Primary action buttons
3. **Log output** — Monospace, timestamped, color-coded
4. **Result** — Summary after execution completes

## User Journey

```
1. User opens Simulation view
2. Checks sandbox status (should be READY)
3. Selects exploit from dropdown
4. Clicks "Run Test"
5. Log shows real-time execution progress
6. Result summary displays after completion
7. User can copy output or view money flow
```
