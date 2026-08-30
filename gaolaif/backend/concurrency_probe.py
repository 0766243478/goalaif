"""Concurrency probe: fire N audits simultaneously, then verify:
- all N unique session ids
- every audit retrievable with correct source hash (no cross-contamination)
- findings belong to the right audit (reentrancy fixture => reentrancy finding present)
Usage: python concurrency_probe.py <port>
"""
import concurrent.futures
import hashlib
import json
import sys
import time
import urllib.request

BASE = f"http://127.0.0.1:{sys.argv[1]}"
VULN = open(r"c:\Users\humos\Goalaif\myprojrct\vuln_contracts\01_reentrancy.sol", encoding="utf-8", newline="").read()
SAFE = open(r"C:\Users\humos\Goalaif\fixtures\safe_vault_cei.sol", encoding="utf-8", newline="").read()
VULN_HASH = hashlib.sha256(VULN.encode()).hexdigest()
SAFE_HASH = hashlib.sha256(SAFE.encode()).hexdigest()

JOBS = [("vuln", VULN), ("safe", SAFE), ("vuln", VULN), ("vuln", VULN), ("safe", SAFE)]


def start(kind_code):
    body = json.dumps({"code": kind_code[1], "file_path": kind_code[0] + ".sol"}).encode()
    req = urllib.request.Request(BASE + "/audit/start", data=body, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["session_id"]


t0 = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
    ids = list(ex.map(start, JOBS))
print(f"started 5 audits in {time.time()-t0:.1f}s; unique ids: {len(set(ids))}/5")

expect = {sid: ("vuln", VULN_HASH) for (_, sid), (kind, _) in zip(enumerate(ids), JOBS)}
pending = dict(zip(ids, JOBS))
results = {}
deadline = time.time() + 480
while pending and time.time() < deadline:
    time.sleep(5)
    for sid in list(pending):
        try:
            with urllib.request.urlopen(f"{BASE}/audits/{sid}", timeout=30) as r:
                a = json.loads(r.read())
            if a.get("finished_at"):
                results[sid] = a
                del pending[sid]
        except urllib.error.HTTPError:
            pass

ok = True
for sid, (kind, code_text) in zip(ids, JOBS):
    a = results.get(sid)
    if not a:
        print(f"FAIL {sid}: never persisted")
        ok = False
        continue
    h = hashlib.sha256(code_text.encode()).hexdigest()
    hash_ok = a.get("source_hash") == h
    titles = [f["title"] for f in a.get("findings", [])]
    if kind == "vuln":
        contam = any("Reentrancy" in t and a.get("terminal_state") == "clean_with_coverage" for t in titles)
    else:
        contam = any(f.get("confirmed") for f in a.get("findings", []))
    status = "OK" if hash_ok and not contam else "FAIL"
    if status == "FAIL":
        ok = False
    print(f"{status} {sid} kind={kind} terminal={a.get('terminal_state')} "
          f"src_hash_ok={hash_ok} findings={titles}")
print("CONCURRENCY VERDICT:", "PASS" if ok and len(results) == 5 else "FAIL")
