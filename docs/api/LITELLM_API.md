# LiteLLM Gateway API

## Overview

The LiteLLM gateway provides a unified API interface for all 11 agents in the OpenClaw collective. Each agent has a dedicated virtual model endpoint that can be reassigned via the LiteLLM WebUI without configuration changes.

## Configuration

**Host:** `http://litellm:4000` (Docker) or `http://localhost:4000` (local)

**Authentication:** Bearer token via `LITELLM_MASTER_KEY` environment variable

## Agent Endpoints

### Chat Completions Endpoint

All agents use the standard OpenAI-compatible chat completions endpoint:

```
POST /v1/chat/completions
```

### Agent Model Names

Each agent has a dedicated virtual model:

| Agent | Model Name | Role |
|-------|------------|------|
| steward | `agent/steward` | orchestrator |
| alpha | `agent/alpha` | triad_member |
| beta | `agent/beta` | triad_member |
| charlie | `agent/charlie` | triad_member |
| examiner | `agent/examiner` | evaluator |
| explorer | `agent/explorer` | researcher |
| sentinel | `agent/sentinel` | safety |
| coder | `agent/coder` | developer |
| dreamer | `agent/dreamer` | creative |
| empath | `agent/empath` | emotional |
| historian | `agent/historian` | historical |

## Request Format

```json
{
  "model": "agent/{name}",
  "messages": [
    {
      "role": "system",
      "content": "Agent system prompt"
    },
    {
      "role": "user",
      "content": "User message"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false
}
```

## Response Format

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "agent/{name}",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Agent response"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 100,
    "total_tokens": 150
  }
}
```

## Example Usage

### cURL

```bash
curl -X POST http://litellm:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -d '{
    "model": "agent/steward",
    "messages": [
      {"role": "user", "content": "What is the current system status?"}
    ]
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://litellm:4000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY}`
  },
  body: JSON.stringify({
    model: 'agent/steward',
    messages: [
      { role: 'user', content: 'What is the current system status?' }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Python

```python
import requests

response = requests.post(
    'http://litellm:4000/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {os.environ["LITELLM_MASTER_KEY"]}'
    },
    json={
        'model': 'agent/steward',
        'messages': [
            {'role': 'user', 'content': 'What is the current system status?'}
        ]
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])
```

## Model Configuration

Models are configured in `litellm_config.yaml`. Example:

```yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE
    model_info:
      description: "Steward Agent - Orchestrator role"
      agent_role: orchestrator
      agent_id: steward

  - model_name: agent/alpha
    litellm_params:
      model: minimax/MiniMax-M2.7
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE
    model_info:
      description: "Alpha Agent - Triad member"
      agent_role: triad_member
      agent_id: alpha
```

**Note:** All agents default to MiniMax-M2.7, but can be reassigned to any model via LiteLLM WebUI without config changes.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LITELLM_HOST` | LiteLLM gateway URL | `http://litellm:4000` |
| `LITELLM_MASTER_KEY` | API authentication key | (required) |
| `MINIMAX_API_KEY` | MiniMax API key | (required if using MiniMax) |
| `MINIMAX_API_BASE` | MiniMax API base URL | (required if using MiniMax) |

## Health Check

```bash
curl http://litellm:4000/health
```

Response: `Healthy`

## Model List

```bash
curl http://litellm:4000/v1/models \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## Streaming

Enable streaming by setting `stream: true` in the request:

```json
{
  "model": "agent/steward",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true
}
```

Response is Server-Sent Events (SSE):

```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" how"}}]}

data: {"choices":[{"delta":{"content":" can"}}]}

data: [DONE]
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
```

### 404 Model Not Found

```json
{
  "error": {
    "message": "Model 'agent/unknown' not found",
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}
```

### 500 Internal Error

```json
{
  "error": {
    "message": "Internal server error",
    "type": "api_error"
  }
}
```

## Rate Limiting

Rate limits are configured per model in `litellm_config.yaml`:

```yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.7
    model_info:
      rpm: 100  # Requests per minute
      tpm: 100000  # Tokens per minute
```
