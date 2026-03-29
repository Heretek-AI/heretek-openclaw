# Next Steps Plan for The Collective

**Version:** 1.0.0
**Created:** 2026-03-29T21:14:00Z
**Status:** Ready for Implementation
**Priority:** High

---

## Executive Summary

Based on the validation results from the comprehensive implementation, this plan outlines the critical next steps needed to achieve full operational status for The Collective.

---

## Current State Assessment

### Validation Results Analysis

| Component | Status | Issue | Priority |
|-----------|--------|-------|----------|
| PostgreSQL | ✅ Healthy | None | - |
| Redis | ✅ Healthy | None | - |
| steward | ✅ Running | None | - |
| alpha | ✅ Running | None | - |
| beta | ✅ Running | None | - |
| charlie | ✅ Running | None | - |
| coder | ✅ Running | None | - |
| dreamer | ✅ Running | None | - |
| empath | ✅ Running | None | - |
| examiner | ✅ Running | None | - |
| explorer | ❌ Not Running | Container not started | High |
| historian | ❌ Not Running | Container not started | High |
| sentinel | ❌ Not Running | Container not started | High |
| LiteLLM | ⚠️ HTTP 401 | API key required | Critical |
| Ollama | ❌ Not Running | Service not started | Medium |
| A2A Messaging | ⏭️ Skipped | Dependency not met | High |
| Triad Deliberation | ⏭️ Skipped | Dependency not met | High |

### Root Cause Analysis

1. **Missing Agents (explorer, historian, sentinel)**
   - Containers may not have been started during deployment
   - Need to verify container status and start if stopped

2. **LiteLLM Authentication (401)**
   - LITELLM_MASTER_KEY not being passed correctly
   - Health check endpoint requires authentication

3. **Ollama Not Running**
   - AMD GPU service may need manual start
   - Model pulling may be required

4. **A2A/Triad Tests Skipped**
   - Depend on all agents being healthy
   - Depend on LiteLLM authentication

---

## Phase 9: Full Operational Status

### Step 9.1: Start Missing Agents

```bash
# Check current container status
docker compose ps

# Start missing agents
docker compose up -d explorer historian sentinel

# Verify all 11 agents are running
docker compose ps | grep -E "steward|alpha|beta|charlie|examiner|explorer|sentinel|coder|dreamer|empath|historian"
```

**Expected Result:** All 11 agents show status "running"

### Step 9.2: Configure LiteLLM Authentication

```bash
# Verify LITELLM_MASTER_KEY is set
cat .env | grep LITELLM_MASTER_KEY

# If not set, generate and add
echo "LITELLM_MASTER_KEY=$(openssl rand -hex 32)" >> .env

# Restart LiteLLM to pick up new key
docker compose restart litellm

# Test authenticated health check
curl -s http://localhost:4000/health \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}"
```

**Expected Result:** Health check returns `{"status": "healthy"}`

### Step 9.3: Start Ollama (Optional - Local LLM)

```bash
# Start Ollama container
docker compose up -d ollama

# Wait for Ollama to initialize
sleep 10

# Pull required models
docker compose exec ollama ollama pull nomic-embed-text-v2-moe
docker compose exec ollama ollama pull qwen3.5:cloud

# Verify Ollama is responding
curl -s http://localhost:11434/api/tags
```

**Expected Result:** Ollama returns list of available models

### Step 9.4: Re-run Validation

```bash
# Run full health check
node skills/deployment-health-check/check.js

# Run smoke tests
node skills/deployment-smoke-test/test.js

# Run config validator
node skills/config-validator/validate.js
```

**Expected Result:** All tests pass

### Step 9.5: Test A2A Communication

```bash
# Test A2A message send
curl -X POST http://localhost:4000/a2a/alpha \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-001",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello from validation test"}],
        "messageId": "msg-001"
      }
    }
  }'
```

**Expected Result:** A2A message accepted and processed

### Step 9.6: Push to GitHub

```bash
# Configure git credentials if needed
git config user.name "Heretek AI"
git config user.email "ai@heretek.ai"

# Push to GitHub
git push origin main

# If authentication required, use personal access token
# git push https://<TOKEN>@github.com/heretek/heretek-openclaw.git main
```

