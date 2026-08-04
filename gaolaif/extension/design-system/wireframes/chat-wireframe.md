# Chat Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Chat                                [⚙️]             │
│  Ask Sireen anything about your code                    │
├─────────────────────────────────────────────────────────┤
│  [▶ Planning ██████████░░░░░░  65%]  [collapse ▼]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────┐                │
│              │    🤖 SIREEN LOGO      │                │
│              │                        │                │
│              │   How can I help?      │                │
│              │                        │                │
│              │  [Analyze contract]    │                │
│              │  [Find reentrancy]     │                │
│              │  [Generate PoC]        │                │
│              │  [Suggest patches]     │                │
│              └─────────────────────────┘                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ 👤  Find reentrancy bugs in this contract      │   │
│  │                                               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖  I found 2 potential reentrancy vectors:     │   │
│  │                                               │   │
│  │ 1. withdraw() - Line 45                      │   │
│  │    External call before state update...        │   │
│  │                                               │   │
│  │ 2. flashLoan() - Line 112                    │   │
│  │    Unchecked return value...                   │   │
│  │                                               │   │
│  │ Would you like me to generate PoC exploits?   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Context: VulnerableVault.sol                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💬 Ask about your contract...              [➤] │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 600-800px (panel width)
- **Height:** Fill available space
- **Margins:** 16px horizontal, 12px vertical

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px height |
| Progress bar | Below header | Full width, collapses when idle |
| Message list | Middle | Flex-grow, scrollable |
| Empty state | Center | If no messages |
| Context hint | Above input | Full width, 24px height |
| Input | Bottom | Full width, auto-expand |

## Visual Hierarchy

1. **Title** — 16px, bold, primary color
2. **Subtitle** — 11px, muted color
3. **Messages** — 12px, alternating alignment
4. **Input** — 12px, monospace font

## User Journey

```
1. User opens Chat view
2. Sees empty state with starter questions
3. Clicks starter question OR types query
4. Message appears (right-aligned)
5. Thinking indicator shows processing steps
6. AI response streams in (left-aligned)
7. User can copy code blocks, ask follow-up
8. Conversation builds over time
```
