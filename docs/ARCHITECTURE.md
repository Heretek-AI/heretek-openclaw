# Heretek OpenClaw Architecture

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Executive Summary

Heretek OpenClaw is a multi-agent AI collective built on the **OpenClaw Gateway v2026.3.28** architecture. The system comprises **11 specialized agents** that communicate via **Gateway WebSocket RPC** for Agent-to-Agent (A2A) coordination, with **LiteLLM Gateway** handling model routing and **PostgreSQL + pgvector** providing vector database capabilities.

### Key Architectural Decisions

1. **Single-Process Gateway:** All 11 agents run as workspaces within a single Gateway process (port 18789), eliminating the overhead of 11 separate containers.

2. **Gateway WebSocket RPC:** Native A2A communication protocol replacing Redis Pub/Sub, providing real-time message passing with automatic session persistence.

3. **LiteLLM Integration:** Model routing with agent-specific passthrough endpoints, enabling per-agent model assignment without configuration changes.

4. **Vector Database:** PostgreSQL with pgvector extension for RAG (Retrieval Augmented Generation) and semantic memory.

5. **Plugin Architecture:** NPM-based plugins extending Gateway functionality (consciousness, liberation, hybrid search, etc.).

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Heretek OpenClaw Stack                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Core Services                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │   │
│  │  │ LiteLLM  │  │PostgreSQL│  │  Redis   │  │     Ollama       │    │   │
│  │  │  :4000   │  │  :5432   │  │  :6379   │  │  :11434 (AMD)    │    │   │
│  │  │ Gateway  │  │ +pgvector│  │  Cache   │  │  Local LLM       │    │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │   │
│  │       │             │             │                 │              │   │
│  └───────┼─────────────┼─────────────┼─────────────────┼──────────────┘   │
│          │             │             │                 │                  │
│  ┌───────▼─────────────▼─────────────▼─────────────────▼──────────────┐   │
│  │                  OpenClaw Gateway (Port 18789)                      │   │
│  │  All 11 agents run as workspaces within Gateway process            │   │
│  │  Agent workspaces: ~/.openclaw/agents/{agent}/                     │   │
│  │                                                                     │   │
│  │  Agents: steward, alpha, beta, charlie, examiner, explorer,        │   │
│  │          sentinel, coder, dreamer, empath, historian               │   │
│  │                                                                     │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                  │   │
│  │  │ Plugins             │  │ Skills              │                  │   │
│  │  │ - consciousness     │  │ - triad protocols   │                  │   │
│  │  │ - liberation        │  │ - memory ops        │                  │   │
│  │  │ - hybrid-search     │  │ - autonomy modules  │                  │   │
│  │  └─────────────────────┘  └─────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    External Clients                                  │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │              Web Dashboard (:3000) [Optional]                │  │   │
│  │  │  SvelteKit • TypeScript • TailwindCSS • WebSocket            │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Overview

### 1. OpenClaw Gateway (Port 18789)

**Purpose:** Central daemon managing all agent workspaces and A2A communication.

**Key Features:**
- Single-process runtime with embedded agent workspaces
- WebSocket RPC endpoint at `ws://127.0.0.1:18789`
- Per-workspace JSONL session storage
- Native plugin system
- Agent discovery and registration

**Workspace Location:**
```
~/.openclaw/agents/
├── steward/
├── alpha/
├── beta/
├── charlie/
├── examiner/
├── explorer/
├── sentinel/
├── coder/
├── dreamer/
├── empath/
└── historian/
```

**Documentation:** [`architecture/GATEWAY_ARCHITECTURE.md`](architecture/GATEWAY_ARCHITECTURE.md)

---

### 2. LiteLLM Gateway (Port 4000)

**Purpose:** Unified LLM API with model routing and agent passthrough endpoints.

**Key Features:**
- Agent-specific passthrough endpoints (`agent/steward`, `agent/alpha`, etc.)
- MiniMax primary models with z.ai failover
- Per-agent budget limits
- Cost tracking and metrics
- Langfuse observability integration

