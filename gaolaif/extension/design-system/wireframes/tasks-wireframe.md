# Tasks Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Tasks                                [+ Add Task]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🏃 Auditing Vault.sol                          │   │
│  │                                                 │   │
│  │  Progress: ████████████████░░░░  72%           │   │
│  │  Stage: Researching (pattern matching)          │   │
│  │  Started: 2 minutes ago · ETA: ~30 seconds      │   │
│  │                                                 │   │
│  │  [⏸ Pause]  [✕ Cancel]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⏳ Generating exploit for Finding #23          │   │
│  │                                                 │   │
│  │  Status: Queued                                 │   │
│  │  Position: 2nd in queue                         │   │
│  │  Queue time: 45 seconds                         │   │
│  │                                                 │   │
│  │  [✕ Remove from Queue]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✓ Audit completed: Token.sol                   │   │
│  │                                                 │   │
│  │  Results: 3 critical, 5 high, 2 low            │   │
│  │  Completed: 10 minutes ago                      │   │
│  │                                                 │   │
│  │  [📋 View Results]  [🔗 Share Report]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✓ Generated PoC: Reentrancy in withdraw()      │   │
│  │                                                 │   │
│  │  Status: Completed                              │   │
│  │  Completed: 15 minutes ago                      │   │
│  │                                                 │   │
│  │  [▶ Run Simulation]  [📋 Copy Code]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 600-800px
- **Height:** Fill available space
- **List:** Vertical stack of task cards

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Task list | Middle | Flex-grow, scrollable |
| Empty state | Center | If no tasks |

## Visual Hierarchy

1. **Active task** — Progress bar at top, prominent controls
2. **Queued tasks** — Dimmed, position indicator
3. **Completed tasks** — Success styling, action buttons

## User Journey

```
1. User opens Tasks view
2. Sees active task with progress
3. Can pause/cancel running task
4. Queued tasks show wait time
5. Completed tasks show results with actions
6. Click result to navigate to relevant view
```
