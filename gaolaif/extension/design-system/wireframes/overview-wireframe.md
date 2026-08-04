# Overview Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Overview                             [▶ Start Audit] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────┐│
│  │    12      │  │     5      │  │     3      │  │  4 ││
│  │  CRITICAL  │  │   HIGH     │  │  MEDIUM    │  │LUW││
│  │    ⬛      │  │   🟠       │  │   🟡       │  │🔵 ││
│  └────────────┘  └────────────┘  └────────────┘  └────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Active Project                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔓 VulnerableVault.sol                         │   │
│  │  Lines: 247 · Functions: 12 · Last audit: 2h ago│   │
│  │  Status: [✅ Audited]  [📊 View Details]        │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Recent Activity                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📝 Saved memory: "Flash Loan Attack Pattern"   │   │
│  │     5 minutes ago                               │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  🎯 Generated PoC for "Reentrancy in withdraw"  │   │
│  │     12 minutes ago                              │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ⚡ Completed audit: VulnerableVault.sol        │   │
│  │     2 hours ago · 19 findings                   │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Quick Actions                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [🔍 Analyze Contract]  [🧠 Browse Memories]    │   │
│  │  [💬 Ask AI]        [📋 Export Report]          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 600-800px
- **Height:** Fill available space
- **Layout:** Dashboard grid

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Stat cards | Below header | 4-column grid |
| Project card | Middle | Full width |
| Activity feed | Lower middle | Scrollable list |
| Quick actions | Bottom | 2x2 grid |

## Visual Hierarchy

1. **Stats** — Large numbers (28px), color-coded badges
2. **Project** — Prominent card with action buttons
3. **Activity** — Timestamped list, scrollable
4. **Actions** — Icon buttons, prominent placement

## User Journey

```
1. User opens SIREEN → Overview loads
2. Sees current project stats at a glance
3. Reviews recent activity timeline
4. Clicks quick action to navigate
5. Or clicks "Start Audit" to begin analysis
```
