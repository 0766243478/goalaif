# User Flows Index

> **Date:** 2026-08-02  
> **Purpose:** Document complete user journeys through SIREEN

---

## Flow Index

| Flow ID | Flow Name | Entry Point | Complexity |
|---------|-----------|-------------|------------|
| F001 | First Launch | Extension activation | Low |
| F002 | Open Project | VS Code workspace open | Low |
| F003 | Analyze Contract | Chat or Findings view | Medium |
| F004 | Review Findings | Findings view | Medium |
| F005 | Generate Exploit | Findings → Exploits view | Medium |
| F006 | Run Simulation | Exploits → Simulation view | High |
| F007 | Save Memory | Any view → Memory view | Low |
| F008 | Generate Report | Findings → Export | Medium |
| F009 | Ask AI Question | Chat view | Low |
| F010 | Fix Vulnerability | Exploits → Patch application | High |

---

## F001: First Launch

```
┌─────────────────────────────────────────────────────────┐
│  User opens VS Code with Solidity project               │
├─────────────────────────────────────────────────────────┤
│  1. Extension activates                                  │
│     ↓                                                    │
│  2. SIREEN sidebar icon appears (48px left rail)        │
│     ↓                                                    │
│  3. User clicks SIREEN icon                              │
│     ↓                                                    │
│  4. Webview opens → ApiKeySetup screen                  │
│     ↓                                                    │
│  5. User enters OpenRouter API key                       │
│     ↓                                                    │
│  6. Key validated (min 20 chars)                         │
│     ↓                                                    │
│  7. Settings saved → Main layout loads                  │
│     ↓                                                    │
│  8. Overview view displayed                              │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- API key valid? → Yes: Proceed / No: Show error

**Success Path:** Keys saved, Overview shown

**Failure Path:** Key too short → Show validation error

**Recovery:** Retry key entry

---

## F002: Open Project

```
┌─────────────────────────────────────────────────────────┐
│  User has SIREEN installed, opens new project           │
├─────────────────────────────────────────────────────────┤
│  1. VS Code workspace changes                          │
│     ↓                                                    │
│  2. SIREEN detects new Solidity files                   │
│     ↓                                                    │
│  3. Overview view updates with project stats            │
│     ↓                                                    │
│  4. Active file highlighted in context                  │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:** None

**Success Path:** Project context updated

**Failure Path:** Error toast if detection fails

**Recovery:** Manual refresh via Settings

---

## F003: Analyze Contract

```
┌─────────────────────────────────────────────────────────┐
│  User wants to audit a smart contract                   │
├─────────────────────────────────────────────────────────┤
│  1. Navigate to Findings view                           │
│     ↓                                                    │
│  2. Click "Run Audit" button                            │
│     ↓                                                    │
│  3. Pipeline starts: Planning → Researching → Auditing │
│     ↓                                                    │
│  4. Progress bar updates in real-time                   │
│     ↓                                                    │
│  5. Findings appear as discovered                       │
│     ↓                                                    │
│  6. Audit completes → Summary stats shown               │
│     ↓                                                    │
│  7. User can filter/sort findings                       │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- Errors during audit? → Pause/resume option

**Success Path:** All findings discovered and displayed

**Failure Path:** Partial results with error notice

**Recovery:** Retry failed stages

---

## F004: Review Findings

```
┌─────────────────────────────────────────────────────────┐
│  User reviews discovered vulnerabilities                  │
├─────────────────────────────────────────────────────────┤
│  1. FindingsView loads with all findings                │
│     ↓                                                    │
│  2. User applies severity filter (e.g., CRITICAL only) │
│     ↓                                                    │
│  3. List updates to show filtered results               │
│     ↓                                                    │
│  4. User clicks finding card                            │
│     ↓                                                    │
│  5. Finding selected → Card highlights                  │
│     ↓                                                    │
│  6. User navigates to Exploits view                     │
│     ↓                                                    │
│  7. Exploit generation pre-selected                     │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- Multiple findings? → Sequential review

**Success Path:** User understands vulnerability scope

**Failure Path:** No findings match filter → Show empty state

**Recovery:** Clear filters to see all

---

## F005: Generate Exploit

