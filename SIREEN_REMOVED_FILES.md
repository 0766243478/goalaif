# SIREEN Core v0.1 — Removed Files

The following tracked files are deleted in the current change set after reference/dependency review.

## Docker/sandbox runner surface

- `gaolaif/backend/sandbox/docker_runner.py`
- `gaolaif/backend/sandbox/echidna_runner.py`
- `gaolaif/backend/sandbox/env_detector.py`
- `gaolaif/extension/src/commands/runSandbox.ts`
- `gaolaif/extension/src/sidebar/webview/layouts/BottomPanel.tsx`
- `gaolaif/extension/src/sidebar/webview/views/SimulationView.tsx`

## Subscription/payment surface

- `gaolaif/backend/subscription/__init__.py`
- `gaolaif/backend/subscription/manager.py`
- `gaolaif/backend/subscription/payments.py`
- `gaolaif/backend/tests/test_subscription.py`

## Duplicate/experimental and unused webview surface

- `gaolaif/extension/src/experimental/AgentOrchestrator.ts`
- `gaolaif/extension/src/experimental/SharedMemory.ts`
- `gaolaif/extension/src/experimental/README.md`
- `gaolaif/extension/src/session/AIProviderManager.ts`
- `gaolaif/extension/src/session/ActivityTimeline.ts`
- `gaolaif/extension/src/session/index.ts`
- `gaolaif/extension/src/session/useSession.ts`
- `gaolaif/extension/src/sidebar/webview/components/MemoryPanel.tsx`
- `gaolaif/extension/src/sidebar/webview/ui/components/MemoryCard.tsx`
- `gaolaif/extension/src/sidebar/webview/views/MemoryView.tsx`

## Obsolete tests

- `gaolaif/backend/test_e2e_mvp.py`

## Explicitly retained

`gaolaif/backend/sandbox/env_simulator.py` and `gaolaif/backend/sandbox/forge_std_mock.py` remain. `phase3_simulate.py` imports them for Forge-based environment simulation and test-project support; they are not Docker runners.
