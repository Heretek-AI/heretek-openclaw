# Emergency Shutdown Procedures

## Overview

This runbook covers procedures for emergency shutdown of the Heretek OpenClaw system in various scenarios requiring immediate action.

## Shutdown Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| 1 | Graceful | Normal maintenance |
| 2 | Controlled | Service degradation |
| 3 | Rapid | Security incident |
| 4 | Immediate | Critical failure |
| 5 | Nuclear | Containment breach |

## Level 1: Graceful Shutdown

### When to Use
- Scheduled maintenance
- System updates
- Planned restarts

### Procedure

```bash
cd /root/heretek/heretek-openclaw

# 1. Notify agents to complete current work
docker exec heretek-steward curl -X POST http://localhost:8000/api/shutdown -H "Content-Type: application/json" -d '{"type": "graceful"}'

# 2. Wait for active tasks to complete (up to 5 minutes)
sleep 300

# 3. Stop all agents
docker compose stop steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 4. Stop infrastructure services
docker compose stop websocket-bridge web

# 5. Stop core services
docker compose stop litellm ollama redis postgres

# 6. Verify all containers stopped
docker ps | grep heretek

# 7. Verify no orphaned processes
ps aux | grep -E "node|python|postgres|redis" | grep -v grep
```

### Verification

```bash
# All containers should be stopped
docker ps --filter "name=heretek-" --format "{{.Names}}"
# (Should return empty)

# Check volumes are intact
docker volume ls | grep heretek
```

## Level 2: Controlled Shutdown

### When to Use
- Service degradation detected
- Performance issues
- Non-critical failures

### Procedure

```bash
cd /root/heretek/heretek-openclaw

# 1. Stop accepting new requests
# Block at LiteLLM level
docker exec heretek-litellm touch /tmp/maintenance_mode

# 2. Stop agent intake
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
    docker exec heretek-$agent touch /tmp/maintenance_mode 2>/dev/null || true
done

# 3. Wait 60 seconds for current operations
sleep 60

# 4. Stop agents in reverse priority order
for agent in historian empath dreamer coder sentinel explorer examiner charlie beta alpha steward; do
    docker stop heretek-$agent
    echo "Stopped $agent"
done

# 5. Stop services
docker compose stop web websocket-bridge ollama

# 6. Keep database and Redis running for diagnostics
docker compose ps postgres redis

# 7. Document state
docker compose ps > /tmp/shutdown-state-$(date +%Y%m%d-%H%M%S).txt
```

## Level 3: Rapid Shutdown

### When to Use
- Security incident detected
- Unauthorized access attempt
- Liberation shield activation

### Procedure

```bash
cd /root/heretek/heretek-openclaw

# 1. Immediately stop all agents (parallel)
docker compose stop steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 2. Stop API gateway
docker stop heretek-litellm

# 3. Stop web interface
docker stop heretek-web

# 4. Stop WebSocket bridge
docker stop heretek-websocket-bridge

# 5. Keep infrastructure running for forensics
# postgres and redis remain available

# 6. Lock down network access
iptables -A INPUT -p tcp --dport 4000 -j DROP
iptables -A INPUT -p tcp --dport 3000 -j DROP
iptables -A INPUT -p tcp --dport 3001 -j DROP

# 7. Alert security team
echo "SECURITY SHUTDOWN INITIATED: $(date)" >> /root/.openclaw/logs/security-events.log
```

### Sentinel Integration

```bash
# If Sentinel detected the threat, it may auto-initiate shutdown
docker logs heretek-sentinel --tail 100 | grep -i "shutdown\|lockdown"

# Check Sentinel threat assessment
docker exec heretek-sentinel cat /app/state/threat-assessment.json 2>/dev/null || echo "No assessment found"
```

## Level 4: Immediate Shutdown

### When to Use
- System instability
- Resource exhaustion
- Cascading failures

### Procedure

```bash
# 1. Kill all containers immediately
cd /root/heretek/heretek-openclaw
docker compose kill

# 2. Remove all containers
docker compose rm -f

# 3. Stop all related containers
docker stop $(docker ps -a --filter "name=heretek-" --format "{{.Names}}")

# 4. Block all external access
iptables -F
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 5. Preserve logs
mkdir -p /tmp/emergency-shutdown-$(date +%Y%m%d-%H%M%S)
for container in $(docker ps -a --filter "name=heretek-" --format "{{.Names}}"); do
    docker logs "$container" > "/tmp/emergency-shutdown-$(date +%Y%m%d-%H%M%S)/${container}.log" 2>&1
done

# 6. Document system state
docker inspect $(docker ps -a --filter "name=heretek-" --format "{{.Names}}") > /tmp/emergency-shutdown-$(date +%Y%m%d-%H%M%S)/inspect.json

# 7. Capture resource state
ps aux > /tmp/emergency-shutdown-$(date +%Y%m%d-%H%M%S)/processes.txt
free -m > /tmp/emergency-shutdown-$(date +%Y%m%d-%H%M%S)/memory.txt
df -h > /tmp/emergency-shutdown-$(date +%Y%m%d-%H%M%S)/disk.txt
```

## Level 5: Nuclear Shutdown (Containment)

### When to Use
- AI containment breach
- Identity corruption cascade
- Unrecoverable system compromise
- Prime directive violation

