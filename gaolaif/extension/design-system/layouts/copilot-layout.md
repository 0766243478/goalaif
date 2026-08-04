# CopilotLayout Component

> **Date:** 2026-08-02  
> **Type:** Root Layout  
> **Status:** Ready for Implementation

---

## Overview

CopilotLayout is the root layout container for SIREEN's main workspace. It arranges four panels in a horizontal grid: Chat, Findings, Exploits, and Simulation.

---

## Structure

```tsx
interface CopilotLayoutProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  children: ReactNode;
}
```

```tsx
<CopilotLayout activeView={activeView} onViewChange={setActiveView}>
  <LeftSidebar />
  <Panel id="chat" title="Chat">
    <ChatView />
  </Panel>
  <Panel id="findings" title="Findings">
    <FindingsView />
  </Panel>
  <Panel id="exploits" title="Exploits">
    <ExploitsView />
  </Panel>
  <Panel id="simulation" title="Simulation">
    <SimulationView />
  </Panel>
</CopilotLayout>
```

---

## CSS

```css
.copilot-layout {
  display: grid;
  grid-template-columns: 48px 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  height: 100%;
  background-color: var(--vscode-sideBar-background);
  color: var(--vscode-sideBar-foreground);
  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--vscode-sideBar-border);
  overflow: hidden;
}

.panel:last-child {
  border-right: none;
}

.panel-header {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--vscode-sideBar-border);
  font-size: 12px;
  font-weight: 600;
  text-transform: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}
```

---

## Panel Visibility

Only one panel is visible at a time. Panels are lazy-loaded:

```tsx
const ChatView = React.lazy(() => import('./views/ChatView'));
const FindingsView = React.lazy(() => import('./views/FindingsView'));
// ... etc
```

---

## Accessibility

- **Panel Headers:** Use `role="tablist"` and `role="tab"` for keyboard navigation
- **Focus Management:** Trap focus within active panel
- **ARIA Labels:** Each panel must have `aria-label` describing its content

```html
<div role="tablist" aria-label="Workspace panels">
  <button role="tab" aria-selected="true" aria-controls="panel-chat">Chat</button>
  <button role="tab" aria-selected="false" aria-controls="panel-findings">Findings</button>
</div>
<div role="tabpanel" id="panel-chat">...</div>
```