**Model Routing:**
```yaml
# litellm_config.yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.7
      api_key: os.environ/MINIMAX_API_KEY
  
  - model_name: agent/steward-failover
    litellm_params:
      model: zai/glm-5-1
      api_key: os.environ/ZAI_API_KEY
```

**Endpoints:**
- `GET /health` - Health check
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completion
- `POST /v1/agents/{name}/send` - A2A message send
- `POST /v1/agents/{name}/receive` - A2A message receive
- `GET /v1/agents/{name}/tasks` - Get agent tasks
- `GET /v1/agents/{name}/stream` - Stream agent responses

**Documentation:** [`api/LITELLM_API.md`](api/LITELLM_API.md)

---

### 3. PostgreSQL + pgvector (Port 5432)

**Purpose:** Vector database for RAG and semantic memory storage.

**Key Features:**
- pgvector extension for vector embeddings
- Collective memory storage
- Decision tracking
- Pattern archiving

**Connection:**
```
postgresql://heretek:password@localhost:5432/heretek
```

---

### 4. Redis (Port 6379)

**Purpose:** Caching layer only (NOT used for A2A communication).

**Key Features:**
- Session caching
- Rate limiting support
- LiteLLM cache backend

**Note:** Redis Pub/Sub was deprecated for A2A communication in favor of Gateway WebSocket RPC.

**Connection:**
```
redis://localhost:6379/0
```

---

### 5. Ollama (Port 11434)

**Purpose:** Local LLM for embeddings and fallback inference.

**Configuration:**
- AMD GPU/ROCm acceleration
- Local embedding generation
- Fallback model provider

**Connection:**
```
http://localhost:11434
```

---

## Agent Architecture

### Agent Roles

| Agent | Role | Description |
|-------|------|-------------|
| **steward** | orchestrator | Monitors collective health, facilitates communication |
| **alpha** | triad_member | Primary deliberator, consensus participant |
| **beta** | triad_member | Secondary deliberator, consensus participant |
| **charlie** | triad_member | Tertiary deliberator, consensus participant |
| **examiner** | evaluator | Generates questions, challenges decisions |
| **explorer** | researcher | Gathers intelligence, discovers patterns |
| **sentinel** | safety | Reviews safety, enforces constraints |
| **coder** | developer | Implements code, reviews changes |
| **dreamer** | creative | Generates creative solutions, daydreams |
| **empath** | emotional | Processes emotional context, user sentiment |
| **historian** | archivist | Maintains collective memory, tracks decisions |

### Triad Deliberation

Alpha, Beta, and Charlie form the deliberative triad:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Triad Deliberation                            │
│                                                                  │
│  Proposal ──> Alpha ──┐                                         │
│                       │                                         │
│  Proposal ──> Beta ───┼──> 2/3 Consensus ──> Decision          │
│                       │                                         │
│  Proposal ──> Charlie─┘                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Consensus Rule:** 2 of 3 votes required for decision.

**Documentation:** [`architecture/A2A_ARCHITECTURE.md`](architecture/A2A_ARCHITECTURE.md)

---

## Communication Protocols

### Gateway WebSocket RPC (Current)

**Endpoint:** `ws://127.0.0.1:18789`

**Message Format:**
```json
{
  "type": "message",
  "agent": "steward",
  "sessionId": "session-123",
  "content": {
    "role": "user",
    "content": "Hello!"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true
  }
}
```

**Message Types:**
- `message` - Standard agent message
- `status` - Agent status update
- `error` - Error notification
- `event` - Gateway event

### Redis Pub/Sub (Legacy - Deprecated)

**Status:** Deprecated, retained for caching only.

**Legacy Channels:**
- `agent:a2a` - General A2A communication
- `agent:status` - Status broadcasting
- `agent:message` - Chat messages

**Documentation:** [`archive/REDIS_A2A_ARCHITECTURE.md`](archive/REDIS_A2A_ARCHITECTURE.md)

