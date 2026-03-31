# Legacy Container Cleanup Procedure

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**Migration:** OpenClaw Gateway v2026.3.28

This document describes the procedure for cleaning up legacy Docker agent containers after migrating to OpenClaw Gateway.

---

## Background

Prior to OpenClaw Gateway v2026.3.28, Heretek OpenClaw used a **container-based architecture** where each of the 11 agents ran as a separate Docker container on ports 8001-8011.

### Legacy Architecture (Deprecated)

| Container | Port | Agent Role | Status |
|-----------|------|------------|--------|
| `heretek-steward` | 8001 | Orchestrator | ⛔ Stopped |
| `heretek-alpha` | 8002 | Triad Member | ⛔ Stopped |
| `heretek-beta` | 8003 | Triad Member | ⛔ Stopped |
| `heretek-charlie` | 8004 | Triad Member | ⛔ Stopped |
| `heretek-examiner` | 8005 | Evaluator | ⛔ Stopped |
| `heretek-explorer` | 8006 | Researcher | ⛔ Stopped |
| `heretek-sentinel` | 8007 | Safety | ⛔ Stopped |
| `heretek-coder` | 8008 | Developer | ⛔ Stopped |
| `heretek-dreamer` | 8009 | Creative | ⛔ Stopped |
| `heretek-empath` | 8010 | Emotional | ⛔ Stopped |
| `heretek-historian` | 8011 | Historical | ⛔ Stopped |

### Current Architecture (Gateway)

All 11 agents now run as **workspaces within the OpenClaw Gateway process** on port 18789. The legacy Docker containers are no longer needed.

---

## Identifying Legacy Containers

### Check Running Containers

```bash
# List all containers
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Look for containers with ports 8001-8011
docker ps | grep -E '800[1-9]|801[0-1]'
```

### Expected Output (Before Cleanup)

```
NAMES                    PORTS                    STATUS
heretek-steward          0.0.0.0:8001->8001/tcp   Up 2 hours
heretek-alpha            0.0.0.0:8002->8002/tcp   Up 2 hours
heretek-beta             0.0.0.0:8003->8003/tcp   Up 2 hours
heretek-charlie          0.0.0.0:8004->8004/tcp   Up 2 hours
heretek-examiner         0.0.0.0:8005->8005/tcp   Up 2 hours
heretek-explorer         0.0.0.0:8006->8006/tcp   Up 2 hours
heretek-sentinel         0.0.0.0:8007->8007/tcp   Up 2 hours
heretek-coder            0.0.0.0:8008->8008/tcp   Up 2 hours
heretek-dreamer          0.0.0.0:8009->8009/tcp   Up 2 hours
heretek-empath           0.0.0.0:8010->8010/tcp   Up 2 hours
heretek-historian        0.0.0.0:8011->8011/tcp   Up 2 hours
```

### Expected Output (After Cleanup)

```
NAMES                    PORTS                    STATUS
heretek-litellm          0.0.0.0:4000->4000/tcp   Up 8 hours
heretek-postgres         127.0.0.1:5432->5432/tcp Up 8 hours
heretek-redis            127.0.0.1:6379->6379/tcp Up 8 hours
heretek-ollama           127.0.0.1:11434->11434/tcp Up 8 hours
heretek-websocket-bridge 127.0.0.1:3002-3003/tcp  Up 5 hours
heretek-web              0.0.0.0:3000->3000/tcp   Up 6 hours
```

---

## Cleanup Procedure

### Step 1: Verify Gateway is Running

Before stopping legacy containers, ensure the OpenClaw Gateway is running:

```bash
# Check Gateway status
openclaw gateway status

# Expected output:
# Gateway: Running
# Version: v2026.3.28
# Agents: 12 configured
```

### Step 2: Verify Agent Workspaces

Ensure all agent workspaces are configured:

```bash
# List agent workspaces
ls -la ~/.openclaw/agents/

# Expected directories:
# main, steward, alpha, beta, charlie, examiner, explorer, sentinel, coder, dreamer, empath, historian
```

### Step 3: Stop Legacy Containers

```bash
# Stop all legacy agent containers
docker stop \
  heretek-steward \
  heretek-alpha \
  heretek-beta \
  heretek-charlie \
  heretek-examiner \
  heretek-explorer \
  heretek-sentinel \
  heretek-coder \
  heretek-dreamer \
  heretek-empath \
  heretek-historian

# Verify containers stopped
docker ps | grep -E 'heretek-(steward|alpha|beta|charlie|examiner|explorer|sentinel|coder|dreamer|empath|historian)'
# (No output expected)
```

### Step 4: (Optional) Remove Legacy Containers

If you want to completely remove the containers (not just stop them):

