# OpenClaw CLI Command Reference

Complete reference for all `openclaw` commands.

## Table of Contents

- [`openclaw init`](#openclaw-init)
- [`openclaw deploy`](#openclaw-deploy)
- [`openclaw status`](#openclaw-status)
- [`openclaw logs`](#openclaw-logs)
- [`openclaw stop`](#openclaw-stop)
- [`openclaw backup`](#openclaw-backup)
- [`openclaw config`](#openclaw-config)
- [`openclaw update`](#openclaw-update)
- [`openclaw agents`](#openclaw-agents)
- [`openclaw health`](#openclaw-health)

---

## `openclaw init`

Initialize deployment configuration with interactive setup wizard.

### Synopsis

```bash
openclaw init [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Deployment type (docker, bare-metal, kubernetes, aws, gcp, azure) |
| `-o, --output <path>` | Output directory for configuration |
| `-n, --non-interactive` | Non-interactive mode (use defaults) |
| `--skip-validation` | Skip configuration validation |
| `-h, --help` | Show help |

### Examples

```bash
# Interactive setup
openclaw init

# Non-interactive Docker setup
openclaw init --type docker --non-interactive

# Custom output directory
openclaw init --output /etc/openclaw
```

### Interactive Steps

1. **Deployment Type** - Choose deployment method
2. **AI Provider** - Select primary AI provider
3. **API Keys** - Configure provider credentials
4. **Agent Selection** - Choose which agents to enable
5. **Observability** - Configure Langfuse (optional)
6. **Review** - Confirm configuration

---

## `openclaw deploy`

Deploy OpenClaw using the configured deployment type.

### Synopsis

```bash
openclaw deploy [type] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `type` | Deployment type (optional, auto-detected if not specified) |

### Options

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Configuration file path |
| `--build` | Build images before deployment (Docker) |
| `--force-recreate` | Force recreate containers (Docker) |
| `--pull` | Pull latest images (Docker) |
| `--method <method>` | Deployment method: helm, kustomize (Kubernetes) |
| `--auto-approve` | Auto-approve Terraform changes (Cloud) |
| `-y, --yes` | Skip confirmation prompts |
| `-h, --help` | Show help |

### Examples

```bash
# Interactive deployment
openclaw deploy

# Deploy to Docker
openclaw deploy docker

# Deploy to Kubernetes with Helm
openclaw deploy kubernetes --method helm

# Deploy with rebuild
openclaw deploy --build --force-recreate

# Deploy to AWS
openclaw deploy aws --auto-approve
```

### Deployment Types

| Type | Description |
|------|-------------|
| `docker` | Docker Compose deployment |
| `bare-metal` | Direct Linux installation |
| `kubernetes` | Kubernetes cluster deployment |
| `aws` | AWS via Terraform |
| `gcp` | GCP via Terraform |
| `azure` | Azure via Terraform |

---

## `openclaw status`

Check deployment status and display service health.

### Synopsis

```bash
openclaw status [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Deployment type (auto-detect if not specified) |
| `--services` | Show service status only |
| `--agents` | Show agent status only |
| `--resources` | Show resource usage |
| `--json` | Output as JSON |
| `-h, --help` | Show help |

### Examples

```bash
# Full status
openclaw status

# Service status only
openclaw status --services

# Agent status
openclaw status --agents

# JSON output
openclaw status --json
```

### Output Fields

| Field | Description |
|-------|-------------|
| Service | Service name |
| Status | Current status (running, stopped, etc.) |
| Health | Health status (healthy, unhealthy) |

---

## `openclaw logs`

View logs from OpenClaw services.

### Synopsis

```bash
openclaw logs [service] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `service` | Service name (gateway, litellm, postgres, redis, ollama) |

### Options

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Deployment type |
| `-f, --follow` | Follow log output |
| `-n, --tail <lines>` | Number of lines to show (default: 100) |
| `--since <time>` | Show logs since timestamp |
| `--until <time>` | Show logs until timestamp |
| `--timestamps` | Show timestamps in logs |
| `--level <level>` | Filter by log level |
| `--grep <pattern>` | Filter logs by pattern |
| `--json` | Output as JSON |
| `-h, --help` | Show help |

### Examples

```bash
# View all logs
openclaw logs

# View gateway logs
openclaw logs gateway

# Follow logs
openclaw logs -f

# Last 200 lines with timestamps
openclaw logs --tail 200 --timestamps

# Filter errors
openclaw logs --level error

# Search for pattern
openclaw logs --grep "connection"
```

---

## `openclaw stop`

Stop OpenClaw deployment gracefully.

### Synopsis

```bash
openclaw stop [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-t, --type <type>` | Deployment type |
| `-f, --force` | Force stop (kill containers/processes) |
| `--volumes` | Remove volumes (Docker only) |
| `--backup` | Create backup before stopping |
| `-y, --yes` | Skip confirmation prompt |
| `-h, --help` | Show help |

### Examples

```bash
# Stop with confirmation
openclaw stop

# Force stop
openclaw stop --force

# Stop with backup
openclaw stop --backup

# Remove volumes
openclaw stop --volumes
```

---

## `openclaw backup`

Manage backups including create, list, restore, and delete.

### Synopsis

```bash
openclaw backup <command> [options]
```

### Subcommands

| Command | Description |
|---------|-------------|
| `create` | Create a new backup |
| `list` | List available backups |
| `restore` | Restore from a backup |
| `delete` | Delete a backup |
| `verify` | Verify a backup |
| `rotate` | Rotate old backups |

### `openclaw backup create`

```bash
openclaw backup create [options]
```

**Options:**
- `-t, --type <type>` - Backup type: full, incremental (default: incremental)
- `--verify` - Verify backup after creation
- `--compress` - Compress backup files

### `openclaw backup list`

```bash
openclaw backup list [options]
```

**Options:**
- `--json` - Output as JSON

### `openclaw backup restore`

```bash
openclaw backup restore <name> [options]
```

**Options:**
- `--components <list>` - Components to restore (all, postgresql, redis, workspace, config)
- `--confirm` - Skip confirmation prompt

### `openclaw backup delete`

```bash
openclaw backup delete <name> [options]
```

**Options:**
- `--confirm` - Skip confirmation prompt

### `openclaw backup verify`

```bash
openclaw backup verify <name>
```

### `openclaw backup rotate`

```bash
openclaw backup rotate [options]
```

**Options:**
- `--days <days>` - Retention period in days (default: 30)

---

## `openclaw config`

Manage configuration including view, edit, validate, and reset.

### Synopsis

```bash
openclaw config <command> [options]
```

### Subcommands

| Command | Description |
|---------|-------------|
| `show` | Show current configuration |
| `edit` | Edit configuration |
| `validate` | Validate configuration |
| `reset` | Reset to defaults |
| `get` | Get a specific value |
| `set` | Set a specific value |

### `openclaw config show`

```bash
openclaw config show [options]
```

**Options:**
- `--json` - Output as JSON
- `--path <path>` - Show specific config path

### `openclaw config validate`

```bash
openclaw config validate [options]
```

**Options:**
- `--strict` - Enable strict validation

### `openclaw config reset`

```bash
openclaw config reset [options]
```

**Options:**
- `--confirm` - Skip confirmation prompt

### `openclaw config get`

```bash
openclaw config get <path>
```

### `openclaw config set`

```bash
openclaw config set <path> <value>
```

---

## `openclaw update`

Check for and apply OpenClaw updates.

### Synopsis

```bash
openclaw update <command> [options]
```

### Subcommands

| Command | Description |
|---------|-------------|
| `check` | Check for available updates |
| `apply` | Apply available updates |
| `rollback` | Rollback to previous version |
| `history` | Show update history |

### `openclaw update check`

```bash
openclaw update check [options]
```

**Options:**
- `--json` - Output as JSON

### `openclaw update apply`

```bash
openclaw update apply [options]
```

**Options:**
- `--dry-run` - Show what would be updated
- `--rollback` - Rollback on failure
- `--confirm` - Skip confirmation prompt

### `openclaw update rollback`

```bash
openclaw update rollback [options]
```

**Options:**
- `--version <version>` - Specific version to rollback to
- `--confirm` - Skip confirmation prompt

---

## `openclaw agents`

Manage agents including list, start, stop, and configure.

### Synopsis

```bash
openclaw agents <command> [options]
```

### Subcommands

| Command | Description |
|---------|-------------|
| `list` | List all agents |
| `start` | Start an agent |
| `stop` | Stop an agent |
| `status` | Show agent status |
| `configure` | Configure agent model |
| `models` | List available models |

### `openclaw agents list`

```bash
openclaw agents list [options]
```

**Options:**
- `--json` - Output as JSON

### `openclaw agents start`

```bash
openclaw agents start <agent> [options]
```

**Options:**
- `--model <model>` - Model to assign

### `openclaw agents configure`

```bash
openclaw agents configure <agent> [options]
```

**Options:**
- `--model <model>` - Model to assign
- `--primary <model>` - Primary model
- `--failover <model>` - Failover model

---

## `openclaw health`

Run health checks on OpenClaw services.

### Synopsis

```bash
openclaw health <command> [options]
```

### Subcommands

| Command | Description |
|---------|-------------|
| `check` | Run all health checks |
| `watch` | Continuously monitor health |
| `report` | Generate health report |

### `openclaw health check`

```bash
openclaw health check [options]
```

**Options:**
- `--service <name>` - Check specific service only
- `--json` - Output as JSON

### `openclaw health watch`

```bash
openclaw health watch [options]
```

**Options:**
- `--interval <seconds>` - Check interval (default: 30)

### `openclaw health report`

```bash
openclaw health report [options]
```

**Options:**
- `--output <file>` - Save report to file

### Services Checked

| Service | Endpoint |
|---------|----------|
| gateway | http://localhost:18789/health |
| litellm | http://localhost:4000/health |
| postgres | localhost:5432 |
| redis | localhost:6379 |
| ollama | http://localhost:11434 |
| langfuse | http://localhost:3000 |
