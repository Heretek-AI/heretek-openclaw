# Provider Setup Guide

This guide explains how to configure and use different LLM providers with Heretek OpenClaw's LiteLLM gateway.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Provider-Specific Setup](#provider-specific-setup)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
  - [Google](#google)
  - [Ollama (Local)](#ollama-local)
  - [Azure OpenAI](#azure-openai)
  - [xAI](#xai)
- [Multi-Provider Configuration](#multi-provider-configuration)
- [Agent Model Assignment](#agent-model-assignment)
- [Troubleshooting](#troubleshooting)

## Overview

OpenClaw uses LiteLLM as a unified gateway for accessing multiple LLM providers. This provides:

- **Unified API**: All providers accessible through a single interface
- **Automatic Failover**: Seamless fallback when primary models are unavailable
- **Cost Tracking**: Built-in cost monitoring across providers
- **Model Aliasing**: Easy model substitution without code changes
- **Agent Passthrough**: Per-agent virtual model endpoints

### Provider Templates

Pre-configured provider templates are available in [`config/providers/`](../../config/providers/):

| Provider | Template | Models |
|----------|----------|--------|
| OpenAI | [`openai.yaml`](../../config/providers/openai.yaml) | GPT-4, GPT-4-Turbo, GPT-3.5-Turbo, o1 |
| Anthropic | [`anthropic.yaml`](../../config/providers/anthropic.yaml) | Claude-3-Opus, Claude-3-Sonnet, Claude-3-Haiku |
| Google | [`google.yaml`](../../config/providers/google.yaml) | Gemini-Pro, Gemini-Ultra, Gemini-Flash |
| Ollama | [`ollama.yaml`](../../config/providers/ollama.yaml) | Llama-2, Mistral, CodeLlama |
| Azure OpenAI | [`azure-openai.yaml`](../../config/providers/azure-openai.yaml) | Azure-hosted GPT models |
| xAI | [`xai.yaml`](../../config/providers/xai.yaml) | Grok-Beta, Grok-Vision |

## Quick Start

### Step 1: Add Provider Configuration

Copy the desired provider template into your main configuration:

```bash
# Option A: Append to existing config
cat config/providers/openai.yaml >> litellm_config.yaml

# Option B: Create merged config
# Edit litellm_config.yaml and add models under model_list:
```

### Step 2: Set API Keys

Add required environment variables to your `.env` file:

```bash
cp .env.example .env
# Edit .env with your API keys
```

### Step 3: Restart LiteLLM

```bash
docker-compose restart litellm
```

### Step 4: Verify Configuration

```bash
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  http://localhost:4000/models
```

## Provider-Specific Setup

### OpenAI

**Required Environment Variables:**

```bash
OPENAI_API_KEY=sk-...
OPENAI_API_BASE=https://api.openai.com/v1  # Optional
OPENAI_ORGANIZATION=org-...  # Optional
```

**Available Models:**

- `openai/gpt-4o` - Recommended for most tasks
- `openai/gpt-4-turbo` - Latest GPT-4 with improved performance
- `openai/gpt-3.5-turbo` - Fast and cost-effective
- `openai/o1` - Advanced reasoning

**Setup Steps:**

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env`: `OPENAI_API_KEY=sk-...`
3. Add models from [`config/providers/openai.yaml`](../../config/providers/openai.yaml)

### Anthropic

**Required Environment Variables:**

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_API_BASE=https://api.anthropic.com  # Optional
```

**Available Models:**

- `anthropic/claude-3-5-sonnet` - Recommended for most tasks
- `anthropic/claude-3-opus` - Most powerful for complex tasks
- `anthropic/claude-3-haiku` - Fast and efficient

**Setup Steps:**

1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Add models from [`config/providers/anthropic.yaml`](../../config/providers/anthropic.yaml)

### Google

**Required Environment Variables:**

```bash
GOOGLE_API_KEY=...
GOOGLE_VERTEX_PROJECT_ID=your-project-id  # For Vertex AI
GOOGLE_VERTEX_LOCATION=us-central1  # For Vertex AI
```

**Available Models:**

- `google/gemini-1.5-pro` - Recommended for most tasks
- `google/gemini-1.5-flash` - Fast and efficient
- `google/gemini-2.0-pro-exp` - Next generation (experimental)

**Setup Steps:**

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. For Vertex AI: Create GCP project and enable Vertex AI API
3. Add to `.env`: `GOOGLE_API_KEY=...`
4. Add models from [`config/providers/google.yaml`](../../config/providers/google.yaml)

### Ollama (Local)

**Required Environment Variables:**

```bash
OLLAMA_HOST=http://ollama:11434
```

**Available Models:**

- `ollama/llama3.1` - Recommended general purpose
- `ollama/mistral` - Efficient and capable
- `ollama/codellama` - Code generation
- `ollama/phi3` - Compact capable model

**Setup Steps:**

1. Ensure Ollama is running (included in docker-compose)
2. Pull desired models: `docker exec ollama ollama pull llama3.1`
3. Add models from [`config/providers/ollama.yaml`](../../config/providers/ollama.yaml)

**Pull Multiple Models:**

```bash
docker exec ollama ollama pull llama3.1
docker exec ollama ollama pull mistral
docker exec ollama ollama pull codellama
```

### Azure OpenAI

**Required Environment Variables:**

```bash
AZURE_API_KEY=...
AZURE_API_BASE=https://your-resource.openai.azure.com/
AZURE_API_VERSION=2024-02-15-preview
```

**Available Models:**

- `azure/gpt-4o` - GPT-4o on Azure
- `azure/gpt-4-turbo` - GPT-4 Turbo on Azure
- `azure/gpt-35-turbo` - GPT-3.5 Turbo on Azure

**Setup Steps:**

1. Create Azure OpenAI resource in Azure Portal
2. Deploy desired models (GPT-4, GPT-35-Turbo, etc.)
3. Get endpoint URL and API key from Azure Portal
4. Add to `.env`:
   ```bash
   AZURE_API_KEY=...
   AZURE_API_BASE=https://your-resource.openai.azure.com/
   AZURE_API_VERSION=2024-02-15-preview
   ```
5. Add models from [`config/providers/azure-openai.yaml`](../../config/providers/azure-openai.yaml)

### xAI

**Required Environment Variables:**

```bash
XAI_API_KEY=...
XAI_API_BASE=https://api.x.ai  # Optional
```

**Available Models:**

- `xai/grok-2` - Latest Grok model
- `xai/grok-2-mini` - Lightweight Grok
- `xai/grok-vision` - Vision-optimized

**Setup Steps:**

1. Get API key from [xAI Console](https://console.x.ai/)
2. Add to `.env`: `XAI_API_KEY=...`
3. Add models from [`config/providers/xai.yaml`](../../config/providers/xai.yaml)

## Multi-Provider Configuration

### Using Combined Example

The [`combined-example.yaml`](../../config/providers/combined-example.yaml) file demonstrates a complete multi-provider setup with:

- All providers configured
- Agent-specific model assignments
- Priority-based fallback
- Model aliases

### Priority Fallback

Configure automatic fallback when primary models fail:

```yaml
router_settings:
  priority_fallback:
    enabled: true
    fallback_order:
      - minimax/MiniMax-M2.7  # Primary
      - anthropic/claude-3-5-sonnet
      - openai/gpt-4o
      - google/gemini-1.5-pro
      - zai/glm-5-1  # Final failover
```

### Load Balancing

Distribute requests across multiple providers:

```yaml
router_settings:
  routing_strategy: simple-shuffle
  enable_rate_limiting: true
```

## Agent Model Assignment

### Using Environment Variables

Assign specific models to agents via `.env`:

```bash
# Agent model overrides
AGENT_STEWARD_MODEL=anthropic/claude-3-5-sonnet
AGENT_ALPHA_MODEL=openai/gpt-4o
AGENT_BETA_MODEL=google/gemini-1.5-pro
AGENT_CODER_MODEL=ollama/codellama
```

### Using LiteLLM WebUI

1. Access LiteLLM UI at `http://localhost:4000`
2. Navigate to "Models" section
3. Edit agent passthrough endpoints (e.g., `agent/steward`)
4. Change the underlying model assignment

### Virtual Model Endpoints

Each agent has a virtual model endpoint:

| Agent | Endpoint | Default Model |
|-------|----------|---------------|
| Steward | `agent/steward` | minimax/MiniMax-M2.7 |
| Alpha | `agent/alpha` | minimax/MiniMax-M2.7 |
| Beta | `agent/beta` | minimax/MiniMax-M2.7 |
| Charlie | `agent/charlie` | minimax/MiniMax-M2.7 |
| Examiner | `agent/examiner` | minimax/MiniMax-M2.7 |
| Explorer | `agent/explorer` | minimax/MiniMax-M2.7 |
| Sentinel | `agent/sentinel` | minimax/MiniMax-M2.7 |
| Coder | `agent/coder` | zai/glm-5-1 |
| Dreamer | `agent/dreamer` | minimax/MiniMax-M2.7 |
| Empath | `agent/empath` | minimax/MiniMax-M2.7 |
| Historian | `agent/historian` | minimax/MiniMax-M2.7 |

## Troubleshooting

### Model Not Found

**Symptom:** `Error: Model not found`

**Solutions:**
1. Verify model name matches exactly (case-sensitive)
2. Check model is defined in `model_list`
3. Ensure provider configuration is loaded

### API Key Errors

**Symptom:** `AuthenticationError: Invalid API key`

**Solutions:**
1. Verify API key is correct and not expired
2. Check environment variable is set: `echo $OPENAI_API_KEY`
3. Ensure `.env` file is loaded by Docker

### Rate Limiting

**Symptom:** `RateLimitError: Too many requests`

**Solutions:**
1. Enable rate limiting in `router_settings`
2. Increase `default_limit_requests`
3. Add more providers for load distribution

### Connection Timeout

**Symptom:** `TimeoutError: Connection timed out`

**Solutions:**
1. Check provider API status
2. Increase `request_timeout` in `litellm_settings`
3. Verify network connectivity

### Ollama Models Not Available

**Symptom:** `Error: ollama model not found`

**Solutions:**
```bash
# Pull the model
docker exec ollama ollama pull llama3.1

# List available models
docker exec ollama ollama list

# Restart Ollama container
docker-compose restart ollama
```

## Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [LiteLLM Provider Support](https://docs.litellm.ai/docs/providers)
- [Provider Templates](../../config/providers/)
- [Main Configuration](../../litellm_config.yaml)
- [Environment Example](../../.env.example)
