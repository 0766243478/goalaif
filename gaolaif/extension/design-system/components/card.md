# Card Component

> **Date:** 2026-08-02  
> **Type:** Container  
> **Status:** Ready for Implementation

---

## Overview

Card is a container for grouping related content. Used primarily for finding items, chat messages, and simulation results.

---

## Variants

### Default Card
```css
.sireen-card {
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-sideBar-border);
  border-radius: var(--radius-md); /* 4px */
  padding: var(--space-2); /* 8px */
  margin-bottom: var(--space-1); /* 4px */
}
```

### Selected Card
```css
.sireen-card-selected {
  background-color: var(--vscode-list-activeSelectionBackground);
  border-color: var(--vscode-list-activeSelectionBackground);
}
```

### Hover State Card
```css
.sireen-card:hover {
  background-color: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-list-hoverBackground);
}
```

### Left-Accent Card (Severity Indicator)
```css
.sireen-card-critical {
  border-left: 3px solid var(--vscode-errorForeground);
}

.sireen-card-high {
  border-left: 3px solid var(--vscode-warningForeground);
}

.sireen-card-medium {
  border-left: 3px solid var(--vscode-notificationInfoForeground);
}
```

---

## Structure

```tsx
interface CardProps {
  variant?: 'default' | 'selected' | 'critical' | 'high' | 'medium';
  interactive?: boolean;
  onClick?: () => void;
  children: ReactNode;
}
```

### Card Layout
```css
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-1);
}

.card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-sideBar-foreground);
}

.card-meta {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.card-body {
  font-size: 12px;
  color: var(--vscode-sideBar-foreground);
  line-height: var(--line-height-ui);
}

.card-footer {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding-top: var(--space-1);
  border-top: 1px solid var(--vscode-sideBar-border);
}
```

---

## Finding Card Example

```tsx
<div class="sireen-card sireen-card-critical">
  <div class="card-header">
    <span class="card-title">Reentrancy in withdraw()</span>
    <div class="card-meta">
      <Badge variant="critical">Critical</Badge>
      <span class="timestamp">2m ago</span>
    </div>
  </div>
  <div class="card-body">
    <p>The withdraw function lacks reentrancy guard...</p>
  </div>
  <div class="card-footer">
    <Button variant="ghost" size="sm" icon="play">Generate PoC</Button>
    <Button variant="ghost" size="sm" icon="copy">Copy</Button>
  </div>
</div>
```

---

## Accessibility

- **Interactive Cards:** Must be keyboard-focusable (`tabIndex={0}`)
- **Focus Indicator:** Visible outline on focus
- **Semantic HTML:** Use `<article>` for card wrapper

```css
.sireen-card[role="button"]:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

---

## Do's and Don'ts

### ✅ DO
```css
/* Use semantic borders */
border: 1px solid var(--vscode-sideBar-border);

/* Use left accent for severity */
border-left: 3px solid var(--vscode-errorForeground);

/* Compact padding */
padding: var(--space-2); /* 8px */
```

### ❌ DON'T
```css
/* Hardcoded colors */
border: 1px solid #333; /* WRONG */

/* Decorative shadows */
box-shadow: 0 4px 12px rgba(0,0,0,0.3); /* WRONG */

/* Excessive padding */
padding: 24px; /* WRONG */
```
