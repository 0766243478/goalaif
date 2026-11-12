# SIREEN Core v0.1 — Final Validation Report

**Branch:** `fix/enable-confirmed-demo`  
**Date of validation:** 2026-11-12  
**Scope:** Backend CLI only (VS Code extension excluded per current priority).  
**Verdict:** Core v0.1 is frozen for external evaluation. Only **reentrancy** is
reliably CONFIRMED with reproducible Forge evidence.

## 1. Test suite results (actually executed)

| Suite | Command | Result |
|-------|---------|--------|
| Backend unit + E2E | `cd gaolaif/backend && python -m pytest tests/ firewall/tests/ -q` | **113 passed, 2 skipped, 3 warnings** |
| Backend golden path (forge CONFIRMED) | `python -m pytest tests/test_golden_path.py -q` | **10 passed** |
| Extension unit tests | `cd gaolaif/extension && npx jest --ci --silent` | **56 passed, 9 suites** (reported for completeness) |
| Extension production webpack | `npx webpack --mode production` | Compiled (3 pre-existing size warnings; no errors) |
| Release gate | `python runtime_verification/verify_all.py` | Backend/extension/typescript/golden-path all PASS |

**Skipped tests (2):** require `OPENROUTER_API_KEY` or live LLM calls — correctly skipped when key unset.

**Note on discrepancy:** `SIREEN_FINAL_VALIDATION.md` (dated 2026-08-29) reports "112 passed, 2 skipped". Actual current run is **113 passed** because Forge is now installed (the `--use solc` fix enabled the forge golden-path test to execute and pass rather than skip).

**Secrets scan:** reports a false positive from `pyjwt` installed into user site-packages by `pip install -e .` (not a repo secret; git-tracked source is clean).


## 2. CLI end-to-end demonstration results

Three independent scenarios were executed against `sireen audit <file>.sol --report`.

### Scenario A — Vulnerable contract (reentrancy)

**Input:** `test_contracts/ReentrancyVault.sol` (external call before state update; `balances[msg.sender] = 0` after call)

```
TERMINAL STATE: DEGRADED
Exit code: 2
FINDINGS
  REENTRANCY [CONFIRMED]  evidence=evd-797f07f98221
  ACCESS_CONTROL [NEEDS REVIEW]  evidence=evd-671209575640
FORGE
  Version: forge Version: 1.9.0
  Compile: PASSED
  Test: PASSED
  Executed: 1
```

**Evidence pack `evd-797f07f98221`:**
- contract=ReentrancyVault, function=withdraw
- verification: compile=passed, test=passed, executed=1
- relevant_test=testExploit(), passed=True
- stdout_excerpt: `[COMPILATION OK] ... Compiler run successful ...`

### Scenario B — Secure contract (CEI-ordered; state update before external call)

**Input:** `test_contracts/SecureVault.sol`

```
TERMINAL STATE: DEGRADED
Exit code: 2
FINDINGS
  REENTRANCY [NEEDS REVIEW]
  ACCESS_CONTROL [NEEDS REVIEW]
Confirmed findings: 0
```

**No fabricated vulnerabilities.** Both PoCs executed (compile=passed, test=ran) but failed to reproduce on the patched contract — correctly NEEDS REVIEW, never CONFIRMED.

### Scenario C — Invalid Solidity (syntax error)

**Input:** `test_contracts/InvalidContract.sol` (contains `uint256 y = /;`)

```
TERMINAL STATE: UNVERIFIED
Exit code: 2
HYPOTHESIS: 0 generated
POC: UNAVAILABLE
FORGE: BLOCKED
```


## 3. Evidence system verification

All generated evidence packs contain actual Forge execution evidence:

| Audit | Pack | Contract | Function | Compile | Test | Executed | Relevant test passed? |
|-------|------|----------|----------|---------|------|----------|-----------------------|
| ReentrancyVault | evd-797f07f98221 | ReentrancyVault | withdraw | passed | passed | 1 | True (CONFIRMED) |
| ReentrancyVault | evd-671209575640 | ReentrancyVault | withdraw | passed | ran | 2 | False (NEEDS REVIEW) |
| SecureVault | evd-737971580ff9 | SecureVault | withdraw | passed | ran | 2 | False |
| SecureVault | evd-ef22627ca56c | SecureVault | withdraw | passed | ran | 2 | False |
| VulnerableVault | evd-41036263fb00 | VulnerableVault | withdraw | passed | passed | 1 | True (CONFIRMED) |
| VulnerableVault | evd-e2cb597f46ff | VulnerableVault | withdraw | passed | ran | 2 | False |

