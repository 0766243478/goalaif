"""
Live BSC mainnet fork test.
Tests Gaolaif against a real on-chain fork using Foundry's anvil.
"""
import pytest
import subprocess
import time
import os
from pathlib import Path
from graph.audit_graph import build_audit_graph, default_audit_state

BSC_RPC_URL = os.environ.get("BSC_RPC_URL", "https://bsc-dataseed1.defibit.io")
LISTA_DAO_ADDRESS = "0x6F28FeC449dbd2056D401bE8149bA1f5A3a82927"
HERE = Path(__file__).parent
CONTRACT_PATH = str(HERE / "contracts" / "SnBnbVulnerable.sol")
VULNERABLE_CONTRACT = Path(CONTRACT_PATH).read_text()


@pytest.fixture(scope="module")
def anvil_bsc_fork():
    """Start a local BSC fork via Anvil. Tear down after tests."""
    proc = subprocess.Popen(
        ["anvil", "--fork-url", BSC_RPC_URL, "--port", "8546", "--silent"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(5)
    yield "http://localhost:8546"
    proc.terminate()
    proc.wait()


@pytest.fixture(scope="module")
def lista_dao_source():
    """Load the real contract source from saved JSON (requires BSCScan API key)."""
    source_path = HERE / "lista_dao_source.json"
    if not source_path.exists():
        pytest.skip("lista_dao_source.json not found — run BSCScan fetch first")
    import json
    data = json.loads(source_path.read_text())
    raw = data["result"][0]["SourceCode"]
    if raw.startswith("{{"):
        raw = raw[1:]  # handle BSCScan double-brace wrapping
    return raw


def test_live_fork_starts_successfully(anvil_bsc_fork):
    """Verify the BSC fork is running and reachable."""
    result = subprocess.run(
        ["cast", "block-number", "--rpc-url", anvil_bsc_fork],
        capture_output=True, text=True, timeout=15,
    )
    assert result.returncode == 0, f"cast failed: {result.stderr}"
    block_num = int(result.stdout.strip())
    assert block_num > 40000000, f"Fork returned implausible block: {block_num}"


def test_gaolaif_detects_vulnerability_in_real_contract(anvil_bsc_fork, lista_dao_source):
    """Run the full pipeline on the real Lista DAO source (if available)."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="live-lista-001",
        source_code=lista_dao_source,
        fork_rpc_url=anvil_bsc_fork,
        target_address=LISTA_DAO_ADDRESS,
    )
    final_state = graph.invoke(state)

    high_or_critical = [f for f in final_state["agent_findings"]
                        if f.severity in ("CRITICAL", "HIGH")]
    assert len(high_or_critical) > 0, (
        f"No HIGH/CRITICAL findings on real Lista DAO contract.\n"
        f"All findings: {[(f.title, f.severity) for f in final_state['agent_findings']]}"
    )


def test_exploit_confirmed_on_live_fork(anvil_bsc_fork, lista_dao_source):
    """ExploitAgent must confirm at least one PoC using real on-chain state."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="live-lista-002",
        source_code=lista_dao_source,
        fork_rpc_url=anvil_bsc_fork,
        target_address=LISTA_DAO_ADDRESS,
    )
    final_state = graph.invoke(state)

    confirmed_proofs = [p for p in final_state["exploit_proofs"] if p.confirmed]
    assert len(confirmed_proofs) > 0, (
        f"No confirmed PoC on live fork.\n"
        f"All proofs: {[(p.finding_id, p.confirmed, p.reason) for p in final_state['exploit_proofs']]}"
    )


def test_forge_poc_uses_fork_template_when_fork_url_set():
    """When fork_rpc_url is provided, the generated PoC must use the fork-based template."""
    from agents.exploit_agent import ExploitAgent
    from agents.base_agent import Finding, Severity, Confidence
    import tempfile

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".sol", delete=False)
    tmp.write(VULNERABLE_CONTRACT)
    contract_path = tmp.name
    tmp.close()

    agent = ExploitAgent()
    finding = Finding(
        title="FIFO Queue Deadlock",
        description="Queue deadlock in withdrawal processing",
        severity=Severity.CRITICAL,
        category="deadlock",
        location="SnBnbVulnerable.sol:24",
        confidence=Confidence.UNCONFIRMED,
    )
    proof = agent._attempt_exploit(finding, contract_path, LISTA_DAO_ADDRESS, "http://localhost:8546")

    poc = proof.poc_code or ""
    has_fork_reference = any(kw in poc for kw in [
        "vm.createSelectFork", "vm.createFork",
        "http://localhost:8546", LISTA_DAO_ADDRESS,
    ])
    assert has_fork_reference, (
        f"PoC does not reference fork or target address.\n"
        f"PoC excerpt: {poc[:300]}"
    )
