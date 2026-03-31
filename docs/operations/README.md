# Heretek OpenClaw Operations Documentation

## Overview

This directory contains operational documentation for the Heretek OpenClaw system, including monitoring configurations, backup procedures, governance rules, and operational runbooks.

## Directory Structure

```
docs/operations/
├── README.md                          # This file - Operations index
├── monitoring-config.json             # Monitoring thresholds and alerting rules
├── backup-config.json                 # Backup schedules and retention policies
├── governance-quorum-rules.json       # Governance and voting configuration
├── runbook-agent-restart.md           # Agent restart procedures
├── runbook-service-failure.md         # Service failure recovery
├── runbook-database-corruption.md     # Database corruption handling
├── runbook-backup-restoration.md      # Backup restoration procedures
├── runbook-emergency-shutdown.md      # Emergency shutdown procedures
└── runbook-troubleshooting.md         # General troubleshooting guide
```

## Configuration Files

### Monitoring Configuration ([`monitoring-config.json`](./monitoring-config.json))

Defines health monitoring thresholds and alerting rules:

- **Health Check Interval**: 30 seconds
- **Metrics Retention**: 30 days
- **Alert Cooldown**: 15 minutes

**Thresholds**:
| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | 70% | 90% |
| Memory | 75% | 90% |
| Disk | 80% | 95% |
| Response Time | 5000ms | 15000ms |
| Agent Heartbeat Timeout | 120s | - |

**Alert Channels**: Console, File, Webhook (configurable), Email (configurable)

### Backup Configuration ([`backup-config.json`](./backup-config.json))

Automated backup schedules:

| Backup Type | Schedule | Retention | Min Backups |
|-------------|----------|-----------|-------------|
| Database | Daily 2 AM | 30 days | 7 |
| Redis | Daily 3 AM | 7 days | 3 |
| Workspace | Daily 4 AM | 30 days | 7 |
| Agent State | Every 6 hours | 7 days | 4 |
| Full System | Weekly Sunday 5 AM | 90 days | 4 |

**Backup Location**: `/root/.openclaw/backups/`

### Governance Quorum Rules ([`governance-quorum-rules.json`](./governance-quorum-rules.json))

Triad decision-making configuration:

**Voting Thresholds**:
- **Simple Majority** (>50%): Routine operational decisions, skill deployments
- **Supermajority** (>66.67%): Governance changes, new agents, security policies
- **Unanimous** (100%): Identity changes, core values, autonomy levels

**Decision Categories**:
- **Operational**: Simple majority, 5 min timeout
- **Tactical**: Supermajority, 10 min timeout, requires examiner review
- **Strategic**: Unanimous, 15 min timeout, requires sentinel approval
- **Emergency**: Simple majority, 1 min timeout

## Operational Runbooks

### Quick Reference

| Scenario | Runbook | Severity |
|----------|---------|----------|
| Agent not responding | [Agent Restart](./runbook-agent-restart.md) | Medium |
| Service failure | [Service Failure](./runbook-service-failure.md) | High |
| Database issues | [Database Corruption](./runbook-database-corruption.md) | Critical |
| Need to restore data | [Backup Restoration](./runbook-backup-restoration.md) | High |
| Emergency situation | [Emergency Shutdown](./runbook-emergency-shutdown.md) | Critical |
| General problems | [Troubleshooting](./runbook-troubleshooting.md) | Variable |

### Runbook Summaries

#### [Agent Restart Procedures](./runbook-agent-restart.md)

Covers procedures for restarting individual agents or the entire collective:
- Single agent restart
- Force restart
- Full collective restart
- Clean state restart
- Rolling restart (zero downtime)

#### [Service Failure Recovery](./runbook-service-failure.md)

Recovery procedures for critical infrastructure failures:
- LiteLLM Gateway failure
- PostgreSQL failure
- Redis failure
- Ollama/GPU failure
- WebSocket Bridge failure
- Web Dashboard failure

#### [Database Corruption Handling](./runbook-database-corruption.md)

Detection, diagnosis, and recovery for database corruption:
- Corruption detection methods
- Integrity checking procedures
- Recovery levels (1-5)
- Post-recovery verification

#### [Backup Restoration Procedures](./runbook-backup-restoration.md)

