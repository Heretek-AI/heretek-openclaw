# Per-Agent Model Configuration Guide

## Overview

The Per-Agent Model Configuration system allows you to assign different LLM models to different agents in the Heretek OpenClaw collective. This enables:

- **Cost optimization**: Use cheaper models for simple agents, premium models for complex reasoning
- **Performance tuning**: Assign models based on agent role requirements
- **High availability**: Configure fallback chains for each agent independently
- **Budget control**: Manage API costs at the agent level

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Model Router                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Arbiter   │  │    Coder    │  │   Steward   │  ...        │
│  │  (Opus)     │  │  (Sonnet)   │  │  (MiniMax)  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Model Fallback Chain                        │   │
│  │  Primary → Fallback → Fallback Chain → Error             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LiteLLM Gateway                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  OpenAI  │ │Anthropic │ │  Google  │ │  Ollama  │  ...      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. View Current Configurations

```bash
# List all agents and their model assignments
node scripts/configure-agent-model.js list

# List available models
node scripts/configure-agent-model.js models
```

### 2. Configure an Agent

```bash
# Interactive configuration wizard
node scripts/configure-agent-model.js set --agent=coder

# Non-interactive configuration
node scripts/configure-agent-model.js set \
  --agent=coder \
  --primary=anthropic/claude-3-5-sonnet \
  --fallback=openai/gpt-4o
```

### 3. Validate Configuration

```bash
# Check all configurations for errors
node scripts/configure-agent-model.js validate
```

### 4. Apply Changes

Restart the LiteLLM container to apply changes:

```bash
docker-compose restart litellm
```

## Configuration Files

### File Location

Agent configurations are stored in `config/agents/`:

```
config/agents/
├── README.md              # Configuration guide
├── arbiter-models.yaml    # Arbiter agent configuration
├── coder-models.yaml      # Coder agent configuration
└── <agent>-models.yaml    # Additional agent configs
```

### Configuration Schema

```yaml
# Agent identification
agent_name: <agent_id>
agent_role: <role>
agent_description: "<description>"

# Model configuration
model_config:
  primary:
    model: <provider/model-id>
    max_tokens: <integer>
    temperature: <float>
    top_p: <float>
    api_key_env: <ENV_VAR_NAME>
    api_base: <URL>  # Optional, for custom endpoints
  
  fallback:
    model: <provider/model-id>
    max_tokens: <integer>
    temperature: <float>
  
  # Additional fallbacks in priority order
  fallback_chain:
    - model: <provider/model-id-2>
      max_tokens: <integer>
    - model: <provider/model-id-3>
      max_tokens: <integer>

# Rate limiting
rate_limits:
  requests_per_minute: <integer>
  tokens_per_minute: <integer>
  tokens_per_day: <integer>
  burst_limit: <integer>

# Budget configuration
budget:
  daily_limit_usd: <float>
  monthly_limit_usd: <float>
  alert_threshold: <float>  # 0.0 to 1.0
  hard_stop_threshold: <float>

# Retry configuration
retry:
  max_retries: <integer>
  retry_delay_ms: <integer>
  exponential_backoff: <boolean>
  max_delay_ms: <integer>

# Logging configuration
logging:
  log_requests: <boolean>
  log_responses: <boolean>
  log_costs: <boolean>
  log_fallbacks: <boolean>

# Model-specific overrides
model_overrides:
  <request_type>:
    model: <provider/model-id>
    temperature: <float>
    max_tokens: <integer>
```

## Usage Examples

### Example 1: Cost-Optimized Configuration

For agents that handle high-volume, simple tasks:

```yaml
agent_name: historian
agent_role: archivist

model_config:
  primary:
    model: ollama/llama-3-8b
    max_tokens: 4096
    temperature: 0.3
    api_base: http://ollama:11434
  
  fallback:
    model: openai/gpt-4o-mini
    max_tokens: 4096
    temperature: 0.3
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 120
  tokens_per_day: 2000000

budget:
  daily_limit_usd: 5.00
  alert_threshold: 0.8
```

