# Heretek OpenClaw CLI

> Unified command-line interface for Heretek OpenClaw deployment and management.

## Installation

### npm (Recommended)

```bash
npm install -g @heretek/openclaw-cli
```

### From Source

```bash
git clone https://github.com/heretek/heretek-openclaw-cli.git
cd heretek-openclaw-cli
npm install
npm link
```

## Quick Start

```bash
# Initialize OpenClaw deployment
openclaw init

# Deploy OpenClaw
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
- `openclaw.config.js` - CLI settings

## Troubleshooting

### Command not found

```bash
# Ensure CLI is installed
npm install -g @heretek/openclaw-cli

# Or run directly
node bin/openclaw.js
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

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Related Repositories

- [Core](https://github.com/heretek/heretek-openclaw-core) - Gateway and agents
- [Dashboard](https://github.com/heretek/heretek-openclaw-dashboard) - Health monitoring
- [Plugins](https://github.com/heretek/heretek-openclaw-plugins) - Plugin system
- [Deploy](https://github.com/heretek/heretek-openclaw-deploy) - Infrastructure as Code
- [Docs](https://github.com/heretek/heretek-openclaw-docs) - Documentation site

## License

MIT

## Support

- **Issues:** https://github.com/heretek/heretek-openclaw-cli/issues
- **Discussions:** https://github.com/heretek/heretek-openclaw-cli/discussions

---

🦞 *The thought that never ends.*