Step-by-step restoration from backups:
- Database restoration
- Redis restoration
- Workspace restoration
- Agent state restoration
- Full system restoration
- Restoration testing

#### [Emergency Shutdown Procedures](./runbook-emergency-shutdown.md)

Emergency shutdown at various levels:
- Level 1: Graceful (maintenance)
- Level 2: Controlled (degradation)
- Level 3: Rapid (security)
- Level 4: Immediate (instability)
- Level 5: Nuclear (containment)

#### [Troubleshooting Guide](./runbook-troubleshooting.md)

Systematic troubleshooting for common issues:
- Agent offline
- High CPU/memory usage
- Connection errors
- A2A protocol issues
- Vector operation failures
- GPU/Ollama issues

## Scripts

### Health Check Script

```bash
# Check all services
./scripts/health-check.sh

# Check specific service
./scripts/health-check.sh litellm

# Continuous monitoring
./scripts/health-check.sh --watch
```

### Backup Script

```bash
# Full backup
./scripts/production-backup.sh --all

# Specific backup
./scripts/production-backup.sh --database
./scripts/production-backup.sh --redis
./scripts/production-backup.sh --workspace

# Restore
./scripts/production-backup.sh --restore latest

# List backups
./scripts/production-backup.sh --list

# Verify backup
./scripts/production-backup.sh --verify <file>

# Cleanup old backups
./scripts/production-backup.sh --cleanup
```

## Cron Schedules

To enable automated backups, add to crontab (`crontab -e`):

```cron
# Heretek OpenClaw Automated Backups
# Database backup - Daily at 2 AM
0 2 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --database >> /root/.openclaw/logs/backup-cron.log 2>&1

# Redis backup - Daily at 3 AM
0 3 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --redis >> /root/.openclaw/logs/backup-cron.log 2>&1

# Workspace backup - Daily at 4 AM
0 4 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --workspace >> /root/.openclaw/logs/backup-cron.log 2>&1

# Agent state backup - Every 6 hours
0 */6 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --agent-state >> /root/.openclaw/logs/backup-cron.log 2>&1

# Full system backup - Weekly on Sunday at 5 AM
0 5 * * 0 /root/heretek/heretek-openclaw/scripts/production-backup.sh --full >> /root/.openclaw/logs/backup-cron.log 2>&1

# Backup cleanup - Daily at 6 AM
0 6 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --cleanup >> /root/.openclaw/logs/backup-cron.log 2>&1

# Health check - Every 5 minutes
*/5 * * * * /root/heretek/heretek-openclaw/scripts/health-check.sh >> /root/.openclaw/logs/health-cron.log 2>&1
```

## Dashboard Access

| Service | Port | URL |
|---------|------|-----|
| Web Dashboard | 3000 | http://localhost:3000 |
| LiteLLM UI | 4000 | http://localhost:4000 |
| WebSocket Bridge (HTTP) | 3002 | http://localhost:3002 |
| WebSocket Bridge (WS) | 3003 | ws://localhost:3003 |

## Agent Ports

| Agent | Port | Container |
|-------|------|-----------|
| Steward | 8001 | heretek-steward |
| Alpha | 8002 | heretek-alpha |
| Beta | 8003 | heretek-beta |
| Charlie | 8004 | heretek-charlie |
| Examiner | 8005 | heretek-examiner |
| Explorer | 8006 | heretek-explorer |
| Sentinel | 8007 | heretek-sentinel |
| Coder | 8008 | heretek-coder |
| Dreamer | 8009 | heretek-dreamer |
| Empath | 8010 | heretek-empath |
| Historian | 8011 | heretek-historian |

## Log Locations

```
/root/.openclaw/logs/
├── alerts.log              # Alert notifications
├── backup.log              # Backup operations
├── health-cron.log         # Health check logs
├── backup-cron.log         # Cron backup logs
├── governance-events.log   # Governance events
└── security-events.log     # Security events
```

## Emergency Contacts

| Role | Contact |
|------|---------|
| System Administrator | [Configure] |
| Engineering Lead | [Configure] |
| Security Team | [Configure] |
| On-Call Engineer | [Configure] |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-31 | Initial production hardening |
