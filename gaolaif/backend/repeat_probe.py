"""Repeat-audit determinism probe: run the SAME fixture N times, verify every
audit persists. Catches the intermittent 'audit vanished' defect.
Usage: python repeat_probe.py <port> <fixture.sol> [N]
"""
import json
import sys
import time
import urllib.request

BASE = f"http://127.0.0.1:{sys.argv[1]}"
fixture = sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 10

code = open(fixture, encoding="utf-8").read()
body = json.dumps({"code": code, "file_path": "repeat_fixture.sol"}).encode()

fails = 0
for i in range(n):
    req = urllib.request.Request(BASE + "/audit/start", data=body, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        sid = json.loads(r.read())["session_id"]
    t0 = time.time()
    result = None
    while time.time() - t0 < 180:
        time.sleep(4)
        try:
            with urllib.request.urlopen(f"{BASE}/audits/{sid}", timeout=45) as r:
                result = json.loads(r.read())
            if result.get("finished_at"):
                break
        except urllib.error.HTTPError:
            continue
        except (TimeoutError, urllib.error.URLError) as e:
            print(f"  poll error ({type(e).__name__}), retrying", flush=True)
    if not result:
        fails += 1
        print(f"run {i+1}/{n}: {sid} VANISHED (not persisted within 120s)", flush=True)
    else:
        print(f"run {i+1}/{n}: {sid} terminal={result.get('terminal_state')} "
              f"findings={len(result.get('findings', []))} "
              f"({time.time()-t0:.0f}s)", flush=True)
print(f"REPEAT VERDICT: {'PASS' if fails == 0 else f'FAIL ({fails}/{n} lost)'}", flush=True)
