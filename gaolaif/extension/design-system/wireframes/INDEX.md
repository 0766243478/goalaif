# Wireframes Index

> **Date:** 2026-08-02  
> **Purpose:** Low-fidelity structure diagrams for all SIREEN screens

---

## Screen Wireframe Index

| Screen | Wireframe File | Layout Type | Complexity |
|--------|---------------|-------------|------------|
| Chat | `chat-wireframe.md` | Single-column + input | Low |
| Findings | `findings-wireframe.md` | List + sidebar filters | Medium |
| Simulation | `simulation-wireframe.md` | Split panel (config + log) | Medium |
| Exploits | `exploits-wireframe.md` | Two-column (selector + code) | Medium |
| Memory | `memory-wireframe.md` | Grid + search | Low |
| Settings | `settings-wireframe.md` | Form sections | Low |
| Overview | `overview-wireframe.md` | Dashboard grid | Low |
| Tasks | `tasks-wireframe.md` | List + queue | Medium |
| ResearchNotes | `research-wireframe.md` | Editor + preview | High |

---

## Wireframe Conventions

### Symbols
- `[ ]` = Input field
- `( )` = Button
- `{ }` = Component instance
- `┌──┐` = Panel/container
- `→` = Navigation flow
- `*` = Required field

### Layout Blocks
- **Header**: Title + subtitle + actions
- **Body**: Main content area
- **Footer**: Input or secondary actions
- **Sidebar**: Filters, navigation, tools

### Responsive Notes
- Desktop: Full layout
- Tablet (768px): Collapsible sidebar
- Mobile (375px): Single column, hamburger nav

---

## Quick Reference: Component Placement

### ChatScreen
```
[Header: "Chat" | subtitle]
[Progress bar - collapsible]
─────────────────────────────
[Message list area]
  ┌─────────────────────────┐
  │ 👤 User message...      │
  └─────────────────────────┘
  ┌─────────────────────────┐
  │ 🤖 AI response...       │
  │   [Code block]          │
  └─────────────────────────┘
[Empty state if no messages]
─────────────────────────────
[Context hint]
[Input: textarea + send btn]
```

### FindingsScreen
```
[Header: "Findings" | count]
[Search input]
[Severity filter bar: ●CRIT ●HIGH ●MED ●LOW]
─────────────────────────────
[List of FindingCards]
  ┌─────────────────────────┐
  │ 🔴 CRITICAL             │
  │ Reentrancy in withdraw()│
  │ L45 • Vault.sol         │
  └─────────────────────────┘
  ┌─────────────────────────┐
  │ 🟠 HIGH                 │
  │ Integer overflow        │
  │ L112 • Token.sol        │
  └─────────────────────────┘
[Empty state if filtered/no results]
```

### SimulationScreen
```
[Header: "Simulation"]
─────────────────────────────
[SandboxConfig card]
  Status: [● READY / ○ OFFLINE]
  [Start Sandbox button]
  RPC: [________________]
─────────────────────────────
[Exploit selector dropdown]
[▶ Run Test button]
─────────────────────────────
[Log panel - expandable]
  ┌─────────────────────────┐
  │ [10:23] Deploying...    │
  │ [10:24] ✓ Success       │
  └─────────────────────────┘
[Empty state if no logs]
```

### ExploitsScreen
```
[Header: "Exploits" | [Export]]
[Finding selector dropdown]
─────────────────────────────
[Finding summary card]
  Title: Reentrancy in withdraw()
  Severity: 🔴 CRITICAL
  Line: 45 • VulnerableVault.sol
─────────────────────────────
[Code panel]
  Tab: [ReentrancyPoC.sol]
  [Copy button]
  ┌─────────────────────────┐
  │ ```solidity             │
  │ contract PoC { ... }    │
  │ ```                     │
  └─────────────────────────┘
─────────────────────────────
[Terminal panel]
  [Clear button]
  ┌─────────────────────────┐
  │ > Test passed           │
  │ Gas: 142,567            │
  └─────────────────────────┘
```

### MemoryScreen
```
[Header: "Memory" | [+ New]]
[Search input]
[Collection tabs: All | Patterns | Contracts | Custom]
─────────────────────────────
[Memory cards grid]
  ┌─────────────────────┐  ┌─────────────────────┐
  │ 💡 Reentrancy Pat.. │  │ 📝 Flash Loan Att.. │
  │ Check-effects...    │  │ Uniswap exploit...  │
  │ #reentrancy #pattern│  │ #flashloan #uni     │
  └─────────────────────┘  └─────────────────────┘
[Empty state if no memories]
```

### OverviewScreen
```
[Header: "Overview" | [▶ Audit]]
─────────────────────────────
[Stat cards row]
  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
  │ 12   │  │  5   │  │  3   │  │  4   │
  │CRIT  │  │ HIGH │  │ MEDIUM│  │ LOW  │
  └──────┘  └──────┘  └──────┘  └──────┘
─────────────────────────────
[Progress card]
  Audit Progress: ████████░░ 80%
─────────────────────────────
[Recent activity list]
  • Found 3 critical issues...
  • Generated PoC for...
  • Saved memory: "..."
```

### TasksScreen
```
[Header: "Tasks" | [+ Add]]
─────────────────────────────
[Task cards list]
  ┌─────────────────────────┐
  │ ▶ Auditing Vault.sol    │
  │ Progress: ████░░ 60%    │
  │ [Pause] [Cancel]        │
  └─────────────────────────┘
  ┌─────────────────────────┐
  │ ⏸ Researching patterns  │
  │ In queue...             │
  └─────────────────────────┘
[Empty state if no tasks]
```

### ResearchNotesScreen
```
[Header: "Research Notes" | [📝 Edit]]
─────────────────────────────
[Editor area - split view optional]
  ┌─────────────────────────┐
  │ ## Flash Loan Analysis  │
  │                       │
  │ **Date:** 2026-08-02  │
  │ **Related:** [Vault]  │
  │                       │
  │ Key findings:         │
  │ - Oracle manipulation │
  │ - Cross-contract...   │
  └─────────────────────────┘
[Toolbar: Bold | Italic | Link | Code]
```
