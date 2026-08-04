# Layout Documentation Index

> **Date:** 2026-08-02  
> **Purpose:** Complete layout specifications for SIREEN Design System

---

## Layout Inventory

| # | Layout | File | Description |
|---|--------|------|-------------|
| 1 | CopilotLayout | `copilot-layout.md` | Main 4-panel layout (Chat/Findings/Exploits/Simulate) |
| 2 | LeftSidebar | `left-sidebar.md` | Icon navigation sidebar |
| 3 | ChatLayout | `chat-layout.md` | Chat view with message list + input |
| 4 | FindingsLayout | `findings-layout.md` | Virtualized findings list |
| 5 | ExploitsLayout | `exploits-layout.md` | PoC code blocks + forge output |
| 6 | SimulationLayout | `simulation-layout.md` | Fork RPC input + sandbox controls |
| 7 | MemoryLayout | `memory-layout.md` | Collection tabs + search |
| 8 | EmptyStateLayout | `empty-state-layout.md` | Contextual empty states |

---

## Layout Principles

### All Layouts Must:
1. Use VS Code semantic tokens for backgrounds and borders
2. Support keyboard navigation between panels
3. Respect `prefers-reduced-motion` for transitions
4. Maintain consistent spacing (4px grid)
5. Provide clear visual hierarchy

### Panel Dimensions
| Panel | Min Width | Default Width | Max Width |
|-------|-----------|---------------|-----------|
| LeftSidebar | 48px | 48px | 48px |
| Chat | 300px | 400px | 800px |
| Findings | 250px | 350px | 600px |
| Exploits | 300px | 400px | 800px |
| Simulation | 300px | 400px | 800px |

---

## Quick Reference: CSS Grid Template

```css
.copilot-layout {
  display: grid;
  grid-template-columns: 48px 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  height: 100vh;
  background-color: var(--vscode-sideBar-background);
  color: var(--vscode-sideBar-foreground);
}
```
