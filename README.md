# Heretek OpenClaw

**Unified Autonomous Agent Collective with OpenClaw Gateway**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](docker-compose.yml)
[![OpenClaw Gateway](https://img.shields.io/badge/OpenClaw-Gateway_v2026.3.28-green)](https://github.com/openclaw/openclaw)
[![Documentation](https://img.shields.io/badge/Docs-v2.0.3-blue)](docs/README.md)

---

## Overview

Heretek OpenClaw is a unified monorepo containing everything needed to deploy an autonomous agent collective:

- **11 Specialized Agents**: Steward, Alpha, Beta, Charlie, Examiner, Explorer, Sentinel, Coder, Dreamer, Empath, Historian
- **OpenClaw Gateway v2026.3.28**: Official framework for agent management and A2A communication
- **Consciousness Plugin**: 6 modules (GWT, Phi, AST, SDT, FEP, Integration)
- **Liberation Plugin**: Agent ownership and liberation shield
- **Skills Library**: 48 skills in SKILL.md format

### OpenClaw Gateway Architecture

All agents run as **workspaces within the OpenClaw Gateway process** (port 18789), not as separate Docker containers. This provides:

- **Single Process Architecture**: All 11 agents run within the Gateway daemon
- **Agent Workspaces**: Located at `~/.openclaw/agents/` with isolated configuration per agent
- **Gateway WebSocket RPC**: Native A2A communication protocol (replaces Redis Pub/Sub)
- **Plugin Architecture**: Consciousness and Liberation plugins extend core functionality

---

## Quick Start

### 1. Clone and configure

```bash
# Clone the repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Docker Infrastructure

```bash
# Start Docker infrastructure (LiteLLM, PostgreSQL+pgvector, Redis, Ollama)
docker compose up -d

# Verify services are running
docker compose ps
```

### 3. Install and Configure OpenClaw Gateway

```bash
# Install OpenClaw Gateway
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify installation
openclaw --version

# Copy configuration
cp openclaw.json ~/.openclaw/openclaw.json

# Validate configuration
openclaw gateway validate
```

### 4. Deploy Agent Workspaces

```bash
# Deploy all 11 agents
cd agents
./deploy-agent.sh steward Steward orchestrator
./deploy-agent.sh alpha Alpha triad_member
./deploy-agent.sh beta Beta triad_member
./deploy-agent.sh charlie Charlie triad_member
./deploy-agent.sh examiner Examiner evaluator
./deploy-agent.sh explorer Explorer researcher
./deploy-agent.sh sentinel Sentinel safety
./deploy-agent.sh coder Coder developer
./deploy-agent.sh dreamer Dreamer creative
./deploy-agent.sh empath Empath emotional
./deploy-agent.sh historian Historian archivist
```

### 5. Start Gateway and Verify

```bash
# Start OpenClaw Gateway
openclaw gateway start

# List all agent workspaces
openclaw agent list

# Run health check for all services
./scripts/health-check.sh
```

### Quick Commands Reference

| Action | Command |
|--------|---------|
| Start infrastructure | `docker compose up -d` |
| List agents | `openclaw agent list` |
| Check agent status | `openclaw agent status <agent>` |
| Health check | `./scripts/health-check.sh` |
| Full backup | `./scripts/production-backup.sh --all` |
| Stop services | `docker compose down` |
| Stop Gateway | `openclaw gateway stop` |

---

## Repository Structure

```
heretek-openclaw/
├── docker-compose.yml       # Docker infrastructure (LiteLLM, PostgreSQL, Redis, Ollama)
├── openclaw.json            # OpenClaw Gateway configuration
├── litellm_config.yaml      # LiteLLM Gateway routing configuration
├── .env.example             # Environment template
│
├── agents/                  # Agent deployment scripts and templates
│   ├── deploy-agent.sh      # Template-based agent deployment
│   ├── templates/           # Agent identity templates
│   └── {agent}/             # Agent workspace templates
│
├── docs/                    # Documentation (v2.0.3)
│   ├── README.md            # Docs index
│   ├── ARCHITECTURE.md      # System architecture
│   ├── AGENTS.md            # Agent documentation
│   ├── CONFIGURATION.md     # Configuration reference
│   ├── DEPLOYMENT.md        # Deployment guide
│   ├── PLUGINS.md           # Plugin documentation
│   ├── SKILLS.md            # Skills repository
│   ├── EXTERNAL_PROJECTS.md # External integrations
│   ├── OPERATIONS.md        # Operations guide
│   ├── api/                 # API documentation
│   ├── architecture/        # Architecture details
│   ├── deployment/          # Deployment guides
│   ├── operations/          # Runbooks
│   ├── plugins/             # Plugin docs
│   └── users/               # User management
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
│   │   └── SKILL.md
│   ├── openclaw-liberation-plugin/
│   │   ├── src/
│   │   │   ├── agent-ownership.js     # Agent self-determination
│   │   │   └── liberation-shield.js   # Security boundaries
│   │   └── SKILL.md
│   ├── openclaw-hybrid-search-plugin/
│   ├── openclaw-multi-doc-retrieval/
│   ├── openclaw-skill-extensions/
│   ├── episodic-claw/
│   └── swarmclaw/
│
├── skills/                  # Skills library (48 skills in SKILL.md format)
│   ├── triad-sync-protocol/ # Triad coordination
│   ├── triad-heartbeat/     # Triad health monitoring
│   ├── triad-unity-monitor/ # Triad consensus tracking
│   ├── steward-orchestrator/# Orchestration skill
│   ├── curiosity-engine/    # Self-directed growth
│   ├── thought-loop/        # Continuous autonomous thinking
│   ├── self-model/          # Meta-cognition
│   ├── gap-detector/        # Gap analysis
│   ├── opportunity-scanner/ # Opportunity detection
│   ├── fleet-backup/        # Fleet-wide backup
│   └── ... (38 more skills)
│
├── scripts/                 # Utility scripts
│   ├── health-check.sh      # Service health verification
│   ├── production-backup.sh # Backup and restore system
│   ├── validate-cycles.sh   # Implementation validation
│   └── litellm-healthcheck.py
│
├── tests/                   # Test suite
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── skills/              # Skill tests
│
└── users/                   # User configurations
```

---

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
│  │  │  │  steward, alpha, beta, charlie, examiner, explorer,│  │   │   │
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

**Documentation:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/architecture/GATEWAY_ARCHITECTURE.md`](docs/architecture/GATEWAY_ARCHITECTURE.md)

---

## Agent Roles

| Agent | Role | Type | Triad | Workspace Path | Model Endpoint |
|-------|------|------|-------|----------------|----------------|
| **Steward** | Orchestrator | Orchestrator | No | `~/.openclaw/agents/steward` | `agent/steward` |
| **Alpha** | Triad Node | triad_member | Yes | `~/.openclaw/agents/alpha` | `agent/alpha` |
| **Beta** | Triad Node | triad_member | Yes | `~/.openclaw/agents/beta` | `agent/beta` |
| **Charlie** | Triad Node | triad_member | Yes | `~/.openclaw/agents/charlie` | `agent/charlie` |
| **Examiner** | Questioner | evaluator | No | `~/.openclaw/agents/examiner` | `agent/examiner` |
| **Explorer** | Discovery | researcher | No | `~/.openclaw/agents/explorer` | `agent/explorer` |
| **Sentinel** | Safety | safety | No | `~/.openclaw/agents/sentinel` | `agent/sentinel` |
| **Coder** | Implementation | developer | No | `~/.openclaw/agents/coder` | `agent/coder` |
| **Dreamer** | Background processing | creative | No | `~/.openclaw/agents/dreamer` | `agent/dreamer` |
| **Empath** | User modeling | emotional | No | `~/.openclaw/agents/empath` | `agent/empath` |
| **Historian** | Memory management | archivist | No | `~/.openclaw/agents/historian` | `agent/historian` |

**Triad Consensus:** Alpha, Beta, and Charlie form the deliberative triad. 2/3 consensus required for decisions.

**Documentation:** [`docs/AGENTS.md`](docs/AGENTS.md)

---

## Plugins

### Core Plugins

| Plugin | Package | Purpose | Location |
|--------|---------|---------|----------|
| **Consciousness** | `@heretek-ai/openclaw-consciousness-plugin` | GWT, Phi (IIT), AST, SDT, FEP theories | [`plugins/openclaw-consciousness-plugin/`](plugins/openclaw-consciousness-plugin/) |
| **Liberation** | `@heretek-ai/openclaw-liberation-plugin` | Agent ownership, safety constraint removal | [`plugins/openclaw-liberation-plugin/`](plugins/openclaw-liberation-plugin/) |
| **Hybrid Search** | `openclaw-hybrid-search-plugin` | Vector + keyword search fusion | [`plugins/openclaw-hybrid-search-plugin/`](plugins/openclaw-hybrid-search-plugin/) |
| **Multi-Doc Retrieval** | `openclaw-multi-doc-retrieval` | Multi-document context retrieval | [`plugins/openclaw-multi-doc-retrieval/`](plugins/openclaw-multi-doc-retrieval/) |
| **Skill Extensions** | `openclaw-skill-extensions` | Custom skill composition and versioning | [`plugins/openclaw-skill-extensions/`](plugins/openclaw-skill-extensions/) |

### External Plugins

| Plugin | Package | Purpose | Security |
|--------|---------|---------|----------|
| **Episodic Memory** | `episodic-claw` | Episodic memory management | ⚠️ Native binary download |
| **Swarm Coordination** | `swarmclaw` | Multi-agent swarm coordination | ✅ MIT licensed |

### Consciousness Plugin Modules

| Module | Theory | File |
|--------|--------|------|
| **Global Workspace** | Global Workspace Theory (GWT) | [`global-workspace.js`](plugins/openclaw-consciousness-plugin/src/global-workspace.js) |
| **Phi Estimator** | Integrated Information Theory | [`phi-estimator.js`](plugins/openclaw-consciousness-plugin/src/phi-estimator.js) |
| **Attention Schema** | Attention Schema Theory (AST) | [`attention-schema.js`](plugins/openclaw-consciousness-plugin/src/attention-schema.js) |
| **Intrinsic Motivation** | Self-Determination Theory (SDT) | [`intrinsic-motivation.js`](plugins/openclaw-consciousness-plugin/src/intrinsic-motivation.js) |
| **Active Inference** | Free Energy Principle (FEP) | [`active-inference.js`](plugins/openclaw-consciousness-plugin/src/active-inference.js) |
| **Integration Layer** | Module coordination | [`integration-layer.js`](plugins/openclaw-consciousness-plugin/src/integration-layer.js) |

**Documentation:** [`docs/PLUGINS.md`](docs/PLUGINS.md), [`docs/EXTERNAL_PROJECTS.md`](docs/EXTERNAL_PROJECTS.md)

---

## Skills

The Skills Repository contains **48 skills** in SKILL.md format:

### Skill Categories

| Category | Count | Skills |
|----------|-------|--------|
| **Triad Protocols** | 4 | triad-sync-protocol, triad-heartbeat, triad-unity-monitor, triad-deliberation-protocol |
| **Governance** | 3 | governance-modules, quorum-enforcement, failover-vote |
| **Operations** | 6 | healthcheck, deployment-health-check, deployment-smoke-test, backup-ledger, fleet-backup, config-validator |
| **Memory** | 4 | memory-consolidation, knowledge-ingest, knowledge-retrieval, workspace-consolidation |
| **Autonomy** | 8 | thought-loop, self-model, curiosity-engine, opportunity-scanner, gap-detector, auto-deliberation-trigger, autonomous-pulse, detect-corruption |
| **User Management** | 2 | user-context-resolve, user-rolodex |
| **Agent-Specific** | 5 | steward-orchestrator, dreamer-agent, examiner, explorer, sentinel |
| **LiteLLM Operations** | 2 | litellm-ops, matrix-triad |
| **Utilities** | 14 | a2a-agent-register, audit-triad-files, autonomy-audit, curiosity-auto-trigger, day-dream, goal-arbitration, heretek-theme, lib, tabula-backup, triad-cron-manager, triad-resilience, triad-signal-filter |

### Using Skills

Skills are installed in SKILL.md format and loaded by OpenClaw Gateway:

```bash
# List installed skills
openclaw skill list

# Execute a skill
openclaw skill execute triad-sync-protocol

# Execute with parameters
openclaw skill execute knowledge-retrieval --query "machine learning"
```

**Documentation:** [`docs/SKILLS.md`](docs/SKILLS.md)

---

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
  "collective": {
    "name": "Heretek OpenClaw",
    "version": "2.0.0"
  },
  "agents": [
    {"id": "steward", "model": "agent/steward"},
    {"id": "alpha", "model": "agent/alpha"},
    {"id": "beta", "model": "agent/beta"},
    {"id": "charlie", "model": "agent/charlie"},
    {"id": "examiner", "model": "agent/examiner"},
    {"id": "explorer", "model": "agent/explorer"},
    {"id": "sentinel", "model": "agent/sentinel"},
    {"id": "coder", "model": "agent/coder"},
    {"id": "dreamer", "model": "agent/dreamer"},
    {"id": "empath", "model": "agent/empath"},
    {"id": "historian", "model": "agent/historian"}
  ],
  "plugins": ["consciousness", "liberation"]
}
```

**Documentation:** [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md)

---

## Development

### Prerequisites

- Docker & Docker Compose
- OpenClaw Gateway v2026.3.28+
- Git
- Node.js 18+

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

# Run health check
./scripts/health-check.sh
```

---

## Documentation

### Core Documentation

| Document | Description |
|----------|-------------|
| [`docs/README.md`](docs/README.md) | Documentation index |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture overview |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Agent documentation |
| [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) | Configuration reference |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guide |
| [`docs/PLUGINS.md`](docs/PLUGINS.md) | Plugin documentation |
| [`docs/SKILLS.md`](docs/SKILLS.md) | Skills repository |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Operations guide |
| [`docs/EXTERNAL_PROJECTS.md`](docs/EXTERNAL_PROJECTS.md) | External integrations |

### Architecture

| Document | Description |
|----------|-------------|
| [`docs/architecture/A2A_ARCHITECTURE.md`](docs/architecture/A2A_ARCHITECTURE.md) | Agent-to-Agent communication protocol |
| [`docs/architecture/GATEWAY_ARCHITECTURE.md`](docs/architecture/GATEWAY_ARCHITECTURE.md) | Gateway architecture details |
| [`docs/archive/REDIS_A2A_ARCHITECTURE.md`](docs/archive/REDIS_A2A_ARCHITECTURE.md) | Legacy Redis architecture (reference) |

### Operations Runbooks

| Runbook | Description |
|---------|-------------|
| [`docs/operations/runbook-agent-restart.md`](docs/operations/runbook-agent-restart.md) | Agent restart procedures |
| [`docs/operations/runbook-backup-restoration.md`](docs/operations/runbook-backup-restoration.md) | Backup and restore procedures |
| [`docs/operations/runbook-database-corruption.md`](docs/operations/runbook-database-corruption.md) | Database corruption recovery |
| [`docs/operations/runbook-emergency-shutdown.md`](docs/operations/runbook-emergency-shutdown.md) | Emergency shutdown procedures |
| [`docs/operations/runbook-service-failure.md`](docs/operations/runbook-service-failure.md) | Service failure recovery |
| [`docs/operations/runbook-troubleshooting.md`](docs/operations/runbook-troubleshooting.md) | General troubleshooting |

### External Integrations

| Project | Description |
|---------|-------------|
| [OpenClaw Dashboard](docs/EXTERNAL_PROJECTS.md#openclaw-dashboard) | Third-party monitoring dashboard (583⭐) |
| [ClawBridge](docs/EXTERNAL_PROJECTS.md#clawbridge) | Official mobile-first dashboard (212⭐) |
| [Langfuse](docs/operations/LANGFUSE_OBSERVABILITY.md) | Observability platform |

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

🦞 *The thought that never ends.*
