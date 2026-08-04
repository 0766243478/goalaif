# Diff Viewer Component

> **Status:** Proposed  
> **Component Count:** 22 of 40+

---

## Definition

A side-by-side or inline comparison view showing differences between two versions of code. Used for patch preview and change review.

---

## Layout Options

### Side-by-Side
```
┌─────────────────────┬─────────────────────┐
│  Original           │  Modified           │
├─────────────────────┼─────────────────────┤
│  function withdraw()│  function withdraw()│
│  {                 │  {                  │
│    state.balance--;│    require(         │
│    call(sender);    │      !locked,      │
│                   │      "Reentrant");  │
│  }                 │    locked = true;   │
│                    │    state.balance--; │
│                    │    call(sender);    │
│                    │    locked = false;  │
│                    │  }                 │
└─────────────────────┴─────────────────────┘
```

### Inline
```
  function withdraw() {
-   state.balance--;
-   call(sender);
+   require(!locked, "Reentrant");
+   locked = true;
+   state.balance--;
    call(sender);
+   locked = false;
  }
```

---

## Properties

```typescript
interface DiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  mode?: 'side-by-side' | 'inline';
  showLineNumbers?: boolean;
  collapseWhitespace?: boolean;
}
```

---

## Line Types

| Type | Visual | Use |
|------|--------|-----|
| unchanged | No highlight | Context |
| added | Green bg + left gutter | New code |
| removed | Red bg + left gutter | Deleted code |
| modified | Yellow bg | Changed lines |

---

## Features

- **Word-level diff**: Highlight changed words
- **Ignore whitespace**: Skip blank line changes
- **Navigation**: Jump to next/prev hunk
- **Sync scroll**: Linked scrolling in side-by-side
- **Minimap**: Overview of changes

---

## Accessibility

- ARIA labels for added/removed lines
- Keyboard navigation between hunks
- High contrast for colorblind users
- Screen reader announcements

---

## Usage Examples

```tsx
<DiffViewer
  original={originalCode}
  modified={patchedCode}
  language="solidity"
  mode="side-by-side"
  showLineNumbers
/>
```
