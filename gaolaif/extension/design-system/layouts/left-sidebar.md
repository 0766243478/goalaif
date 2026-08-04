# LeftSidebar Component

> **Date:** 2026-08-02  
> **Type:** Navigation  
> **Status:** Ready for Implementation

---

## Overview

LeftSidebar is the vertical icon-only navigation bar on the far left. It provides quick access to all major views.

---

## Structure

```tsx
interface LeftSidebarProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
}
```

```tsx
<LeftSidebar activeView={activeView} onViewChange={setActiveView}>
  <NavIcon icon="home" label="Overview" viewId="overview" />
  <NavIcon icon="chat" label="Chat" viewId="chat" />
  <NavIcon icon="search" label="Findings" viewId="findings" badge={findingCount} />
  <NavIcon icon="bug" label="Exploits" viewId="exploits" />
  <NavIcon icon="play" label="Simulation" viewId="simulation" />
  <NavIcon icon="library" label="Memory" viewId="memory" />
  <NavIcon icon="settings" label="Settings" viewId="settings" />
</LeftSidebar>
```

---

## CSS

```css
.left-sidebar {
  width: 48px;
  background-color: var(--vscode-sideBar-background);
  border-right: 1px solid var(--vscode-sideBar-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-1) 0;
  gap: var(--space-1);
}

.nav-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--vscode-sideBar-foreground);
  transition: background-color var(--duration-fast) ease;
  position: relative;
}

.nav-icon:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.nav-icon.active {
  background-color: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.nav-icon:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

.nav-icon .badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background-color: var(--sireen-amber);
  border-radius: var(--radius-full);
}
```

---

## Accessibility

- **Keyboard Navigation:** Arrow keys move focus between icons
- **Labels:** Each icon must have `aria-label`
- **Active State:** Indicate which view is active with `aria-selected="true"`

```html
<button 
  class="nav-icon" 
  aria-label="Chat view"
  aria-selected="true"
  role="tab"
>
  <i class="codicon codicon-chat"></i>
</button>
```
