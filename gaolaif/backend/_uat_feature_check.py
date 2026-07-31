import json
import os
import shutil
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:7432"
VULN = (
    "pragma solidity ^0.8.0;\n"
    "contract VulnerableVault {\n"
    "    mapping(address => uint256) public balances;\n"
    "    event Deposit(address indexed who, uint256 amount);\n"
    "    event Withdrawal(address indexed who, uint256 amount);\n"
    "    function deposit() public payable {\n"
    "        require(msg.value > 0, \"no value\");\n"
    "        balances[msg.sender] += msg.value;\n"
    "        emit Deposit(msg.sender, msg.value);\n"
    "    }\n"
    "    function withdraw(uint256 amount) public {\n"
    "        require(balances[msg.sender] >= amount, \"insufficient balance\");\n"
    "        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
    "        require(ok, \"transfer failed\");\n"
    "        balances[msg.sender] -= amount;\n"
    "        emit Withdrawal(msg.sender, amount);\n"
    "    }\n"
    "    function balanceOf(address who) public view returns (uint256) { return balances[who]; }\n"
    "}"
)

passed = 0
failures = []


def req(method, path, body=None, timeout=90):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    if body is not None:
        r.add_header("Content-Type", "application/json")
    t0 = time.time()
    try:
        resp = urllib.request.urlopen(r, timeout=timeout)
        raw = resp.read().decode()
        return resp.status, json.loads(raw) if raw else {}, time.time() - t0
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        try:
            return e.code, json.loads(raw), time.time() - t0
        except Exception:
            return e.code, {"raw": raw[:200]}, time.time() - t0
    except Exception as e:
        return -1, {"error": str(e)}, time.time() - t0


def check(name, ok, detail=""):
    global passed
    if ok:
        passed += 1
        print(f"PASS  {name}  {detail}")
    else:
        failures.append((name, detail))
        print(f"FAIL  {name}  {detail}")


def expect(name, status, body, want, keys=()):
    ok = status == want
    extra = ""
    if isinstance(body, dict):
        miss = [k for k in keys if k not in body]
        if miss:
            ok = False
            extra = " missing=" + ",".join(miss)
    check(name, ok, f"[{status}] {json.dumps(body)[:120]}{extra}")


