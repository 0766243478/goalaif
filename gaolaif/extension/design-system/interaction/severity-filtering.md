# Severity Filtering Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Users filter findings by severity level (critical, high, medium, low). Multiple severities can be selected simultaneously.

---

## Filter UI

```tsx
interface SeverityFilterProps {
  currentFilters: SeverityOption[];
  onChange: (filters: SeverityOption[]) => void;
}

function SeverityFilter({ currentFilters, onChange }: SeverityFilterProps) {
  const severities: SeverityOption[] = ['critical', 'high', 'medium', 'low'];
  
  const toggleSeverity = (severity: SeverityOption) => {
    const next = currentFilters.includes(severity)
      ? currentFilters.filter(s => s !== severity)
      : [...currentFilters, severity];
    onChange(next);
  };
  
  return (
    <div className="severity-filter" role="group" aria-label="Filter by severity">
      {severities.map(severity => (
        <ToggleButton
          key={severity}
          label={severity}
          active={currentFilters.includes(severity)}
          onClick={() => toggleSeverity(severity)}
          severity={severity}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([])}
        disabled={currentFilters.length === 0}
      >
        Clear
      </Button>
    </div>
  );
}
```

---

## Toggle Button Style

```css
.toggle-button {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  border: 1px solid transparent;
}

.toggle-button[data-severity="critical"] {
  color: var(--sireen-critical-fg);
  background: color-mix(in srgb, var(--sireen-critical) 15%, transparent);
}

.toggle-button[data-severity="critical"].active {
  background: var(--sireen-critical);
  color: white;
}

.toggle-button[data-severity="high"] {
  color: var(--sireen-high-fg);
  background: color-mix(in srgb, var(--sireen-high) 15%, transparent);
}

/* ... similar for medium, low */
```

---

## Results Count

Show filtered count:

```tsx
<div className="filter-count">
  {filteredFindings.length} of {allFindings.length} findings
</div>
```

---

## Accessibility

- **Group Label:** Use `role="group"` with aria-label
- **Toggle State:** Announce active/inactive state
- **Keyboard:** Arrow keys to move between options, Space to toggle

```html
<div role="group" aria-label="Filter by severity">
  <button aria-pressed="true" data-severity="critical">
    Critical (3)
  </button>
  <button aria-pressed="false" data-severity="high">
    High (7)
  </button>
</div>
```
