# Troubleshooting Guide

## Overview

This guide provides systematic troubleshooting procedures for common issues in the Heretek OpenClaw system.

## Diagnostic Tools

### Health Check Script

```bash
# Full system health check
./scripts/health-check.sh

# Check specific service
./scripts/health-check.sh litellm
./scripts/health-check.sh postgres
./scripts/health-check.sh redis

# Continuous monitoring
./scripts/health-check.sh --watch
```

### Backup Script

```bash
# List backups
./scripts/production-backup.sh --list

# Verify backup
./scripts/production-backup.sh --verify <backup-file>

# Cleanup old backups
./scripts/production-backup.sh --cleanup
```

### Docker Commands

```bash
# List all containers
docker ps -a --filter "name=heretek-"

# View logs
docker logs heretek-<service-name> --tail 100

# Follow logs in real-time
docker logs -f heretek-<service-name>

# Check resource usage
docker stats heretek-<service-name>

# Inspect container
docker inspect heretek-<service-name>

# Execute command in container
docker exec -it heretek-<service-name> bash
```

## Common Issues

### Issue: Agent Offline

**Symptoms**: Dashboard shows agent as offline, health check fails

**Diagnosis**:
```bash
# Check container status
docker ps | grep heretek-<agent-name>

# Check logs
docker logs heretek-<agent-name> --tail 100

# Check health endpoint
curl -f http://localhost:800X/health
```

**Solutions**:
```bash
# Restart agent
docker restart heretek-<agent-name>

# If fails, check resources
docker stats --no-stream heretek-<agent-name>

# Check network connectivity
docker network inspect heretek-network
```

### Issue: High CPU Usage

**Symptoms**: System slow, fans running high, docker stats shows high CPU

**Diagnosis**:
```bash
# Identify high CPU container
docker stats --no-stream

# Check which process is using CPU
docker exec heretek-<service-name> ps aux --sort=-%cpu | head -5
```

**Solutions**:
```bash
# 1. Check for runaway processes
docker top heretek-<service-name>

# 2. Restart the service
docker restart heretek-<service-name>

# 3. If persistent, check for infinite loops in logs
docker logs heretek-<service-name> --tail 1000 | grep -i "loop\|retry\|error"

# 4. Consider scaling resources or limiting CPU
docker update --cpus=2.0 heretek-<service-name>
```

### Issue: High Memory Usage

**Symptoms**: System swapping, OOM kills, slow performance

**Diagnosis**:
```bash
# Check memory usage
docker stats --no-stream

# Check for memory leaks
docker exec heretek-<service-name> free -m

# Check OOM events
dmesg | grep -i "out of memory"
```

**Solutions**:
```bash
# 1. Restart memory-heavy services
docker restart heretek-litellm heretek-<agents>

# 2. Clear Redis cache if needed
docker exec heretek-redis redis-cli FLUSHDB

# 3. Limit container memory
docker update --memory=2g heretek-<service-name>

# 4. Check for memory leaks in application logs
docker logs heretek-<service-name> | grep -i "memory\|leak"
```

### Issue: Database Connection Errors

**Symptoms**: Agents can't connect to database, queries failing

**Diagnosis**:
```bash
# Check PostgreSQL status
docker exec heretek-postgres pg_isready -U heretek

# Check connection count
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check for locks
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT * FROM pg_locks WHERE NOT granted;"
```

**Solutions**:
```bash
# 1. Restart PostgreSQL
docker restart heretek-postgres

# 2. Check max connections
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SHOW max_connections;"

# 3. Kill idle connections
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle';"

# 4. Check database integrity
docker exec heretek-postgres psql -U heretek -d heretek -c "VACUUM ANALYZE;"
```

### Issue: Redis Connection Errors

**Symptoms**: Cache misses, pub/sub not working, rate limiting failing

**Diagnosis**:
```bash
# Check Redis status
docker exec heretek-redis redis-cli ping

# Check memory usage
docker exec heretek-redis redis-cli info memory

# Check connected clients
docker exec heretek-redis redis-cli client list
```

**Solutions**:
```bash
# 1. Restart Redis
docker restart heretek-redis

# 2. Clear memory if full
docker exec heretek-redis redis-cli MEMORY PURGE

# 3. Check maxmemory setting
docker exec heretek-redis redis-cli CONFIG GET maxmemory

# 4. Evict keys if needed
docker exec heretek-redis redis-cli MEMORY DOCTOR
```

### Issue: LiteLLM Gateway Errors

**Symptoms**: API returning errors, A2A not working, models unavailable

**Diagnosis**:
```bash
# Check health
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" http://localhost:4000/health

# Check models
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" http://localhost:4000/v1/models

# Check agents
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" http://localhost:4000/v1/agents

# Check logs
docker logs heretek-litellm --tail 100
```

**Solutions**:
```bash
# 1. Restart LiteLLM
docker restart heretek-litellm

# 2. Check configuration
docker exec heretek-litellm cat /app/config.yaml

# 3. Check database connectivity
docker exec heretek-litellm python3 -c \
  "import psycopg2; psycopg2.connect('postgresql://heretek:heretek@postgres:5432/heretek')"

# 4. Rebuild if needed
docker compose build litellm
docker compose up -d litellm
```

### Issue: WebSocket Connection Failing

**Symptoms**: Dashboard not updating in real-time, no live data

