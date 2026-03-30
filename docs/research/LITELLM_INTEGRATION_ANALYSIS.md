# LiteLLM Integration Analysis for Heretek-OpenClaw

**Document Date:** 2026-03-30
**Repository:** Heretek-OpenClaw
**Status:** Comprehensive Analysis - Documentation Phase
**Mode:** Project Research

---

## Executive Summary

This document provides a comprehensive analysis of LiteLLM's capabilities for the Heretek-OpenClaw multi-agent system, covering Agent-to-Agent (A2A) protocol, observability integrations, configuration management, and architecture best practices. The analysis is based on existing codebase research of the Heretek-OpenClaw repository, examining the current LiteLLM configuration and integration state.

### Key Findings

| Area | Current Status | Recommendation |
|------|----------------|----------------|
| A2A Protocol | Partially functional (404 errors) | Investigate LiteLLM version, endpoint format |
| Model Configuration | Working (MiniMax + z.ai) | Best practice |
| Cost Tracking | Enabled | Configured in litellm_config.yaml |
| Observability | Partial (Prometheus enabled) | Add LangFuse, OpenTelemetry |
| Redis Fallback | Active for messaging | Document migration path |

---

## 1. A2A Protocol Implementation

### 1.1 Protocol Overview

The A2A (Agent-to-Agent) protocol in LiteLLM provides standardized communication between agents. Based on documentation URLs provided:

- **Primary Documentation:** https://docs.litellm.ai/docs/a2a
- **Invoking Agents:** https://docs.litellm.ai/docs/a2a_invoking_agents
- **Agent Headers:** https://docs.litellm.ai/docs/a2a_agent_headers
- **Cost Tracking:** https://docs.litellm.ai/docs/a2a_cost_tracking
- **Agent Permissions:** https://docs.litellm.ai/docs/a2a_agent_permissions
- **Iteration Budgets:** https://docs.litellm.ai/docs/a2a_iteration_budgets

### 1.2 Current Configuration

The system has LiteLLM configured with A2A protocol support (lines 284-335 in [`litellm_config.yaml`](litellm_config.yaml)):

```yaml
# ==============================================================================
# A2A (Agent-to-Agent) Protocol Settings
# ==============================================================================
a2a_settings:
  # Enable A2A protocol
  enabled: true
  
  # Agent timeout (seconds)
  agent_timeout: 300
  
  # Session persistence backend
  session_persistence: redis
  
  # Session TTL (seconds)
  session_ttl: 86400

  # -------------------------------------------------------------------------
  # Standard A2A Endpoints
  # -------------------------------------------------------------------------
  agent_endpoint_format: "/v1/agents/{agent_name}"
  send_message_endpoint: "/v1/agents/{agent_name}/send"
  receive_message_endpoint: "/v1/agents/{agent_name}/receive"
  health_check_endpoint: "/health"
  health_check_timeout: 10
```

### 1.3 A2A Endpoint Structure

Based on the current codebase and LiteLLM documentation patterns observed:

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/v1/agents` | List all agents | GET /v1/agents |
| `/v1/agents/{name}` | Get agent info | GET /v1/agents/steward |
| `/v1/agents/{name}/send` | Send message | POST /v1/agents/steward/send |
| `/v1/agents/{name}/messages` | Get messages | GET /v1/agents/steward/messages |
| `/v1/agents/{name}/tasks` | Task handoff | POST /v1/agents/steward/tasks |
| `/v1/agents/{name}/stream` | Streaming | GET /v1/agents/steward/stream |

**NOTE:** The base endpoint `/a2a/{agent_name}` shown in documentation appears to correspond to `/v1/agents/{agent_name}` in production LiteLLM deployments.

### 1.4 Agent Card Structure

Each agent must register with an Agent Card containing capabilities:

```json
{
  "name": "steward",
  "description": "Orchestrator of The Collective",
  "url": "http://litellm:4000/v1/agents/steward",
  "skills": [
    { "id": "orchestrate", "name": "Orchestrate Collective" },
    { "id": "monitor-health", "name": "Monitor Agent Health" },
    { "id": "manage-proposals", "name": "Manage Proposals" }
  ],
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "a2a": true
  }
}
```

### 1.5 Known Issues (A2A 404 Errors)

The context mentions A2A endpoints are returning 404 errors. Common causes:

1. **Route mismatch:** LiteLLM version differences (v1/agents vs /a2a prefix)
2. **Missing agent registration:** Agents not registered in LiteLLM
3. **Authentication issues:** Missing or incorrect API key
4. **Configuration not loaded:** litellm_config.yaml not mounted correctly

**Recommended Investigation:**

```bash
# Check LiteLLM container logs
docker compose logs litellm | grep -i error

