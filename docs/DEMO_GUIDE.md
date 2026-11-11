# SIREEN Demonstration Guide

**Human-AI Security Verification Workspace for Web3 Auditors.**

This guide walks you through running a live, reproducible security audit demonstrating SIREEN's core philosophy:
**Hypotheses are proposed by heuristics or AI, but only independent Foundry execution determines what is proven.**

---

## 1. Prerequisites

- Python 3.11+
- Foundry (`forge`): Install via `curl -L https://foundry.paradigm.xyz | bash && foundryup`

---

## 2. Quick Setup

```bash
cd gaolaif/backend
python -m pip install -r requirements.txt
python -m pip install -e .
```

Verify installation:
```bash
sireen --help
sireen config show
```

---

## 3. Running the Audit Demonstration

We will test an intentionally vulnerable vault: `test_contracts/VulnerableVault.sol`.

```bash
sireen audit test_contracts/VulnerableVault.sol --report live_demo_report.md
```

### What You Will Observe:
1. **Discovery (Static Analysis)**: Scans functions, invariants, and external call sites.
2. **Hypothesis Generation**: Formulates targeted hypotheses (`Reentrancy on withdraw` and `Access control on withdraw`).
3. **Foundry PoC Simulation**: Generates self-funding Solidity tests and runs `forge test` in an isolated sandbox.
4. **Judge Discrimination**: Evaluates state transitions and assertions via `HonestSignal`.
5. **Verdict**:
   - `REENTRANCY`: **[CONFIRMED]** with cryptographic Evidence Pack reference.
   - `ACCESS_CONTROL`: **[NEEDS REVIEW]** (truthfully marked unverified when exploit precondition fails).
   - `TERMINAL STATE`: **DEGRADED** (honest classification because unresolved hypotheses require triage).

---

## 4. Inspecting Evidence

View all historical audits:
```bash
sireen audits
```

Inspect the exact evidence pack and executed Foundry output in JSON format:
```bash
sireen show <audit_id> --json
```

View the generated markdown report:
```bash
cat live_demo_report.md
```
