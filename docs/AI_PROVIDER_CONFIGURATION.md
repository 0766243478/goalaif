# AI Provider Configuration Guide

SIREEN supports multiple AI providers for enriched hypothesis generation while maintaining deterministic local fallback (Heuristic Mode).

---

## 1. Supported Providers

| Provider | Type | Default Model | Config Key | Verification Status | Verification Evidence |
|---|---|---|---|---|---|
| `openrouter` | Cloud | `openai/gpt-oss-20b:free` | `OPENROUTER_API_KEY` | **ERROR-HANDLING-VERIFIED** | Real API probe with dummy key returned HTTP 401; request headers and response handling verified. |
| `openai` | Cloud | `gpt-4o-mini` | `OPENAI_API_KEY` | **ERROR-HANDLING-VERIFIED** | Real API probe with dummy key returned HTTP 401; payload and key masking verified. |
| `anthropic` | Cloud | `claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY` | **ERROR-HANDLING-VERIFIED** | Real API probe with dummy key returned HTTP 401 invalid `x-api-key`; `/messages` format verified. |
| `gemini` | Cloud | `gemini-1.5-flash` | `GEMINI_API_KEY` | **ERROR-HANDLING-VERIFIED** | Real API probe returned HTTP 400 invalid argument; payload handling verified. |
| `ollama` | Local | `llama3.2` | (None required) | **ERROR-HANDLING-VERIFIED** | Real transport probe returned `[Errno 111] Connection refused` when offline; mocked tests pass. |
| `custom` | Local/Custom | `default` | Optional API Key | **MOCK-VERIFIED** | Mocked unit tests confirm endpoint routing and JSON schema adaptation. |

### Verification Taxonomy Definitions
- **LIVE-INFERENCE-VERIFIED**: Successful end-to-end LLM inference with live model output generated.
- **CONNECTION-VERIFIED**: Successful transport connection established to endpoint.
- **ERROR-HANDLING-VERIFIED**: Real HTTP/network error response received from provider and safely parsed.
- **MOCK-VERIFIED**: Tested via mock responses in unit tests.
- **NOT-TESTED**: Not executed or verified.

---

## 2. CLI Configuration

Inspect current configuration:
```bash
sireen config show
```

### Configure Cloud Providers

```bash
# OpenAI
sireen config llm --provider openai --key sk-... --model gpt-4o-mini --test

# Anthropic Claude
sireen config llm --provider anthropic --key sk-ant-... --model claude-3-5-sonnet-20241022 --test

# Google Gemini
sireen config llm --provider gemini --key AIza... --model gemini-1.5-flash --test

# OpenRouter
sireen config llm --provider openrouter --key sk-or-v1-... --test
```

### Configure Local Inference (Ollama)

1. Start your local Ollama server:
   ```bash
   ollama run llama3.2
   ```
2. Configure SIREEN to use Ollama:
   ```bash
   sireen config llm --provider ollama --endpoint http://localhost:11434/v1 --model llama3.2 --test
   ```

---

## 3. Secure Credential Storage

Configurations are saved to `~/.sireen/config.json` with strict POSIX permissions `0600` (readable only by the owner). API keys are masked when displayed via `sireen config show` and excluded from all generated reports and evidence packs.
