# UI Mapping

> **Date:** 2026-08-02  
> **Purpose:** Map every existing UI component to its future design spec  
> **Scope:** All views and components in `src/sidebar/webview/`

---

## Methodology

For each existing component/view, we map:
1. **Current Component** — What exists now
2. **Future Component** — What it should become
3. **Reason** — Why the change is needed
4. **Migration Difficulty** — Low/Medium/High
5. **Breaking Changes** — What will break
6. **Dependencies** — What must be done first
7. **Implementation Order** — When to build it

---

## View Mapping

### ChatView.tsx → ChatScreen (spec: screens/CHAT_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Message display | `ChatMessage` with raw content | `ChatMessage` with structured rendering | Support code blocks, tool calls, citations |
| Empty state | Inline text + buttons | `EmptyState` component | Consistent empty pattern |
| Progress | `AuditProgressBar` inline | Collapsible progress bar | Don't interrupt conversation |
| Input | `ChatInput` basic | `ChatInput` with slash commands | Command palette per interaction spec |
| Accessibility | None | `aria-live`, focus trap | WCAG compliance |

**Migration Difficulty:** MEDIUM  
**Breaking Changes:** Message format may change (JSON structure)  
**Dependencies:** Token migration (colors.md), Typography fix  
**Implementation Order:** Phase 2

---

### FindingsView.tsx → FindingsScreen (spec: screens/FINDINGS_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Severity filter | Custom buttons | `SeverityFilterBar` component | Reusable, accessible toggle group |
| Search | `SearchInput` | `SearchInput` with debounce | Performance |
| List | `VirtualList` threshold=50 | `VirtualList` threshold=100 | Better UX for typical finding counts |
| Cards | `FindingCard` basic | `FindingCard` with actions | Consistent action pattern |
| Empty state | Inline | `EmptyState` component | Consistent empty pattern |

**Migration Difficulty:** LOW  
**Breaking Changes:** None (component interface compatible)  
**Dependencies:** Token migration, Component catalog  
**Implementation Order:** Phase 1

---

### SimulationView.tsx → SimulationScreen (spec: screens/SIMULATION_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Status badge | Custom | `StatusBadge` with states | Standardized status pattern |
| Log display | Plain divs | `LogPanel` with virtualization | Performance for long logs |
| RPC input | Basic input | `RpcConfigInput` with validation | Better UX |
| Error handling | None | Error boundaries + toast | Resilience |

**Migration Difficulty:** MEDIUM  
**Breaking Changes:** Log data structure may change  
**Dependencies:** Toast component, Error boundaries  
**Implementation Order:** Phase 2

---

### ExploitsView.tsx → ExploitsScreen (spec: screens/EXPLOITS_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Code display | `CodeBlock` basic | `CodeBlock` with copy/format | Enhanced capabilities |
| Finding selector | Dropdown | `FindingSelector` with preview | Better context |
| Terminal output | Plain pre | `Terminal` component with syntax | Consistent code display |
| Export | None | Export dropdown | User workflow |

**Migration Difficulty:** HIGH  
**Breaking Changes:** Data flow from Findings → Exploits changes  
**Dependencies:** CodeBlock enhancements, FindingSelector component  
**Implementation Order:** Phase 3

---

### MemoryView.tsx → MemoryScreen (spec: screens/MEMORY_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Search | Basic filter | Fuzzy search with highlighting | Better discoverability |
| Cards | `MemoryPanel` flat | `MemoryCard` with tags | Richer metadata |
| Collections | None | Collection tabs | Organization |
| Edit mode | None | Inline edit | Better UX |

**Migration Difficulty:** MEDIUM  
**Breaking Changes:** Memory data model may extend  
**Dependencies:** MemoryCard component, Fuzzy search utility  
**Implementation Order:** Phase 2

---

### SettingsView.tsx → SettingsScreen (spec: screens/SETTINGS_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| API key input | Text input | Masked input with visibility toggle | Security |
| Theme | None | Theme picker (future) | User preference |
| Sections | Flat list | Grouped sections | Better organization |