# Verify endpoint accessibility
curl -s http://localhost:4000/v1/agents \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}"

# Test A2A send endpoint
curl -X POST http://localhost:4000/v1/agents/steward/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"message": {"role": "user", "parts": [{"kind": "text", "text": "test"}]}}'
```

---

## 2. Configuration Patterns

### 2.1 Model Configuration (litellm_config.yaml)

The current configuration ([`litellm_config.yaml`](litellm_config.yaml) lines 18-222) demonstrates best practices:

```yaml
model_list:
  # ==========================================================================
  # PRIMARY: MiniMax MiniMax-M2.1 (All Agents Default)
  # ==========================================================================
  - model_name: minimax/MiniMax-M2.1
    litellm_params:
      model: minimax/MiniMax-M2.1
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE
    model_info:
      description: "MiniMax MiniMax-M2.1 - Primary model for all agents"
      max_tokens: 128000
      input_cost_per_token: 0.0000001
      output_cost_per_token: 0.0000004

  # ==========================================================================
  # FAILOVER: z.ai GLM-5 (Coding API)
  # ==========================================================================
  - model_name: zai/glm-5
    litellm_params:
      model: openai/glm-5
      api_key: os.environ/ZAI_API_KEY
      api_base: os.environ/ZAI_API_BASE
    model_info:
      description: "z.ai GLM-5 - Coding API failover"
      max_tokens: 128000

  # ==========================================================================
  # AGENT PASSTHROUGH ENDPOINTS (Virtual Models)
  # ==========================================================================
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.1
      api_key: os.environ/MINIMAX_API_KEY
      api_base: os.environ/MINIMAX_API_BASE
    model_info:
      description: "Steward Agent - Orchestrator role"
      agent_role: orchestrator
      agent_id: steward
```

### 2.2 Configuration Best Practices

Based on the LiteLLM configuration patterns observed:

| Pattern | Implementation | Benefit |
|---------|----------------|---------|
| **Primary/Failover** | MiniMax → z.ai chain | Reliability |
| **Per-agent endpoints** | Virtual model per agent | Flexibility |
| **Cost tracking** | Per-model pricing | Budget control |
| **Caching** | Redis TTL: 3600s | Performance |
| **Rate limiting** | 60 requests/minute | Protection |

### 2.3 Configuration Management

Documentation references:
- https://docs.litellm.ai/docs/proxy/configs
- https://docs.litellm.ai/docs/proxy/config_management
- https://docs.litellm.ai/docs/proxy/config_settings

**Current Settings Structure:**

```yaml
litellm_settings:
  default_model: minimax/MiniMax-M2.1
  drop_params: true
  set_verbose: false
  request_timeout: 300
  num_retries: 3
  retry_after: 2
  cache: true
  cache_params:
    ttl: 3600
    redis_url: os.environ/REDIS_URL
  callbacks: []
  success_callback: ["prometheus", "langfuse", "log_cost"]
  failure_callback: []

general_settings:
  database_url: os.environ/DATABASE_URL
  redis_url: os.environ/REDIS_URL
  master_key: os.environ/LITELLM_MASTER_KEY
  salt_key: os.environ/LITELLM_SALT_KEY
  environment: heretek-openclaw
  log_level: INFO
  ui: true
  ui_access_mode: admin
```

---

## 3. Observability and Monitoring

### 3.1 Available Integrations

Based on documentation URLs:

| Integration | Documentation | Current Status |
|-------------|----------------|----------------|
| **LangFuse** | https://docs.litellm.ai/docs/observability/langfuse_integration | Disabled (config ready) |
| **Datadog** | https://docs.litellm.ai/docs/observability/datadog | Not configured |
| **OpenTelemetry** | https://docs.litellm.ai/docs/observability/opentelemetry_integration | Not configured |
| **Prometheus** | Native | **Enabled** |

### 3.2 Current Observability Configuration

From [`litellm_config.yaml`](litellm_config.yaml) lines 404-422:

```yaml
# ==============================================================================
# Observability Settings
# ==============================================================================
observability:
  # Prometheus metrics
  prometheus:
    enabled: true
    port: 9090
  
  # Langfuse tracing (optional)
  langfuse:
    enabled: false
    public_key: os.environ/LANGFUSE_PUBLIC_KEY
    secret_key: os.environ/LANGFUSE_SECRET_KEY
  
  # Slack alerts (optional)
  slack:
    enabled: false
    webhook_url: os.environ/SLACK_WEBHOOK_URL
