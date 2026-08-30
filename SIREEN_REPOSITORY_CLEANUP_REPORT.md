# SIREEN Core v0.1 — Repository Cleanup Report

## Scope completed

1. Replaced extension/webview API-key flow with backend-owned credentials and capability-only status.
2. Retired secret-setting behavior: `/config/set-key` returns `410`; regression coverage verifies it cannot set a key.
3. Removed proven-unused Docker/sandbox runner commands, endpoint wiring, UI panes, and stale manifest contribution.
4. Removed obsolete subscription/payment dependencies and the unused `supabase` Python requirement.
5. Removed webview memory/simulation surfaces and duplicate experimental/session code after reference checks.
6. Preserved core audit, Forge, evidence, report, persistence, Qdrant-backed memory routes, and CLI surfaces.

## Source scan conclusion

No extension source reference remains for `SET_API_KEY`, `apiKeySet`, `gaolaif.runSandbox`, or secret forwarding. The remaining `/config/set-key` text is intentionally limited to the safe retired endpoint and its regression test.

## Packaging conclusion

The inspected final VSIX manifest exposes audit, exploit, analysis, PoC, mode, chat, report, and patch commands only. It has no sandbox command and contains only runtime assets required by the extension.

## Follow-up release work

- Run the manual VS Code journeys documented in `SIREEN_FINAL_VALIDATION.md` against a backend with and without an OpenRouter key, and with Forge available/unavailable.
- Consider bundle splitting if reducing the 333 KiB webview bundle is a release goal.
- Stage/commit the current tracked modifications, deletions, and final report files intentionally; this cleanup does not perform a git commit.
