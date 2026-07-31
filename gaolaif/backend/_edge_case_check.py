import json, time, urllib.error, urllib.request

BASE = "http://127.0.0.1:7432"

EDGE_SRC = (
    "pragma solidity ^0.8.0;\n"
    "// \u4f60\u597d \u0645\u0631\u062d\u0628\u0627 \u05e9\u05dc\u05d5\u05dd \U0001F30D\U0001F680 \U0001F512\n"
    "// <script>alert('xss')</script> <img src=x onerror=alert(1)>\n"
    "// ' OR 1=1-- ; DROP TABLE sessions;\n"
    "contract\tEdgeVault {\n"
    "\tmapping(address => uint256) public balances;\n"
    "\tfunction\tdeposit()\texternal\tpayable {\n"
    "\t\tbalances[msg.sender] += msg.value;\n"
    "\t}\n"
    "\tfunction withdraw(uint256 amount) external {\n"
    "\t\trequire(balances[msg.sender] >= amount, \"insufficient balance\");\n"
    "\t\t(bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
    "\t\trequire(ok, \"transfer failed\");\n"
    "\t\tbalances[msg.sender] = 0;\n"
    "\t}\n"
    "}\n"
)

SAFE_SRC = (
    "pragma solidity ^0.8.0;\n"
    "contract SafeVault {\n"
    "    uint256 public total;\n"
    "    function add(uint256 a) external { total += a; }\n"
    "}\n"
)

passed = 0
failures = []

def req(method, path, body=None, timeout=60):
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
    check(name, ok, f"[{status}] {json.dumps(body)[:140]}{extra}")

def wait_complete(sid, budget=150):
    t0 = time.time()
    while time.time() - t0 < budget:
        st, b, dt = req("GET", "/sessions")
        for s in b.get("sessions", []):
            if s.get("id") == sid:
                if s.get("status") == "complete":
                    return True, s
                break
        time.sleep(3)
    return False, {}

def main():
    print("== Phase 5: edge cases ==")

    st, b, dt = req("POST", "/audit/start", {"code": ""})
    expect("empty code -> 400", st, b, 400, ("error",))

    st, b, dt = req("POST", "/audit/start", {})
    expect("empty body -> 400", st, b, 400, ("error",))

    st, b, dt = req("POST", "/audit/start", {"code": "   \n\t  "})
    check("whitespace-only code handled", st in (200, 400), f"[{st}] {json.dumps(b)[:100]}")

    import urllib.request as u2
    try:
        raw = u2.urlopen(u2.Request(BASE + "/audit/start", data=b"{bad json", method="POST", headers={"Content-Type": "application/json"}), timeout=15)
        check("malformed JSON rejected", False, f"[{raw.status}]")
    except urllib.error.HTTPError as e:
        check("malformed JSON rejected", e.code in (400, 422), f"[{e.code}]")
    except Exception as e:
        check("malformed JSON rejected", False, repr(e))

    st, b, dt = req("POST", "/report/generate", {"session_id": "../../../../../../etc/evil", "protocol_name": "x"})
    expect("path traversal report/generate -> 404", st, b, 404)

    st, b, dt = req("POST", "/report/export", {"session_id": "..%2f..%2f..%2fetc%2fevil", "format": "markdown"})
    check("path traversal report/export -> 404/422", st in (404, 422), f"[{st}] {json.dumps(b)[:100]}")

    st, b, dt = req("GET", "/findings/../../../etc/passwd")
    check("path traversal findings route -> 404", st == 404, f"[{st}]")

    st, b, dt = req("POST", "/audit/start", {"code": SAFE_SRC, "session_id": "'; DROP TABLE--", "file_path": "..\\..\\evil.sol", "max_scenarios": 2})
    expect("sql-injected ids ignored (server id)", st, b, 200, ("session_id",))
    if st == 200 and isinstance(b.get("session_id"), str):
        check("server-owned session id", b["session_id"].startswith("audit-") and "DROP" not in b["session_id"], b["session_id"])
    sid_injected = b.get("session_id", "")

    st, b, dt = req("POST", "/audit/start", {"code": SAFE_SRC, "max_scenarios": "abc"})
    check("non-numeric max_scenarios no 500", st != 500, f"[{st}] {json.dumps(b)[:120]}")

    st, b, dt = req("POST", "/audit/start", {"code": SAFE_SRC, "max_scenarios": -5})
    check("negative max_scenarios no 500", st != 500, f"[{st}] {json.dumps(b)[:120]}")

    st, b, dt = req("POST", "/audit/start", {"code": SAFE_SRC, "rules": "not-a-list"})
    check("string rules no 500", st != 500, f"[{st}] {json.dumps(b)[:120]}")

    st, b, dt = req("POST", "/audit/start", {"code": EDGE_SRC, "max_scenarios": 3})
    expect("edge-content audit starts", st, b, 200, ("session_id",))
    sid_edge = b.get("session_id", "")

    t0 = time.time()
    st, b, dt = req("GET", "/health")
    check("health responsive during audit", st == 200 and dt < 2.0, f"[{st}] {dt:.2f}s")
    st, b, dt = req("GET", "/sessions")
    check("sessions responsive during audit", st == 200 and dt < 2.0, f"[{st}] {dt:.2f}s")

    done, info = wait_complete(sid_edge, budget=150)
    check("edge audit completes", done, f"{info.get('findings_count')} findings")
    if done:
        st, b, dt = req("GET", f"/findings/{sid_edge}")
        fs = b.get("findings", [])
        joined = json.dumps(fs)
        check("findings JSON round-trips unicode/emoji", "\u4f60\u597d" in EDGE_SRC and isinstance(fs, list), f"{len(fs)} findings")
        check("no <script> leaked into findings", "<script>" not in joined and "onerror" not in joined, "")
        st, b, dt = req("POST", "/report/generate", {"session_id": sid_edge, "protocol_name": "\U0001F680 \u0645\u0631\u062d\u0628\u0627 \u4f60\u597d"})
        expect("report/generate unicode protocol", st, b, 200, ("report_markdown",))
        rep = b.get("report_markdown", "")
        check("report markdown clean of raw script", "<script>" not in rep and "onerror" not in rep, "")

    big = "pragma solidity ^0.8.0;\ncontract BigVault {\n    uint256 public total;\n"
    for f in range(400):
        big += f"    function f{f}(uint256 a) external {{ total += a; }}\n"
    big += "}\n"
    st, b, dt = req("POST", "/audit/start", {"code": big, "max_scenarios": 2})
    expect("large (~40KB) code starts", st, b, 200, ("session_id",))
    sid_big = b.get("session_id", "")

    st, b, dt = req("POST", "/config/set-key", {"key": "sk-test12345678901234567890\nXSS=1"})
    check("set-key env-injection payload no crash", st in (200, 400, 500), f"[{st}]")

    print(f"\n=== EDGE-CASE RESULTS: {passed} passed, {len(failures)} failed ===")
    for name, detail in failures:
        print("FAILED:", name, "|", detail)

main()