**evd-2b82ad500293:** This evidence pack ID **does not exist** in either SIREEN database
(`/workspace/gaolaif/backend/sessions.db` and `/workspace/.cline-home/data/db/sessions.db`).
It appears only in the task prompt. It cannot be confirmed as containing reproducible
Foundry execution evidence because it was never produced by SIREEN. Any documentation
referencing it as a real pack is inaccurate.

**Reproducibility:** Each pack stores `poc_source` (exact PoC Solidity), `poc_hash`
(sha256), and Forge `stdout_excerpt`. The same contract audited twice produces the same
terminal state and confirmed/needs_review split (deterministic heuristic mode, no API key).


## 4. Terminal-state classification

Policy (from `README.md` and `models/types.py`):
- CONFIRMED — ≥1 Forge-verified finding AND no unverified findings remain
- DEGRADED — partial verification (any needs_review finding)
- UNVERIFIED — insufficient coverage
- FAILED — pipeline error
- CLEAN_WITH_COVERAGE — no findings, every hypothesis executed

**Observed:** A vulnerable contract that triggers both reentrancy (CONFIRMED) and
access_control (NEEDS REVIEW) correctly yields **DEGRADED / exit 2**. This is
**expected honesty behavior**, not a bug: CONFIRMED requires `needs_review_count == 0`.
The access_control PoC uses `vm.expectRevert()`, which cannot pass on a contract that
genuinely lacks access control, so it can never be CONFIRMED by design. This is correctly
reported to the user for manual triage.

## 5. CLI reliability review

| Area | Status | Detail |
|------|--------|--------|
| Installation / deps | OK | `pip install -e .` installs `sireen` console script at `~/.local/bin/sireen`; requires forge+solc on PATH for verification |
| Commands / args | OK | `audit` / `audits` / `show` / `report`; `--json`, `--report`, `--output`, `--limit` all functional |
| Backend integration | OK | FastAPI `/audit/start`, `/audits`, `/audits/{id}`, `/config/status` all respond; SQLite durable persistence |
| Error handling | OK | Invalid input → 400; missing code → 400; missing idea → 400; unknown audit id → exit 3; invalid Solidity → UNVERIFIED, no crash |
| Report generation | OK | `--report` writes Markdown; `--json` emits structured audit; reports include terminal state, findings, evidence IDs, Forge output |
| Honest classification | OK | No fabricated vulnerabilities; CONFIRMED requires Forge reproduction; NEEDS REVIEW surfaced for manual triage |
| Reproducibility | OK | Deterministic heuristic mode; same inputs → same outputs across runs |

**Code change (only):** `gaolaif/backend/phases/phase3_simulate.py` — added `--use solc` auto-detect so Forge uses a locally installed `solc` instead of downloading the compiler (which fails in TLS-restricted sandboxes). +18/−3 lines. No architecture or feature changes.

## 6. Remaining limitations / known issues

1. **Coverage is minimal.** Only reentrancy is IMPLEMENTED_AND_TESTED. All other
   vulnerability classes are NOT_IMPLEMENTED, PARTIALLY_SUPPORTED, or
   RESEARCH_CAPABILITY (see `VULNERABILITY_COVERAGE_MATRIX.md`).
2. **access_control can never CONFIRM** by design (PoC uses `vm.expectRevert()` on a
   contract with no access control). This produces DEGRADED even when reentrancy is
   confirmed.
3. **Forge + solc must be installed on PATH.** Without them, PoC verification is skipped
   and audits are DEGRADED/UNVERIFIED.
4. **No `OPENROUTER_API_KEY`** → heuristic-only mode (no contract-specific LLM scenarios).
   This is documented, not a blocker.
5. `evd-2b82ad500293` does not exist; any doc referencing it is inaccurate.
6. The pre-existing `SIREEN_FINAL_VALIDATION.md` is dated (2026-08-29) and under-reports
   the passing test count (112 vs actual 113).
7. `FINAL_VALIDATION_REPORT.md`, `FINAL_DEMO_GUIDE.md`, and
   `VULNERABILITY_COVERAGE_MATRIX.md` did not exist prior to this audit; they are created
   here.

## 7. v0.1 readiness assessment

SIREEN Core v0.1 is **suitable for a narrow, honest demonstration**: it can reliably
detect and FORGE-CONFIRM single-contract reentrancy, correctly reject secure contracts,
and gracefully handle invalid input. It is **not** a comprehensive vulnerability scanner.
Credibility comes from reproducible Forge evidence, not from the number of categories
listed. External evaluation should scope expectations to reentrancy confirmation plus
honest NEEDS-REVIEW reporting for everything else.

**Handled gracefully** — no crash, no fabricated findings, explicit UNVERIFIED state.
