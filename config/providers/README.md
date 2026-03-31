# LiteLLM Provider Templates

This directory contains pre-configured LiteLLM provider templates that can be easily added to your `litellm_config.yaml` configuration.

## Available Templates

| Provider | Template File | Models Supported |
|----------|---------------|------------------|
| OpenAI | [`openai.yaml`](openai.yaml) | GPT-4, GPT-4-Turbo, GPT-3.5-Turbo, o1, o1-mini |
| Anthropic | [`anthropic.yaml`](anthropic.yaml) | Claude-3-Opus, Claude-3-Sonnet, Claude-3-Haiku, Claude-3.5-Sonnet |
| Google | [`google.yaml`](google.yaml) | Gemini-Pro, Gemini-Ultra, Gemini-Flash |
| Ollama | [`ollama.yaml`](ollama.yaml) | Llama-2, Mistral, CodeLlama, local models |
| Azure OpenAI | [`azure-openai.yaml`](azure-openai.yaml) | Azure-hosted GPT-4, GPT-35-Turbo |
| xAI | [`xai.yaml`](xai.yaml) | Grok-Beta, Grok-Vision |
| Combined Example | [`combined-example.yaml`](combined-example.yaml) | Multi-provider configuration |

## Quick Start

### Option 1: Include in Main Config

Copy the contents of any template file and paste into your `litellm_config.yaml` under the `model_list:` section.

```yaml
# litellm_config.yaml
model_list:
  # ... existing models ...
  
  # Add OpenAI models
  - model_name: openai/gpt-4-turbo
    litellm_params:
      model: openai/gpt-4-turbo
      api_key: os.environ/OPENAI_API_KEY
    model_info:
      description: "OpenAI GPT-4 Turbo"
```

### Option 2: Use as Separate Config File

Reference external config files using LiteLLM's configuration loading:

```bash
# Start LiteLLM with multiple config files
litellm --config litellm_config.yaml --config config/providers/openai.yaml
```

### Option 3: Merge Configurations

Use a YAML merge tool or script to combine configurations:

```bash
# Example using yq (install with: pip install yq)
yq eval-all '. as $item ireduce ({}; . *+ $item)' litellm_config.yaml config/providers/openai.yaml > merged_config.yaml
```

## Environment Variables

Each template uses environment variables for API keys. Set these in your `.env` file:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...
GOOGLE_VERTEX_PROJECT_ID=your-project-id

# Azure OpenAI
AZURE_API_KEY=...
AZURE_API_BASE=https://your-resource.openai.azure.com/
AZURE_API_VERSION=2024-02-15-preview

# xAI
XAI_API_KEY=...
```

## Model Naming Convention

Templates follow this naming convention:

- `provider/model-name` - Standard format
- `provider/deployment-name` - For Azure deployments
- `agent/role` - For agent-specific virtual models

## Adding a New Provider

1. Create a new YAML file in this directory
2. Follow the existing template structure
3. Include model_info metadata for each model
4. Document environment variables needed
5. Add to this README

## Template Structure

Each template includes:

```yaml
model_list:
  - model_name: provider/model-id
    litellm_params:
      model: provider/model-id
      api_key: os.environ/PROVIDER_API_KEY
      # Optional: api_base, api_version, etc.
    model_info:
      description: "Human-readable description"
      max_tokens: 128000
      input_cost_per_token: 0.00001
      output_cost_per_token: 0.00003
      # Optional: mode, supports_vision, supports_function_calling
```

## Usage with OpenClaw

To use these providers with OpenClaw agents:

1. Add the provider configuration to `litellm_config.yaml`
2. Set the required API keys in `.env`
3. Restart the LiteLLM container
4. Optionally update agent model assignments in `.env`

Example agent assignment:

```bash
# Use GPT-4 Turbo for the Coder agent
AGENT_CODER_MODEL=openai/gpt-4-turbo
```

## Troubleshooting

### Model Not Found

Ensure the model name in `litellm_params.model` matches the provider's expected format.

### API Key Errors

Verify environment variables are set and accessible to the LiteLLM container.

### Rate Limiting

Add rate limiting configuration:

```yaml
litellm_settings:
  routing_strategy: simple-shuffle
  enable_rate_limiting: true
```

## Resources

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [LiteLLM Provider Support](https://docs.litellm.ai/docs/providers)
- [OpenClaw Configuration Guide](../../docs/configuration/PROVIDER_SETUP.md)