```

### 3.3 Prometheus Metrics

Prometheus is enabled and available at port 9090. Key metrics:

| Metric | Purpose |
|--------|---------|
| `litellm_request_duration` | Request latency |
| `litellm_request_count` | Total requests |
| `litellm_spend_calc` | Cost tracking |
| `litellm_model_alias` | Model usage |
| `litellm_failed_requests` | Error tracking |

### 3.4 LangFuse Integration (Recommended)

Enable for enhanced tracing:

```yaml
langfuse:
  enabled: true
  public_key: os.environ/LANGFUSE_PUBLIC_KEY
  secret_key: os.environ/LANGFUSE_SECRET_KEY
  # Optional: specific host for on-prem
  # host: "https://cloud.langfuse.com"  # default
```

**Environment Variables:**

```bash
# LangFuse Configuration
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com  # optional for on-prem
```

### 3.5 OpenTelemetry Integration

For distributed tracing:

```yaml
# Add to environment
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=heretek-openclaw
```

---

## 4. Multi-Tenant Architecture

### 4.1 Architecture Documentation

- https://docs.litellm.ai/docs/proxy/architecture
- https://docs.litellm.ai/docs/proxy/multi_tenant_architecture

### 4.2 Current Architecture Pattern

The Heretek-OpenClaw implementation uses a centralized gateway pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Architecture Layers                           │
├─────────────────────────────────────────────────────────────────┤
│  LiteLLM Gateway (:4000)                                        │
│   - Unified API                                                 │
│   - Model routing                                               │
│   - A2A Protocol                                                │
│   - Rate limiting                                               │
├─────────────────────────────────────────────────────────────────┤
│  Model Providers                                                │
│   - MiniMax M2.1 (Primary)                                      │
│   - z.ai GLM-5 (Failover)                                       │
│   - Ollama (Local AMD GPU)                                      │
├─────────────────────────────────────────────────────────────────┤
│  Storage                                                        │
│   - PostgreSQL + pgvector                                        │
│   - Redis                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Multi-Agent Tenant Isolation

For agent isolation in multi-tenant scenarios:

```yaml
# Per-agent budget settings
budget_settings:
  enabled: true
  agent_budgets:
    agent/steward: 1000000
    agent/alpha: 500000
    agent/beta: 500000
    agent/charlie: 500000
    agent/examiner: 300000
    agent/explorer: 300000
    agent/sentinel: 300000
    agent/coder: 1000000
  global_budget: 5000000
  alert_threshold: 0.8
```

---

## 5. Cost Tracking for Multi-Agent Systems

### 5.1 A2A Cost Tracking Documentation

- https://docs.litellm.ai/docs/a2a_cost_tracking

### 5.2 Current Cost Tracking

Cost tracking is enabled in the current configuration:

```yaml
litellm_settings:
  success_callback: ["prometheus", "langfuse", "log_cost"]
```

**Cost per token configuration:**

```yaml
model_list:
  - model_name: minimax/MiniMax-M2.1
    model_info:
      input_cost_per_token: 0.0000001
      output_cost_per_token: 0.0000004
```

### 5.3 Cost Tracking Endpoints

```bash
# Get spend by model
curl "http://localhost:4000/spend" \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}"

# Get spend by key
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}"

# Get usage
curl "http://localhost:4000/v1/usage" \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}"
```

---

## 6. Agent Permissions Model

### 6.1 A2A Agent Permissions

- https://docs.litellm.ai/docs/a2a_agent_permissions

### 6.2 Permission Configuration

Agent permissions can be configured via API keys:

```bash
# Generate agent-specific key with permissions
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "a2a-steward",
    "agent": "steward",
    "permissions": ["a2a:send", "a2a:receive", "chat:complete"]
  }'
