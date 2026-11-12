# SIREEN Core v0.1 — Final Demo Guide

**Scope:** Backend CLI only.  
**Prerequisites:** Python 3.11+, Forge (Foundry) + solc on PATH.

---

## 1. Install the CLI

```bash
cd gaolaif/backend
pip install -r requirements.txt
pip install -e .
```

Verify the `sireen` command is on PATH:

```bash
which sireen
sireen --help
```

Expected subcommands: `audit`, `audits`, `show`, `report`.

---

## 2. Ensure Forge + solc are available

SIREEN verifies PoCs with Foundry. Without Forge, audits are DEGRADED/UNVERIFIED.

```bash
forge --version        # e.g. forge Version: 1.9.0
solc --version         # e.g. 0.8.20
```

SIREEN auto-detects a `solc` on PATH and passes `--use solc` to Forge so the compiler
is not downloaded (avoids TLS failures in restricted sandboxes).

---

## 3. Run an audit

```bash
sireen audit <file>.sol --report <output.md>
```

Exit codes: `0` = CONFIRMED/CLEAN_WITH_COVERAGE; `2` = DEGRADED/UNVERIFIED;
`1` = FAILED/input error; `3` = audit id not found.

---

## 4. Example: vulnerable contract (expect REENTRANCY CONFIRMED)

```bash
sireen audit test_contracts/VulnerableVault.sol --report /tmp/vuln.md
```

Sample output:

```
SIREEN
Forge-backed adversarial security workbench

FILE
test_contracts/VulnerableVault.sol

DISCOVERY       OK
HYPOTHESIS      2 generated
ATTACK PATH     2 inspectable
POC             GENERATED
FORGE
Version: forge Version: 1.9.0
Compile: PASSED
Test: PASSED
Executed: 1

FINDINGS
REENTRANCY [CONFIRMED] Reentrancy on withdraw
Evidence: evd-41036263fb00
ACCESS_CONTROL [NEEDS REVIEW] Access control on withdraw
Evidence: evd-e2cb597f46ff

TERMINAL STATE
DEGRADED
Reason: 1 finding(s) were NOT confirmed: Forge executed the PoCs but did not reproduce
the hypothesis ... marked 'needs review' ...
Audit ID: audit-6b7720d5a7d9
Report: /tmp/vuln.md
```

**Interpretation:** The reentrancy finding is CONFIRMED with reproducible Forge evidence.
The access_control finding is NEEDS REVIEW (its PoC cannot pass on a contract with no
access control). Because an unresolved needs_review finding remains, the terminal state
is DEGRADED and the exit code is 2 — this is honest, expected behavior.

---

## 5. Example: secure contract (expect no fabricated findings)

```bash
sireen audit SecureVault.sol --report /tmp/secure.md
```

Expected: all findings NEEDS REVIEW, none CONFIRMED, terminal DEGRADED, exit 2.
No crash, no fabricated vulnerabilities.

---

## 6. Example: invalid contract (expect graceful handling)

```bash
sireen audit InvalidContract.sol --report /tmp/invalid.md
```

Expected: HYPOTHESIS 0, POC UNAVAILABLE, FORGE BLOCKED, terminal UNVERIFIED, exit 2.
No crash, no fabricated findings.

---

## 7. Inspect a completed audit

```bash
sireen audits                      # list all durable audits
sireen show <audit-id>             # human-readable summary
sireen show <audit-id> --json      # structured JSON
sireen report <audit-id>           # print Markdown report
sireen report <audit-id> -o /tmp/r.md  # write report to file
```

---

## 8. What to expect (honest scope)

| Capability | Status |
|------------|--------|
| Detect + Forge-CONFIRM reentrancy | YES |
| Detect access_control (never CONFIRMs) | YES (NEEDS REVIEW) |
| Detect arithmetic / signature / delegatecall | Heuristic only (SKIPPED_UNSUPPORTED) |
| Detect all other vulnerability classes | NOT IMPLEMENTED |
| Confirm without Forge evidence | NEVER (honesty policy) |

**Credibility comes from reproducible Forge evidence, not category count.**
