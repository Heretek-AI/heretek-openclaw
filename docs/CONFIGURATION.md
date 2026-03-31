# Heretek OpenClaw Configuration Reference

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

This document provides comprehensive reference for all configuration files in Heretek OpenClaw:

- [`openclaw.json`](#openclawjson) - OpenClaw Gateway master configuration
- [`litellm_config.yaml`](#litellm_configyaml) - LiteLLM Gateway routing and A2A settings
- [`.env.example`](#envexample) - Environment variable template
- [`docker-compose.yml`](#docker-composeyml) - Infrastructure service orchestration

---

## openclaw.json

**Location:** `/root/heretek/heretek-openclaw/openclaw.json`  
**Purpose:** Master configuration for OpenClaw Gateway collective

### Structure

```json
{
  "collective": { ... },
  "models": { ... },
  "agents": [ ... ],
  "model_routing": { ... },
  "a2a_protocol": { ... },
  "embedding": { ... },
  "memory": { ... },
  "skills_repository": { ... }
}
```

### Collective Section

```json
{
  "collective": {
    "name": "Heretek OpenClaw",
    "version": "2.0.0",
    "description": "Multi-agent AI collective with 11 specialized agents",
    "configuration": {
      "workspace": "/root/.openclaw",
      "agents_path": "/root/.openclaw/agents",
      "gateway_port": 18789
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Collective name |
| `version` | string | Configuration version |
| `description` | string | Collective description |
| `configuration.workspace` | string | OpenClaw workspace directory |
| `configuration.agents_path` | string | Agent workspaces location |
| `configuration.gateway_port` | number | Gateway WebSocket port |

---

### Models Section

```json
{
  "models": {
    "providers": {
      "litellm": {
        "baseUrl": "http://localhost:4000",
        "models": [
          {
            "id": "agent/steward",
            "name": "steward",
            "api": "openai-completions",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

#### Model Definition

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Model identifier (e.g., `agent/steward`) |
| `name` | string | Human-readable name |
| `api` | string | API type (`openai-completions`) |
| `reasoning` | boolean | Supports reasoning capabilities |
| `input` | array | Supported input types |
| `cost.*` | number | Cost per token (input/output/cache) |
| `contextWindow` | number | Maximum context tokens |
| `maxTokens` | number | Maximum output tokens |

---

### Agents Section

Defines all 11 agents in the collective:

```json
{
  "agents": [
    {
      "id": "steward",
      "name": "Steward",
      "role": "orchestrator",
      "description": "Orchestrator of Heretek OpenClaw Collective",
      "model": "agent/steward",
      "session": "agent:heretek:steward",
      "port": 8001,
      "capabilities": [
        "health_monitoring",
        "workflow_enforcement",
        "deliberation_coordination"
      ],
      "skills": [
        "steward-orchestrator",
        "triad-sync-protocol",
        "fleet-backup"
      ],
      "parameters": {
        "heartbeat_interval": 30,
        "health_check_enabled": true
      }
    }
  ]
}
```

#### Agent Definition

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Agent identifier |
| `name` | string | Display name |
| `role` | string | Agent role (orchestrator, triad_member, etc.) |
| `description` | string | Agent description |
| `model` | string | Model endpoint (e.g., `agent/steward`) |
| `session` | string | Session identifier |
| `port` | number | Agent port (legacy) |
| `capabilities` | array | Agent capabilities |
| `skills` | array | Agent skills |
| `parameters` | object | Agent-specific parameters |

#### All Agents

| ID | Name | Role | Model |
|----|------|------|-------|
| `steward` | Steward | orchestrator | agent/steward |
| `alpha` | Alpha | triad_member | agent/alpha |
| `beta` | Beta | triad_member | agent/beta |
| `charlie` | Charlie | triad_member | agent/charlie |
| `examiner` | Examiner | evaluator | agent/examiner |
| `explorer` | Explorer | researcher | agent/explorer |
| `sentinel` | Sentinel | safety | agent/sentinel |
| `coder` | Coder | developer | agent/coder |
| `dreamer` | Dreamer | creative | agent/dreamer |
| `empath` | Empath | emotional | agent/empath |
| `historian` | Historian | archivist | agent/historian |

---

### Model Routing Section

```json
{
  "model_routing": {
    "default": "minimax/MiniMax-M2.7",
    "aliases": {
      "fast": "minimax/MiniMax-M2.7",
      "balanced": "minimax/MiniMax-M2.7",
      "reasoning": "minimax/MiniMax-M2.7",
      "creative": "minimax/MiniMax-M2.7"
    },
    "passthrough_endpoints": {
      "enabled": true,
      "endpoints": {
        "agent/steward": {
          "backend": "minimax/MiniMax-M2.7"
        },
        "agent/alpha": {
          "backend": "minimax/MiniMax-M2.7"
        }
      }
    }
  }
}
```

#### Passthrough Endpoints

| Endpoint | Backend | Agent |
|----------|---------|-------|
| `agent/steward` | minimax/MiniMax-M2.7 | steward |
| `agent/alpha` | minimax/MiniMax-M2.7 | alpha |
| `agent/beta` | minimax/MiniMax-M2.7 | beta |
| `agent/charlie` | minimax/MiniMax-M2.7 | charlie |
| `agent/examiner` | minimax/MiniMax-M2.7 | examiner |
| `agent/explorer` | minimax/MiniMax-M2.7 | explorer |
| `agent/sentinel` | minimax/MiniMax-M2.7 | sentinel |
| `agent/coder` | minimax/MiniMax-M2.7 | coder |
| `agent/dreamer` | minimax/MiniMax-M2.7 | dreamer |
| `agent/empath` | minimax/MiniMax-M2.7 | empath |
| `agent/historian` | minimax/MiniMax-M2.7 | historian |

---

### A2A Protocol Section

```json
{
  "a2a_protocol": {
    "version": "1.0",
    "enabled": true,
    "endpoints": {
      "send": "/v1/agents/{name}/send",
      "receive": "/v1/agents/{name}/receive",
      "tasks": "/v1/agents/{name}/tasks",
      "stream": "/v1/agents/{name}/stream",
      "discover": "/v1/agents/discover"
    },
    "features": {
      "streaming": true,
      "task_handoff": true,
      "agent_discovery": true,
      "session_persistence": true
    }
  }
}
```

---

### Embedding Section

```json
{
  "embedding": {
    "provider": "ollama",
    "model": "nomic-embed-text",
    "dimension": 768,
    "endpoint": "http://localhost:11434"
  }
}
```

---

### Memory Section

```json
{
  "memory": {
    "provider": "pgvector",
    "connection": {
      "host": "localhost",
      "port": 5432,
      "database": "heretek",
      "user": "heretek",
      "password": "${POSTGRES_PASSWORD}"
    },
    "collective_memory": {
      "enabled": true,
      "schema": "public",
      "table": "collective_memory"
    }
  }
}
```

---

### Skills Repository Section

```json
{
  "skills_repository": {
    "path": "/root/heretek/heretek-openclaw/skills",
    "enabled": true,
    "auto_discover": true
  }
}
```

---

## litellm_config.yaml

**Location:** `/root/heretek/heretek-openclaw/litellm_config.yaml`  
**Purpose:** LiteLLM Gateway routing and A2A protocol configuration

### Structure

```yaml
model_list: [...]
litellm_settings: {...}
a2a_settings: {...}
budget_settings: {...}
observability: {...}
```

---

### Model List

Defines all available models with routing:

```yaml
model_list:
  # Primary agent models (MiniMax)
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE
    model_info:
      id: agent/steward
      mode: chat
      input_cost_per_token: 0.0
      output_cost_per_token: 0.0
  
  # Failover models (z.ai)
  - model_name: agent/steward-failover
    litellm_params:
      model: zai/glm-5-1
      api_key: os.environ/ZAI_API_KEY
    model_info:
      id: agent/steward-failover
      mode: chat
```

#### Model Providers

| Provider | Models | Purpose |
|----------|--------|---------|
| MiniMax | MiniMax-M2.7 | Primary model for all agents |
| z.ai | glm-5-1 | Failover model |
| Ollama | nomic-embed-text | Local embeddings |

---

### LiteLLM Settings

```yaml
litellm_settings:
  set_verbose: True
  drop_params: True
  cache: true
  cache_params:
    type: redis
    host: "redis"
    port: 6379
  num_retries: 3
  request_timeout: 600
```

| Setting | Default | Description |
|---------|---------|-------------|
| `set_verbose` | True | Enable verbose logging |
| `drop_params` | True | Drop unsupported parameters |
| `cache` | true | Enable response caching |
| `cache_params.type` | redis | Cache backend type |
| `num_retries` | 3 | Retry count on failure |
| `request_timeout` | 600 | Request timeout (seconds) |

---

### A2A Settings

```yaml
a2a_settings:
  enabled: true
  agent_timeout: 300
  session_persistence: redis
  task_handoff:
    enabled: true
    context_preservation: full
  streaming:
    enabled: true
    chunk_size: 1024
  agent_discovery:
    enabled: true
    heartbeat_interval: 30
  budget_limits:
    per_agent_daily: 10.0
    per_task: 1.0
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | true | Enable A2A protocol |
| `agent_timeout` | 300 | Agent response timeout (seconds) |
| `session_persistence` | redis | Session storage backend |
| `task_handoff.enabled` | true | Enable task handoff between agents |
| `task_handoff.context_preservation` | full | Preserve full context on handoff |
| `streaming.enabled` | true | Enable streaming responses |
| `agent_discovery.enabled` | true | Enable agent discovery |
| `agent_discovery.heartbeat_interval` | 30 | Heartbeat interval (seconds) |

---

### Budget Settings

```yaml
budget_settings:
  enabled: true
  default_budget: 10.0
  agent_budgets:
    steward: 20.0
    alpha: 15.0
    beta: 15.0
    charlie: 15.0
    examiner: 10.0
    explorer: 15.0
    sentinel: 10.0
    coder: 20.0
    dreamer: 10.0
    empath: 10.0
    historian: 15.0
```

---

### Observability

```yaml
observability:
  langfuse:
    enabled: false
    public_key: os.environ/LANGFUSE_PUBLIC_KEY
    secret_key: os.environ/LANGFUSE_SECRET_KEY
    host: os.environ/LANGFUSE_HOST
  opentelemetry:
    enabled: false
    exporter: otlp
    endpoint: os.environ/OTEL_EXPORTER_OTLP_ENDPOINT
  metrics:
    enabled: true
    include_cost: true
    include_latency: true
```

---

## .env.example

**Location:** `/root/heretek/heretek-openclaw/.env.example`  
**Purpose:** Environment variable template

### LiteLLM Gateway

```bash
# LiteLLM Gateway Configuration
LITELLM_PORT=4000
LITELLM_MASTER_KEY=heretek-master-key-change-me
LITELLM_SALT_KEY=heretek-salt-key-change-me
LITELLM_UI_USERNAME=admin
LITELLM_UI_PASSWORD=change-me-please

# Database & Cache
DATABASE_URL=postgresql://heretek:heretek@postgres:5432/heretek
REDIS_URL=redis://redis:6379/0
REDIS_HOST=redis
REDIS_PORT=6379
```

### Provider API Keys

```bash
# MiniMax (Primary)
MINIMAX_API_KEY=your-minimax-api-key
MINIMAX_API_BASE=https://api.minimaxi.chat/v1

# z.ai (Failover)
ZAI_API_KEY=your-zai-api-key
ZAI_API_BASE=https://api.z.ai/api/coding/paas/v4

# Ollama (Local)
OLLAMA_HOST=http://ollama:11434
```

### PostgreSQL

```bash
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=heretek
POSTGRES_USER=heretek
POSTGRES_PASSWORD=heretek
```

### Redis

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Agent Configuration

```bash
# Agent passthrough endpoints
DEFAULT_AGENT_MODEL=minimax/MiniMax-M2.7
FAILOVER_AGENT_MODEL=zai/glm-5-1

# A2A Protocol Settings
A2A_TASK_HANDOFF_TIMEOUT=60
A2A_HEARTBEAT_INTERVAL=30
```

### OpenClaw Gateway

```bash
# OpenClaw Gateway
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/agents
GATEWAY_URL=ws://127.0.0.1:18789
```

### Observability

```bash
# Langfuse (Optional)
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com

# OpenTelemetry (Optional)
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=
```

---

## docker-compose.yml

**Location:** `/root/heretek/heretek-openclaw/docker-compose.yml`  
**Purpose:** Infrastructure service orchestration

### Services

```yaml
services:
  litellm:           # Port 4000 - Model routing
  postgres:          # Port 5432 - Vector database
  redis:             # Port 6379 - Caching
  ollama:            # Port 11434 - Local LLM
  websocket-bridge:  # Ports 3002-3003 - Redis to WebSocket
  web:               # Port 3000 - Dashboard (optional)
```

---

### LiteLLM Service

```yaml
litellm:
  image: ghcr.io/berriai/litellm:main-latest
  container_name: heretek-litellm
  restart: unless-stopped
  ports:
    - "${LITELLM_PORT:-4000}:4000"
  volumes:
    - ./litellm_config.yaml:/app/config.yaml:ro
  environment:
    - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
    - LITELLM_SALT_KEY=${LITELLM_SALT_KEY}
    - DATABASE_URL=postgresql://${POSTGRES_USER:-heretek}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-heretek}
    - REDIS_URL=${REDIS_URL:-redis://redis:6379/0}
    - MINIMAX_API_KEY=${MINIMAX_API_KEY}
    - ZAI_API_KEY=${ZAI_API_KEY}
  command: ["--config", "/app/config.yaml", "--port", "4000", "--num_workers", "4"]
```

---

### PostgreSQL Service

```yaml
postgres:
  image: pgvector/pgvector:pg17
  container_name: heretek-postgres
  restart: unless-stopped
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-heretek}
    POSTGRES_USER: ${POSTGRES_USER:-heretek}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-heretek}
  volumes:
    - postgres-data:/var/lib/postgresql/data
  ports:
    - "${POSTGRES_PORT:-5432}:5432"
```

---

### Redis Service

```yaml
redis:
  image: redis:7-alpine
  container_name: heretek-redis
  restart: unless-stopped
  ports:
    - "${REDIS_PORT:-6379}:6379"
  volumes:
    - redis-data:/data
```

---

### Ollama Service

```yaml
ollama:
  image: ollama/ollama:latest
  container_name: heretek-ollama
  restart: unless-stopped
  ports:
    - "${OLLAMA_PORT:-11434}:11434"
  volumes:
    - ollama-data:/root/.ollama
  # AMD GPU support
  devices:
    - /dev/kfd:/dev/kfd
    - /dev/dri:/dev/dri
```

---

### WebSocket Bridge

```yaml
# websocket-bridge: REMOVED (v2.0.4)
# This service was removed because the Dockerfile.websocket-bridge was missing.
# The functionality is no longer used in the current architecture.
```

---

### Web Interface (Optional)

```yaml
web:
  build:
    context: ./web-interface
    dockerfile: Dockerfile
  container_name: heretek-web
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - LITELLM_HOST=http://litellm:4000
    - REDIS_HOST=redis
  ports:
    - "3000:3000"
  depends_on:
    - litellm
```

---

### Networks

```yaml
networks:
  heretek-network:
    driver: bridge
```

---

### Volumes

```yaml
volumes:
  postgres-data:
  redis-data:
  ollama-data:
```

---

## Configuration Validation

### Validate openclaw.json

```bash
openclaw gateway validate
```

### Validate litellm_config.yaml

```bash
curl -X POST http://localhost:4000/validate \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

### Validate Environment

```bash
# Check all required environment variables
./scripts/health-check.sh --env
```

---

## Configuration Updates

### Update Agent Model

1. Edit `openclaw.json`:
```json
{
  "agents": [
    {
      "id": "steward",
      "model": "agent/steward"
    }
  ]
}
```

2. Update `litellm_config.yaml`:
```yaml
- model_name: agent/steward
  litellm_params:
    model: minimax/MiniMax-M2.7
```

3. Restart Gateway:
```bash
openclaw gateway restart
```

---

## References

- [`ARCHITECTURE.md`](ARCHITECTURE.md) - System architecture
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Deployment procedures
- [`AGENTS.md`](AGENTS.md) - Agent documentation

---

🦞 *The thought that never ends.*
