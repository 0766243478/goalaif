import time, sys
from pathlib import Path
from graph.audit_graph import build_audit_graph, default_audit_state

contract_source = Path(__file__).parent / "tests/integration/contracts/SnBnbVulnerable.sol"
source_code = contract_source.read_text(encoding="utf-8")

graph = build_audit_graph()
state = default_audit_state(
    session_id="profiler-001",
    source_code=source_code,
)

start = time.perf_counter()
final = graph.invoke(state)
total = time.perf_counter() - start

print(f"\n--- TIMER SUMMARY ---")
for name, elapsed in sorted(graph._timers.items(), key=lambda x: x[1], reverse=True):
    print(f"  {name:25s} {elapsed:7.2f}s")
print(f"  {'TOTAL':25s} {total:7.2f}s")
print(f"\nStatus: {final['status']}")
print(f"Findings: {len(final['agent_findings'])}")
print(f"Exploit proofs: {len(final['exploit_proofs'])}")
print(f"Iterations: {final['iteration_count']}")
sys.exit(0 if final['status'] in ('complete', 'error') else 1)
