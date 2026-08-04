# Settings Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  API Configuration                           [💾] │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                 │   │
│  │  OpenRouter API Key:                            │   │
│  │  [sk-or-v1-•••••••••••••••••••••••••••••••••]  │   │
│  │                                                 │   │
│  │  ••••••••••••••••••••••••••••••••••••••••••••   │   │
│  │  [Show] [Hide]                                  │   │
│  │                                                 │   │
│  │  Model: [gpt-4-mini         ▼]                 │   │
│  │                                                 │   │
│  │  [Save Changes]                                 │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Appearance                                     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                 │   │
│  │  Theme:                                         │   │
│  │  (• Dark)  (○ Light)  (○ Auto)                  │   │
│  │                                                 │   │
│  │  Accent Color:                                  │   │
│  │  [■] [■] [■] [■] [■] [■]                       │   │
│  │  Blue            Purple         Red            │   │
│  │                                                 │   │
│  │  Font Size:                                     │   │
│  │  [−] ●●●●●○○○○○○ ○ [+]                          │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Sandbox                                        │   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                 │   │
│  │  Default RPC:                                   │   │
│  │  [https://eth.llamarpc.com_______________]     │   │
│  │                                                 │   │
│  │  Timeout: [30] seconds                          │   │
│  │                                                 │   │
│  │  [Test Connection]                              │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Data                                          [⚠]│   │
│  ├─────────────────────────────────────────────────┤   │
│  │                                                 │   │
│  │  [Export All Data]                              │   │
│  │  [Clear Findings History]                       │   │
│  │  [Reset to Defaults]                            │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 500-600px
- **Height:** Scrollable form sections
- **Sections:** Stacked cards with dividers

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Form sections | Body | Stacked, auto height |
| Actions | Bottom of each section | Right-aligned |

## Visual Hierarchy

1. **Section headers** — 14px, bold, muted color
2. **Labels** — 11px, above inputs
3. **Inputs** — 12px, bordered, focused state
4. **Actions** — Primary button style for saves

## User Journey

```
1. User opens Settings view
2. Scrolls through sections
3. Modifies API key (clicks Show/Hide)
4. Selects theme preference
5. Tests sandbox connection
6. Saves changes → Confirmation toast
7. Optional: exports data or resets
```
