# Deployment Architecture Analysis

## Overview

This document analyzes the technologies in the Heretek OpenClaw deployment and provides recommendations.

---

## Current Stack Components

### 1. LiteLLM Gateway

**Technology**: [LiteLLM](https://docs.litellm.ai/docs/) - Unified LLM interface

- **Role**: Central gateway managing model routing, 100+ LLM providers
- **Current use**: A2A (Agent-to-Agent) protocol on port 4000
- **Features**:
  - Unified interface for OpenAI, Anthropic, Ollama, etc.
  - Built-in retry/fallback logic
  - Caching and rate limiting
  - Admin UI

**Pros**:
- Single interface for all model providers
- Automatic error handling across providers
- Virtual keys with budget tracking
- Drop-in replacement for OpenAI client

**Cons**:
- Additional abstraction layer
- Requires understanding of LiteLLM-specific config

---

### 2. PostgreSQL with pgvector

**Technology**: [pgvector](https://github.com/pgvector/pgvector) - Vector operations in PostgreSQL

- **Role**: Vector storage and similarity search for RAG
- **Current use**: `pgvector/pgvector:pg17` Docker image
- **Features**:
  - Vector similarity search
  - Distance metrics: cosine, euclidean, inner product
  - Full PostgreSQL compatibility

**vs Alternatives**:

| Feature | pgvector | Qdrant |
|---------|----------|--------|
| Deployment | Single database | Separate service |
| Scalability | Good for <10M vectors | Excellent for billions |
| Hybrid search | Yes (SQL filtering) | Requires separate setup |
| Performance | Good | Optimized for vectors |
| Complexity | Low | Medium |

**Recommendation**: 
- Keep **pgvector** for current deployment
- Consider **Qdrant** only if:
  - Scaling beyond 10M vectors
  - Need sub-50ms latency at scale
  - Advanced filtering patterns required

---

### 3. Redis

- **Role**: Caching and rate limiting
- **Current use**: Standard Redis 7 Alpine image
- **Features**:
  - Response caching (TTL configurable)
  - Rate limiting per model/user
  - Session persistence for A2A

---

### 4. Ollama (Optional)

- **Role**: Local LLM runtime
- **Current use**: `ollama/ollama:latest` Docker image
- **Models**: llama3.1, qwen2.5, mistral, phi4, etc.
- **Pros**: Free, privacy-focused, no API costs
- **Cons**: Requires GPU/CPU resources

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Heretek OpenClaw Deployment                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Docker Compose Services                     │   │
│  │                                                              │   │
│  │  ┌─────────┐    ┌─────────────┐    ┌───────────────────┐    │   │
│  │  │ Ollama  │───▶│   LiteLLM   │◀───│  External APIs   │    │   │
│  │  │ :11434  │    │    :4000    │    │  (OpenAI, etc.)  │    │   │
│  │  └─────────┘    └──────┬──────┘    └──────────────────���┘    │   │
│  │                        │                                     │   │
│  │                 ┌──────┴──────┐                              │   │
│  │                 ▼             ▼                               │   │
│  │           ┌─────────┐    ┌─────────┐                         │   │
│  │           │PostgreSQL│    │  Redis  │                         │   │
│  │           │ :5432   │    │ :6379   │                         │   │
│  │           │+pgvector│    │(cache) │                         │   │
│  │           └─────────┘    └─────────┘                         │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Agent Containers                        │   │
│  │                                                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │  │ steward │  │ alpha   │  │  beta   │  │charlie  │       │   │
│  │  │   +     │  │   +     │  │   +     │  │   +     │       │   │
│  │  │ explorer│  │ examiner│  │sentinel│  │ coder  │       │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Options

### Model Providers

| Provider | Type | API Key Required | Best For |
|----------|------|------------------|----------|
| **Ollama** | Local | No | Privacy, free usage |
| **MiniMax** | Cloud | Yes | Best reasoning |
| **GLM** | Cloud | Yes | Chinese, multilingual |
| **Qwen** | Cloud | Yes | Coding tasks |
| **Kimi** | Cloud | Yes | Long context |
| **OpenAI** | Cloud | Yes | Industry standard |
| **Anthropic** | Cloud | Yes | Claude models |
| **Gemini** | Cloud | Yes | Fast, multimodal |

### Embedding Models

| Provider | Model | Dimensionality |
|----------|-------|---------------|
| Ollama | nomic-embed-text | 768 |
| Ollama | llama3-embedding | 4096 |
| OpenAI | text-embedding-3-small | 1536 |
| OpenAI | text-embedding-3-large | 3072 |
| MiniMax | abab-embedding | 1536 |

---

## Failover Strategy

### Current Implementation
- Primary model → Secondary model → Third model
- Configured in `.env`:
  ```
  FAILOVER_ENABLED=true
  FAILOVER_MODEL_1=mistral
  FAILOVER_MODEL_2=phi4
  ```

### LiteLLM Router Fallback
LiteLLM also supports built-in fallback:

```yaml
router_settings:
  routing_strategy: latency-based-routing
  fallback_models:
    - llama3.1
    - qwen2.5:14b
    - mistral
```

---

## Recommendations

### For First Deployment

1. **Use Ollama** for initial testing (free, private)
2. **pgvector** is sufficient for RAG at scale
3. Keep the current Docker Compose setup

### For Production

1. **Consider cloud providers** when:
   - Ollama response times too slow
   - Need 24/7 availability without server
   - GPU costs exceed API costs

2. **Consider Qdrant** when:
   - Vector search exceeds 10M points
   - Need sub-50ms latency at scale
   - Advanced hybrid search patterns

3. **Use multiple backends**:
   - Ollama for quick local queries
   - Cloud API for complex reasoning tasks

---

## Summary

| Component | Current Choice | Recommendation | Notes |
|-----------|---------------|---------------|-------|
| Gateway | LiteLLM | ✅ Keep | Works well with A2A |
| Vector DB | pgvector | ✅ Keep | Sufficient for most use cases |
| Cache | Redis | ✅ Keep | Essential for rate limiting |
| Local Models | Ollama | ✅ Keep | Good for privacy/cost |
| Cloud | Depends | Evaluate per use case | MiniMax for reasoning |

The current architecture is solid and suitable for most deployments.