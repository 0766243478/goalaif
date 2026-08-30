# SIREEN Community Scope

## Product Definition

SIREEN Community v0.1 is an open-source, local-first VS Code workbench for investigating **one explicitly selected Solidity source file at a time**. It produces security hypotheses, attempts local Forge-backed proof for supported vectors, and keeps the evidence and report inspectable.

It is not an automated security guarantee. A `CONFIRMED` result requires the recorded Forge execution; `DEGRADED`, `UNVERIFIED`, and `FAILED` require human review or remediation of the environment/pipeline failure.

## Included

- VS Code extension with selected-file audit entry point.
- Local FastAPI backend on loopback.
- One-file Solidity source intake, size-limited by the backend.
- Regex-based protocol discovery and local heuristic scenarios.
- Optional OpenRouter-assisted hypothesis generation using a user-supplied local key.
- Foundry/Forge PoC generation and verification for reentrancy, access-control, and arithmetic templates.
- Explicit terminal state, warnings, raw Forge output, and durable local SQLite audit/evidence records.
- Markdown and JSON evidence reports, plus the VS Code evidence-pack viewer.
- Local configuration and actionable backend connection errors.
- Source code, tests, examples, contribution instructions, and a root open-source license after release hygiene work.

## Experimental, Disabled by Default, or Clearly Labeled

- Docker EVM/Move sandbox and Forge invariant/fuzz endpoints. They are not required for an audit, require local tools/images, and have not been validated in this audit.
- Smart memory: Qdrant-backed when configured, otherwise process-local fallback. It can inform hypotheses but never confirms a finding.
- LLM remediation patch generation. It is advisory output and is not a correctness claim.
- User-initiated exploit-scenario workflow. It must show the same Forge verification status rather than a generic "exploit succeeded" result.
- Echidna runner. It is outside the core audit pipeline and requires a separate local installation.

## Excluded

- Multi-file/project/repository scanning, import resolution, or dependency-aware analysis.
- Move-language security analysis. The extension language registration is not an implementation of Move auditing.
- Slither, Mythril, or integrated Echidna analysis in the core audit path.
- Autonomous/multi-agent repository analysis. The current experimental orchestrator simulates work and is excluded.
- Hosted execution, remote storage, authentication, teams, RBAC, organization administration, cloud audit history, notifications, billing, and usage enforcement.
- Claims of complete audits, continuous monitoring, enterprise operation, or automatic exploit generation.

## Must Be Removed or Relabeled Before v0.1

1. Remove Move from the Community audit promise and commands, or label it "editor integration only - no security analysis".
2. Hide the experimental Agent Orchestrator from release UI and documentation; it must not be called an agent system.
3. Label Sandbox, memory, patches, and Echidna as Experimental.
4. Do not present Tasks as persistent unless they are connected to the SQLite session API.
5. Replace generic success language with the backend terminal state in every entry point, especially the `/analyze` slash route.
6. Remove references to Slither/Mythril as delivered integrations.

## Small, Safe Community Fixes Before Release

| Work | Why | Complexity |
|---|---|---|
| Correct `/analyze` to emit `sireen.audit.started`, then wait for WebSocket completion | Prevents a false completed-audit state | LOW |
| Exercise the selected-file audit path against one known vulnerable Solidity fixture with and without Forge | Establishes truthful runtime behavior | MEDIUM |
| Fix marketplace workflow working directory and publish a package from the actual extension directory | Current release workflow cannot package the nested application | LOW |
| Add a root `LICENSE`, `CONTRIBUTING.md`, and accurate root README paths | Makes the repository publishable and legally clear | LOW |
| Remove/relabel unsupported UI and documentation claims | Keeps marketing within the implemented boundary | LOW |
| Commit or deliberately revert/review existing durability changes before a tag | Uncommitted changes cannot be the release baseline | LOW |

## Community v0.1 Release Gate

- [ ] A clean clone follows the documented installation path on one supported OS.
- [ ] Backend starts on loopback and extension connects or shows an actionable error.
- [ ] One selected Solidity fixture enters the pipeline and produces an explicit terminal state.
- [ ] Normal audit and slash-command audit both show `started`, progress, and final state truthfully.
- [ ] With Forge installed, one supported fixture produces a captured verification record; without Forge, it is `DEGRADED` or `UNVERIFIED`, never successful.
- [ ] Findings, no-findings, pipeline failure, and backend-unreachable states are visible in the webview.
- [ ] A durable audit can be reopened and exported as Markdown/JSON after completion.
- [ ] Extension tests/build and backend test suite pass on the release commit.
- [ ] No credentials are present in tracked source or package artifacts.
- [ ] Repository root has a license, accurate README, and contribution/security disclosure instructions.

## What Can Ship Without Further Feature Work

The local pipeline, SQLite evidence records, Forge-oriented report model, and basic VS Code workflow can ship once the release gate is met. Sandboxes, memory, patching, cloud features, external static-analysis tools, multi-file analysis, and agent orchestration should not delay Community v0.1.