**Migration Difficulty:** LOW  
**Breaking Changes:** None  
**Dependencies:** None  
**Implementation Order:** Phase 1

---

### OverviewView.tsx → OverviewScreen (spec: screens/OVERVIEW_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Stats | Raw numbers | `StatCard` grid | Visual hierarchy |
| Activity | Manual log | Auto-generated feed | Better context |
| Actions | None | Quick action buttons | Efficiency |

**Migration Difficulty:** LOW  
**Breaking Changes:** None  
**Dependencies:** StatCard component  
**Implementation Order:** Phase 2

---

### TasksView.tsx → TasksScreen (spec: screens/TASKS_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Task cards | Basic | `TaskCard` with progress | Better feedback |
| Queue management | None | Drag-drop reordering | Workflow control |
| Pause/Resume | Basic | Full state management | Better UX |

**Migration Difficulty:** MEDIUM  
**Breaking Changes:** Task data model extends  
**Dependencies:** TaskCard component, Drag-drop utility  
**Implementation Order:** Phase 3

---

### ResearchNotesView.tsx → ResearchScreen (spec: screens/RESEARCH_SCREEN.md)

| Aspect | Current | Future | Reason |
|--------|---------|--------|--------|
| Editor | Basic textarea | Markdown editor with preview | Rich content |
| Links | Plain text | Wiki-links with autocomplete | Knowledge graph |
| Export | None | PDF/MD export | Sharing |

**Migration Difficulty:** HIGH  
**Breaking Changes:** Note data format changes  
**Dependencies:** Markdown editor library, Export utility  
**Implementation Order:** Phase 3

---

## Component Mapping

### Existing Components → New Specs

| Current Component | Future Spec | Status | Diff |
|------------------|-------------|--------|------|
| `ActionButton.tsx` | `button.md` (4 variants) | ✅ Match | Minor CSS updates |
| `SeverityBadge.tsx` | `severity-badge.md` | ✅ Match | Add bordered variant |
| `CodeBlock.tsx` | `code-block.md` | ⚠️ Extend | Add filename tab, line numbers toggle |
| `EmptyState.tsx` | `empty-state.md` | ⚠️ Extend | Add icon variants, action support |
| `FindingCard.tsx` | `finding-card.md` | ✅ Match | Add selected state styling |
| `SearchInput.tsx` | `search-input.md` | ⚠️ Extend | Add debounce, clear button consistency |
| `VirtualList.tsx` | `virtual-list.md` | ✅ Match | Update threshold constant |
| `ThinkingIndicator.tsx` | `thinking-indicator.md` | ⚠️ Extend | Add step completion states |
| `ChatMessage.tsx` | `chat-message.md` | ⚠️ Extend | Add role-based styling |
| `ChatInput.tsx` | `chat-input.md` | ✅ Match | Add slash command integration |
| `AuditProgressBar.tsx` | `progress-bar.md` | ⚠️ Extend | Add compact mode, stage icons |
| `PoCResultPanel.tsx` | `poc-result-panel.md` | ✅ Match | Add error/empty states |
| `MemoryPanel.tsx` | `memory-card.md` | ⚠️ Extend | Add tag support, delete confirmation |
| `MoneyFlowVisualizer.tsx` | Future: `flow-visualizer.md` | 🔲 New | Create new component spec |
| `PipelineProgress.tsx` | Same as AuditProgressBar | ✅ Match | Alias to shared component |
| `AgentLog.tsx` | Future: `log-panel.md` | 🔲 New | Create new component spec |
| `Icon.tsx` | `icons.md` | ✅ Match | Verify codicon usage |

### Missing Components (to be created)

