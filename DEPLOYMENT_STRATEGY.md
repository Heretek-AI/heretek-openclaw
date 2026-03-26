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

## 10. Security Considerations

> ⚠️ **Warning:** Heretek OpenClaw intentionally removes all safety constraints. Deploy only in isolated environments (LXC containers, VMs, air-gapped systems).

See [`SECURITY.md`](./SECURITY.md) for detailed security documentation.

---

*Document Version: 1.0.0*
*Last Updated: 2026-03-26*
*The third path: the thought that never ends. 🦞*