# Sireen — AI-Powered Smart Contract Exploit Verification

**Stop guessing. Start proving.**

Sireen runs a 7-stage automated pipeline that finds vulnerabilities, generates exploit Proof-of-Concepts, executes them safely in Docker-isolated Foundry, and validates results with an AI "Honest Signal" critique — delivering a professional audit report you can hand to your client.

## 🎯 What It Does

| Stage | Action |
|-------|--------|
| **1. Hypothesis** | LLM analyzes contract → forms attack hypothesis |
| **2. PoC Generation** | LLM writes Foundry test exploiting the vulnerability |
| **3. Compilation** | Verifies PoC compiles cleanly |
| **4. Execution** | Runs forge test in Docker sandbox (or host) |
| **5. Parsing** | Normalizes test results, extracts exploit traces |
| **6. Honest Signal** | 2-round LLM critique: Critic attacks → Defender responds → Verdict |
| **7. Report** | Professional Markdown/HTML/JSON with remediation guidance |

## 🚀 Quick Start

1. **Install** from VS Code Marketplace
2. **Configure API Key** — Click the Sireen shield in Activity Bar → "Set API Key" → paste your OpenRouter/OpenAI/Anthropic key
3. **Open a `.sol` file** or paste contract code in the sidebar
4. **Click "Run Pipeline"** — War Room opens with live progress
5. **Get Report** — Export Markdown/HTML/JSON when complete

## 🎬 Demo (No API Key Required)

Click **"Try Demo Contract"** in the sidebar to run the full pipeline on a vulnerable vault contract with a known reentrancy bug. No setup needed.

## 🔧 Configuration

Open Settings (`Ctrl+,`) → Search "Sireen":

| Setting | Description | Default |
|---------|-------------|---------|
| `sireen.aiProvider` | LLM provider: `openrouter`, `openai`, `anthropic` | `openrouter` |
| `sireen.aiApiKey` | Your API key (stored securely) | — |
| `sireen.aiModel` | Model to use | `openai/o3-mini` |
| `sireen.forgePath` | Path to `forge` binary | `forge` (from PATH) |
| `sireen.dockerEnabled` | Run Forge in Docker container | `false` |
| `sireen.dockerImage` | Docker image for Foundry | `ghcr.io/foundry-rs/foundry:latest` |
| `sireen.forkRpcUrl` | RPC URL for mainnet forking | — |
| `sireen.maxRetries` | LLM retry attempts per stage | `3` |

## 🐳 Docker vs Host Mode

| Mode | Pros | Cons |
|------|------|------|
| **Docker** (recommended) | Full isolation, consistent Foundry version, no host pollution | Requires Docker Desktop |
| **Host** | Faster startup, no Docker needed | Requires Foundry installed, version drift |

## 📊 Output Formats

- **Markdown** — Human-readable, renders in GitHub/Notion/Obsidian
- **HTML** — Styled report with embedded CSS, perfect for clients
- **JSON** — Machine-readable for CI/CD integration

## 🛡️ Security

- **Docker isolation** — Untrusted PoCs execute in ephemeral containers with no network
- **Resource limits** — CPU/memory/time limits on containers
- **No code execution on host** — All Forge runs are sandboxed
- **API keys in SecretStorage** — Never written to disk in plaintext

## 🎯 Who It's For

| Role | Use Case |
|------|----------|
| **Smart Contract Auditors** | Automate 80% of exploit verification, focus on high-value analysis |
| **Security Researchers** | Rapidly validate hypotheses before manual deep-dive |
| **Protocol Teams** | Pre-audit self-check, regression testing for fixes |
| **Bug Bounty Hunters** | Generate professional PoCs and reports for submissions |

## 📋 Requirements

- VS Code 1.85+
- **Docker Desktop** (for Docker mode) OR **Foundry** (`forge` in PATH)
- **LLM API Key** — OpenRouter (recommended), OpenAI, or Anthropic

## 🔗 Links

- **Documentation**: [github.com/yourorg/sireen/docs](https://github.com/yourorg/sireen/docs)
- **Issues**: [github.com/yourorg/sireen/issues](https://github.com/yourorg/sireen/issues)
- **Changelog**: [CHANGELOG.md](https://github.com/yourorg/sireen/blob/main/CHANGELOG.md)

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---
this not is by my 
this file have to be updatet in a verey time you eidite or make same changes in the code
*Built by security researchers, for security researchers.*