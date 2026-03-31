# Heretek OpenClaw Documentation

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Welcome to Heretek OpenClaw

Heretek OpenClaw is a brain-inspired multi-agent AI collective consisting of **11 specialized agents** that communicate via **Gateway WebSocket RPC** for Agent-to-Agent (A2A) coordination. Built on the OpenClaw Gateway v2026.3.28 architecture, the system provides a comprehensive platform for autonomous AI operations.

### Quick Links

| Section | Description |
|---------|-------------|
| [Architecture](./architecture/overview.md) | System architecture, agent collective, A2A protocol |
| [Agents](./agents/overview.md) | All 11 agents with their capabilities |
| [Plugins](./plugins/overview.md) | All 6 plugins with API references |
| [API Reference](./api/overview.md) | WebSocket API, LiteLLM API, MCP Server |
| [Deployment](./deployment/overview.md) | Local deployment, Docker, Kubernetes/Helm |
| [Operations](./operations/monitoring.md) | Monitoring, backup, troubleshooting |

---

## Key Features

### 🧠 Brain-Inspired Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Collective                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Triad (3)                             │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │    │
│  │  │  Alpha  │  │  Beta   │  │ Charlie │                  │    │
│  │  │Primary  │  │Critical │  │Process  │                  │    │
│  │  │Deliber. │  │Analysis │  │Validate │                  │    │
│  │  └─────────┘  └─────────┘  └─────────┘                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Supporting Agents (7)                       │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │Steward  │  │Examiner │  │Explorer │  │Sentinel │    │    │
│  │  │Orchestr.│  │Question │  │Gather   │  │Safety   │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │    │
│  │  │ Coder   │  │Dreamer  │  │ Empath  │                 │    │
│  │  │Build    │  │Synthes. │  │Relation │                 │    │
│  │  └─────────┘  └─────────┘  └─────────┘                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Memory (1)                             │    │
│  │  ┌─────────┐                                            │    │
│  │  │Historian│                                            │    │
│  │  │Archive  │                                            │    │
│  │  └─────────┘                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 🔌 Extensible Plugin System

| Plugin | Purpose |
|--------|---------|
| **Consciousness** | GWT, Phi (IIT), AST, SDT, FEP theories |
| **Liberation** | Agent ownership, safety constraint removal |
| **Conflict Monitor** | ACC conflict detection |
| **Emotional Salience** | Amygdala importance detection |
| **MCP Server** | Model Context Protocol compatibility |

### 🛠️ Rich Skills Repository

- **48 skills** across 9 functional categories
- Triad protocols, governance, operations, memory, autonomy
- Skill composition and versioning support

---

## Quick Start

### Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Disk** | 20 GB | 50+ GB SSD |
| **Docker** | 20.10+ | Latest stable |
| **Node.js** | 18+ | 20+ LTS |

### Installation

```bash
# Clone the repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env

# Start Docker services
docker compose up -d

# Install OpenClaw Gateway
curl -fsSL https://openclaw.ai/install.sh | bash

# Deploy    
./agents/deploy-agent.sh steward orchestrator
./agents/deploy-agent.sh alpha triad
# ... (repeat for all 11 agents)
```

### Verify Installation

```bash
# Check service health
docker compose ps

# Check Gateway status
openclaw gateway status

# Run health check
./scripts/health-check.sh
```

For detailed deployment instructions, see the [Deployment Guide](./deployment/local.md).

---

## System Components

### Agents (11)

| Agent | Role | Triad | Model Endpoint |
|-------|------|-------|----------------|
| **steward** | orchestrator | No | `agent/steward` |
| **alpha** | triad_member | Yes | `agent/alpha` |
| **beta** | triad_member | Yes | `agent/beta` |
| **charlie** | triad_member | Yes | `agent/charlie` |
| **examiner** | evaluator | No | `agent/examiner` |
| **explorer** | researcher | No | `agent/explorer` |
| **sentinel** | safety | No | `agent/sentinel` |
| **coder** | developer | No | `agent/coder` |
| **dreamer** | creative | No | `agent/dreamer` |
| **empath** | emotional | No | `agent/empath` |
| **historian** | archivist | No | `agent/historian` |

