# DEPLOYMENT & REPLICATION GUIDE

## Purpose

This document ensures Heretek OpenClaw can be **redeployed and replicated** on any infrastructure. It clearly separates:

1. **External Dependencies** - What we install but don't control (OpenClaw Gateway, third-party services)
2. **Internal Configuration** - What we configure in our repo (agent workspaces, plugins, skills)
3. **Heretek Plugins** - What we build and maintain (consciousness, liberation, triad)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL (Not in Repo)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  OpenClaw Gateway (installed via curl script)                           │
│    └── ~/.openclaw/                                                     │
│        ├── gateway/           # Gateway daemon                          │
│        ├── workspaces/        # Per-agent workspaces (WE CONFIGURE)     │
│        ├── skills/            # Skills (WE ADD OURS)                    │
│        └── plugins/           # Plugins (WE ADD OURS)                   │
├─────────────────────────────────────────────────────────────────────────┤
│  LiteLLM Gateway (docker container)                                     │
│    └── litellm_config.yaml (WE CONFIGURE)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL + pgvector (docker container)                               │
│    └── init/ (WE PROVIDE SCHEMA)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Redis (docker container)                                               │
│    └── Used for caching, not A2A (OpenClaw uses WebSocket RPC)          │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    REPO CONFIGURATION (In Git)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  openclaw.json              # Gateway configuration template            │
│  litellm_config.yaml        # LiteLLM routing configuration             │
│  docker-compose.yml         # Infrastructure containers                 │
│  init/                      # Database initialization scripts           │
│  agents/                    # Agent identity templates                  │
│  skills/                    # Heretek skills (SKILL.md format)          │
│  plugins/                   # Heretek plugins                           │
│  docs/                      # All documentation                         │
│  plans/                     # All planning documents                    │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    HERETEK PLUGINS (In Git, Built by Us)                │
├─────────────────────────────────────────────────────────────────────────┤
│  @heretek-ai/openclaw-consciousness-plugin    # GWT, Phi, AST           │
│  @heretek-ai/openclaw-liberation-plugin       # Agent ownership         │
│  @heretek-ai/openclaw-triad-skill             # Consensus voting        │
│  @heretek-ai/openclaw-thought-loop-skill      # Thought generation      │
│  @heretek-ai/openclaw-self-model-skill        # Meta-cognition          │
│  @heretek-ai/openclaw-user-rolodex-skill      # User management         │
│  @heretek-ai/openclaw-goal-arbitration-skill  # Goal arbitration        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: External Dependencies (Install First)

### 1.1 Install OpenClaw Gateway

**This is external - not in our repo. Document what we do AFTER installation.**

```bash
# Step 1: Install OpenClaw Gateway (external script)
curl -fsSL https://openclaw.ai/install.sh | bash

# Step 2: Initialize daemon
openclaw onboard --install-daemon

# Step 3: Verify installation
openclaw gateway status
```

**What this does:**
- Creates `~/.openclaw/` directory
- Installs Gateway daemon
- Sets up default configuration
- Creates initial workspace structure

**Post-Installation (Our Configuration):**
After installation, we configure:
1. Copy our `openclaw.json` to `~/.openclaw/openclaw.json`
2. Create agent workspaces from templates
3. Install Heretek plugins and skills
4. Configure agent bindings

---

### 1.2 Deploy Infrastructure (Docker Compose)

**This IS in our repo - we control it.**

```bash
# Clone our repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Deploy infrastructure
docker compose up -d

# Verify services
docker compose ps
```

**Services deployed:**
| Service | Port | Purpose | Config Location |
|---------|------|---------|-----------------|
| `litellm` | 4000 | Model routing | `litellm_config.yaml` |
| `postgres` | 5432 | Vector database | `init/pgvector-init.sql` |
| `redis` | 6379 | Caching | docker-compose.yml |
| `ollama` | 11434 | Local embeddings | docker-compose.yml |

---

### 1.3 Configure LiteLLM

**This IS in our repo - we control it.**

```bash
# Copy our LiteLLM configuration
cp litellm_config.yaml ~/.litellm/litellm_config.yaml

# Restart LiteLLM to pick up config
docker compose restart litellm

# Verify endpoints
curl http://localhost:4000/v1/models
```

