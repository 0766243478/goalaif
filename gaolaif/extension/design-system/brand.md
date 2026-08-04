# SIREEN Brand & Product Identity

> **Version:** 1.0  
> **Date:** 2026-08-02  
> **Status:** Foundation Document — All Future Design Decisions Must Align

---

## 1. Mission

**To make smart contract security analysis as natural as writing code.**

SIREEN exists to democratize Web3 security expertise. Every developer deserves the same analytical rigor that top auditors bring — automated, accessible, and integrated into their workflow.

### Mission Statements

| Format | Statement |
|--------|-----------|
| **Elevator Pitch** | SIREEN is an AI-powered security IDE that analyzes smart contracts, generates proof-of-concept exploits, and verifies them in a sandbox — all within VS Code. |
| **One Paragraph** | SIREEN transforms VS Code into a professional Web3 security workspace. It combines AI-driven static analysis, interactive exploit generation, and live sandbox simulation to help developers find and fix vulnerabilities before deployment. Unlike generic AI coding assistants, SIREEN understands Solidity semantics, integrates with Foundry tooling, and produces actionable security artifacts — not just suggestions. |
| **Manifesto** | We believe security analysis should be embedded in the developer's workflow, not relegated to a separate tool. We build for developers who write smart contracts and care about their security. We measure success by the vulnerabilities our users catch before attackers do. |

---

## 2. Vision

### 2026 — Product-Market Fit
SIREEN becomes the default security analysis tool for Solidity developers in VS Code.

### 2027 — Category Leadership
SIREEN defines the category of "AI Security IDEs" across multiple blockchain languages.

### 2029 — Platform
SIREEN evolves into a security analysis platform with plugin ecosystem and team collaboration.

---

## 3. Product Personality

### Archetype: The Guardian Engineer

| Trait | Expression | Anti-Pattern |
|-------|------------|--------------|
| **Precise** | Exact locations (file:line), reproducible PoCs | Vague descriptions, false positives |
| **Transparent** | Shows thinking process, explains WHY | Black-box AI, unexplained conclusions |
| **Actionable** | Every finding leads to next step | Analysis paralysis, no path forward |
| **Professional** | Dense layout, no marketing fluff | Cute language, gamification |
| **Trusted** | Accuracy over volume | False positive spam |

### Voice & Tone

| Context | Tone | Example |
|---------|------|---------|
| Finding titles | Direct, technical | "Reentrancy in withdraw() allows infinite Ether drain" |
| Chat responses | Professional, approachable | "I've identified 3 critical issues. Generate PoCs?" |
| Error messages | Clear, actionable | "Forge compilation failed: import path not found." |
| Empty states | Helpful, contextual | "Open a Solidity file to begin analysis." |

### Never Use
- ~~"Let me help you with that!"~~
- ~~"Great question!"~~
- ~~"Here's what I found! 🎉"~~
- ~~"Pro tip:"~~
- ~~"You're doing great!"~~

---

## 4. Brand Values

### Value 1: Accuracy Over Speed
A correct finding in 10 seconds beats 100 findings in 1 second if 90 are false positives.

**UI Expression:** Confidence scores visible on all findings; low-confidence items labeled "suspected"; "Verify with Forge" option always available.

---

### Value 2: Transparency Over Opacity
Users should understand HOW the AI reached its conclusion.

**UI Expression:** Collapsible thinking sections; tool execution shows step-by-step progress; all AI prompts logged.

---

### Value 3: Workflow Integration Over Disruption
SIREEN enhances existing workflows, doesn't replace them.

**UI Expression:** Analysis runs alongside editing; results in familiar VS Code patterns; no forced onboarding.

---

### Value 4: Professional Restraint Over Marketing Flash
Security tools should look like tools, not products.

**UI Expression:** No hero sections or promotional copy; dense information layouts; subtle functional animations only.

---

## 5. Design Philosophy

### Core Tenets

| Tenet | Manifestation |
|-------|---------------|
| **Invisible Interface** | Consistent with VS Code's visual language; no custom chrome |
| **Progressive Disclosure** | Minimum info upfront; complexity revealed on demand |
| **Actionable Outputs** | Every finding enables next action (PoC → simulate → fix) |

