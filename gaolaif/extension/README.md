# SIREEN — Solidity Security Verification

**Local-first, Forge-backed security verification for Solidity.**
You state the attack hypothesis. AI assists the investigation. **Foundry executes the
proof-of-concept.** Only a real Forge run can mark a finding `CONFIRMED`.

> **AI reasoning is not proof.** A model saying "this looks vulnerable" is a *hypothesis*.
> A generated PoC is an *attempt*. In SIREEN, a finding becomes `CONFIRMED` only when an
> independent `forge test` execution actually reproduced the exploit.

---

## What SIREEN is for

You suspect a specific Solidity function is exploitable and you want that suspicion
**settled by execution, not opinion**.

SIREEN is built for:

- **Security researchers** who want a suspicion resolved by a runnable PoC.
- **Solidity developers** asking whether something is actually exploitable.
- **Auditors and protocol teams** who need an evidence trail a reviewer can re-run.

It is **not** a scanner. You point it at one Solidity file you have selected.

---

## How it works

```
  SOLIDITY FILE   you explicitly select one file
        |
  UNDERSTANDING   functions, state, external-call sites
        |
  HYPOTHESIS      heuristic, or LLM-assisted if you configure a key
        |
  ATTACK PATH     preconditions and the entry point
        |
  PoC             a Foundry test is generated for a supported vector
        |
  FORGE           forge build + forge test actually run on your machine
        |
  HONESTSIGNAL    5 sequential gates decide the verdict
        |
  EVIDENCE        PoC source, raw Forge output, reproduction steps
```

### The five HonestSignal gates

A finding reaches `CONFIRMED` only if **every** gate passes, in order:

1. **PoC generated** — a proof-of-concept was produced
2. **Compiled** — Forge compiled the PoC against your source
3. **Executed** — at least one test actually ran
4. **Exploit reproduced** — the exploit condition was genuinely met
5. **Confirmed** — evidence is complete and traceable to real Forge output

If any gate fails, SIREEN records the failing gate. It does not guess, and it does not
round a partial result up to success. Trivial or skipped assertions are rejected.

### Audit terminal states

| State | Meaning |
|---|---|
| `CONFIRMED` | At least one finding verified by real Forge execution; nothing unverified remains |
| `CLEAN_WITH_COVERAGE` | Nothing reproduced, and every hypothesis received a real execution attempt |
| `DEGRADED` | Completed with partial verification; some findings need manual review |
| `UNVERIFIED` | Analysis ran but the verifier could not adjudicate (e.g. Forge unavailable) |
| `FAILED` | Pipeline error, or every PoC failed generation/compilation |

SIREEN never reports a bare "looks secure."

---

## Automatic PoC coverage

Foundry PoCs are generated automatically for **three** vectors on a single contract:

- **Reentrancy**
- **Access control**
- **Arithmetic**

Any other vector is reported honestly as unsupported rather than guessed at. SIREEN does
**not** auto-generate multi-contract or cross-contract PoCs.

---

## Requirements

| | |
|---|---|
| **Foundry (`forge`)** | Required for verification. Without it, results are `UNVERIFIED` — never `CONFIRMED` |
| **Python 3.11+** | Runs the local SIREEN backend |
| **VS Code** | 1.85.0 or newer |
| **LLM API key** | **Optional.** Without one, SIREEN runs in heuristic mode |

---

## Install and run

1. Install this extension.
2. Start the SIREEN backend locally (Python). Point the extension at it with
   `gaolaif.backendPath`, or set `gaolaif.backendPort` if it already runs (default `7432`).
3. Open a `.sol` file.
4. Right-click in the editor and choose **Sireen: Analyze Current File**.
5. Review the hypothesis, the generated PoC, the raw Forge output, and the verdict.

### Useful settings

| Setting | Purpose |
|---|---|
| `gaolaif.backendPort` | Port the local backend listens on |
| `gaolaif.backendPath` | Absolute path to the backend so the extension can start it |
| `gaolaif.pythonPath` | Python interpreter if `python` is not on `PATH` |
| `gaolaif.maxScenarios` | Cap on attack scenarios generated per audit |

---

## Privacy — local-first, not "100% local"

**By default everything runs on your machine.** Forge executes locally, the backend is
local, and audit history and evidence are stored in a local SQLite database.

**If — and only if — you configure an LLM API key**, contract source and analysis prompts
are sent to that provider (OpenRouter) for hypothesis generation. That is a genuine
outbound network call, so we do not describe SIREEN as "100% local".

Turn the key off and SIREEN still works, in heuristic mode.

Your API key stays in your local environment. It is never bundled into this extension,
written into reports or evidence, or sent anywhere except the provider you configured.

---

## Limitations

Stated plainly, because a security tool that oversells itself is worse than useless:

- **One explicitly selected Solidity file per audit.** No repository-wide or multi-file analysis.
- **Automatic PoCs for three vectors only** (reentrancy, access control, arithmetic).
- **No cross-contract PoC generation.**
- **No Move, Aptos, or Sui support.**
- **No Slither, Mythril, or Echidna** in the verification path.
- **No guarantee of discovery.** SIREEN proves specific hypotheses; it does not prove absence of bugs.
- **Severity labels are heuristic estimates**, not authoritative risk scores.
- Not a replacement for professional audit.

---

## Authorized use only

SIREEN generates and executes exploit proof-of-concept code. Use it only against
contracts you own or have **explicit written authorization** to test.

---

## Security

Found a security issue in SIREEN itself? Please report it privately via
[GitHub issues](https://github.com/0766243478/goalaif/issues) — do not include exploit
details for third-party contracts.

---

## License — proprietary

SIREEN is **proprietary, closed-source software**. Copyright (c) 2026 Hussein Mohammed.
All rights reserved.

The [source repository](https://github.com/0766243478/goalaif) is **publicly visible** so
the implementation can be reviewed and verified. **Public visibility is not an open-source
licence.** No right to copy, modify, redistribute, or reuse the source is granted. See the
bundled `LICENSE` for exact terms.

---

**Repository:** https://github.com/0766243478/goalaif
**Website:** https://goalaif-wep.vercel.app
