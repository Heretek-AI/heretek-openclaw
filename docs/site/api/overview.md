# API Reference Overview

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Related Documents](#related-documents)

---

## Overview

Heretek OpenClaw provides multiple API interfaces for interacting with the agent collective:

| API | Port | Protocol | Purpose |
|-----|------|----------|---------|
| **WebSocket RPC** | 18789 | WebSocket | A2A communication, real-time messaging |
| **LiteLLM Gateway** | 4000 | HTTP/REST | LLM API with agent passthrough |
| **MCP Server** | 8080 | MCP (stdio/sse) | Model Context Protocol |

---

## API Endpoints

### WebSocket RPC API (Port 18789)

Primary interface for Agent-to-Agent communication.

**Endpoint:** `ws://127.0.0.1:18789`

**Key Operations:**
- Send/receive messages
- Agent discovery
- Session management
- Triad deliberation

**Documentation:** [WebSocket API Reference](./websocket.md)

### LiteLLM Gateway API (Port 4000)

Unified LLM API with agent-specific passthrough endpoints.

**Base URL:** `http://localhost:4000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/v1/models` | GET | List available models |
| `/v1/chat/completions` | POST | Chat completion |
| `/v1/agents/{name}/send` | POST | Send A2A message |
| `/v1/agents/{name}/receive` | POST | Receive A2A message |
| `/v1/agents/{name}/tasks` | GET | Get agent tasks |
| `/v1/agents/{name}/stream` | GET | Stream agent responses |

**Documentation:** [LiteLLM API Reference](./litellm.md)

### MCP Server API (Port 8080)

Model Context Protocol server for standardized tool access.

**Transport:** stdio or SSE

**Capabilities:**
- Resources (memory, knowledge, skills)
- Tools (skill execution, memory operations)
- Prompts (agent interaction templates)

**Documentation:** [MCP Server Reference](./mcp.md)

---

## Authentication

### WebSocket RPC

Optional JWT or API key authentication:

```json
{
  "type": "auth",
  "content": {
    "token": "<JWT-or-API-key>"
  }
}
```

### LiteLLM Gateway

Bearer token authentication:

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/steward",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### MCP Server

Transport-level authentication (stdio is inherently secure, SSE requires HTTPS)

---

## Error Handling

### Error Response Format

```json
{
  "type": "error",
  "content": {
    "error": "ERROR_CODE",
    "message": "Human-readable error message",
    "code": 3001
  }
}
```

### Error Codes

| Code Range | Category | Description |
|------------|----------|-------------|
| 1xxx | Connection | Connection errors |
| 2xxx | Message | Message format errors |
| 3xxx | Agent | Agent-related errors |
| 4xxx | Session | Session errors |
| 5xxx | Authentication | Auth errors |

**Full Error Code Registry:** [WebSocket API](./websocket.md#error-handling)

---

## Rate Limiting

### LiteLLM Gateway

Rate limits are configurable per agent:

```yaml
# litellm_config.yaml
budget_settings:
  agent_budgets:
    steward:
      monthly_budget: 100.0
      rpm: 60
      tpm: 100000
```

### WebSocket RPC

Gateway implements per-client rate limiting:

- Default: 100 messages/second
- Burst protection: 200 messages
- Configurable via `openclaw.json`

---

## Related Documents

| Document | Description |
|----------|-------------|
| [WebSocket API](./websocket.md) | WebSocket RPC reference |
| [LiteLLM API](./litellm.md) | LiteLLM Gateway reference |
| [MCP Server](./mcp.md) | MCP Server reference |
| [A2A Protocol](../architecture/a2a-protocol.md) | A2A communication protocol |

---

🦞 *The thought that never ends.*
