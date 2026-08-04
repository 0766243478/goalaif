# Prompt Composer Component

> **Status:** Proposed  
> **Component Count:** 24 of 40+

---

## Definition

An enhanced chat input with structured prompt building capabilities. Allows users to compose complex queries with context, templates, and parameters.

---

## Structure

```
┌─────────────────────────────────────────────────┐
│  💬 Compose prompt...                       [⌘K]│
├─────────────────────────────────────────────────┤
│  Context: [VulnerableVault.sol          ▼]     │
│  Mode:    [Audit     ▼]  [Deep Scan    ▼]      │
│  Focus:   [All Areas            ]              │
│                                           [➤] │
└─────────────────────────────────────────────────┘
```

---

## Properties

```typescript
interface PromptComposerProps {
  onSubmit: (prompt: PromptConfig) => void;
  context?: ProjectContext;
  templates?: PromptTemplate[];
  placeholder?: string;
}

interface PromptConfig {
  text: string;
  context: string[];
  mode: 'audit' | 'deep-scan' | 'quick-check' | 'research';
  focus?: string;
  parameters?: Record<string, any>;
}
```

---

## Templates

| Template | Pattern | Use Case |
|----------|---------|----------|
| Audit | "Analyze {contract} for {vulnerability}" | Targeted scan |
| Compare | "Compare {A} vs {B} security" | Security review |
| Fix | "Patch {finding} in {file}" | Remediation |
| Explain | "Explain {pattern} vulnerability" | Education |

---

## Features

- **Slash commands**: `/audit`, `/compare`, `/fix`, `/explain`
- **Context picker**: Select from open files
- **Parameter injection**: Auto-fill project variables
- **History**: Recent prompts available
- **Suggestions**: AI-powered completions

---

## Usage Examples

```tsx
<PromptComposer
  onSubmit={handlePrompt}
  context={projectContext}
  templates={commonTemplates}
/>
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Submit |
| Shift+Enter | New line |
| Cmd/Ctrl+K | Open history |
| Tab | Accept suggestion |
| Escape | Clear |
