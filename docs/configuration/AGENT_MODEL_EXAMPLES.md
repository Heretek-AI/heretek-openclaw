# Agent Model Configuration Examples

This document provides practical examples of per-agent model configurations for common scenarios.

## Table of Contents

- [Cost Optimization](#cost-optimization)
- [Performance Tuning](#performance-tuning)
- [High Availability](#high-availability)
- [Local-First Deployment](#local-first-deployment)
- [Multi-Provider Setup](#multi-provider-setup)
- [Budget-Constrained Deployment](#budget-constrained-deployment)
- [Specialized Agent Roles](#specialized-agent-roles)

---

## Cost Optimization

### Scenario: Minimize API costs while maintaining quality

For deployments where cost is the primary concern, use cheaper models for routine tasks and reserve premium models for critical operations.

```yaml
# config/agents/historian-models.yaml
agent_name: historian
agent_role: archivist

model_config:
  # Primary: Cost-effective model for routine archival tasks
  primary:
    model: openai/gpt-4o-mini
    max_tokens: 4096
    temperature: 0.3
    api_key_env: OPENAI_API_KEY
  
  # Fallback: Even cheaper option
  fallback:
    model: anthropic/claude-3-haiku
    max_tokens: 4096
    temperature: 0.3
    api_key_env: ANTHROPIC_API_KEY
  
  # Chain: Local model as ultimate fallback
  fallback_chain:
    - model: ollama/llama-3-8b
      max_tokens: 4096
      temperature: 0.3

rate_limits:
  requests_per_minute: 120
  tokens_per_day: 2000000

budget:
  daily_limit_usd: 5.00
  monthly_limit_usd: 100.00
  alert_threshold: 0.8
```

**Expected Cost Savings**: 70-90% compared to using premium models exclusively.

---

## Performance Tuning

### Scenario: Maximum quality for critical decision-making

For agents that make important decisions or handle complex reasoning tasks.

```yaml
# config/agents/arbiter-models.yaml
agent_name: arbiter
agent_role: decision-maker

model_config:
  # Primary: Best reasoning capabilities
  primary:
    model: anthropic/claude-3-opus
    max_tokens: 4096
    temperature: 0.5
    top_p: 0.9
    api_key_env: ANTHROPIC_API_KEY
  
  # Fallback: Second-best reasoning
  fallback:
    model: openai/gpt-4-turbo
    max_tokens: 4096
    temperature: 0.5
    top_p: 0.9
    api_key_env: OPENAI_API_KEY
  
  # Chain: Additional high-quality fallbacks
  fallback_chain:
    - model: openai/gpt-4o
      max_tokens: 4096
      temperature: 0.5
    - model: anthropic/claude-3-5-sonnet
      max_tokens: 4096
      temperature: 0.5
    - model: google/gemini-pro
      max_tokens: 4096
      temperature: 0.5

rate_limits:
  requests_per_minute: 30
  tokens_per_day: 500000

budget:
  daily_limit_usd: 75.00
  monthly_limit_usd: 1500.00
  alert_threshold: 0.9

# Model overrides for specific request types
model_overrides:
  conflict_resolution:
    temperature: 0.3
    max_tokens: 4096
  quick_decision:
    model: openai/gpt-4o
    temperature: 0.6
    max_tokens: 2048
```

**Expected Quality**: Highest available reasoning capabilities with multiple fallback options.

---

## High Availability

### Scenario: Maximum uptime with multiple fallback options

For deployments where availability is critical and service interruption is unacceptable.

```yaml
# config/agents/steward-models.yaml
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
  
  # Extensive fallback chain across multiple providers
  fallback_chain:
    - model: openai/gpt-4-turbo
      max_tokens: 8192
    - model: anthropic/claude-3-sonnet
      max_tokens: 4096
    - model: google/gemini-pro
      max_tokens: 8192
    - model: minimax/MiniMax-M2.7
      max_tokens: 128000
    - model: zai/glm-5-1
      max_tokens: 128000
    - model: ollama/llama-3-70b
      max_tokens: 8192

rate_limits:
  requests_per_minute: 60
  tokens_per_day: 1000000

budget:
  daily_limit_usd: 50.00
  monthly_limit_usd: 1000.00
  alert_threshold: 0.8
  hard_stop_threshold: 1.0

retry:
  max_retries: 5
  retry_delay_ms: 1000
  exponential_backoff: true
  max_delay_ms: 30000
```

**Expected Availability**: 99.9%+ with 7 fallback options across 6 providers.

---

## Local-First Deployment

### Scenario: Primary processing on local hardware, cloud fallback

For deployments with local GPU/TPU resources that want to minimize cloud dependency.

```yaml
# config/agents/explorer-models.yaml
agent_name: explorer
agent_role: scout

model_config:
  # Primary: Local Ollama deployment
  primary:
    model: ollama/llama-3-70b
    max_tokens: 8192
    temperature: 0.7
    api_base: http://ollama:11434
  
  # Fallback: Cloud model when local is unavailable
  fallback:
    model: openai/gpt-4o-mini
    max_tokens: 4096
    temperature: 0.7
    api_key_env: OPENAI_API_KEY
  
  fallback_chain:
    - model: anthropic/claude-3-haiku
      max_tokens: 4096
    - model: zai/glm-4
      max_tokens: 8192

rate_limits:
  requests_per_minute: 120
  tokens_per_day: 3000000

budget:
  daily_limit_usd: 10.00
  monthly_limit_usd: 200.00
  alert_threshold: 0.8
```

**Benefits**:
- Minimal cloud costs for routine operations
- Full data privacy for local processing
- Cloud fallback for overflow or complex tasks

---

## Multi-Provider Setup

### Scenario: Distribute load across multiple providers

For deployments that want to avoid vendor lock-in and distribute API load.

```yaml
# config/agents/coder-models.yaml
agent_name: coder
agent_role: artisan

model_config:
  # Primary: Anthropic for code generation
  primary:
    model: anthropic/claude-3-5-sonnet
    max_tokens: 8192
    temperature: 0.7
    api_key_env: ANTHROPIC_API_KEY
  
  # Fallback: OpenAI for code review
  fallback:
    model: openai/gpt-4o
    max_tokens: 8192
    temperature: 0.6
    api_key_env: OPENAI_API_KEY
  
  fallback_chain:
    # Google for additional capacity
    - model: google/gemini-pro-1.5
      max_tokens: 8192
      temperature: 0.7
    # xAI for overflow
    - model: xai/grok-beta
      max_tokens: 8192
      temperature: 0.7
    # z.ai for budget operations
    - model: zai/glm-5-1
      max_tokens: 8192
      temperature: 0.7

rate_limits:
  requests_per_minute: 30
  tokens_per_day: 2000000

budget:
  daily_limit_usd: 50.00
  monthly_limit_usd: 1000.00
  alert_threshold: 0.8

# Language-specific model preferences
language_preferences:
  javascript:
    preferred_model: anthropic/claude-3-5-sonnet
  python:
    preferred_model: anthropic/claude-3-5-sonnet
  rust:
    preferred_model: openai/gpt-4o
  go:
    preferred_model: openai/gpt-4o
```

**Benefits**:
- No single point of failure
- Competitive pricing through provider diversity
- Access to unique capabilities from each provider

---

## Budget-Constrained Deployment

### Scenario: Strict budget limits with automatic enforcement

For deployments with fixed monthly budgets that need hard limits.

```yaml
# config/agents/empath-models.yaml
agent_name: empath
agent_role: diplomat

model_config:
  primary:
    model: anthropic/claude-3-haiku
    max_tokens: 4096
    temperature: 0.8
    api_key_env: ANTHROPIC_API_KEY
  
  fallback:
    model: openai/gpt-4o-mini
    max_tokens: 2048
    temperature: 0.8
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 60
  tokens_per_minute: 30000
  tokens_per_day: 300000

budget:
  daily_limit_usd: 5.00
  monthly_limit_usd: 100.00
  alert_threshold: 0.7  # Alert at 70%
  hard_stop_threshold: 1.0  # Stop at 100%

retry:
  max_retries: 2
  retry_delay_ms: 2000
  exponential_backoff: true
```

**Budget Enforcement**:
- Soft alert at 70% of budget
- Hard stop at 100% of budget
- Rate limiting to prevent burst costs

---

## Specialized Agent Roles

### Code Generation Agent

```yaml
# config/agents/coder-models.yaml
agent_name: coder
agent_role: artisan

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
  requests_per_minute: 30
  tokens_per_day: 2000000

budget:
  daily_limit_usd: 50.00

model_overrides:
  code_review:
    temperature: 0.3
    max_tokens: 4096
  code_generation:
    temperature: 0.8
    max_tokens: 8192
  debugging:
    temperature: 0.4
    max_tokens: 6144
  quick_fix:
    model: openai/gpt-4o-mini
    temperature: 0.7
    max_tokens: 2048
```

### Security Agent (Sentinel)

```yaml
# config/agents/sentinel-models.yaml
agent_name: sentinel
agent_role: guardian

model_config:
  primary:
    model: anthropic/claude-3-5-sonnet
    max_tokens: 4096
    temperature: 0.2  # Low temp for consistent security analysis
    api_key_env: ANTHROPIC_API_KEY
  
  fallback:
    model: openai/gpt-4-turbo
    max_tokens: 4096
    temperature: 0.2
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 120  # High limit for continuous monitoring
  tokens_per_day: 500000

budget:
  daily_limit_usd: 20.00

logging:
  log_requests: true
  log_responses: true  # Important for security audit
  log_costs: true
  log_fallbacks: true
```

### Creative Agent (Dreamer)

```yaml
# config/agents/dreamer-models.yaml
agent_name: dreamer
agent_role: visionary

model_config:
  primary:
    model: openai/gpt-4-turbo
    max_tokens: 8192
    temperature: 0.9  # High temp for creativity
    api_key_env: OPENAI_API_KEY
  
  fallback:
    model: anthropic/claude-3-5-sonnet
    max_tokens: 8192
    temperature: 0.9
    api_key_env: ANTHROPIC_API_KEY

rate_limits:
  requests_per_minute: 30
  tokens_per_day: 500000

budget:
  daily_limit_usd: 25.00
```

### Memory Agent (Historian)

```yaml
# config/agents/historian-models.yaml
agent_name: historian
agent_role: archivist

model_config:
  primary:
    model: ollama/llama-3-70b
    max_tokens: 8192
    temperature: 0.2  # Low temp for consistent recall
    api_base: http://ollama:11434
  
  fallback:
    model: openai/gpt-4o
    max_tokens: 8192
    temperature: 0.2
    api_key_env: OPENAI_API_KEY

rate_limits:
  requests_per_minute: 60
  tokens_per_day: 1000000

budget:
  daily_limit_usd: 10.00

logging:
  log_requests: true
  log_responses: false  # Don't log full responses to save space
  log_costs: true
  log_fallbacks: true
```

---

## Migration Examples

### From Single Model to Per-Agent

**Before** (single model for all agents):
```yaml
# litellm_config.yaml
model_list:
  - model_name: default
    litellm_params:
      model: openai/gpt-4
```

**After** (per-agent models):
```yaml
# litellm_config.yaml + config/agents/*.yaml
agent_model_mappings:
  arbiter:
    primary: anthropic/claude-3-opus
    fallback: openai/gpt-4-turbo
  coder:
    primary: anthropic/claude-3-5-sonnet
    fallback: openai/gpt-4o
  historian:
    primary: ollama/llama-3-70b
    fallback: openai/gpt-4o-mini
```

### From Environment Variables to Config Files

**Before** (environment-based):
```bash
# .env
AGENT_CODER_MODEL=openai/gpt-4
AGENT_CODER_MAX_TOKENS=4096
AGENT_CODER_TEMPERATURE=0.7
```

**After** (file-based):
```yaml
# config/agents/coder-models.yaml
agent_name: coder
model_config:
  primary:
    model: anthropic/claude-3-5-sonnet
    max_tokens: 8192
    temperature: 0.7
```

---

## Testing Your Configuration

After creating your configuration, validate it:

```bash
# 1. Validate syntax and API keys
node scripts/configure-agent-model.js validate

# 2. Check available models
node scripts/configure-agent-model.js models

# 3. View current assignments
node scripts/configure-agent-model.js list

# 4. Test with a specific agent
node scripts/configure-agent-model.js usage --agent=coder
```

---

## Resources

- [Configuration Guide](./AGENT_MODEL_CONFIG.md)
- [Provider Setup](./PROVIDER_SETUP.md)
- [Agent Model Router](../../agents/lib/agent-model-router.js)
- [Agent Model Config](../../agents/lib/agent-model-config.js)
