# Agent Model Configuration

This directory contains per-agent model configuration files that allow fine-grained control over which LLM models each agent uses.

## Overview

The agent model configuration system provides:

- **Per-agent model assignments**: Different models for different agent roles
- **Primary and fallback models**: Automatic failover if primary model is unavailable
- **Cost optimization**: Use cheaper models for simple tasks, premium models for complex reasoning
- **Token limits**: Configure max tokens per agent
- **API key management**: Agent-specific API keys via environment variables

## File Structure

```
config/agents/
├── README.md                 # This file
├── arbiter-models.yaml       # Example: Arbiter agent configuration
├── coder-models.yaml         # Example: Coder agent configuration
└── <agent>-models.yaml       # Additional agent configurations
```

## Configuration Schema

Each agent configuration file follows this schema:

```yaml
# Agent model configuration for <agent_name>
agent_name: <agent_id>
agent_role: <role>

model_config:
  primary:
    model: <provider/model-id>
    max_tokens: <integer>
    temperature: <float>
    api_key_env: <ENV_VAR_NAME>
  
  fallback:
    model: <provider/model-id>
    max_tokens: <integer>
    temperature: <float>
    api_key_env: <ENV_VAR_NAME>
  
  # Optional: Additional fallbacks in priority order
  fallback_chain:
    - model: <provider/model-id-2>
      max_tokens: <integer>
    - model: <provider/model-id-3>
      max_tokens: <integer>

# Optional: Rate limiting per agent
rate_limits:
  requests_per_minute: <integer>
  tokens_per_day: <integer>

# Optional: Cost budget
budget:
  daily_limit_usd: <float>
  alert_threshold: <float>  # 0.0 to 1.0
```

## Usage

### Loading Configuration

Agent configurations are loaded automatically when agents initialize. The configuration loader:

1. Looks for `config/agents/<agent_id>-models.yaml`
2. Merges with global `litellm_config.yaml` settings
3. Validates model availability and API keys
4. Sets up fallback chains

### Environment Variables

Each agent configuration can reference environment variables for API keys:

```bash
# Example environment variables
AGENT_CODER_PRIMARY_API_KEY=sk-...
AGENT_CODER_FALLBACK_API_KEY=sk-ant-...
```

### CLI Management

Use the interactive CLI tool to manage agent configurations:

```bash
# List all agent configurations
npm run config:agent-model list

# Configure an agent's models
npm run config:agent-model set --agent=coder

# Validate configuration
npm run config:agent-model validate

# Reset to defaults
npm run config:agent-model reset --agent=coder
```

## Examples

### Cost-Optimized Configuration

```yaml
agent_name: coder
agent_role: artisan

model_config:
  primary:
    model: anthropic/claude-3-5-sonnet
    max_tokens: 8192
    temperature: 0.7
    api_key_env: ANTHROPIC_API_KEY
  
  fallback:
    model: openai/gpt-4o-mini
    max_tokens: 4096
    temperature: 0.7
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 30
  tokens_per_day: 500000

budget:
  daily_limit_usd: 10.00
  alert_threshold: 0.8
```

### High-Performance Configuration

```yaml
agent_name: arbiter
agent_role: decision-maker

model_config:
  primary:
    model: anthropic/claude-3-opus
    max_tokens: 4096
    temperature: 0.5
    api_key_env: ANTHROPIC_API_KEY
  
  fallback_chain:
    - model: openai/gpt-4-turbo
      max_tokens: 4096
    - model: openai/gpt-4
      max_tokens: 4096

rate_limits:
  requests_per_minute: 60
  tokens_per_day: 1000000

budget:
  daily_limit_usd: 50.00
  alert_threshold: 0.9
```

### Local-First Configuration

```yaml
agent_name: historian
agent_role: archivist

model_config:
  primary:
    model: ollama/llama-3-70b
    max_tokens: 8192
    temperature: 0.3
    api_base: http://localhost:11434
  
  fallback:
    model: openai/gpt-4o
    max_tokens: 8192
    temperature: 0.3
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 120
  tokens_per_day: 2000000
```

## Migration from Legacy Configuration

If you have existing agent model assignments in `.env` or `openclaw.json`, migrate them:

1. Run the migration script:
   ```bash
   node scripts/migrate-agent-models.js
   ```

2. Review generated configuration files in `config/agents/`

3. Update `litellm_config.yaml` to reference new configs

4. Test each agent with its new configuration

## Troubleshooting

### Model Not Found

Ensure the model name in the configuration matches the provider's expected format. Check `litellm_config.yaml` for available models.

### API Key Errors

Verify environment variables are set:

```bash
# Check if API key is set
echo $ANTHROPIC_API_KEY

# Add to .env file if missing
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### Fallback Not Triggering

Fallback is triggered on:
- HTTP 429 (Rate Limit)
- HTTP 500/503 (Server Error)
- Connection timeout
- Model unavailable

Check logs for fallback events:
```bash
docker logs openclaw-litellm | grep "fallback"
```

## Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Provider Setup Guide](../providers/README.md)
- [Agent Model Configuration Guide](../../docs/configuration/AGENT_MODEL_CONFIG.md)
