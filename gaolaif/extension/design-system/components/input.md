# Input Component

> **Date:** 2026-08-02  
> **Type:** Form Element  
> **Status:** Ready for Implementation

---

## Overview

Input is a text entry field for user data. Follows VS Code's input patterns exactly.

---

## Variants

### Text Input
```css
.sireen-input {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: var(--radius-sm); /* 2px */
  padding: var(--space-1) var(--space-2); /* 4px 8px */
  height: 28px;
  font-size: 12px;
  font-family: system-ui, sans-serif;
  width: 100%;
  transition: border-color var(--duration-fast) ease;
}

.sireen-input:focus {
  border-color: var(--vscode-focusBorder);
  outline: none;
}

.sireen-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}
```

### Search Input
```css
.sireen-input-search {
  padding-left: 28px; /* Space for icon */
  background-image: url("data:image/svg+xml,..."); /* codicon-search */
  background-repeat: no-repeat;
  background-position: 8px center;
}
```

### Select Input
```css
.sireen-select {
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  height: 28px;
  font-size: 12px;
}
```

---

## States

| State | Visual | Usage |
|-------|--------|-------|
| Default | Border from token | Normal input |
| Focus | `border-color: var(--vscode-focusBorder)` | Keyboard focused |
| Error | Red border + error message | Validation failed |
| Disabled | `opacity: 0.5; cursor: not-allowed` | Read-only |
| Placeholder | `color: var(--vscode-input-placeholderForeground)` | Empty state |

---

## Accessibility

```html
<label for="rpc-url" class="sr-only">Rpc Url</label>
<input 
  id="rpc-url"
  class="sireen-input"
  type="text"
  placeholder="https://..."
  aria-describedby="rpc-help"
/>
<span id="rpc-help" class="help-text">Enter your RPC endpoint</span>
```

---

## Do's and Don'ts

### ✅ DO
```css
/* Use VS Code input tokens */
background-color: var(--vscode-input-background);
border-color: var(--vscode-input-border);

/* Proper focus indicator */
:focus {
  border-color: var(--vscode-focusBorder);
}
```

### ❌ DON'T
```css
/* Hardcoded colors */
background: #fff; /* WRONG */
border: 1px solid #ccc; /* WRONG */

/* Wrong height */
height: 40px; /* WRONG — too tall */
```
