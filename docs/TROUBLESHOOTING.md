# SIREEN Troubleshooting Guide

Common issues and solutions when running SIREEN Core:

---

## 1. `forge: command not found`
**Symptom:** Terminal output displays `POC GENERATED` but `FORGE BLOCKED`.
**Resolution:**
Foundry is not on your current shell `PATH`.
Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
export PATH="$HOME/.foundry/bin:$PATH"
```

---

## 2. Terminal State is `DEGRADED` (Exit Code 2)
**Symptom:** Audit completes with `[CONFIRMED]` findings, but the terminal state is `DEGRADED` with exit code 2.
**Explanation:**
This is intended behavior under SIREEN's strict honesty policy. If any generated hypothesis failed execution or could not be verified by Forge, it is marked `[NEEDS REVIEW]`. An audit cannot be declared unconditionally clean or fully confirmed while any hypothesis requires manual triage.

---

## 3. Database Locked (`sqlite3.OperationalError: database is locked`)
**Symptom:** Multiple simultaneous audits or rapid CLI invocations.
**Resolution:**
SIREEN includes automatic jittered retries up to 30 seconds. To isolate database files per project or user, specify an independent database path:
```bash
export SIREEN_DB_PATH="/path/to/custom_sessions.db"
```

---

## 4. AI Provider Connection Failures
**Symptom:** `sireen config llm --test` fails with timeout or HTTP 401.
**Resolution:**
1. Check that your API key is valid.
2. For local Ollama, ensure the server is running on `http://localhost:11434` and the model is pulled (`ollama pull llama3.2`).
3. If no key is available, SIREEN seamlessly runs in Heuristic Mode with zero external network requests.
