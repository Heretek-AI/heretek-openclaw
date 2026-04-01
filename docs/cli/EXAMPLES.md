# OpenClaw CLI Usage Examples

Common usage patterns and examples for the OpenClaw CLI.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Deployment Examples](#deployment-examples)
3. [Management Examples](#management-examples)
4. [Troubleshooting Examples](#troubleshooting-examples)
5. [Advanced Examples](#advanced-examples)

---

## Getting Started

### First-Time Setup

```bash
# Run interactive setup wizard
openclaw init

# Follow the prompts to:
# 1. Select deployment type (Docker recommended)
# 2. Choose AI provider
# 3. Enter API keys
# 4. Select agents
# 5. Configure observability
```

### Quick Deploy

```bash
# Initialize with defaults
openclaw init --type docker --non-interactive

# Deploy
openclaw deploy -y

# Check status
openclaw status
```

---

## Deployment Examples

### Docker Compose

```bash
# Standard Docker deployment
openclaw init --type docker
openclaw deploy

# Deploy with rebuild
openclaw deploy --build --force-recreate

# Pull latest images first
openclaw deploy --pull
```

### Bare Metal

```bash
# Initialize for bare metal
openclaw init --type bare-metal

# Deploy (installs system packages, configures services)
openclaw deploy

# Note: Requires root/sudo access
```

### Kubernetes (Helm)

```bash
# Initialize for Kubernetes
openclaw init --type kubernetes

# Deploy using Helm
openclaw deploy kubernetes --method helm

# Deploy with custom values
openclaw deploy kubernetes --method helm \
  --values ./custom-values.yaml \
  --set replicaCount=3
```

### Kubernetes (Kustomize)

```bash
# Deploy using Kustomize
openclaw deploy kubernetes --method kustomize --overlay production
```

### AWS

```bash
# Initialize for AWS
openclaw init --type aws

# Deploy with Terraform
openclaw deploy aws --auto-approve
```

### GCP

```bash
# Initialize for GCP
openclaw init --type gcp

# Deploy
openclaw deploy gcp
```

### Azure

```bash
# Initialize for Azure
openclaw init --type azure

# Deploy
openclaw deploy azure
```

---

## Management Examples

### Status Checking

```bash
# Full status overview
openclaw status

# Service status only
openclaw status --services

# Agent status only
openclaw status --agents

# Resource usage
openclaw status --resources

# JSON output for scripting
openclaw status --json | jq '.health.healthy'
```

### Log Management

```bash
# View all logs
openclaw logs

# View specific service logs
openclaw logs gateway
openclaw logs litellm
openclaw logs postgres

# Follow logs in real-time
openclaw logs -f
openclaw logs gateway -f

# Show last N lines
openclaw logs --tail 200

# With timestamps
openclaw logs --timestamps

# Filter by log level
openclaw logs --level error
openclaw logs --level warn

# Search for patterns
openclaw logs --grep "connection"
openclaw logs gateway --grep "timeout"
```

### Backup Operations

```bash
# Create incremental backup
openclaw backup create

# Create full backup with verification
openclaw backup create --type full --verify

# List all backups
openclaw backup list

# Show backup details in JSON
openclaw backup list --json | jq '.[0]'

# Restore from backup
openclaw backup restore openclaw_full_2024-01-15

# Restore specific components
openclaw backup restore openclaw_full_2024-01-15 \
  --components postgresql,config

# Verify backup integrity
openclaw backup verify openclaw_full_2024-01-15

# Delete old backup
openclaw backup delete openclaw_incremental_2024-01-10 --confirm

# Rotate backups older than 30 days
openclaw backup rotate --days 30
```

### Configuration Management

```bash
# Show full configuration
openclaw config show

# Show specific path
openclaw config show --path model_routing.default

# JSON output
openclaw config show --json

# Validate configuration
openclaw config validate

# Strict validation
openclaw config validate --strict

# Get specific value
openclaw config get model_routing.default

# Set specific value
openclaw config set model_routing.default openai/gpt-4o

# Reset to defaults
openclaw config reset --confirm
```

### Agent Management

```bash
# List all agents
openclaw agents list

# JSON output
openclaw agents list --json | jq '.[].agent_name'

# Start specific agent
openclaw agents start steward

# Start with model assignment
openclaw agents start steward --model openai/gpt-4o

# Stop agent
openclaw agents stop steward

# Check agent status
openclaw agents status steward

# Configure agent model
openclaw agents configure historian --model anthropic/claude-sonnet-4-20250514

# List available models
openclaw agents models

# Models grouped by provider
openclaw agents models --json
```

### Health Monitoring

```bash
# Run all health checks
openclaw health check

# Check specific service
openclaw health check --service postgres
openclaw health check --service redis
openclaw health check --service gateway

# JSON output
openclaw health check --json | jq '.checks.gateway.healthy'

# Continuous monitoring
openclaw health watch --interval 60

# Generate health report
openclaw health report

# Save report to file
openclaw health report --output health-report.json
```

### Update Management

```bash
# Check for updates
openclaw update check

# JSON output
openclaw update check --json

# Apply update
openclaw update apply

# Dry run (preview changes)
openclaw update apply --dry-run

# Rollback to previous version
openclaw update rollback

# View update history
openclaw update history
```

---

## Troubleshooting Examples

### Service Issues

```bash
# Check if services are running
openclaw status

# Check specific service health
openclaw health check --service gateway

# View service logs
openclaw logs gateway -f

# Restart service (Docker)
docker compose restart gateway

# Restart service (systemd)
sudo systemctl restart openclaw-gateway
```

### Database Issues

```bash
# Check PostgreSQL health
openclaw health check --service postgres

# Check Redis health
openclaw health check --service redis

# View database logs
openclaw logs postgres --tail 100
```

### Agent Issues

```bash
# List registered agents
openclaw agents list

# Check specific agent status
openclaw agents status steward

# Restart agent
openclaw agents stop steward
openclaw agents start steward
```

### Configuration Issues

```bash
# Validate configuration
openclaw config validate

# Show current configuration
openclaw config show

# Reset to defaults if corrupted
openclaw config reset --confirm
```

---

## Advanced Examples

### Scripting with CLI

```bash
#!/bin/bash
# Health check script

# Check if system is healthy
HEALTHY=$(openclaw health check --json | jq '.healthy')

if [ "$HEALTHY" != "true" ]; then
    echo "System unhealthy!"
    openclaw health report --output /var/log/openclaw/health-$(date +%Y%m%d).json
    exit 1
fi

echo "System healthy"
exit 0
```

### Automated Backup Script

```bash
#!/bin/bash
# Daily backup script

# Create verified backup
openclaw backup create --type incremental --verify

# Rotate old backups
openclaw backup rotate --days 30

# Log result
echo "Backup completed: $(date)" >> /var/log/openclaw/backup.log
```

### Deployment Pipeline

```bash
#!/bin/bash
# CI/CD deployment script

set -e

# Validate configuration
openclaw config validate --strict

# Check for updates
openclaw update check

# Deploy with health check
openclaw deploy --build

# Wait for services
sleep 30

# Verify health
openclaw health check

if [ $? -eq 0 ]; then
    echo "Deployment successful"
else
    echo "Deployment failed, rolling back"
    openclaw update rollback --confirm
    exit 1
fi
```

### Multi-Environment Setup

```bash
# Development
export OPENCLAW_CONFIG=./config/dev/openclaw.json
openclaw deploy docker

# Staging
export OPENCLAW_CONFIG=./config/staging/openclaw.json
openclaw deploy kubernetes --method helm

# Production
export OPENCLAW_CONFIG=./config/production/openclaw.json
openclaw deploy aws --auto-approve
```

### Monitoring Dashboard Integration

```bash
#!/bin/bash
# Export metrics for monitoring

# Get status as JSON
STATUS=$(openclaw status --json)

# Extract metrics
echo "gateway_healthy=$(echo $STATUS | jq '.health.healthy')"
echo "agent_count=$(echo $STATUS | jq '.checks.agents.agentCount')"
echo "model_count=$(echo $STATUS | jq '.checks.litellm.modelCount')"
```

### Bulk Agent Operations

```bash
#!/bin/bash
# Start all agents

AGENTS=$(openclaw agents list --json | jq -r '.[].id')

for AGENT in $AGENTS; do
    echo "Starting $AGENT..."
    openclaw agents start $AGENT
done

# Verify all started
openclaw agents list
```

---

## Tips and Best Practices

### 1. Always Validate Before Deploy

```bash
openclaw config validate && openclaw deploy
```

### 2. Create Backups Before Changes

```bash
openclaw backup create --verify && openclaw deploy
```

### 3. Use Health Checks in Scripts

```bash
openclaw health check --json | jq -e '.healthy' || exit 1
```

### 4. Combine Commands for Efficiency

```bash
openclaw status && openclaw health check && openclaw agents list
```

### 5. Use JSON Output for Automation

```bash
openclaw backup list --json | jq -r '.[].name'
```
