# Memory Search Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Fuzzy search across saved security memory entries. Supports prefix matching and highlights matches.

---

## Search UI

```tsx
function MemorySearch({ 
  query, 
  onChange,
  results 
}: {
  query: string;
  onChange: (q: string) => void;
  results: MemoryEntry[];
}) {
  return (
    <div className="memory-search">
      <div className="search-input-wrapper">
        <i className="codicon codicon-search"></i>
        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search memories..."
          aria-label="Search security memories"
        />
        {query && (
          <button 
            className="clear-button"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            <i className="codicon codicon-close"></i>
          </button>
        )}
      </div>
      
      {query && (
        <div className="search-results">
          {results.length === 0 ? (
            <EmptyState 
              icon="search"
              title="No results"
              description="Try a different search term"
            />
          ) : (
            results.map(entry => (
              <MemoryResultItem 
                key={entry.id}
                entry={entry}
                highlight={query}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Fuzzy Search Implementation

```typescript
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === lowerQuery.length;
}

function highlightMatches(text: string, query: string): ReactNode {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : part
  );
}
```

---

## Result Item

```tsx
function MemoryResultItem({ entry, highlight }: Props) {
  return (
    <div className="memory-result-item">
      <div className="result-title">
        {highlightMatches(entry.title, highlight)}
      </div>
      <div className="result-content">
        {highlightMatches(entry.content.slice(0, 100), highlight)}...
      </div>
      <div className="result-meta">
        <span className="collection-tag">{entry.collection}</span>
        <span className="match-score">{entry.score.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

---

## Debounced Search

```typescript
function useDebouncedSearch(query: string, delay: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [query, delay]);
  
  return debouncedQuery;
}
```

---

## Accessibility

- **Live Region:** Announce result count
- **Clear Button:** Visible only when searching
- **Highlight:** Use `<mark>` element for semantic highlighting
