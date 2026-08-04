# Findings Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Findings                          12 of 47 findings    │
├─────────────────────────────────────────────────────────┤
│  [🔍 Filter findings by keyword...]        [⚙️]        │
├─────────────────────────────────────────────────────────┤
│  [🔴 CRITICAL] [🟠 HIGH] [🟡 MEDIUM] [🔵 LOW]  [Clear] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔴  Reentrancy in withdraw()                    │   │
│  │     Line 45 • VulnerableVault.sol               │   │
│  │     Attacker can repeatedly call withdraw()...  │   │
│  │                                    [▶] [📋]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🟠  Integer overflow in calculate()             │   │
│  │     Line 112 • TokenTransfer.sol                │   │
│  │     Arithmetic overflow when computing fees...  │   │
│  │                                    [▶] [📋]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🟡  Missing access control on owner()           │   │
│  │     Line 78 • AccessControl.sol                 │   │
│  │     Any caller can execute privileged function..│   │
│  │                                    [▶] [📋]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔵  Informational: Gas optimization             │   │
│  │     Line 203 • GasWaster.sol                    │   │
│  │     Unnecessary storage write in loop...        │   │
│  │                                    [▶] [📋]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                         Page 1 of 3  ▶  │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 600-800px
- **Height:** Fill available space
- **List:** Virtualized for >100 items

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Search | Below header | Full width, 36px |
| Filter bar | Below search | Full width, 32px |
| Finding list | Middle | Flex-grow, virtualized |
| Pagination | Bottom | Fixed, 32px |

## Visual Hierarchy

1. **Count** — Shows "X of Y findings" prominently
2. **Filter bar** — Color-coded severity buttons
3. **Finding cards** — Severity border-left accent
4. **Actions** — Hover-revealed on cards

## User Journey

```
1. User opens Findings view
2. Sees all findings sorted by severity
3. Applies severity filter (clicks HIGH)
4. List updates to show only HIGH findings
5. Clicks finding card to select
6. Navigates to Exploits view with finding pre-selected
```
