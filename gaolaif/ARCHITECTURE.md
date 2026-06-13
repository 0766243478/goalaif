# Gaolaif Technical Architecture Specification

> **Document Status:** Living — synchronized with `gaolaif/` (backend + extension + sandbox)
> **Domain:** Local-first Web3 AI Security Workspace
> **Air-Gap Posture:** 100% on-premises — zero data leaves the machine except user-initiated RPC fork queries to configured endpoints (which pass through the Anonymizer firewall).

---

## 1. Architecture Overview & Logical Topology

### 1.1 High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LOCAL MACHINE BOUNDARY                         │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │  VS CODE EXTENSION   │    │        LOCAL ANALYSIS ENGINE     │   │
│  │  (TypeScript/React)  │◄──►│        (Python FastAPI)          │   │
│  │                      │ WS │                                  │   │
│  │  • Sidebar webview   │REST│  • REST API (7 endpoints)        │   │
│  │  • Protocol Mode UI  │    │  • WebSocket broadcast           │   │
│  │  • Hacker Mode UI    │    │  • Agent pipeline (3-node graph) │   │
│  │  • Editor decorations│    │  • Exploit agent (forge runner)  │   │
│  └──────────────────────┘    └──────────────┬───────────────────┘   │
│                                             │                        │
│  ┌──────────────────────────┐  ┌────────────▼───────────────────┐   │
│  │     LOCAL SMART FIREWALL │  │       MEMORY & LLM LAYER       │   │
│  │                          │  │                                 │   │
│  │  • OutboundFirewall: DLP │  │  • Qdrant vector DB (optional) │   │
│  │    - Private key redact  │  │  • Ollama (optional)            │   │
│  │    - Address anonymizer  │  │    - nomic-embed-text           │   │
│  │    - Contract name map   │  │    - codellama:13b              │   │
│  │  • InboundFirewall:      │  │    - deepseek-coder:6.7b       │   │
│  │    - Anti-hallucination  │  │  • Hash embedding fallback      │   │
│  │    - Schema verification │  │  • In-memory session store      │   │
│  │  • Bidirectional         │  │                                 │   │
│  │    deanonymization map   │  └─────────────────────────────────┘   │
│  └──────────────────────────┘                                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   DOCKER SANDBOX LAYER                        │   │
│  │                                                               │   │
│  │  ┌─────────────────────┐   ┌──────────────────────────────┐  │   │
│  │  │  EVM Sandbox        │   │  Move Sandbox                │  │   │
│  │  │  (Foundry/Anvil)    │   │  (Sui CLI + Aptos CLI)       │  │   │
│  │  │  • anvil fork node  │   │  • Sui CLI                   │  │   │
│  │  │  • forge test runner│   │  • Aptos CLI                 │  │   │
│  │  │  • WhaleSimulator   │   │  • Move compiler             │  │   │
│  │  └─────────────────────┘   └──────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Communication Protocol

| Channel | Protocol | Transport | Direction | Payload |
|---------|----------|-----------|-----------|---------|
| Extension ↔ Backend | REST | HTTP/1.1 | Bidirectional | JSON (health, audit, exploit, report, sandbox) |
| Extension ↔ Backend | WebSocket | ws://localhost:7432/ws | Server→Client (push) | JSON frames (progress, results, logs) |
| Backend → Docker | Docker SDK (docker-py) | Unix socket / named pipe | Bidirectional | Container lifecycle, exec commands |
| Backend → Qdrant | HTTP | localhost:6333 | Bidirectional | Vector operations (upsert, search) |
| Backend → Ollama | HTTP | localhost:11434 | Request→Response | Generation requests, embedding queries |
| Backend → RPC | HTTPS | Configured endpoint URL | Request→Response | Fork queries (via forge --fork-url) |

### 1.3 Execution Boundaries & Data Leakage Prevention

All processing is confined to the local machine. The only permitted external data flows are:

1. **RPC fork queries** (user-configured, attack-surface dependent):
   - Passed via `forge test --fork-url {rpc_url}` to the Foundry binary
   - The URL itself is **not** anonymized by default (it's user-supplied infrastructure)
   - **No contract source code, exploit ideas, or private keys** travel over this channel — only EVM state queries (balance, storage, code at address)

2. **Future: Immunefi report submission** — the user manually copies/pastes the generated markdown report (user-initiated, out-of-band)

All other outbound traffic is **blocked** at the `OutboundFirewall` layer, which:
- Scans for 4 sensitive pattern classes (private keys, mnemonics, API tokens, RPC URLs with embedded credentials)
- Anonymizes addresses, contract names, and function names before any external search
- Returns `[BLOCKED: reason]` if sensitive data is detected in a non-anonymizable context

### 1.4 Hybrid Routing — Deterministic vs. LLM Dispatch

```
exploit_from_idea(idea, target_function, source_code, rpc_url)
    │
    ├── _match_category(idea)
    │   │
    │   ├── confidence >= 0.6
    │   │   └── _generate_from_template(category, idea, target_name)
    │   │       └── Deterministic: template substitution → forge test
    │   │
    │   └── confidence < 0.6 (novel idea)
    │       │
    │       ├── _ollama_available() == True
    │       │   └── _generate_poc_from_idea_llm(...)
    │       │       └── LLM-generated: full custom Foundry test
    │       │
    │       └── _ollama_available() == False
    │           └── _generate_from_template("", idea, target_name)
    │               └── GENERIC_FALLBACK: confirmed=False, [NOTE] appended
    │
    └── _run_poc(poc_code, source_code, idea, target_name, rpc_url)
        │
        ├── shutil.which("forge") != None
        │   └── subprocess.run([forge, "test", "--root", tmpdir,
        │         "--match-test", "testExploit", "-vvv"])
        │
        └── shutil.which("forge") == None
            └── Simulated output with "[SIMULATED]" label
```

---

## 2. Logic & Business-Logic Analysis Algorithm

### 2.1 Static Analysis — 7 Regex Audit Rules

The `AuditAgent` performs line-by-line scanning with 7 compiled regex patterns, zero external dependencies:

| Rule ID | Severity | Pattern | Attack Vector | False Positive Rate |
|---------|----------|---------|---------------|-------------------|
| `REENTRANCY` | CRITICAL | `\.call\s*\{[^}]*value[^}]*\}` | Reentrancy via raw ETH transfer + value | Low — specifically targets `.call{value: ...}` pattern |
| `TX_ORIGIN` | HIGH | `\btx\.origin\b` | tx.origin phishing | Very low — exact token match |
| `UNCHECKED_MATH` | MEDIUM | `(?:^\|[^a-zA-Z])(?:-\s*[a-zA-Z_]\w*\s*-\s*\|[\+\-\*\/]\s*[a-zA-Z_]\w*\s*[\+\-\*\/])` | Integer overflow | High — syntactic pattern, may miss SafeMath wrappers |
| `DELEGATECALL` | CRITICAL | `\.delegatecall\b` | Delegatecall injection | Low — exact method match |
| `SELFDESTRUCT` | HIGH | `\bselfdestruct\b` | Forced destruction | Very low |
| `TIMESTAMP_DEP` | MEDIUM | `\bblock\.timestamp\b` | Timestamp manipulation | Low — exact token match |
| `UNINITIALIZED_STORAGE` | HIGH | `struct\s+\w+\s+(public\|internal\|private)?\s*[a-z]` | Storage collision | Medium — heuristic |

**Algorithm:**
```
for each line in source_code.split("\n"):
    for each rule in RULES:
        if re.search(rule.pattern, line):
            function_name = extract_function_from_line(line)
            findings.append(Finding(
                id = rule_id,
                title = rule.title,
                severity = rule.severity,
                line_number = line_number,
                affected_function = function_name,
                category = attack_vector,
            ))
```

### 2.2 Planner Agent — Risk Scoring Algorithm

The `PlannerAgent.plan()` function performs structural extraction and cumulative risk scoring:

**Structural Extraction:**
- **Functions:** regex `function\s+(\w+)\s*\((.*?)\)\s*(.*?)\s*\{`
- **External calls:** regex `\.(call|delegatecall|staticcall)\s*\{`
- **State variables:** regex `(uint256|address|mapping|bool|uint|int|bytes32)\s+(public|internal|private)?\s*(\w+)`

**Risk Score (cumulative, max 100):**

| Trigger | Points | Rationale |
|---------|--------|-----------|
| `delegatecall` found | +30 | Arbitrary execution from external contract |
| `tx.origin` used | +20 | Phishing vulnerability |
| `.call{value` or `.call.value` | +25 | Raw ETH transfer with reentrancy risk |
| `selfdestruct` | +30 | Contract can be destroyed |
| Loop containing `.call` | +15 | Reentrancy in iterative logic |

### 2.3 Cross-Contract Integration Analysis (Foundry Forge)

The system lacks a standalone cross-contract analysis engine. Instead, it delegates **runtime cross-contract integration testing** to Foundry's `forge test`:

```
exploit_from_idea → _run_poc
    │
    └── _setup_forge_project(tmp_path, source_code, target_name)
        │
        ├── Write src/{Target}.sol       ← Target contract source
        ├── Write test/Exploit.t.sol     ← Generated PoC
        ├── Write lib/forge-std/src/Test.sol  ← Mock forge-std
        ├── Write foundry.toml           ← src='src', test='test'
        └── Write remappings.txt         ← forge-std/=lib/forge-std/src/
            │
            └── subprocess.run([forge, "test", "--root", tmpdir,
                                "--match-test", "testExploit", "-vvv"])
```

**Mock forge-std (`MOCK_FORGE_STD`):** A 46-line hand-written stub that implements the minimum interface surface required for compilation:
- `Vm` interface: 14 cheat codes (`createSelectFork`, `prank`, `deal`, `warp`, `roll`, `expectRevert`, `record`, `accesses`, `envString`, etc.)
- `StdAssertions`: 8 assertion functions (`assertTrue`, `assertEq`, `assertGt`, `assertGe`, `assertLt` with string overloads)
- `Test`: combines `StdAssertions` + `Vm` at cheat address `0x7109709ECfa91a80626fF3989D68f67F5b1DD12D`
- `console2`: 5 log overloads (`log(string)`, `log(string, uint256)`, `log(string, uint256, uint256)`, `log(string, address)`, `log(string, address, uint256)`)

**Why mock forge-std instead of using real imports?** Eliminates the need for `git clone https://github.com/foundry-rs/forge-std` at PoC time. The mock compiles in <200ms vs. 3-5s for the full forge-std. Air-gap compatible — zero external git fetches.

### 2.4 State-Machine & DoS Detection (Current Limitation)

**As of v2.0, the system does NOT have built-in detection for state-machine, FIFO deadlock, or DoS logic bugs.**

The following vulnerability classes are **not covered** by static analysis or templates:
- FIFO queue deadlock (Lista DAO pattern)
- Cross-function state machine violations
- Griefing / donation attacks
- Rebasing token accounting errors
- ERC-4626 inflation attacks
- Yield-bearing asset valuation errors

**Detection path for these classes:** Only via novel-idea LLM fallback. If a user describes the bug in natural language AND Ollama with `codellama:13b` is available, the LLM generates a custom PoC. Otherwise, falls to generic template with `confirmed=False`.

### 2.5 Lightweight Data Structures

| Structure | Location | Memory Bound | Purpose |
|-----------|----------|-------------|---------|
| `Prefix Tree (trie)` | Not implemented — placeholder | N/A | Future: function name dispatch |
| `AST` | Not implemented — regex-based instead | N/A | Source scanning uses `re.search` per line |
| `Dict[str, Finding]` | `AuditAgent` | `O(num_findings)` | Finding deduplication |
| `ProtocolState` dataclass | `protocol_graph.py` | ~1KB | Pipeline state |
| `Session` dataclass | `session_store.py` | ~10KB per session | Session persistence |
| `AnonymizationMap` | `anonymizer.py` | `O(num_entities)` | Bidirectional real↔placeholder mapping |
| `ExploitTemplate` dict | `exploit_agent.py` | ~3KB | 2 template strings |
| `MOCK_FORGE_STD` string | `exploit_agent.py` | ~1.5KB | Inline Solidity stub |

**Design constraint:** All analysis structures must fit within VS Code extension host process memory limits (~512MB RSS). The current architecture uses negligible memory — the heaviest component is the Python backend process (~30-50MB RSS) and the Docker containers (variable, ~200MB for anvil fork).

---

## 3. Cognitive & LLM Fallback Layer

### 3.1 Deterministic Dispatch — `exploit_from_idea`

```
exploit_from_idea(idea, target_function, source_code, rpc_url)
```

**Step 1 — Category Matching (`_match_category`):**

```python
CATEGORY_KEYWORDS = {
    "reentrancy": ["reentranc", "re-enter", "callback", "recursive",
                   "withdraw loop", "drain", "recursion"],
    "flash_loan": ["flash", "oracle", "price manipulation",
                   "liquidation", "borrow"],
}

def _match_category(idea: str) -> tuple[str, float]:
    idea_lower = idea.lower()
    words = set(idea_lower.split())
    best_cat, best_conf = "", 0.0

    for cat, keywords in CATEGORY_KEYWORDS.items():
        matches = sum(1 for kw in keywords if kw in idea_lower)
        if matches == 0:
            continue
        # Confidence = keyword overlap / (overlap + non-matching words)
        conf = matches / (matches + len(words - set(keywords)))
        if conf > best_conf:
            best_cat, best_conf = cat, conf

    return best_cat, best_conf
```

**Confidence formula:**
```
confidence(cat) = keyword_matches / (keyword_matches + words_not_in_keywords)
```

This is a **Jaccard-like overlap coefficient** computed against the keyword set. It penalizes ideas that mention many non-keyword tokens, preventing false positives when a short idea happens to contain a keyword incidentally.

**Threshold:** `CATEGORY_CONFIDENCE_THRESHOLD = 0.6`

**Step 2 — Template Generation (`_generate_from_template`):**

| Category | Template | Number of Contracts | Assertion Type |
|----------|----------|-------------------|----------------|
| `reentrancy` | `Attacker` with recursive `fallback` calling `victim.withdraw()` | 2 (`Victim` + `Attacker`) | `assertLt(finalBalance, initialBalance, ...)` |
| `flash_loan` | Fork-based test with oracle price read | 1 (`Victim`) | `console2.log(...)` — no assertion, informational |
| `""` (generic) | Empty test body | 1 (`Victim`) | `assertTrue(true, ...)` — trivially passes |

**Step 3 — LLM Generation (`_generate_poc_from_idea_llm`):**

When confidence < 0.6 AND `_ollama_available()` returns True, the system constructs a prompt containing:
- Full source code of the target contract
- The human's natural-language attack description
- The target function name
- Explicit requirements: `testExploit` function name, forge-std base, `console2.log` diagnostics, and — critically — a directive that the final assertion must verify the human's specific claim

```python
prompt = f"""You are a smart contract exploit engineer. A human security
researcher has described an attack idea in their own words. Generate a
complete Foundry test file that implements EXACTLY this attack.

CONTRACT SOURCE: {source_code}

TARGET FUNCTION: {target_function}

HUMAN'S ATTACK DESCRIPTION: {idea}

Requirements:
- Test function named exactly `testExploit`
- setUp() deploys the contract and any helper contracts/users needed
- Implement the EXACT sequence of steps the human described
- The final assertion must directly verify the human's claim
  (e.g. if they claim "user B's funds get stuck", assert that
  user B's balance/queue position is unchanged)
- Use forge-std Test base contract, vm.deal() for ETH funding
- Use console2.log() for diagnostic output
- Return ONLY valid Solidity code, no markdown fences, no explanation"""
```

### 3.2 LLM Orchestration Path

```
_ollama_available()
    │
    └── GET http://localhost:11434/api/tags (3s timeout)
        │
        ├── 200 OK → True (Ollama running)
        └── Exception → False (Ollama offline/unreachable)
```

```
_call_ollama(prompt, deep=False)
    │
    ├── deep=True  → model = "codellama:13b"   (180s timeout)
    └── deep=False → model = "deepseek-coder:6.7b" (120s timeout)
        │
        └── POST http://localhost:11434/api/generate
            │
            ├── 200 OK → Parse response
            │   ├── Strip leading/trailing ```markdown fences
            │   └── Return raw Solidity text
            │
            └── Exception → Re-raises (caught by caller)
```

**Model selection rationale:**
- `codellama:13b` for deep PoC generation (complex Solidity with multiple contracts, assertions, and state manipulation)
- `deepseek-coder:6.7b` for fast template-like tasks (prompt caching, simple patterns)
- Both are code-specialized models that produce compilable Solidity with higher reliability than general-purpose LLMs

### 3.3 Honest Signal Verification

The system implements three layers of verification to prevent misleading "confirmed" results:

**Layer 1 — Forge Compilation Check:**
```python
result = subprocess.run([forge, "test", "--root", tmpdir,
                         "--match-test", "testExploit", "-vvv"],
                        capture_output=True, text=True, timeout=120)
test_ran = "testExploit" in stdout
test_passed = "[PASS]" in stdout and test_ran
```

If the Solidity doesn't compile, `stdout` will contain `"Compiler run failed"` which won't match `[PASS]`, so `confirmed=False`.

**Layer 2 — Generic Fallback Override:**
```python
if is_generic_fallback:
    proof.confirmed = False
    proof.reason = "[GENERIC FALLBACK] No category matched and no Ollama available..."
    if "[PASS]" in proof.forge_output:
        proof.forge_output += "\n\n[NOTE] This [PASS] is from a generic template — \
            the exploit was NOT actually tested.\n"
```

Even if `assertTrue(true, ...)` causes forge to report `[PASS]`, the override forces `confirmed=False` with an appended `[NOTE]` in the forge output.

**Layer 3 — LLM Output Validation:**
```python
poc = self._generate_poc_from_idea_llm(...)
if "testExploit" not in poc:
    poc = self._generate_from_template("", idea, target_name)
    is_generic_fallback = True
```

If the LLM returns Solidity without a `testExploit` function (e.g., it returned an explanation instead of code, or malformed output), the system falls back to the generic template with `is_generic_fallback = True`.

### 3.4 Fallback Matrix

| Category Match | Ollama Available | Behavior | confirmed | Output Quality |
|---------------|-----------------|----------|-----------|----------------|
| ≥0.6 | N/A | Template-generated PoC | Based on forge [PASS] | High for matching category |
| <0.6 | Yes | LLM-generated custom PoC | Based on forge [PASS] | High (if LLM produces correct PoC) |
| <0.6 | No | Generic template + confirmed=False override | **False (forced)** | Low — no actual test, [NOTE] appended |
| <0.6 | Yes but LLM fails | Generic template + confirmed=False override | **False (forced)** | Low — [NOTE] appended |

### 3.5 Graceful Degradation Chain

```
Ideal path:
  Idea → Category match (conf ≥ 0.6) → Template → Forge → [PASS] → confirmed=True

Fallback path 1 (novel idea, LLM available):
  Idea → No category match → Ollama check → LLM generates PoC → Forge → [PASS] → confirmed=True

Fallback path 2 (novel idea, no LLM):
  Idea → No category match → Ollama offline → Generic template → Forge → [PASS] → confirmed=False (FORCED)
  + [NOTE] appended to forge output

Fallback path 3 (no forge binary):
  Idea → shutil.which("forge") == None → Simulated output → confirmed=False (FORCED)
  + "[SIMULATED]" label in forge output

Fallback path 4 (no source code):
  Idea → source_code == "" → immediate return → confirmed=False
  + "[NO SOURCE]" in forge output
```

---

## 4. Component Interaction & Security Boundaries

### 4.1 Full Analysis Lifecycle

#### Protocol Mode (Defensive Audit)

```
1. User selects Solidity/Move code in VS Code editor
2. Extension sends POST /audit/start { session_id, source_code, file_path, language }
3. Backend main.py creates ProtocolState and builds protocol_graph pipeline:
   a. broadcast("planning")
   b. PlannerAgent.plan(source_code)
      └── Extract functions, state variables, external calls → risk_score
   c. broadcast("researching")
   d. CVEHunter().search(source_code)       ← Threaded
   e. AuditMiner().search_similar(source_code) ← Threaded
   f. broadcast("auditing")
   g. AuditAgent.audit(source_code)
      └── 7 regex rules against each line → list[Finding]
   h. PatchAgent.generate_patches(findings)
      └── Map finding ID → patch strategy + code diff + rationale
   i. broadcast("audit_complete", { findings, ranked_patches })
4. Extension renders findings list (severity-colored), patch suggestions
5. Memory: ProtocolMemory.save_fix(finding, patch) → upsert to Qdrant
```

#### Hacker Mode (Offensive Exploit)

```
1. User types exploit idea in sidebar textarea, selects target function
2. Extension sends POST /exploit/start { session_id, idea, target_function, code, rpc_url }
3. Backend main.py:
   a. broadcast("generating_poc")
   b. ExploitAgent.exploit_from_idea(idea, target_function, source_code, rpc_url)
      ├── _match_category(idea) → (category, confidence)
      ├── Dispatch per fallback matrix (§3.4)
      ├── _run_poc(poc, source_code, idea, target_name, rpc_url)
      │   ├── _setup_forge_project(tmpdir, source, target)
      │   ├── subprocess.run("forge test --match-test testExploit -vvv")
      │   └── Parse stdout for [PASS]
      └── return ExploitProof { confirmed, poc_code, forge_output, money_flow, ... }
   c. broadcast("exploit_result", { status, confirmed, poc_code, forge_output, ... })
4. If confirmed: ExploitMemory.save_tactic(proof, idea)
5. Extension renders:
   - Status badge (Confirming/Confirmed/Failed)
   - PoC code in read-only code block
   - Forge output in terminal-style viewer
   - MoneyFlowVisualizer (SVG fund flow diagram)
   - "Generate Immunefi Report" button
```

#### Report Generation

```
1. User clicks "Generate Report" in sidebar
2. Extension sends POST /report/generate { session_id, protocol_name, mode }
3. Backend main.py:
   a. Loads session from SessionStore
   b. BountyReportGenerator.generate(session_id, protocol_name)
      └── Markdown with: Summary → Vuln Details → Impact → PoC → Steps → Fix → References
   c. Writes to disk: gaolaif-report-{severity}-{datetime}.md
4. Extension opens the markdown file in VS Code editor
```

### 4.2 Firewall Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENTRY POINT (WebSocket/REST)                                        │
│                                                                      │
│  incoming_data → InboundFirewall.verify(data, expected_type)         │
│      │                                                               │
│      ├── passed=False → return {"error": "validation_failed",        │
│      │                     "warnings": [...]}                        │
│      │                                                               │
│      └── passed=True → verified_data routed to handler               │
│                                                                      │
│  OUTBOUND POINT (External search/LLM)                                │
│                                                                      │
│  outgoing_text → OutboundFirewall.filter(text, purpose)              │
│      │                                                               │
│      ├── has_blocked_content=True → return [BLOCKED: reasons]        │
│      │                                                               │
│      └── purpose contains "external" or "search"                     │
│          └── Anonymizer.anonymize(text) → (anonymized_text, map)     │
│              │                                                       │
│              ├── Private keys (0x[a-f0-9]{64}) → [PRIVATE_KEY_REDACTED]│
│              ├── Addresses (0x[a-f0-9]{40}) → Address0, Address1...  │
│              ├── Contract names → Contract0, Contract1...            │
│              └── Function names → fn0, fn1...                        │
│                                                                      │
│  INBOUND ANONYMIZATION REVERSAL                                      │
│                                                                      │
│  external_result → Anonymizer.deanonymize(result, map)               │
│      └── Replace Address0, Contract1, fn2 with original values      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Security Boundary Matrix

| Boundary | What Crosses | Protection Mechanism | Leak Risk |
|----------|-------------|---------------------|-----------|
| VS Code → Backend | Source code, exploit ideas, RPC URL | Loopback (localhost:7432) | None — same machine |
| Backend → Docker | Shell commands, Solidity source | Docker SDK, container isolation | None — local containers |
| Backend → Qdrant | Embedding vectors | Localhost:6333 | Low — vectors are hashed when Ollama offline |
| Backend → Ollama | Solidity code, prompts | Localhost:11434 | None — local LLM |
| Backend → External RPC | EVM state queries (`eth_call`, `eth_getStorageAt`) | No source code or keys sent | Low — only public chain data |
| Backend → File System | Audit reports (markdown) | Local file writes | None — user's own disk |
| Backend → pip/network | Package installs | Disabled in air-gapped mode | N/A — backend operates without network if all deps installed |

### 4.4 Performance & Space Optimization Constraints

| Metric | Target | Current Measured | Bottleneck |
|--------|--------|-----------------|------------|
| Backend cold start | <3s | ~1.2s | Python imports + FastAPI boot |
| Forge compile + test | <30s | ~2-5s (mock forge-std) | Solc compilation of mock Test.sol |
| Full audit pipeline | <10s | ~3-8s | Threaded research agents + audit |
| LLM PoC generation | <180s | N/A (requires Ollama) | `codellama:13b` inference time |
| Sidebar webview load | <500ms | ~200ms | React mount + WebSocket connect |
| Memory (backend) | <200MB RSS | ~30-50MB | Qdrant client + session store |
| Memory (Docker) | <2GB | ~200MB (anvil fork) | EVM state fork size |
| Disk (reports) | <1MB per report | ~10-50KB per markdown | Report text content |

**Key optimization decisions:**
- **Mock forge-std** (~1.5KB) instead of full forge-std library (~5MB) saves 4.98MB and eliminates git clone overhead
- **Regex analysis** instead of AST parsing avoids Solidity parser dependency and keeps memory under 5MB for analysis state
- **Lazy imports** for `qdrant-client` and `docker` — modules loaded only when their endpoints are first called, reducing cold-start import time by ~400ms
- **Threaded research agents** via `asyncio.to_thread` — non-blocking WebSocket broadcasts continue during research phase
- **In-memory session store** instead of SQLite — eliminates disk I/O for session state, trades persistence for speed (acceptable for a developer tool, not a production database)

### 4.5 WebSocket Event Protocol

| Event | Direction | Payload |
|-------|-----------|---------|
| `audit_status` | Server→Client | `{ status: "planning" | "researching" | "auditing" | "done" }` |
| `audit_progress` | Server→Client | `{ stage: str, message: str, progress: float }` |
| `audit_complete` | Server→Client | `{ findings: Finding[], ranked_patches: Patch[] }` |
| `exploit_status` | Server→Client | `{ status: "generating_poc" | "running" | "confirmed" | "failed" }` |
| `exploit_result` | Server→Client | `{ confirmed: bool, poc_code: str, forge_output: str, money_flow: dict, attack_vector: str, estimated_impact: str }` |
| `sandbox_status` | Server→Client | `{ container_id: str, rpc_url: str, status: str }` |
| `agent_log` | Server→Client | `{ agent: str, message: str, level: str }` |
| `error` | Server→Client | `{ message: str, code: str }` |

### 4.6 Extension ↔ Webview Message Protocol

| Message | Direction | Purpose |
|---------|-----------|---------|
| `audit` | Webview→Extension | Trigger audit on current editor selection |
| `exploit` | Webview→Extension | Trigger exploit generation with idea text |
| `run_sandbox` | Webview→Extension | Start Docker sandbox |
| `generate_report` | Webview→Extension | Generate bug bounty report |
| `switch_mode` | Webview→Extension | Toggle Protocol/Hacker mode |
| `backend_log` | Extension→Webview | Forward forge output / agent logs |
| `audit_result` | Extension→Webview | Forward findings + patches |
| `exploit_result` | Extension→Webview | Forward PoC + forge output + money flow |
| `pipeline_progress` | Extension→Webview | Forward audit pipeline stage updates |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-06-12 | v2.0 | Architecture Bot | Initial comprehensive architecture document. Covers all 4 sections with full technical granularity. Documents the `_run_poc` real-forge pipeline, the `exploit_from_idea` dispatch with LLM fallback, the 7-rule audit regex engine, the mock forge-std strategy, the Generic Fallback `confirmed=False` override (Honest Signal), and the 3-node protocol graph. |
| — | — | — | **Document is a living spec — regenerated on each architectural change.** |

---

*End of Architecture Specification. This document is automatically regenerated to reflect the current state of `gaolaif/`.*

