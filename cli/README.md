# OpenClaw CLI

Unified command-line interface for Heretek OpenClaw deployment and management.

## Installation

### From Source

```bash
cd cli
npm install
npm link
```

### Global Installation

```bash
npm install -g @heretek/openclaw-cli
```

## Quick Start

```bash
# Initialize OpenClaw
openclaw init

# Deploy
openclaw deploy

# Check status
openclaw status

# View health
openclaw health check
```

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `openclaw init` | Initialize deployment configuration |
| `openclaw deploy` | Deploy OpenClaw |
| `openclaw status` | Check deployment status |
| `openclaw logs` | View logs |
| `openclaw stop` | Stop deployment |

### Management Commands

| Command | Description |
|---------|-------------|
| `openclaw backup` | Manage backups |
| `openclaw config` | Manage configuration |
| `openclaw update` | Update OpenClaw |
| `openclaw agents` | Manage agents |
| `openclaw health` | Run health checks |

## Command Reference

### `openclaw init`

Initialize deployment configuration with interactive setup wizard.

```bash
# Interactive mode
openclaw init

# Non-interactive mode
openclaw init --type docker --non-interactive

# Specify output directory
openclaw init --output /path/to/config
```

**Options:**
- `-t, --type <type>` - Deployment type (docker, bare-metal, kubernetes, aws, gcp, azure)
- `-o, --output <path>` - Output directory for configuration
- `-n, --non-interactive` - Non-interactive mode (use defaults)
- `--skip-validation` - Skip configuration validation

### `openclaw deploy`

Deploy OpenClaw using the configured deployment type.

```bash
# Interactive deployment
openclaw deploy

# Deploy to Docker
openclaw deploy docker

# Deploy to Kubernetes with Helm
openclaw deploy kubernetes --method helm

# Deploy with build
openclaw deploy --build --force-recreate
```

**Options:**
- `-c, --config <path>` - Configuration file path
- `--build` - Build images before deployment
- `--force-recreate` - Force recreate containers
- `--pull` - Pull latest images
- `--method <method>` - Deployment method (helm, kustomize) for Kubernetes
- `--auto-approve` - Auto-approve Terraform changes
- `-y, --yes` - Skip confirmation prompts

### `openclaw status`

Check deployment status and display service health.

```bash
# Full status
openclaw status

# Service status only
openclaw status --services

# Agent status only
openclaw status --agents

# JSON output
openclaw status --json
```

**Options:**
- `-t, --type <type>` - Deployment type
- `--services` - Show service status only
- `--agents` - Show agent status only
- `--resources` - Show resource usage
- `--json` - Output as JSON

### `openclaw logs`

View logs from OpenClaw services.

```bash
# View all logs
openclaw logs

# View specific service logs
openclaw logs gateway

# Follow logs
openclaw logs -f

# Show last 200 lines
openclaw logs --tail 200

# Filter by pattern
openclaw logs --grep "error"
```

**Options:**
- `-f, --follow` - Follow log output
- `-n, --tail <lines>` - Number of lines to show
- `--since <time>` - Show logs since timestamp
- `--until <time>` - Show logs until timestamp
- `--timestamps` - Show timestamps
- `--grep <pattern>` - Filter logs by pattern

### `openclaw stop`

Stop OpenClaw deployment gracefully.

```bash
# Stop with confirmation
openclaw stop

# Force stop
openclaw stop --force

# Stop and create backup
openclaw stop --backup

# Skip confirmation
openclaw stop -y
```

**Options:**
- `-f, --force` - Force stop
- `--volumes` - Remove volumes (Docker only)
- `--backup` - Create backup before stopping
- `-y, --yes` - Skip confirmation

### `openclaw backup`

Manage backups.

```bash
# Create backup
openclaw backup create

# Create full backup with verification
openclaw backup create --type full --verify

# List backups
openclaw backup list

# Restore from backup
openclaw backup restore backup-name

# Delete backup
openclaw backup delete backup-name

# Verify backup
openclaw backup verify backup-name

# Rotate old backups
openclaw backup rotate --days 30
```

### `openclaw config`

Manage configuration.

```bash
# Show configuration
openclaw config show

# Show specific path
openclaw config show --path model_routing.default

# Validate configuration
openclaw config validate

# Reset to defaults
openclaw config reset

# Get value
openclaw config get model_routing.default

# Set value
openclaw config set model_routing.default openai/gpt-4o
```

### `openclaw update`

Update OpenClaw.

```bash
# Check for updates
openclaw update check

# Apply update
openclaw update apply

# Dry run
openclaw update apply --dry-run

# Rollback
openclaw update rollback

# Show history
openclaw update history
```

### `openclaw agents`

Manage agents.

```bash
# List agents
openclaw agents list

# Start agent
openclaw agents start steward

# Stop agent
openclaw agents stop steward

# Agent status
openclaw agents status steward

# Configure agent model
openclaw agents configure steward --model openai/gpt-4o

# List available models
openclaw agents models
```

### `openclaw health`

Run health checks.

```bash
# Run all checks
openclaw health check

# Check specific service
openclaw health check --service postgres

# Continuous monitoring
openclaw health watch --interval 60

# Generate report
openclaw health report --output report.json
```

## Deployment Types

### Docker

```bash
openclaw init --type docker
openclaw deploy
```

### Bare Metal

```bash
openclaw init --type bare-metal
openclaw deploy
```

### Kubernetes

```bash
openclaw init --type kubernetes
openclaw deploy --method helm
```

### Cloud (AWS/GCP/Azure)

```bash
openclaw init --type aws
openclaw deploy --auto-approve
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_URL` | Gateway endpoint | `http://localhost:18789` |
| `LITELLM_URL` | LiteLLM endpoint | `http://localhost:4000` |
| `LITELLM_MASTER_KEY` | LiteLLM API key | - |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

## Configuration Files

- `openclaw.json` - Main configuration file
- `.env` - Environment variables
- `~/.openclaw/openclaw.json` - User configuration
- `cli/openclaw.config.js` - CLI settings

## Troubleshooting

### Command not found

```bash
# Ensure CLI is installed
npm install -g @heretek/openclaw-cli

# Or run directly
node cli/bin/openclaw.js
```

### Permission denied

```bash
# Fix npm global permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Docker connection failed

```bash
# Ensure Docker is running
docker ps

# Check Docker socket permissions
sudo usermod -aG docker $USER
```

## Additional Resources

- [CLI Documentation](../docs/cli/README.md)
- [Command Reference](../docs/cli/COMMANDS.md)
- [Configuration Guide](../docs/cli/CONFIGURATION.md)
- [Usage Examples](../docs/cli/EXAMPLES.md)