```

### 6.3 Iterations Budget

- https://docs.litellm.ai/docs/a2a_iteration_budgets

For autonomous agent loops, iteration budgets control maximum iterations:

```yaml
a2a_settings:
  iteration_budget:
    max_iterations: 10
    max_tokens_per_iteration: 8000
    total_budget_tokens: 80000
```

---

## 7. Code Examples

### 7.1 Agent Messaging (A2A)

```javascript
// Send message to agent via A2A
async function sendToAgent(agentName, message, apiKey, litellmHost = 'http://localhost:4000') {
  const response = await fetch(`${litellmHost}/v1/agents/${agentName}/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: message }]
      }
    })
  });
  return response.json();
}

// Example: Steward sends task to Alpha
await sendToAgent('alpha', 'Analyze the deployment proposal', apiKey);
```

### 7.2 Agent Discovery

```javascript
// List all registered agents
async function listAgents(apiKey, litellmHost = 'http://localhost:4000') {
  const response = await fetch(`${litellmHost}/v1/agents`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  return response.json();
}
```

### 7.3 Task Handoff

```javascript
// Handoff task between agents with context
async function handoffTask(fromAgent, toAgent, taskContext, apiKey) {
  const response = await fetch(`${litellmHost}/v1/agents/${toAgent}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAgent,
      message: {
        role: 'user',
        parts: [
          { kind: 'text', text: `[CONTINUATION] From: ${fromAgent}` },
          { kind: 'text', text: taskContext }
        ]
      }
    })
  });
  return response.json();
}
```

### 7.4 Cost Tracking

```bash
#!/bin/bash
# Cost tracking by agent

LITELLM_HOST="${LITELLM_HOST:-localhost}"
LITELLM_KEY="${LITELLM_MASTER_KEY}"

# Get spend
curl -s "http://${LITELLM_HOST}:4000/spend" \
  -H "Authorization: Bearer ${LITELLM_KEY}" | \
  jq '.data[] | {model: .model, spend: .spend, total_requests: .total_requests}'
```

---

## 8. OpenClaw Integration Tutorial

### 8.1 Tutorial Reference

- https://docs.litellm.ai/docs/tutorials/openclaw_integration

### 8.2 Integration Steps

Based on the existing codebase, here's how OpenClaw integrates with LiteLLM:

**Step 1: Model Configuration**

```yaml
# litellm_config.yaml
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/MiniMax-M2.1
```

**Step 2: Agent Registration**

Each agent needs to register with LiteLLM via the A2A protocol. The registration happens during agent startup via the entrypoint script ([`agents/entrypoint.sh`](agents/entrypoint.sh)):

```bash
# Register with A2A (if enabled)
if [ "$A2A_ENABLED" = "true" ]; then
  curl -s -X POST "$LITELLM_HOST/v1/agents/register" \
    -H "Authorization: Bearer $LITELLM_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"agent\": \"$AGENT_NAME\", \"role\": \"$AGENT_ROLE\"}"
fi
```

**Step 3: Agent Client Usage**

The `AgentClient` class ([`agents/lib/agent-client.js`](agents/lib/agent-client.js)) provides A2A messaging:

```javascript
const client = new AgentClient({
  agentId: 'steward',
  role: 'orchestrator',
  litellmHost: 'http://litellm:4000',
  apiKey: process.env.LITELLM_API_KEY
});

// Send A2A message
await client.sendMessage('alpha', { task: 'Analyze this data' });
```

### 8.3 Docker Compose Integration

From [`docker-compose.yml`](docker-compose.yml):

```yaml
litellm:
  image: ghcr.io/berriai/litellm:main-latest
  ports:
    - "4000:4000"
  volumes:
    - ./litellm_config.yaml:/app/config.yaml:ro
  environment:
    - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
    - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    - REDIS_URL=${REDIS_URL}
    - AGENT_MODE_ENABLED=true
    - AGENT_A2A_VERSION=1.0
