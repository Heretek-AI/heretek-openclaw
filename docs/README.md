# OpenClaw Documentation

## Overview

Heretek OpenClaw is a multi-agent AI collective with 11 specialized agents running within the **OpenClaw Gateway v2026.3.28**. Agents communicate via Gateway WebSocket RPC for Agent-to-Agent (A2A) coordination.

## Documentation Index

### Architecture
- [`A2A_ARCHITECTURE.md`](docs/architecture/A2A_ARCHITECTURE.md) - Agent-to-Agent communication protocol via Gateway WebSocket RPC
- [`GATEWAY_ARCHITECTURE.md`](docs/architecture/GATEWAY_ARCHITECTURE.md) - OpenClaw Gateway architecture details
- [`REDIS_A2A_ARCHITECTURE.md`](docs/archive/REDIS_A2A_ARCHITECTURE.md) - Legacy Redis Pub/Sub architecture (archived)

### API Reference
- [`LITELLM_API.md`](docs/api/LITELLM_API.md) - LiteLLM gateway API endpoints
- [`WEBSOCKET_API.md`](docs/api/WEBSOCKET_API.md) - WebSocket bridge API

### System Components

#### Agents (11)
| Agent | Role | Workspace Path | Model Endpoint |
|-------|------|----------------|----------------|
| steward | orchestrator | `~/.openclaw/agents/steward` | litellm/agent/steward |
| alpha | triad_member | `~/.openclaw/agents/alpha` | litellm/agent/alpha |
| charlie | triad_member | `~/.openclaw/agents/charlie` | litellm/agent/charlie |
| examiner | evaluator | `~/.openclaw/agents/examiner` | litellm/agent/examiner |
| explorer | researcher | `~/.openclaw/agents/explorer` | litellm/agent/explorer |
| sentinel | safety | `~/.openclaw/agents/sentinel` | litellm/agent/sentinel |
| coder | developer | `~/.openclaw/agents/coder` | litellm/agent/coder |
| dreamer | creative | `~/.openclaw/agents/dreamer` | litellm/agent/dreamer |
| empath | emotional | `~/.openclaw/agents/empath` | litellm/agent/empath |
| historian | historical | `~/.openclaw/agents/historian` | litellm/agent/historian |

**Note:** All agents run as workspaces within the OpenClaw Gateway process (port 18789), not as separate Docker containers.

#### Services
| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **OpenClaw Gateway** | 18789 | Agent management, A2A communication | ✅ Primary |
| **LiteLLM Gateway** | 4000 | Model routing with agent passthrough | ✅ Running |
| **PostgreSQL** | 5432 | Vector database with pgvector | ✅ Running |
| **Redis** | 6379 | Caching layer only (not A2A) | ✅ Running |
| **Ollama** | 11434 | Local embeddings | ⚠️ Running |

## Quick Reference

### Gateway WebSocket Endpoints
```
ws://127.0.0.1:18789        # OpenClaw Gateway
```

### LiteLLM Agent Endpoints
```
http://localhost:4000/v1/chat/completions
Model: agent/{name} (e.g., agent/steward, agent/alpha)
```

### Environment Variables
```bash
# OpenClaw Gateway
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/agents

# LiteLLM
LITELLM_HOST=http://localhost:4000
LITELLM_API_KEY=<master_key>

# Redis (caching only)
REDIS_HOST=localhost
REDIS_PORT=6379

# Langfuse (optional)
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=<key>
LANGFUSE_SECRET_KEY=<key>
LANGFUSE_HOST=https://cloud.langfuse.com
```

## File Structure
```
heretek-openclaw/
├── agents/              # Agent identity templates
├── modules/             # Autonomy modules (consciousness, memory, etc.)
├── skills/              # Agent skills repository (SKILL.md format)
├── plugins/             # OpenClaw plugins (consciousness, liberation)
├── docs/                # Documentation
├── docker-compose.yml   # Infrastructure services
├── litellm_config.yaml  # LiteLLM configuration
├── openclaw.json        # OpenClaw Gateway configuration
└── plans/               # Planning documents
```
