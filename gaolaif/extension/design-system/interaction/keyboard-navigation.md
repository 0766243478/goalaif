# Keyboard Navigation Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Complete keyboard navigation map for all SIREEN views and interactions.

---

## Global Shortcuts

| Shortcut | Action | View |
|----------|--------|------|
| `Ctrl+1` | Switch to Chat | All |
| `Ctrl+2` | Switch to Findings | All |
| `Ctrl+3` | Switch to Exploits | All |
| `Ctrl+4` | Switch to Simulation | All |
| `Escape` | Close modal/palette | All |
| `Ctrl+/` | Show keyboard shortcuts | All |

---

## View-Specific Shortcuts

### Chat View
| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `/` | Open slash command palette |
| `Ctrl+L` | Clear chat |

### Findings View
| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate findings list |
| `Enter` | Select/open finding |
| `Space` | Select finding (toggle) |
| `Ctrl+F` | Focus search input |
| `Ctrl+Shift+F` | Filter by severity |

### Exploits View
| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate exploits |
| `Enter` | Select exploit |
| `Ctrl+Shift+S` | Run simulation |
| `Ctrl+C` | Copy code |

### Simulation View
| Shortcut | Action |
|----------|--------|
| `Enter` | Run test |
| `Ctrl+R` | Reset simulation |
| `Escape` | Cancel running test |

---

## Implementation

### Keyboard Handler Hook

```typescript
function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
      
      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
```

### Usage Example

```tsx
useKeyboardShortcuts({
  'ctrl+1': () => setActiveView('chat'),
  'ctrl+2': () => setActiveView('findings'),
  'escape': () => setSelectedFinding(null),
  'enter': () => sendMessage(),
});
```

---

## Focus Styles

Always provide clear focus indicators:

```css
:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  padding: var(--space-1) var(--space-2);
  z-index: 1000;
  transition: top 0.15s;
}

.skip-link:focus {
  top: 0;
}
```

---

## Accessibility

- **Skip Links:** Provide skip navigation link
- **Focus Order:** Logical tab order matching visual flow
- **Keyboard Traps:** Ensure no focus is trapped unexpectedly
- **Visual Indicators:** Clear focus ring on all interactive elements
