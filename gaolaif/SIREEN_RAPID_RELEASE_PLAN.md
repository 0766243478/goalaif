# SIREEN Rapid Release Plan

## Current Product Status

SIREEN is a **partial but credible local security workbench**, not yet a public product and not a cloud service. The connected path is: VS Code selected code -> FastAPI -> heuristic/optional LLM scenarios -> supported Forge PoC attempt -> explicit terminal state -> SQLite evidence record -> report. The largest launch risk is not missing breadth; it is allowing UI, documentation, or package automation to promise more than that path actually does.

## P0: Must Fix Before Community Public Release

| Blocker | Evidence | Required action | Complexity |
|---|---|---|---|
| False completion on slash `/analyze` | `MessageRouter` posts the `/analyze` start response as `sireen.audit.complete` | Post `sireen.audit.started`; only WebSocket final event may complete | LOW |
| No root license | Only `extension/LICENSE` exists; repository root has none | Add a chosen root license covering the release tree | LOW |
| Broken marketplace publish workflow | Nested workflow uses `extension`, but source is `gaolaif/extension` from checkout root | Correct paths and execute package dry run in CI | LOW |
| Unverified real audit path | Runtime checks were intentionally deferred for this source audit | Run one fixture with Forge and one without; record expected truthful states | MEDIUM |
| Unsupported claims visible at release | Move registration; experimental agent orchestration; broad design surface | Remove/hide or visibly label before publishing | LOW |
| Release baseline is not fixed | `main.py`, `session_store.py`, and durability files are modified/untracked | Review, test, and commit an intentional release baseline | LOW |

## P1: Should Fix Before Community Public Release

| Item | Required action | Complexity |
|---|---|---|
| Install/start instructions | Test from a clean clone; correct stale paths and remove absent agent-core instructions | LOW |
| Backend unavailable behavior across every command | Exercise audit, report, exploit, sandbox, and settings errors; make failures visible | MEDIUM |
| Report path consistency | Ensure selected audit ID is propagated from normal and slash entry points to report export | LOW |
| Session/task promise | Either connect Tasks to persistence or label them temporary | LOW |
| Docker exposure | Document local-only use and do not publish the unauthenticated backend as an internet service | LOW |
| Version/package consistency | Align extension version, VSIX artifact, README version language, and tag | LOW |

## P2/P3: After Launch / Future

- P2: repository and multi-file analysis, import-aware analysis, true Move auditing, Slither/Mythril integration, hardened sandbox validation, stable Qdrant memory, and patch evaluation.
- P2: real agent orchestration only after each agent uses real tools and outputs traceable evidence.
- P3: GitHub integration, notifications, dashboards, analytics, enterprise deployment, SSO, and advanced orchestration.

## Phase A: Make One Complete Audit Path Work

1. Fix the slash-command false completion event.
2. Select one small known-vulnerable Solidity fixture and one benign/unsupported fixture.
3. Run the backend+extension normal entry point with Forge installed and verify: started -> progress -> terminal event -> finding/evidence -> durable reload -> report.
4. Run the same flow without Forge and verify it becomes `DEGRADED`/`UNVERIFIED`, never successful.
5. Run the focused backend and webview contract tests.

Exit: one supported local audit loop is proven end-to-end and its terminal state is truthful. Complexity: MEDIUM.

## Phase B: Make the UI Accurately Display the Audit

1. Hide/relabel Move analysis, autonomous agents, sandbox, memory, patches, and unpersisted tasks as specified in Community scope.
2. Make every entry point propagate the audit ID and show started/running/final/error states.
3. Verify zero findings, backend unavailable, failed pipeline, missing Forge, and confirmed fixture in the extension UI.

Exit: no UI route reports completion or success without a final backend result. Complexity: LOW to MEDIUM.

## Phase C: Package Community

1. Add root license, contribution guide, security disclosure, supported-platform statement, and clean-clone quick start.
2. Correct CI/publish paths, pin the release workflow to the actual extension, and perform a package/install smoke test.
3. Remove stale paths, absent components, and unsupported claims from README and marketplace description.
4. Tag Community v0.1 only after CI and the manual release gate pass.

Exit: a user can install a correctly labeled extension and run the documented local product. Complexity: LOW.

## Phase D: Build the Minimum Paid/Cloud Layer

1. Extract or version the shared audit/event/report contract without changing Community behavior.
2. Build authenticated organization/project/job records and tenant-scoped report access.
3. Add an isolated worker queue with durable terminal states.
4. Pilot with manual entitlements; do not begin with public self-serve billing.

Exit: one authenticated organization can submit and retrieve a durable cloud audit safely. Complexity: HIGH.

## Phase E: Publish Both Offers Honestly

1. Publish Community v0.1 as the local VS Code workbench.
2. Announce Cloud as a limited pilot only after Phase D gate passes.
3. State the exact scope: supported local Solidity workflow, Forge requirements, explicit verification statuses, and no repository-wide/Move/autonomous-agent claims.

Exit: Community is public; Pro/Cloud is either a real pilot or explicitly a waitlist, never a feature claim. Complexity: LOW once the preceding gates pass.

## Proposed Open-Source Repository Structure

Do not perform a disruptive restructure before v0.1. Normalize names and release assets around the current tree:

```text
goalaif/
  backend/                 FastAPI local API, phases, verification, SQLite store
  extension/               VS Code extension and React webview
  sandbox-images/          explicitly experimental local sandbox images
  docs/                    installation, architecture, security, scope
  examples/                small supported Solidity fixtures (add)
  tests/                   cross-surface release fixtures/harness (add gradually)
  scripts/                 package and local verification helpers (add gradually)
  .github/workflows/       CI and marketplace packaging
  README.md
  LICENSE                  add at repository root
  CONTRIBUTING.md          add
  SECURITY.md              add
  SIREEN_CAPABILITY_MATRIX.md
  SIREEN_COMMUNITY_SCOPE.md
  SIREEN_PAID_SCOPE.md
  SIREEN_RAPID_RELEASE_PLAN.md
```

The current `gaolaif`/`goalaif` naming collision should be resolved incrementally in documentation and package metadata after v0.1; do not move source directories solely for launch.

## Exact Release Order

1. Freeze and review the current working-tree changes.
2. Fix P0 false completion and publishing/license defects.
3. Run the single supported audit flow and focused tests; repair only directly exposed defects.
4. Remove or relabel false claims.
5. Validate clean-clone installation/package flow.
6. Tag and publish SIREEN Community v0.1.
7. Build the private Cloud control plane/worker pilot using the shared engine.
8. Offer Pro/Cloud only once its own minimum gate passes.

## Final Decision

**YES - SIREEN can realistically launch as an open-source Community product while simultaneously preparing a paid version.**

The Community launch is realistic because there is already a narrow, useful local workflow with a real backend, local persistence, evidence-oriented reports, and an honest Forge verification model. It requires a small number of P0 fixes and focused runtime validation, not an architectural rewrite. The paid product should be prepared in parallel as a private cloud control plane and worker layer that shares the Community engine. It is **not** realistic to launch the current subscription code as Pro/Cloud now: authentication, tenancy, cloud jobs, hosted storage, and operational security are missing.