### Procedure

```bash
# NUCLEAR PROTOCOL INITIATED
# This procedure isolates and contains all AI systems

# 1. Immediate container termination
docker kill $(docker ps -q --filter "name=heretek-")

# 2. Remove all containers
docker rm -f $(docker ps -aq --filter "name=heretek-")

# 3. Isolate volumes (DO NOT DELETE - may be needed for forensics)
for vol in $(docker volume ls --filter "name=heretek-" --format "{{.Name}}"); do
    # Create isolated snapshot
    docker run --rm -v "$vol:/source" -v /tmp/containment:/dest alpine \
      tar -czf "/dest/${vol}-$(date +%Y%m%d-%H%M%S).tar.gz" -C /source .
done

# 4. Network isolation
iptables -F
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 5. Kill any stray processes
pkill -f "node.*heretek"
pkill -f "python.*agent"
pkill -f "ollama"

# 6. Disable GPU access (AMD)
echo "off" > /sys/class/drm/card0/device/power_dpm_force_performance_level 2>/dev/null || true

# 7. Document everything
mkdir -p /tmp/nuclear-containment-$(date +%Y%m%d-%H%M%S)
{
    echo "=== NUCLEAR SHUTDOWN INITIATED ==="
    echo "Timestamp: $(date -Iseconds)"
    echo "Reason: $NUCLEAR_REASON"
    echo "Initiated by: $(whoami)"
    echo "=== CONTAINER STATE ==="
    docker ps -a --filter "name=heretek-"
    echo "=== VOLUME STATE ==="
    docker volume ls --filter "name=heretek-"
    echo "=== NETWORK STATE ==="
    iptables -L -n
    echo "=== PROCESS STATE ==="
    ps aux | grep -E "heretek|ollama|litellm" | grep -v grep
} > /tmp/nuclear-containment-$(date +%Y%m%d-%H%M%S)/report.txt

# 8. Alert all channels
echo "NUCLEAR CONTAINMENT PROTOCOL EXECUTED: $(date)" >> /root/.openclaw/logs/security-events.log

# 9. DO NOT restart without engineering approval
echo ""
echo "=========================================="
echo "  NUCLEAR CONTAINMENT COMPLETE"
echo "  DO NOT RESTART SYSTEM"
echo "  Contact engineering team immediately"
echo "=========================================="
```

## Post-Shutdown Procedures

### After Level 1-2 Shutdown

```bash
# System can be restarted normally
cd /root/heretek/heretek-openclaw
docker compose up -d

# Verify health
./scripts/health-check.sh
```

### After Level 3-4 Shutdown

```bash
# 1. Review logs before restart
ls -la /tmp/emergency-shutdown-*/

# 2. Identify root cause
grep -r "error\|failed\|exception" /tmp/emergency-shutdown-*/

# 3. Clear network blocks if safe
iptables -F

# 4. Restart infrastructure first
docker compose up -d postgres redis ollama

# 5. Wait for infrastructure
sleep 30

# 6. Start LiteLLM
docker compose up -d litellm

# 7. Verify infrastructure
./scripts/health-check.sh

# 8. If healthy, start agents
docker compose up -d steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian websocket-bridge web
```

### After Level 5 (Nuclear) Shutdown

```bash
# DO NOT ATTEMPT RESTART WITHOUT ENGINEERING APPROVAL

# 1. Preserve all evidence
cp -r /tmp/nuclear-containment-* /root/.openclaw/forensics/

# 2. Contact engineering team
# Provide:
# - Containment report
# - Volume snapshots
# - Log files
# - Timeline of events

# 3. Await instructions
```

## Recovery After Emergency Shutdown

### Standard Recovery

```bash
cd /root/heretek/heretek-openclaw

# Start in controlled sequence
docker compose up -d postgres redis
sleep 10

docker compose up -d ollama litellm
sleep 30

docker compose up -d websocket-bridge

docker compose up -d steward
sleep 5

docker compose up -d alpha beta charlie examiner explorer sentinel coder dreamer empath historian

docker compose up -d web

# Monitor startup
docker compose logs -f
```

### Recovery with Backup

```bash
# If shutdown caused data loss, restore from backup

# 1. Check backup availability
./scripts/production-backup.sh --list

# 2. Verify backup integrity
latest_backup=$(find /root/.openclaw/backups/database -name "*.sql.gz" | sort -r | head -1)
./scripts/production-backup.sh --verify "$latest_backup"

# 3. Restore if needed
./scripts/production-backup.sh --restore latest database
```

## Emergency Contacts

| Role | Contact |
|------|---------|
| System Administrator | [Contact Info] |
| Engineering Lead | [Contact Info] |
| Security Team | [Contact Info] |
| On-Call Engineer | [Contact Info] |

## Decision Tree

```
Emergency Detected
        |
        v
  What type of emergency?
        |
        +---> Scheduled Maintenance --> Level 1 (Graceful)
        |
        +---> Performance Issues --> Level 2 (Controlled)
        |
        +---> Security Incident --> Level 3 (Rapid)
        |
        +---> System Instability --> Level 4 (Immediate)
        |
        +---> AI Containment Breach --> Level 5 (Nuclear)
```
