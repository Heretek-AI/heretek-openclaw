# Full Stack Validation Plan

**Version:** 1.0.0
**Created:** 2026-03-29T19:10:00Z
**Status:** Ready for Execution
**Purpose:** Comprehensive validation of Heretek-OpenClaw agent deployment, LiteLLM integration, A2A communication, and skills execution

---

## Executive Summary

This plan outlines a comprehensive full stack validation test for the Heretek-OpenClaw autonomous agent system. The validation will:

1. Deploy all agents with LiteLLM gateway
2. Verify A2A communication between agents
3. Test skills execution across the collective
4. Collect extension logs and debugging information
5. Present a test task for The Collective to work on

---

## Prerequisites

### Environment Requirements

- Docker and Docker Compose installed
- `.env` file configured with valid API keys
- AMD GPU with ROCm support (for Ollama)
- Minimum 16GB RAM recommended
- Network ports available: 4000, 5432, 6379, 11434, 8001-8008

### Required API Keys

```bash
# Check .env file has these configured
LITELLM_MASTER_KEY=<generated-key>
LITELLM_SALT_KEY=<generated-key>
MINIMAX_API_KEY=<valid-key>
ZAI_API_KEY=<valid-key>
POSTGRES_PASSWORD=<secure-password>
```

---

## Phase 1: Infrastructure Validation

### Step 1.1: Environment Check

```bash
# Verify .env file exists and has required variables
cat .env | grep -E "(LITELLM_MASTER_KEY|MINIMAX_API_KEY|ZAI_API_KEY|POSTGRES_PASSWORD)"

# Verify Docker is running
docker info

# Check available resources
free -h
df -h
```

### Step 1.2: Start Core Services

```bash
# Start infrastructure services only (no agents yet)
docker compose up -d postgres redis ollama

# Wait for services to be healthy
sleep 10

# Verify PostgreSQL
docker compose exec postgres pg_isready -U heretek

# Verify Redis
docker compose exec redis redis-cli ping

# Verify Ollama (may take longer if pulling models)
docker compose exec ollama curl -s http://localhost:11434/api/tags
```

### Step 1.3: Start LiteLLM Gateway

```bash
# Start LiteLLM gateway
docker compose up -d litellm

# Wait for LiteLLM to be ready
sleep 15

# Check LiteLLM health
curl -s http://localhost:4000/health

# Verify model list
curl -s http://localhost:4000/v1/models \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" | jq .
```

**Expected Output:**
- Health check returns `{"status": "healthy"}`
- Model list includes: `minimax/M2.7`, `zai/glm-5`, `agent/steward`, `agent/alpha`, etc.

---

## Phase 2: Agent Deployment Validation

### Step 2.1: Build Agent Images

```bash
# Build all agent images
docker compose build steward alpha beta charlie examiner explorer sentinel coder
```

### Step 2.2: Deploy Agents Sequentially

```bash
# Start agents one at a time to verify each
for agent in steward alpha beta charlie examiner explorer sentinel coder; do
  echo "Starting $agent..."
  docker compose up -d $agent
  sleep 5
done
```

### Step 2.3: Verify Agent Registration

```bash
# Check all agents are running
docker compose ps

# Check agent logs for registration
for agent in steward alpha beta charlie examiner explorer sentinel coder; do
  echo "=== $agent logs ==="
  docker compose logs $agent 2>&1 | grep -E "(register|heartbeat|ready)" | tail -5
done
```

**Expected Output:**
- All 8 agents show status "running"
- Logs show "Agent registered successfully" or similar
- Heartbeat signals being sent

### Step 2.4: Verify Agent Health Endpoints

```bash
# Test each agent's health endpoint
for port in 8001 8002 8003 8004 8005 8006 8007 8008; do
  echo "Testing port $port..."
  curl -s http://localhost:$port/health || echo "Failed"
done
```

---

## Phase 3: A2A Communication Validation

### Step 3.1: Test Direct Agent Messaging

```bash
# Test A2A message send from steward to alpha
curl -X POST http://localhost:4000/v1/agents/alpha/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "steward",
    "type": "test",
    "content": "Ping from steward - validation test",
    "timestamp": "'$(date -Iseconds)'"
  }'
```

### Step 3.2: Test Broadcast Message

```bash
# Test broadcast to all agents
curl -X POST http://localhost:4000/v1/agents/broadcast/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "validation-test",
    "type": "broadcast",
    "content": "Full stack validation test broadcast",
    "timestamp": "'$(date -Iseconds)'"
  }'
```

### Step 3.3: Verify Message Receipt