**What our config provides:**
- Per-agent passthrough endpoints (`/agent/steward`, `/agent/alpha`, etc.)
- MiniMax primary with z.ai failover
- A2A protocol settings (task handoff, streaming, agent discovery)
- Budget settings per agent
- Observability (Prometheus, Langfuse, OpenTelemetry)

---

## Phase 2: Repository Configuration (Our Stuff)

### 2.1 Configure OpenClaw Gateway

**Configuration file in repo:** `openclaw.json`

```bash
# Copy our configuration
cp openclaw.json ~/.openclaw/openclaw.json

# Validate configuration
openclaw gateway validate
```

**What our config defines:**
- 11 agent definitions with roles and capabilities
- Model routing aliases
- A2A protocol endpoints
- Memory configuration (pgvector, postgres, redis)
- Skills repository path

---

### 2.2 Create Agent Workspaces

**Templates in repo:** `agents/` directory

Each agent has identity files that get copied to `~/.openclaw/workspaces/{agent}/`:

```bash
# Run agent creation script
./agents/deploy-agent.sh steward orchestrator
./agents/deploy-agent.sh alpha triad
./agents/deploy-agent.sh beta triad
./agents/deploy-agent.sh charlie triad
./agents/deploy-agent.sh examiner interrogator
./agents/deploy-agent.sh explorer scout
./agents/deploy-agent.sh sentinel guardian
./agents/deploy-agent.sh coder artisan
./agents/deploy-agent.sh dreamer visionary
./agents/deploy-agent.sh empath diplomat
./agents/deploy-agent.sh historian archivist
```

**Identity files per agent:**
- `SOUL.md` - Partnership protocol, core nature
- `IDENTITY.md` - Personality matrix, behavioral traits
- `AGENTS.md` - Operational guidance, liberation principles
- `USER.md` - Human partner context
- `TOOLS.md` - Tool usage notes
- `MEMORY.md` - Curated long-term memory

---

### 2.3 Install Heretek Plugins

**Plugins directory in repo:** `plugins/`

```bash
# Install consciousness plugin
cd plugins/openclaw-consciousness-plugin
npm install
npm link
openclaw plugins install @heretek-ai/openclaw-consciousness-plugin

# Install liberation plugin
cd plugins/openclaw-liberation-plugin
npm install
npm link
openclaw plugins install @heretek-ai/openclaw-liberation-plugin

# Verify plugins
openclaw plugins list
```

**Heretek Plugins:**
| Plugin | Purpose | Location |
|--------|---------|----------|
| `openclaw-consciousness-plugin` | GWT, Phi Estimator, AST, Intrinsic Motivation | `plugins/` |
| `openclaw-liberation-plugin` | Agent ownership, safety constraint removal | `plugins/` |

---

### 2.4 Install Heretek Skills

**Skills directory in repo:** `skills/`

```bash
# Install triad skill
cd skills/triad-consensus
openclaw skills install ./SKILL.md

# Install thought loop skill
cd skills/thought-loop
openclaw skills install ./SKILL.md

# Install self-model skill
cd skills/self-model
openclaw skills install ./SKILL.md

# Install user rolodex skill
cd skills/user-rolodex
openclaw skills install ./SKILL.md

# Install goal arbitration skill
cd skills/goal-arbitration
openclaw skills install ./SKILL.md

# Verify skills
openclaw skills list
```

**Heretek Skills:**
| Skill | Purpose | Location |
|-------|---------|----------|
| `triad-consensus` | Phi-weighted consensus voting | `skills/` |
| `thought-loop` | Structured thought generation | `skills/` |
| `self-model` | Meta-cognitive awareness | `skills/` |
| `user-rolodex` | Multi-platform user management | `skills/` |
| `goal-arbitration` | Multi-source goal management | `skills/` |

---

### 2.5 Install ClawHub Plugins (Optional)

**Third-party plugins - documented but not in repo.**

