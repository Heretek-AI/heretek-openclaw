# Agent Restart Procedures

## Overview

This runbook covers procedures for restarting individual agents or the entire agent collective in the Heretek OpenClaw system.

## Prerequisites

- Access to the host system with Docker installed
- `docker` and `docker compose` commands available
- Knowledge of which agent(s) need restarting

## Agent Ports Reference

| Agent | Role | Port | Container Name |
|-------|------|------|----------------|
| steward | Orchestrator | 8001 | heretek-steward |
| alpha | Triad | 8002 | heretek-alpha |
| beta | Triad | 8003 | heretek-beta |
| charlie | Triad | 8004 | heretek-charlie |
| examiner | Interrogator | 8005 | heretek-examiner |
| explorer | Scout | 8006 | heretek-explorer |
| sentinel | Guardian | 8007 | heretek-sentinel |
| coder | Artisan | 8008 | heretek-coder |
| dreamer | Visionary | 8009 | heretek-dreamer |
| empath | Diplomat | 8010 | heretek-empath |
| historian | Archivist | 8011 | heretek-historian |

## Scenario 1: Restart Single Agent

### Symptoms
- Agent not responding to health checks
- Agent stuck in busy state
- Agent disconnected from collective

### Procedure

```bash
# 1. Verify agent is unhealthy
./scripts/health-check.sh

# 2. Check agent logs
docker logs heretek-<agent-name> --tail 100

# 3. Graceful restart
docker restart heretek-<agent-name>

# 4. Verify agent recovered
sleep 10
./scripts/health-check.sh <agent-name>
```

### Example: Restart Steward

```bash
docker restart heretek-steward
sleep 10
curl -f http://localhost:8001/health
```

## Scenario 2: Force Restart Agent

### When to Use
- Graceful restart failed
- Agent in unrecoverable state
- Agent consuming excessive resources

### Procedure

```bash
# 1. Stop agent forcefully
docker stop -t 0 heretek-<agent-name>

# 2. Remove container
docker rm heretek-<agent-name>

# 3. Recreate and start
cd /root/heretek/heretek-openclaw
docker compose up -d <agent-name>

# 4. Verify startup
docker logs heretek-<agent-name> --tail 50
```

## Scenario 3: Restart All Agents

### When to Use
- System-wide issues
- After infrastructure changes
- After configuration updates

### Procedure

```bash
cd /root/heretek/heretek-openclaw

# Graceful restart of all agents
docker compose restart

# Verify all agents healthy
./scripts/health-check.sh

# Or watch for recovery
./scripts/health-check.sh --watch
```

## Scenario 4: Restart with Clean State

### When to Use
- Agent state corruption suspected
- Testing fresh agent initialization
- After identity/protocol changes

### Procedure

```bash
# 1. Stop the agent
docker stop heretek-<agent-name>

# 2. Remove the agent's memory volume (CAUTION: destroys state)
docker volume rm heretek-openclaw_agent_memory_<agent-name>

# 3. Restart agent
docker compose up -d <agent-name>

# 4. Monitor initialization
docker logs -f heretek-<agent-name>
```

### Warning
This procedure will erase:
- Agent session history
- Agent memory files
- Agent state data

## Scenario 5: Rolling Restart (Zero Downtime)

### When to Use
- Production deployments
- Configuration updates
- Minimizing service disruption

### Procedure

```bash
cd /root/heretek/heretek-openclaw

# Restart agents one at a time with delay
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
    echo "Restarting $agent..."
    docker restart heretek-$agent
    sleep 15
    # Verify before continuing
    if ! curl -sf http://localhost:800${port}/health > /dev/null; then
        echo "WARNING: $agent failed to recover!"
        break
    fi
done
```

## Post-Restart Verification

### Checklist

- [ ] Agent health endpoint responds (HTTP 200)
- [ ] Agent appears in LiteLLM A2A registry
- [ ] Agent can communicate with database
- [ ] Agent can communicate with Redis
- [ ] Agent heartbeat is regular (< 30s intervals)
- [ ] No error spikes in logs
- [ ] Dashboard shows agent as online

### Verification Commands

```bash
# Health check
./scripts/health-check.sh

# Check agent in A2A registry
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  http://localhost:4000/v1/agents | jq .

# Check recent logs for errors
docker logs heretek-<agent-name> --tail 50 | grep -i error

# Check memory volume exists
docker volume ls | grep agent_memory_<agent-name>
```

## Troubleshooting

### Agent Won't Start

```bash
# Check container logs
docker logs heretek-<agent-name>

# Check if port is in use
netstat -tlnp | grep 8001

# Check resource availability
docker stats --no-stream

# Check network connectivity
docker network inspect heretek-network
```

### Agent Starts But Can't Connect

```bash
# Verify LiteLLM is running
docker ps | grep litellm

# Verify database is running
docker ps | grep postgres

# Verify Redis is running
docker ps | grep redis

# Test database connectivity
docker exec heretek-<agent-name> \
  psql -h postgres -U heretek -d heretek -c "SELECT 1"
```

### Agent Crashes Repeatedly

1. Check logs for root cause
2. Verify configuration files are valid
3. Check for resource exhaustion (memory, CPU)
4. Consider clean state restart (Scenario 4)
5. Escalate to engineering if persists

## Escalation

If restart procedures fail to restore agent health:

1. Document all attempted procedures
2. Capture full agent logs: `docker logs heretek-<agent-name> > agent-logs.txt`
3. Capture system state: `docker inspect heretek-<agent-name>`
4. Contact system administrator or engineering team
