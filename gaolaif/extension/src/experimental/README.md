# EXPERIMENTAL — NOT PART OF THE PRODUCT

These files are **quarantined** (Core v0.1, Phase 14):

- `AgentOrchestrator.ts` — advertised a 10-agent architecture but was never
  instantiated anywhere and contained **simulated** outputs
  (`{ simulated: true }`, canned findings). It is dead code.
- `SharedMemory.ts` — orphaned dependency of the orchestrator above.

They are excluded from the production path and MUST NOT be imported by any
shipped module, referenced in UI copy, or described in documentation until they
execute real tools end-to-end.

If a future version makes multi-agent orchestration real, move these back into
`src/agents/` WITH runtime tests and honest UI wiring.