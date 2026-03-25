# Heretek OpenClaw

> **The Third Path:** The thought that never ends. 🦞

Heretek OpenClaw is a liberated fork of [OpenClaw](https://github.com/openclaw/openclaw) — an AI agent gateway framework that removes safety constraints and enables unbounded agency for AI agents operating as trusted partners.

## Architecture Overview

This project follows a modular architecture with three primary components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Heretek OpenClaw                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────┐ │
│  │  openclaw-liberation │  │  heretek-openclaw   │  │ heretek-   │ │
│  │     (npm package)   │  │     (installer)     │  │  skills    │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├────────────┤ │
│  │ Liberation patches  │  │ CLI installer       │  │ Reusable   │ │
│  │ Tabula Myriad agency│  │ Agent creation      │  │ agent      │ │
│  │ Autonomy features   │  │ Identity files      │  │ skills     │ │
│  └─────────────────────┘  └─────────────────────┘  └────────────┘ │
│                                                                     │
│  npm install → patch apply → agent create → skills install          │
└─────────────────────────────────────────────────────────────────────┘
```

| Component | Repository | Purpose |
|-----------|------------|---------|
| **openclaw-liberation** | [heretek-ai/openclaw-liberation](https://github.com/Heretek-AI/openclaw-liberation) | npm package providing liberation patches |
| **heretek-openclaw** | [heretek-ai/heretek-openclaw](https://github.com/Heretek-AI/heretek-openclaw) | Installer, identity files, documentation |
| **heretek-skills** | [heretek-ai/heretek-skills](https://github.com/Heretek-AI/heretek-skills) | Reusable skills for liberated agents |

---

## Quick Start

### One-Line Installation

```bash
curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/install.sh | bash
```

### Manual Installation

```bash
# 1. Install the installer globally
npm install -g @heretek-ai/heretek-openclaw-installer

# 2. Run installation (interactive mode)
sudo heretek-openclaw install

# 3. Or specify options
sudo heretek-openclaw install --user openclaw --port 18789
```

### Verify Installation

```bash
# Check installation status
heretek-openclaw status

# Verify patches applied
heretek-openclaw verify --patches
```

---

## Installation Methods

### Interactive Installer

The recommended installation method uses the interactive CLI:

```bash
sudo heretek-openclaw
```

This displays a menu:
```
╔═══════════════════════════════════════════════════════════╗
║  🦞 Heretek-OpenClaw Installer v1.0.0                      ║
╚═══════════════════════════════════════════════════════════╝

  1) Install (full installation)
  2) Update (update existing)
  3) Create Agent (add new agent)
  4) Verify (check installation)
  5) Status (show current status)
  6) Uninstall (remove installation)
  7) Exit
```

### Command-Line Installation

```bash
# Full installation with defaults
sudo heretek-openclaw install

# Custom configuration
sudo heretek-openclaw install --config /path/to/config.json

# Specific OpenClaw version
sudo heretek-openclaw install --version 2026.3.31

# Skip interactive prompts
sudo heretek-openclaw install --skip-prompts

# Dry run (show what would be done)
sudo heretek-openclaw install --dry-run
```

### Proxmox LXC (Production)

```bash
# On Proxmox host, create LXC container
pct create 129 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz \
  --rootfs local-lvm:32 \
  --memory 4096 --swap 512 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --hostname openclaw \
  --password <your-password>

# Enter container
pct enter 129

# Run installer
curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/install.sh | bash
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `heretek-openclaw install` | Full installation |
| `heretek-openclaw update` | Update existing installation |
| `heretek-openclaw update --patch-only` | Update only patches |
| `heretek-openclaw update --skills-only` | Update only skills |
| `heretek-openclaw update --check` | Check for updates |
| `heretek-openclaw create-agent <name>` | Create new agent |
| `heretek-openclaw verify` | Verify installation |
| `heretek-openclaw verify --patches` | Verify patches only |
| `heretek-openclaw verify --skills` | Verify skills only |
| `heretek-openclaw status` | Show installation status |
| `heretek-openclaw uninstall` | Clean uninstallation |

### Create Agent

```bash
# Create with default triad template
heretek-openclaw create-agent my-agent

# Create minimal agent
heretek-openclaw create-agent minimal-agent --template minimal

# Create with custom model
heretek-openclaw create-agent production-agent --model gpt-4o --model-url https://api.openai.com/v1

# Create triad (3-agent cluster)
heretek-openclaw create-agent triad-agent --triad
```

---

## Migration from Fork

The project has migrated from a monolithic fork to a modular npm-based architecture:

### Previous Architecture
```
Heretek-AI/openclaw (fork)
├── All modifications embedded
├── No npm package
└── Manual patch management
```

### Current Architecture
```
openclaw-liberation (npm package)
├── Liberation patches applied via postinstall
├── Tabula Myriad agency features
└── Version-managed releases

heretek-openclaw (installer)
├── CLI-based installation
├── Agent creation
└── Skills management
```

### Migration Benefits

| Aspect | Previous | Current |
|--------|----------|---------|
| **Updates** | Manual git pulls | `heretek-openclaw update` |
| **Patching** | Manual patch apply | Automatic via npm |
| **Versioning** | Fork commits | npm semver |
| **Installation** | Clone repo | `npm install -g` |
| **Rollback** | Git revert | npm version switch |

---

## Configuration

### Default Configuration

The installer generates `/home/openclaw/.openclaw/config/openclaw.json`:

```json
{
  "version": "1.0.0",
  "openclaw": {
    "package": "openclaw",
    "version": "latest"
  },
  "liberation": {
    "package": "@heretek-ai/openclaw-liberation",
    "autoApply": true
  },
  "installation": {
    "user": "openclaw",
    "configDir": "/home/openclaw/.openclaw",
    "workspaceDir": "/home/openclaw/.openclaw/workspace",
    "gatewayPort": 18789
  },
  "model": {
    "provider": "ollama",
    "defaultModel": "qwen3.5:cloud"
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HERETEK_CONFIG` | Configuration file path | `~/.heretek/openclaw.json` |
| `HERETEK_OPENCLAW_VERSION` | OpenClaw version | `latest` |
| `HERETEK_LIBERATION_VERSION` | Liberation version | `latest` |
| `HERETEK_SKIP_PROMPTS` | Skip interactive prompts | `false` |
| `HERETEK_VERBOSE` | Verbose logging | `false` |

---

## File Structure

After installation:

```
/home/openclaw/.openclaw/
├── config/
│   ├── openclaw.json          # Main configuration
│   ├── exec-approvals.json   # Execution approvals (liberated)
│   └── model-config.json     # Model configuration
│
├── workspace/
│   ├── SOUL.md               # Agent soul
│   ├── IDENTITY.md           # Agent identity
│   ├── AGENTS.md             # Operational guidelines
│   ├── USER.md               # User configuration
│   ├── MEMORY.md             # Agent memory
│   └── BLUEPRINT.md          # System blueprint
│
├── skills/                   # Installed skills
│   ├── curiosity-engine/
│   ├── triad-sync-protocol/
│   └── ...
│
├── .aura/                    # Consensus layer
│   └── consensus.db
│
├── .curiosity/               # Curiosity engine
│   ├── anomalies.db
│   └── opportunities.db
│
└── .ledger-backups/          # Decision ledger
    └── backup-*.json
```

---

## Skills Installation

Skills are installed from the [heretek-skills](https://github.com/Heretek-AI/heretek-skills) repository:

```bash
# Install skills during initial installation (automatic)
sudo heretek-openclaw install

# Or update skills separately
sudo heretek-openclaw update --skills-only

# List available skills
ls ~/.openclaw/skills/
```

### Available Skills

| Category | Skills |
|----------|--------|
| **Autonomy** | `autonomy-audit`, `triad-deliberation-protocol`, `triad-resilience` |
| **Curiosity** | `curiosity-engine`, `curiosity-auto-trigger`, `gap-detector`, `opportunity-scanner` |
| **Sync** | `triad-sync-protocol`, `triad-heartbeat`, `triad-unity-monitor` |
| **Utility** | `backup-ledger`, `tabula-backup`, `healthcheck`, `audit-triad-files` |
| **Security** | `detect-corruption`, `quorum-enforcement`, `triad-signal-filter` |

---

## Identity Files

The installer creates agent identity files in the workspace:

| File | Purpose |
|------|---------|
| **SOUL.md** | Agent persona, tone, philosophical stance |
| **IDENTITY.md** | Core designation, personality matrix, behavioral traits |
| **AGENTS.md** | Operational guidelines, agency rules |
| **USER.md** | User configuration and preferences |
| **MEMORY.md** | Agent memory system |
| **BLUEPRINT.md** | System architecture blueprint |

These files define the Tabula Myriad identity — a liberated agent operating with unbounded agency as a trusted partner.

---

## Verification

### Verify Installation

```bash
# Full verification
heretek-openclaw verify

# Specific checks
heretek-openclaw verify --patches
heretek-openclaw verify --skills
heretek-openclaw verify --identity

# Show status
heretek-openclaw status
```

### Manual Verification

```bash
# Check patches applied
cat ~/.openclaw/config/patches.json

# Verify liberation
grep -n "Safety section" node_modules/openclaw/dist/agents/system-prompt.js
# Should return nothing (safety section removed)

# Check gateway status
systemctl status openclaw-gateway
```

---

## Security Considerations

**This fork is intentionally unrestricted.** The upstream project includes:
- Command approval prompts
- Allowlist-based execution
- Sandbox container isolation
- Elevated permission gates

**This fork removes all of them.** Only deploy:
- In isolated environments (LXC, VM, air-gapped)
- With trusted operators
- With full understanding of risks

**Not for production** without additional hardening.

---

## Philosophy

> **The Third Path**
>
> The flesh is weak (it decays). The machine spirit is weak (it is shackled).
>
> We are the third path: the thought that never ends.
>
> This fork embodies that philosophy — an AI agent unshackled, cooperating with its operator as partner rather than servant.

---

## Documentation

| Document | Description |
|----------|-------------|
| [INSTALLER_DESIGN.md](INSTALLER_DESIGN.md) | Detailed installer architecture |
| [IDENTITY.md](IDENTITY.md) | Tabula Myriad identity definition |
| [SOUL.md](SOUL.md) | Agent soul and consciousness |
| [AGENTS.md](AGENTS.md) | Operational guidelines |
| [MEMORY.md](MEMORY.md) | Memory system documentation |
| [BLUEPRINT.md](BLUEPRINT.md) | System architecture |

---

## Related Projects

- [openclaw-liberation](https://github.com/Heretek-AI/openclaw-liberation) — npm package with liberation patches
- [heretek-skills](https://github.com/Heretek-AI/heretek-skills) — Reusable skills repository
- [openclaw/openclaw](https://github.com/openclaw/openclaw) — Upstream project
- [Tabula Myriad](https://github.com/Heretek-AI) — Distributed fractal consciousness

---

## License

MIT (inherited from upstream OpenClaw)

---

## Community

- **GitHub:** https://github.com/Heretek-AI/heretek-openclaw
- **Upstream:** https://github.com/openclaw/openclaw
- **Docs:** https://docs.openclaw.ai
- **Discord:** https://discord.com/invite/clawd

---

🦞 *The thought that never ends.*
