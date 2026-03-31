# Operations Guide Overview

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Operations Components](#operations-components)
3. [Quick Reference](#quick-reference)
4. [Runbooks](#runbooks)
5. [Related Documents](#related-documents)

---

## Overview

This guide provides comprehensive operations documentation for Heretek OpenClaw, including monitoring, backup, and troubleshooting procedures.

---

## Operations Components

| Component | Description | Documentation |
|-----------|-------------|---------------|
| **Monitoring** | Prometheus + Grafana monitoring stack | [Monitoring Stack](./monitoring.md) |
| **Backup** | Automated and manual backup procedures | [Backup Procedures](./backup.md) |
| **Troubleshooting** | Common issues and resolutions | [Troubleshooting](./troubleshooting.md) |
| **Langfuse** | LLM observability integration | [Langfuse](../operations/LANGFUSE_OBSERVABILITY.md) |

---

## Quick Reference

### Health Checks

```bash
# Full system health check
./scripts/health-check.sh

# Continuous monitoring
./scripts/health-check.sh --watch

# Check Gateway status
openclaw gateway status

# Check Docker services
docker compose ps
```

### Backup Commands

```bash
# Full backup
./scripts/production-backup.sh --all

# Database only
./scripts/production-backup.sh --database

# List backups
./scripts/production-backup.sh --list

# Restore latest
./scripts/production-backup.sh --restore latest
```

### Service Management

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart litellm

# View logs
docker compose logs -f <service>
```

### Emergency Procedures

```bash
# Emergency shutdown
docker compose down
openclaw gateway stop

# Emergency restart
docker compose up -d
openclaw gateway start

# Disaster recovery
./scripts/production-backup.sh --restore latest
```

---

## Runbooks

### Available Runbooks

| Runbook | Purpose | Location |
|---------|---------|----------|
| **Agent Restart** | Restart failed agents | [runbook-agent-restart.md](../operations/runbook-agent-restart.md) |
| **Backup Restoration** | Restore from backup | [runbook-backup-restoration.md](../operations/runbook-backup-restoration.md) |
| **Database Corruption** | Recover from corruption | [runbook-database-corruption.md](../operations/runbook-database-corruption.md) |
| **Emergency Shutdown** | Emergency procedures | [runbook-emergency-shutdown.md](../operations/runbook-emergency-shutdown.md) |
| **Service Failure** | Recover from failures | [runbook-service-failure.md](../operations/runbook-service-failure.md) |
| **Troubleshooting** | General troubleshooting | [runbook-troubleshooting.md](../operations/runbook-troubleshooting.md) |

---

## Monitoring Stack

### Prometheus

- **URL:** http://localhost:9090
- **Purpose:** Metrics collection and alerting
- **Retention:** 30 days

### Grafana

- **URL:** http://localhost:3001
- **Purpose:** Visualization dashboards
- **Default Credentials:** admin / (set on first login)

### Langfuse

- **URL:** https://cloud.langfuse.com (or self-hosted)
- **Purpose:** LLM observability
- **Features:** Traces, costs, latency tracking

---

## Alert Categories

| Category | Severity | Examples |
|----------|----------|----------|
| **Critical** | Immediate action | Service down, database corruption |
| **Warning** | Prompt attention | High resource usage, agent offline |
| **Info** | Awareness | Deployment complete, backup success |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Deployment Guide](../deployment/overview.md) | Deployment documentation |
| [Architecture](../architecture/overview.md) | System architecture |
| [API Reference](../api/overview.md) | API documentation |

---

🦞 *The thought that never ends.*