### Example 2: High-Performance Configuration

For agents that require advanced reasoning:

```yaml
agent_name: arbiter
agent_role: decision-maker

model_config:
  primary:
    model: anthropic/claude-3-opus
    max_tokens: 4096
    temperature: 0.5
    api_key_env: ANTHROPIC_API_KEY
  
  fallback:
    model: openai/gpt-4-turbo
    max_tokens: 4096
    temperature: 0.5
    api_key_env: OPENAI_API_KEY
  
  fallback_chain:
    - model: openai/gpt-4o
      max_tokens: 4096
    - model: anthropic/claude-3-5-sonnet
      max_tokens: 4096

rate_limits:
  requests_per_minute: 60
  tokens_per_day: 500000

budget:
  daily_limit_usd: 50.00
  alert_threshold: 0.9
```

### Example 3: Balanced Configuration

For general-purpose agents:

```yaml
agent_name: steward
agent_role: orchestrator

model_config:
  primary:
    model: anthropic/claude-3-5-sonnet
    max_tokens: 8192
    temperature: 0.7
    api_key_env: ANTHROPIC_API_KEY
  
  fallback:
    model: openai/gpt-4o
    max_tokens: 8192
    temperature: 0.7
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 60
  tokens_per_day: 1000000

budget:
  daily_limit_usd: 20.00
  alert_threshold: 0.8
```

## Model Fallback Logic

The fallback system works as follows:

1. **Primary Model**: All requests start with the primary model
2. **Fallback Trigger**: Fallback is triggered on:
   - HTTP 429 (Rate Limit Exceeded)
   - HTTP 500/502/503 (Server Errors)
   - Connection timeout
   - Model unavailable error
3. **Fallback Chain**: If fallback also fails, the system tries each model in the fallback_chain
4. **Final Failure**: If all models fail, an error is returned

### Fallback Not Triggered For:

- Authentication errors (401)
- Invalid request format (400)
- Content policy violations (400)

## Environment Variables

### API Keys

```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Google
export GOOGLE_API_KEY=...

# MiniMax
export MINIMAX_API_KEY=...
export MINIMAX_API_BASE=https://api.minimax.chat/v1

# z.ai
export ZAI_API_KEY=...
export ZAI_API_BASE=https://api.z.ai/v1
```

### Agent-Specific API Keys

You can also use agent-specific API keys:

```bash
export AGENT_CODER_PRIMARY_API_KEY=sk-...
export AGENT_CODER_FALLBACK_API_KEY=sk-ant-...
```

## CLI Commands

### List Agents

```bash
# List all agents and their configurations
node scripts/configure-agent-model.js list
```

Output:
```
┌─────────────────┬──────────────────────┬──────────────────────┬─────────────┐
│ Agent           │ Primary Model        │ Fallback Model       │ Role        │
├─────────────────┼──────────────────────┼──────────────────────┼─────────────┤
│ arbiter         │ anthropic/claude-... │ openai/gpt-4-turbo   │ decision-... │
│ coder           │ anthropic/claude-... │ openai/gpt-4o        │ artisan     │
│ steward         │ minimax/MiniMax-M... │ zai/glm-5-1          │ orchestrator│
└─────────────────┴──────────────────────┴──────────────────────┴─────────────┘
```

### Set Models

```bash
# Interactive mode
node scripts/configure-agent-model.js set --agent=coder

# Non-interactive mode
node scripts/configure-agent-model.js set \
  --agent=coder \
  --primary=anthropic/claude-3-5-sonnet \
  --fallback=openai/gpt-4o \
  --max-tokens=8192 \
  --temperature=0.7
```

### Validate

```bash
# Validate all configurations
node scripts/configure-agent-model.js validate
```

### Reset

```bash
# Reset an agent to default configuration
node scripts/configure-agent-model.js reset --agent=coder
```

### Usage Statistics

```bash
# Show rate limits and budget for an agent
node scripts/configure-agent-model.js usage --agent=coder
```

## Integration with LiteLLM

### litellm_config.yaml Integration

