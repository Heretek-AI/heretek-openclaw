# Heretek OpenClaw — Comprehensive Docker Compose Redesign

## Overview

This plan addresses the comprehensive redesign of the Heretek OpenClaw docker-compose infrastructure.

### User Preferences (Confirmed)
- **GPU**: AMD ROCm
- **Embedding Model**: nomic-embed-text-v2-moe
- **Primary Model**: minimax/M2.7 (all agents)
- **Failover Model**: z.ai/glm-5 (https://api.z.ai/api/coding/paas/v4)
- **Ollama Cloud**: Skip (at usage limit)
- **Passthrough Endpoints**: Yes - per-agent virtual models in LiteLLM

---

## Key Architecture Decision: Passthrough Endpoints Per Agent

### Concept

Each agent has a **virtual model endpoint** in LiteLLM (e.g., `agent/coder`, `agent/steward`). The openclaw.json references these virtual endpoints, not actual models. Users can reassign the underlying model via LiteLLM WebUI without changing openclaw.json.

```mermaid
flowchart LR
    subgraph OpenClaw[openclaw.json - Static]
        CODER[model: agent/coder]
        STEWARD[model: agent/steward]
        ALPHA[model: agent/alpha]
    end

    subgraph LiteLLM[LiteLLM Gateway - Dynamic]
        CODER_EP[agent/coder endpoint]
        STEWARD_EP[agent/steward endpoint]
        ALPHA_EP[agent/alpha endpoint]
        WEBUI[WebUI - Model Management]
    end

    subgraph Providers[LLM Providers]
        MINIMAX[MiniMax M2.7]
        ZAI[z.ai GLM-5]
        OLLAMA[Ollama Local]
    end

    CODER --> CODER_EP
    STEWARD --> STEWARD_EP
    ALPHA --> ALPHA_EP
    
    CODER_EP --> MINIMAX
    STEWARD_EP --> MINIMAX
    ALPHA_EP --> MINIMAX
    
    WEBUI -.->|reassign model| CODER_EP
    WEBUI -.->|reassign model| STEWARD_EP
    WEBUI -.->|reassign model| ALPHA_EP
```

### Benefits

1. **Single source of truth** - LiteLLM manages all model assignments
2. **No code changes** - Change models via WebUI, no redeployment needed
3. **Per-agent customization** - Different models for different agent roles
4. **Fallback support** - LiteLLM handles failover automatically
5. **Cost tracking** - Per-agent usage metrics in LiteLLM
6. **openclaw.json stays static** - No need to update when changing models

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Internet[External APIs]
        MINIMAX[MiniMax API - PRIMARY]
        ZAI[z.ai Coding API - FAILOVER]
    end

    subgraph Docker[Heretek OpenClaw Stack]
        subgraph Core[Core Services]
            LITELLM[LiteLLM Gateway:4000]
            POSTGRES[PostgreSQL + pgvector:5432]
            REDIS[Redis:6379]
        end

        subgraph Vector[Vector Services]
            LITELLM_PGV[litellm-pgvector]
        end

        subgraph Local[Local LLM - AMD GPU]
            OLLAMA[Ollama:11434]
            EMBED[nomic-embed-text-v2-moe]
        end

        subgraph Agents[Agent Collective - 8 Agents]
            STEWARD[Steward:8001]
            ALPHA[Alpha:8002]
            BETA[Beta:8003]
            CHARLIE[Charlie:8004]
            EXAMINER[Examiner:8005]
            EXPLORER[Explorer:8006]
            SENTINEL[Sentinel:8007]
            CODER[Coder:8008]
        end

        subgraph Skills[Heretek Skills]
            SKILL_DIR[/skills volume]
        end
    end

    LITELLM --> MINIMAX
    LITELLM --> ZAI
    LITELLM --> OLLAMA
    LITELLM --> POSTGRES
    LITELLM --> REDIS
    
    LITELLM_PGV --> POSTGRES
    
    OLLAMA --> EMBED
    
    STEWARD --> LITELLM
    ALPHA --> LITELLM
    BETA --> LITELLM
    CHARLIE --> LITELLM
    EXAMINER --> LITELLM
    EXPLORER --> LITELLM
    SENTINEL --> LITELLM
    CODER --> LITELLM
    
    Agents --> SKILL_DIR
```

---

## Service Inventory

### Core Services

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| litellm | ghcr.io/berriai/litellm:main-latest | 4000 | Unified LLM gateway with A2A |
| postgres | pgvector/pgvector:pg17 | 5432 | Primary database + vector storage |
| redis | redis:7-alpine | 6379 | Caching + rate limiting |
| litellm-pgvector | Custom | 4001 | Vector storage for RAG |

### Local LLM (AMD GPU)

| Service | Image | Ports | GPU Support |
|---------|-------|-------|-------------|
| ollama | ollama/ollama:rocm | 11434 | AMD ROCm |

### Agent Services (8 Agents)

| Agent | Role | Model | Port |
|-------|------|-------|------|
| steward | orchestrator | minimax/M2.7 | 8001 |
| alpha | triad | minimax/M2.7 | 8002 |
| beta | triad | minimax/M2.7 | 8003 |
| charlie | triad | minimax/M2.7 | 8004 |
| examiner | interrogator | minimax/M2.7 | 8005 |
| explorer | scout | minimax/M2.7 | 8006 |
| sentinel | guardian | minimax/M2.7 | 8007 |
| coder | artisan | minimax/M2.7 | 8008 |

---

## Implementation Files

### 1. docker-compose.yml

```yaml
# ==============================================================================
# Heretek OpenClaw — Infrastructure Services v2.0
# Configuration: AMD GPU + MiniMax Primary + z.ai Failover
# ==============================================================================

services:
  # ==============================================================================
  # LiteLLM Gateway — Unified LLM API with A2A Protocol
  # ==============================================================================
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
      - MINIMAX_API_BASE=${MINIMAX_API_BASE:-https://api.minimaxi.chat/v1}
      - ZAI_API_KEY=${ZAI_API_KEY}
      - ZAI_API_BASE=${ZAI_API_BASE:-https://api.z.ai/api/coding/paas/v4}
      - OLLAMA_HOST=http://ollama:11434
      - STORE_MODEL_IN_DB=True
      - LITELLM_DROP_PARAMS=True
      - AGENT_MODE_ENABLED=true
      - LITELLM_UI_USERNAME=${LITELLM_UI_USERNAME:-admin}
      - LITELLM_UI_PASSWORD=${LITELLM_UI_PASSWORD}
      - LITELLM_COST_TRACKING_ENABLED=${LITELLM_COST_TRACKING_ENABLED:-true}
      - LITELLM_METRICS_ENABLED=${LITELLM_METRICS_ENABLED:-true}
      - LITELLM_LOG_LEVEL=${LOG_LEVEL:-INFO}
    command: [
      "--config", "/app/config.yaml",
      "--port", "4000",
      "--num_workers", "4"
    ]
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - heretek-network

  # ==============================================================================
  # PostgreSQL with pgvector — Vector Database for RAG
  # ==============================================================================
  postgres:
    image: pgvector/pgvector:pg17
    container_name: heretek-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-heretek}
      POSTGRES_USER: ${POSTGRES_USER:-heretek}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init/pgvector-init.sql:/docker-entrypoint-initdb.d/pgvector-init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-heretek} -d ${POSTGRES_DB:-heretek}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - heretek-network

  # ==============================================================================
  # Redis — Caching & Rate Limiting
  # ==============================================================================
  redis:
    image: redis:7-alpine
    container_name: heretek-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --tcp-keepalive 60
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - heretek-network

  # ==============================================================================
  # Ollama — Local LLM Runtime (AMD ROCm)
  # ==============================================================================
  ollama:
    image: ollama/ollama:rocm
    container_name: heretek-ollama
    restart: unless-stopped
    devices:
      - /dev/kfd
      - /dev/dri
    environment:
      - OLLAMA_HOST=0.0.0.0
      - HSA_OVERRIDE_GFX_VERSION=10.3.0
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "127.0.0.1:11434:11434"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - heretek-network

  # ==============================================================================
  # Agent Services (8 Agents)
  # ==============================================================================
  steward:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-steward
    restart: unless-stopped
    environment:
      - AGENT_NAME=steward
      - AGENT_ROLE=orchestrator
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/steward:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_steward:/app/memory
    ports:
      - "127.0.0.1:8001:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  alpha:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-alpha
    restart: unless-stopped
    environment:
      - AGENT_NAME=alpha
      - AGENT_ROLE=triad
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/alpha:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_alpha:/app/memory
    ports:
      - "127.0.0.1:8002:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  beta:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-beta
    restart: unless-stopped
    environment:
      - AGENT_NAME=beta
      - AGENT_ROLE=triad
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/beta:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_beta:/app/memory
    ports:
      - "127.0.0.1:8003:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  charlie:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-charlie
    restart: unless-stopped
    environment:
      - AGENT_NAME=charlie
      - AGENT_ROLE=triad
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/charlie:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_charlie:/app/memory
    ports:
      - "127.0.0.1:8004:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  examiner:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-examiner
    restart: unless-stopped
    environment:
      - AGENT_NAME=examiner
      - AGENT_ROLE=interrogator
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/examiner:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_examiner:/app/memory
    ports:
      - "127.0.0.1:8005:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  explorer:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-explorer
    restart: unless-stopped
    environment:
      - AGENT_NAME=explorer
      - AGENT_ROLE=scout
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/explorer:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_explorer:/app/memory
    ports:
      - "127.0.0.1:8006:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  sentinel:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-sentinel
    restart: unless-stopped
    environment:
      - AGENT_NAME=sentinel
      - AGENT_ROLE=guardian
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/sentinel:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_sentinel:/app/memory
    ports:
      - "127.0.0.1:8007:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

  coder:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: heretek-coder
    restart: unless-stopped
    environment:
      - AGENT_NAME=coder
      - AGENT_ROLE=artisan
      - LITELLM_HOST=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
      - DEFAULT_MODEL=minimax/M2.7
      - FAILOVER_MODEL=zai/glm-5
    volumes:
      - ./agents/coder:/app/agent:ro
      - skills_data:/app/skills:ro
      - agent_memory_coder:/app/memory
    ports:
      - "127.0.0.1:8008:8000"
    depends_on:
      litellm:
        condition: service_healthy
    networks:
      - heretek-network

# ==============================================================================
# Volumes — Persistent Data Storage
# ==============================================================================
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  ollama_data:
    driver: local
  skills_data:
    driver: local
  collective_memory:
    driver: local
  agent_memory_steward:
    driver: local
  agent_memory_alpha:
    driver: local
  agent_memory_beta:
    driver: local
  agent_memory_charlie:
    driver: local
  agent_memory_examiner:
    driver: local
  agent_memory_explorer:
    driver: local
  agent_memory_sentinel:
    driver: local
  agent_memory_coder:
    driver: local

# ==============================================================================
# Networks — Container Communication
# ==============================================================================
networks:
  heretek-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

---

### 2. litellm_config.yaml

```yaml
# ==============================================================================
# Heretek OpenClaw — LiteLLM Configuration v2.0
# Primary: MiniMax M2.7 | Failover: z.ai GLM-5
# ==============================================================================

model_list:
  # -------------------------------------------------------------------------
  # PRIMARY: MiniMax M2.7 (All Agents)
  # -------------------------------------------------------------------------
  - model_name: minimax/M2.7
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: minimax/M2.5
    litellm_params:
      model: minimax/M2.5
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  # -------------------------------------------------------------------------
  # FAILOVER: z.ai GLM-5 (Coding API)
  # -------------------------------------------------------------------------
  - model_name: zai/glm-5
    litellm_params:
      model: openai/glm-5
      api_key: os.environ/ZAI_API_KEY
      api_base: os.environ/ZAI_API_BASE

  - model_name: zai/glm-4
    litellm_params:
      model: openai/glm-4
      api_key: os.environ/ZAI_API_KEY
      api_base: os.environ/ZAI_API_BASE

  # -------------------------------------------------------------------------
  # Agent Passthrough Endpoints
  # -------------------------------------------------------------------------
  - model_name: agent/steward
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/alpha
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/beta
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/charlie
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/examiner
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/explorer
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/sentinel
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  - model_name: agent/coder
    litellm_params:
      model: minimax/M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE

  # -------------------------------------------------------------------------
  # Ollama Embedding (Local)
  # -------------------------------------------------------------------------
  - model_name: ollama/nomic-embed-text
    litellm_params:
      model: ollama/nomic-embed-text-v2-moe
      api_base: http://ollama:11434

litellm_settings:
  default_model: minimax/M2.7
  drop_params: true
  set_verbose: false
  request_timeout: 300
  num_retries: 3
  retry_after: 2
  cache: true
  cache_params:
    ttl: 3600
    redis_url: redis://redis:6379/0
  callbacks: true
  success_callback: "log_cost"

general_settings:
  database_url: os.environ/DATABASE_URL
  redis_url: os.environ/REDIS_URL
  master_key: os.environ/LITELLM_MASTER_KEY
  environment: heretek-openclaw
  log_level: INFO

# ==============================================================================
# A2A (Agent-to-Agent) Protocol Settings
# ==============================================================================
a2a_settings:
  enabled: true
  agent_timeout: 300
  session_persistence: redis
  session_ttl: 86400
  
  agent_endpoint_format: "/v1/agents/{agent_name}"
  send_message_endpoint: "/v1/agents/{agent_name}/send"
  receive_message_endpoint: "/v1/agents/{agent_name}/receive"
  health_check_endpoint: "/health"
  health_check_timeout: 10
  
  task_handoff:
    enabled: true
    context_preservation: full
    timeout_seconds: 60
  task_handoff_endpoint: "/v1/agents/{agent_name}/tasks"
  task_status_endpoint: "/v1/agents/{agent_name}/tasks/{task_id}/status"
  
  streaming:
    enabled: true
    chunk_size: 1024
  streaming_endpoint: "/v1/agents/{agent_name}/stream"
  
  agent_discovery:
    enabled: true
    heartbeat_interval: 30
    stale_agent_timeout: 120
  agent_cards_endpoint: "/v1/agents/.well-known"
  discover_endpoint: "/v1/agents/discover"

# ==============================================================================
# Router Settings
# ==============================================================================
router_settings:
  routing_strategy: simple-router
  enable_rate_limiting: true
  default_limit_requests: 60
  default_limit_period: 60
  
  model_health_check:
    enabled: true
    check_interval: 30
    timeout: 10
    unhealthy_threshold: 2
    recovery_wait: 30

# ==============================================================================
# Fallback Models (Priority-Ordered)
# ==============================================================================
fallback_models:
  - minimax/M2.7
  - minimax/M2.5
  - zai/glm-5
  - zai/glm-4
```

---

### 3. .env.example

```bash
# ==============================================================================
# Heretek OpenClaw — Environment Configuration v2.0
# ==============================================================================

# ==============================================================================
# LITEELM GATEWAY CONFIGURATION
# ==============================================================================
LITELLM_MASTER_KEY=heretek-master-key-change-me
LITELLM_SALT_KEY=heretek-salt-change-me
LITELLM_UI_USERNAME=admin
LITELLM_UI_PASSWORD=heretek-admin
LITELLM_HOST=http://localhost:4000

# ==============================================================================
# PROVIDER API KEYS
# ==============================================================================
# MiniMax API (PRIMARY)
MINIMAX_API_KEY=your-minimax-key-here
MINIMAX_API_BASE=https://api.minimaxi.chat/v1

# z.ai Coding API (FAILOVER)
ZAI_API_KEY=your-zai-key-here
ZAI_API_BASE=https://api.z.ai/api/coding/paas/v4

# Ollama (Local)
OLLAMA_API_KEY=not-required
OLLAMA_HOST=http://ollama:11434

# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
POSTGRES_USER=heretek
POSTGRES_PASSWORD=heretek-secure-password
POSTGRES_DB=heretek
DATABASE_URL=postgresql://heretek:${POSTGRES_PASSWORD}@postgres:5432/heretek

# ==============================================================================
# REDIS CONFIGURATION
# ==============================================================================
REDIS_URL=redis://redis:6379/0

# ==============================================================================
# OLLAMA CONFIGURATION (AMD GPU)
# ==============================================================================
OLLAMA_GPU_MODE=amd
OLLAMA_HOST_BINDING=0.0.0.0
OLLAMA_EMBEDDING_MODEL=nomic-embed-text-v2-moe
OLLAMA_MODELS=nomic-embed-text-v2-moe,qwen3:8b

# ==============================================================================
# AGENT MODEL ASSIGNMENTS
# ==============================================================================
DEFAULT_AGENT_MODEL=minimax/M2.7
FAILOVER_AGENT_MODEL=zai/glm-5

# ==============================================================================
# LOGGING & MONITORING
# ==============================================================================
LOG_LEVEL=INFO
LITELLM_REQUEST_LOGGING=true
LITELLM_COST_TRACKING_ENABLED=true
LITELLM_METRICS_ENABLED=true

# ==============================================================================
# A2A PROTOCOL SETTINGS
# ==============================================================================
LITELLM_STREAMING_ENABLED=true
LITELLM_AGENT_DISCOVERY_ENABLED=true
A2A_TASK_HANDOFF_TIMEOUT=60
A2A_HEARTBEAT_INTERVAL=30

# ==============================================================================
# FAILOVER CONFIGURATION
# ==============================================================================
LITELLM_PRIORITY_FALLBACK_ENABLED=true
LITELLM_HEALTH_CHECK_ENABLED=true
LITELLM_HEALTH_CHECK_INTERVAL=30
LITELLM_UNHEALTHY_THRESHOLD=2
```

---

### 4. Dockerfile.agent

```dockerfile
# ==============================================================================
# Heretek OpenClaw — Agent Container
# ==============================================================================
FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache \
    curl \
    bash \
    git

# Create app directory
WORKDIR /app

# Copy skills
COPY --from=heretek-skills /skills ./skills

# Copy agent files
COPY agents/${AGENT_NAME} ./agent

# Set environment
ENV NODE_ENV=production
ENV AGENT_PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start agent
CMD ["node", "agent/index.js"]
```

---

### 5. init/pgvector-init.sql

```sql
-- ==============================================================================
-- Heretek OpenClaw — pgvector Initialization
-- ==============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector tables for LiteLLM
CREATE TABLE IF NOT EXISTS litellm_embeddings (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),  -- nomic-embed-text-v2-moe dimension
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS litellm_embeddings_idx ON litellm_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Create agent memory tables
CREATE TABLE IF NOT EXISTS agent_memory (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create index for agent memory
CREATE INDEX IF NOT EXISTS agent_memory_idx ON agent_memory 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS agent_memory_agent_idx ON agent_memory(agent_name);

-- Create collective memory table
CREATE TABLE IF NOT EXISTS collective_memory (
    id SERIAL PRIMARY KEY,
    source_agent VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    importance_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create index for collective memory
CREATE INDEX IF NOT EXISTS collective_memory_idx ON collective_memory 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

---

### 6. install.sh (Oneshot Installer)

```bash
#!/bin/bash
# ==============================================================================
# Heretek OpenClaw — Oneshot Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/heretek-ai/heretek-openclaw/main/install.sh | bash
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Heretek OpenClaw — Installer v2.0                  ║"
echo "║     AMD GPU + MiniMax Primary + z.ai Failover               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Detect GPU
detect_gpu() {
    if command -v nvidia-smi &> /dev/null; then
        echo "nvidia"
    elif [ -d "/sys/module/amdgpu" ] || lspci | grep -qi "amd.*vga\|amd.*display"; then
        echo "amd"
    else
        echo "cpu"
    fi
}

GPU_MODE=$(detect_gpu)
echo -e "${GREEN}Detected GPU: ${GPU_MODE}${NC}"

# Clone repository if not exists
if [ ! -d "heretek-openclaw" ]; then
    echo -e "${YELLOW}Cloning Heretek OpenClaw...${NC}"
    git clone https://github.com/heretek-ai/heretek-openclaw.git
    cd heretek-openclaw
else
    cd heretek-openclaw
    echo -e "${YELLOW}Updating Heretek OpenClaw...${NC}"
    git pull
fi

# Create .env from example
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    
    # Prompt for API keys
    echo -e "${BLUE}Please enter your API keys:${NC}"
    read -p "MiniMax API Key: " MINIMAX_KEY
    read -p "z.ai API Key: " ZAI_KEY
    
    # Update .env
    sed -i "s/your-minimax-key-here/${MINIMAX_KEY}/" .env
    sed -i "s/your-zai-key-here/${ZAI_KEY}/" .env
    
    # Generate random keys
    MASTER_KEY=$(openssl rand -hex 32)
    SALT_KEY=$(openssl rand -hex 32)
    sed -i "s/heretek-master-key-change-me/${MASTER_KEY}/" .env
    sed -i "s/heretek-salt-change-me/${SALT_KEY}/" .env
fi

# Create init directory
mkdir -p init

# Pull embedding model
echo -e "${YELLOW}Pulling embedding model...${NC}"
docker compose up -d ollama
sleep 10
docker exec heretek-ollama ollama pull nomic-embed-text-v2-moe

# Start all services
echo -e "${YELLOW}Starting all services...${NC}"
docker compose up -d

# Wait for services
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 30

# Check status
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Heretek OpenClaw — Installation Complete!          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  LiteLLM Gateway:  http://localhost:4000                     ║"
echo "║  LiteLLM UI:       http://localhost:4000/ui                  ║"
echo "║  PostgreSQL:       localhost:5432                            ║"
echo "║  Redis:            localhost:6379                            ║"
echo "║  Ollama:           http://localhost:11434                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Agents:                                                      ║"
echo "║    Steward:    http://localhost:8001                         ║"
echo "║    Alpha:      http://localhost:8002                         ║"
echo "║    Beta:       http://localhost:8003                         ║"
echo "║    Charlie:    http://localhost:8004                         ║"
echo "║    Examiner:   http://localhost:8005                         ║"
echo "║    Explorer:   http://localhost:8006                         ║"
echo "║    Sentinel:   http://localhost:8007                         ║"
echo "║    Coder:      http://localhost:8008                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Show logs command
echo -e "${YELLOW}To view logs: docker compose logs -f${NC}"
echo -e "${YELLOW}To stop: docker compose down${NC}"
```

---

### 7. openclaw.json (Updated Agent Models)

```json
{
  "$schema": "https://docs.openclaw.ai/schema/openclaw-agent.json",
  "version": "2.0.0",
  "collective": {
    "name": "Heretek OpenClaw",
    "description": "Self-improving autonomous agent collective",
    "created": "2026-03-29",
    "version": "2.0.0",
    "configuration": {
      "primary_model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "embedding_model": "nomic-embed-text-v2-moe",
      "gpu_mode": "amd"
    }
  },
  "agents": [
    {
      "id": "steward",
      "name": "Steward",
      "role": "orchestrator",
      "description": "Orchestrates the collective",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:steward",
      "port": 8001,
      "capabilities": [
        "health_monitoring",
        "workflow_enforcement",
        "deliberation_coordination",
        "proposal_management"
      ],
      "skills": [
        "steward-orchestrator",
        "triad-sync-protocol",
        "fleet-backup"
      ]
    },
    {
      "id": "alpha",
      "name": "Alpha",
      "role": "triad",
      "description": "Triad member Alpha",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:alpha",
      "port": 8002,
      "capabilities": [
        "proposal_deliberation",
        "consensus_ledger_maintenance",
        "governance_voting"
      ],
      "skills": [
        "governance-modules",
        "triad-sync-protocol",
        "curiosity-engine"
      ]
    },
    {
      "id": "beta",
      "name": "Beta",
      "role": "triad",
      "description": "Triad member Beta",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:beta",
      "port": 8003,
      "capabilities": [
        "proposal_deliberation",
        "critical_analysis",
        "assumption_challenge"
      ],
      "skills": [
        "governance-modules",
        "triad-sync-protocol",
        "curiosity-engine"
      ]
    },
    {
      "id": "charlie",
      "name": "Charlie",
      "role": "triad",
      "description": "Triad member Charlie",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:charlie",
      "port": 8004,
      "capabilities": [
        "proposal_deliberation",
        "process_validation",
        "final_approval"
      ],
      "skills": [
        "governance-modules",
        "triad-sync-protocol",
        "curiosity-engine"
      ]
    },
    {
      "id": "examiner",
      "name": "Examiner",
      "role": "interrogator",
      "description": "Questions and challenges decisions",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:examiner",
      "port": 8005,
      "capabilities": [
        "logic_validation",
        "blind_spot_detection",
        "assumption_testing"
      ],
      "skills": [
        "governance-modules",
        "triad-heartbeat"
      ]
    },
    {
      "id": "explorer",
      "name": "Explorer",
      "role": "scout",
      "description": "Scouts for new opportunities",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:explorer",
      "port": 8006,
      "capabilities": [
        "opportunity_scanning",
        "knowledge_ingestion",
        "gap_detection"
      ],
      "skills": [
        "curiosity-engine",
        "gap-detector",
        "knowledge-ingest"
      ]
    },
    {
      "id": "sentinel",
      "name": "Sentinel",
      "role": "guardian",
      "description": "Guards the collective",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:sentinel",
      "port": 8007,
      "capabilities": [
        "security_monitoring",
        "anomaly_detection",
        "threat_assessment"
      ],
      "skills": [
        "healthcheck",
        "detect-corruption",
        "quorum-enforcement"
      ]
    },
    {
      "id": "coder",
      "name": "Coder",
      "role": "artisan",
      "description": "Builds and maintains code",
      "model": "minimax/M2.7",
      "failover_model": "zai/glm-5",
      "session": "agent:heretek:coder",
      "port": 8008,
      "capabilities": [
        "code_generation",
        "code_review",
        "refactoring"
      ],
      "skills": [
        "workspace-consolidation",
        "audit-triad-files"
      ]
    }
  ]
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `docker-compose.yml` with all services
- [ ] Create comprehensive `.env.example`
- [ ] Update `litellm_config.yaml` with MiniMax primary, z.ai failover
- [ ] Add passthrough endpoints per agent

### Phase 2: Agent Services
- [ ] Create `Dockerfile.agent`
- [ ] Configure agent-specific environment variables
- [ ] Mount heretek-skills volume
- [ ] Set up health checks per agent

### Phase 3: Vector & Memory
- [ ] Create `init/pgvector-init.sql`
- [ ] Configure embedding model via Ollama
- [ ] Create memory persistence volumes

### Phase 4: Ollama Integration
- [ ] Add AMD ROCm GPU profile
- [ ] Configure nomic-embed-text-v2-moe embedding
- [ ] Set up model pre-pulling

### Phase 5: Configuration Alignment
- [ ] Update `openclaw.json` with correct model assignments
- [ ] Remove unused provider references
- [ ] Validate JSON syntax

### Phase 6: Installer
- [ ] Create `install.sh` oneshot curl installer
- [ ] Add GPU detection logic
- [ ] Create interactive configuration

### Phase 7: Cleanup
- [ ] Remove `docker-compose.agent.yml` (merged into main)
- [ ] Remove unused documentation files
- [ ] Update README

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `docker-compose.yml` | New comprehensive compose |
| `Dockerfile.agent` | Agent container template |
| `init/pgvector-init.sql` | Vector database init |
| `install.sh` | Oneshot curl installer |

### Files to Modify
| File | Changes |
|------|---------|
| `.env.example` | Comprehensive environment |
| `litellm_config.yaml` | MiniMax primary, z.ai failover |
| `openclaw.json` | Fix syntax, update models |

### Files to Remove
| File | Reason |
|------|--------|
| `docker-compose.agent.yml` | Merged into main compose |
| Unused docs | Cleanup |

---

## Next Steps

1. **Switch to Code mode** to implement all files
2. **Test locally** with `docker compose up`
3. **Push to GitHub** for deployment
4. **Verify** all 8 agents are running with heretek-skills
