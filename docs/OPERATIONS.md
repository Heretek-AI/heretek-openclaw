# Heretek OpenClaw Operations Guide

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

This guide covers operational procedures for Heretek OpenClaw, including health monitoring, backup procedures, troubleshooting, and emergency runbooks.

### Operations Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| [`health-check.sh`](#health-checksh) | Service health verification | `scripts/health-check.sh` |
| [`production-backup.sh`](#production-backupsh) | Backup and restore system | `scripts/production-backup.sh` |
| [`validate-cycles.sh`](#validate-cyclESSh) | Implementation validation | `scripts/validate-cycles.sh` |
| [`litellm-healthcheck.py`](#litellm-healthcheckpy) | LiteLLM health check | `scripts/litellm-healthcheck.py` |

---

## Health Monitoring

### health-check.sh

**Location:** `scripts/health-check.sh`  
**Purpose:** Comprehensive service health verification

#### Usage

```bash
# Check all services
./scripts/health-check.sh

# Check specific service
./scripts/health-check.sh litellm
./scripts/health-check.sh postgres
./scripts/health-check.sh redis

# Continuous monitoring
./scripts/health-check.sh --watch
```

#### Checks Performed

| Service | Check | Description |
|---------|-------|-------------|
| **LiteLLM** | HTTP health endpoint | Verifies API responsiveness |
| **PostgreSQL** | pg_isready + container | Database connectivity |
| **Redis** | PING command | Cache connectivity |
| **Docker** | Container status | Service running state |
| **A2A Agents** | Agent discovery | Agent availability |
| **OpenClaw Gateway** | Gateway status | Gateway daemon state |

#### Output Example

```
==============================================
  Heretek OpenClaw — Health Check
==============================================

Checking LiteLLM Gateway... ✓ OK
  Version: 1.40.0
  Available models: 12

Checking PostgreSQL... ✓ OK
  pgvector: enabled

Checking Redis... ✓ OK
  Version: 7.0.11

Checking Docker Containers... ✓ OK
  heretek-litellm: Up
  heretek-postgres: Up
  heretek-redis: Up
  heretek-ollama: Up

Checking OpenClaw Gateway... ✓ OK
  Status: running
  Agents: 11 active

==============================================
  All services healthy
==============================================
```

---

### litellm-healthcheck.py

**Location:** `scripts/litellm-healthcheck.py`  
**Purpose:** Lightweight LiteLLM liveness probe

#### Usage

```bash
# Run health check
python3 scripts/litellm-healthcheck.py

# In script or CI/CD
python3 scripts/litellm-healthcheck.py && echo "LiteLLM healthy"
```

#### Implementation

```python
#!/usr/bin/env python3
import requests
import sys

LITELLM_HOST = "http://localhost:4000"
API_KEY = "heretek-master-key-change-me"

try:
    response = requests.get(
        f"{LITELLM_HOST}/health",
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=5
    )
    if response.status_code == 200:
        print("✓ LiteLLM healthy")
        sys.exit(0)
    else:
        print(f"✗ LiteLLM unhealthy: {response.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"✗ LiteLLM unreachable: {e}")
    sys.exit(1)
```

---

## Backup Procedures

### production-backup.sh

**Location:** `scripts/production-backup.sh`  
**Purpose:** Comprehensive backup system with rotation, verification, and restore

#### Usage

```bash
# Backup everything
./scripts/production-backup.sh --all

# Backup specific components
./scripts/production-backup.sh --database    # PostgreSQL only
./scripts/production-backup.sh --redis       # Redis only
./scripts/production-backup.sh --workspace   # Workspace files
./scripts/production-backup.sh --agent-state # Agent states
./scripts/production-backup.sh --config      # Configuration files

# Restore operations
./scripts/production-backup.sh --restore latest      # Restore latest
./scripts/production-backup.sh --restore 20260331    # Restore specific date

# Maintenance
./scripts/production-backup.sh --verify 20260331     # Verify backup
./scripts/production-backup.sh --list                # List backups
./scripts/production-backup.sh --cleanup             # Remove expired
```

#### Backup Components

| Component | Location | Backup Method |
|-----------|----------|---------------|
| **PostgreSQL** | Port 5432 | pg_dump with gzip |
| **Redis** | Port 6379 | RDB snapshot |
| **Workspace** | `~/.openclaw/workspace` | tar archive |
| **Agent State** | `~/.openclaw/agents/*/session.jsonl` | tar archive |
| **Configuration** | `openclaw.json`, `litellm_config.yaml` | copy |

#### Backup Schedule

```bash
# Cron configuration
# Daily at 2 AM
0 2 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --all

# Weekly full backup with verification (Sunday 3 AM)
0 3 * * 0 /root/heretek/heretek-openclaw/scripts/production-backup.sh --all --verify
```

#### Backup Rotation

- **Daily backups:** Keep 7 days
- **Weekly backups:** Keep 4 weeks
- **Monthly backups:** Keep 12 months

---

## validate-cycles.sh

**Location:** `scripts/validate-cycles.sh`  
**Purpose:** Validate implementation cycles and generate validation report

#### Usage

```bash
# Run validation
./scripts/validate-cycles.sh

# Verbose output
./scripts/validate-cycles.sh --verbose

# Output to file
./scripts/validate-cycles.sh --output validation-report.md
```

#### Validation Cycles

| Cycle | Description | Status |
|-------|-------------|--------|
| **Cycle 1** | Agent Registry Fix | Validated |
| **Cycle 2** | Health Check Service | Validated |
| **Cycle 3** | A2A Communication | Validated |
| **Cycle 5** | Gateway Integration | Validated |
| **Cycle 6** | Consolidation | Validated |
| **Cycle 8** | Documentation | Validated |

---

## Runbooks

### Agent Restart Runbook

**Scenario:** One or more agents are unresponsive

**Location:** [`operations/runbook-agent-restart.md`](operations/runbook-agent-restart.md)

#### Steps

1. **Identify Affected Agent**
```bash
openclaw agent list
openclaw agent status <agent>
```

2. **Check Agent Workspace**
```bash
ls -la ~/.openclaw/agents/<agent>/
cat ~/.openclaw/agents/<agent>/session.jsonl | tail
```

3. **Restart Gateway**
```bash
openclaw gateway restart
```

4. **Verify Recovery**
```bash
openclaw agent status <agent>
./scripts/health-check.sh
```

---

### Backup Restoration Runbook

**Scenario:** Data loss or corruption requiring backup restoration

**Location:** [`operations/runbook-backup-restoration.md`](operations/runbook-backup-restoration.md)

#### Steps

1. **Identify Backup to Restore**
```bash
./scripts/production-backup.sh --list
```

2. **Stop Services**
```bash
docker compose down
openclaw gateway stop
```

3. **Restore Database**
```bash
./scripts/production-backup.sh --restore <date>
```

4. **Verify Restoration**
```bash
docker compose up -d postgres
docker compose exec postgres psql -U heretek -c "SELECT COUNT(*) FROM collective_memory;"
```

5. **Restart All Services**
```bash
docker compose up -d
openclaw gateway start
```

---

### Database Corruption Runbook

**Scenario:** PostgreSQL database corruption detected

**Location:** [`operations/runbook-database-corruption.md`](operations/runbook-database-corruption.md)

#### Steps

1. **Stop PostgreSQL**
```bash
docker compose stop postgres
```

2. **Check Database Integrity**
```bash
docker compose run --rm postgres pg_check
```

3. **Restore from Backup**
```bash
./scripts/production-backup.sh --restore latest --database
```

4. **Verify Recovery**
```bash
docker compose up -d postgres
docker compose exec postgres psql -U heretek -c "SELECT 1;"
```

---

### Emergency Shutdown Runbook

**Scenario:** Immediate system shutdown required

**Location:** [`operations/runbook-emergency-shutdown.md`](operations/runbook-emergency-shutdown.md)

#### Steps

1. **Stop OpenClaw Gateway**
```bash
openclaw gateway stop
```

2. **Stop Docker Services**
```bash
docker compose down
```

3. **Verify Shutdown**
```bash
docker compose ps
openclaw gateway status
```

4. **Preserve State (Optional)**
```bash
./scripts/production-backup.sh --all --emergency
```

---

### Service Failure Runbook

**Scenario:** One or more Docker services failed

**Location:** [`operations/runbook-service-failure.md`](operations/runbook-service-failure.md)

#### Steps

1. **Identify Failed Service**
```bash
docker compose ps
docker compose logs <service>
```

2. **Attempt Restart**
```bash
docker compose restart <service>
```

3. **Check Dependencies**
```bash
docker compose logs postgres  # If LiteLLM failed
docker compose logs redis     # If caching failed
```

4. **Recreate Service**
```bash
docker compose rm -f <service>
docker compose up -d <service>
```

---

### Troubleshooting Runbook

**Scenario:** General system issues

**Location:** [`operations/runbook-troubleshooting.md`](operations/runbook-troubleshooting.md)

#### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| **LiteLLM won't start** | Container exits immediately | Check API keys in .env |
| **Agent not responding** | No heartbeat | Restart Gateway |
| **PostgreSQL connection failed** | Connection refused | Check container status |
| **Redis cache miss** | Slow responses | Verify Redis connectivity |
| **Gateway WebSocket fails** | Connection refused | Check Gateway status |

#### Diagnostic Commands

```bash
# Full system diagnostic
docker compose ps
docker compose logs
openclaw gateway status
./scripts/health-check.sh

# Network connectivity
curl http://localhost:4000/health
redis-cli ping
docker compose exec postgres psql -U heretek -c "SELECT 1;"

# Resource usage
docker stats
df -h ~/.openclaw
```

---

## Monitoring Configuration

### Cron Schedules

**Location:** `docs/operations/cron-schedule.sh`

```bash
#!/bin/bash
# Install cron jobs for OpenClaw operations

# Health check every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/heretek/heretek-openclaw/scripts/health-check.sh >> /var/log/openclaw-health.log 2>&1") | crontab -

# Daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --all >> /var/log/openclaw-backup.log 2>&1") | crontab -

# Weekly validation on Sunday at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * 0 /root/heretek/heretek-openclaw/scripts/validate-cycles.sh --output /var/log/openclaw-validation.md") | crontab -
```

---

## Backup Configuration

**Location:** `docs/operations/backup-config.json`

```json
{
  "backup": {
    "enabled": true,
    "schedule": "0 2 * * *",
    "rotation": {
      "daily": 7,
      "weekly": 4,
      "monthly": 12
    },
    "components": {
      "database": true,
      "redis": true,
      "workspace": true,
      "agent_state": true,
      "config": true
    },
    "verification": {
      "enabled": true,
      "schedule": "0 3 * * 0"
    }
  }
}
```

---

## Monitoring Configuration

**Location:** `docs/operations/monitoring-config.json`

```json
{
  "monitoring": {
    "health_check": {
      "enabled": true,
      "interval_seconds": 300,
      "alert_threshold": 3
    },
    "metrics": {
      "cost_tracking": true,
      "latency_tracking": true,
      "token_usage": true
    },
    "alerts": {
      "email": false,
      "webhook": false,
      "slack": false
    }
  }
}
```

---

## Governance Quorum Rules

**Location:** `docs/operations/governance-quorum-rules.json`

```json
{
  "quorum": {
    "triad": {
      "members": ["alpha", "beta", "charlie"],
      "consensus_threshold": 2,
      "veto_power": false
    },
    "failover": {
      "enabled": true,
      "timeout_seconds": 300,
      "fallback_agent": "steward"
    }
  }
}
```

---

## References

- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Deployment procedures
- [`CONFIGURATION.md`](CONFIGURATION.md) - Configuration reference
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - System architecture
- [`runbook-agent-restart.md`](operations/runbook-agent-restart.md) - Agent restart
- [`runbook-backup-restoration.md`](operations/runbook-backup-restoration.md) - Backup restoration

---

🦞 *The thought that never ends.*