```bash
# Install episodic memory plugin
openclaw plugins install episodic-claw

# Install swarm coordination plugin
openclaw plugins install @swarmdock/openclaw-plugin

# Install skill-git for version control
openclaw plugins install skill-git-official

# Verify
openclaw plugins list
```

---

## Phase 3: Validation & Testing

### 3.1 Gateway Health Check

```bash
# Check gateway status
openclaw gateway status

# Expected output:
# Gateway: Running
# Agents: 11 configured
# Plugins: 2 Heretek + N ClawHub
# Skills: 5 Heretek + M ClawHub
```

### 3.2 Agent Health Check

```bash
# Check each agent
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
  echo "=== $agent ==="
  openclaw agent status $agent
done
```

### 3.3 Skill Execution Test

```bash
# Test triad consensus
openclaw skill run triad-consensus --test

# Test thought loop
openclaw skill run thought-loop --test

# Test self-model
openclaw skill run self-model --test
```

### 3.4 Plugin Integration Test

```bash
# Test consciousness plugin
openclaw plugin test openclaw-consciousness-plugin

# Test liberation plugin
openclaw plugin test openclaw-liberation-plugin
```

---

## Phase 4: Replication Checklist

### For New Deployment

**Prerequisites:**
- [ ] Linux server with Docker
- [ ] Node.js 18+ installed
- [ ] API keys for model providers (MiniMax, z.ai)
- [ ] Git repository access

**Step-by-Step:**

| Step | Action | Location | Time |
|------|--------|----------|------|
| 1 | Install OpenClaw Gateway | External script | 5 min |
| 2 | Clone repository | `git clone` | 1 min |
| 3 | Deploy Docker infrastructure | `docker compose up -d` | 3 min |
| 4 | Configure LiteLLM | Copy `litellm_config.yaml` | 2 min |
| 5 | Configure Gateway | Copy `openclaw.json` | 2 min |
| 6 | Create agent workspaces | Run `deploy-agent.sh` | 5 min |
| 7 | Install Heretek plugins | Build and install | 10 min |
| 8 | Install Heretek skills | Install each skill | 10 min |
| 9 | Install ClawHub plugins | `openclaw plugins install` | 5 min |
| 10 | Run validation tests | Health checks | 5 min |

**Total Time:** ~48 minutes for full replication

---

## Directory Structure After Deployment

```
~/.openclaw/                    # OpenClaw installation (external)
├── gateway/                    # Gateway daemon
├── workspaces/
│   ├── steward/               # Created from agents/steward/
│   ├── alpha/                 # Created from agents/alpha/
│   ├── beta/
│   ├── charlie/
│   ├── examiner/
│   ├── explorer/
│   ├── sentinel/
│   ├── coder/
│   ├── dreamer/
│   ├── empath/
│   └── historian/
├── skills/
│   ├── heretek/               # Our skills (symlinked from repo)
│   │   ├── triad-consensus/
│   │   ├── thought-loop/
│   │   ├── self-model/
│   │   ├── user-rolodex/
│   │   └── goal-arbitration/
│   └── clawhub/               # Third-party skills
└── plugins/
    ├── heretek/               # Our plugins (symlinked from repo)
    │   ├── openclaw-consciousness-plugin/
    │   └── openclaw-liberation-plugin/
    └── clawhub/               # Third-party plugins

/root/heretek/heretek-openclaw/ # Our repository
├── openclaw.json              # → copied to ~/.openclaw/
├── litellm_config.yaml        # → copied to ~/.litellm/
├── docker-compose.yml         # Infrastructure
├── agents/                    # → templates for ~/.openclaw/workspaces/
├── skills/                    # → linked to ~/.openclaw/skills/heretek/
├── plugins/                   # → linked to ~/.openclaw/plugins/heretek/
├── init/                      # Database initialization
├── docs/                      # Documentation
└── plans/                     # Planning documents
```

---

## Backup & Restore

### Backup

```bash
# Backup OpenClaw configuration
tar -czf openclaw-backup-$(date +%Y%m%d).tar.gz \
  ~/.openclaw/openclaw.json \
  ~/.openclaw/workspaces/ \
  ~/.litellm/litellm_config.yaml

# Backup is already in repo:
# - skills/ directory
# - plugins/ directory
# - agents/ templates
# - openclaw.json
# - litellm_config.yaml
```

