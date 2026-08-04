# PoC Generation Pattern

> **Date:** 2026-08-02  
> **Type:** Interaction Pattern  
> **Status:** Reference Implementation

---

## Overview

From a selected finding, users can generate proof-of-concept exploit code. The AI generates forge test code that demonstrates the vulnerability.

---

## Flow

```
Selected Finding → Click "Generate Exploit" → Show progress → Display code block
```

---

## Implementation

```tsx
function FindingActions({ finding, onGenerate }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const exploit = await generateExploit(finding);
      onGenerate(exploit);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Button 
      variant="primary"
      loading={isGenerating}
      disabled={isGenerating}
      onClick={handleGenerate}
      icon="bug"
    >
      Generate Exploit
    </Button>
  );
}
```

---

## Progress States

| State | Visual | Duration |
|-------|--------|----------|
| Generating | Spinner + "Generating..." | Variable |
| Complete | Code block visible | Permanent until regenerated |
| Error | Error message + retry button | Until retry |

---

## Generated Exploit Display

```tsx
function ExploitDisplay({ exploit }: Props) {
  return (
    <div className="exploit-display">
      <div className="exploit-header">
        <h3>Proof of Concept</h3>
        <CopyButton text={exploit.code} />
        <RunButton exploit={exploit} />
      </div>
      <CodeBlock 
        code={exploit.code}
        language="solidity"
        showLineNumbers
      />
      <div className="exploit-explanation">
        <p>{exploit.explanation}</p>
      </div>
    </div>
  );
}
```

---

## Copy Feedback

Show temporary confirmation when copying:

```tsx
function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button onClick={handleCopy} aria-label={copied ? "Copied!" : "Copy code"}>
      <i className={`codicon ${copied ? 'codicon-check' : 'codicon-copy'}`}></i>
      {copied && <span className="sr-only">Copied to clipboard</span>}
    </button>
  );
}
```

---

## Accessibility

- **Loading State:** Announce generation in progress via aria-live
- **Success State:** Announce when code is ready
- **Error State:** Clear error message with retry option
