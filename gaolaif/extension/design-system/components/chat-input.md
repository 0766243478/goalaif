# ChatInput Component

> **File:** `components/ChatInput.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Multi-line text input for chat conversations with slash command support.

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  💬 Ask Sireen anything about your code...          │
│                                                 [➤] │
└─────────────────────────────────────────────────────┘
```

When focused:
```
┌─────────────────────────────────────────────────────┐
│  /                                              [➤] │
│  ┌──────────────────────────────────────────────┐  │
│  │ /analyze  Analyze current contract          │  │
│  │ /findings   Show vulnerability list         │  │
│  │ /exploit    Generate PoC                    │  │
│  │ /simulate   Run in sandbox                  │  │
│  │ /memory     Save to memory                  │  │
│  │ /clear      Clear conversation              │  │
│  │ /settings   Open settings                   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface ChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (message: string) => void;
  onSlashCommand?: (command: string, args: string) => void;
  placeholder?: string;
  disabled?: boolean;
  context?: string; // Current context info
  className?: string;
}
```

## Features

### Auto-expand
- Starts at single line
- Expands up to 6 lines
- Collapses when empty

### Slash Commands
- Triggered by typing `/`
- Filtered list based on prefix
- Keyboard navigable (↑↓ arrows)
- Enter to select, Escape to close

### Context Indication
- Shows current file/context above input
- Click to change context

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit |
| `Shift+Enter` | New line |
| `Escape` | Close command palette |
| `↑` / `↓` | Navigate commands |
| `Tab` | Accept suggestion |

## Accessibility

- `aria-label="Chat input"`
- `aria-describedby` for context hint
- Command palette as `role="listbox"`
- Active command as `aria-selected`

## CSS

```css
.chat-input {
  position: relative;
  width: 100%;
}

.chat-input__textarea {
  width: 100%;
  min-height: 40px;
  max-height: 200px;
  padding: var(--space-2) var(--space-3);
  padding-right: 40px;
  background: var(--sireen-abyss);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-md);
  color: var(--sireen-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  resize: none;
  outline: none;
  transition: border-color var(--duration-fast) ease;
}

.chat-input__textarea:focus {
  border-color: var(--sireen-info);
  box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
}

.chat-input__submit {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-2);
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--sireen-accent-amber);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-input__submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-input__context {
  font-size: var(--text-xs);
  color: var(--sireen-text-muted);
  padding: var(--space-1) var(--space-2);
  margin-bottom: var(--space-1);
  border-radius: var(--radius-sm);
  background: var(--sireen-surface);
}

/* Command Palette */
.chat-input__commands {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: var(--space-2);
  background: var(--sireen-surface);
  border: 1px solid var(--sireen-border);
  border-radius: var(--radius-md);
  max-height: 200px;
  overflow-y: auto;
}

.chat-input__command {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  cursor: pointer;
}

.chat-input__command--selected {
  background: var(--sireen-hover);
}
```

## Anti-Patterns

- ❌ Single-line only (limits complex queries)
- ❌ No keyboard navigation in command palette
- ❌ Submit on Enter without Shift+Enter for newlines
- ❌ Hidden context information

## Examples

```tsx
<ChatInput
  placeholder="Ask about your contract..."
  onSubmit={(msg) => sendMessage(msg)}
  onSlashCommand={(cmd, args) => handleCommand(cmd, args)}
  context="VulnerableVault.sol"
/>
```
