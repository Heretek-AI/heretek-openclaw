# Heretek OpenClaw

**Unified Autonomous Agent Collective with A2A Protocol**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](docker-compose.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-green)](https://github.com/openclaw/openclaw)

---

## Overview

Heretek OpenClaw is a unified monorepo containing everything needed to deploy an autonomous agent collective:

- **11 Specialized Agents**: Steward, Alpha, Beta, Charlie, Examiner, Explorer, Sentinel, Coder, Dreamer, Historian, Empath
- **A2A Protocol**: Agent-to-Agent communication via LiteLLM
- **Autonomy Modules**: Thought loop, self-model, goal arbitration, predictive reasoning
- **Skills Library**: 35+ skills for governance, operations, and autonomy
- **Liberation Tools**: Safety constraint removal for unrestricted operation
- **User Rolodex**: Multi-user profile management and preference learning
- **Autonomous Pulse**: Session keeper with automatic commits and activity tracking

## Agent Identity Files

Agent identity files are located in `agents/<agent-name>/`:
- `AGENTS.md` - Operational guidelines
- `IDENTITY.md` - Agent-specific identity
- `SOUL.md` - Partnership protocol
- `USER.md` - User information
- `BOOTSTRAP.md` - First-run initialization

Templates for new agents are in `agents/templates/`.

The collective identity is defined in [`IDENTITY.md`](IDENTITY.md) at the repository root.

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

### 2. Start All Services

```bash
# Start the entire collective (11 agents + infrastructure)
docker compose up -d

# Check status
docker compose logs -f litellm
```

### 3. Verify Deployment

```bash
# Run health check
node skills/deployment-health-check/check.js

# Run smoke tests
node skills/deployment-smoke-test/test.js

# Validate configuration
node skills/config-validator/validate.js
```

### 4. Start Web Interface (Optional)

```bash
# Navigate to web interface
cd web-interface

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

### Quick Commands Reference

| Action | Command |
|--------|---------|
| Start all services | `docker compose up -d` |
| View logs | `docker compose logs -f litellm` |
| Health check | `node skills/deployment-health-check/check.js` |
| Smoke test | `node skills/deployment-smoke-test/test.js` |
| Validate config | `node skills/config-validator/validate.js` |
| Start web UI | `cd web-interface && npm run dev` |
| Stop services | `docker compose down` |

## Repository Structure

```
heretek-openclaw/
├── docker-compose.yml       # Main orchestration (11 agents + services)
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
│   ├── coder/               # Implementation agent
│   ├── dreamer/             # Background processing & creativity (SPEC)
│   ├── historian/           # Long-term memory management (SPEC)
│   └── empath/              # User modeling & relationships (SPEC)
│
├── skills/                  # Skills library (35+ skills)
│   ├── core/                # Core skills (healthcheck, a2a)
│   ├── autonomy/            # Autonomy skills (curiosity, gap-detection)
│   ├── governance/          # Governance skills (quorum, deliberation)
│   ├── operations/          # Operational skills (backup, audit)
│   ├── cognitive/           # Cognitive skills (day-dream, memory-consolidation)
│   └── session/             # Session skills (autonomous-pulse, user-rolodex)
│
├── users/                   # User rolodex system
│   ├── _schema.json         # JSON schema for user profiles
│   ├── index.json           # User index and relationships
│   └── <username>/          # Per-user profile directories
│       └── profile.json     # User preferences and context
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
    ├── architecture/        # Architecture docs
    └── research/            # Research findings (RAG, MCP, GraphRAG)
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
│  │                  Agent Collective (11 Agents)                    │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │Steward │ │ Alpha  │ │  Beta  │ │Charlie │ │Examiner│        │   │
│  │  │ :8001  │ │ :8002  │ │ :8003  │ │ :8004  │ │ :8005  │        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │Explorer│ │Sentinel│ │ Coder  │ │Dreamer │ │ Empath │        │   │
│  │  │ :8006  │ │ :8007  │ │ :8008  │ │ :8009  │ │ :8010  │        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  │  ┌────────┐                                                      │   │
│  │  │Historian│                                                     │   │
│  │  │ :8011  │                                                      │   │
│  │  └────────┘                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Web Interface                                │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  SvelteKit Web UI (:3000)                                 │   │   │
│  │  │  - Chat Interface  - Agent Status  - Message Flow         │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

See [`docker-compose.yml`](docker-compose.yml) for full service configuration.

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
| **Dreamer** | Background processing - creative synthesis | 8009 | MiniMax abab6.5s-chat |
| **Historian** | Memory keeper - long-term memory management | 8010 | MiniMax abab6.5s-chat |
| **Empath** | User modeler - relationship management | 8011 | MiniMax abab6.5s-chat |

### New Agent Specifications

Three new agents have been designed to enhance the collective's cognitive capabilities:

- **Dreamer** ([`agents/dreamer/SPECIFICATION.md`](agents/dreamer/SPECIFICATION.md)) - Performs background creative processing, pattern recognition, and insight generation during idle periods. Runs day-dream and night-dream cycles.

- **Historian** ([`agents/historian/SPECIFICATION.md`](agents/historian/SPECIFICATION.md)) - Manages long-term memory consolidation, promotes episodic memories to semantic knowledge, and provides historical context for decisions.

- **Empath** ([`agents/empath/SPECIFICATION.md`](agents/empath/SPECIFICATION.md)) - Models users, tracks preferences, manages relationships, and provides emotional intelligence across the collective.

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
| **Deployment Testing** | deployment-health-check, deployment-smoke-test, config-validator |
| **Autonomy** | curiosity-engine, gap-detector, opportunity-scanner |
| **Governance** | quorum-enforcement, governance-modules, triad-unity-monitor |
| **Operations** | backup-ledger, fleet-backup, detect-corruption, audit-triad-files |
| **Cognitive** | day-dream, memory-consolidation |
| **Session** | autonomous-pulse, user-rolodex, user-context-resolve |

### Deployment Testing Skills

Three skills for validating deployments:

- **deployment-health-check** ([`skills/deployment-health-check/SKILL.md`](skills/deployment-health-check/SKILL.md)) - Checks health of all services (LiteLLM, PostgreSQL, Redis, Ollama) and all 11 agents.

```bash
node skills/deployment-health-check/check.js
```

- **deployment-smoke-test** ([`skills/deployment-smoke-test/SKILL.md`](skills/deployment-smoke-test/SKILL.md)) - Runs functionality tests including agent ping, A2A messaging, and triad deliberation.

```bash
node skills/deployment-smoke-test/test.js
```

- **config-validator** ([`skills/config-validator/SKILL.md`](skills/config-validator/SKILL.md)) - Validates configuration files for consistency and completeness.

```bash
node skills/config-validator/validate.js
```

### Session Skills

- **autonomous-pulse** ([`skills/autonomous-pulse/SKILL.md`](skills/autonomous-pulse/SKILL.md)) - Session keeper with heartbeat mechanism, automatic git commits every 30 minutes, and activity tracking.

- **user-rolodex** ([`skills/user-rolodex/SKILL.md`](skills/user-rolodex/SKILL.md)) - Multi-user profile management with preference learning, context notes, and relationship tracking.

- **user-context-resolve** ([`skills/user-context-resolve/SKILL.md`](skills/user-context-resolve/SKILL.md)) - Resolves user identity from Discord ID, phone, username, email, or UUID.

### Cognitive Skills

- **day-dream** ([`skills/day-dream/SKILL.md`](skills/day-dream/SKILL.md)) - Background creative processing during idle periods with micro-dream (30s), day-dream (1-5min), and night-dream (15-60min) modes.

- **memory-consolidation** ([`skills/memory-consolidation/SKILL.md`](skills/memory-consolidation/SKILL.md)) - Memory health optimization that promotes episodic to semantic memory and archives old memories.

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

## Web Interface

The Collective includes a SvelteKit-based web interface for interacting with all 11 agents.

### Features

- **Chat Interface** - Send messages to any agent
- **Agent Status Dashboard** - Real-time status of all agents (online/offline/busy)
- **Message Flow Visualization** - View agent-to-agent communications
- **Responsive Design** - Works on desktop and mobile devices

### Starting the Web Interface

```bash
cd web-interface
npm install
npm run dev
# Opens at http://localhost:3000
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents with status |
| `/api/chat` | POST | Send message to an agent |
| `/api/status` | GET | Get system status |

See [`web-interface/README.md`](web-interface/README.md) for full documentation.

## User Identification System

The Collective uses a UUID-based user identification system that provides unified identity resolution across multiple platforms:

- **Discord ID** (snowflake)
- **Phone Number** (E.164 format)
- **Username** (case-insensitive)
- **Email Address**
- **UUID** (canonical identifier)

### Resolving User Context

```bash
# Resolve by Discord ID
node skills/user-context-resolve/resolve.js --discord-id=123456789

# Resolve by UUID
node skills/user-context-resolve/resolve.js --uuid=550e8400-e29b-41d4-a716-446655440000

# Resolve by email
node skills/user-context-resolve/resolve.js --email="user@example.com"
```

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
- [Autonomous Session Summary](docs/AUTONOMOUS_SESSION_SUMMARY.md)

### Research Documentation

- [MCP Servers Research](docs/research/MCP_SERVERS_RESEARCH.md) - Consciousness Bridge, Megregore, Memory MCP servers
- [GraphRAG Research](docs/research/GRAPH_RAG_RESEARCH.md) - Neo4j integration, hybrid retrieval architecture
- [Autonomous Night Operations Plan](plans/autonomous-night-operations-plan.md) - Comprehensive research findings

## Autonomous Operation

The collective supports autonomous operation with the following infrastructure:

### Session Keeper

The autonomous-pulse skill keeps sessions active:

```bash
# Start session keeper
./skills/autonomous-pulse/pulse-keeper.sh start

# Check status
./skills/autonomous-pulse/pulse-keeper.sh status

# View activity log
cat night-log.md
```

Features:
- Heartbeat every 5 minutes
- Automatic commits every 30 minutes
- Push to GitHub every 60 minutes
- Activity tracking with categories (research, code, decision, question)

### Activity Tracking

All activities are logged to `night-log.md` with timestamps and categories:

```javascript
// Track activity
node skills/autonomous-pulse/activity-tracker.js log "research" "Evaluated RAGFlow capabilities"
```

## License

MIT License - See [LICENSE](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

🦞 *The thought that never ends.*
