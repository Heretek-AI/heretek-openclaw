# OpenClaw Documentation

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

Heretek OpenClaw is a multi-agent AI collective with **11 specialized agents** running within the **OpenClaw Gateway v2026.3.28**. Agents communicate via **Gateway WebSocket RPC** for Agent-to-Agent (A2A) coordination.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                             │
│                    Port 18789                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Agent Workspaces                              │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │ │
│  │  │stew │ │alpha│ │beta │ │char │ │exam │ │expl │        │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                │ │
│  │  │sent │ │code │ │dream│ │empath│ │hist │                │ │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Documentation Index

### Architecture
- [`A2A_ARCHITECTURE.md`](architecture/A2A_ARCHITECTURE.md) - Agent-to-Agent communication protocol via Gateway WebSocket RPC
- [`GATEWAY_ARCHITECTURE.md`](architecture/GATEWAY_ARCHITECTURE.md) - OpenClaw Gateway architecture details
- [`REDIS_A2A_ARCHITECTURE.md`](archive/REDIS_A2A_ARCHITECTURE.md) - Legacy Redis Pub/Sub architecture (archived for reference)

### API Reference
- [`LITELLM_API.md`](api/LITELLM_API.md) - LiteLLM gateway API endpoints
- [`WEBSOCKET_API.md`](api/WEBSOCKET_API.md) - WebSocket bridge API

### Deployment & Operations
- [`LOCAL_DEPLOYMENT.md`](deployment/LOCAL_DEPLOYMENT.md) - Local deployment instructions
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Full deployment guide with external integrations
- [`PLUGIN_EXPANSION.md`](plugins/PLUGIN_EXPANSION.md) - Plugin development guide
- [`USER_MANAGEMENT.md`](users/USER_MANAGEMENT.md) - User management documentation

### External Integrations
- [`EXTERNAL_PROJECTS.md`](EXTERNAL_PROJECTS.md) - External projects and plugins documentation
- [`operations/LANGFUSE_OBSERVABILITY.md`](operations/LANGFUSE_OBSERVABILITY.md) - Langfuse observability setup

### Operations Runbooks
- [`README.md`](operations/README.md) - Operations overview
- [`runbook-agent-restart.md`](operations/runbook-agent-restart.md) - Agent restart procedures
- [`runbook-backup-restoration.md`](operations/runbook-backup-restoration.md) - Backup and restore procedures
- [`runbook-database-corruption.md`](operations/runbook-database-corruption.md) - Database corruption recovery
- [`runbook-emergency-shutdown.md`](operations/runbook-emergency-shutdown.md) - Emergency shutdown procedures
- [`runbook-service-failure.md`](operations/runbook-service-failure.md) - Service failure recovery
- [`runbook-troubleshooting.md`](operations/runbook-troubleshooting.md) - General troubleshooting

---

## System Components

### Agents (11)

All agents run as **workspaces** within the OpenClaw Gateway process at `~/.openclaw/agents/{agent}/`.

| Agent | Role | Triad | Workspace Path | Model Endpoint |
|-------|------|-------|----------------|----------------|
| **steward** | orchestrator | No | `~/.openclaw/agents/steward` | `agent/steward` |
| **alpha** | triad_member | Yes | `~/.openclaw/agents/alpha` | `agent/alpha` |
| **beta** | triad_member | Yes | `~/.openclaw/agents/beta` | `agent/beta` |
| **charlie** | triad_member | Yes | `~/.openclaw/agents/charlie` | `agent/charlie` |
| **examiner** | evaluator | No | `~/.openclaw/agents/examiner` | `agent/examiner` |
| **explorer** | researcher | No | `~/.openclaw/agents/explorer` | `agent/explorer` |
| **sentinel** | safety | No | `~/.openclaw/agents/sentinel` | `agent/sentinel` |
| **coder** | developer | No | `~/.openclaw/agents/coder` | `agent/coder` |
| **dreamer** | creative | No | `~/.openclaw/agents/dreamer` | `agent/dreamer` |
| **empath** | emotional | No | `~/.openclaw/agents/empath` | `agent/empath` |
| **historian** | archivist | No | `~/.openclaw/agents/historian` | `agent/historian` |

**Triad Consensus:** Alpha, Beta, and Charlie form the deliberative triad. 2/3 consensus required for decisions.

### Workspace Structure

Each agent workspace contains:

```
~/.openclaw/agents/steward/
├── SOUL.md           # Core nature, partnership protocol
├── IDENTITY.md       # Personality matrix, behavioral traits
├── AGENTS.md         # Operational guidance
├── USER.md           # Human partner context
├── TOOLS.md          # Tool usage notes
├── BOOTSTRAP.md      # Bootstrap/configuration instructions
├── session.jsonl     # Session data (JSONL format)
└── config.json       # Agent-specific configuration
```

### Services

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **OpenClaw Gateway** | 18789 | Agent management, A2A via WebSocket RPC | ✅ Primary |
| **LiteLLM Gateway** | 4000 | Model routing with agent passthrough | ✅ Running |
| **PostgreSQL** | 5432 | Vector database with pgvector | ✅ Running |
| **Redis** | 6379 | Caching layer only (not A2A) | ✅ Running |
| **Ollama** | 11434 | Local embeddings (AMD GPU) | ⚠️ Running |

---

## Quick Reference

### Gateway WebSocket Endpoint

```
ws://127.0.0.1:18789
```

### LiteLLM Agent Endpoints

```bash
# Chat completion via agent passthrough
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/steward",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Environment Variables

```bash
# OpenClaw Gateway
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/agents
GATEWAY_URL=ws://127.0.0.1:18789

# LiteLLM Gateway
LITELLM_HOST=http://localhost:4000
LITELLM_MASTER_KEY=<master_key>
LITELLM_UI_USERNAME=admin
LITELLM_UI_PASSWORD=<password>

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=heretek
POSTGRES_USER=heretek
POSTGRES_PASSWORD=<password>

# Redis (caching only)
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
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## File Structure

```
heretek-openclaw/
├── agents/                    # Agent identity templates and deployment scripts
│   ├── deploy-agent.sh        # Template-based agent deployment
│   ├── entrypoint.sh          # Legacy container entrypoint (deprecated)
│   ├── lib/                   # Agent client libraries
│   ├── templates/             # Agent identity templates
│   └── {agent}/               # Individual agent workspaces
├── docs/                      # Documentation
│   ├── architecture/          # Architecture documents
│   ├── api/                   # API reference
│   ├── deployment/            # Deployment guides
│   ├── operations/            # Operations runbooks
│   ├── plugins/               # Plugin documentation
│   └── users/                 # User management
├── plugins/                   # OpenClaw plugins
│   ├── openclaw-consciousness-plugin/
│   ├── openclaw-liberation-plugin/
│   ├── openclaw-hybrid-search-plugin/
│   ├── openclaw-multi-doc-retrieval/
│   ├── openclaw-skill-extensions/
│   ├── episodic-claw/
│   └── swarmclaw/
├── scripts/                   # Operational scripts
│   ├── health-check.sh        # Service health verification
│   ├── production-backup.sh   # Backup and restore system
│   ├── validate-cycles.sh     # Implementation cycle validation
│   └── litellm-healthcheck.py # LiteLLM health check
├── skills/                    # Agent skills (SKILL.md format)
│   ├── triad-sync-protocol/
│   ├── triad-heartbeat/
│   ├── steward-orchestrator/
│   ├── curiosity-engine/
│   ├── thought-loop/
│   └── ... (48 skills total)
├── tests/                     # Test suites
├── users/                     # User configurations
├── docker-compose.yml         # Infrastructure services
├── litellm_config.yaml        # LiteLLM configuration
├── openclaw.json              # OpenClaw Gateway configuration
├── .env.example               # Environment template
├── .gitignore
├── CHANGELOG.md
├── LICENSE
└── README.md
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

## Architecture Summary

### Current Architecture (Gateway-Based)

- **A2A Protocol:** Gateway WebSocket RPC (port 18789)
- **Session Storage:** JSONL files per workspace
- **Agent Workspaces:** `~/.openclaw/agents/{agent}/`
- **Model Routing:** LiteLLM Gateway (port 4000) with passthrough endpoints

### Legacy Architecture (Deprecated)

- **A2A Protocol:** Redis Pub/Sub (deprecated)
- **Agent Ports:** 8001-8011 (deprecated)
- **Session Storage:** Redis hashes (deprecated)

**Migration Note:** Redis is still used for **caching only**, not A2A communication.

---

## References

- [OpenClaw Official Documentation](https://github.com/openclaw/openclaw)
- [Heretek OpenClaw Repository](https://github.com/Heretek-AI/heretek-openclaw)
- [LiteLLM Documentation](https://docs.litellm.ai/)

---

🦞 *The thought that never ends.*
