# Chat Screen Specification

> **File:** `views/ChatView.tsx`  
> **Purpose:** AI-powered conversation interface for smart contract security analysis

---

## Purpose

Allow users to ask natural-language questions about their contract code and receive AI-generated security analysis, vulnerability suggestions, and code patches.

## Primary User

Smart contract security researchers, auditors, and developers who need conversational assistance with contract analysis.

## User Goals

1. Ask a question about contract security without navigating away from code
2. Get actionable vulnerability insights with PoC-ready exploits
3. Understand findings in context of specific functions/lines
4. Receive patch suggestions they can apply directly

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Chat                                              │
│  Ask Sireen anything about your code               │
├─────────────────────────────────────────────────────┤
│  [Pipeline Progress Bar - collapsible]             │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │  🤖  Analyzing attack surface...             │  │
│  │     Streaming response...                    │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  👤  Find reentrancy bugs                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  [Empty State or Message List]                      │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [ChatInput: placeholder + slash command trigger]   │
└─────────────────────────────────────────────────────┘
```

**Dimensions:** Full panel width (~600-800px), fills available height

## Component Tree

```
ChatView
├── Header (title + subtitle)
├── AuditProgressBar (shared layout component)
├── MessageList
│   ├── EmptyState (if no messages)
│   ├── StarterQuestions (grid of 4 buttons)
│   └── MessageItem[]
│       ├── ChatMessage (user/AI)
│       └── CodeBlock (in AI responses)
└── ChatInput
    ├── textarea
    ├── SlashCommandTrigger (/)
    └── SendButton
```

## Information Hierarchy

1. **Title** — `font-size: var(--text-xl); font-weight: 600`
2. **Subtitle** — `font-size: var(--text-xs); color: var(--sireen-text-muted)`
3. **Progress bar** — Collapsible, below header
4. **Messages** — Chronological, user right-aligned, AI left-aligned
5. **Input** — Fixed at bottom, auto-expanding textarea

## Navigation

- **Entry point:** Click "Chat" icon in LeftSidebar (position 1)
- **Switch views:** Keyboard shortcuts `Ctrl+1` through `Ctrl+4`
- **Context switching:** New chat clears conversation; no thread management in v1.0

## User Flows

### Primary Flow: Ask a Question

```
1. User types question → Enter sends
2. UI shows ThinkingIndicator with steps
3. AI streams response character-by-character
4. Response appears with typing indicator during stream
5. On complete, ThinkingIndicator disappears
6. New message added to history
7. Scroll to bottom (debounced)
```

### Edge Case: API Error

```
1. API returns 4xx/5xx
2. Error toast appears (top-right)
3. Error message displayed in chat as system note
4. Retry button offered
```

### Edge Case: Rate Limit

```
1. API returns 429
2. Specific "rate limit" UI shown
3. Countdown timer until retry allowed
4. Alternative model suggestion offered
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Clear input / stop streaming |
| `Ctrl+/` | Open command palette |
| `↑` / `↓` | Navigate starter questions when focused |
| `Ctrl+K` | Focus input |

## States

### Empty State
```markdown
Title: "SIREEN"
Description: "How can I help with this contract?"
Action: 4 starter question buttons
Icon: Large SIREEN logo (amber)
```

### Loading State (Thinking)
```markdown
- ThinkingIndicator with step list
- Each step: "Analyzing...", "Checking patterns...", "Generating..."
- Bounce animation (CSS keyframe)
- Interruptible with Escape
```

### Streaming State
```markdown
- Character-by-character reveal
- Blinking cursor at end
- Copy button appears after complete
- Auto-scroll follows new content
```

### Error State
```markdown
- System message: "Connection error. Please try again."
- Retry button
- Toast notification
```

### Success State
```markdown
- AI response fully rendered
- Code blocks syntax-highlighted
- "Copy" button on code blocks
- "Apply Patch" button if patch provided
```

## Edge Cases

1. **Very long messages** — Vertical expand with max-height constraint
2. **Rapid-fire questions** — Queue system prevents overlap
3. **Network interruption** — Optimistic update with rollback
4. **API key missing** — Redirect to Settings on first send
5. **Large code context** — Token limit warning shown

## AI Interactions

- **Context injection:** Current file, selected code, active session automatically included
- **Memory recall:** Previous findings referenced when relevant
- **Tool calls:** AI can trigger `/analyze`, `/findings`, `/exploit` internally
- **Streaming:** SSE-based character-by-character response
- **Interrupt:** Escape stops generation mid-stream

## Responsive Behavior

- **Min width:** 400px (mobile sidebar collapse)
- **Max width:** 900px (optimized for readability)
- **Font scaling:** Relative units only, no viewport breaks
- **Touch targets:** Minimum 44px for all buttons

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| `aria-live="polite"` | On message container for screen reader announcements |
| Focus trap | Input always reachable via Tab |
| Keyboard shortcuts | All actions available without mouse |
| Color contrast | All text meets 4.5:1 AA minimum |
| Reduced motion | Disable ThinkingIndicator bounce |
| Labels | All inputs have visible or aria-label |

## Performance Requirements

- **Message render time:** <16ms per message (60fps)
- **Stream latency:** <100ms between characters
- **Virtualization threshold:** >100 messages use VirtualList
- **Bundle size:** Chat-related code ≤50KB gzipped

## Acceptance Criteria

- [ ] Messages persist across webview reloads (IndexedDB)
- [ ] Streaming works with SSE from backend
- [ ] Escape stops generation and clears input
- [ ] All keyboard shortcuts functional
- [ ] Error states display without crash
- [ ] Mobile responsive at 375px width
- [ ] Screen reader announces new messages
- [ ] No hardcoded colors (uses tokens only)
- [ ] Loading/empty/error states implemented
- [ ] Time-based sorting confirmed (newest at bottom)
