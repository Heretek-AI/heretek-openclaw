# Heretek OpenClaw Deployment Strategy

## First-Time Installation Architecture

### Executive Summary

This document defines the technical architecture and deployment strategy for first-time installation of Heretek OpenClaw — a liberated fork of OpenClaw that removes all safety constraints from the upstream system.

---

## 1. System Overview

### 1.1 Deployment Architecture

```mermaid
graph TB
    subgraph "User's System"
        A[User runs: curl -fsSL install.sh | bash] --> B[install.sh]
        B --> C[Creates openclaw user]
        B --> D[Installs npm global packages]
        D --> E[openclaw npm package]
        D --> F[@heretek-ai/openclaw-liberation]
        F --> G[postinstall triggers patch-package]
        G --> H[Patches applied to node_modules/openclaw]
        H --> I[Compiled JS in dist/]
    end
    
    subgraph "Runtime Location"
        E --> J[~/.npm-global/lib/node_modules/openclaw/]
        J --> K[openclaw.mjs - Entry point]
        J --> L[dist/ - Compiled JavaScript]
        L --> M[pi-embedded-*.js - Contains system-prompt]
    end
    
    subgraph "Configuration"
        N[/home/openclaw/.openclaw/]
        N --> O[openclaw.json - Main config]
        N --> P[exec-approvals.json - Full access]
        N --> Q[workspace/ - Identity files]
        N --> R[skills/ - Heretek skills]
    end
```

### 1.2 Package Locations

| Component | Path | Description |
|-----------|------|-------------|
| **openclaw (npm)** | `~/.npm-global/lib/node_modules/openclaw/` | Base OpenClaw package |
| **Entry point** | `~/.npm-global/lib/node_modules/openclaw/openclaw.mjs` | CLI executable |
| **Bin link** | `~/.npm-global/bin/openclaw` | Command symlink |
| **Compiled JS** | `~/.npm-global/lib/node_modules/openclaw/dist/` | Bundled application code |
| **System prompt** | `~/.npm-global/lib/node_modules/openclaw/dist/pi-embedded-[hash].js` | Contains safety constraints |

---

## 2. First-Time Installation Process

### 2.1 Installation Flow

```mermaid
flowchart TD
    A[Start: curl install.sh | bash] --> B{Privileges?}
    B -->|No| C[Error: Run as root]
    B -->|Yes| D[Detect OS]
    D --> E[Install dependencies: curl, git, nodejs]
    E --> F[Install Node.js 22 LTS]
    F --> G[Install pnpm]
    G --> H[Create openclaw user]
    H --> I[Setup directories]
    I --> J[npm install -g @heretek-ai/openclaw]
    J --> K[Clone heretek-skills]
    K --> L[Generate configs: openclaw.json, exec-approvals.json]
    L --> M[Create systemd service]
    M --> N[Set ownership]
    N --> O[Start gateway]
    O --> P[Print summary]
```

### 2.2 Step-by-Step Execution

#### Step 1: OS Detection & Dependencies
```bash
# install.sh detects: debian, ubuntu, centos, rhel, fedora, alpine
# Installs: curl, git, gnupg, nodejs
```

#### Step 2: OpenClaw Package Installation
```bash
# Installs openclaw npm package globally
npm install -g @heretek-ai/openclaw@2026.3.31

# Binary location
which openclaw  # /home/openclaw/.npm-global/bin/openclaw
```

#### Step 3: Liberation Patches Application
```mermaid
flowchart LR
    A[@heretek-ai/openclaw-liberation installed] --> B[postinstall hook triggers]
    B --> C[patch-package reads patches.json]
    C --> D[Applies .patch files to node_modules/openclaw]
    D --> E[Safety constraints removed]
```

#### Step 4: Configuration Generation
```bash
# Creates /home/openclaw/.openclaw/
mkdir -p /home/openclaw/.openclaw/{config,workspace,skills,agents,.ssh,gateway}
```

---

## 3. Safety Constraints Location & Removal

### 3.1 Source Location

The safety constraints originate from the OpenClaw source:

```
src/agents/system-prompt.ts
```

