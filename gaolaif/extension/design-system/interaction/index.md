# Interaction Patterns Index

> **Date:** 2026-08-02  
> **Purpose:** Document all interaction patterns used in SIREEN

---

## Pattern Inventory

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 1 | Streaming Responses | `streaming.md` | Character-by-character AI responses |
| 2 | Slash Commands | `slash-commands.md` | Type `/` to trigger command palette |
| 3 | Finding Selection | `finding-selection.md` | Click to view details, expand/collapse |
| 4 | PoC Generation | `poc-generation.md` | Generate exploit code from finding |
| 5 | Simulation Execution | `simulation-execution.md` | Run forge tests in sandbox |
| 6 | Severity Filtering | `severity-filtering.md` | Filter findings by severity |
| 7 | Memory Search | `memory-search.md` | Fuzzy search across memory entries |
| 8 | Keyboard Navigation | `keyboard-navigation.md` | Tab/Enter/Escape patterns |
| 9 | Drag to Rearrange | `drag-reorder.md` | Reorder findings/exploits |
| 10 | Context Menus | `context-menus.md` | Right-click action menus |
| 11 | Toast Notifications | `toasts.md` | Non-blocking status messages |
| 12 | Progress Indicators | `progress-indicators.md` | Loading states and spinners |

---

## Pattern Principles

### All Interactions Must:
1. Provide immediate visual feedback
2. Support keyboard alternatives
3. Be reversible where possible
4. Show clear success/error states
5. Respect reduced-motion preferences

### Never:
- Auto-play media or animations
- Require mouse-only interactions
- Hide critical actions
- Create irreversible operations without confirmation
