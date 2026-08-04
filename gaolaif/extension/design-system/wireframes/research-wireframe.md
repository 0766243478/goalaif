# ResearchNotes Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Research Notes                              [📝 Edit]│
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Back: ◀                        ▼ New Note    │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Flash Loan Attack Patterns                             │
│  by researcher@example.com · Updated 2 hours ago      │
├─────────────────────────────────────────────────────────┤
│  Tags: [flashloan] [oracle] [manipulation] [+ Add]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Editor ──────────────────────────────────────────┐ │
│  │                                                   │ │
│  │  ## Analysis Summary                              │ │
│  │                                                   │ │
│  │  Flash loans have become increasingly common     │ │
│  │  attack vectors across multiple DeFi protocols.  │ │
│  │                                                   │ │
│  │  ### Common Patterns                              │ │
│  │                                                   │ │
│  │  1. **Oracle Manipulation**                      │ │
│  │     Attackers manipulate price feeds during     │ │
│  │     the same transaction as the flash loan.     │ │
│  │                                                   │ │
│  │  2. **Cross-Protocol Exploits**                  │ │
│  │     Using flash loans to interact with         │ │
│  │     multiple protocols in a single tx.          │ │
│  │                                                   │ │
│  │  3. **Liquidity Drain**                          │ │
│  │     Borrow against collateral without           │ │
│  │     repaying if collateral value drops.         │ │
│  │                                                   │ │
│  │  ### References                                   │ │
│  │                                                   │ │
│  │  - [Euler Finance Exploit](#)                    │ │
│  │  - [Compound Governance Attack](#)               │ │
│  │                                                   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Bold] [Italic] [Link] [Code] [Image] [Attachment 📎]│
├─────────────────────────────────────────────────────────┤
│  [💾 Save Draft]                      [🗑 Delete]     │
└─────────────────────────────────────────────────────────┘
```

## Layout Description

- **Width:** 700-900px (wider for editor)
- **Height:** Fill available space
- **Editor:** Monospace-capable rich text

## Component Placement

| Component | Position | Size |
|-----------|----------|------|
| Header | Top | Full width, 48px |
| Navigation | Below header | Left-aligned |
| Title area | Below nav | Full width |
| Tags | Below title | Left-aligned |
| Editor | Middle | Flex-grow |
| Toolbar | Below editor | Full width |
| Actions | Bottom | Right-aligned |

## Visual Hierarchy

1. **Title** — 20px, bold, primary color
2. **Meta** — 11px, muted color
3. **Content** — 13px, readable line length
4. **Toolbar** — Icon-only, hover reveals labels

## User Journey

```
1. User opens ResearchNotes view
2. Selects existing note or creates new
3. Edits markdown content
4. Adds tags for organization
5. Saves draft (auto-saved every 30s)
6. Can insert images/attachments
7. Navigates back to notes list
```