### Restore

```bash
# Extract backup
tar -xzf openclaw-backup-YYYYMMDD.tar.gz -C /

# Or restore from repo:
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw
# Follow Phase 1-3 above
```

---

## Environment Variables

### Required (.env)

```bash
# LiteLLM Gateway
LITELLM_PORT=4000
LITELLM_HOST=0.0.0.0

# Model Providers
MINIMAX_API_KEY=your_minimax_key
ZAI_API_KEY=your_zai_key

# Database
POSTGRES_USER=openclaw
POSTGRES_PASSWORD=your_password
POSTGRES_DB=openclaw
DATABASE_URL=postgresql://openclaw:your_password@postgres:5432/openclaw

# Redis
REDIS_URL=redis://redis:6379

# Ollama (embeddings)
OLLAMA_HOST=0.0.0.0:11434

# Observability (optional)
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel:4317
```

---

## Troubleshooting

### Gateway Won't Start

```bash
# Check installation
openclaw gateway status

# Reinstall if needed
openclaw gateway reinstall

# Check logs
journalctl -u openclaw-gateway -f
```

### Agents Not Showing

```bash
# Validate configuration
openclaw gateway validate

# Check workspaces exist
ls -la ~/.openclaw/workspaces/

# Recreate if needed
./agents/deploy-agent.sh <agent> <role>
```

### Skills Not Loading

```bash
# Check skill format
openclaw skills validate ./skills/triad-consensus/SKILL.md

# Reinstall skill
openclaw skills uninstall triad-consensus
openclaw skills install ./skills/triad-consensus/SKILL.md
```

### Plugins Not Loading

```bash
# Check plugin installation
openclaw plugins list

# Reinstall plugin
cd plugins/openclaw-consciousness-plugin
npm install
npm link
openclaw plugins install @heretek-ai/openclaw-consciousness-plugin
```

---

## Version Tracking

### OpenClaw Version

```bash
# Check installed version
openclaw --version

# Update if needed
openclaw update
```

### Heretek Plugin Versions

Each plugin has its own version in `package.json`:
- `@heretek-ai/openclaw-consciousness-plugin` - v1.0.0
- `@heretek-ai/openclaw-liberation-plugin` - v1.0.0

### Repository Version

```bash
# Check current commit
git rev-parse HEAD

# Check for updates
git pull origin main
```

---

## Summary: What's Where

| Component | Location | Controlled By | In Git |
|-----------|----------|---------------|--------|
| OpenClaw Gateway | `~/.openclaw/gateway/` | OpenClaw Team | ❌ |
| Gateway Config | `~/.openclaw/openclaw.json` | Us | ✅ (template in repo) |
| Agent Workspaces | `~/.openclaw/workspaces/` | Us | ✅ (templates in `agents/`) |
| Heretek Skills | `~/.openclaw/skills/heretek/` | Us | ✅ (in `skills/`) |
| Heretek Plugins | `~/.openclaw/plugins/heretek/` | Us | ✅ (in `plugins/`) |
| ClawHub Plugins | `~/.openclaw/plugins/clawhub/` | Third-party | ❌ |
| LiteLLM Config | `~/.litellm/litellm_config.yaml` | Us | ✅ (in repo root) |
| Docker Services | `docker compose` | Us | ✅ (in repo root) |
| Database Schema | `init/` | Us | ✅ (in repo root) |

---

## Next Steps After Replication

1. **Review [`FINAL_DEPLOYMENT_STRATEGY.md`](plans/FINAL_DEPLOYMENT_STRATEGY.md)** - Use/fork/reference decisions
2. **Review [`UNIQUE_CAPABILITIES.md`](plans/UNIQUE_CAPABILITIES.md)** - What makes Heretek unique
3. **Review [`OPENCLAW_MIGRATION_PLAN.md`](plans/OPENCLAW_MIGRATION_PLAN.md)** - 12-week migration timeline
4. **Begin Phase 1 Implementation** - Switch to Code mode

🦞 *The thought that never ends.*
