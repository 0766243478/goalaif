# File Tree Component

> **Status:** Proposed  
> **Component Count:** 21 of 40+

---

## Definition

A collapsible tree view displaying project file structure. Used in sidebar navigation and file browser contexts.

---

## Structure

```
📁 contract/
├── 📄 VulnerableVault.sol
├── 📄 Token.sol
├── 📁 interfaces/
│   └── 📄 IVault.sol
└── 📁 test/
    ├── 📄 ReentrancyPoC.t.sol
    └── 📄 TokenTest.t.sol

📁 lib/
├── 📁 forge-std/
│   └── 📄 src/
└── 📁 openzeppelin/
    └── 📄 contracts/
```

---

## Properties

```typescript
interface FileTreeProps {
  files: FileNode[];
  selectedPath?: string;
  onSelect?: (path: string) => void;
  expandAll?: boolean;
  maxDepth?: number;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isSelected?: boolean;
  isOpen?: boolean;
}
```

---

## Icons

| Type | Icon | Color |
|------|------|-------|
| Directory closed | ▶ | var(--text-muted) |
| Directory open | ▼ | var(--text-primary) |
| Solidity file | 💎 | var(--accent-purple) |
| Test file | 🧪 | var(--success-green) |
| Interface | 🔗 | var(--accent-blue) |
| JSON/YAML | 📋 | var(--text-muted) |
| Selected | → | var(--accent-blue) |

---

## Features

- **Collapse/Expand**: Click folder to toggle
- **Search filter**: Filter by filename pattern
- **Breadcrumb**: Show current path
- **Drag & drop**: Reorganize (future)
- **Multi-select**: Shift+click range select

---

## Accessibility

- `role="tree"` with `role="treeitem"`
- Arrow keys navigate nodes
- Enter activates file
- Space toggles folders
- ARIA expanded states

---

## Usage Examples

```tsx
<FileTree
  files={projectFiles}
  selectedPath="/contract/VulnerableVault.sol"
  onSelect={(path) => openFile(path)}
  maxDepth={3}
/>
```
