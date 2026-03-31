# Service Failure Recovery

## Overview

This runbook covers recovery procedures for critical infrastructure service failures in the Heretek OpenClaw system.

## Critical Services

| Service | Port | Container | Purpose |
|---------|------|-----------|---------|
| LiteLLM Gateway | 4000 | heretek-litellm | API Gateway, A2A Protocol |
| PostgreSQL | 5432 | heretek-postgres | Database, Vector Store |
| Redis | 6379 | heretek-redis | Cache, Pub/Sub, Rate Limiting |
| Ollama | 11434 | heretek-ollama | Local LLM Runtime |
| WebSocket Bridge | 3002/3003 | heretek-websocket-bridge | Real-time Streaming |
| Web Dashboard | 3000 | heretek-web | UI Dashboard |

## Service: LiteLLM Gateway Failure

### Symptoms
- All agents unable to communicate
- A2A protocol not functioning
- API returns 503 or connection refused
- Dashboard shows all agents offline

### Diagnosis

```bash
# Check container status
docker ps | grep litellm

# Check health endpoint
curl -f http://localhost:4000/health

# Check logs
docker logs heretek-litellm --tail 100

# Check if port is bound
netstat -tlnp | grep 4000
```

### Recovery

```bash
cd /root/heretek/heretek-openclaw

# 1. Attempt graceful restart
docker restart heretek-litellm

# 2. If fails, stop and remove
docker stop heretek-litellm
docker rm heretek-litellm

# 3. Recreate service
docker compose up -d litellm

# 4. Wait for initialization
sleep 30

# 5. Verify recovery
./scripts/health-check.sh litellm
```

### If LiteLLM Won't Start

```bash
# Check configuration
docker exec heretek-litellm cat /app/config.yaml

# Check environment variables
docker exec heretek-litellm env | grep LITELLM

# Check database connectivity
docker exec heretek-litellm \
  python3 -c "import psycopg2; psycopg2.connect('postgresql://heretek:heretek@postgres:5432/heretek')"

# Full recreation
docker compose down litellm
docker compose up -d litellm
```

## Service: PostgreSQL Failure

### Symptoms
- Database queries failing
- Agents can't persist state
- Vector operations failing
- Connection refused on port 5432

### Diagnosis

```bash
# Check container status
docker ps | grep postgres

# Check health
docker exec heretek-postgres pg_isready -U heretek

# Check logs
docker logs heretek-postgres --tail 100

# Try connection
psql -h localhost -p 5432 -U heretek -d heretek -c "SELECT 1"
```

### Recovery

```bash
# 1. Attempt restart
docker restart heretek-postgres

# 2. Wait for database to be ready
sleep 10
docker exec heretek-postgres pg_isready -U heretek

# 3. Verify pgvector extension
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT extname FROM pg_extension WHERE extname='vector';"

# 4. Verify health
./scripts/health-check.sh postgres
```

### Database Corruption Recovery

```bash
# 1. Stop all agents to prevent further corruption
docker compose stop steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 2. Check database integrity
docker exec heretek-postgres psql -U heretek -d heretek -c "VACUUM ANALYZE;"

# 3. If severe, restore from backup
./scripts/production-backup.sh --restore latest

# 4. Restart agents
docker compose up -d
```

## Service: Redis Failure

### Symptoms
- Rate limiting not working
- Pub/Sub messages not delivered
- Cache misses increasing
- WebSocket connections failing

### Diagnosis

```bash
# Check container status
docker ps | grep redis

# Check health
docker exec heretek-redis redis-cli ping

# Check logs
docker logs heretek-redis --tail 100

# Check memory usage
docker exec heretek-redis redis-cli info memory
```

### Recovery

```bash
# 1. Attempt restart
docker restart heretek-redis

# 2. Verify recovery
docker exec heretek-redis redis-cli ping

# 3. Check data persistence
docker exec heretek-redis redis-cli CONFIG GET dir

# 4. Verify health
./scripts/health-check.sh redis
```

### Redis Data Loss Recovery

```bash
# 1. Stop Redis
docker stop heretek-redis

# 2. Restore from backup
./scripts/production-backup.sh --restore latest redis

# 3. Restart Redis
docker start heretek-redis

# 4. Verify data restored
docker exec heretek-redis redis-cli keys '*' | wc -l
```

## Service: Ollama Failure

### Symptoms
- Local LLM requests failing
- AMD GPU not accessible
- Embedding generation failing

### Diagnosis

```bash
# Check container status
docker ps | grep ollama

# Check health
curl -f http://localhost:11434/

# Check GPU access
docker exec heretek-ollama rocm-smi

# Check models
docker exec heretek-ollama ollama list
```

### Recovery

```bash
# 1. Restart Ollama
docker restart heretek-ollama

# 2. Wait for GPU initialization
sleep 30

# 3. Verify GPU access
docker exec heretek-ollama rocm-smi

# 4. Pull required models if missing
docker exec heretek-ollama ollama pull nomic-embed-text-v2-moe
```

## Service: WebSocket Bridge Failure

### Symptoms
- Real-time updates not working
- Dashboard not showing live data
- Redis Pub/Sub not bridged

### Diagnosis

```bash
# Check container status
docker ps | grep websocket-bridge

# Check HTTP health
curl -f http://localhost:3002/health

# Check WebSocket
wscat -c ws://localhost:3003

# Check logs
docker logs heretek-websocket-bridge --tail 100
```

### Recovery

```bash
# 1. Restart bridge
docker restart heretek-websocket-bridge

# 2. Verify HTTP health
curl -f http://localhost:3002/health

# 3. Verify WebSocket
wscat -c ws://localhost:3003
```

## Service: Web Dashboard Failure

### Symptoms
- Dashboard not accessible on port 7000/3000
- UI shows connection errors
- Agent status not displayed

### Diagnosis

```bash
# Check container status
docker ps | grep web

# Check health
curl -f http://localhost:3000/api/agents

# Check logs
docker logs heretek-web --tail 100
```

### Recovery

```bash
# 1. Restart web service
docker restart heretek-web

# 2. Verify recovery
curl -f http://localhost:3000/api/agents

# 3. If fails, rebuild
docker compose build web
docker compose up -d web
```

## Complete Infrastructure Restart

### When to Use
- Multiple service failures
- After host system updates
- Network configuration changes

### Procedure

```bash
cd /root/heretek/heretek-openclaw

# 1. Stop everything gracefully
docker compose down

# 2. Verify all containers stopped
docker ps | grep heretek

# 3. Start infrastructure first
docker compose up -d postgres redis ollama litellm

# 4. Wait for infrastructure
sleep 30

# 5. Verify infrastructure
./scripts/health-check.sh

# 6. Start agents
docker compose up -d steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 7. Start remaining services
docker compose up -d websocket-bridge web

# 8. Full health check
./scripts/health-check.sh --watch
```

## Monitoring During Recovery

```bash
# Watch all service logs
docker compose logs -f

# Watch specific service
docker logs -f heretek-<service-name>

# Monitor resource usage
docker stats

# Continuous health check
./scripts/health-check.sh --watch
```

## Escalation Procedures

### If Services Won't Recover

1. **Document the failure**
   - Capture all logs
   - Note time of failure
   - List attempted recovery steps

2. **Check system resources**
   ```bash
   df -h  # Disk space
   free -m  # Memory
   nvidia-smi || rocm-smi  # GPU status
   ```

3. **Check for external issues**
   - Network connectivity
   - DNS resolution
   - Firewall rules

4. **Contact engineering team** with:
   - Service failure details
   - Logs captured
   - Recovery attempts documented
   - System resource status
