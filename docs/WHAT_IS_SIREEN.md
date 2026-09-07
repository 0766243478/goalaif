# What is SIREEN?

> **Canonical factual source.** Every statement below was verified against the
> **`main`** branch — the released code. Where `main` and this document
> disagree, the code wins and this document must be corrected.
>
> Rule of precedence: **CODE > DOCUMENTATION > MARKETING.**
>
> Functionality that exists only in an unreleased working branch is listed
> separately under [In development](#in-development-not-released) and must never
> be presented as available.

**SIREEN is a local-first, Forge-backed security workbench for Solidity: it turns
an attack hypothesis about one Solidity file into an executable Foundry
proof-of-concept, runs it, and only marks a finding CONFIRMED when that execution
actually reproduced the exploit.**

## Who is it for?

- Security researchers who want a suspicion settled by execution, not opinion.
- Solidity developers asking "is this actually exploitable?"
- Auditors and protocol teams who need an evidence trail a reviewer can re-run.

It is **not** for someone who wants to point a scanner at a repository and get a
findings list — SIREEN analyzes one explicitly selected Solidity file per audit.

## What problem does it solve?

Static analyzers and LLMs both emit *claims*. Claims are cheap, often wrong, and
expensive to triage. SIREEN's position is that a vulnerability report is worth
acting on only once an independent execution engine reproduced it — so the
system is built to refuse to say CONFIRMED without that execution.

## How does SIREEN work? (released pipeline)

```
INPUT → DISCOVERY → REASONING → HYPOTHESIS → ATTACK PATH
      → PoC → VERIFICATION (Forge) → EVIDENCE → FINDING → REPORT
```

Implemented as an explicit staged pipeline in `backend/phases/`:
`phase1_understand` → `phase2_scenarios` → `phase3_simulate` → `phase4_judge`
(plus `phase5_patch`). A FastAPI backend drives it; a VS Code extension and a
`sireen` CLI are the two front ends.

## What counts as verified?

`confirmed = True` is assigned in exactly **one** place in the entire codebase —
`backend/verification/honest_signal.py` — and only after every gate passes in
sequence:

| Gate | Requirement |
|---|---|
| 1 | A PoC was generated |
| 2 | It compiled |
| 3 | It executed |
| 4 | The exploit was reproduced |
| 4.5 | PoC content integrity check |
| 5 | Confirm |

A test skipped with `vm.skip(true)` is explicitly **not** accepted as proof.

### Terminal states (released)

Never a generic "success":

| State | Meaning |
|---|---|
| `CONFIRMED` | ≥1 finding verified by Forge execution; no unverified findings remain |
| `DEGRADED` | Partial verification (e.g. Forge unavailable, or a finding needs manual review) |
| `UNVERIFIED` | Analysis ran but the verifier could not adjudicate, or coverage policy not met |
| `FAILED` | Pipeline error, or every PoC failed generation/compilation |
| `CLEAN_WITH_COVERAGE` | Nothing reproduced **and** every hypothesis got a real executed attempt |

## How does SIREEN use AI?

AI generates hypotheses and attack scenarios and helps draft a candidate PoC.
**AI output is never evidence.** With no API key, SIREEN runs in HEURISTIC mode;
with an OpenRouter key it runs LLM_ASSISTED. The verdict path is identical in
both cases, because only HonestSignal can confirm anything.

## Automatic PoC vectors

Templates exist for exactly three vectors, confirmed in
`phases/phase3_simulate.py` on `main`:

- **reentrancy**
- **access control**
- **arithmetic**

Every other vector (oracle manipulation, flash loans, governance, …) falls
through to `_unimplemented_poc()`, which emits a **deliberately skipped test**
rather than a fake passing one — the in-code comment records this as a fix to
prevent false positives — and the run is recorded as `skipped_unsupported`
(`backend/main.py`).

This composes with Gate 4.5: because a skipped test is rejected as proof, an
unsupported vector is structurally incapable of reaching `CONFIRMED`.

## What happens if Forge is unavailable?

The run does not produce a verdict it did not earn. Findings remain
needs-review and the audit lands in `DEGRADED` or `UNVERIFIED`. Absence of
verification is never reported as absence of a vulnerability.

## Is it local-first?

Yes, with one precise caveat:

- Forge builds and tests execute **on your machine**.
- With **no LLM API key configured, nothing leaves the machine.**
- With a key configured, reasoning context is sent to that provider. An
  anonymizer/firewall layer (`backend/firewall/`: `anonymizer.py`,
  `outbound.py`, `inbound.py`) processes outbound content.

"Local-first" is accurate. **"100% local" is not**, whenever an LLM provider is
configured.

## Supported technologies

| | |
|---|---|
| Language | Solidity (**Move is not supported**) |
| Verification engine | Foundry (`forge build`, `forge test`) |
| Interfaces | `sireen` CLI, VS Code extension (`^1.85.0`) |
| Backend | Python ≥ 3.11, FastAPI, SQLite persistence |
| Optional | OpenRouter-compatible LLM; Qdrant abstract pattern memory |
| License | MIT |

## What SIREEN does NOT claim

- **Not an autonomous scanner.** One explicitly selected Solidity file per
  audit — no repository or multi-file project scanning.
- **AI output is not proof**, at any confidence.
- **No Move support**, despite historical marketing to the contrary.
- **No authoritative risk scores.** Severity labels are heuristic estimates.
- **No Slither / Mythril / Echidna** inside the audit path.
- **No hosted execution, teams, RBAC, billing, or autonomous agents.**
- **Coverage is never claimed beyond the file actually analyzed.**

## In development (NOT released)

Present in a working branch only — **must not be described as available**:

- A human-hypothesis investigation loop (`backend/investigation/`), including a
  finer-grained `verification_state` and a separate human `human_decision` axis.
- Repository / Foundry-project mode (`investigation/repo.py`).
- A human-authored PoC lane for vectors without a template.

Until these are merged to `main` and released, SIREEN's public description
remains the single-file, pipeline-driven model documented above.

## Open source status

SIREEN is **MIT licensed**. Note that an MIT license does not by itself make a
repository publicly readable — see the repository's visibility setting for
whether the source is currently publicly accessible.

## Frequently asked questions

**Is SIREEN an autonomous smart-contract scanner?** No. It analyzes one
explicitly selected Solidity file and requires a real Forge execution before
confirming anything.

**Does SIREEN use Foundry?** Yes — Forge is the verification engine. There is no
CONFIRMED result without a Forge run.

**Can SIREEN generate proof-of-concepts?** Yes, for reentrancy, access control,
and arithmetic. Other vectors are marked `skipped_unsupported`.

**How is SIREEN different from a static analyzer?** A static analyzer reports
suspected patterns without executing them. SIREEN requires a PoC to compile,
run, and reproduce the claimed impact before anything is confirmed.

**How is SIREEN different from a traditional audit?** A traditional audit
produces a human-written report. SIREEN produces a re-runnable evidence pack —
source, PoC, Forge output, observed impact, reproduction steps.

**What chains does it support?** SIREEN analyzes Solidity source locally with
Foundry. It is not chain-specific and connects to no network to verify.
