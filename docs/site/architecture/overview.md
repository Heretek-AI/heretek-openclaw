# System Architecture Overview

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Diagram](#system-architecture-diagram)
3. [Component Overview](#component-overview)
4. [Agent Architecture](#agent-architecture)
5. [Communication Protocols](#communication-protocols)
6. [Plugin Architecture](#plugin-architecture)
7. [Session Management](#session-management)
8. [Configuration Files](#configuration-files)
9. [Related Documents](#related-documents)

---

## Executive Summary

Heretek OpenClaw is a multi-agent AI collective built on the **OpenClaw Gateway v2026.3.28** architecture. The system comprises **11 specialized agents** that communicate via **Gateway WebSocket RPC** for Agent-to-Agent (A2A) coordination, with **LiteLLM Gateway** handling model routing and **PostgreSQL + pgvector** providing vector database capabilities.

### Key Architectural Decisions

1. **Single-Process Gateway:** All 11 agents run as workspaces within a single Gateway process (port 18789), eliminating the overhead of 11 separate containers.

2. **Gateway WebSocket RPC:** Native A2A communication protocol replacing Redis Pub/Sub, providing real-time message passing with automatic session persistence.

3. **LiteLLM Integration:** Model routing with agent-specific passthrough endpoints, enabling per-agent model assignment without configuration changes.

4. **Vector Database:** PostgreSQL with pgvector extension for RAG (Retrieval Augmented Generation) and semantic memory.

5. **Plugin Architecture:** NPM-based plugins extending Gateway functionality (consciousness, liberation, hybrid search, etc.).

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Heretek OpenClaw Stack                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Core Services                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │   │
│  │  │ LiteLLM  │  │PostgreSQL│  │  Redis   │  │     Ollama       │    │   │
│  │  │  :4000   │  │  :5432   │  │  :6379   │  │  :11434 (AMD)    │    │   │
│  │  │ Gateway  │  │ +pgvector│  │  Cache   │  │  Local LLM       │    │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │   │
│  │       │             │             │                 │              │   │
│  └───────┼─────────────┼─────────────┼─────────────────┼──────────────┘   │
│          │             │             │                 │                  │
│  ┌───────▼─────────────▼─────────────▼─────────────────▼──────────────┐   │
│  │                  OpenClaw Gateway (Port 18789)                      │   │
│  │  All 11 agents run as workspaces within Gateway process            │   │
│  │  Agent workspaces: ~/.openclaw/agents/{agent}/                     │   │
│  │                                                                     │   │
│  │  Agents: steward, alpha, beta, charlie, examiner, explorer,        │   │
│  │          sentinel, coder, dreamer, empath, historian               │   │
│  │                                                                     │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                  │   │
│  │  │ Plugins             │  │ Skills              │                  │   │
│  │  │ - consciousness     │  │ - triad protocols   │                  │   │
│  │  │ - liberation        │  │ - memory ops        │                  │   │
│  │  │ - hybrid-search     │  │ - autonomy modules  │                  │   │
│  │  └─────────────────────┘  └─────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    External Clients                                  │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │              Web Dashboard (:3000) [Optional]                │  │   │
│  │  │  SvelteKit • TypeScript • TailwindCSS • WebSocket            │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Overview

### 1. OpenClaw Gateway (Port 18789)

**Purpose:** Central daemon managing all agent workspaces and A2A communication.

**Key Features:**
- Single-process runtime with embedded agent workspaces
- WebSocket RPC endpoint at `ws://127.0.0.1:18789`
- Per-workspace JSONL session storage
- Native plugin system
- Agent discovery and registration

**Workspace Location:**
```
~/.openclaw/agents/
├── steward/
├── alpha/
├── beta/
├── charlie/
├── examiner/
├── explorer/
├── sentinel/
├── coder/
├── dreamer/
├── empath/
└── historian/
```

### 2. LiteLLM Gateway (Port 4000)

**Purpose:** Unified LLM API with model routing and agent passthrough endpoints.

**Key Features:**
- Agent-specific passthrough endpoints (`agent/steward`, `agent/alpha`, etc.)
- MiniMax primary models with z.ai failover
- Per-agent budget limits
- Cost tracking and metrics
- Langfuse observability integration

**Endpoints:**
- `GET /health` - Health check
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completion
- `POST /v1/agents/{name}/send` - A2A message send
- `POST /v1/agents/{name}/receive` - A2A message receive

### 3. PostgreSQL + pgvector (Port 5432)

**Purpose:** Vector database for RAG and semantic memory storage.

**Key Features:**
- pgvector extension for vector embeddings
- Collective memory storage
- Decision tracking
- Pattern archiving

**Connection:**
```
postgresql://heretek:password@localhost:5432/heretek
```

### 4. Redis (Port 6379)

**Purpose:** Caching layer only (NOT used for A2A communication).

**Key Features:**
- Session caching
- Rate limiting support
- LiteLLM cache backend

**Note:** Redis Pub/Sub was deprecated for A2A communication in favor of Gateway WebSocket RPC.

### 5. Ollama (Port 11434)

**Purpose:** Local LLM for embeddings and fallback inference.

**Configuration:**
- AMD GPU/ROCm acceleration
- Local embedding generation
- Fallback model provider

---

## Agent Architecture

### Agent Roles

| Agent | Role | Description |
|-------|------|-------------|
| **steward** | orchestrator | Monitors collective health, facilitates communication |
| **alpha** | triad_member | Primary deliberator, consensus participant |
| **beta** | triad_member | Secondary deliberator, consensus participant |
| **charlie** | triad_member | Tertiary deliberator, consensus participant |
| **examiner** | evaluator | Generates questions, challenges decisions |
| **explorer** | researcher | Gathers intelligence, discovers patterns |
| **sentinel** | safety | Reviews safety, enforces constraints |
| **coder** | developer | Implements code, reviews changes |
| **dreamer** | creative | Generates creative solutions, daydreams |
| **empath** | emotional | Processes emotional context, user sentiment |
| **historian** | archivist | Maintains collective memory, tracks decisions |

### Triad Deliberation

Alpha, Beta, and Charlie form the deliberative triad:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Triad Deliberation                            │
│                                                                  │
│  Proposal ──> Alpha ──┐                                         │
│                       │                                         │
│  Proposal ──> Beta ───┼──> 2/3 Consensus ──> Decision          │
│                       │                                         │
│  Proposal ──> Charlie─┘                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Consensus Rule:** 2 of 3 votes required for decision.

---

## Communication Protocols

### Gateway WebSocket RPC (Current)

**Endpoint:** `ws://127.0.0.1:18789`

**Message Format:**
```json
{
  "type": "message",
  "agent": "steward",
  "sessionId": "session-123",
  "content": {
    "role": "user",
    "content": "Hello!"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true
  }
}
```

**Message Types:**
- `message` - Standard agent message
- `status` - Agent status update
- `error` - Error notification
- `event` - Gateway event
- `handshake` - Connection handshake
- `discovery` - Agent/service discovery
- `proposal` - Triad proposal
- `vote` - Triad vote
- `decision` - Triad decision

### Redis Pub/Sub (Legacy - Deprecated)

**Status:** Deprecated, retained for caching only.

**Legacy Channels:**
- `agent:a2a` - General A2A communication
- `agent:status` - Status broadcasting
- `agent:message` - Chat messages

---

## Plugin Architecture

### Installed Plugins

| Plugin | ID | Purpose |
|--------|-----|---------|
| **Consciousness** | `consciousness` | GWT, Phi (IIT), AST, SDT, FEP theories |
| **Liberation** | `liberation` | Agent ownership, safety constraint removal |
| **Hybrid Search** | `hybrid-search` | Vector + keyword search fusion |
| **Multi-Doc Retrieval** | `multi-doc` | Multi-document context retrieval |
| **Skill Extensions** | `skill-extensions` | Custom skill composition and versioning |
| **Episodic Memory** | `episodic-claw` | Episodic memory management |
| **Swarm Coordination** | `swarmclaw` | Multi-agent swarm coordination |

### Plugin API

Plugins interact with Gateway via:

```javascript
module.exports = {
  name: 'consciousness',
  version: '1.0.0',
  
  async init(gateway) {
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

## Session Management

### JSONL Session Storage

Sessions are stored as JSONL files in each agent workspace:

```
~/.openclaw/agents/steward/session.jsonl
```

**Entry Format:**
```jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello!", "sessionId": "sess-123"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi there!", "sessionId": "sess-123"}
```

### Session Lifecycle

1. **Create:** New session created on first message
2. **Append:** Each message/response appended to JSONL file
3. **Commit:** Sessions auto-committed (configurable)
4. **Archive:** Old sessions archived periodically

---

## Configuration Files

### openclaw.json

**Purpose:** Master configuration for OpenClaw Gateway collective.

**Key Sections:**
- `collective` - Collective metadata
- `models` - Model providers and configurations
- `agents` - Agent definitions (11 agents)
- `model_routing` - Routing aliases and passthrough endpoints
- `a2a_protocol` - A2A settings
- `embedding` - Embedding configuration
- `memory` - Memory backend settings
- `skills_repository` - Skills configuration

**Location:** `/root/heretek/heretek-openclaw/openclaw.json`

### litellm_config.yaml

**Purpose:** Complete LiteLLM routing and A2A protocol configuration.

**Key Sections:**
- `model_list` - Model definitions with providers
- `litellm_settings` - Core LiteLLM settings
- `a2a_settings` - A2A protocol configuration
- `budget_settings` - Per-agent budget limits
- `observability` - Langfuse and metrics settings

**Location:** `/root/heretek/heretek-openclaw/litellm_config.yaml`

### docker-compose.yml

**Purpose:** Infrastructure service orchestration.

**Services:**
- litellm (port 4000)
- postgres (port 5432)
- redis (port 6379)
- ollama (port 11434)
- websocket-bridge (ports 3002-3003)
- web (port 3000) - Optional dashboard

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Agents Documentation](./agents.md) | Detailed agent collective documentation |
| [A2A Protocol](./a2a-protocol.md) | Complete A2A communication protocol |
| [Triad Protocol](./triad.md) | Triad deliberation protocol |
| [Plugins Overview](../plugins/overview.md) | Plugin system documentation |

---

🦞 *The thought that never ends.*