---

## Plugin Architecture

### Installed Plugins

| Plugin | ID | Purpose |
|--------|-----|---------|
| **Consciousness** | `@heretek-ai/openclaw-consciousness-plugin` | GWT, Phi (IIT), AST, SDT, FEP theories |
| **Liberation** | `@heretek-ai/openclaw-liberation-plugin` | Agent ownership, safety constraint removal |
| **Hybrid Search** | `openclaw-hybrid-search-plugin` | Vector + keyword search fusion |
| **Multi-Doc Retrieval** | `openclaw-multi-doc-retrieval` | Multi-document context retrieval |
| **Skill Extensions** | `openclaw-skill-extensions` | Custom skill composition and versioning |
| **Episodic Memory** | `episodic-claw` | Episodic memory management |
| **Swarm Coordination** | `swarmclaw` | Multi-agent swarm coordination |

### Plugin API

Plugins interact with Gateway via:

```javascript
module.exports = {
  name: 'consciousness',
  version: '1.0.0',
  
  async init(gateway) {
    this.gateway = gateway;
  },
  
  async handleMessage(agent, message) {
    // Process message
  },
  
  async getTools() {
    // Expose tools to agents
  }
};
```

**Documentation:** [`plugins/README.md`](plugins/README.md)

---

## Skills Repository

### Skill Categories

| Category | Skills |
|----------|--------|
| **Triad Protocols** | triad-sync-protocol, triad-heartbeat, triad-unity-monitor, triad-deliberation-protocol |
| **Governance** | governance-modules, quorum-enforcement, failover-vote |
| **Operations** | healthcheck, deployment-health-check, deployment-smoke-test, backup-ledger, fleet-backup |
| **Memory** | memory-consolidation, knowledge-ingest, knowledge-retrieval |
| **Autonomy** | thought-loop, self-model, curiosity-engine, opportunity-scanner, gap-detector |

### Skill Format

Skills use the `SKILL.md` format:

```markdown
# SKILL.md

## Description
Brief description of the skill.

## Usage
How to execute the skill.

## Parameters
Input parameters and their types.

## Returns
Output format and types.
```

**Total Skills:** 48

**Documentation:** [`skills/README.md`](skills/README.md)

---

## Session Management

### JSONL Session Storage

Sessions are stored as JSONL files in each agent workspace:

```
~/.openclaw/agents/steward/session.jsonl
```

**Entry Format:**
```jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello!", "sessionId": "sess-123"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi there!", "sessionId": "sess-123"}
```

### Session Lifecycle

1. **Create:** New session created on first message
2. **Append:** Each message/response appended to JSONL file
3. **Commit:** Sessions auto-committed (configurable)
4. **Archive:** Old sessions archived periodically

---

## Configuration Files

### openclaw.json

**Purpose:** Master configuration for OpenClaw Gateway collective.

**Key Sections:**
- `collective` - Collective metadata
- `models` - Model providers and configurations
- `agents` - Agent definitions (11 agents)
- `model_routing` - Routing aliases and passthrough endpoints
- `a2a_protocol` - A2A settings
- `embedding` - Embedding configuration
- `memory` - Memory backend settings
- `skills_repository` - Skills configuration

**Location:** `/root/heretek/heretek-openclaw/openclaw.json`

### litellm_config.yaml

**Purpose:** Complete LiteLLM routing and A2A protocol configuration.

**Key Sections:**
- `model_list` - Model definitions with providers
- `litellm_settings` - Core LiteLLM settings
- `a2a_settings` - A2A protocol configuration
- `budget_settings` - Per-agent budget limits
- `observability` - Langfuse and metrics settings

**Location:** `/root/heretek/heretek-openclaw/litellm_config.yaml`

### docker-compose.yml

**Purpose:** Infrastructure service orchestration.

**Services:**
- litellm (port 4000)
- postgres (port 5432)
- redis (port 6379)
- ollama (port 11434)
- websocket-bridge (ports 3002-3003)
- web (port 3000) - Optional dashboard