```bash
# Remove all legacy agent containers
docker rm \
  heretek-steward \
  heretek-alpha \
  heretek-beta \
  heretek-charlie \
  heretek-examiner \
  heretek-explorer \
  heretek-sentinel \
  heretek-coder \
  heretek-dreamer \
  heretek-empath \
  heretek-historian
```

**Note:** Container removal is safe - they can be recreated from docker-compose.yml if needed for rollback.

### Step 5: Update docker-compose.yml (Optional)

To prevent legacy containers from being recreated, you can comment them out in docker-compose.yml:

```yaml
# Legacy agent services - commented out after Gateway migration
# services:
#   steward:
#     build:
#       context: .
#       dockerfile: Dockerfile.agent
#     ports:
#       - "8001:8001"
#     # ... rest of config
```

---

## Post-Cleanup Validation

### Validate Gateway Operation

```bash
# Check Gateway status
openclaw gateway status

# Test agent communication
openclaw agent status steward
```

### Validate Infrastructure Services

```bash
# Check Docker services
docker compose ps

# Expected output:
# NAME                      STATUS
# heretek-litellm           Up (healthy)
# heretek-postgres          Up (healthy)
# heretek-redis             Up (healthy)
# heretek-ollama            Up
# heretek-websocket-bridge  Up (healthy)
# heretek-web               Up
```

### Test Agent Communication

```bash
# Send test message through Gateway
# (Use Dashboard or WebSocket client)
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -d '{
    "model": "agent/steward",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Rollback Procedure

If you need to rollback to the legacy architecture:

### Step 1: Restart Legacy Containers

```bash
# Start all legacy agent containers
docker start \
  heretek-steward \
  heretek-alpha \
  heretek-beta \
  heretek-charlie \
  heretek-examiner \
  heretek-explorer \
  heretek-sentinel \
  heretek-coder \
  heretek-dreamer \
  heretek-empath \
  heretek-historian
```

### Step 2: Stop Gateway

```bash
# Stop OpenClaw Gateway
openclaw gateway stop
```

### Step 3: Restore Redis Pub/Sub Configuration

```bash
# Update agent configurations to use Redis Pub/Sub
# (Restore from backup if available)
```

---

## Troubleshooting

### Issue: Gateway Not Running After Cleanup

**Symptom:** Agents not responding after stopping legacy containers

**Solution:**
```bash
# Check Gateway status
openclaw gateway status

# Restart Gateway if needed
openclaw gateway restart

# Verify agent workspaces
ls -la ~/.openclaw/agents/
```

### Issue: Port Still in Use

**Symptom:** Error binding to port 18789

**Solution:**
```bash
# Check what's using the port
sudo netstat -tlnp | grep 18789

# Kill the process if needed
sudo kill -9 <PID>

# Restart Gateway
openclaw gateway restart
```

### Issue: Agent Workspace Missing

**Symptom:** `openclaw agent status <agent>` shows workspace not found

**Solution:**
```bash
# Re-deploy the agent
./agents/deploy-agent.sh <agent> <role>

# Verify workspace created
ls -la ~/.openclaw/agents/<agent>/
```

---

## Resource Savings

### Before Cleanup

| Resource | Usage |
|----------|-------|
| **Containers** | 17 (11 agents + 6 infrastructure) |
| **Ports Used** | 17 (8001-8011, 4000, 5432, 6379, 11434, 3002-3003, 3000) |
| **Node.js Runtimes** | 11 (one per agent container) |
| **Memory Overhead** | ~2-4 GB (11 containers) |

### After Cleanup

| Resource | Usage |
|----------|-------|
| **Containers** | 6 (infrastructure only) |
| **Ports Used** | 7 (18789, 4000, 5432, 6379, 11434, 3002-3003, 3000) |
| **Node.js Runtimes** | 1 (Gateway) |
| **Memory Overhead** | ~500 MB - 1 GB (Gateway) |

### Savings

- **65% reduction** in container count (17 → 6)
- **59% reduction** in port usage (17 → 7)
- **91% reduction** in Node.js runtimes (11 → 1)
- **50-75% reduction** in memory overhead

---

## Migration Checklist

- [ ] Verify OpenClaw Gateway installed and running
- [ ] Verify all agent workspaces created in `~/.openclaw/agents/`
- [ ] Test agent communication through Gateway
- [ ] Stop all legacy agent containers (ports 8001-8011)
- [ ] Verify infrastructure containers still running
- [ ] Test Dashboard access (port 7000)
- [ ] Test ClawBridge access (port 3001)
- [ ] Update documentation to reflect Gateway architecture
- [ ] (Optional) Remove legacy containers
- [ ] (Optional) Update docker-compose.yml

---

## References

- [Gateway Architecture](../architecture/GATEWAY_ARCHITECTURE.md)
- [Local Deployment Guide](../deployment/LOCAL_DEPLOYMENT.md)
- [Deployment Validation Report](./deployment-validation-report.md)

---

🦞 *The thought that never ends.*