```bash
# Check alpha's messages
curl -s http://localhost:4000/v1/agents/alpha/messages \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" | jq .

# Check steward's messages
curl -s http://localhost:4000/v1/agents/steward/messages \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" | jq .
```

### Step 3.4: Test Triad Deliberation

```bash
# Trigger a triad deliberation via skill
curl -X POST http://localhost:4000/v1/agents/steward/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "validation-test",
    "type": "skill_request",
    "skill": "triad-deliberation-protocol",
    "content": {
      "topic": "Validation Test",
      "question": "Should we proceed with the full stack validation?",
      "context": "Testing A2A communication between triad members"
    },
    "timestamp": "'$(date -Iseconds)'"
  }'
```

---

## Phase 4: Skills Execution Validation

### Step 4.1: Test Core Skills

```bash
# Test triad-heartbeat skill
curl -X POST http://localhost:4000/v1/agents/steward/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "validation-test",
    "type": "skill_request",
    "skill": "triad-heartbeat",
    "content": {"action": "status"},
    "timestamp": "'$(date -Iseconds)'"
  }'

# Test curiosity-engine skill
curl -X POST http://localhost:4000/v1/agents/explorer/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "validation-test",
    "type": "skill_request",
    "skill": "curiosity-engine",
    "content": {"action": "scan"},
    "timestamp": "'$(date -Iseconds)'"
  }'
```

### Step 4.2: Test Memory Skills

```bash
# Test knowledge-ingest skill
curl -X POST http://localhost:4000/v1/agents/historian/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "validation-test",
    "type": "skill_request",
    "skill": "knowledge-ingest",
    "content": {
      "source": "validation-test",
      "data": "This is a test knowledge entry for validation"
    },
    "timestamp": "'$(date -Iseconds)'"
  }'
```

### Step 4.3: List Available Skills

```bash
# List all skills in the skills directory
ls -la skills/

# Verify skill structure
for skill in skills/*/; do
  if [ -f "${skill}SKILL.md" ]; then
    echo "✓ $(basename $skill) - has SKILL.md"
  else
    echo "✗ $(basename $skill) - missing SKILL.md"
  fi
done
```

---

## Phase 5: LiteLLM Chat Completion Validation

### Step 5.1: Test Primary Model (MiniMax)

```bash
# Test chat completion with MiniMax
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "minimax/M2.7",
    "messages": [
      {"role": "system", "content": "You are a validation test assistant."},
      {"role": "user", "content": "Respond with VALIDATION_SUCCESS if you receive this message."}
    ]
  }' | jq .
```

### Step 5.2: Test Agent Passthrough Endpoints

```bash
# Test agent/steward endpoint
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/steward",
    "messages": [
      {"role": "user", "content": "Identify yourself and confirm you are operational."}
    ]
  }' | jq .

# Test agent/alpha endpoint
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent/alpha",
    "messages": [
      {"role": "user", "content": "Identify yourself and confirm you are operational."}
    ]
  }' | jq .
```

### Step 5.3: Test Failover Model (z.ai GLM-5)

```bash
# Test z.ai GLM-5 failover
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai/glm-5",
    "messages": [
      {"role": "user", "content": "Confirm GLM-5 failover is operational."}
    ]
  }' | jq .
```

---

## Phase 6: Extension Logs and Debugging

### Step 6.1: Collect Container Logs

```bash
# Create logs directory
mkdir -p validation-logs

# Collect all container logs
for service in litellm postgres redis ollama steward alpha beta charlie examiner explorer sentinel coder; do
  echo "Collecting $service logs..."
  docker compose logs $service > validation-logs/${service}.log 2>&1
done
```

### Step 6.2: Collect Agent State Files

```bash
# Copy agent state files from containers
for agent in steward alpha beta charlie examiner explorer sentinel coder; do
  echo "Collecting $agent state..."
  docker compose exec $agent cat /app/state/agent.log > validation-logs/${agent}-state.log 2>/dev/null || echo "No state file for $agent"
done
```

### Step 6.3: Collect LiteLLM Metrics

```bash
# Get LiteLLM usage stats
curl -s http://localhost:4000/v1/usage \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" > validation-logs/litellm-usage.json

# Get LiteLLM model stats
curl -s http://localhost:4000/v1/model/info \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" > validation-logs/litellm-models.json
```

### Step 6.4: Database State Check

```bash
# Check PostgreSQL pgvector extension
docker compose exec postgres psql -U heretek -d heretek -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Check memory tiers table (if exists)
docker compose exec postgres psql -U heretek -d heretek -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### Step 6.5: Redis State Check

```bash
# Check Redis keys
docker compose exec redis redis-cli KEYS "*"