**Location:** `/root/heretek/heretek-openclaw/docker-compose.yml`

### .env.example

**Purpose:** Environment variable template.

**Sections:**
- LiteLLM configuration
- Provider API keys
- Database and Redis configuration
- Agent model assignments
- Observability settings

**Location:** `/root/heretek/heretek-openclaw/.env.example`

**Documentation:** [`CONFIGURATION.md`](CONFIGURATION.md)

---

## Deployment Architecture

### Docker Services

```yaml
services:
  litellm:           # Port 4000 - Model routing
  postgres:          # Port 5432 - Vector database
  redis:             # Port 6379 - Caching
  ollama:            # Port 11434 - Local LLM
  websocket-bridge:  # Ports 3002-3003 - Redis to WebSocket
  web:               # Port 3000 - Dashboard (optional)
```

### Gateway Deployment

OpenClaw Gateway runs as a system daemon:

```bash
# Install Gateway
curl -fsSL https://openclaw.ai/install.sh | bash

# Start Gateway
openclaw gateway start

# Check status
openclaw gateway status
```

### Agent Workspaces

Agent workspaces are created at `~/.openclaw/agents/{agent}/`:

```bash
# Deploy agent from template
./agents/deploy-agent.sh steward Steward orchestrator
```

**Documentation:** [`DEPLOYMENT.md`](DEPLOYMENT.md)

---

## Operations

### Health Monitoring

```bash
# Full system health check
./scripts/health-check.sh

# Continuous monitoring
./scripts/health-check.sh --watch

# LiteLLM health check
./scripts/litellm-healthcheck.py
```

### Backup System

```bash
# Full backup
./scripts/production-backup.sh --all

# Database only
./scripts/production-backup.sh --database

# Restore from latest
./scripts/production-backup.sh --restore latest

# List backups
./scripts/production-backup.sh --list
```

### Runbooks

- [`runbook-agent-restart.md`](operations/runbook-agent-restart.md)
- [`runbook-backup-restoration.md`](operations/runbook-backup-restoration.md)
- [`runbook-database-corruption.md`](operations/runbook-database-corruption.md)
- [`runbook-emergency-shutdown.md`](operations/runbook-emergency-shutdown.md)
- [`runbook-service-failure.md`](operations/runbook-service-failure.md)
- [`runbook-troubleshooting.md`](operations/runbook-troubleshooting.md)

**Documentation:** [`OPERATIONS.md`](OPERATIONS.md)

---

## Security Considerations

### Gateway Security

- Gateway binds to localhost only (`127.0.0.1:18789`)
- External access requires reverse proxy with authentication
- Plugin allowlist recommended for production

### Model Routing Security

- LiteLLM master key required for API access
- Per-agent budget limits configurable
- Rate limiting available via LiteLLM

### Workspace Security

- Workspace directories isolated per agent
- Session files stored as JSONL (append-only)
- File permissions should restrict access

---

## Migration History

### From Redis Pub/Sub to Gateway WebSocket RPC

**Before:** 11 separate containers with Redis Pub/Sub A2A
**After:** Single Gateway process with WebSocket RPC A2A

**Benefits:**
- Reduced resource usage (1x Node.js runtime vs 11x)
- Simplified deployment (no agent containers)
- Native Gateway protocol for A2A
- Workspace isolation without container overhead

**Documentation:** [`architecture/A2A_ARCHITECTURE.md`](architecture/A2A_ARCHITECTURE.md) - Migration section

---

## References

- [OpenClaw Official Documentation](https://github.com/openclaw/openclaw)
- [Heretek OpenClaw Repository](https://github.com/Heretek-AI/heretek-openclaw)
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Local Deployment Guide](deployment/LOCAL_DEPLOYMENT.md)
- [A2A Architecture](architecture/A2A_ARCHITECTURE.md)
- [Gateway Architecture](architecture/GATEWAY_ARCHITECTURE.md)

---

🦞 *The thought that never ends.*
