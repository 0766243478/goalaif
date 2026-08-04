# Progress Indicators Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Visual indicators that show the state of ongoing operations. Three types: spinner, progress bar, and skeleton.

---

## Spinner

For indeterminate or unknown-duration operations:

```tsx
function Spinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizes = { sm: 16, md: 24, lg: 32 };
  
  return (
    <span 
      className={`spinner spinner-${size}`}
      role="status"
      aria-label={label || "Loading"}
    >
      <svg width={sizes[size]} height={sizes[size]} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
      </svg>
    </span>
  );
}
```

```css
.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

.spinner svg circle {
  stroke-dasharray: 32;
  stroke-dashoffset: 24;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    opacity: 0.6;
  }
}
```

---

## Progress Bar

For operations with known progress:

```tsx
function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  return (
    <div className="progress-bar-container" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      <span className="progress-bar-text">{progress}%</span>
    </div>
  );
}
```

```css
.progress-bar-container {
  height: 4px;
  background-color: var(--vscode-progressBar-background);
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--sireen-purple);
  transition: width var(--duration-normal) ease;
}

.progress-bar-text {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}
```

---

## Skeleton Loading

For content placeholders during initial load:

```tsx
function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton-line"
          style={{ width: `${100 - (i * 10)}%` }}
        />
      ))}
    </div>
  );
}
```

```css
.skeleton-line {
  height: 12px;
  background: linear-gradient(
    90deg,
    var(--vscode-sideBar-background) 0%,
    var(--vscode-list-hoverBackground) 50%,
    var(--vscode-sideBar-background) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line {
    animation: none;
    background-color: var(--vscode-list-hoverBackground);
  }
}
```

---

## Usage Guidelines

| Scenario | Pattern | Example |
|----------|---------|---------|
| API call | Spinner | Chat message generation |
| File upload | Progress bar | Importing contracts |
| Initial load | Skeleton | View rendering |
| Short delay (<100ms) | None | Button hover |