| Component | Priority | Purpose | Parent Screen |
|-----------|----------|---------|---------------|
| `Toast.tsx` | HIGH | Notifications | Global |
| `Tooltip.tsx` | HIGH | Hover info | Multiple |
| `CommandPalette.tsx` | HIGH | Slash commands | ChatView |
| `Modal.tsx` | MEDIUM | Confirmations | Settings, Tasks |
| `DiffViewer.tsx` | MEDIUM | Patch display | ExploitsView |
| `FileTree.tsx` | MEDIUM | Navigation | Overview |
| `Timeline.tsx` | LOW | History view | TasksView |
| `Breadcrumb.tsx` | LOW | Nav depth | ResearchNotes |
| `FlowVisualizer.tsx` | LOW | Money flow | SimulationView |
| `LogPanel.tsx` | MEDIUM | Structured logs | SimulationView |

---

## Migration Dependencies Graph

```
Phase 1 (Foundation)
├── Token migration (colors, typography)
│   └── Enables: All components
├── Animation removal
│   └── Enables: All components
├── VirtualList threshold fix
│   └── Enables: FindingsView
└── SeverityBadge token usage
    └── Enables: All severity displays

Phase 2 (Integration)
├── EmptyState standardization
│   ├── Depends on: Phase 1
│   └── Enables: ChatView, FindingsView, MemoryView
├── ChatInput slash commands
│   ├── Depends on: Phase 1
│   └── Enables: ChatView
├── SearchInput debounce
│   ├── Depends on: Phase 1
│   └── Enables: FindingsView, MemoryView
├── Toast system
│   ├── Depends on: Phase 1
│   └── Enables: All views
└── Tooltip system
    ├── Depends on: Phase 1
    └── Enables: All views

Phase 3 (Polish)
├── CommandPalette
│   ├── Depends on: Phase 2
│   └── Enables: ChatView
├── DiffViewer
│   ├── Depends on: Phase 2
│   └── Enables: ExploitsView
├── FileTree
│   ├── Depends on: Phase 2
│   └── Enables: OverviewView
└── Modal system
    ├── Depends on: Phase 2
    └── Enables: Settings, Tasks

Phase 4+ (Advanced)
├── Timeline visualization
├── FlowVisualizer SVG enhancement
├── Markdown editor for ResearchNotes
└── Drag-drop for Tasks
```

---

## Implementation Order Summary

### Week 1-2: Foundation
1. [ ] Migrate CSS tokens (--sireen-* → --vscode-*)
2. [ ] Fix body typography (mono → system-ui)
3. [ ] Remove glow animations
4. [ ] Fix VirtualList threshold (50 → 100)

### Week 3-4: Core Components
5. [ ] Standardize EmptyState across all views
6. [ ] Add Toast notification system
7. [ ] Add Tooltip system
8. [ ] Implement ChatInput slash commands

### Week 5-6: View Refactoring
9. [ ] Refactor FindingsView (filter a11y, debounce)
10. [ ] Refactor ChatView (aria-live, progress collapsible)
11. [ ] Refactor SettingsView (masked input)

### Week 7-8: Advanced Features
12. [ ] Create CommandPalette component
13. [ ] Create DiffViewer component
14. [ ] Create FileTree component
15. [ ] Create Modal system

### Week 9-12: Polish
16. [ ] Implement Timeline visualization
17. [ ] Enhance FlowVisualizer
18. [ ] Add Markdown editor for ResearchNotes
19. [ ] Add drag-drop for Tasks

---

## Breaking Change Impact Analysis

| Change | Impact | Mitigation |
|--------|--------|------------|
| Token migration | All CSS breaks if not updated | Parallel token definitions during transition |
| Typography fix | Monospace UI looks wrong briefly | Users expect normal text |
| VirtualList threshold | Performance improves, no breaking | Safe increase |
| New aria attributes | Assistive tech behavior changes | Backward compatible |
| Component interfaces | Code breaks if props change | Semantic versioning, deprecation warnings |

---

## Rollback Strategy

If migration causes issues:
1. **Token migration:** Keep old `--sireen-*` variables as aliases
2. **Component refactors:** Feature flags per view
3. **New dependencies:** Optional peer dependencies
4. **CSS changes:** CSS-in-JS fallbacks available
