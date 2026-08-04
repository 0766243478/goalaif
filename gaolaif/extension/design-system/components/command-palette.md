# Command Palette Component

> **Status:** Proposed  
> **Component Count:** 23 of 40+

---

## Definition

An overlay search interface for quick command execution. Inspired by VS Code's Command Palette, providing keyboard-first navigation through all SIREEN actions.

---

## Trigger

- **Keyboard**: `Cmd/Ctrl+Shift+P`
- **Button**: In toolbar (optional)

---

## Structure

```
┌─────────────────────────────────────────────┐
│  🔍 Run command...                          │
├─────────────────────────────────────────────┤
│  › Analyze Contract              Cmd+A     │
│    Generate Report               Cmd+R     │
│    Open Settings                 Cmd+,     │
│    ─────────────────────────────────       │
│    View Findings                  F2       │
│    View Chat                      F1       │
│    View Simulation                F3       │
│    ─────────────────────────────────       │
│    Recent:                           │      │
│    Audit VulnerableVault.sol                    │
│    Generate PoC for reentrancy                │
└─────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface CommandPaletteProps {
  commands: Command[];
  onChange?: (query: string) => void;
  onSelect?: (command: Command) => void;
  onClose?: () => void;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category?: string;
  icon?: React.ReactNode;
  action: () => void | Promise<void>;
}
```

---

## Features

- **Fuzzy matching**: Type partial matches ("ana co" → "Analyze Contract")
- **Category grouping**: Commands organized by section
- **Keyboard navigation**: Arrow keys, Enter, Escape
- **Recent commands**: Quick access to last 5 used
- **Context aware**: Show relevant commands based on view

---

## Accessibility

- Modal behavior (focus trap)
- Live region for results count
- Announce selections
- Escape closes palette

---

## Example Commands

```typescript
const sirenCommands: Command[] = [
  {
    id: 'audit',
    label: 'Analyze Contract',
    description: 'Start security audit',
    shortcut: 'Cmd+A',
    action: startAudit
  },
  {
    id: 'export',
    label: 'Export Report',
    description: 'Generate findings report',
    shortcut: 'Cmd+E',
    action: openExportDialog
  },
  {
    id: 'settings',
    label: 'Open Settings',
    description: 'Configure SIREEN',
    shortcut: 'Cmd+,',
    action: navigateToSettings
  }
];
```
