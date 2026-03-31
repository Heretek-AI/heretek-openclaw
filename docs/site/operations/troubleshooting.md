# Troubleshooting Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Common Issues](#common-issues)
3. [Gateway Issues](#gateway-issues)
4. [Agent Issues](#agent-issues)
5. [Database Issues](#database-issues)
6. [LiteLLM Issues](#litellm-issues)
7. [Plugin Issues](#plugin-issues)
8. [Performance Issues](#performance-issues)
9. [Emergency Procedures](#emergency-procedures)
10. [Related Documents](#related-documents)

---

## Overview

This guide provides troubleshooting procedures for common Heretek OpenClaw issues.

---

## Common Issues

### Quick Diagnostics

```bash
# Run full health check
./scripts/health-check.sh

# Check all service status
docker compose ps

# Check Gateway status
openclaw gateway status

# View recent errors
journalctl -u openclaw-gateway --since "1 hour ago"
```

---

## Gateway Issues

### Gateway Won't Start

**Symptoms:**
- `openclaw gateway start` fails
- No process on port 18789

**Diagnosis:**
```bash
# Check Gateway status
openclaw gateway status

# Check logs
journalctl -u openclaw-gateway -n 50

# Check port usage
sudo netstat -tlnp | grep 18789
```

**Resolution:**
```bash
# Reinstall Gateway
openclaw gateway reinstall

# Clear stale lock files
rm -f /tmp/openclaw-*.lock

# Start Gateway
openclaw gateway start
```

### Gateway Crashes

**Symptoms:**
- Gateway stops unexpectedly
- High memory usage before crash

**Diagnosis:**
```bash
# Check for OOM
dmesg | grep -i "killed process"

# Check Gateway logs
journalctl -u openclaw-gateway --since "2 hours ago"
```

**Resolution:**
```bash
# Increase memory limits
# Edit /etc/systemd/system/openclaw-gateway.service
# Add: LimitMEMLOCK=infinity

# Restart with clean state
openclaw gateway stop
openclaw gateway start
```

---

## Agent Issues

### Agent Not Responding

**Symptoms:**
- Agent shows offline status
- No response to messages

**Diagnosis:**
```bash
# Check agent status
openclaw agent status <agent-name>

# Check workspace
ls -la ~/.openclaw/agents/<agent-name>/

# Check session file
tail ~/.openclaw/agents/<agent-name>/session.jsonl
```

**Resolution:**
```bash
# Restart agent
openclaw agent restart <agent-name>

# If still failing, redeploy
./agents/deploy-agent.sh <agent-name> <role>
```

### Agent Workspace Corrupted

**Symptoms:**
- Missing workspace files
- Session file errors

**Resolution:**
```bash
# Backup existing session
cp ~/.openclaw/agents/<agent-name>/session.jsonl ~/session-backup.jsonl

# Redeploy agent
./agents/deploy-agent.sh <agent-name> <role>

# Restore session if possible
cp ~/session-backup.jsonl ~/.openclaw/agents/<agent-name>/session.jsonl
```

---

## Database Issues

### PostgreSQL Connection Failed

**Symptoms:**
- Database connection errors
- Agents can't store sessions

**Diagnosis:**
```bash
# Check PostgreSQL status
docker compose ps postgres

# Check connection
docker compose exec postgres psql -U openclaw -c "SELECT 1;"

# Check logs
docker compose logs postgres
```

**Resolution:**
```bash
# Restart PostgreSQL
docker compose restart postgres

# If still failing, check disk space
df -h /var/lib/docker

# Check PostgreSQL logs
docker compose logs --tail=100 postgres
```

### Database Corruption

**Symptoms:**
- Query errors
- Missing data

**Resolution:**
```bash
# Stop services
docker compose down

# Run database check
docker compose exec postgres pg_check -U openclaw openclaw

# Restore from backup
./scripts/production-backup.sh --restore latest

# Start services
docker compose up -d
```

---

## LiteLLM Issues

### LiteLLM Not Responding

**Symptoms:**
- Health check fails
- Agent endpoints unavailable

**Diagnosis:**
```bash
# Check LiteLLM status
docker compose ps litellm

# Check health endpoint
curl http://localhost:4000/health

# Check logs
docker compose logs litellm
```

**Resolution:**
```bash
# Restart LiteLLM
docker compose restart litellm

# Validate configuration
python3 -c "import yaml; yaml.safe_load(open('litellm_config.yaml'))"

# Check configuration location
ls -la ~/.litellm/litellm_config.yaml
```

### Model Routing Issues

**Symptoms:**
- Model not found errors
- Failover not working

**Diagnosis:**
```bash
# List available models
curl http://localhost:4000/v1/models

# Check model routing
curl http://localhost:4000/router/info
```

**Resolution:**
```bash
# Update configuration
nano litellm_config.yaml

# Reload configuration
docker compose restart litellm
```

---

## Plugin Issues

### Plugin Not Loading

**Symptoms:**
- Plugin not in plugin list
- Plugin errors in logs

**Diagnosis:**
```bash
# List plugins
openclaw plugins list

# Check plugin installation
ls -la plugins/<plugin-name>/

# Check logs
journalctl -u openclaw-gateway | grep -i plugin
```

**Resolution:**
```bash
# Reinstall plugin
cd plugins/<plugin-name>
npm install
npm link
openclaw plugins install <plugin-name>

# Restart Gateway
openclaw gateway restart
```

### Plugin Errors

**Symptoms:**
- Plugin crashes
- Error messages in logs

**Resolution:**
```bash
# Check plugin logs
openclaw plugins logs <plugin-name>

# Run plugin tests
cd plugins/<plugin-name>
npm test

# Check configuration
cat plugins/<plugin-name>/config/default.json
```

---

## Performance Issues

### High Memory Usage

**Symptoms:**
- System slow
- OOM killer triggered

**Diagnosis:**
```bash
# Check memory usage
free -h
docker stats

# Check for memory leaks
ps aux | grep node | sort -k4 -rn | head
```

**Resolution:**
```bash
# Restart Gateway
openclaw gateway restart

# Reduce session retention
openclaw config set session.keeper.max_sessions 100

# Clear old sessions
openclaw session archive --older-than 7d
```

### High CPU Usage

**Symptoms:**
- High CPU load
- Slow response times

**Diagnosis:**
```bash
# Check CPU usage
top -bn1 | head -20
docker stats

# Check for runaway processes
ps aux | grep -E "node|python" | sort -k3 -rn | head
```

**Resolution:**
```bash
# Identify and restart problematic service
docker compose restart <service>

# Check for infinite loops in plugins
openclaw plugins list --verbose
```

---

## Emergency Procedures

### Emergency Shutdown

```bash
# Stop all Docker services
docker compose down

# Stop Gateway
openclaw gateway stop

# Kill any remaining processes
pkill -f openclaw
pkill -f litellm
```

### Emergency Restart

```bash
# Start infrastructure
docker compose up -d

# Wait for services to be healthy
sleep 30

# Start Gateway
openclaw gateway start

# Verify
./scripts/health-check.sh
```

### Disaster Recovery

```bash
# Stop all services
docker compose down

# Restore from backup
./scripts/production-backup.sh --restore latest

# Start services
docker compose up -d
openclaw gateway start

# Verify restoration
./scripts/health-check.sh
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Operations Overview](./overview.md) | Operations overview |
| [Monitoring Stack](./monitoring.md) | Monitoring documentation |
| [Backup Procedures](./backup.md) | Backup documentation |
| [Runbooks](../../operations/) | Detailed runbooks |

---

🦞 *The thought that never ends.*