---

## Phase 10: Web Interface Deployment

### Step 10.1: Install Dependencies

```bash
cd web-interface
npm install
```

### Step 10.2: Configure Environment

Create `web-interface/.env`:
```env
LITELLM_URL=http://localhost:4000
LITELLM_API_KEY=${LITELLM_MASTER_KEY}
REDIS_URL=redis://localhost:6379
```

### Step 10.3: Start Development Server

```bash
npm run dev
```

**Access at:** http://localhost:3000

### Step 10.4: Verify Features

- [ ] Chat interface loads
- [ ] Agent selector shows all 11 agents
- [ ] Agent status dashboard shows online agents
- [ ] Can send message to an agent
- [ ] Message flow visualization works

---

## Phase 11: Production Readiness

### Step 11.1: Security Hardening

```bash
# Generate secure keys
openssl rand -hex 32 > /tmp/litellm_master_key.txt
openssl rand -hex 32 > /tmp/litellm_salt_key.txt

# Update .env
sed -i "s/LITELLM_MASTER_KEY=.*/LITELLM_MASTER_KEY=$(cat /tmp/litellm_master_key.txt)/" .env
sed -i "s/LITELLM_SALT_KEY=.*/LITELLM_SALT_KEY=$(cat /tmp/litellm_salt_key.txt)/" .env

# Secure the key files
shred -u /tmp/litellm_master_key.txt /tmp/litellm_salt_key.txt
```

### Step 11.2: Enable HTTPS

Add to docker-compose.yml:
```yaml
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - litellm
      - web-interface
```

### Step 11.3: Configure Backups

```bash
# Create backup script
cat > scripts/backup-collective.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/collective_$DATE"

# Backup PostgreSQL
docker compose exec postgres pg_dump -U heretek heretek > $BACKUP_DIR/database.sql

# Backup Redis
docker compose exec redis redis-cli BGSAVE
docker cp heretek-redis:/data/dump.rdb $BACKUP_DIR/redis.rdb

# Backup user data
tar -czf $BACKUP_DIR/users.tar.gz users/

# Backup configuration
tar -czf $BACKUP_DIR/config.tar.gz docker-compose.yml litellm_config.yaml .env

echo "Backup complete: $BACKUP_DIR"
EOF

chmod +x scripts/backup-collective.sh
```

### Step 11.4: Set Up Monitoring

```bash
# Add Prometheus/Grafana stack
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

---

## Phase 12: Collective Test Task

Run the test task from [`docs/plans/COLLECTIVE_TEST_TASK.md`](docs/plans/COLLECTIVE_TEST_TASK.md):

```bash
# Send test task to Steward
curl -X POST http://localhost:4000/a2a/steward \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "task-validate-001",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "[TASK VALIDATE-001] Initiate knowledge graph validation. Coordinate with all agents to validate the cognitive architecture."}],
        "messageId": "task-001"
      }
    }
  }'
```

**Success Criteria:**
- All 11 agents participate
- A2A messaging occurs between agents
- Triad deliberation occurs with documented vote
- Final synthesis is stored in collective memory

---

## Priority Order

1. **Critical:** Start missing agents (explorer, historian, sentinel)
2. **Critical:** Configure LiteLLM authentication
3. **High:** Re-run validation tests
4. **High:** Test A2A communication
5. **Medium:** Start Ollama for local LLM
6. **Medium:** Deploy web interface
7. **Low:** Production hardening
8. **Low:** Set up monitoring

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 9 | 30 minutes | None |
| Phase 10 | 15 minutes | Phase 9 |
| Phase 11 | 1 hour | Phase 10 |
| Phase 12 | 30 minutes | Phase 9, 10 |

---

## Success Metrics

- [ ] All 11 agents healthy and responding
- [ ] LiteLLM gateway authenticated and working
- [ ] A2A messaging functional between all agents
- [ ] Web interface accessible and functional
- [ ] User identification working across platforms
- [ ] Collective test task completed successfully
- [ ] All changes pushed to GitHub

---

*Document Version: 1.0.0*
*Last Updated: 2026-03-29*
