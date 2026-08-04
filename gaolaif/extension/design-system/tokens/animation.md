# Animation Tokens

> **Date:** 2026-08-02  
> **Principle:** Functional animations only. No decorative motion. Respect prefers-reduced-motion.

---

## Allowed Animations

### 1. Hover States (Micro-interactions)
```css
/* Duration: 0.15s — snappy, responsive */
transition: background-color 0.15s ease, color 0.15s ease;

/* Usage: Button hovers, list item hovers, link hovers */
```

### 2. Focus Indicators
```css
/* Duration: 0s — instant, no animation */
transition: outline-offset 0s;

/* Usage: Keyboard focus rings */
:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

### 3. Loading Spinners
```css
/* Duration: 1s — continuous loop */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### 4. Progress Bars
```css
/* Duration: Depends on operation */
.progress-bar {
  transition: width 0.3s ease; /* Smooth width changes */
}
```

### 5. Collapsible Sections
```css
/* Duration: 0.2s — quick collapse/expand */
.collapsible-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease, padding 0.2s ease;
}

.collapsible-content.open {
  max-height: 500px; /* Or appropriate max */
}
```

---

## Forbidden Animations

| Animation Type | Why Forbidden | Alternative |
|----------------|---------------|-------------|
| **Glow effects** | Decorative, distracts from content | Border accents, opacity changes |
| **Pulse animations** | Creates anxiety, wastes battery | Static status indicators |
| **Particle systems** | Heavy, inaccessible | None needed |
| **Page transitions** | Disrupts workflow | Instant view switches |
| **Bouncing elements** | Unprofessional, distracting | Static positioning |
| **Color cycling** | Accessibility hazard | Static colors with opacity shifts |

---

## Reduced Motion Support

**Mandatory:** All animations must respect `prefers-reduced-motion`.

```css
/* Global reduced motion support */
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

### Exceptions
The following MUST work without animation:
- Loading spinners → Replace with indeterminate progress bar
- Collapsible sections → Instant open/close (no transition)
- Hover states → Instant color change (no transition)

---

## Animation Duration Tokens

Define these as CSS variables for consistency:

```css
:root {
  /* Micro-interactions */
  --duration-fast: 0.15s;
  
  /* Standard transitions */
  --duration-normal: 0.2s;
  
  /* Longer animations */
  --duration-slow: 0.3s;
  
  /* Continuous loops */
  --duration-spin: 1s;
}
```

### Usage Examples
```css
/* Button hover */
button {
  transition: background-color var(--duration-fast) ease;
}

/* Collapsible section */
.collapsible {
  transition: max-height var(--duration-normal) ease;
}

/* Progress bar fill */
.progress {
  transition: width var(--duration-slow) ease;
}

/* Loading spinner */
.spinner {
  animation: spin var(--duration-spin) linear infinite;
}
```

---

## Current Violations to Fix

### Violation 1: Decorative Glow Animation
```css
/* CURRENT (WRONG) — Decorative, infinite loop */
@keyframes glowCritical {
  0%, 100% { box-shadow: 0 0 8px var(--glow-critical); }
  50% { box-shadow: 0 0 16px var(--glow-critical); }
}

.critical-finding {
  animation: glowCritical 2s infinite; /* REMOVE */
}

/* FIXED — Remove entirely */
.critical-finding {
  border-left: 3px solid var(--vscode-errorForeground);
}
```

### Violation 2: Missing Reduced Motion Support
```css
/* CURRENT (WRONG) — No reduced motion support */
/* No @media query for prefers-reduced-motion */

/* FIXED — Add global support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Guidelines

| Animation Type | Max Duration | FPS Target | CPU Impact |
|----------------|--------------|------------|------------|
| Hover transitions | 0.15s | 60fps | Low |
| Focus indicators | 0s (instant) | N/A | None |
| Loading spinners | 1s (loop) | 60fps | Low |
| Progress bars | 0.3s | 60fps | Low |
| Collapsible sections | 0.2s | 60fps | Low |

**Never animate:**
- Opacity alone (causes repaint)
- Width/height on scroll containers
- Multiple simultaneous animations on same element

**Best practice:** Use `transform` and `opacity` only for GPU-accelerated animations.
