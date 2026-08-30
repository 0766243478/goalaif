# SIREEN Capability Matrix

Audit date: 2026-08-27. Scope: the current `gaolaif/` working tree, including uncommitted changes. `Runtime Verified` means source tests or a checked-in verification harness exists; it does **not** mean this audit ran the dependency-heavy runtime path. `Actually Connected` means a user-facing path reaches the implementation in the current code.

| Feature | Exists | Actually Connected | Runtime Verified | Status | OSS/PAID | Priority |
|---|---|---|---|---|---|---|
| VS Code extension and React webview | Yes | Yes | Tests/build configured, not run in this audit | PARTIAL | OSS | P0 |
| Backend FastAPI API | Yes | Yes | HTTP tests exist, not run | PARTIAL | OSS | P0 |
| REST to audit pipeline | Yes | Yes for normal audit command | Tests exist, not run | PARTIAL | OSS | P0 |
| WebSocket progress/completion | Yes | Yes for normal audit command | Tests/harness exist, not run | PARTIAL | OSS | P0 |
| `/analyze` slash-command completion semantics | Yes | No: start acknowledgement is posted as `audit.complete` | Unit coverage does not cover this route | BROKEN | OSS | P0 |
| Audit job state | Yes | Yes: in-memory plus SQLite tombstone/final record | Durability tests exist, uncommitted | PARTIAL | OSS | P0 |
| Error propagation | Yes | Mostly: router/webview display REST and audit errors | Tests exist, not run | PARTIAL | OSS | P1 |
| Findings delivery/rendering | Yes | Yes for WebSocket completion payload | Webview contract tests exist, not run | PARTIAL | OSS | P0 |
| Evidence-pack report delivery | Yes | Yes through durable audit endpoints and viewer | Tests exist, not run | PARTIAL | OSS | P0 |
| Selected-file Solidity discovery | Yes | Yes | Unit/E2E tests exist, not run | PARTIAL | OSS | P0 |
| Repository/multi-file analysis | No | No; backend caps an audit to one source file | N/A | MISSING | Later | P1 |
| Solidity structural analysis | Yes | Yes, regex extraction plus optional LLM merge | Not runtime-run | PARTIAL | OSS | P0 |
| Move audit analysis | Language registration/images only | No Solidity pipeline does not implement Move semantics | N/A | MISSING | Later | P1 |
| LLM-assisted scenario generation | Yes | Yes when OpenRouter is configured | Tests skip live calls | UNVERIFIED | OSS | P1 |
| Local heuristic scenarios | Yes | Yes | Unit tests exist, not run | PARTIAL | OSS | P0 |
| Forge PoC generation | Yes | Yes, three template vectors | Needs Foundry runtime check | PARTIAL | OSS | P0 |
| Forge verification | Yes | Yes when `forge` is installed | Verification tests exist, not run | UNVERIFIED | OSS | P0 |
| Reentrancy PoC template | Yes | Yes | Needs Foundry runtime check | PARTIAL | OSS | P0 |
| Access-control PoC template | Yes | Yes | Needs Foundry runtime check | PARTIAL | OSS | P0 |
| Arithmetic PoC template | Yes | Yes | Needs Foundry runtime check | PARTIAL | OSS | P0 |
| Other vulnerability vectors | Hypotheses exist | Explicitly skipped as unsupported for PoC | N/A | PARTIAL | OSS | P1 |
| Slither integration | Terminal helper only | Not in audit pipeline | N/A | MISSING | Later | P2 |
| Mythril integration | No | No | N/A | MISSING | Later | P2 |
| Echidna integration | Runner exists | Not in core audit pipeline | Needs Echidna runtime check | EXPERIMENTAL | OSS | P2 |
| Docker sandbox | Runner/endpoints/images exist | UI can start it | Needs Docker/images runtime check | EXPERIMENTAL | OSS | P2 |
| Invariant/fuzz endpoints | Yes | API only, not core audit flow | Needs Foundry runtime check | EXPERIMENTAL | OSS | P2 |
| Exploit workflow | Yes | Yes with user-provided idea | Needs Forge/LLM runtime check | PARTIAL | OSS | P1 |
| Agent architecture | Experimental TypeScript module | No; fabricated/simulated outputs, not audit path | N/A | MOCKED | Exclude | P0 |
| Findings and terminal states | Yes | Yes | Tests exist, not run | PARTIAL | OSS | P0 |
| Local SQLite audit persistence | Yes | Yes | Tests exist; new durability tests uncommitted | PARTIAL | OSS | P0 |
| Local sessions/timeline/workspace state | Yes | Mostly connected | Tests limited/not run | PARTIAL | OSS | P1 |
| Reports (Markdown/JSON) | Yes | Yes for completed in-memory/durable audits | Tests exist, not run | PARTIAL | OSS | P0 |
| Smart memory | Yes | Audit pipeline queries/saves it | Fallback is process-local; Qdrant unverified | EXPERIMENTAL | OSS | P2 |
| Patch generation | Yes | UI/API connected, LLM-dependent | Not independently verified | EXPERIMENTAL | OSS | P2 |
| Authentication | No | No | N/A | MISSING | Paid | P0 for Pro |
| Organizations/workspaces/RBAC | No | No | N/A | MISSING | Paid | P0 for Pro |
| Hosted projects/audit history | Local-only SQLite exists | No cloud/project ownership model | N/A | MISSING | Paid | P0 for Pro |
| Background cloud jobs | No | Local `asyncio.create_task` only | N/A | MISSING | Paid | P0 for Pro |
| Billing/subscriptions | Optional Supabase/NOWPayments code | Dormant unless secrets configured; machine ID, not auth | Tests exist, not production verified | PARTIAL | Paid | P1 for Pro |
| GitHub/CI integration | No product integration | No | N/A | MISSING | Paid/Later | P2 |
| Notifications/analytics/dashboard/collaboration | No | No | N/A | MISSING | Paid/Later | P2 |
| Docker deployment | Backend Dockerfile/compose exists | Not verified; exposes unauthenticated backend | UNVERIFIED | Experimental | P1 |
| CI test workflow | Yes | Paths match repository | Not executed in this audit | UNVERIFIED | OSS | P1 |
| Marketplace publish workflow | Yes | Broken path: nested workflow uses `extension`, not `gaolaif/extension` | N/A | BROKEN | OSS | P0 |
| Root open-source license | No | No | N/A | MISSING | OSS | P0 |
| Documentation/quick start | Yes | Partly stale and path-inconsistent | Not executed | PARTIAL | OSS | P0 |

