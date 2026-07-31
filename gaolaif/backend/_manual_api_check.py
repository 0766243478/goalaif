"""Manual HTTP smoke test for the backend REST API.

Requires a live backend on http://localhost:7432.
Run directly:  python _manual_api_check.py
Exits nonzero if any endpoint misbehaves.
Not collected by pytest (underscore prefix).
"""

import json
import urllib.error
import urllib.request

BASE = "http://localhost:7432"
failures = []


def _check(name, method, path, body=None, expect_status=200, expect_keys=()):
    """Exercise one endpoint and assert status code + response keys."""
    try:
        url = f"{BASE}{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        if body is not None:
            req.add_header("Content-Type", "application/json")
        resp = urllib.request.urlopen(req, timeout=15)
        result = json.loads(resp.read().decode())

        errors = []
        if resp.status != expect_status:
            errors.append(f"status {resp.status} != expected {expect_status}")
        if not isinstance(result, dict):
            errors.append(f"response is not a JSON object: {type(result).__name__}")
        else:
            for key in expect_keys:
                if key not in result:
                    errors.append(f"missing key {key!r}")

        if errors:
            failures.append((name, "; ".join(errors)))
            print(f"FAIL  {name}: {'; '.join(errors)}")
        else:
            print(f"PASS  {name} [{resp.status}] {str(result)[:100]}")
        return result
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        if e.code == expect_status:
            result = {}
            try:
                result = json.loads(body_text)
            except Exception:
                pass
            errors = []
            for key in expect_keys:
                if key not in result:
                    errors.append(f"missing key {key!r}")
            if errors:
                failures.append((name, "; ".join(errors)))
                print(f"FAIL  {name}: {'; '.join(errors)}")
            else:
                print(f"PASS  {name} [{e.code}] (expected) {body_text[:100]}")
            return result
        failures.append((name, f"HTTP {e.code}: {body_text[:120]}"))
        print(f"FAIL  {name}: HTTP {e.code}: {body_text[:120]}")
        return None
    except Exception as e:
        failures.append((name, str(e)[:200]))
        print(f"FAIL  {name}: {e}")
        return None


def main():
    _check("GET /health", "GET", "/health",
           expect_keys=("status", "backend", "version"))
    _check("POST /chat", "POST", "/chat",
           {"message": "hello", "session_id": "api-test-1"},
           expect_keys=("id", "role", "content", "timestamp"))
    _check("POST /analyze/quick", "POST", "/analyze/quick", {
        "code": "pragma solidity ^0.8.0; contract Vault { mapping(address => uint) balances; function withdraw() external { uint b = balances[msg.sender]; payable(msg.sender).transfer(b); balances[msg.sender] = 0; } }",
        "session_id": "api-test-1",
    }, expect_keys=("functions", "state_variables", "invariants"))
    _check("POST /analyze/function", "POST", "/analyze/function", {
        "code": "pragma solidity ^0.8.0; contract Vault { function withdraw() external { uint b = balances[msg.sender]; payable(msg.sender).transfer(b); } }",
        "function_name": "withdraw",
        "session_id": "api-test-1",
    }, expect_keys=("analysis", "function_name"))
    _check("POST /explain", "POST", "/explain", {
        "code": "uint x = msg.value; address(this).call{value: x}(\"\");",
        "question": "What does this do?",
        "session_id": "api-test-1",
    }, expect_keys=("explanation",))
    _check("GET /findings/{session}", "GET", "/findings/api-test-1",
           expect_keys=("findings",))
    _check("GET /sessions", "GET", "/sessions",
           expect_keys=("sessions",))
    _check("GET /protocol-map/{session}", "GET", "/protocol-map/api-test-1",
           expect_keys=("protocol_map",))
    _check("GET /config/status", "GET", "/config/status",
           expect_keys=("api_configured", "forge_available", "docker_available", "qdrant_available"))
    _check("POST /memory/search", "POST", "/memory/search",
           {"query": "reentrancy"}, expect_keys=("results",))
    _check("POST /patch/generate", "POST", "/patch/generate", {
        "code": "function withdraw() external { uint b = balances[msg.sender]; payable(msg.sender).transfer(b); balances[msg.sender] = 0; }",
        "finding": {"title": "Reentrancy", "severity": "CRITICAL", "description": "State change after external call"},
    })
    # Unknown session: documented 404 with an error payload.
    _check("POST /report/export (unknown session)", "POST", "/report/export", {
        "session_id": "api-test-1",
        "format": "markdown",
    }, expect_status=404, expect_keys=("error",))

    print()
    print(f"TOTAL: {len(failures)} failures")
    if failures:
        for name, err in failures:
            print(f"  FAILED: {name} -> {err}")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
