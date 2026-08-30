"""Journey driver: run audits over fixture files and report terminal states.
Usage: python journey.py <port> <fixture1.sol> [fixture2.sol ...]
Prints one JSON line per audit: {file, session_id, terminal_state, findings:[{title, confirmed, needs_review}]}
"""
import json
import sys
import time
import urllib.request

BASE = f"http://127.0.0.1:{sys.argv[1]}"
fixtures = sys.argv[2:]

for path in fixtures:
    with open(path, encoding="utf-8") as f:
        code = f.read()
    body = json.dumps({"code": code, "file_path": path.replace("\\", "/").split("/")[-1]}).encode()
    req = urllib.request.Request(BASE + "/audit/start", data=body, method="method_placeholder".replace("method_placeholder", "POST"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        start = json.loads(resp.read())
    sid = start["session_id"]
    t0 = time.time()
    result = None
    while time.time() - t0 < 180:
        time.sleep(4)
        try:
            with urllib.request.urlopen(f"{BASE}/audits/{sid}", timeout=30) as r:
                result = json.loads(r.read())
            if result.get("finished_at"):
                break
        except urllib.error.HTTPError:
            continue
    if not result:
        print(json.dumps({"file": path, "session_id": sid, "error": "not persisted within 180s"}), flush=True)
        continue
    dur = round(time.time() - t0, 1)
    findings = [{"title": f["title"], "confirmed": f["confirmed"], "needs_review": f.get("needs_review")}
                for f in result.get("findings", [])]
    print(json.dumps({"file": path.split("\\")[-1], "session_id": sid,
                      "terminal_state": result.get("terminal_state"),
                      "forge": bool(result.get("forge_available")),
                      "duration_s": dur, "findings": findings}), flush=True)
