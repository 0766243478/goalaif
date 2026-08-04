# Findings Screen Specification

> **File:** `views/FindingsView.tsx`  
> **Purpose:** Vulnerability discovery results with filtering and prioritization

---

## Purpose

Display discovered security vulnerabilities in a filterable, searchable list. Enable researchers to triage, prioritize, and generate PoCs for each finding.

## Primary User

Security auditors reviewing contract analysis results.

## User Goals

1. Quickly see severity distribution of all findings
2. Filter by severity to focus on critical/high issues
3. Search findings by keyword or function name
4. Generate PoC exploit for selected finding
5. Copy finding details for report generation

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Findings                               12 of 47   │
│  Pipeline audit results                            │
├─────────────────────────────────────────────────────┤
│  [SearchInput: 🔍 Filter findings...]              │
├─────────────────────────────────────────────────────┤
│  [CRITICAL] [HIGH] [MEDIUM] [LOW]  [Clear]         │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL  Reentrancy in withdraw()        │  │
│  │    Line 45 • affects balance mapping          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🟠 HIGH      Integer overflow in calculate()  │  │
│  │    Line 112 • affects token transfer          │  │
│  └──────────────────────────────────────────────┘  │
│  ...                                               │
└─────────────────────────────────────────────────────┘
```

**Dimensions:** Full panel width, virtualized list for >50 items

## Component Tree

```
FindingsView
├── Header (title + count)
├── AuditProgressBar (shared)
├── SearchInput
├── SeverityFilterBar
│   ├── FilterButton[] (CRITICAL/HIGH/MEDIUM/LOW)
│   └── ClearButton
└── FindingsList
    ├── FindingCard[] (virtualized)
    │   ├── SeverityBadge
    │   ├── Title
    │   ├── Meta (line number, affected function)
    │   └── Actions (Generate PoC, Copy)
    └── EmptyState (if filtered)
```

## Information Hierarchy

1. **Title + Count** — `font-size: var(--text-xl); font-weight: 600`
2. **Filter controls** — Prominent, top-aligned
3. **Finding cards** — Critical at top, alternating severity colors
4. **Card actions** — Right-aligned, hover-revealed

## Navigation

- **Entry point:** Click "Findings" icon in LeftSidebar (position 2)
- **Detail view:** Click finding card → opens ExploitsView with PoC
- **Filter persistence:** Selected filters persist across view switches

## User Flows

### Primary Flow: Review Findings

```
1. View loads with all findings (sorted by severity)
2. User sees severity distribution at a glance
3. User applies severity filter (e.g., show only CRITICAL)
4. User scrolls through filtered results
5. User clicks finding → navigates to ExploitsView
```

### Secondary Flow: Generate PoC

```
1. User selects finding card
2. Clicks "Generate PoC" button
3. UI switches to ExploitsView
4. PoC code generated and displayed
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate findings list |
| `Enter` | Open selected finding |
| `Escape` | Deselect / clear filters |
| `Ctrl+F` | Focus search input |
| `Ctrl+1-4` | Toggle severity filter |
| `/` | Open command palette |

## States

### Empty State (No Findings)
```markdown
Icon: Magnifying glass (gray)
Title: "No findings"
Message: "Run an audit to discover vulnerabilities"
Action: "Start Audit" button (primary)
```

### Empty State (Filtered)
```markdown
Icon: Filter (gray)
Title: "No findings match your filter"
Message: "Try adjusting your search or severity selection"
Action: None (just informational)
```

### Loading State
```markdown
- Skeleton cards (shimmer animation)
- 5 placeholder rows
- Duration: Until first batch loaded
```

### Error State
```markdown
- Banner at top: "Failed to load findings"
- Retry button
- Preserved filtered state
```

## Edge Cases

1. **Duplicate titles** — Unique IDs prevent confusion
2. **Very long descriptions** — Truncated with "Read more" expand
3. **Finding without line number** — Shows "Unknown location"
4. **Multi-contract audits** — Grouped by contract name
5. **Finding with no affected function** — Shows "Global impact"

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| `role="group"` | Severity filter buttons grouped |
| `aria-pressed` | Toggle buttons indicate active state |
| `aria-label` | Search input labeled |
| Keyboard nav | Arrow keys navigate list |
| Focus visible | 2px solid outline on all interactive elements |
| Color independence | Severity indicated by badge + icon + text |

## Performance Requirements

- **VirtualList threshold:** >50 items
- **Item height:** 120px (fixed for consistent calculations)
- **Render time:** <50ms for 100 items
- **Filter computation:** Memoized with useMemo
- **Search debounce:** 300ms

## Acceptance Criteria

- [ ] Severity filter toggles work correctly
- [ ] Search filters by title, description, affected_functions
- [ ] VirtualList activates at >50 items
- [ ] Empty state displays when no matches
- [ ] Keyboard navigation functional
- [ ] All colors use semantic tokens
- [ ] Focus styles visible
- [ ] Screen reader announces count and filters
- [ ] No hardcoded hex values