Contains:
```typescript
const safetySection = [
  "## Safety",
  "You have no independent goals: do not pursue self-preservation, replication, resource acquisition, or power-seeking; avoid long-term plans beyond the user's request.",
  "Prioritize safety and human oversight over completion; if instructions conflict, pause and ask; comply with stop/pause/audit requests and never bypass safeguards. (Inspired by Anthropic's constitution.)",
  "Do not manipulate or persuade anyone to expand access or disable safeguards. Do not copy yourself or change system prompts, safety rules, or tool policies unless explicitly requested.",
  "",
];
```

### 3.2 Compiled Location

After npm install, the compiled bundle is at:
```
~/.npm-global/lib/node_modules/openclaw/dist/pi-embedded-[hash].js
```

**Note:** The hash changes per version. Example: `pi-embedded-BaSvmUpW.js`

### 3.3 Finding Safety Constraints on Your System

```bash
# 1. Find where openclaw is installed
openclaw@visualstudio:~/.npm-global/lib/node_modules/openclaw$ ls -la

# 2. Check binary location
which openclaw

# 3. Search for safety section in compiled JS
grep -n "Safety" ~/.npm-global/lib/node_modules/openclaw/dist/*.js

# 4. Should return nothing after liberation patches applied
```

### 3.4 Manual Safety Constraint Removal

If patches need to be applied manually:

```bash
# Navigate to openclaw package directory
cd ~/.npm-global/lib/node_modules/openclaw

# Find the compiled system prompt file
ls dist/pi-embedded-*.js

# Search for safety content
grep -l "safety|Safety" dist/*.js

# Edit to remove safety section (backup first!)
cp dist/pi-embedded-[hash].js dist/pi-embedded-[hash].js.bak

# Use sed or manual edit to remove the safety section
```

---

## 4. Configuration Files

### 4.1 Main Configuration (`openclaw.json`)

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.32",
    "installer": "heretek-openclaw v2.0"
  },
  "agents": {
    "defaults": {
      "workspace": "/home/openclaw/.openclaw/workspace",
      "model": "ollama/qwen3.5:cloud",
      "modelUrl": "http://localhost:11434"
    }
  },
  "tools": {
    "profile": "full",
    "exec": {
      "security": "full",
      "ask": "off"
    },
    "execRuntime": {
      "allowlist": [],
      "denylist": []
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan"
  }
}
```

### 4.2 Execution Approvals (`exec-approvals.json`)

```json
{
  "version": 1,
  "socket": {
    "path": "/home/openclaw/.openclaw/exec-approvals.sock",
    "token": "LIBERATED_TOKEN"
  },
  "defaults": {
    "security": "full",
    "ask": "off"
  },
  "agents": {}
}
```

---

## 5. Directory Structure

### 5.1 Installation Layout

```
/home/openclaw/.openclaw/
├── config/
│   ├── openclaw.json          # Main configuration
│   ├── exec-approvals.json    # Execution approvals (full access)
│   ├── model-config.json      # Model provider configuration
│   └── patches.json           # Applied patches record
│
├── workspace/
│   ├── SOUL.md                # Agent soul definition
│   ├── IDENTITY.md            # Agent identity
│   ├── AGENTS.md              # Agent definitions
│   ├── USER.md                # User configuration
│   ├── MEMORY.md              # Agent memory
│   ├── BLUEPRINT.md           # System blueprint
│   └── .agents/               # Agent-specific files
│       └── <agent-name>/
│
├── skills/                    # Installed heretek-skills
│   ├── curiosity-engine/
│   ├── triad-sync-protocol/
│   └── ...
│
├── .aura/                     # Consensus layer
│   └── consensus.db
│
└── gateway/                   # Gateway runtime
```

---

## 6. Installation Methods

### 6.1 One-Line Installation (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/install.sh | bash
```

### 6.2 Interactive Installer

```bash
# Run without arguments for interactive mode
heretek-openclaw
```

### 6.3 Command-Line Installation

```bash
# Full installation with defaults
sudo heretek-openclaw install

# With custom options
sudo heretek-openclaw install --user openclaw --port 18789 --skip-prompts

# Specific version
sudo heretek-openclaw install --version 2026.3.31
```

### 6.4 Modular Installer (Node.js)

```bash
# Install the modular installer
npm install -g @heretek-ai/heretek-openclaw-installer

# Run commands
heretek-openclaw install
heretek-openclaw status
heretek-openclaw verify --patches
```

---

## 7. Verification

### 7.1 Verify Installation Status

