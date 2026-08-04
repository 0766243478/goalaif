# Memory Screen Specification

> **File:** `views/MemoryView.tsx`  
> **Purpose:** Persistent tactical notes and research storage

---

## Purpose

Store and retrieve security research notes, tactical patterns, and reusable insights across sessions.

## Primary User

Security researchers building personal knowledge bases.

## User Goals

1. Save important findings as memory entries
2. Search memories by keyword
3. Organize memories into collections
4. Link memories to specific contracts

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Memory                                  [+ New]   │
├─────────────────────────────────────────────────────┤
│  [🔍 Search memories...]                            │
├─────────────────────────────────────────────────────┤
│  [All] [Patterns] [Contracts] [Custom]             │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │  💡 Reentrancy Pattern                        │  │
│  │     Check-effects-interactions pattern...     │  │
│  │     Tags: #reentrancy #pattern               │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  📝 Flash Loan Attack                         │  │
│  │     Uniswap flash loan exploit technique...   │  │
│  │     Tags: #flashloan #uniswap                │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Component Tree

```
MemoryView
├── Header (title + New button)
├── SearchInput
├── CollectionTabs
└── MemoryList
    └── MemoryCard[]
        ├── Title
        ├── Content (truncated)
        └── Meta (tags, date)
```

## Accessibility Requirements

- Search input has `aria-label`
- Cards are keyboard-focusable
- Live region announces search results count

## Acceptance Criteria

- [ ] Search filters in real-time
- [ ] Collections switch correctly
- [ ] Create/Edit/Delete operations work
- [ ] All tokens used (no hardcoded colors)
