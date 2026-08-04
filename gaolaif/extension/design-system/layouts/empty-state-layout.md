# EmptyStateLayout Component

> **Date:** 2026-08-02  
> **Type:** State Layout  
> **Status:** Ready for Implementation

---

## Overview

EmptyStateLayout provides contextual empty states for each view when no content exists.

---

## Structure

```tsx
interface EmptyStateProps {
  icon: string; // codicon class
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
  };
}
```

---

## Views

### Chat Empty State
```tsx
<EmptyState
  icon="chat"
  title="Start a conversation"
  description="Ask about your smart contracts, vulnerabilities, or security best practices."
  action={{ label: "Analyze Contract", onClick: handleAnalyze, icon: "play" }}
/>
```

### Findings Empty State
```tsx
<EmptyState
  icon="search"
  title="No findings yet"
  description="Run an analysis to discover vulnerabilities in your contracts."
  action={{ label: "Run Analysis", onClick: handleAnalyze, icon: "play" }}
```

### Exploits Empty State
```tsx
<EmptyState
  icon="bug"
  title="No exploits generated"
  description="Findings will appear here with proof-of-concept code."
/>
```

### Simulation Empty State
```tsx
<EmptyState
  icon="terminal"
  title="No simulation running"
  description="Configure a fork RPC and run simulations to verify exploits."
  action={{ label: "Configure Fork", onClick: openSettings, icon: "gear" }}
/>
```

---

## CSS

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  text-align: center;
  gap: var(--space-3);
}

.empty-state-icon {
  font-size: 32px;
  color: var(--vscode-descriptionForeground);
}

.empty-state-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-sideBar-foreground);
}

.empty-state-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  max-width: 300px;
}

.empty-state-action {
  margin-top: var(--space-2);
}
```

---

## Principles

- **No Marketing Copy:** Never show taglines or promotional text
- **Contextual Actions:** Only show actions relevant to the current view
- **Helpful Guidance:** Describe what the user can do next
- **Minimal Decoration:** Simple icon + text, no illustrations