## Claims Requiring Correction

| Claim or surface | Classification | Recommendation |
|---|---|---|
| "AI-native" / LLM-assisted auditing | PARTIAL | Keep only with "optional LLM-assisted hypotheses; not proof" language. |
| "Full audit" / broad security coverage | PARTIAL | Replace with "single-file Solidity hypothesis and Forge-verification workbench". |
| "Exploit" | PARTIAL | Keep only for user-provided scenarios and explicit verification status; do not imply automatic exploitation. |
| "Slither", "Mythril", or "Echidna" as audit tooling | MOCKED/MISSING/EXPERIMENTAL | Remove Slither/Mythril claims. Label Echidna experimental and outside core path. |
| "Autonomous agent" / multi-agent analysis | MOCKED | Remove from UI/docs until the experimental orchestrator performs real work. |
| Move support | MISSING | Remove from commands, keywords, and language promise, or label editor-only experimental. |
| Sandbox simulation | EXPERIMENTAL | Keep behind an Experimental label and prerequisite/error state. |
| Persistent workspace/tasks | PARTIAL | Do not promise task persistence: the Tasks view is local reducer state. |
| Cloud, teams, enterprise, continuous security | MISSING | Remove from current product claims; describe only as future Pro/Cloud scope. |
| "100% local" | PARTIAL | Say "local execution by default" because optional OpenRouter, Supabase, NOWPayments, and Qdrant paths exist. |

## Source-Level Conclusion

The minimum real product is a local VS Code workbench for **one explicitly selected Solidity file**. It creates heuristic or optional LLM-assisted hypotheses, attempts Forge verification for three supported vectors, records truthful terminal states, persists a local audit/evidence record, and exports an evidence-oriented report. It is not a repository scanner, general static analyzer, autonomous agent system, or cloud platform.