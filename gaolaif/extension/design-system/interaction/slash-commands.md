# Slash Commands Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

Slash commands provide discoverable AI interactions. Users type `/` to see available commands with descriptions.

---

## Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `/analyze` | Analyze current contract | `Ctrl+Shift+A` |
| `/findings` | Show current findings | — |
| `/exploit` | Generate exploit for selected finding | `Ctrl+Shift+E` |
| `/simulate` | Run simulation in sandbox | `Ctrl+Shift+S` |
| `/memory` | Search security memory | — |
| `/clear` | Clear conversation history | — |
| `/settings` | Open settings | — |

---

## Implementation

### Command Palette Trigger

```tsx
function ChatInput({ onCommand }: Props) {
  const [showCommands, setShowCommands] = useState(false);
  const [filter, setFilter] = useState('');
  
  const handleChange = (value: string) => {
    set.value(value);
    setShowCommands(value.startsWith('/'));
    if (value.startsWith('/')) {
      setFilter(value.slice(1));
    }
  };
  
  return (
    <div className="chat-input-container">
      <textarea 
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {showCommands && (
        <CommandPalette 
          commands={filteredCommands}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
```

### Command Palette Component

```tsx
function CommandPalette({ commands, onSelect }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(commands[selectedIndex]);
    }
  };
  
  return (
    <div className="command-palette" role="listbox">
      {commands.map((cmd, index) => (
        <div 
          key={cmd.name}
          className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
          role="option"
          aria-selected={index === selectedIndex}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => onSelect(cmd)}
        >
          <span className="command-name">{cmd.name}</span>
          <span className="command-desc">{cmd.description}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Keyboard Navigation

- **Arrow Down:** Move selection down
- **Arrow Up:** Move selection up
- **Enter:** Execute selected command
- **Escape:** Close palette
- **Type:** Filter commands by name

---

## Accessibility

- **Role Attributes:** Use `role="listbox"` and `role="option"`
- **Keyboard Focus:** Manage focus within palette
- **Screen Reader:** Announce command count and selection

```html
<div role="listbox" aria-label="Available commands">
  <div role="option" aria-selected="true">/analyze - Analyze current contract</div>
  <div role="option" aria-selected="false">/findings - Show current findings</div>
</div>
```
