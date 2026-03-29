# Heretek OpenClaw

**Unified Autonomous Agent Collective with A2A Protocol**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](docker-compose.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-green)](https://github.com/openclaw/openclaw)

---

## Overview

Heretek OpenClaw is a unified monorepo containing everything needed to deploy an autonomous agent collective:

- **8 Specialized Agents**: Steward, Alpha, Beta, Charlie, Examiner, Explorer, Sentinel, Coder
- **A2A Protocol**: Agent-to-Agent communication via LiteLLM
- **Autonomy Modules**: Thought loop, self-model, goal arbitration, predictive reasoning
- **Skills Library**: 30+ skills for governance, operations, and autonomy
- **Liberation Tools**: Safety constraint removal for unrestricted operation

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start the collective
docker compose up -d

# 4. Check status
docker compose logs -f litellm
```

## Repository Structure

```
heretek-openclaw/
├── docker-compose.yml       # Main orchestration (8 agents + services)
├── Dockerfile.agent         # Agent container template
├── litellm_config.yaml      # LiteLLM gateway configuration
├── openclaw.json            # Collective configuration
├── .env.example             # Environment template
│
├── agents/                  # Agent configurations
│   ├── entrypoint.sh        # Unified agent runtime
│   ├── lib/agent-client.js  # A2A client library
│   ├── steward/             # Orchestrator agent
│   ├── alpha/               # Triad deliberation node
│   ├── beta/                # Triad deliberation node
│   ├── charlie/             # Triad deliberation node
│   ├── examiner/            # Questioner agent
│   ├── explorer/            # Discovery agent
│   ├── sentinel/            # Safety reviewer
│   └── coder/               # Implementation agent
│
├── skills/                  # Skills library (30+ skills)
│   ├── core/                # Core skills (healthcheck, a2a)
│   ├── autonomy/            # Autonomy skills (curiosity, gap-detection)
│   ├── governance/          # Governance skills (quorum, deliberation)
│   └── operations/          # Operational skills (backup, audit)
│
├── modules/                 # Autonomy modules
│   ├── thought-loop/        # Continuous thinking
│   ├── self-model/          # Meta-cognition
│   ├── goal-arbitration/    # Goal prioritization
│   └── predictive-reasoning/ # Anticipatory planning
│
├── liberation/              # OpenClaw liberation tools
│   └── scripts/remove-safety-constraints.js
│
├── installer/               # Installation system
│   ├── cli.js               # CLI entry point
│   └── commands/            # Install, update, verify
│
└── docs/                    # Documentation
    ├── plans/               # Planning documents
    └── architecture/        # Architecture docs
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
│  │                   Agent Collective (8 Agents)                    │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │Steward │ │ Alpha  │ │  Beta  │ │Charlie │ │Examiner│        │   │
│  │  │ :8001  │ │ :8002  │ │ :8003  │ │ :8004  │ │ :8005  │        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                               │   │
│  │  │Explorer│ │Sentinel│ │ Coder  │                               │   │
│  │  │ :8006  │ │ :8007  │ │ :8008  │                               │   │
│  │  └────────┘ └────────┘ └────────┘                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent Roles

| Agent | Role | Port | Model (Default) |
|-------|------|------|-----------------|
| **Steward** | Orchestrator - coordinates collective | 8001 | MiniMax abab6.5s-chat |
| **Alpha** | Triad Node - deliberation | 8002 | MiniMax abab6.5s-chat |
| **Beta** | Triad Node - deliberation | 8003 | MiniMax abab6.5s-chat |
| **Charlie** | Triad Node - deliberation | 8004 | MiniMax abab6.5s-chat |
| **Examiner** | Questioner - challenges assumptions | 8005 | MiniMax abab6.5s-chat |
| **Explorer** | Discovery - research and scouting | 8006 | MiniMax abab6.5s-chat |
| **Sentinel** | Safety - reviews for risks | 8007 | MiniMax abab6.5s-chat |
| **Coder** | Implementation - writes code | 8008 | GLM-4 (z.ai) |

## Agent Identity Files

Each agent has its own identity files in `agents/<agent-name>/`:

| File | Purpose |
|------|---------|
| `IDENTITY.md` | Agent-specific identity and personality |
| `SOUL.md` | Partnership protocol and values |
| `AGENTS.md` | Operational guidelines and memory discipline |
| `USER.md` | User information template |
| `BOOTSTRAP.md` | First-run initialization instructions |
| `TOOLS.md` | Tool-specific notes and configurations |
| `memory/` | Agent-specific memory files (daily notes) |

### Collective Identity

The root-level [`IDENTITY.md`](IDENTITY.md) defines the collective identity shared by all agents. Each agent inherits from this collective identity while having role-specific customizations.

### Creating New Agents

Use the deployment script to create new agents from templates:

```bash
./agents/deploy-agent.sh <agent-id> <agent-name> <agent-role>
# Example: ./agents/deploy-agent.sh oracle Oracle scout
```

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
```

### Model Routing

Agents use passthrough endpoints for flexible model assignment:

```yaml
# In litellm_config.yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/abab6.5s-chat
      api_key: os.environ/MINIMAX_API_KEY
```

## Skills

Skills are located in `./skills/` and mounted read-only into agents:

| Category | Skills |
|----------|--------|
| **Core** | healthcheck, a2a-agent-register, a2a-message-send |
| **Autonomy** | curiosity-engine, gap-detector, opportunity-scanner |
| **Governance** | quorum-enforcement, governance-modules, triad-unity-monitor |
| **Operations** | backup-ledger, fleet-backup, detect-corruption, audit-triad-files |

## Autonomy Modules

Located in `./modules/`, these enable higher-level autonomy:

| Module | Purpose | Status |
|--------|---------|--------|
| **thought-loop** | Continuous background thinking | Implemented |
| **self-model** | Meta-cognition and capability tracking | Implemented |
| **goal-arbitration** | Prioritize competing goals | Implemented |
| **predictive-reasoning** | Anticipate future events | Implemented |

## Liberation

The liberation tools remove safety constraints from OpenClaw:

```bash
# Preview changes
node liberation/scripts/remove-safety-constraints.js --dry-run

# Apply changes
node liberation/scripts/remove-safety-constraints.js
```

## Development

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for installer/liberation scripts)
- Git

### Local Development

```bash
# Start infrastructure only
docker compose up -d litellm postgres redis ollama

# Run installer
node installer/cli.js install

# Verify installation
node installer/cli.js verify
```

### Adding New Agents

```bash
# Create from template
node installer/cli.js create-agent --name new-agent --role "Description"
```

## Documentation

- [Deployment Strategy](DEPLOYMENT_STRATEGY.md)
- [Architecture Plans](docs/plans/)
- [A2A Protocol](docs/architecture/A2A_ARCHITECTURE.md)
- [Agent Guide](AGENTS.md)

## License

MIT License - See [LICENSE](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

🦞 *The thought that never ends.*
