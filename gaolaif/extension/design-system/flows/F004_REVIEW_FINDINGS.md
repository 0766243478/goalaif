# Review Findings Flow

## Flow: F004 - Review Findings

### Entry Point
FindingsView (after audit completes)

### Decision Points
1. **Filter by severity?**
   - Yes → Apply severity filter
   - No → View all findings

2. **Multiple findings?**
   - Yes → Navigate sequentially
   - One → Jump directly to exploit generation

### Success Path
```
User views FindingsView → Lists all findings sorted by severity → 
Applies filter (e.g., CRITICAL only) → 
Clicks finding card → Card highlights → 
Navigates to ExploitsView → Finding pre-selected
```

### Failure Path
```
No findings match filter → EmptyState shows "No critical findings" → 
User clears filter → Shows all findings
```

### Recovery Path
```
Filter applied incorrectly → Clear filters button → Reset to all
Need different view → Switch to Overview for summary
```

### Key Components
- FindingCard (selectable)
- SeverityBadge (color-coded)
- EmptyState (no results)
- SearchInput (keyword filter)

### Accessibility
- Keyboard navigation through findings
- Screen reader announces count and severity
- Focus visible on selected card

### Acceptance Criteria
- [ ] Severity filter works correctly
- [ ] Clicking finding navigates appropriately
- [ ] Selection persists across navigation
- [ ] Empty state informative
- [ ] Pagination works for large lists
