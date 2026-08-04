# Typography Tokens

## Font Stacks

### UI Font Stack

Used for all interface text: labels, headings, descriptions, buttons, inputs.

```css
--font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Rationale:** This is the same stack VS Code uses for its UI. It renders natively on every OS, loads instantly, and matches the editor shell expectation. This is Evidence from [research.md] pattern #2 (Theme Awareness).

### Monospace Font Stack

Used exclusively for code blocks, contract addresses, function signatures, and terminal output.

```css
--font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace;
```

**Rationale:** JetBrains Mono is the de facto standard for developer tools. VS Code ships with it as a recommended extension. Fira Code provides ligature support. Consolas is the Windows fallback. This is Inference based on industry standards.

## Type Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| H1 | 16px | 600 | 1.3 | View titles, section headers |
| H2 | 14px | 600 | 1.3 | Subsection headers, panel titles |
| H3 | 13px | 600 | 1.3 | Card titles, list item headings |
| H4 | 12px | 600 | 1.3 | Badge labels, metadata |
| Body-lg | 13px | 400 | 1.4 | Message content, descriptions |
| Body | 12px | 400 | 1.4 | Standard UI text |
| Body-sm | 11px | 400 | 1.4 | Metadata, timestamps, footers |
| Code | 12px | 400 | 1.6 | All code blocks, terminal output |
| Code-sm | 11px | 400 | 1.6 | Inline code, small code snippets |

### CSS Implementation

```css
:root {
  /* Headings */
  --font-size-h1: 16px;
  --font-size-h2: 14px;
  --font-size-h3: 13px;
  --font-size-h4: 12px;

  /* Body */
  --font-size-body-lg: 13px;
  --font-size-body: 12px;
  --font-size-body-sm: 11px;

  /* Code */
  --font-size-code: 12px;
  --font-size-code-sm: 11px;

  /* Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Line heights */
  --line-height-ui: 1.3;
  --line-height-body: 1.4;
  --line-height-code: 1.6;
}
```

## Current Violations

The existing `styles.css` has these typography violations:

### Violation 1: Body uses monospace font

```css
/* CURRENT (WRONG) */
body {
  font-family: var(--font-mono);
}

/* CORRECT */
body {
  font-family: var(--font-ui);
}
```

**Impact:** ALL UI text (buttons, labels, headings, messages) uses JetBrains Mono. This creates visual noise and reduces readability. Monospace should be reserved for code only.

### Violation 2: Uppercase buttons with excessive letter-spacing

```css
/* CURRENT (WRONG) */
button {
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* CORRECT */
button {
  text-transform: none;
  letter-spacing: normal;
}
```

**Impact:** Buttons look aggressive and marketing-oriented rather than tool-like. VS Code native buttons never use uppercase text-transform.

### Violation 3: Excessive line-height on body

```css
/* CURRENT (WRONG) */
body {
  line-height: 1.6;
}

/* CORRECT — UI text should be tighter */
body {
  line-height: var(--line-height-ui);
}

/* Code blocks should remain at 1.6 */
pre, code {
  line-height: var(--line-height-code);
}
```

## Rules

1. **UI elements use system font stack.** Never apply `--font-mono` to buttons, labels, or navigation.
2. **Code blocks use monospace stack.** Only `pre`, `code`, `.sireen-code-block`, and terminal output should use `--font-mono`.
3. **No uppercase text-transform on buttons or labels.** Match VS Code's native behavior.
4. **Line height follows type scale.** UI = 1.3, body text = 1.4, code = 1.6.
5. **Font weight is semantic, not decorative.** Use 400 for body, 500 for emphasis, 600 for headings. Never bold (700+) for UI text.
6. **Prefer `--vscode-editor-font-family` for code if available.** Some VS Code themes let users customize their editor font. Fall back to `--font-mono` only if the setting is absent.

## Accessible Typography

- Minimum font size for body text: 12px (meeting WCAG 1.4.4 resize)
- Minimum font size for code: 11px
- Never reduce font size below 11px to fit content
- Maintain 1.4+ line height for paragraphs >3 lines
- Provide zoom support up to 200% without layout break
