# MemoryLayout Component

> **Date:** 2026-08-02  
> **Type:** View Layout  
> **Status:** Ready for Implementation

---

## Overview

MemoryLayout displays saved security insights with collection tabs and search capabilities.

---

## Structure

```tsx
interface MemoryLayoutProps {
  entries: MemoryEntry[];
  collections: Collection[];
  activeCollection: string;
  searchQuery: string;
  onCollectionChange: (collection: string) => void;
  onSearchChange: (query: string) => void;
}
```

```tsx
<div class="memory-layout">
  <MemoryTabs 
    collections={collections}
    active={activeCollection}
    onChange={handleCollectionChange}
  />
  <MemorySearch 
    query={searchQuery}
    onChange={handleSearchChange}
  />
  <MemoryList 
    entries={filteredEntries}
    onSelect={handleSelect}
  />
</div>
```

---

## CSS

```css
.memory-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.memory-tabs {
  display: flex;
  border-bottom: 1px solid var(--vscode-sideBar-border);
  padding: 0 var(--space-2);
}

.memory-tab {
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: border-color var(--duration-fast) ease;
}

.memory-tab.active {
  border-bottom-color: var(--sireen-amber);
  color: var(--vscode-sideBar-foreground);
}

.memory-search {
  padding: var(--space-2);
  border-bottom: 1px solid var(--vscode-sideBar-border);
}

.memory-list {
  flex: 1;
  overflow-y: auto;
}

.memory-entry {
  padding: var(--space-2);
  border-bottom: 1px solid var(--vscode-sideBar-border);
  cursor: pointer;
}

.memory-entry:hover {
  background-color: var(--vscode-list-hoverBackground);
}
```

---

## Accessibility

- **Tabs:** Use `role="tablist"` and `role="tab"`
- **Search:** Include clear button with aria-label
- **Entries:** Announce similarity scores for screen readers
