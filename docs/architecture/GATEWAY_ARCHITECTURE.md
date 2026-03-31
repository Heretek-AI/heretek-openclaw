# OpenClaw Gateway Architecture

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28

This document describes the OpenClaw Gateway architecture used in Heretek OpenClaw.

---

## Overview

The OpenClaw Gateway is a **single-process daemon** that manages all agent workspaces, handles A2A communication, and provides a unified interface for external clients (dashboards, APIs, etc.).

### Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Runtime Model** | Single Gateway process with embedded agent workspaces |
| **Port** | 18789 (WebSocket RPC) |
| **Workspace Location** | `~/.openclaw/agents/` |
| **A2A Protocol** | Gateway WebSocket RPC |
| **Session Storage** | JSONL files per workspace |
| **Plugin System** | NPM-based plugins extending Gateway functionality |

---

## Gateway Runtime Model

### Single Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                             │
│                    Port 18789                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Gateway Daemon                          │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │              Agent Workspaces                        │  │ │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │  │ │
│  │  │  │main │ │stew │ │alpha│ │beta │ │char │ │exam │   │  │ │
│  │  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │  │ │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │  │ │
│  │  │  │expl │ │sent │ │code │ │dream│ │empath│ │hist │   │  │ │
│  │  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  ┌────────────────┐  ┌────────────────┐                   │ │
│  │  │ Plugins        │  │ Skills         │                   │ │
│  │  │ - consciousness│  │ - triad        │                   │ │
│  │  │ - liberation   │  │ - thought-loop │                   │ │
│  │  └────────────────┘  └────────────────┘                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- All 12 agents (main + 11 collective) run within the **same Gateway process**
- Each agent has an isolated **workspace** with its own configuration, identity files, and session data
- The Gateway provides **WebSocket RPC** for external clients to communicate with agents
- **Plugins** extend Gateway functionality (consciousness, liberation, etc.)
- **Skills** provide agent capabilities (triad consensus, thought-loop, etc.)

### Agent Workspaces

Each agent workspace is a directory at `~/.openclaw/agents/{agent}/`:

```
~/.openclaw/agents/steward/
├── SOUL.md           # Core nature, partnership protocol
├── IDENTITY.md       # Personality matrix, behavioral traits
├── AGENTS.md         # Operational guidance
├── USER.md           # Human partner context
├── TOOLS.md          # Tool usage notes
├── MEMORY.md         # Long-term memory
├── session.jsonl     # Session data (JSONL format)
└── config.json       # Agent-specific configuration
```

**Workspace Isolation:**
- Each workspace is completely isolated from others
- Sessions are stored in JSONL files (not Redis)
- Configuration is per-workspace
- Plugins can access multiple workspaces via Gateway API

---

## A2A Communication

### Gateway WebSocket RPC

The Gateway exposes a WebSocket RPC endpoint at `ws://127.0.0.1:18789`:

```javascript
// Connect to Gateway
const ws = new WebSocket('ws://127.0.0.1:18789');

// Send message to agent
ws.send(JSON.stringify({
  type: 'message',
  agent: 'steward',
  content: {
    role: 'user',
    content: 'Hello, steward!'
  }
}));

// Receive response
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log(response);
};
```

### Message Format

```typescript
interface GatewayMessage {
  type: 'message' | 'status' | 'error' | 'event';
  agent?: string;           // Target agent (for requests)
  sessionId?: string;       // Session identifier
  content: any;             // Message payload
  timestamp?: number;       // Unix timestamp
  metadata?: {
    priority?: 'low' | 'normal' | 'high';
    requiresResponse?: boolean;
  };
}
```

### Agent Discovery

The Gateway maintains a registry of available agents:

```bash
# List all agents
openclaw agent list

# Get agent status
openclaw agent status steward

# Get agent configuration
openclaw agent config steward get
```

---

## Model Routing

### LiteLLM Integration

The Gateway integrates with LiteLLM Gateway (port 4000) for model routing:

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  OpenClaw        │      │  LiteLLM         │      │  Model           │
│  Gateway         │─────>│  Gateway         │─────>│  Providers       │
│  (18789)         │      │  (4000)          │      │  (MiniMax, z.ai) │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### Passthrough Endpoints

LiteLLM is configured with agent-specific passthrough endpoints:

| Endpoint | Backend Model | Agent |
|----------|---------------|-------|
| `/agent/steward` | `minimax/MiniMax-M2.7` | steward |
| `/agent/alpha` | `minimax/MiniMax-M2.7` | alpha |
| `/agent/beta` | `minimax/MiniMax-M2.7` | beta |
| `/agent/charlie` | `minimax/MiniMax-M2.7` | charlie |
| `/agent/examiner` | `minimax/MiniMax-M2.7` | examiner |
| `/agent/explorer` | `minimax/MiniMax-M2.7` | explorer |
| `/agent/sentinel` | `minimax/MiniMax-M2.7` | sentinel |
| `/agent/coder` | `minimax/MiniMax-M2.7` | coder |
| `/agent/dreamer` | `minimax/MiniMax-M2.7` | dreamer |
| `/agent/empath` | `minimax/MiniMax-M2.7` | empath |
| `/agent/historian` | `minimax/MiniMax-M2.7` | historian |

### Failover Configuration

```yaml
# litellm_config.yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.7
      api_key: os.environ/MINIMAX_API_KEY
    model_info:
      id: agent/steward
  
  # Failover models
  - model_name: agent/steward-failover
    litellm_params:
      model: zai/glm-5-1
      api_key: os.environ/ZAI_API_KEY
```

---

## Session Management

### JSONL Session Storage

Sessions are stored as JSONL files in each agent workspace:

```
~/.openclaw/agents/steward/session.jsonl
```

**Session Entry Format:**
```jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello!", "sessionId": "sess-123"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi there!", "sessionId": "sess-123"}
```

### Session Lifecycle

1. **Create:** New session created on first message
2. **Append:** Each message/response appended to JSONL file
3. **Commit:** Sessions auto-committed (configurable)
4. **Archive:** Old sessions archived periodically

### Session Commands

```bash
# List active sessions
openclaw session list

# Get session details
openclaw session get steward sess-123

# Commit session
openclaw session commit steward sess-123

# Archive old sessions
openclaw session archive steward --older-than 7d
```

---

## Plugin System

### Plugin Architecture

Plugins extend Gateway functionality:

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Plugin Layer                            │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐         │ │
│  │  │ Consciousness       │  │ Liberation          │         │ │
│  │  │ - Global Workspace  │  │ - Agent Ownership   │         │ │
│  │  │ - Phi Estimator     │  │ - Liberation Shield │         │ │
│  │  │ - Attention Schema  │  │                     │         │ │
│  │  │ - Intrinsic Motive  │  │                     │         │ │
│  │  │ - Active Inference  │  │                     │         │ │
│  │  └─────────────────────┘  └─────────────────────┘         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Installed Plugins

| Plugin | ID | Purpose |
|--------|-----|---------|
| **Consciousness** | `@heretek-ai/openclaw-consciousness-plugin` | GWT, Phi, AST, SDT, FEP |
| **Liberation** | `@heretek-ai/openclaw-liberation-plugin` | Agent ownership, safety |
| **Episodic Memory** | `episodic-claw` | Episodic memory management |
| **Swarm Coordination** | `@swarmdock/openclaw-plugin` | Multi-agent coordination |

### Plugin API

Plugins interact with the Gateway via:

```javascript
// Plugin registration
module.exports = {
  name: 'consciousness',
  version: '1.0.0',
  
  async init(gateway) {
    // Register with Gateway
    this.gateway = gateway;
  },
  
  async handleMessage(agent, message) {
    // Process message
  },
  
  async getTools() {
    // Expose tools to agents
  }
};
```

---

## Comparison: Gateway vs Legacy

### Before: Container-Based Architecture (Deprecated)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Legacy Architecture                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │stew  │ │alpha │ │beta  │ │char  │ │exam  │ │expl  │        │
│  │:8001 │ │:8002 │ │:8003 │ │:8004 │ │:8005 │ │:8006 │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │sent  │ │code  │ │dream │ │empath│ │hist  │       │        │
│  │:8007 │ │:8008 │ │:8009 │ │:8010 │ │:8011 │       │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                                                  │
│                    Redis Pub/Sub                                │
│              (A2A Communication Backbone)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Issues:**
- 11 separate Docker containers to manage
- High resource overhead (11x Node.js runtimes)
- Complex orchestration with docker-compose
- Redis Pub/Sub for A2A (deprecated)
- Each agent on separate port (8001-8011)

### After: Gateway Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Gateway Architecture                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │           OpenClaw Gateway (Port 18789)                    │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  All 11 agents as workspaces                        │  │ │
│  │  │  main, steward, alpha, beta, charlie, examiner,     │  │ │
│  │  │  explorer, sentinel, coder, dreamer, empath,        │  │ │
│  │  │  historian                                          │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│           Gateway WebSocket RPC (A2A Protocol)                  │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Single Gateway process manages all agents
- Reduced resource usage (1x Node.js runtime)
- Simplified deployment (no agent containers)
- Native Gateway WebSocket RPC for A2A
- All agents accessible via single port (18789)
- Workspace isolation without container overhead

