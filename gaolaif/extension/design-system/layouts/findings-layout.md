# FindingsLayout Component

> **Date:** 2026-08-02  
> **Type:** View Layout  
> **Status:** Ready for Implementation

---

## Overview

FindingsLayout displays a virtualized list of security findings with filtering and sorting capabilities.

---

## Structure

```tsx
interface FindingsLayoutProps {
  findings: Finding[];
  filters: FindingFilters;
  onFilterChange: (filters: FindingFilters) => void;
  onSelectFinding: (finding: Finding) => void;
}
```

```tsx
<div class="findings-layout">
  <FindingsHeader 
    count={findings.length}
    onFilterChange={handleFilter}
  />
  <VirtualList
    items={filteredFindings}
    renderItem={renderFindingCard}
    itemHeight={120}
    overscanCount={5}
  />
</div>
```

---

## CSS

```css
.findings-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.findings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--vscode-sideBar-border);
}

.findings-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.findings-filters {
  display: flex;
  gap: var(--space-1);
}

.virtual-list {
  flex: 1;
  overflow-y: auto;
}

.finding-card {
  border-bottom: 1px solid var(--vscode-sideBar-border);
  padding: var(--space-2);
  cursor: pointer;
  transition: background-color var(--duration-fast) ease;
}

.finding-card:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.finding-card.selected {
  background-color: var(--vscode-list-activeSelectionBackground);
}
```

---

## Virtualization

For lists >50 items, use react-window or similar:

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={findings.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <FindingCard finding={findings[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## Filtering

Filter by severity:

```tsx
const severityFilters: SeverityOption[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
```

---

## Accessibility

- **Keyboard Navigation:** Arrow keys to navigate findings
- **Focus Indicator:** Visible outline on selected finding
- **ARIA Labels:** Announce count and filter options