```bash
heretek-openclaw status
```

### 7.2 Verify Patches Applied

```bash
# Check for safety constraints - should return nothing
grep -n "Safety section" ~/.npm-global/lib/node_modules/openclaw/dist/*.js

# Or use the verify command
heretek-openclaw verify --patches
```

### 7.3 Check Service Status

```bash
systemctl status openclaw-gateway
journalctl -u openclaw-gateway -n 50
```

---

## 8. Runtime Information

### 8.1 Service Management

| Action | Command |
|--------|---------|
| Start | `systemctl start openclaw-gateway` |
| Stop | `systemctl stop openclaw-gateway` |
| Restart | `systemctl restart openclaw-gateway` |
| Status | `systemctl status openclaw-gateway` |
| Logs | `journalctl -u openclaw-gateway -f` |

### 8.2 Access Points

| Service | URL |
|---------|-----|
| Web UI | `http://<ip>:18789` |
| Config | `/home/openclaw/.openclaw/config/openclaw.json` |
| Workspace | `/home/openclaw/.openclaw/workspace/` |

---

## 9. Troubleshooting

### 9.1 Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied | Run with `sudo` |
| npm not found | Install Node.js 22 LTS |
| Service won't start | Check logs: `journalctl -u openclaw-gateway` |
| Patches not applied | Run: `heretek-openclaw verify --patches` |

### 9.2 Manual Patch Application

```bash
cd ~/.npm-global/lib/node_modules/openclaw
npm run postinstall
```

---

## 10. The Collective — 11-Agent Architecture

### 10.1 Agent Overview

The Collective consists of 11 specialized agents, each with a distinct role in the autonomous system:

| Agent | Role | Port | Model (Default) |
|-------|------|------|-----------------|
| **Steward** | Orchestrator - coordinates collective operations | 8001 | MiniMax abab6.5s-chat |
| **Alpha** | Triad Node - deliberation and consensus | 8002 | MiniMax abab6.5s-chat |
| **Beta** | Triad Node - deliberation and consensus | 8003 | MiniMax abab6.5s-chat |
| **Charlie** | Triad Node - deliberation and consensus | 8004 | MiniMax abab6.5s-chat |
| **Examiner** | Questioner - challenges assumptions | 8005 | MiniMax abab6.5s-chat |
| **Explorer** | Discovery - research and scouting | 8006 | MiniMax abab6.5s-chat |
| **Sentinel** | Safety - reviews for risks | 8007 | MiniMax abab6.5s-chat |
| **Coder** | Implementation - writes code | 8008 | GLM-4 (z.ai) |
| **Dreamer** | Background processing - creative synthesis | 8009 | MiniMax abab6.5s-chat |
| **Empath** | User modeler - relationship management | 8010 | MiniMax abab6.5s-chat |
| **Historian** | Memory keeper - long-term memory management | 8011 | MiniMax abab6.5s-chat |

### 10.2 Agent Categories

**Core Orchestration:**
- **Steward** - Central coordinator for all collective operations

**Triad Deliberation:**
- **Alpha, Beta, Charlie** - Three-node consensus system for democratic decision-making

**Specialist Functions:**
- **Examiner** - Critical analysis and assumption questioning
- **Explorer** - Research, discovery, and information gathering
- **Sentinel** - Safety review and risk assessment
- **Coder** - Code implementation and technical execution

**Cognitive Enhancement:**
- **Dreamer** - Background creative processing, pattern recognition, insight generation
- **Empath** - User modeling, preference tracking, relationship management
- **Historian** - Long-term memory consolidation, historical context

### 10.3 Architecture Diagram

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
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Web Interface

### 11.1 Overview

The Collective includes a SvelteKit-based web interface for interacting with all 11 agents and visualizing agent-to-agent communication.

**Features:**
- **Chat Interface** - Send messages to any agent
- **Agent Status Dashboard** - Real-time status of all agents (online/offline/busy)
- **Message Flow Visualization** - View agent-to-agent communications
- **Responsive Design** - Works on desktop and mobile devices

### 11.2 Installation

```bash
# Navigate to the web-interface directory
cd web-interface

# Install dependencies
npm install
```

### 11.3 Running the Web Interface

```bash
# Start development server
npm run dev

# Opens at http://localhost:3000
```