The `litellm_config.yaml` file contains the `agent_model_mappings` section that integrates with the per-agent configurations:

```yaml
agent_model_mappings:
  arbiter:
    primary: anthropic/claude-3-5-sonnet
    fallback: openai/gpt-4-turbo
    max_tokens: 8192
    temperature: 0.5
  coder:
    primary: anthropic/claude-3-5-sonnet
    fallback: openai/gpt-4o
    max_tokens: 8192
    temperature: 0.7
```

### Runtime Integration

The [`AgentModelRouter`](../../agents/lib/agent-model-router.js) class handles runtime model routing:

```javascript
const { createAgentModelRouter } = require('./agents/lib/agent-model-router');

const router = createAgentModelRouter({
  config: createAgentModelConfig(),
  litellmClient: litellmClient,
  logger: console
});

await router.initialize();

// Route a completion request
const result = await router.routeCompletion('coder', {
  messages: [{ role: 'user', content: 'Write a function...' }],
  max_tokens: 4096
});
```

## Monitoring and Observability

### Usage Tracking

The router tracks:
- Token usage per agent
- Cost per agent
- Request history
- Fallback events

### Getting Usage Stats

```javascript
const stats = router.getUsageStats('coder');
console.log(stats);
// {
//   tokens: { used: 50000, daily_limit: 500000, ... },
//   cost: { used: 2.50, daily_limit: 50.00, ... },
//   budget_alert: false
// }
```

### Health Status

```javascript
const health = router.getHealthStatus();
console.log(health['coder']);
// {
//   is_healthy: true,
//   current_model: 'anthropic/claude-3-5-sonnet',
//   consecutive_failures: 0,
//   usage: { ... }
// }
```

## Troubleshooting

### Model Not Found

**Problem**: Configuration references a model that doesn't exist in `litellm_config.yaml`

**Solution**: 
1. Check available models: `node scripts/configure-agent-model.js models`
2. Add the model to `litellm_config.yaml` if needed
3. Use a valid model name in the agent configuration

### API Key Errors

**Problem**: API key not found or invalid

**Solution**:
1. Check environment variables: `./scripts/configure-agent-model.sh env-check`
2. Add missing keys to `.env` file
3. Restart the LiteLLM container

### Fallback Not Triggering

**Problem**: Fallback models are not being used when primary fails

**Solution**:
1. Verify `useFallback: true` in the request options
2. Check that fallback model is configured correctly
3. Ensure fallback model has valid API keys

### Budget Alerts

**Problem**: Agent stops responding due to budget limits

**Solution**:
1. Check current usage: `node scripts/configure-agent-model.js usage --agent=<name>`
2. Increase budget in the agent configuration
3. Reset usage tracking if needed

## Best Practices

### 1. Start with Defaults

Begin with the default configurations and adjust based on actual usage patterns.

### 2. Monitor Costs

Regularly check usage statistics and adjust budgets accordingly.

### 3. Test Fallbacks

Periodically test fallback configurations to ensure they work when needed.

### 4. Use Appropriate Models

- **Simple tasks**: Use cheaper, faster models (GPT-4o-Mini, Claude Haiku)
- **Complex reasoning**: Use premium models (Claude Opus, GPT-4-Turbo)
- **Code generation**: Use models with strong coding capabilities (Claude Sonnet)

### 5. Set Reasonable Limits

Configure rate limits and budgets to prevent runaway costs while allowing sufficient capacity.

## Migration from Legacy Configuration

If you have existing agent model assignments:

1. Run the migration script (if available):
   ```bash
   node scripts/migrate-agent-models.js
   ```

2. Review generated configurations in `config/agents/`

3. Validate configurations:
   ```bash
   node scripts/configure-agent-model.js validate
   ```

4. Test each agent with its new configuration

5. Remove legacy configuration from `.env` and `openclaw.json`

## Resources

- [Provider Setup Guide](./PROVIDER_SETUP.md)
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Agent Model Router API](../../agents/lib/agent-model-router.js)
- [Agent Model Config API](../../agents/lib/agent-model-config.js)
