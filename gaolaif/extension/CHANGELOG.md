# Changelog

All notable changes to the SIREEN VS Code extension are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [0.1.4] — 2026-09-08

First release prepared for the Visual Studio Marketplace. There are **no functional
changes to the verification pipeline**; this release makes the published metadata and
documentation match what the code actually does.

### Changed
- **Licence is now explicitly proprietary.** SIREEN is closed-source; the repository is
  publicly visible for review only. This replaces the previous MIT licence text, which did
  not reflect the intended distribution model.
- **Removed the "100% local" claim** from the extension description. SIREEN is
  *local-first*: fully local by default, but configuring an LLM API key enables a genuine
  outbound call to the provider. The README now documents exactly what leaves the machine.
- **Rewrote the display name and description** to state the real workflow — human
  hypothesis, AI-assisted investigation, Forge execution, HonestSignal verdict.
- **Marketplace keywords** now reflect supported functionality only.
- **Categories** reordered to `Testing`, `Linters`, `Other`.

### Removed
- **All Move-language advertising.** Move was registered in the manifest
  (`onLanguage:move`, `Move.toml` activation, the `.move` language contribution, the
  `move` keyword, and Move-gated context menus) but **no Move analysis is implemented**.
  Language registration is not an implementation, so the claim has been withdrawn.
- A stray zero-byte build log (`package-0.1.3.log.err`) that was being packaged into the
  VSIX.

### Added
- This changelog.
- A full Marketplace README covering the workflow, the five HonestSignal verification
  gates, terminal states, supported PoC vectors, requirements, privacy behaviour,
  limitations, and licence.

### Verification model (unchanged)
A finding reaches `CONFIRMED` only after all five HonestSignal gates pass against real
Forge output. AI cannot set a verdict, human input cannot set a verdict, and skipped or
trivial tests are rejected.

## [0.1.3] and earlier

Internal builds. Never published to the Visual Studio Marketplace.

Note: a `v1.0.3` git tag exists on an older commit and does not correspond to any
published release. The extension version line is `0.1.x`; that tag is retained for history
and should be disregarded for versioning purposes.
