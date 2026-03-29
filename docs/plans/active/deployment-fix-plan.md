# Deployment Fix Plan v2.0
## Heretek OpenClaw - Automated Deployment Recovery

**Status**: ACTIVE - Ready for Orchestrator Execution
**Created**: 2026-03-29T19:26:00Z
**END GOAL**: ALL AGENTS TO RUN IN OPENCLAW AND UTILIZE LITELLM ENDPOINTS PER AGENT

---

## Executive Summary

Validation testing revealed critical issues preventing agent deployment. This plan documents the fixes required and provides a step-by-step execution path for automated deployment.

### Issues Identified

| Issue | Severity | Root Cause | Fix |
|-------|----------|------------|-----|
| MiniMax Model Names | CRITICAL | Incorrect model naming `minimax/M2.7` | Change to `minimax/MiniMax-M2.1` |
| A2A Protocol 404 | HIGH | Endpoints not implemented | Implement or configure A2A routes |
| Agent Passthrough Fails | HIGH | Depends on broken MiniMax | Fixed by MiniMax correction |

---

## Phase 1: Fix MiniMax Model Names

### Problem
LiteLLM config uses incorrect MiniMax model names:
- Current: `minimax/M2.7` and `minimax/M2.5`
- Correct: `minimax/MiniMax-M2.1` and `minimax/MiniMax-M2.5`

### Solution
Update `litellm_config.yaml` with correct model names per LiteLLM documentation.

### Changes Required

```yaml
# BEFORE (BROKEN)
- model_name: minimax/M2.7
  litellm_params:
    model: minimax/M2.7

# AFTER (CORRECT)
- model_name: minimax/MiniMax-M2.1
  litellm_params:
    model: minimax/MiniMax-M2.1
```

### Files to Modify
1. `litellm_config.yaml` - Lines 22-31, 33-40, 71-156, 173-189

### Validation Command
```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-openclaw-local" \
  -d '{"model": "minimax/MiniMax-M2.1", "messages": [{"role": "user", "content": "VALIDATION_TEST"}]}'
```

---

## Phase 2: Restart LiteLLM Service

### Steps
1. Stop current LiteLLM container
2. Rebuild with updated config
3. Start LiteLLM service
4. Verify health endpoint

### Commands
```bash
docker-compose down litellm
docker-compose up -d litellm
sleep 10
curl http://localhost:4000/health
```

---

## Phase 3: Validate Model Endpoints

### Test Sequence
1. Test MiniMax M2.1 primary
2. Test MiniMax M2.5 fallback
3. Test z.ai GLM-5 failover
4. Test agent passthrough endpoints

### Expected Results
- All models return valid responses
- Agent endpoints route correctly
- No 500 errors

---

## Phase 4: Deploy Agent Containers

### Agent Deployment Order
1. **steward** (port 8001) - Orchestrator
2. **alpha** (port 8002) - Triad member
3. **beta** (port 8003) - Triad member
4. **charlie** (port 8004) - Triad member
5. **examiner** (port 8005) - Interrogator
6. **explorer** (port 8006) - Scout
7. **sentinel** (port 8007) - Guardian
8. **coder** (port 8008) - Artisan

### Commands
```bash
# Deploy all agents
docker-compose --profile agents up -d

# Verify each agent
for port in 8001 8002 8003 8004 8005 8006 8007 8008; do
  curl -s http://localhost:$port/health || echo "Agent on port $port not responding"
done
```

---

## Phase 5: Test A2A Communication

### A2A Protocol Test
```bash
# Test agent-to-agent messaging
curl -X POST http://localhost:4000/v1/agents/alpha/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-openclaw-local" \
  -d '{"from": "steward", "content": "TEST_MESSAGE", "type": "task"}'
```

### Fallback: Direct Agent Communication
If LiteLLM A2A endpoints are not available, agents can communicate directly:
```bash
curl -X POST http://localhost:8002/message \
  -H "Content-Type: application/json" \
  -d '{"from": "steward", "content": "TEST_MESSAGE"}'
```

---

## Phase 6: Full Collective Test

### Test Task
Present the test task from `docs/plans/COLLECTIVE_TEST_TASK.md` to The Collective.

### Success Criteria
- [ ] All 8 agents respond to health checks
- [ ] LiteLLM routes requests correctly
- [ ] A2A communication works (or fallback)
- [ ] Skills execute successfully
- [ ] Collective can process test task

---

## Continuous Operation

### Run Until
- All validation passes
- OR manual STOP command

### Monitoring
```bash
# Continuous health check
watch -n 30 'docker-compose ps && curl -s http://localhost:4000/health'
```

---

## Rollback Plan

If deployment fails:
```bash
# Revert to known working config
git checkout litellm_config.yaml
docker-compose down
docker-compose up -d
```

---

## Change Log

| Time | Action | Status |
|------|--------|--------|
| 19:26 | Plan created | COMPLETE |
| | Fix MiniMax model names | PENDING |
| | Restart LiteLLM | PENDING |
| | Validate endpoints | PENDING |
| | Deploy agents | PENDING |
| | Test A2A | PENDING |
| | Full Collective test | PENDING |

---

**NEXT ACTION**: Switch to Orchestrator mode and execute Phase 1