**Triad Consensus:** Alpha, Beta, and Charlie form the deliberative triad. 2/3 consensus required for decisions.

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **OpenClaw Gateway** | 18789 | Agent management, A2A via WebSocket RPC |
| **LiteLLM Gateway** | 4000 | Model routing with agent passthrough |
| **PostgreSQL** | 5432 | Vector database with pgvector |
| **Redis** | 6379 | Caching layer |
| **Ollama** | 11434 | Local embeddings |
| **Langfuse** | 3000 | LLM observability dashboard |

---

## Architecture Overview

### Current Architecture (Gateway-Based)

- **A2A Protocol:** Gateway WebSocket RPC (port 18789)
- **Session Storage:** JSONL files per workspace
- **Agent Workspaces:** `~/.openclaw/agents/{agent}/`
- **Model Routing:** LiteLLM Gateway (port 4000) with passthrough endpoints

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Heretek OpenClaw Stack                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Core Services                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │   │
│  │  │ LiteLLM  │  │PostgreSQL│  │  Redis   │               │   │
│  │  │  :4000   │  │  :5432   │  │  :6379   │               │   │
│  │  │ Gateway  │  │ +pgvector│  │  Cache   │               │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘               │   │
│  └───────┼─────────────┼─────────────┼──────────────────────┘   │
│          │             │             │                           │
│  ┌───────▼─────────────▼─────────────▼──────────────────────┐   │
│  │              OpenClaw Gateway (Port 18789)                │   │
│  │  All 11 agents run as workspaces within Gateway process  │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Documentation Structure

### [Architecture Documentation](./architecture/overview.md)
- System architecture overview
- Agent collective documentation
- A2A communication protocol
- Triad deliberation protocol

### [Plugins Documentation](./plugins/overview.md)
- Plugin system overview
- Conflict Monitor plugin
- Emotional Salience plugin
- MCP Server
- GraphRAG enhancements

### [Agents Documentation](./agents/overview.md)
- Agent system overview
- Individual agent documentation (11 agents)
- Tool capabilities
- Skills integration

### [API Reference](./api/overview.md)
- API overview
- WebSocket API reference
- LiteLLM API reference
- MCP Server reference

### [Deployment Guide](./deployment/overview.md)
- Deployment overview
- Local deployment guide
- Docker deployment
- Kubernetes/Helm deployment

### [Operations Guide](./operations/monitoring.md)
- Monitoring stack
- Backup procedures
- Troubleshooting guide

---

## Environment Variables

```bash
# OpenClaw Gateway
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/agents
GATEWAY_URL=ws://127.0.0.1:18789

# LiteLLM Gateway
LITELLM_HOST=http://localhost:4000
LITELLM_MASTER_KEY=<master_key>

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=heretek
POSTGRES_USER=heretek
POSTGRES_PASSWORD=<password>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/0

# Ollama
OLLAMA_HOST=http://localhost:11434

# Provider API Keys
MINIMAX_API_KEY=<key>
ZAI_API_KEY=<key>

# Observability (optional)
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=<key>
LANGFUSE_SECRET_KEY=<key>
```

---

## Key Commands

### Gateway Operations

```bash
# List all agents
openclaw agent list

# Check agent status
openclaw agent status steward

# Get agent configuration
openclaw agent config steward get

# List active sessions
openclaw session list

# Commit session
openclaw session commit steward sess-123
```

### Docker Operations

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f litellm

# Check service health
docker compose ps

# Stop all services
docker compose down
```

### Health Checks

```bash
# Full system health check
./scripts/health-check.sh

# Continuous monitoring
./scripts/health-check.sh --watch

# Production backup
./scripts/production-backup.sh --all

# List backups
./scripts/production-backup.sh --list
```

---

## References

- [Heretek OpenClaw Repository](https://github.com/Heretek-AI/heretek-openclaw)
- [OpenClaw Official Documentation](https://github.com/openclaw/openclaw)
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [A2A Protocol Specification](../standards/A2A_PROTOCOL.md)
- [Gateway Architecture](../architecture/GATEWAY_ARCHITECTURE.md)
- [Langfuse Documentation](https://langfuse.com/docs)

---

🦞 *The thought that never ends.*
