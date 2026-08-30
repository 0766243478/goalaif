import asyncio
import json

import sireen_cli
from models.types import ProtocolMap
from phases.phase2_scenarios import _generate_heuristic_defaults


def test_exit_policy_is_truthful():
    assert sireen_cli._exit_code({"terminal_state": "confirmed"}) == 0
    assert sireen_cli._exit_code({"terminal_state": "clean_with_coverage"}) == 0
    assert sireen_cli._exit_code({"terminal_state": "degraded"}) == 2
    assert sireen_cli._exit_code({"terminal_state": "unverified"}) == 2
    assert sireen_cli._exit_code({"terminal_state": "failed"}) == 1


def test_audit_rejects_non_solidity_input(tmp_path):
    source = tmp_path / "contract.txt"
    source.write_text("contract C {}", encoding="utf-8")
    try:
        asyncio.run(sireen_cli._run_audit(source))
    except ValueError as error:
        assert "Solidity" in str(error)
    else:
        raise AssertionError("non-Solidity input must fail cleanly")


def test_audit_rejects_empty_input(tmp_path):
    source = tmp_path / "Empty.sol"
    source.write_text("", encoding="utf-8")
    try:
        asyncio.run(sireen_cli._run_audit(source))
    except ValueError as error:
        assert "empty" in str(error).lower()
    else:
        raise AssertionError("empty source must fail cleanly")


def test_unknown_audit_id_is_explicit(monkeypatch, capsys):
    monkeypatch.setattr(sireen_cli, "_get_audit_or_error", lambda _audit_id: None)
    assert sireen_cli.main(["show", "audit-missing"]) == 3
    assert "not found" in capsys.readouterr().err.lower()


def test_json_print_is_parseable(capsys):
    sireen_cli._json_print({"terminal_state": "degraded", "findings": []})
    assert json.loads(capsys.readouterr().out)["terminal_state"] == "degraded"


def test_safe_source_does_not_get_fabricated_reentrancy_hypothesis():
    safe_source = "contract Safe { uint256 public value; function set(uint256 next) external { value = next; } }"
    assert _generate_heuristic_defaults(safe_source, ProtocolMap(functions=["set"])) == []