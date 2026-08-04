# ChatMessage Component

> **File:** `components/ChatMessage.tsx`  
> **Status:** ✅ Implemented (production)  
> **Design Spec:** Formalized specification

---

## Purpose

Display individual chat messages with proper styling for user/AI/content types.

## Anatomy

```
┌─────────────────────────────────────────────────────┐
│  👤  User Message                          10:23 AM │
│  Find reentrancy bugs in this contract             │
├─────────────────────────────────────────────────────┤
│  🤖  AI Response                            10:23 AM │
│  I found 3 potential reentrancy issues...          │
│  ┌──────────────────────────────────────────────┐  │
│  │  ```solidity                                  │  │
│  │  // Exploit code...                          │  │
│  │  ```                                          │  │
│  │                              [📋 Copy]       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Props

```typescript
interface ChatMessageProps {
  message: ChatMessage;
  showTimestamp?: boolean;
  showAvatar?: boolean;
  onCopy?: (text: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    toolCalls?: ToolCall[];
    citations?: Citation[];
  };
}
```

## Variants

| Role | Avatar | Alignment | Background |
|------|--------|-----------|------------|
| user | 👤 or initial | Right | `--sireen-raised` |
| assistant | 🤖 or bot icon | Left | Transparent |
| system | ⚙️ | Center | `--sireen-amber-bg` |

## States

| State | Visual |
|-------|--------|
| Loading | Typing indicator dots |
| Streaming | Blinking cursor at end |
| Error | Red border, error icon |
| Complete | Normal display with actions |

## Accessibility

- `role="article"` for each message
- `aria-label` with speaker and timestamp
- `aria-live="polite"` container for streaming
- Keyboard accessible copy button

## CSS

```css
.chat-message {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) 0;
  max-width: 85%;
}

.chat-message--user {
  align-self: flex-end;
}

.chat-message--assistant {
  align-self: flex-start;
}

.chat-message__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--sireen-text-muted);
}

.chat-message__avatar {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
}

.chat-message--user .chat-message__avatar {
  background: var(--sireen-accent-purple);
}

.chat-message--assistant .chat-message__avatar {
  background: var(--sireen-accent-cyan);
}

.chat-message__content {
  padding: var(--space-2);
  border-radius: var(--radius-md);
  line-height: var(--line-height-body);
}

.chat-message--user .chat-message__content {
  background: var(--sireen-raised);
}

.chat-message--assistant .chat-message__content {
  background: transparent;
}
```

## Anti-Patterns

- ❌ No distinction between user/AI messages
- ❌ Timestamps always visible (clutter)
- ❌ Long messages without word-wrap

## Examples

```tsx
<ChatMessage
  message={message}
  showTimestamp={true}
  onCopy={(text) => copyToClipboard(text)}
/>
```