```
┌─────────────────────────────────────────────────────────┐
│  User generates proof-of-concept exploit                │
├─────────────────────────────────────────────────────────┤
│  1. ExploitsView loads with selected finding            │
│     ↓                                                    │
│  2. Click "Generate PoC" button                         │
│     ↓                                                    │
│  3. AI generates exploit code                            │
│     ↓                                                    │
│  4. CodeBlock displays with syntax highlighting        │
│     ↓                                                    │
│  5. User can copy code                                  │
│     ↓                                                    │
│  6. User clicks "Run in Sandbox"                        │
│     ↓                                                    │
│  7. Navigates to Simulation view with exploit loaded   │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- Generation fails? → Retry or manual edit

**Success Path:** Working PoC code generated

**Failure Path:** Timeout → Show partial code with retry

**Recovery:** Regenerate with different parameters

---

## F006: Run Simulation

```
┌─────────────────────────────────────────────────────────┐
│  User tests exploit in sandbox environment               │
├─────────────────────────────────────────────────────────┤
│  1. SimulationView loads                                │
│     ↓                                                    │
│  2. Verify sandbox status (should be READY)             │
│     ↓                                                    │
│  3. If offline, click "Start Sandbox"                   │
│     ↓                                                    │
│  4. Enter/confirm RPC URL                               │
│     ↓                                                    │
│  5. Select exploit from dropdown                        │
│     ↓                                                    │
│  6. Click "Run Test"                                    │
│     ↓                                                    │
│  7. Log shows execution progress                        │
│     ↓                                                    │
│  8. Result: Success/Failure/Error                       │
│     ↓                                                    │
│  9. View money flow visualization (if applicable)      │
│     ↓                                                    │
│ 10. Export results or save to memory                    │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- RPC fails? → Try alternative endpoint
- Test times out? → Adjust timeout setting

**Success Path:** Exploit confirmed working

**Failure Path:** Revert/error with diagnostic info

**Recovery:** Debug log analysis, adjust parameters

---

## F007: Save Memory

```
┌─────────────────────────────────────────────────────────┐
│  User saves security research note                      │
├─────────────────────────────────────────────────────────┤
│  1. Navigate to Memory view                             │
│     ↓                                                    │
│  2. Click "+ New" button                                │
│     ↓                                                    │
│  3. Create/Edit memory form appears                     │
│     ↓                                                    │
│  4. Enter title, content, tags                          │
│     ↓                                                    │
│  5. Save → Memory card added to list                    │
│     ↓                                                    │
│  6. Memory persists across sessions                     │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:** None

**Success Path:** Memory saved and searchable

**Failure Path:** Save fails → Retry with error toast

**Recovery:** Auto-save draft every 30 seconds

---

## F008: Generate Report

```
┌─────────────────────────────────────────────────────────┐
│  User exports audit report                              │
├─────────────────────────────────────────────────────────┤
│  1. From Findings view, click "Export"                  │
│     ↓                                                    │
│  2. Report configuration dialog appears                 │
│     ↓                                                    │
│  3. Select format: PDF / Markdown / JSON                │
│     ↓                                                    │
│  4. Select scope: All findings / Selected / Critical+  │
│     ↓                                                    │
│  5. Configure options: Include code / Exclude details   │
│     ↓                                                    │
│  6. Generate → File download starts                     │
│     ↓                                                    │
│  7. Toast confirmation: "Report downloaded"             │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- Large finding set? → Progress indicator shown

**Success Path:** Report file generated and downloaded

**Failure Path:** Generation error → Show error toast

**Recovery:** Retry with reduced scope

---

## F009: Ask AI Question

```
┌─────────────────────────────────────────────────────────┐
│  User asks AI about contract security                    │
├─────────────────────────────────────────────────────────┤
│  1. Navigate to Chat view                               │
│     ↓                                                    │
│  2. Type question or click starter question             │
│     ↓                                                    │
│  3. Send message (Enter)                                │
│     ↓                                                    │
│  4. User message appears (right-aligned)                │
│     ↓                                                    │
│  5. ThinkingIndicator shows processing steps            │
│     ↓                                                    │
│  6. AI response streams character-by-character          │
│     ↓                                                    │
│  7. Response includes code blocks if applicable        │
│     ↓                                                    │
│  8. User can follow up with clarifying questions        │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- API rate limited? → Show countdown timer

**Success Path:** Helpful AI response received

**Failure Path:** Error → Toast notification, retry option

**Recovery:** Regenerate response or switch model

---

## F010: Fix Vulnerability

```
┌─────────────────────────────────────────────────────────┐
│  User applies patch to fix vulnerability                │
├─────────────────────────────────────────────────────────┤
│  1. From Exploits view, review generated patch          │
│     ↓                                                    │
│  2. Click "Apply Patch" button                          │
│     ↓                                                    │
│  3. DiffViewer shows proposed changes                   │
│     ↓                                                    │
│  4. User reviews additions/deletions                    │
│     ↓                                                    │
│  5. Click "Accept" or "Reject"                          │
│     ↓                                                    │
│  6. If accepted: Changes applied to source file        │
│     ↓                                                    │
│  7. Toast: "Patch applied successfully"                 │
│     ↓                                                    │
│  8. Optional: Re-run audit to verify fix                │
└─────────────────────────────────────────────────────────┘
```

**Decision Points:**
- Multiple patches? → Apply individually or in batch

**Success Path:** Vulnerability fixed and verified

**Failure Path:** Apply fails → Show error, keep original file

**Recovery:** Undo last change via Git revert
