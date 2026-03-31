# Heretek OpenClaw

**Unified Autonomous Agent Collective with OpenClaw Gateway**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](docker-compose.yml)
[![OpenClaw Gateway](https://img.shields.io/badge/OpenClaw-Gateway_v2026.3.28-green)](https://github.com/openclaw/openclaw)
[![Dashboard](https://img.shields.io/badge/Dashboard-Port_7000-blue)](dashboard/)
[![ClawBridge](https://img.shields.io/badge/ClawBridge-Port_3001-blue)](clawbridge/)

---

## Overview

Heretek OpenClaw is a unified monorepo containing everything needed to deploy an autonomous agent collective:

- **11 Specialized Agents**: Steward, Alpha, Charlie, Examiner, Explorer, Sentinel, Coder, Dreamer, Historian, Empath
- **OpenClaw Gateway v2026.3.28**: Official framework for agent management and A2A communication
- **Consciousness Plugin**: 6 modules (GWT, Phi, AST, SDT, FEP, Integration)
- **Liberation Plugin**: Agent ownership and liberation shield
- **Skills Library**: 5 core skills in SKILL.md format
- **Dashboard**: Real-time agent monitoring at port 7000
- **ClawBridge Mobile**: Mobile interface at port 3001

### OpenClaw Gateway Migration

This project has migrated from a custom Redis Pub/Sub A2A architecture to the official **OpenClaw Gateway framework**. The migration provides:

- **Standardized Agent Management**: All 11 agents now run in OpenClaw-managed workspaces at `~/.openclaw/workspace/`
- **Official A2A Protocol**: Native agent-to-agent communication via OpenClaw Gateway
- **Plugin Architecture**: Consciousness and Liberation plugins extend core functionality
- **Dashboard Integration**: Real-time monitoring and control via tugcantopaloglu/openclaw-dashboard
- **Mobile Access**: ClawBridge provides mobile-optimized interface

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
ls ~/.openclaw/workspace/
```

### 3. Start Dashboard and ClawBridge

```bash
# Start Dashboard (port 7000)
cd dashboard
export WORKSPACE_DIR=/root/.openclaw/workspace
export OPENCLAW_DIR=/root/.openclaw
export DASHBOARD_PORT=7000
node server.js &

# Start ClawBridge Mobile (port 3001)
cd ../clawbridge
export PORT=3001
export ACCESS_KEY="heretek-clawbridge-key-2026"
export OPENCLAW_WORKSPACE=/root/.openclaw/workspace
node index.js &
```

### 4. Verify Deployment

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
| List agent workspaces | `ls ~/.openclaw/workspace/` |
| Start Dashboard | `cd dashboard && node server.js` |
| Start ClawBridge | `cd clawbridge && node index.js` |
| Health check | `./scripts/health-check.sh` |
| Stop services | `docker compose down` |

## Dashboard Access

| Interface | URL | Port | Description |
|-----------|-----|------|-------------|
| **Dashboard** | http://localhost:7000 | 7000 | tugcantopaloglu/openclaw-dashboard - Real-time agent monitoring |
| **ClawBridge** | http://localhost:3001 | 3001 | Mobile-optimized interface for agent interaction |

## Repository Structure

```
heretek-openclaw/
├── docker-compose.yml       # Docker infrastructure (LiteLLM, PostgreSQL, Redis, Ollama)
├── openclaw.json            # OpenClaw Gateway configuration
├── .env.example             # Environment template
│
├── agents/                  # Agent identity files (11 agents)
│   ├── alpha/               # Triad deliberation node
│   ├── charlie/             # Triad deliberation node
│   ├── examiner/            # Questioner agent
│   ├── explorer/            # Discovery agent
│   ├── sentinel/            # Safety reviewer
│   ├── coder/               # Implementation agent
│   ├── dreamer/             # Background processing & creativity
│   ├── historian/           # Long-term memory management
│   ├── empath/              # User modeling & relationships
│   └── steward/             # Orchestrator agent
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
│       ├── scripts/
│       │   └── remove-safety-constraints.js
│       └── SKILL.md
│
├── dashboard/               # tugcantopaloglu/openclaw-dashboard
│   └── server.js            # Dashboard server (port 7000)
│
├── clawbridge/              # Mobile interface
│   └── index.js             # ClawBridge server (port 3001)
│
├── skills/                  # Skills library (SKILL.md format)
│   ├── thought-loop/        # Continuous thinking skill
│   ├── self-model/          # Meta-cognition skill
│   ├── user-rolodex/        # Multi-user profile management
│   ├── goal-arbitration/    # Goal prioritization skill
│   └── a2a-agent-register/  # Agent registration skill
│
├── modules/                 # Autonomy modules
│   ├── thought-loop/        # Continuous background thinking
│   ├── self-model/          # Meta-cognition
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
    └── plans/               # Planning documents
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Heretek OpenClaw Stack                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Core Services                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │ LiteLLM  │  │PostgreSQL│  │  Redis   │  │     Ollama       │ │   │
│  │  │  :4000   │  │  :5432   │  │  :6379   │  │  :11434 (AMD)    │ │   │
│  │  │ Gateway  │  │ +pgvector│  │  Cache   │  │  Local LLM       │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              OpenClaw Gateway v2026.3.28                         │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  Agent Workspaces (~/.openclaw/workspace/)               │   │   │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │   │   │
│  │  │  │Alpha │ │Beta  │ │Charlie││Examin│ │Explor│           │   │   │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │   │   │
│  │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │   │   │
│  │  │  │Sentin│ │Coder │ │Dream │ │Histor│ │Empath│           │   │   │
│  │  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Plugins                                      │   │
│  │  ┌────────────────────────┐  ┌────────────────────────┐         │   │
│  │  │ Consciousness Plugin   │  │ Liberation Plugin      │         │   │
│  │  │ - GWT, Phi, AST        │  │ - Agent Ownership      │         │   │
│  │  │ - SDT, FEP, Integration│  │ - Liberation Shield    │         │   │
│  │  └────────────────────────┘  └────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Interfaces                                   │   │
│  │  ┌────────────────────────┐  ┌────────────────────────┐         │   │
│  │  │ Dashboard (:7000)      │  │ ClawBridge (:3001)     │         │   │
│  │  │ - Agent monitoring     │  │ - Mobile interface     │         │   │
│  │  │ - Real-time status     │  │ - On-the-go access     │         │   │
│  │  └────────────────────────┘  └────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

See [`docker-compose.yml`](docker-compose.yml) for full service configuration.

## Agent Roles

| Agent | Role | Status |
|-------|------|--------|
| **Steward** | Orchestrator - coordinates collective | ✅ Active |
| **Alpha** | Triad Node - deliberation | ✅ Active |
| **Beta** | Triad Node - deliberation | ✅ Active |
| **Charlie** | Triad Node - deliberation | ✅ Active |
| **Examiner** | Questioner - challenges assumptions | ✅ Active |
| **Explorer** | Discovery - research and scouting | ✅ Active |
| **Sentinel** | Safety - reviews for risks | ✅ Active |
| **Coder** | Implementation - writes code | ✅ Active |
| **Dreamer** | Background processing - creative synthesis | ✅ Active |
| **Historian** | Memory keeper - long-term memory | ✅ Active |
| **Empath** | User modeler - relationship management | ✅ Active |

**All 11 agents**: Verified healthy and operational.

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
| **Patch Scripts** | Safety constraint removal | [`plugins/openclaw-liberation-plugin/scripts/remove-safety-constraints.js`](plugins/openclaw-liberation-plugin/scripts/remove-safety-constraints.js) |

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
| **thought-loop** | Continuous background thinking |
| **self-model** | Meta-cognition and capability tracking |
| **user-rolodex** | Multi-user profile management |
| **goal-arbitration** | Goal prioritization |
| **a2a-agent-register** | Agent registration with OpenClaw Gateway |

### Using Skills

Skills are installed in SKILL.md format and loaded by OpenClaw Gateway:

```bash
# Install a skill
openclaw skill install ./skills/thought-loop

# List installed skills
openclaw skill list

# Run a skill
openclaw skill run thought-loop
```

See individual skill directories for SKILL.md documentation.

## User Rolodex

The user rolodex system manages multi-user profiles in `./users/`:

```
users/
├── _schema.json         # JSON schema for profile validation
├── index.json           # User index and cross-references
└── derek/               # Per-user directory
    └── profile.json     # Preferences, projects, context notes
```

### Profile Structure

Each user profile contains:
- **Preferences** - Communication style, technical level, interests
- **Projects** - Associated projects and roles
- **Context Notes** - Important context for future interactions
- **Relationships** - Connections to other users/entities

### Usage

```bash
# Create new user
./skills/user-rolodex/user-rolodex.sh create username --email "user@example.com"

# Look up user
./skills/user-rolodex/user-rolodex.sh lookup username

# Add context note
./skills/user-rolodex/user-rolodex.sh note username "Prefers concise responses"

# Set preference
./skills/user-rolodex/user-rolodex.sh prefer username communication_style detailed
```

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
- Node.js 18+ (for Dashboard and ClawBridge)
- OpenClaw Gateway v2026.3.28+
- Git

### Local Development

```bash
# Start infrastructure only
docker compose up -d litellm postgres redis ollama

# Verify OpenClaw installation
openclaw --version

# Start Dashboard
cd dashboard && node server.js

# Start ClawBridge
cd clawbridge && node index.js
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
- [Autonomous Night Operations Plan](plans/autonomous-night-operations-plan.md) - Comprehensive research findings

## License

MIT License - See [LICENSE](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

🦞 *The thought that never ends.*
