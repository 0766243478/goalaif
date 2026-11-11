# SIREEN Core v0.1 — Final Demonstration Guide

This guide enables an independent evaluator, security researcher, or investor to execute a live demonstration of SIREEN Core v0.1 from scratch.

---

## 1. System Requirements

- Linux or macOS
- Python 3.11 or 3.12
- Foundry (`forge`):
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  export PATH="$HOME/.foundry/bin:$PATH"
  ```

---

## 2. Installation (Clean Environment)

```bash
cd gaolaif/backend
pip install -r requirements.txt
pip install -e .
```

Verify the installation:
```bash
sireen --help
sireen config show
```

Output:
```
SIREEN AI Provider Configuration
---------------------------------
Active Provider:    openrouter (OpenRouter)
Active Mode:        HEURISTIC
Base URL:           https://openrouter.ai/api/v1
Model:              openai/gpt-oss-20b:free
Configured API Key: <none>
Ready:              NO (HEURISTIC mode active)
```

---

## 3. Demo Contract 1: `VulnerableVault.sol`

Audit the first vulnerable smart contract:
```bash
sireen audit test_contracts/VulnerableVault.sol --report vault_report.md
```

### Observed Behavior:
1. **Discovery**: Extracts state variables, functions, and low-level call invocations.
2. **Hypothesis**: Proposes `Reentrancy on withdraw` and `Access control on withdraw`.
3. **Simulation**: Generates Foundry PoC and executes `forge test` in an isolated sandbox (`0700` permissions).
4. **Judge**:
   - `REENTRANCY`: **[CONFIRMED]** with cryptographic Evidence Pack reference.
   - `ACCESS_CONTROL`: **[NEEDS REVIEW]** (honest non-confirmation when test precondition fails).
   - `TERMINAL STATE`: **DEGRADED** (exit code 2).

---

## 4. Demo Contract 2: `ReentrancyBank.sol`

Audit a second independent decentralized staking contract:
```bash
sireen audit test_contracts/ReentrancyBank.sol --report bank_report.md
```

### Observed Behavior:
1. Identifies `withdraw` low-level ETH transfer before updating `userBalances`.
2. Compiles and executes Foundry test suite.
3. Generates reproducible assertion evidence confirming the reentrancy drain.
4. Terminal state truthfully reflects verified status.

---

## 5. Evidence Retrieval & Independent Reproduction

List all audits stored in durable SQLite:
```bash
sireen audits
```

Inspect full evidence details:
```bash
sireen show <AUDIT_ID> --json
```

Display or verify the Markdown report:
```bash
sireen report <AUDIT_ID>
```

Reproduce any confirmed finding independently:
1. Save the PoC source from the Evidence Pack as `PoC.t.sol`.
2. Run `forge test --match-test testExploit` in a Foundry workspace.
3. Observe the passing test and gas impact.