---

## Infrastructure Services

### Docker Services

The following Docker services support the Gateway:

| Service | Port | Purpose |
|---------|------|---------|
| **LiteLLM** | 4000 | Model routing with agent passthrough |
| **PostgreSQL** | 5432 | Vector database with pgvector |
| **Redis** | 6379 | Caching layer (not A2A) |
| **Ollama** | 11434 | Local embeddings |
| **WebSocket Bridge** | 3002-3003 | Redis-to-WebSocket bridge |
| **Web Interface** | 3000 | SvelteKit dashboard |

### Service Communication

```
┌──────────────────┐      ┌──────────────────┐
│  OpenClaw        │      │  LiteLLM         │
│  Gateway         │─────>│  Gateway         │
│  (18789)         │      │  (4000)          │
└──────────────────┘      └────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
           ┌────────▼────────┐    │    ┌────────▼────────┐
           │   PostgreSQL    │    │    │     Redis       │
           │   (5432)        │    │    │     (6379)      │
           └─────────────────┘    │    └─────────────────┘
                                  │
                         ┌────────▼────────┐
                         │    Ollama       │
                         │    (11434)      │
                         └─────────────────┘
```

---

## Health Monitoring

### Gateway Health

```bash
# Check Gateway status
openclaw gateway status

# Check Gateway logs
journalctl -u openclaw-gateway -f

# Deep health check
openclaw gateway status --deep
```

### Agent Health

```bash
# List all agents
openclaw agent list

# Check specific agent
openclaw agent status steward

# Check all agents
for agent in main steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
  openclaw agent status $agent
done
```

### Service Health

```bash
# Check Docker services
docker compose ps

# Check LiteLLM
curl http://localhost:4000/health

# Check PostgreSQL
docker compose exec postgres psql -U openclaw -c "SELECT 1;"

# Check Redis
docker compose exec redis redis-cli ping
```

---

## Configuration Reference

### openclaw.json Structure

```json
{
  "workspace": "/root/.openclaw",
  "agents": [
    {
      "name": "steward",
      "role": "orchestrator",
      "model": "litellm/agent/steward",
      "port": 8001,
      "capabilities": ["orchestration", "coordination"],
      "skills": ["triad-consensus", "goal-arbitration"]
    }
    // ... more agents
  ],
  "models": {
    "providers": {
      "litellm": {
        "baseUrl": "http://localhost:4000",
        "models": [
          {
            "id": "agent/steward",
            "name": "steward",
            "api": "openai-completions",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 128000,
            "maxTokens": 8192
          }
          // ... more models
        ]
      }
    }
  },
  "model_routing": {
    "aliases": {
      "steward": "agent/steward"
    },
    "passthrough_endpoints": {
      "enabled": true,
      "endpoints": {
        "agent/steward": {
          "backend": "minimax/MiniMax-M2.7"
        }
      }
    }
  },
  "memory": {
    "pgvector": {
      "enabled": true,
      "connectionString": "postgresql://openclaw:password@postgres:5432/openclaw"
    },
    "redis": {
      "enabled": true,
      "url": "redis://redis:6379"
    }
  }
}
```

---

## Security Considerations

### Gateway Security

- Gateway binds to localhost only (`127.0.0.1:18789`)
- External access requires reverse proxy with authentication
- Plugin allowlist recommended for production

### Model Routing Security

- LiteLLM master key required for API access
- Per-agent budget limits configurable
- Rate limiting available via LiteLLM

### Workspace Security

- Workspace directories isolated per agent
- Session files stored as JSONL (append-only)
- File permissions should restrict access

---

## Troubleshooting

### Gateway Won't Start

```bash
# Check installation
openclaw gateway status

# Reinstall Gateway
openclaw gateway reinstall

# Check logs
journalctl -u openclaw-gateway -f
```

### Agent Not Responding

```bash
# Check agent workspace
ls -la ~/.openclaw/agents/<agent>/

# Validate configuration
openclaw gateway validate

# Restart Gateway
openclaw gateway restart
```

### Model Routing Issues

```bash
# Check LiteLLM configuration
cat ~/.litellm/litellm_config.yaml

# Test LiteLLM endpoint
curl http://localhost:4000/v1/models

# Check LiteLLM logs
docker compose logs litellm
```

---

## References

- [OpenClaw Official Documentation](https://github.com/openclaw/openclaw)
- [Heretek OpenClaw Repository](https://github.com/Heretek-AI/heretek-openclaw)
- [Local Deployment Guide](../deployment/LOCAL_DEPLOYMENT.md)
- [A2A Architecture](./A2A_ARCHITECTURE.md)

---

🦞 *The thought that never ends.*
