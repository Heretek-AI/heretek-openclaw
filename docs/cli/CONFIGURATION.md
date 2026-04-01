# OpenClaw CLI Configuration Guide

This guide covers all configuration options for the OpenClaw CLI.

## Table of Contents

1. [Configuration Files](#configuration-files)
2. [Environment Variables](#environment-variables)
3. [CLI Settings](#cli-settings)
4. [Deployment Configuration](#deployment-configuration)
5. [Health Check Configuration](#health-check-configuration)
6. [Backup Configuration](#backup-configuration)

## Configuration Files

### openclaw.json

Main configuration file located in the project root or `~/.openclaw/`.

```json
{
  "version": "2.0.0",
  "collective": {
    "name": "OpenClaw Collective",
    "description": "Self-improving autonomous agent collective",
    "version": "2.0.0"
  },
  "models": {
    "providers": {
      "ollama": {
        "type": "ollama",
        "models": [
          { "id": "ollama/llama2", "name": "Llama 2" }
        ]
      }
    }
  },
  "agents": [
    {
      "id": "steward",
      "name": "Steward",
      "role": "Orchestrator",
      "model": "agent/steward",
      "port": 18790
    }
  ],
  "model_routing": {
    "default": "ollama/llama2",
    "aliases": {
      "failover": "ollama/llama2"
    }
  },
  "deployment": {
    "type": "docker"
  }
}
```

### .env

Environment variables file in the project root.

```bash
# LiteLLM Gateway
LITELLM_MASTER_KEY=your-master-key
LITELLM_SALT_KEY=your-salt-key

# AI Provider API Keys
MINIMAX_API_KEY=your-minimax-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Database
POSTGRES_USER=openclaw
POSTGRES_PASSWORD=your-password
POSTGRES_DB=openclaw
DATABASE_URL=postgresql://openclaw:password@localhost:5432/openclaw

# Redis
REDIS_URL=redis://localhost:6379

# OpenClaw
OPENCLAW_DIR=~/.openclaw
OPENCLAW_WORKSPACE=~/.openclaw/workspace

# Observability
LANGFUSE_ENABLED=false
LANGFUSE_PUBLIC_KEY=your-public-key
LANGFUSE_SECRET_KEY=your-secret-key
```

### cli/openclaw.config.js

CLI-specific configuration.

```javascript
export default {
  cli: {
    name: 'openclaw',
    version: '1.0.0',
  },
  paths: {
    openclawDir: '~/.openclaw',
    workspaceDir: '~/.openclaw/workspace',
    backupsDir: '~/.openclaw/backups',
  },
  deployment: {
    defaultType: 'docker',
  },
  health: {
    timeout: 5000,
    watchInterval: 30,
  },
  backup: {
    retentionDays: 30,
    compress: true,
  },
};
```

## Environment Variables

### CLI Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_URL` | Gateway endpoint | `http://localhost:18789` |
| `LITELLM_URL` | LiteLLM endpoint | `http://localhost:4000` |
| `LITELLM_MASTER_KEY` | LiteLLM API key | - |
| `OPENCLAW_DIR` | OpenClaw directory | `~/.openclaw` |

### Database Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` | PostgreSQL user | `openclaw` |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `POSTGRES_DB` | PostgreSQL database | `openclaw` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### Provider Variables

| Variable | Description |
|----------|-------------|
| `MINIMAX_API_KEY` | MiniMax API key |
| `ZAI_API_KEY` | z.ai API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_API_KEY` | Google API key |
| `OLLAMA_HOST` | Ollama host |

## CLI Settings

### Logging

```javascript
{
  logging: {
    level: 'info',       // debug, info, warn, error
    timestamps: true,    // Show timestamps
    colors: true,        // Use colors in output
  }
}
```

### Paths

```javascript
{
  paths: {
    openclawDir: '~/.openclaw',     // OpenClaw installation
    workspaceDir: '~/.openclaw/workspace',  // Agent workspace
    agentsDir: '~/.openclaw/agents',        // Agent directory
    backupsDir: '~/.openclaw/backups',      // Backup storage
    logsDir: '~/.openclaw/logs',            // Log files
    cacheDir: '~/.openclaw/cache',          // Cache directory
  }
}
```

## Deployment Configuration

### Docker

```javascript
{
  deployment: {
    docker: {
      composeFile: 'docker-compose.yml',
      projectName: 'openclaw',
    }
  }
}
```

### Kubernetes

```javascript
{
  deployment: {
    kubernetes: {
      namespace: 'openclaw',
      releaseName: 'openclaw',
      chartDir: './charts/openclaw',
    }
  }
}
```

### Cloud

```javascript
{
  deployment: {
    cloud: {
      terraformDir: './terraform',
      autoApprove: false,
      region: 'us-east-1',
    }
  }
}
```

## Health Check Configuration

```javascript
{
  health: {
    timeout: 5000,           // Timeout in ms
    watchInterval: 30,       // Watch interval in seconds
    
    endpoints: {
      gateway: 'http://localhost:18789',
      litellm: 'http://localhost:4000',
      postgres: 'localhost:5432',
      redis: 'localhost:6379',
      ollama: 'http://localhost:11434',
      langfuse: 'http://localhost:3000',
    }
  }
}
```

## Backup Configuration

```javascript
{
  backup: {
    directory: '~/.openclaw/backups',
    retentionDays: 30,
    compress: true,
    
    schedule: {
      full: '0 2 * * 0',        // Sunday at 2 AM
      incremental: '0 2 * * 1-6', // Mon-Sat at 2 AM
    }
  }
}
```

## Feature Flags

```javascript
{
  features: {
    interactive: true,    // Enable interactive prompts
    telemetry: false,     // Enable telemetry (future)
    experimental: false,  // Enable experimental features
  }
}
```

## Configuration Validation

The CLI validates configuration automatically. To manually validate:

```bash
openclaw config validate
```

### Strict Mode

```bash
openclaw config validate --strict
```

Strict mode adds additional checks:
- Version field presence
- Complete agent configurations
- Model routing completeness

## Reset Configuration

To reset to defaults:

```bash
openclaw config reset
```

This creates a minimal valid configuration:

```json
{
  "version": "2.0.0",
  "collective": {
    "name": "OpenClaw Collective",
    "description": "Self-improving autonomous agent collective",
    "version": "2.0.0"
  },
  "models": {
    "providers": {
      "ollama": {
        "type": "ollama",
        "models": []
      }
    }
  },
  "agents": [
    {
      "id": "steward",
      "name": "Steward",
      "role": "Orchestrator",
      "model": "agent/steward",
      "port": 18790
    }
  ],
  "model_routing": {
    "default": "ollama/llama2"
  }
}
```
