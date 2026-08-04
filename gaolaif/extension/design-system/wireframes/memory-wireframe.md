# Memory Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Memory                              [+ New]          │
├─────────────────────────────────────────────────────────┤
│  [🔍 Search memories...]                                │
├─────────────────────────────────────────────────────────┤
│  [All] [Patterns] [Contracts] [Custom]                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ 💡 Pattern: Reentrancy│  │ 📝 Contract: Vault01 │   │
│  │                      │  │                      │   │
│  │ Check-effects-inter- │  │ Compound-style       │   │
│  │ mediate pattern:     │  │ governance token     │   │
│  │ Always update state  │  │ v3. Tokenomics:      │   │
│  │ after external calls │  │ fee-on-transfer     │   │
│  │                      │  │                      │   │
│  │ #reentrancy #pattern │  │ #compound #token     │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │ 🔥 Flash Loan Attack │  │ 📝 Custom: AuditNote │   │
│  │                      │  │                      │   │
│  │ Uniswap V2 flash     │  │ Review notes from   │   │
│  │ exploit pattern:     │  │ March audit. Key    │   │
│  │ - Oracle manipulation│  │ issues: access      │   │
│  │ - Price manipulation │  │ control gaps        │   │
│  │ - Cross-contract... │  │                      │   │
│  │                      │  │ #custom #audit      │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                      Page 1 of 4  ▶   │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 600-800px
- **Height:** Fill available space
- **Grid:** 2-column responsive grid

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Search | Below header | Full width, 36px |
| Filter tabs | Below search | Full width, 32px |
| Card grid | Middle | Flex-grow, scrollable |
| Pagination | Bottom | Fixed, 32px |

## Visual Hierarchy

1. **Tabs** — Highlighted active tab
2. **Cards** — Icon prefix + title + summary + tags
3. **Search** — Debounced, real-time filtering

## User Journey

```
1. User opens Memory view
2. Sees grid of saved memories
3. Clicks tab to filter (e.g., Patterns)
4. List updates instantly
5. Clicks card to expand/edit
6. Uses search for specific content
```
