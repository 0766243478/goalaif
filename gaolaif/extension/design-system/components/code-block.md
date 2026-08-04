# CodeBlock Component

> **Date:** 2026-08-02  
> **Type:** Content Display  
> **Status:** Ready for Implementation

---

## Overview

CodeBlock displays syntax-highlighted code with language detection and copy functionality. Uses VS Code's built-in Monaco editor or lightweight syntax highlighting.

---

## Implementation Options

### Option 1: Monaco Editor (Recommended for Editable Code)
```tsx
import { Monaco } from '@codingame/monaco-vscode-editor-api';

<Monaco
  language="solidity"
  value={code}
  options={{
    fontSize: 13,
    lineHeight: 1.6,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  }}
/>
```

### Option 2: Lightweight Highlighting (For Read-Only Display)
```tsx
import Highlight from 'react-highlight.js';
import 'highlight.js/styles/vs2015.min.css';

<Highlight language="solidity" className="sireen-code-block">
  {code}
</Highlight>
```

---

## Styles

```css
.sireen-code-block {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--vscode-editorLineNumber.foreground, rgba(128,128,128,0.2));
  overflow-x: auto;
}

.sireen-code-block pre {
  margin: 0;
}

.sireen-code-block code {
  font-family: inherit;
}
```

---

## Features

### Copy Button
Always include a copy button in the header.

```tsx
<div class="code-block-header">
  <span class="language-tag">solidity</span>
  <Button variant="ghost" size="sm" icon="copy" onClick={handleCopy}>
    Copy
  </Button>
</div>
```

### Line Numbers (Optional)
Enable for larger code blocks (>20 lines).

```tsx
<Monaco options={{ lineNumbers: 'on', ... }} />
```

---

## Accessibility

- **Language Label:** Announce language to screen readers
- **Copy Feedback:** Announce "Code copied to clipboard" via aria-live
- **Keyboard Navigation:** Tab to copy button, Enter to activate

```html
<div class="sireen-code-block" role="region" aria-label="Solidity code">
  <pre><code>...</code></pre>
  <button aria-label="Copy code to clipboard">
    <i class="codicon codicon-copy"></i>
  </button>
</div>
```

---

## Do's and Don'ts

### ✅ DO
```css
/* Use VS Code editor tokens */
background-color: var(--vscode-editor-background);
color: var(--vscode-editor-foreground);

/* Monospace font only for code */
font-family: "JetBrains Mono", monospace;

/* Appropriate line height for code */
line-height: 1.6;
```

### ❌ DON'T
```css
/* Mixed fonts */
font-family: system-ui; /* WRONG for code blocks */

/* Too tight line height */
line-height: 1.2; /* WRONG — hard to read */

/* Hardcoded colors */
background: #1e1e1e; /* WRONG — breaks themes */
```
