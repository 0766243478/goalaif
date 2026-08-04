# Accessibility Guidelines

> **Date:** 2026-08-02  
> **Standard:** WCAG 2.1 AA  
> **Status:** Mandatory Compliance

---

## Core Requirements

### 1. Color Contrast

All text must meet minimum contrast ratios:

| Text Type | Minimum Ratio | Target Ratio |
|-----------|---------------|--------------|
| Normal text (<18px) | 4.5:1 | 7:1 |
| Large text (≥18px or ≥14px bold) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Non-text elements | 3:1 | 4.5:1 |

**Implementation:**
- Use VS Code semantic tokens (adapt to theme automatically)
- Test with high contrast mode enabled
- Verify with axe DevTools or WAVE extension

---

### 2. Keyboard Navigation

**Requirements:**
- All interactive elements accessible via Tab key
- Logical tab order matches visual order
- Focus indicator visible on all focusable elements
- No keyboard traps

**Implementation:**
```css
/* Visible focus indicator */
*:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

/* Remove default outline for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
```

**Keyboard Shortcuts:**
| Action | Shortcut |
|--------|----------|
| Analyze contract | `Ctrl+Shift+A` |
| Generate exploit | `Ctrl+Shift+E` |
| Run simulation | `Ctrl+Shift+S` |
| Switch panels | `Ctrl+1-4` |
| Close modal | `Escape` |
| Confirm action | `Enter` |
| Cancel action | `Escape` |

---

### 3. Screen Reader Support

**Requirements:**
- All images have alt text
- Icons have aria-labels
- Form inputs have associated labels
- Dynamic content announced via aria-live
- Semantic HTML used throughout

**Implementation Examples:**

```html
<!-- Good: Icon with label -->
<button aria-label="Search findings">
  <i class="codicon codicon-search"></i>
  <span>Search</span>
</button>

<!-- Good: Form with label -->
<label for="rpc-url">RPC Endpoint</label>
<input id="rpc-url" type="text" />

<!-- Good: Live region -->
<div aria-live="polite" aria-atomic="false">
  {dynamicContent}
</div>

<!-- BAD: Icon without label -->
<button>
  <i class="codicon codicon-trash"></i>
</button> /* WRONG - no context */
```

---

### 4. Reduced Motion

**Requirements:**
- Respect `prefers-reduced-motion` setting
- Disable non-essential animations
- Replace animations with static states where possible

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Exceptions:**
- Loading spinners → Replace with indeterminate progress bar
- Collapsible sections → Instant open/close
- Hover effects → Instant color change

---

### 5. Focus Management

**Requirements:**
- Trap focus in modals
- Return focus to trigger element on close
- Manage focus programmatically for dynamic content

**Implementation:**
```typescript
function useFocusTrap(containerRef: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    first?.focus();
    
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

---

### 6. Semantic HTML

**Requirements:**
- Use proper heading hierarchy (h1 → h2 → h3)
- Use `<button>` for actions, not `<div>`
- Use `<article>` for independent content blocks
- Use `<nav>` for navigation

**Common Mistakes to Avoid:**
```html
<!-- BAD -->
<div onclick="handleClick()">Click me</div>

<!-- GOOD -->
<button onClick={handleClick}>Click me</button>

<!-- BAD -->
<div role="button">Click me</div>

<!-- GOOD -->
<button>Click me</button>
```

---

## Testing Checklist

### Automated Testing
- [ ] Run axe DevTools extension in VS Code
- [ ] Run Lighthouse accessibility audit
- [ ] Test with Windows Narrator
- [ ] Test with macOS VoiceOver
- [ ] Test with NVDA (Windows)

### Manual Testing
- [ ] Navigate entire interface using only keyboard
- [ ] Zoom to 200% and verify no content loss
- [ ] Test with high contrast mode enabled
- [ ] Test with reduced motion enabled
- [ ] Verify all colors meet contrast requirements

---

## Known Issues to Address

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing aria-labels on codicons | Medium | Add aria-label to all icon buttons |
| No keyboard shortcut for memory search | Low | Add `Ctrl+Shift+M` |
| Focus trap missing in modals | High | Implement focus trap hook |
| Animation not respecting reduced motion | High | Add media query for all animations |

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [VS Code Extension Accessibility Guide](https://code.visualstudio.com/api/extension-guides/accessibility)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
