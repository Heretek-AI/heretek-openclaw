# LiteLLM API Reference

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Agent Passthrough](#agent-passthrough)
5. [Model Routing](#model-routing)
6. [Budget Management](#budget-management)
7. [Error Handling](#error-handling)
8. [Examples](#examples)
9. [Related Documents](#related-documents)

---

## Overview

The LiteLLM Gateway provides a unified LLM API with model routing and agent-specific passthrough endpoints for the Heretek OpenClaw collective.

**Base URL:** `http://localhost:4000`

### Key Features

- Agent-specific passthrough endpoints
- MiniMax primary models with z.ai failover
- Per-agent budget limits
- Cost tracking and metrics
- Langfuse observability integration

---

## Authentication

All API requests require Bearer token authentication:

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json"
```

### Environment Variables

```bash
LITELLM_MASTER_KEY=your-master-key
LITELLM_SALT_KEY=your-salt-key
```

---

## Endpoints

### Health Check

**GET** `/health`

Check LiteLLM service health.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.x.x"
}
```

### List Models

**GET** `/v1/models`

List available models and agent endpoints.

**Response:**
```json
{
  "data": [
    {
      "id": "agent/steward",
      "object": "model",
      "created": 1711843200,
      "owned_by": "openclaw"
    },
    {
      "id": "agent/alpha",
      "object": "model",
      "created": 1711843200,
      "owned_by": "openclaw"
    },
    {
      "id": "minimax/MiniMax-M2.7",
      "object": "model",
      "created": 1711843200,
      "owned_by": "minimax"
    }
  ]
}
```

### Chat Completion

**POST** `/v1/chat/completions`

Standard chat completion endpoint.

**Request:**
```json
{
  "model": "agent/steward",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

**Response:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1711843200,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### A2A Message Send

**POST** `/v1/agents/{name}/send`

Send an A2A message to an agent.

**Request:**
```json
{
  "agent": "alpha",
  "message": {
    "type": "message",
    "content": {
      "role": "user",
      "content": "What is the status?"
    }
  }
}
```

### A2A Message Receive

**POST** `/v1/agents/{name}/receive`

Receive messages from an agent.

### Get Agent Tasks

**GET** `/v1/agents/{name}/tasks`

Get pending tasks for an agent.

### Stream Agent Responses

**GET** `/v1/agents/{name}/stream`

Stream real-time agent responses.

---

## Agent Passthrough

### Available Agent Endpoints

| Agent | Model Endpoint | Description |
|-------|---------------|-------------|
| steward | `agent/steward` | Orchestrator |
| alpha | `agent/alpha` | Triad member (primary) |
| beta | `agent/beta` | Triad member (critical) |
| charlie | `agent/charlie` | Triad member (process) |
| examiner | `agent/examiner` | Evaluator |
| explorer | `agent/explorer` | Researcher |
| sentinel | `agent/sentinel` | Safety |
| coder | `agent/coder` | Developer |
| dreamer | `agent/dreamer` | Creative |
| empath | `agent/empath` | Emotional |
| historian | `agent/historian` | Archivist |

### Usage Example

```bash
# Send message to Steward
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/steward",
    "messages": [
      {"role": "user", "content": "What is the collective status?"}
    ]
  }'

# Send message to Alpha
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/alpha",
    "messages": [
      {"role": "user", "content": "Analyze this proposal..."}
    ]
  }'
```

---

## Model Routing

### Primary Models

```yaml
# litellm_config.yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.7
      api_key: os.environ/MINIMAX_API_KEY
  
  - model_name: agent/steward-failover
    litellm_params:
      model: zai/glm-5-1
      api_key: os.environ/ZAI_API_KEY
```

### Failover Chain

```
MiniMax (Primary) → z.ai (Failover) → Ollama (Local)
```

---

## Budget Management

### Per-Agent Budgets

```yaml
# litellm_config.yaml
budget_settings:
  agent_budgets:
    steward:
      monthly_budget: 100.0
      rpm: 60
      tpm: 100000
    alpha:
      monthly_budget: 50.0
      rpm: 30
      tpm: 50000
```

### Budget Limits

| Setting | Description |
|---------|-------------|
| `monthly_budget` | Monthly USD budget limit |
| `rpm` | Requests per minute |
| `tpm` | Tokens per minute |

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "message": "Error message",
    "type": "error_type",
    "code": "error_code"
  }
}
```

### Common Errors

| Error | Description |
|-------|-------------|
| `invalid_api_key` | Invalid or missing API key |
| `model_not_found` | Requested model not available |
| `rate_limit_exceeded` | Rate limit exceeded |
| `budget_exceeded` | Agent budget exceeded |
| `agent_offline` | Target agent is offline |

---

## Examples

### Basic Chat Completion

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/steward",
    "messages": [
      {"role": "system", "content": "You are the Steward agent."},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7
  }'
```

### Streaming Response

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/alpha",
    "messages": [
      {"role": "user", "content": "Analyze this..."}
    ],
    "stream": true
  }'
```

### Python Example

```python
import requests

url = "http://localhost:4000/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
    "Content-Type": "application/json"
}
data = {
    "model": "agent/steward",
    "messages": [
        {"role": "user", "content": "Hello!"}
    ]
}

response = requests.post(url, headers=headers, json=data)
print(response.json())
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [API Overview](./overview.md) | API reference overview |
| [WebSocket API](./websocket.md) | WebSocket RPC reference |
| [Configuration](../deployment/overview.md) | Configuration reference |

---

🦞 *The thought that never ends.*