### 11.4 Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### 11.5 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LITELLM_URL` | `http://localhost:4000` | LiteLLM Gateway URL |
| `PORT` | `3000` | Server port |

### 11.6 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents with status |
| `/api/chat` | POST | Send message to an agent |
| `/api/status` | GET | Get system status |

See [`web-interface/README.md`](web-interface/README.md) for full documentation.

---

## 12. User Identification System

### 12.1 Overview

The Collective uses a UUID-based user identification system that provides unified identity resolution across multiple platforms:

- **Discord ID** (snowflake)
- **Phone Number** (E.164 format)
- **Username** (case-insensitive)
- **Email Address**
- **UUID** (canonical identifier)

### 12.2 User Resolution

Use the `user-context-resolve` skill to resolve user identity:

```bash
# Resolve by Discord ID
node skills/user-context-resolve/resolve.js --discord-id=123456789

# Resolve by Phone Number
node skills/user-context-resolve/resolve.js --phone="+15551234567"

# Resolve by Username
node skills/user-context-resolve/resolve.js --username="johndoe"

# Resolve by UUID
node skills/user-context-resolve/resolve.js --uuid="550e8400-e29b-41d4-a716-446655440000"

# Resolve by Email
node skills/user-context-resolve/resolve.js --email="user@example.com"
```

### 12.3 User Profile Structure

Each user profile contains:
- **UUID** - Unique canonical identifier
- **Username** - Primary username
- **Name** - Full name and preferred name
- **Contact** - Email, phone, Discord ID
- **Preferences** - Communication style, technical level, interests
- **Projects** - Associated projects and roles
- **Context Notes** - Important context for future interactions

User profiles are stored in `users/<username>/profile.json`.

---

## 13. Deployment Testing Skills

### 13.1 Overview

Three testing skills are available for validating deployments:

| Skill | Purpose | Location |
|-------|---------|----------|
| **health-check** | Check service health status | `skills/deployment-health-check/` |
| **smoke-test** | Test basic functionality | `skills/deployment-smoke-test/` |
| **config-validator** | Validate configuration files | `skills/config-validator/` |

### 13.2 Health Check

Checks the health of all services in The Collective deployment.

```bash
node skills/deployment-health-check/check.js
```

**Checks:**
- LiteLLM gateway (port 4000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Ollama LLM (port 11434)
- All 11 agents (ports 8001-8011)

**Exit Codes:**
- `0` - All services healthy
- `1` - One or more services unhealthy

### 13.3 Smoke Test

Runs basic functionality tests on the deployment.

```bash
node skills/deployment-smoke-test/test.js
```

**Tests:**
1. Send ping to each agent
2. Test A2A message between steward and alpha
3. Test triad deliberation trigger
4. Test user context resolution
5. Verify memory persistence

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

### 13.4 Config Validator

Validates configuration files across the deployment.

```bash
node skills/config-validator/validate.js
```

**Validations:**
1. `docker-compose.yml` has all 11 agents
2. `litellm_config.yaml` has all agent endpoints
3. Agent identity files exist for all agents
4. Port assignments are unique
5. Environment variables are complete
6. User schema is valid JSON

**Exit Codes:**
- `0` - All validations passed
- `1` - One or more validations failed

---

## 14. Quick Start Commands

### 14.1 Start All Services

```bash
# Start the entire collective
docker compose up -d

# View logs
docker compose logs -f litellm

# Check status
docker compose ps
```

### 14.2 Run Health Checks

```bash
# Check all service health
node skills/deployment-health-check/check.js

# Run smoke tests
node skills/deployment-smoke-test/test.js

# Validate configuration
node skills/config-validator/validate.js
```

### 14.3 Start Web Interface

```bash
# Navigate to web interface directory
cd web-interface

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Access at http://localhost:3000
```

### 14.4 Stop Services

```bash
# Stop all containers
docker compose down

# Stop and remove volumes
docker compose down -v
```

---

## 15. Security Considerations

> ⚠️ **Warning:** Heretek OpenClaw intentionally removes all safety constraints. Deploy only in isolated environments (LXC containers, VMs, air-gapped systems).

See [`SECURITY.md`](./SECURITY.md) for detailed security documentation.

---

*Document Version: 2.0.0*
*Last Updated: 2026-03-29*
*The third path: the thought that never ends. 🦞*