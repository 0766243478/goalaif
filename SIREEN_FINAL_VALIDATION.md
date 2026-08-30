# SIREEN Core v0.1 — Final Validation

Validation was run on 2026-08-29 from the cleaned working tree.

| Check | Command/result |
| --- | --- |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` — passed |
| Extension unit tests | `npx jest --ci --silent` — **8 suites passed, 49 tests passed** |
| Backend tests | `python -m pytest tests firewall/tests -q` — **112 passed, 2 skipped, 1 warning** |
| Credential/status focused tests | `python -m pytest tests/test_http_e2e.py -q` — **10 passed, 1 warning** |
| Production webpack | `npx webpack --mode production` — compiled successfully |
| VSIX packaging | `npx @vscode/vsce package --no-dependencies` — succeeded |
| Archive inspection | Confirmed runtime manifest has no `runSandbox`, `sandbox`, `set-key`, or `apiKeySet` term |
| VSIX install | `code --install-extension ...sireen-0.1.2.vsix --force` — succeeded |
| Installed extension | `hussein-m.sireen@0.1.2` |

## Produced artifact

- Path: `gaolaif/extension/sireen-0.1.2.vsix`
- SHA-256: `07A5C48D72CAD0AC9F3D5499ED80BD97913C70187BFE5050B3402CF519196520`
- Size: 123,931 bytes

## Warnings and limits

- Webpack emitted three non-failing performance advisories: the webview bundle is 333 KiB, above the 244 KiB recommended threshold.
- Pytest emitted one third-party Starlette/TestClient deprecation warning concerning `httpx`; no test failed.
- The installed VSIX was verified by CLI installation and archive inspection. This environment did not provide UI automation for a fresh interactive VS Code audit/evidence/report/persistence journey, so that manual journey remains a release checklist item rather than a claimed result.
