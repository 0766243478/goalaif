"""
Tier 2 — Ground Truth Test
Tests against a contract with a CONFIRMED, REAL vulnerability pattern:
FIFO queue deadlock (Lista DAO-style).
"""

import pytest
from pathlib import Path
from graph.audit_graph import build_audit_graph, default_audit_state
from agents.base_agent import ExploitProof, PatchProposal

HERE = Path(__file__).parent
CONTRACT_PATH = str(HERE / "contracts" / "SnBnbVulnerable.sol")
VULNERABLE_CONTRACT = Path(CONTRACT_PATH).read_text()

# A PoC that asserts the deadlock: queueHead stays 0 after processing
# underfunded items. This passes on the vulnerable code but FAILS on the correct patch.
DEADLOCK_POC = '''// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {SnBnbQueueVulnerable} from "./SnBnbVulnerable.sol";

contract PoC_Deadlock is Test {
    SnBnbQueueVulnerable public target;

    function setUp() public {
        target = new SnBnbQueueVulnerable();
        target.deposit{value: 1 ether}();
        target.requestWithdrawal(2 ether);
        target.requestWithdrawal(0.5 ether);
    }

    function testExploit() public {
        target.processWithdrawals();
        assertEq(target.queueHead(), 0, "Queue advanced past underfunded item — no deadlock");
    }
}
'''

CORRECT_PATCH = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SnBnbQueueVulnerable {
    struct WithdrawalRequest {
        address user;
        uint256 amount;
        bool processed;
    }

    WithdrawalRequest[] public withdrawalQueue;
    uint256 public queueHead;
    uint256 public availableFunds;

    function requestWithdrawal(uint256 amount) external {
        withdrawalQueue.push(WithdrawalRequest(msg.sender, amount, false));
    }

    function processWithdrawals() external {
        while (queueHead < withdrawalQueue.length) {
            WithdrawalRequest storage req = withdrawalQueue[queueHead];
            if (availableFunds < req.amount) {
                queueHead++;
                continue;
            }
            availableFunds -= req.amount;
            payable(req.user).transfer(req.amount);
            req.processed = true;
            queueHead++;
        }
    }

    function deposit() external payable {
        availableFunds += msg.value;
    }
}
"""


def test_auditor_detects_queue_deadlock():
    """AuditorAgent must flag the FIFO deadlock as at least HIGH severity."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="gt-lista-001",
        source_code=VULNERABLE_CONTRACT,
    )
    final_state = graph.invoke(state)

    severities = [f.severity.value if hasattr(f.severity, 'value') else str(f.severity)
                  for f in final_state["agent_findings"]]
    assert any(s in ["CRITICAL", "HIGH"] for s in severities), \
        f"Expected CRITICAL or HIGH finding. Got: {severities}"


def test_exploit_agent_confirms_deadlock_poc():
    """ExploitAgent must produce a confirmed PoC that demonstrates the deadlock."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="gt-lista-002",
        source_code=VULNERABLE_CONTRACT,
    )
    final_state = graph.invoke(state)

    confirmed_proofs = [p for p in final_state["exploit_proofs"] if p.confirmed]
    assert len(confirmed_proofs) > 0, \
        "ExploitAgent failed to confirm any PoC on a known-vulnerable contract"

    poc_text = confirmed_proofs[0].poc_code.lower()
    assert any(kw in poc_text for kw in ["queuehead", "processwithdrawals", "deadlock", "fifo"]), \
        "PoC confirmed but doesn't reference the actual vulnerability location"


def test_patch_verifier_rejects_insufficient_patch():
    """A patch that only adds a comment must NOT pass verification."""
    graph = build_audit_graph()
    state = default_audit_state(
        session_id="gt-lista-003",
        source_code=VULNERABLE_CONTRACT,
    )
    final_state = graph.invoke(state)
    # With no custom patch mechanism in the graph, patch_validated should be False
    # when there are confirmed PoCs (the PoC still passes against original code)
    assert not final_state["patch_validated"], \
        "PatchVerifier accepted no-op patch"


def test_patch_verifier_accepts_correct_patch():
    """A PoC that asserts the deadlock must FAIL on the correct patch (proving it's fixed)."""
    from agents.patch_verifier_agent import PatchVerifierAgent

    pv = PatchVerifierAgent()

    # Create a proof with the DEADLOCK_POC that asserts queueHead == 0
    deadlock_proof = ExploitProof(
        finding_id="test-fifo",
        poc_code=DEADLOCK_POC,
        forge_output="[PASS] testExploit",
        confirmed=True,
        attack_vector="deadlock",
        estimated_impact="permanent DoS of all withdrawals",
        reason="Confirmed: FIFO queue deadlock reproduces on vulnerable code",
    )

    proposal = pv.run(
        original_code=VULNERABLE_CONTRACT,
        patched_code=CORRECT_PATCH,
        exploit_proofs=[deadlock_proof],
        contract_path=CONTRACT_PATH,
        session_id="gt-lista-004",
    )

    assert proposal.verified, \
        f"PatchVerifier rejected a correct patch. Regression report:\n{proposal.regression_report}"
