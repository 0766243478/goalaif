# Settings Screen Specification

> **File:** `views/SettingsView.tsx`  
> **Purpose:** Extension configuration and preferences

---

## Purpose

Manage API keys, appearance settings, and extension behavior.

## Primary User

Extension administrators and power users.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Settings                                           │
├─────────────────────────────────────────────────────┤
│  API Configuration                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │  OpenRouter API Key                          │  │
│  │  [••••••••••••••••••••••••••••••••••••••••] │  │
│  │                        [👁 Show] [Save]      │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Display                                            │
│  ☑ Enable animations                                │
│  ☑ Show line numbers in code blocks                 │
│  Font Size: [12px ▼]                               │
├─────────────────────────────────────────────────────┤
│  About                                                │
│  SIREEN v1.0.0                                    │
│  Built with VS Code Extension APIs                  │
└─────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate between fields |
| `Enter` | Save setting |
| `Escape` | Cancel changes |

## Acceptance Criteria

- [ ] API key input masks by default
- [ ] Settings persist across sessions
- [ ] Validation on save
- [ ] All inputs have labels