**Diagnosis**:
```bash
# Check WebSocket bridge
docker ps | grep websocket-bridge

# Check HTTP health
curl -f http://localhost:3002/health

# Test WebSocket connection
wscat -c ws://localhost:3003

# Check logs
docker logs heretek-websocket-bridge --tail 100
```

**Solutions**:
```bash
# 1. Restart WebSocket bridge
docker restart heretek-websocket-bridge

# 2. Check Redis connectivity
docker exec heretek-websocket-bridge redis-cli -h redis ping

# 3. Check port binding
netstat -tlnp | grep 3003

# 4. Rebuild if needed
docker compose build websocket-bridge
docker compose up -d websocket-bridge
```

### Issue: Dashboard Not Loading

**Symptoms**: Port 3000/7000 not responding, blank page, connection error

**Diagnosis**:
```bash
# Check web container
docker ps | grep heretek-web

# Check health
curl -f http://localhost:3000/api/agents

# Check logs
docker logs heretek-web --tail 100

# Check port binding
netstat -tlnp | grep 3000
```

**Solutions**:
```bash
# 1. Restart web service
docker restart heretek-web

# 2. Check backend connectivity
docker exec heretek-web curl -f http://litellm:4000/health

# 3. Rebuild frontend
docker compose build web
docker compose up -d web

# 4. Clear browser cache (client-side)
```

### Issue: A2A Protocol Not Working

**Symptoms**: Agents not communicating, messages not delivered

**Diagnosis**:
```bash
# Check registered agents
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  http://localhost:4000/v1/agents | jq .

# Check agent health
for port in 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8011; do
    echo -n "Port $port: "
    curl -sf http://localhost:$port/health && echo "OK" || echo "FAILED"
done

# Check LiteLLM logs
docker logs heretek-litellm --tail 100 | grep -i "a2a\|agent"
```

**Solutions**:
```bash
# 1. Restart LiteLLM gateway
docker restart heretek-litellm

# 2. Re-register agents
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
    docker restart heretek-$agent
    sleep 2
done

# 3. Check Redis pub/sub
docker exec heretek-redis redis-cli PUBSUB CHANNELS "*"

# 4. Verify agent configuration
docker exec heretek-steward cat /app/agent/openclaw.json
```

### Issue: Vector Operations Failing

**Symptoms**: RAG not working, embedding errors, similarity search failing

**Diagnosis**:
```bash
# Check pgvector extension
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"

# Test vector operation
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector;"

# Check vector tables
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
```

**Solutions**:
```bash
# 1. Reinstall pgvector extension
docker exec heretek-postgres psql -U heretek -d heretek << 'EOF'
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION vector;
EOF

# 2. Restart PostgreSQL
docker restart heretek-postgres

# 3. Reindex vector columns
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "REINDEX DATABASE heretek;"
```

### Issue: Ollama/GPU Not Working

**Symptoms**: Local LLM failing, GPU not accessible, embedding generation errors

**Diagnosis**:
```bash
# Check Ollama status
curl -f http://localhost:11434/

# Check GPU access
docker exec heretek-ollama rocm-smi

# Check models
docker exec heretek-ollama ollama list

# Check logs
docker logs heretek-ollama --tail 100
```

**Solutions**:
```bash
# 1. Restart Ollama
docker restart heretek-ollama

# 2. Pull required models
docker exec heretek-ollama ollama pull nomic-embed-text-v2-moe

# 3. Check GPU device access
ls -la /dev/kfd /dev/dri

# 4. Verify ROCm configuration
docker exec heretek-ollama cat /etc/os-release
docker exec heretek-ollama rocminfo
```

## Log Analysis

### Common Error Patterns

```bash
# Search for errors across all containers
for container in $(docker ps --filter "name=heretek-" --format "{{.Names}}"); do
    echo "=== $container ==="
    docker logs "$container" --tail 50 | grep -i error | head -5
done

# Find stack traces
docker logs heretek-<service> | grep -A 10 "Traceback\|Exception\|Error:"

# Find connection issues
docker logs heretek-<service> | grep -i "connection\|timeout\|refused"

# Find memory issues
docker logs heretek-<service> | grep -i "memory\|oom\|heap"
```

### Real-time Log Monitoring

```bash
# Monitor all logs
docker compose logs -f

# Monitor specific service
docker logs -f heretek-<service-name>

# Monitor with grep
docker logs -f heretek-<service-name> 2>&1 | grep -i error
```

## Performance Tuning

### Database Optimization

```bash
# Analyze tables
docker exec heretek-postgres psql -U heretek -d heretek -c "ANALYZE;"

# Vacuum tables
docker exec heretek-postgres psql -U heretek -d heretek -c "VACUUM;"

# Check slow queries
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Redis Optimization

```bash
# Check memory policy
docker exec heretek-redis redis-cli CONFIG GET maxmemory-policy

# Set appropriate eviction policy
docker exec heretek-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Check slow log
docker exec heretek-redis redis-cli SLOWLOG GET 10
```

## Escalation

If issues persist after troubleshooting:

1. **Gather Information**
   - All relevant logs
   - System state (docker inspect, docker ps)
   - Resource usage (docker stats)
   - Timeline of events

2. **Document Attempts**
   - List all troubleshooting steps attempted
   - Note any changes observed
   - Record error messages

3. **Contact Engineering Team**
   - Provide gathered information
   - Include documentation of attempts
   - Note system impact
