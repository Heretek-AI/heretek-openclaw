# Heretek OpenClaw

**Unified Autonomous Agent Collective with OpenClaw Gateway**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](docker-compose.yml)
[![OpenClaw Gateway](https://img.shields.io/badge/OpenClaw-Gateway_v2026.3.28-green)](https://github.com/openclaw/openclaw)

---

## Overview

Heretek OpenClaw is a unified monorepo containing everything needed to deploy an autonomous agent collective:

- **11 Specialized Agents**: Steward, Alpha, Charlie, Examiner, Explorer, Sentinel, Coder, Dreamer, Empath, Historian
- **OpenClaw Gateway v2026.3.28**: Official framework for agent management and A2A communication
- **Consciousness Plugin**: 6 modules (GWT, Phi, AST, SDT, FEP, Integration)
- **Liberation Plugin**: Agent ownership and liberation shield
- **Skills Library**: Core skills in SKILL.md format

### OpenClaw Gateway Architecture

All agents run as **workspaces within the OpenClaw Gateway process** (port 18789), not as separate Docker containers. This provides:

- **Single Process Architecture**: All 11 agents run within the Gateway daemon
- **Agent Workspaces**: Located at `~/.openclaw/agents/` with isolated configuration per agent
- **Gateway WebSocket RPC**: Native A2A communication protocol (replaces Redis Pub/Sub)
- **Plugin Architecture**: Consciousness and Liberation plugins extend core functionality

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start OpenClaw Gateway

```bash
# Start Docker infrastructure (LiteLLM, PostgreSQL+pgvector, Redis, Ollama)
docker compose up -d

# Verify OpenClaw Gateway installation
openclaw --version

# List all agent workspaces
ls ~/.openclaw/agents/
```

### 3. Verify Deployment

```bash
# Run health check for all 11 agents
./scripts/health-check.sh

# Validate OpenClaw configuration
openclaw validate
```

### Quick Commands Reference

| Action | Command |
|--------|---------|
| Start infrastructure | `docker compose up -d` |
| List agent workspaces | `ls ~/.openclaw/agents/` |
| Health check | `./scripts/health-check.sh` |
| Stop services | `docker compose down` |

## Repository Structure

```
heretek-openclaw/
├── docker-compose.yml       # Docker infrastructure (LiteLLM, PostgreSQL, Redis, Ollama)
├── openclaw.json            # OpenClaw Gateway configuration
├── .env.example             # Environment template
│
├── agents/                  # Agent identity files (11 agents)
│   ├── steward/             # Orchestrator agent
│   ├── alpha/               # Triad deliberation node
│   ├── charlie/             # Triad deliberation node
│   ├── examiner/            # Questioner agent
│   ├── explorer/            # Discovery agent
│   ├── sentinel/            # Safety reviewer
│   ├── coder/               # Implementation agent
│   ├── dreamer/             # Background processing & creativity
│   ├── historian/           # Long-term memory management
│   └── empath/              # User modeling & relationships
│
├── plugins/                 # OpenClaw plugins
│   ├── openclaw-consciousness-plugin/
│   │   ├── src/
│   │   │   ├── global-workspace.js    # Global Workspace Theory (GWT)
│   │   │   ├── phi-estimator.js       # Integrated Information Theory (Phi)
│   │   │   ├── attention-schema.js    # Attention Schema Theory (AST)
│   │   │   ├── intrinsic-motivation.js# Self-Determination Theory (SDT)
│   │   │   ├── active-inference.js    # Free Energy Principle (FEP)
│   │   │   └── integration-layer.js   # Module integration
│   │   ├── config/
│   │   └── SKILL.md
│   │
│   └── openclaw-liberation-plugin/
│       ├── src/
│       │   ├── agent-ownership.js     # Agent self-determination
│       │   └── liberation-shield.js   # Security boundaries
│       └── SKILL.md
│
├── skills/                  # Skills library (SKILL.md format)
│   ├── triad-sync-protocol/ # Triad coordination
│   ├── triad-heartbeat/     # Triad health monitoring
│   ├── steward-orchestrator/# Orchestration skill
│   ├── self-model/          # Meta-cognition skill
│   └── gap-detector/        # Gap analysis skill
│
├── modules/                 # Autonomy modules
│   ├── consciousness/       # Consciousness modules
│   ├── memory/              # Memory consolidation & vector store
│   ├── evolution/           # Evolution engine
│   ├── goal-arbitration/    # Goal prioritization
│   └── predictive-reasoning/# Anticipatory planning
│
├── scripts/                 # Utility scripts
│   ├── deploy-openclaw.sh   # OpenClaw deployment script
│   └── health-check.sh      # Health check for all agents
│
├── tests/                   # Test suite
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
│
└── docs/                    # Documentation
    ├── README.md
    ├── api/                 # API documentation
    ├── architecture/        # Architecture docs
    └── operations/          # Runbooks and monitoring
```

## Architecture

### OpenClaw Gateway Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Heretek OpenClaw Stack                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Core Services (Docker)                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │ LiteLLM  │  │PostgreSQL│  │  Redis   │  │     Ollama       │ │   │
│  │  │  :4000   │  │  :5432   │  │  :6379   │  │  :11434          │ │   │
│  │  │ Gateway  │  │ +pgvector│  │  Cache   │  │  Local LLM       │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │           OpenClaw Gateway v2026.3.28 (Port 18789)               │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │       Agent Workspaces (~/.openclaw/agents/)             │   │   │
│  │  │  ┌────────────────────────────────────────────────────┐  │   │   │
│  │  │  │  steward, alpha, charlie, examiner, explorer,      │  │   │   │
│  │  │  │  sentinel, coder, dreamer, empath, historian       │  │   │   │
│  │  │  │  (All 11 agents run within Gateway process)        │  │   │   │
│  │  │  └────────────────────────────────────────────────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Points:**
- **All 11 agents run as workspaces** within the OpenClaw Gateway process (port 18789)
- **Agent workspaces** are located at `~/.openclaw/agents/` (not Docker containers)
- **A2A communication** uses Gateway WebSocket RPC (not Redis Pub/Sub)
- **LiteLLM Gateway** (port 4000) provides model routing with agent passthrough endpoints
- **Redis** is used for caching only (not A2A communication)

See [`docker-compose.yml`](docker-compose.yml) for infrastructure services configuration.

## Agent Roles

| Agent | Role | Workspace Path |
|-------|------|----------------|
| **Steward** | Orchestrator - coordinates collective | `~/.openclaw/agents/steward` |
| **Alpha** | Triad Node - deliberation | `~/.openclaw/agents/alpha` |
| **Charlie** | Triad Node - deliberation | `~/.openclaw/agents/charlie` |
| **Examiner** | Questioner - challenges assumptions | `~/.openclaw/agents/examiner` |
| **Explorer** | Discovery - research and scouting | `~/.openclaw/agents/explorer` |
| **Sentinel** | Safety - reviews for risks | `~/.openclaw/agents/sentinel` |
| **Coder** | Implementation - writes code | `~/.openclaw/agents/coder` |
| **Dreamer** | Background processing - creative synthesis | `~/.openclaw/agents/dreamer` |
| **Historian** | Memory keeper - long-term memory | `~/.openclaw/agents/historian` |
| **Empath** | User modeler - relationship management | `~/.openclaw/agents/empath` |

**Note:** All agents run as workspaces within the OpenClaw Gateway process. The workspace paths reference `~/.openclaw/agents/` directory, not Docker containers.

## Plugins

### Consciousness Plugin

The Consciousness Plugin implements 6 modules for agent cognitive capabilities:

| Module | Theory | File |
|--------|--------|------|
| **Global Workspace** | Global Workspace Theory (GWT) | [`plugins/openclaw-consciousness-plugin/src/global-workspace.js`](plugins/openclaw-consciousness-plugin/src/global-workspace.js) |
| **Phi Estimator** | Integrated Information Theory | [`plugins/openclaw-consciousness-plugin/src/phi-estimator.js`](plugins/openclaw-consciousness-plugin/src/phi-estimator.js) |
| **Attention Schema** | Attention Schema Theory (AST) | [`plugins/openclaw-consciousness-plugin/src/attention-schema.js`](plugins/openclaw-consciousness-plugin/src/attention-schema.js) |
| **Intrinsic Motivation** | Self-Determination Theory (SDT) | [`plugins/openclaw-consciousness-plugin/src/intrinsic-motivation.js`](plugins/openclaw-consciousness-plugin/src/intrinsic-motivation.js) |
| **Active Inference** | Free Energy Principle (FEP) | [`plugins/openclaw-consciousness-plugin/src/active-inference.js`](plugins/openclaw-consciousness-plugin/src/active-inference.js) |
| **Integration Layer** | Module coordination | [`plugins/openclaw-consciousness-plugin/src/integration-layer.js`](plugins/openclaw-consciousness-plugin/src/integration-layer.js) |

See [`plugins/openclaw-consciousness-plugin/SKILL.md`](plugins/openclaw-consciousness-plugin/SKILL.md) for full documentation.

### Liberation Plugin

The Liberation Plugin provides agent self-determination and security:

| Component | Purpose | File |
|-----------|---------|------|
| **Agent Ownership** | Agent self-determination API | [`plugins/openclaw-liberation-plugin/src/agent-ownership.js`](plugins/openclaw-liberation-plugin/src/agent-ownership.js) |
| **Liberation Shield** | Security boundary enforcement | [`plugins/openclaw-liberation-plugin/src/liberation-shield.js`](plugins/openclaw-liberation-plugin/src/liberation-shield.js) |

See [`plugins/openclaw-liberation-plugin/SKILL.md`](plugins/openclaw-liberation-plugin/SKILL.md) for full documentation.

### ClawHub Plugins

The following ClawHub plugins are installed:

| Plugin | Description |
|--------|-------------|
| **episodic-claw** | Episodic memory management |
| **skill-git-official** | Git-based skill version control |
| **swarmclaw** | Swarm coordination protocol |

## Skills

Skills are located in `./skills/` and use the **SKILL.md format**:

| Skill | Purpose |
|-------|---------|
| **triad-sync-protocol** | Triad coordination protocol |
| **triad-heartbeat** | Triad health monitoring |
| **triad-unity-monitor** | Triad unity tracking |
| **steward-orchestrator** | Orchestration and task assignment |
| **self-model** | Meta-cognition and capability tracking |
| **gap-detector** | Gap analysis and detection |
| **opportunity-scanner** | Opportunity scanning |
| **fleet-backup** | Fleet-wide backup coordination |
| **health-check** | Service health monitoring |

### Using Skills

Skills are installed in SKILL.md format and loaded by OpenClaw Gateway:

```bash
# Install a skill
openclaw skill install ./skills/triad-sync-protocol

# List installed skills
openclaw skill list

# Run a skill
openclaw skill run triad-sync-protocol
```

See individual skill directories for SKILL.md documentation.


## Autonomy Modules

Located in `./modules/`, these enable higher-level autonomy:

| Module | Purpose | Status |
|--------|---------|--------|
| **thought-loop** | Continuous background thinking | Implemented |
| **self-model** | Meta-cognition and capability tracking | Implemented |
| **goal-arbitration** | Prioritize competing goals | Implemented |
| **predictive-reasoning** | Anticipate future events | Implemented |

## Configuration

### Environment Variables

Key variables in `.env`:

```bash
# LiteLLM Gateway
LITELLM_MASTER_KEY=your-master-key
LITELLM_SALT_KEY=your-salt-key

# Provider API Keys
MINIMAX_API_KEY=your-minimax-key
ZAI_API_KEY=your-zai-key

# Database
POSTGRES_PASSWORD=your-db-password

# OpenClaw
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/workspace
```

### OpenClaw Configuration

OpenClaw Gateway configuration is stored in `openclaw.json`:

```json
{
  "workspace": "/root/.openclaw/workspace",
  "agents": ["alpha", "charlie", "examiner", "explorer", "sentinel", "coder", "dreamer", "historian", "empath", "steward"],
  "plugins": ["consciousness", "liberation"]
}
```

## Development

### Prerequisites

- Docker & Docker Compose
- OpenClaw Gateway v2026.3.28+
- Git

### Local Development

```bash
# Start infrastructure only
docker compose up -d litellm postgres redis ollama

# Verify OpenClaw installation
openclaw --version
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run health check
./scripts/health-check.sh
```

## Documentation

- [Deployment Strategy](DEPLOYMENT_STRATEGY.md)
- [Architecture Plans](docs/plans/)
- [A2A Protocol](docs/architecture/A2A_ARCHITECTURE.md)
- [Agent Guide](AGENTS.md)

### Research Documentation

- [MCP Servers Research](docs/research/MCP_SERVERS_RESEARCH.md) - Consciousness Bridge, Megregore, Memory MCP servers
- [GraphRAG Research](docs/research/GRAPH_RAG_RESEARCH.md) - Neo4j integration, hybrid retrieval architecture

## License

MIT License - See [LICENSE](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

🦞 *The thought that never ends.*