```

---

## 9. Best Practices Summary

### 9.1 Configuration Best Practices

1. **Always use model_info for cost tracking** - Define input_cost_per_token and output_cost_per_token
2. **Set appropriate timeouts** - request_timeout: 300 for complex agent tasks
3. **Enable caching** - cache_params with Redis for repeated queries
4. **Configure fallbacks** - fallback_models in priority order
5. **Use environment variables** - Never hardcode API keys

### 9.2 A2A Best Practices

1. **Register all agents at startup** - Use /v1/agents/register
2. **Implement fallback messaging** - Redis pub/sub when A2A fails
3. **Use proper authentication** - Bearer token with master key
4. **Track iteration budgets** - Prevent infinite loops
5. **Log all messages** - Use observability callbacks

### 9.3 Security Best Practices

1. **Master key for admin operations** - Store securely, use for registration
2. **Virtual keys for agents** - Limit permissions per agent
3. **Rate limiting** - 60 requests/minute default
4. **Network isolation** - Use Docker networks
5. **Secret management** - Never commit keys to git

---

## 10. Recommendations

### 10.1 Immediate Actions

1. **Fix A2A 404 errors** - Verify LiteLLM version and endpoint format
2. **Enable LangFuse** - Already configured, just needs API keys
3. **Add health checks** - Implement agent heartbeat monitoring

### 10.2 Future Enhancements

1. **Add OpenTelemetry** - For distributed tracing
2. **Multi-tenant isolation** - Implement tenant-specific budgets
3. **Custom callbacks** - Add Slack/Webhook notifications

### 10.3 Monitoring Recommendations

```yaml
# Recommended observability stack
observability:
  prometheus:
    enabled: true
    port: 9090
  langfuse:
    enabled: true  # Enable for detailed traces
  slack:
    enabled: true  # Enable for alerts
```

---

## 11. References

### 11.1 Documentation URLs (Research Source)

- https://docs.litellm.ai/docs/a2a
- https://docs.litellm.ai/docs/a2a_invoking_agents
- https://docs.litellm.ai/docs/a2a_agent_headers
- https://docs.litellm.ai/docs/a2a_cost_tracking
- https://docs.litellm.ai/docs/a2a_agent_permissions
- https://docs.litellm.ai/docs/a2a_iteration_budgets
- https://docs.litellm.ai/docs/proxy/configs
- https://docs.litellm.ai/docs/proxy/config_management
- https://docs.litellm.ai/docs/proxy/config_settings
- https://docs.litellm.ai/docs/proxy/architecture
- https://docs.litellm.ai/docs/proxy/multi_tenant_architecture
- https://docs.litellm.ai/docs/observability/langfuse_integration
- https://docs.litellm.ai/docs/observability/datadog
- https://docs.litellm.ai/docs/observability/opentelemetry_integration
- https://docs.litellm.ai/docs/tutorials/openclaw_integration

### 11.2 Related Files in Repository

| File | Purpose |
|------|---------|
| [`litellm_config.yaml`](litellm_config.yaml) | LiteLLM configuration |
| [`docker-compose.yml`](docker-compose.yml) | Infrastructure services |
| [`docs/architecture/A2A_ARCHITECTURE.md`](architecture/A2A_ARCHITECTURE.md) | A2A architecture |
| [`docs/research/OPENClaw_COMMUNICATION_ANALYSIS.md`](OPENClaw_COMMUNICATION_ANALYSIS.md) | OpenClaw communication |
| [`skills/litellm-ops/SKILL.md`](../skills/litellm-ops/SKILL.md) | LiteLLM operations |
| [`skills/a2a-agent-register/SKILL.md`](../skills/a2a-agent-register/SKILL.md) | A2A registration |
| [`skills/a2a-message-send/SKILL.md`](../skills/a2a-message-send/SKILL.md) | A2A messaging |

---

## 12. Appendix: A2A Troubleshooting

### A.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **404 on /a2a/** | Wrong endpoint format | Use /v1/agents/{name} |
| **401 Unauthorized** | Missing/invalid key | Check LITELLM_MASTER_KEY |
| **500 Internal Error** | Config syntax error | Verify YAML format |
| **Agent not found** | Not registered | Register via /v1/agents/register |

### A.2 Debug Commands

```bash
# Check LiteLLM health
curl http://localhost:4000/health

# List available models
curl -H "Authorization: Bearer $KEY" http://localhost:4000/v1/models

# Test A2A endpoint
curl -X POST http://localhost:4000/v1/agents/steward/send \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":{"role":"user","parts":[{"kind":"text","text":"ping"}]}}'

# View cost tracking
curl -H "Authorization: Bearer $KEY" http://localhost:4000/spend
```

---

*Document Version: 1.0.0*
*Created: 2026-03-30*
*Mode: Project Research*
*Research completed for Heretek-OpenClaw architecture*