def main():
    st, b, dt = req("GET", "/health")
    expect("GET /health", st, b, 200, ("status", "backend", "version"))
    st, b, dt = req("GET", "/models")
    expect("GET /models", st, b, 200, ("models", "api_configured"))
    st, b, dt = req("GET", "/config/status")
    expect("GET /config/status", st, b, 200, ("api_configured", "forge_available", "docker_available", "qdrant_available"))
    if st == 200:
        check("forge detected", b.get("forge_available") is True, f"forge_available={b.get('forge_available')}")

    st, b, dt = req("POST", "/chat", {"message": "hello", "session_id": "uat-1"})
    expect("POST /chat", st, b, 200, ("id", "role", "content", "timestamp"))
    st, b, dt = req("POST", "/analyze/quick", {"code": VULN, "session_id": "uat-1"})
    expect("POST /analyze/quick", st, b, 200, ("functions", "state_variables", "modifiers", "imports", "invariants"))
    if st == 200 and isinstance(b.get("functions"), list):
        names = " ".join(str(f) for f in b["functions"])
        check("quick detected withdraw", "withdraw" in names, names[:80])
    st, b, dt = req("POST", "/analyze/function", {"code": VULN, "function_name": "withdraw", "session_id": "uat-1"})
    expect("POST /analyze/function", st, b, 200, ("analysis", "function_name"))
    st, b, dt = req("POST", "/explain", {"code": VULN, "question": "Is withdraw reentrant?", "session_id": "uat-1"})
    expect("POST /explain", st, b, 200, ("explanation",))

    st, b, dt = req("POST", "/analyze", {"code": ""})
    expect("POST /analyze empty code -> 400", st, b, 400, ("error",))
    st, b, dt = req("POST", "/audit/start", {"code": ""})
    expect("POST /audit/start empty code -> 400", st, b, 400, ("error",))
    st, b, dt = req("POST", "/exploit/start", {"code": ""})
    expect("POST /exploit/start empty code -> 400", st, b, 400, ("error",))
    st, b, dt = req("POST", "/exploit/start", {"code": VULN, "idea": "   "})
    expect("POST /exploit/start empty idea -> 400", st, b, 400, ("error",))

    st, b, dt = req("POST", "/audit/start", {
        "code": VULN, "session_id": "uat-audit", "max_scenarios": 2, "anonymize": False,
    })
    expect("POST /audit/start", st, b, 200, ("session_id", "status"))
    if st == 200:
        sid = b["session_id"]
        check("audit session id server-owned", sid.startswith("audit-") and "uat-audit" not in sid, sid)
        check("audit status started", b["status"] == "started", b["status"])
        print(f"      polling for audit completion (sid={sid}) ...")
        final_status = None
        deadline = time.time() + 600
        while time.time() < deadline:
            time.sleep(3)
            st, b, dt = req("GET", "/sessions")
            if st == 200:
                for s in b.get("sessions", []):
                    if s.get("id") == sid:
                        final_status = s["status"]
                if final_status in ("complete", "error"):
                    break
        check("audit completes", final_status == "complete", f"status={final_status}")
        st, b, dt = req("GET", f"/findings/{sid}")
        expect("GET /findings/{sid}", st, b, 200, ("findings",))
        if st == 200:
            check("audit produced findings", len(b["findings"]) > 0, f"n={len(b['findings'])}")
        st, b, dt = req("GET", f"/protocol-map/{sid}")
        expect("GET /protocol-map/{sid}", st, b, 200, ("protocol_map",))

        st, b, dt = req("POST", "/report/generate", {"session_id": sid, "protocol_name": "Vault"})
        expect("POST /report/generate", st, b, 200, ("report_markdown", "report_path"))
        st, b, dt = req("POST", "/report/export", {"session_id": sid, "format": "markdown"})
        expect("POST /report/export md", st, b, 200, ("report", "format"))
        if st == 200:
            check("export md format", b.get("format") == "markdown", b.get("format"))
        st, b, dt = req("POST", "/report/export", {"session_id": sid, "format": "json"})
        expect("POST /report/export json", st, b, 200, ("report", "format"))
        if st == 200 and isinstance(b.get("report"), list):
            check("export json is list", len(b["report"]) > 0, f"n={len(b['report'])}")
        st, b, dt = req("POST", "/report/export", {"session_id": sid, "format": "pdf"})
        expect("POST /report/export bad format -> 400", st, b, 400, ("error",))
        st, b, dt = req("GET", "/sessions")
        if st == 200:
            for s in b.get("sessions", []):
                if s.get("id") == sid:
                    check("session created_at > 0", s.get("created_at", 0) > 0, f"created_at={s.get('created_at')}")

    st, b, dt = req("POST", "/exploit/start", {
        "code": VULN, "idea": "Reentrancy via external call before state update in withdraw",
        "target_function": "withdraw", "session_id": "uat-exploit",
    })
    expect("POST /exploit/start", st, b, 200, ("session_id", "status"))

    st, b, dt = req("POST", "/sandbox/fuzz", {"code": VULN, "iterations": 500, "session_id": "uat-fuzz"})
    expect("POST /sandbox/fuzz", st, b, 200, ("found_bug", "output", "session_id"))
    st, b, dt = req("POST", "/sandbox/invariant", {"file_path": "test_contracts/VulnerableVault.sol", "session_id": "uat-inv"})
    expect("POST /sandbox/invariant no foundry.toml -> 400", st, b, 400, ("findings", "error"))
    st, b, dt = req("POST", "/sandbox/invariant", {"file_path": "", "session_id": "uat-inv2"})
    expect("POST /sandbox/invariant empty path -> 400", st, b, 400, ("findings", "error"))
    st, b, dt = req("POST", "/sandbox/start", {"language": "solidity", "session_id": "uat-sbx"})
    check("POST /sandbox/start graceful", st == 200 and isinstance(b, dict), f"[{st}] {json.dumps(b)[:120]}")

    st, b, dt = req("POST", "/memory/search", {"query": "reentrancy", "top_k": 3})
    expect("POST /memory/search", st, b, 200, ("results",))
    st, b, dt = req("POST", "/memory/save", {
        "key": "uat-pattern-1",
        "content": "abstract pattern: reentrancy guarded by checks-effects-interactions",
    })
    expect("POST /memory/save valid", st, b, 200, ("status", "key"))
    st, b, dt = req("POST", "/memory/save", {
        "key": "uat-raw",
        "content": "function withdraw() external { balances[msg.sender] = 0; require(ok); }",
    })
    expect("POST /memory/save raw code -> 400", st, b, 400, ("error",))
    st, b, dt = req("POST", "/memory/save", {"key": "", "content": "x"})
    expect("POST /memory/save empty key -> 400", st, b, 400, ("error",))

    st, b, dt = req("GET", "/subscription/status")
    expect("GET /subscription/status", st, b, 200, ("enabled", "tier", "can_scan"))
    st, b, dt = req("POST", "/subscription/upgrade", {"machine_id": "uat-m1", "tier": "hunter"})
    expect("POST /subscription/upgrade disabled -> 503", st, b, 503, ("error",))
    st, b, dt = req("POST", "/payment/webhook", {})
    expect("POST /payment/webhook disabled -> 503", st, b, 503, ("error",))

    st, b, dt = req("POST", "/patch/generate", {
        "code": VULN,
        "finding": {"title": "Reentrancy", "severity": "CRITICAL",
                    "description": "State change after external call",
                    "affected_functions": ["withdraw"]},
        "session_id": "uat-1",
    })
    expect("POST /patch/generate", st, b, 200, ("patched_code", "success"))

    st, b, dt = req("POST", "/config/set-key", {"key": ""})
    expect("POST /config/set-key empty -> 400", st, b, 400, ("error",))
    st, b, dt = req("POST", "/config/set-key", {"key": "short"})
    expect("POST /config/set-key short -> 400", st, b, 400, ("error",))

    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    backup = None
    if os.path.exists(env_path):
        with open(env_path, "rb") as f:
            backup = f.read()
    st, b, dt = req("POST", "/config/set-key", {"key": "sk-uat-test-12345678901234567890"})
    expect("POST /config/set-key success", st, b, 200, ("status", "message"))
    if st == 200:
        with open(env_path, "r", encoding="utf-8", errors="replace") as f:
            check("set-key persists to .env", "sk-uat-test-12345678901234567890" in f.read(), "persisted")
    if backup is not None:
        tmp = env_path + ".restore"
        with open(tmp, "wb") as f:
            f.write(backup)
        shutil.copyfile(tmp, env_path)
        with open(env_path, "r", encoding="utf-8", errors="replace") as f:
            check(".env restored", "sk-uat-test-12345678901234567890" not in f.read(), "restored")

    print()
    print(f"TOTAL: {passed} passed, {len(failures)} failures")
    if failures:
        for name, err in failures:
            print(f"  FAILED: {name} -> {err}")
        return 1
    print("ALL UAT CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
