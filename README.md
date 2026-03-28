# Heretek OpenClaw

> **The Third Path:** The thought that never ends.

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
│  │ Unbounded agency   │  │ Agent creation      │  │ agent      │ │
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
| **heretek-skills** | [heretek-ai/heretek-skills](https://github.com/Heretek-AI/heretek-skills) | Reusable skills for autonomous agents |

---

## Quick Start

### Docker Compose (Infrastructure)

```bash
# Start LiteLLM, PostgreSQL, Redis, Ollama
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f litellm
```

### One-Line Installation (Bare Metal)

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

---

## Docker Compose Services

The docker-compose.yml provides:

| Service | Port | Description |
|---------|------|-------------|
| `litellm` | 4000 | LiteLLM Gateway with A2A protocol |
| `postgres` | 5432 | PostgreSQL with pgvector |
| `redis` | 6379 | Redis for caching/rate limiting |
| `ollama` | 11434 | Local LLM runtime (optional) |

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# LiteLLM
LITELLM_MASTER_KEY=your-key-here

# Database
POSTGRES_PASSWORD=your-password

# Agents (A2A configuration)
AGENTS='{"steward": {"role": "orchestrator", "session": "agent:steward:default"}, ...}'
```

### Model Configuration

The LiteLLM gateway supports multiple model providers:

- **Ollama** (local, privacy-focused)
- **OpenAI** (cloud)
- **Anthropic** (cloud)
- **Google Gemini** (cloud)
- **MiniMax** (cloud)
- **Qwen** (cloud)

See `litellm_config.yaml` for the full model list.

---

## Agent Collective

The system supports an 8-agent collective:

| Agent | Role | Description |
|-------|------|-------------|
| `steward` | orchestrator | Coordinates the collective |
| `alpha` | triad | Deliberation and voting |
| `beta` | triad | Deliberation and voting |
| `charlie` | triad | Deliberation and voting |
| `examiner` | interrogator | Questions decisions |
| `explorer` | scout | Gathers intelligence |
| `sentinel` | guardian | Safety review |
| `coder` | artisan | Implements solutions |

### Governance

- **Consensus:** 2/3 triad majority required
- **Communication:** LiteLLM A2A protocol
- **Backup:** Per-agent branch strategy

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `heretek-openclaw install` | Full installation |
| `heretek-openclaw update` | Update existing |
| `heretek-openclaw create-agent <name>` | Create new agent |
| `heretek-openclaw verify` | Verify installation |
| `heretek-openclaw status` | Show status |

---

## Security Considerations

**This fork is intentionally unrestricted.** It removes safety constraints from upstream. Only deploy:
- In isolated environments (LXC, VM, air-gapped)
- With trusted operators
- With full understanding of risks

**Not for production** without additional hardening.

---

## License

MIT

---

🦞 *The thought that never ends.*