---

## 6. UX Principles

| Principle | Rule | Implementation |
|-----------|------|----------------|
| **Keyboard-First** | All actions via keyboard | `Ctrl+Shift+A` (analyze), `Ctrl+Shift+E` (exploit), `Ctrl+Shift+S` (simulate) |
| **Immediate Feedback** | Visual response within 100ms | Button press states, streaming text, progress badges |
| **Context Preservation** | Never lose your place | Persistent scroll, selection state, history navigation |
| **Error Recovery** | Clear recovery path for every failure | Actionable error messages, retry buttons, graceful degradation |
| **Information Density** | Respect screen real estate | 12px base font, 4-8px padding, collapsible sections |

---

## 7. AI Principles

| Principle | Rule | Implementation |
|-----------|------|----------------|
| **Explainable Reasoning** | Show how conclusions are reached | Collapsible thinking sections, code citations |
| **Confidence Calibration** | Honest, calibrated confidence scores | High (>90%), Medium (70-90%), Low (<70%) with visual styling |
| **Action-Oriented** | Enable next actions | "Generate PoC", "Fix this", "Next steps" suggestions |
| **Context-Aware** | Infer context from user state | Auto-detect active contract, reference previous findings |

---

## 8. Security Principles

| Principle | Rule | Implementation |
|-----------|------|----------------|
| **Defense in Depth** | Multiple complementary techniques | Static analysis + symbolic execution + fuzzing + AI reasoning |
| **Verification Over Assertion** | Claims must be verified | Reproducible PoCs, sandbox simulation, exportable audit trails |
| **Immutable Audit Trail** | Tamper-evident analysis history | Versioned findings, change logs, metadata export |
| **Secure by Default** | Never expose sensitive data | API keys in secure storage, no private keys in logs, HTTPS only |

---

## 9. Anti-Patterns

| Anti-Pattern | Why Wrong | Correct Approach |
|-------------|-----------|------------------|
| **Marketing-first design** | Undermines professionalism | Contextual empty states, no taglines |
| **Opinionated workflows** | Security research is exploratory | Adaptive, not rigid |
| **Opaque AI** | Erodes trust | Show reasoning, citations, confidence |
| **Decorative motion** | Distracts, wastes battery | Functional animations only (0.15-0.3s) |
| **Generic responses** | Misses security nuances | Solidity-aware, context-dependent |
| **False confidence** | Wastes auditor time | Label speculation as speculation |

---

## 10. Brand Assets

### Color Palette (Brand Accents Only)

| Color | Hex | Usage | Token |
|-------|-----|-------|-------|
| **Amber** | `#F59E0B` | Primary actions, highlights | `--sireen-amber` |
| **Purple** | `#A855F7` | Security features, contracts | `--sireen-purple` |
| **Cyan** | `#06B6D4` | Simulation status, live indicators | `--sireen-cyan` |
| **Green** | `#22C55E` | Success, confirmed findings | `--sireen-green` |

**Note:** Severity colors use VS Code tokens (`--vscode-errorForeground`, etc.). Brand accents only for interactive elements.

### Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| UI Labels | System UI stack | 12px | 500 |
| Code Blocks | JetBrains Mono | 13px | 400 |
| Headings | System UI stack | 13px | 600 |
| Small Text | System UI stack | 10px | 400 |

### Iconography

**Source:** VS Code codicon font  
**Do NOT use:** lucide-react, custom SVGs, emoji  
**Exception:** Brand logo SVG for activation logo only

---

## 11. Quick Reference

### Do
- Use VS Code semantic tokens for all colors
- System fonts for UI, monospace for code
- Show thinking/reasoning transparently
- Provide actionable next steps
- Respect keyboard navigation
- Keep layouts dense and information-rich

### Don't
- Use hardcoded hex colors for UI elements
- Show marketing copy in empty states
- Hide AI reasoning
- Force mouse-only interactions
- Use decorative animations
- Present speculation as fact
