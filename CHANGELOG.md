# Changelog

All notable changes to this project will be documented in this format.

## [0.2.0] - 2026-07-17 — "First Customer Ready"

### Added
- **Pipeline Session Persistence** — Auto-saves every stage, resumes after crash/restart
- **Contract Input UX** — Paste code, drop `.sol` file, or scan workspace for contracts
- **Demo Mode** — Zero-config trial with built-in vulnerable vault contract
- **War Room Live Streaming** — Real-time stage progress, Forge output, LLM prompts
- **Professional Reports** — Executive summary, finding cards, remediation guidance, evidence
- **Stage Retry** — Auto-retry LLM calls (exponential backoff), manual retry button
- **Docker/Foundry Preflight** — Actionable errors if dependencies missing
- **API Key Onboarding Wizard** — First-run modal guides through setup
- **Export** — Copy/export Markdown, HTML, JSON with one click

### Changed
- **Stripped to MLP** — Removed Bounty Dashboard, Knowledge Graph, Attack Workspace, Settings panel
- **Single Panel Architecture** — War Room doubles as Report Viewer
- **Simplified Sidebar** — Chat + Contract Input + Pipeline Trigger only

### Fixed
- **Silent failures** — All errors now show actionable toasts with links
- **No progress feedback** — Live logs with timestamps, expandable details
- **Lost work on crash** — Session auto-save every stage

## [0.1.0] - 2026-07-10 — "Initial Pipeline"

### Added
- 7-stage exploit verification pipeline
- Honest Signal (2-round LLM critique)
- Docker-isolated Forge execution
- Multi-provider LLM abstraction (OpenRouter/OpenAI/Anthropic)
- SolidJS + Zustand webview UI
- VS Code webview integration (Sidebar + Panels)

---

**Legend**: `Added` = new features, `Changed` = existing behavior changes, `Fixed` = bug fixes, `Removed` = deleted features