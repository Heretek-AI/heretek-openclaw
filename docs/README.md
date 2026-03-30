# OpenClaw Documentation

## Overview

OpenClaw is a multi-agent AI collective with 11 specialized agents communicating via Redis Pub/Sub for Agent-to-Agent (A2A) coordination.

## Documentation Index

### Architecture
- [`A2A_ARCHITECTURE.md`](docs/architecture/A2A_ARCHITECTURE.md) - Agent-to-Agent communication protocol
- [`REDIS_A2A_ARCHITECTURE.md`](docs/architecture/REDIS_A2A_ARCHITECTURE.md) - Redis Pub/Sub architecture details

### API Reference
- [`LITELLM_API.md`](docs/api/LITELLM_API.md) - LiteLLM gateway API endpoints
- [`WEBSOCKET_API.md`](docs/api/WEBSOCKET_API.md) - WebSocket bridge API

### System Components

#### Agents (11)
| Agent | Role | Port | Model Endpoint |
|-------|------|------|----------------|
| steward | orchestrator | 8001 | agent/steward |
| alpha | triad_member | 8002 | agent/alpha |
| beta | triad_member | 8003 | agent/beta |
| charlie | triad_member | 8004 | agent/charlie |
| examiner | evaluator | 8005 | agent/examiner |
| explorer | researcher | 8006 | agent/explorer |
| sentinel | safety | 8007 | agent/sentinel |
| coder | developer | 8008 | agent/coder |
| dreamer | creative | 8009 | agent/dreamer |
| empath | emotional | 8010 | agent/empath |
| historian | historical | 8011 | agent/historian |

#### Services
- **LiteLLM Gateway** - Port 4000, unified LLM API with agent passthrough
- **Redis** - Port 6379, A2A communication backbone
- **Web Interface** - Port 3000, SvelteKit dashboard
- **WebSocket Bridge** - Port 3002/3003, Redis-to-WebSocket bridge
- **Langfuse** - Observability (optional)

## Quick Reference

### Redis A2A Channels
```
agent:a2a              # General A2A messages
agent:status           # Agent status updates
agent:message          # Chat messages
agent:activity         # Activity tracking
agent:{name}:inbox     # Per-agent inbox
```

### LiteLLM Agent Endpoints
```
http://litellm:4000/v1/chat/completions
Model: agent/{name} (e.g., agent/steward, agent/alpha)
```

### Environment Variables
```bash
# LiteLLM
LITELLM_HOST=http://litellm:4000
LITELLM_API_KEY=<master_key>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Langfuse (optional)
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=<key>
LANGFUSE_SECRET_KEY=<key>
LANGFUSE_HOST=https://cloud.langfuse.com
```

## File Structure
```
heretek-openclaw/
├── agents/              # Agent identity files
├── modules/             # Core modules (consciousness, memory, etc.)
├── web-interface/       # SvelteKit web UI
├── skills/              # Agent skills repository
├── docs/                # Documentation
├── docker-compose.yml   # Main orchestration
├── litellm_config.yaml  # LiteLLM configuration
└── openclaw.json        # System configuration
```