# Check Redis memory usage
docker compose exec redis redis-cli INFO memory
```

---

## Phase 7: Test Task for The Collective

### Task: Code Review and Optimization Challenge

**Objective:** Have The Collective analyze and propose optimizations for a specific component of the system.

**Task Description:**
```
The Collective is tasked with reviewing the agent-client.js library and proposing 
optimizations for A2A communication efficiency. The review should:

1. Analyze current message throughput
2. Identify potential bottlenecks
3. Propose caching strategies
4. Suggest error handling improvements
5. Recommend retry logic enhancements

Deliverable: A markdown document with specific code recommendations
```

**Execution Command:**

```bash
# Send the task to The Collective via Steward
curl -X POST http://localhost:4000/v1/agents/steward/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "validation-orchestrator",
    "type": "task",
    "content": {
      "task_id": "VAL-2026-001",
      "title": "Code Review and Optimization Challenge",
      "description": "Review the agent-client.js library and propose optimizations for A2A communication efficiency.",
      "requirements": [
        "Analyze current message throughput",
        "Identify potential bottlenecks",
        "Propose caching strategies",
        "Suggest error handling improvements",
        "Recommend retry logic enhancements"
      ],
      "deliverable": "Markdown document with specific code recommendations",
      "target_file": "agents/lib/agent-client.js",
      "priority": "medium"
    },
    "timestamp": "'$(date -Iseconds)'"
  }'
```

---

## Validation Checklist

### Infrastructure
- [ ] PostgreSQL running and healthy
- [ ] Redis running and healthy
- [ ] Ollama running with embedding model
- [ ] LiteLLM gateway running and healthy

### Agents
- [ ] Steward (port 8001) - running and registered
- [ ] Alpha (port 8002) - running and registered
- [ ] Beta (port 8003) - running and registered
- [ ] Charlie (port 8004) - running and registered
- [ ] Examiner (port 8005) - running and registered
- [ ] Explorer (port 8006) - running and registered
- [ ] Sentinel (port 8007) - running and registered
- [ ] Coder (port 8008) - running and registered

### Communication
- [ ] Direct A2A messaging works
- [ ] Broadcast messaging works
- [ ] Message polling works
- [ ] Triad deliberation triggers

### Skills
- [ ] triad-heartbeat executes
- [ ] curiosity-engine executes
- [ ] knowledge-ingest executes
- [ ] Skill directory structure valid

### LiteLLM
- [ ] MiniMax M2.7 responds
- [ ] Agent passthrough endpoints work
- [ ] z.ai GLM-5 failover works

### Logging
- [ ] Container logs collected
- [ ] Agent state files collected
- [ ] LiteLLM metrics collected
- [ ] Database state verified

---

## Troubleshooting Guide

### Common Issues

#### LiteLLM Not Starting
```bash
# Check for config errors
docker compose logs litellm 2>&1 | grep -i error

# Verify config file syntax
cat litellm_config.yaml | head -50
```

#### Agents Not Registering
```bash
# Check network connectivity
docker compose exec steward ping -c 3 litellm

# Check API key
docker compose exec steward env | grep LITELLM
```

#### A2A Messages Not Delivering
```bash
# Check LiteLLM A2A settings
docker compose exec litellm env | grep AGENT

# Verify endpoint exists
curl -s http://localhost:4000/v1/agents | jq .
```

#### Skills Not Executing
```bash
# Check skill permissions
docker compose exec steward ls -la /app/skills/

# Check skill script permissions
docker compose exec steward ls -la /app/skills/triad-heartbeat/
```

---

## Success Criteria

The validation is considered successful when:

1. **All infrastructure services are healthy** (PostgreSQL, Redis, Ollama, LiteLLM)
2. **All 8 agents are running and registered** with LiteLLM
3. **A2A messaging works** between any two agents
4. **Broadcast messaging works** to all agents
5. **At least 3 skills execute successfully**
6. **Chat completions work** with MiniMax and agent passthrough endpoints
7. **Logs are collected** for all services
8. **The Collective accepts and begins processing the test task**

---

## Next Steps After Validation

1. **Archive validation logs** to `validation-logs/` directory
2. **Update PRIME_DIRECTIVE** with validation results
3. **Create GitHub issue** for any discovered bugs
4. **Document any configuration changes** needed
5. **Schedule regular validation** as part of CI/CD

---

*This plan should be executed in order, with each phase completed before moving to the next.*
