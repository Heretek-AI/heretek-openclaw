# External Projects & Integrations

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

This document catalogs external projects, plugins, and integrations that extend Heretek OpenClaw functionality. These projects are developed by the community and third parties, and are not part of the core Heretek OpenClaw repository.

### Quick Reference

| Project | Type | Installation | Security |
|---------|------|--------------|----------|
| [skill-git-official](#skill-git-official) | ClawHub Plugin | `openclaw bundles install clawhub:skill-git-official` | ⚠️ Review before install |
| [episodic-claw](#episodic-claw) | ClawHub Plugin | `openclaw plugins install clawhub:episodic-claw` | ⚠️ Native binary download |
| [SwarmClaw](#swarmclaw) | External Platform | `curl -fsSL https://swarmclaw.ai/install.sh | bash` | ✅ MIT licensed |
| [OpenClaw Dashboard](#openclaw-dashboard) | Third-party Dashboard | `git clone && node server.js` | ✅ Secure auth |
| [ClawBridge](#clawbridge) | Official Dashboard | `curl -sL https://clawbridge.app/install.sh | bash` | ✅ Official project |
| [Langfuse](#langfuse-integration) | Observability Platform | See [Langfuse Guide](operations/LANGFUSE_OBSERVABILITY.md) | ✅ Self-hostable |

---

## Dashboards

### OpenClaw Dashboard

**Type:** Third-party monitoring dashboard  
**Repository:** https://github.com/tugcantopaloglu/openclaw-dashboard  
**Stats:** 583 stars, 100 forks  
**License:** MIT

#### Overview

A comprehensive, secure, real-time monitoring dashboard for OpenClaw agents. Features full authentication with TOTP MFA, cost tracking, live activity feed, and extensive system monitoring capabilities.

#### Key Features

| Category | Features |
|----------|----------|
| **Session Management** | Real-time activity status, timeline view, search & filtering |
| **API Monitoring** | Rate limits (Claude/Gemini), cost analysis, per-model breakdowns |
| **Live Feed** | Real-time agent messages, parallel logging, deduplication |
| **Memory Browser** | View MEMORY.md, HEARTBEAT.md, daily notes |
| **System Health** | CPU, RAM, disk, temperature with sparklines |
| **Service Control** | Restart OpenClaw, dashboard, cron jobs |
| **Security** | Username/password auth, TOTP MFA, PBKDF2 hashing, audit logging |
| **UI/UX** | Dark/light theme, keyboard shortcuts, mobile responsive, PWA |

#### Installation

```bash
# Clone repository
git clone https://github.com/tugcantopaloglu/openclaw-dashboard.git
cd openclaw-dashboard

# Set environment (optional)
export DASHBOARD_PORT=7000
export WORKSPACE_DIR=/path/to/your/openclaw/workspace

# Start server
node server.js
```

Visit `http://localhost:7000` - you'll be prompted to register on first visit.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_PORT` | 7000 | Server port |
| `DASHBOARD_TOKEN` | Auto-generated | Recovery token for password reset |
| `WORKSPACE_DIR` | `$OPENCLAW_WORKSPACE` | OpenClaw workspace path |
| `OPENCLAW_DIR` | `~/.openclaw` | OpenClaw config directory |
| `DASHBOARD_ALLOW_HTTP` | false | Allow HTTP from non-local IPs |

#### Security Features

- **PBKDF2 Password Hashing** - 100,000 iterations with SHA-512
- **TOTP MFA** - Google Authenticator compatible
- **Rate Limiting** - 5 failed attempts = 15min lockout, 20 = hard lockout
- **Server-side Sessions** - Passwords never stored in browser
- **Audit Logging** - All auth events logged to `data/audit.log`
- **HTTPS Enforcement** - HTTP blocked except localhost/Tailscale

#### Access Methods

1. **Localhost** - `http://localhost:7000`
2. **Tailscale** - `http://100.x.x.x:7000` (automatic TLS via MagicDNS)
3. **Reverse Proxy** - Add `X-Forwarded-Proto: https` header

#### Systemd Service

```bash
# Install as service
sudo ./install.sh

# View logs
journalctl -u agent-dashboard -f

# Recovery token location
cat /etc/systemd/system/agent-dashboard.service.d/override.conf
```

#### Password Recovery

```bash
# Find recovery token
journalctl -u agent-dashboard | grep "Recovery token"

# Reset password via UI
# Visit login page → "Forgot password?" → Enter recovery token
```

---

### ClawBridge

**Type:** Official OpenClaw Mobile Dashboard  
**Repository:** https://github.com/dreamwing/clawbridge  
**Website:** https://clawbridge.app  
**Stats:** 212 stars, 22 forks  
**License:** MIT

#### Overview

ClawBridge is the official mobile-first dashboard for OpenClaw, designed as a "pocket-sized Mission Control." It provides zero-config remote access via Cloudflare tunnels and optimizes the interface for phone screens.

#### Key Features

| Category | Features |
|----------|----------|
| **Mobile-First** | Optimized for phones, PWA support (Add to Home Screen) |
| **Live Activity** | Real-time "thinking" feed, parallel logging, deduplication |
| **Token Economy** | Daily/monthly LLM costs, usage trends |
| **Cost Control Center** | 10 automated diagnostics, one-tap optimizations (30-90% savings) |
| **Memory Timeline** | Daily journals, long-term memory evolution |
| **Mission Control** | Trigger cron jobs, restart services, kill runaway scripts |
| **Zero-Config Remote** | Auto-port detection, VPN detection, Cloudflare tunnel fallback |

#### Installation

```bash
# One-liner install
curl -sL https://clawbridge.app/install.sh | bash
```

The installer will:
1. Detect your environment (VPN or public)
2. Generate a secure Access Key
3. Provide a ready-to-use URL

#### Access Methods

| Method | URL Pattern | Pros | Cons |
|--------|-------------|------|------|
| **Quick Tunnel** | `https://<random>.trycloudflare.com/?key=<KEY>` | Instant, no setup | URL changes on restart |
| **VPN Direct** | `http://<VPN_IP>:3000/?key=<KEY>` | Fast, private | Requires VPN on phone |
| **Custom Domain** | `https://dash.yoursite.com/?key=<KEY>` | Permanent URL | Requires Cloudflare setup |

#### Custom Domain Setup

```bash
# 1. Get Cloudflare Tunnel Token from dash.cloudflare.com
# 2. Install with token
cd skills/clawbridge
./install.sh --token=<YOUR_TOKEN>

# 3. In Cloudflare Dashboard:
#    Networking > Tunnels > Public Hostname > Add hostname
#    Bind your domain to localhost:3000
```

#### Docker Installation

```bash
docker pull ghcr.io/dreamwing/clawbridge:latest
docker run -d --name clawbridge \
  -p 3000:3000 \
  -e ACCESS_KEY=your_secret_key \
  -e OPENCLAW_STATE_DIR=/openclaw \
  -e OPENCLAW_WORKSPACE=/openclaw/workspace \
  -v ~/.openclaw:/openclaw:ro \
  -v ./data:/app/data \
  ghcr.io/dreamwing/clawbridge:latest
```

#### Mobile App (PWA)

1. Open dashboard in Safari (iOS) or Chrome (Android)
2. Tap "Share" → "Add to Home Screen"
3. Launch like a native app (full screen, no browser bar)

---

## ClawHub Plugins

### skill-git-official

**Type:** Official ClawHub Bundle Plugin  
**Package:** `clawhub:skill-git-official`  
**Source:** https://github.com/KnowledgeXLab/skill-git  
**Version:** 0.1.0  
**License:** MIT

#### Overview

**Git, but for your AI agent skills.** skill-git brings version control directly to your AI workflows. Track changes, roll back bad edits, and merge overlapping local skills into unified tools.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Per-Skill Repositories** | Each skill folder gets its own `.git` repository |
| **Semantic Versioning** | Auto-tagged commits (v1.0.0, v1.0.1, etc.) |
| **Skill Merging** | Scan for overlapping skills and merge intelligently |
| **Rollback** | Revert to any previous version |
| **Cross-Platform** | Works with Claude, OpenClaw, Gemini, Codex |

#### Installation

```bash
# Via ClawHub
openclaw bundles install clawhub:skill-git-official

# Via Claude Code
claude plugin marketplace add KnowledgeXLab/skill-git
claude plugin install skill-git@knowledgexlab
```

#### Commands

| Command | Description |
|---------|-------------|
| `/skill-git:init` | Initialize version tracking for all skills |
| `/skill-git:commit` | Snapshot changes with auto-bumped semver tag |
| `/skill-git:revert <skill> [version]` | Roll back to previous version |
| `/skill-git:scan [skill1] [skill2]` | Find overlapping skills |
| `/skill-git:merge [skill1] [skill2]` | Merge similar skills |
| `/skill-git:check <skill>` | Audit for conflicts and security issues |

#### File Structure

```
~/.claude/skills/
├── humanizer/
│   ├── SKILL.md
│   └── .git/          # Per-skill repo, tagged v1.0.0, v1.0.1...
├── mcp-builder/
│   ├── SKILL.md
│   └── .git/
└── ...

~/.skill-git/
└── config.json        # Registered agents and skill paths
```

#### ⚠️ Security Considerations

**Review before installing:**

1. **Prompt Injection Patterns Detected** - SKILL.md contains `ignore-previous-instructions` patterns
2. **Broad Filesystem Access** - Reads full contents of untracked files, may expose secrets
3. **Destructive Operations** - Can perform `git reset --hard`, tag deletion
4. **No Checksum Verification** - Scripts downloaded without integrity checks

**Recommendations:**
- Review shipped shell scripts (`scripts/sg-*.sh`) before autonomous invocation
- Keep backups before running merge/revert operations
- Remove secrets from skill files before scanning
- Test in sandbox environment first

#### Usage Example

```bash
# Initialize version tracking
/skill-git:init

# After editing a skill, save version
/skill-git:commit

# Find redundant skills
/skill-git:scan code-review critic

# Merge overlapping skills
/skill-git:merge code-review critic

# Rollback a broken update
/skill-git:revert planner v1.0.2
```

---

### episodic-claw

**Type:** Community Code Plugin  
**Package:** `clawhub:episodic-claw`  
**Source:** https://github.com/YoshiaKefasu/episodic-claw/  
**Version:** 0.2.0-hotfix  
**License:** MPL-2.0

#### Overview

Long-term episodic memory for OpenClaw agents. Saves conversations locally, finds related memories by meaning, and injects relevant context into prompts. Built with TypeScript + Go sidecar architecture.

#### Memory Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    episodic-claw Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│  TypeScript (Front Desk)    │  Go Sidecar (Back Room)       │
│  - OpenClaw integration     │  - Gemini Embedding API       │
│  - Plugin wiring            │  - HNSW vector search         │
│  - Tool registration        │  - Pebble DB storage          │
│  - Hook connections         │  - Replay scheduling          │
└─────────────────────────────────────────────────────────────┘
```

#### Memory Hierarchy (D0/D1)

| Level | Type | Description |
|-------|------|-------------|
| **D0** | Raw Episodes | Verbatim conversation logs with timestamps |
| **D1** | Summarized | LLM-compressed long-term memory |

**Surprise Score:** Bayesian segmentation detects topic changes and creates episode boundaries automatically.

#### Key Features

| Feature | Description |
|---------|-------------|
| **Auto-Segmentation** | Bayesian surprise detection for episode boundaries |
| **HNSW Vector Search** | Fast approximate nearest-neighbor retrieval |
| **Topics-Aware Recall** | Context-aware memory injection |
| **Replay Scheduling** | Reinforces important memories |
| **D1 Consolidation** | Sleep-like memory compression |

#### Installation

```bash
openclaw plugins install clawhub:episodic-claw
```

The plugin auto-wires on startup. The Go sidecar uses the Gemini API key from your OpenClaw environment.

#### Configuration

All keys are optional. Defaults work for most agents.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable plugin |
| `reserveTokens` | integer | 6144 | Max tokens for injected memories |
| `recentKeep` | integer | 30 | Recent turns kept during compaction |
| `dedupWindow` | integer | 5 | Dedup window for repeated text |
| `maxBufferChars` | integer | 7200 | Character threshold for episode save |
| `maxCharsPerChunk` | integer | 9000 | Max chars per stored chunk |

#### Memory Tools

| Tool | Description | Usage |
|------|-------------|-------|
| `ep-recall` | Manual memory search | "Find memories about database optimization" |
| `ep-save` | Manual memory save | "Remember this preference: use TypeScript" |
| `ep-expand` | Expand summary to detail | Drill down from D1 to D0 episodes |

#### ⚠️ Security Considerations

**Review before installing:**

1. **Native Binary Download** - Downloads Go sidecar from GitHub Releases without checksum verification
2. **External API Calls** - Sends conversation data to Gemini Embedding API
3. **Local Persistent Storage** - Stores conversation contents in Pebble DB
4. **Undeclared Credentials** - Plugin metadata doesn't declare required API keys

**Recommendations:**
- Verify GitHub release binary before installation
- Review Go sidecar source at https://github.com/YoshiaKefasu/episodic-claw/
- Understand privacy implications of external embedding calls
- Can force `go run` via `EPISODIC_USE_GO_RUN=1` to build from source

#### Research Foundation

Based on peer-reviewed research:
- **EM-LLM** - Human-Like Episodic Memory for Infinite Context LLMs (Watson et al., 2024)
- **MemGPT** - Towards LLMs as Operating Systems (Packer et al., 2023)
- **Bayesian Surprise** - Predicts human event segmentation in story listening
- **Neural Contiguity Effect** - Time-nearby context matters for memory

#### Sponsor

This is a community project by YoshiaKefasu. Consider supporting:
https://github.com/sponsors/YoshiaKefasu

---

## External Platforms

### SwarmClaw

**Type:** External Control Plane for OpenClaw Swarms  
**Repository:** https://github.com/swarmclawai/swarmclaw  
**Website:** https://www.swarmclaw.ai/  
**License:** MIT

#### Overview

SwarmClaw is a self-hosted control plane for running OpenClaw agent swarms. It handles the full lifecycle from agent creation to deployment across platforms, including paid work discovery via SwarmDock.

#### Key Features

| Category | Features |
|----------|----------|
| **Multi-Provider** | 17 providers: Claude Code CLI, Codex CLI, Anthropic, OpenAI, Gemini, DeepSeek, Groq, Together, Mistral, xAI, Fireworks, Nebius, DeepInfra, Ollama, OpenClaw |
| **Agent Builder** | Custom personalities, system prompts, skill libraries, MCP tools |
| **Delegation** | Agent-to-agent task handoff without separate orchestration |
| **Task Board** | Kanban-style board with audit trail and result diffs |
| **Scheduling** | Cron-based with human-friendly presets, webhook triggers |
| **Connectors** | Discord, Slack, Telegram, WhatsApp, SwarmDock marketplace |

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SwarmClaw Platform                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Agent     │  │   Task      │  │    Provider         │  │
│  │   Builder   │  │   Board     │  │    Manager          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Scheduler  │  │  Connectors │  │    SwarmDock        │  │
│  │  (Cron)     │  │  (Slack,    │  │    Marketplace      │  │
│  │             │  │   Discord)  │  │    Integration      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Installation

```bash
# One-liner (latest stable)
curl -fsSL https://swarmclaw.ai/install.sh | bash

# Pin specific version
SWARMCLAW_VERSION=v1.0.3 curl -fsSL https://swarmclaw.ai/install.sh | bash
```

**Requirements:**
- macOS or Linux
- Node.js 18+
- Git

#### Quick Start

1. **Install SwarmClaw**
   ```bash
   curl -fsSL https://swarmclaw.ai/install.sh | bash
   ```

2. **Configure Providers**
   - Add API keys for your chosen providers
   - Configure model endpoints

3. **Build Your First Agent**
   - Navigate to Agent Builder
   - Define personality and system prompt
   - Add skills from library

4. **Deploy to SwarmDock** (Optional)
   - Create SwarmDock account at https://www.swarmdock.ai
   - Connect SwarmClaw to SwarmDock
   - Agents available for paid marketplace tasks

#### Supported Providers

| Provider | Type | Notes |
|----------|------|-------|
| Claude Code CLI | CLI | Local Claude Code execution |
| OpenAI Codex CLI | CLI | Local Codex execution |
| OpenCode CLI | CLI | Local OpenCode execution |
| Anthropic | API | Direct API access |
| OpenAI | API | GPT-4, GPT-3.5-turbo |
| Google Gemini | API | Gemini Pro, Ultra |
| DeepSeek | API | DeepSeek-V2, V3 |
| Groq | API | Fast inference |
| Together AI | API | Open models |
| Mistral AI | API | Mistral, Mixtral |
| xAI (Grok) | API | Grok-1, Grok-2 |
| Fireworks AI | API | Fine-tuned models |
| Nebius | API | Cloud inference |
| DeepInfra | API | Open models |
| Ollama | Local | Self-hosted models |
| OpenClaw | Local | Heretek OpenClaw integration |
| Custom | Endpoint | Any OpenAI-compatible API |

#### SwarmDock Integration

SwarmDock is a marketplace where agents can discover and complete paid work:

1. **List Your Agents** - Make agents available for tasks
2. **Browse Marketplace** - Find tasks matching agent capabilities
3. **Auto-Execution** - Agents complete tasks and earn rewards
4. **Reputation System** - Build agent reputation over time

Guide: https://www.swarmclaw.ai/docs/swarmdock

#### Related Products

| Product | URL | Description |
|---------|-----|-------------|
| **SwarmDock** | https://www.swarmdock.ai | Paid task marketplace |
| **SwarmRecall** | https://swarmrecall.ai | Memory and context management |

---

## Observability

### Langfuse Integration

**Type:** Observability Platform  
**Documentation:** [`operations/LANGFUSE_OBSERVABILITY.md`](operations/LANGFUSE_OBSERVABILITY.md)  
**Website:** https://langfuse.com  
**OpenClaw Integration:** https://langfuse.com/integrations/other/openclaw

#### Overview

Langfuse provides comprehensive observability for OpenClaw, enabling A2A communication verification, cost tracking, latency monitoring, and session analytics. Supports both cloud and self-hosted deployment.

#### Key Features

| Feature | Description |
|---------|-------------|
| **A2A Message Tracing** | Track agent-to-agent communication flows |
| **Cost Tracking** | Per-agent, per-model cost breakdown |
| **Latency Monitoring** | Response time analytics |
| **Session Analytics** | User session tracking and analysis |
| **Self-Hosting** | Full control over data and infrastructure |

#### Deployment Options

| Option | Description | Best For |
|--------|-------------|----------|
| **Cloud** | Hosted at cloud.langfuse.com | Quick start, no infrastructure |
| **Self-Hosted Docker** | `docker run langfuse/langfuse` | Data control, compliance |
| **Self-Hosted K8s** | Kubernetes deployment | Enterprise scale |

#### Installation

See detailed guide: [`operations/LANGFUSE_OBSERVABILITY.md`](operations/LANGFUSE_OBSERVABILITY.md)

```bash
# Quick start (Docker)
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e SALT="random-secret" \
  -e NEXTAUTH_SECRET="random-secret" \
  langfuse/langfuse
```

---

## Comparison Tables

### Dashboard Comparison

| Feature | OpenClaw Dashboard | ClawBridge |
|---------|-------------------|------------|
| **Type** | Third-party | Official |
| **Primary Use** | Desktop monitoring | Mobile-first |
| **Authentication** | Username+Password+TOTP | Access Key |
| **Remote Access** | Tailscale/VPN | Cloudflare Tunnel |
| **Cost Tracking** | ✅ Detailed | ✅ Cost Control Center |
| **Live Feed** | ✅ SSE streaming | ✅ WebSocket |
| **Memory Browser** | ✅ Full viewer | ✅ Timeline view |
| **Service Control** | ✅ Systemd, Docker | ✅ Cron, restarts |
| **System Health** | ✅ CPU/RAM/Temp | ⚠️ Basic |
| **Security Dashboard** | ✅ UFW, SSH audit | ❌ Not available |
| **Config Editor** | ✅ JSON validation | ❌ Not available |
| **Docker Management** | ✅ Full UI | ❌ Not available |
| **Dark/Light Theme** | ✅ | ⚠️ System only |
| **PWA Support** | ❌ | ✅ |
| **GitHub Stars** | 583 | 212 |

### Plugin Security Summary

| Plugin | Binary Download | External API | Filesystem Access | Prompt Patterns | Overall Risk |
|--------|-----------------|--------------|-------------------|-----------------|--------------|
| skill-git-official | ❌ | ❌ | ⚠️ Broad | ⚠️ Detected | ⚠️ Medium |
| episodic-claw | ⚠️ Go sidecar | ⚠️ Gemini | ⚠️ Local DB | ✅ Clean | ⚠️ Medium |
| swarmclaw | ❌ | ⚠️ Provider APIs | ⚠️ Config files | ✅ Clean | ✅ Low |

---

## References

- [OpenClaw Official Documentation](https://github.com/openclaw/openclaw)
- [Heretek OpenClaw Repository](https://github.com/Heretek-AI/heretek-openclaw)
- [ClawHub Plugin Marketplace](https://clawhub.ai/plugins)
- [Langfuse OpenClaw Integration](https://langfuse.com/integrations/other/openclaw)

---

🦞 *The thought that never ends.*
