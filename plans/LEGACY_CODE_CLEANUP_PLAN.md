# Legacy Code Cleanup Plan

## Overview

This document outlines the legacy code cleanup strategy for migrating from the pre-Gateway architecture (Redis Pub/Sub + Docker agent containers) to the OpenClaw Gateway architecture (Gateway WebSocket RPC + agent workspaces).

**Current State:** OpenClaw Gateway v2026.3.28 running on port 18789 with all 12 agents as workspaces in `~/.openclaw/agents/`

**Legacy Infrastructure Stopped:** 11 Docker containers (ports 8001-8011)

---

## Legacy Code Categories

### Category 1: Docker Agent Container Configuration (HIGH PRIORITY)

**Files to Remove/Deprecate:**

| File | Action | Reason |
|------|--------|--------|
| [`docker-compose.yml`](../docker-compose.yml:231-813) | Comment out agent services | Lines 231-813 define 11 agent containers that are no longer needed |
| [`docker-compose.agent.yml`](../docker-compose.agent.yml) | Deprecate/Remove | Agent-specific compose file for legacy containers |
| [`Dockerfile.agent`](../Dockerfile.agent) | Deprecate/Remove | Dockerfile for building agent containers |
| [`agents/deploy-agent.sh`](../agents/deploy-agent.sh) | Update | Script should create workspaces, not containers |
| [`agents/entrypoint.sh`](../agents/entrypoint.sh) | Deprecate | Container entrypoint, not needed for workspaces |
| `agents/*/` directories | Archive | Legacy agent container configs (steward, alpha, beta, charlie, examiner, explorer, sentinel, coder, dreamer, empath, historian) |

**Changes Required:**

1. Comment out agent services in `docker-compose.yml` with clear deprecation notice
2. Update `deploy-agent.sh` to only create workspaces via `openclaw agent create`
3. Move legacy agent directories to `agents/legacy/` for reference

---

### Category 2: Redis Pub/Sub A2A Communication (HIGH PRIORITY)

**Files with Legacy Redis Pub/Sub Code:**

| File | Lines | Action |
|------|-------|--------|
| [`modules/communication/redis-websocket-bridge.js`](../modules/communication/redis-websocket-bridge.js) | All | Deprecate - bridges Redis to WebSocket (Gateway uses direct WebSocket RPC) |
| [`modules/communication/channel-manager.js`](../modules/communication/channel-manager.js) | All | Deprecate - manages Redis channel subscriptions |
| [`modules/communication/channel-ws-adapter.js`](../modules/communication/channel-ws-adapter.js) | All | Deprecate - adapts Redis channels to WebSocket |
| [`agents/lib/redis-subscriber.js`](../agents/lib/redis-subscriber.js) | All | Deprecate - Redis A2A subscriber |
| [`agents/lib/agent-client.js`](../agents/lib/agent-client.js) | 40-780 | Remove Redis fallback code (lines 32-38, 83-350) |
| [`modules/consciousness/global-workspace.js`](../modules/consciousness/global-workspace.js) | 17-450 | Remove Redis broadcast integration |
| [`modules/consciousness/integration-layer.js`](../modules/consciousness/integration-layer.js) | 32-330 | Remove Redis event bus |
| [`modules/collective/registry.js`](../modules/collective/registry.js) | 58-184 | Remove cross-collective Redis |
| [`modules/collective/hiclaw.js`](../modules/collective/hiclaw.js) | 43-615 | Remove HiClaw Redis tasks |
| [`modules/collective/semantic-router.js`](../modules/collective/semantic-router.js) | 65-658 | Remove Redis agent profiles |
| [`modules/memory/powermem.js`](../modules/memory/powermem.js) | 29-580 | Remove Redis memory storage |

**Changes Required:**

1. Move Redis-based communication modules to `modules/communication/legacy/`
2. Update `agent-client.js` to use only Gateway WebSocket RPC
3. Remove Redis initialization from consciousness modules
4. Update session storage references (Redis hashes → JSONL files)

---

### Category 3: Health Check and Monitoring (MEDIUM PRIORITY)

**Files to Update:**

| File | Issue | Action |
|------|-------|--------|
| [`skills/deployment-health-check/check.js`](../skills/deployment-health-check/check.js) | Lines 37-50 reference ports 8001-8011 | Update to check Gateway workspace health |
| [`docs/api/WEBSOCKET_API.md`](../docs/api/WEBSOCKET_API.md) | May reference Redis channels | Update to Gateway WebSocket RPC |
| [`docs/api/LITELLM_API.md`](../docs/api/LITELLM_API.md) | May reference old endpoints | Update to current passthrough endpoints |

**Changes Required:**

1. Update health check to use Gateway status endpoint (`openclaw gateway status`)
2. Replace port-based agent checks with workspace health checks
3. Update API documentation for Gateway endpoints

---

### Category 4: WebSocket Bridge Infrastructure (MEDIUM PRIORITY)

**Files to Review:**

| File | Issue | Action |
|------|-------|--------|
| [`docker-compose.yml`](../docker-compose.yml:821-839) | Redis WebSocket bridge service | May be deprecated with Gateway |
| `modules/communication/channel-ws-adapter.js` | Redis channel adapter | Deprecate if Gateway handles WebSocket directly |

**Changes Required:**

1. Verify if Gateway provides native WebSocket streaming
2. If yes, deprecate websocket-bridge container
3. Update dashboard to connect to Gateway WebSocket directly

---

### Category 5: Session Storage Migration (LOW PRIORITY)

**Current State:**
- Legacy: Redis hashes for session storage
- Current: JSONL files in workspace (`~/.openclaw/agents/{agent}/sessions/`)

**Files to Check:**

| File | Check For |
|------|-----------|
| `agents/lib/agent-client.js` | Redis session operations |
| `modules/memory/*.js` | Redis-based session storage |
| `skills/*/` | Any skill using Redis for sessions |

---

### Category 6: Documentation References (LOW PRIORITY)

**Files to Review:**

| File | Check For |
|------|-----------|
| [`docs/architecture/REDIS_A2A_ARCHITECTURE.md`](../docs/architecture/REDIS_A2A_ARCHITECTURE.md) | Legacy architecture reference |
| `docs/operations/*.md` | Container management procedures |
| `docs/api/*.md` | API endpoint references |
| `docs/deployment/*.md` | Deployment procedures |

---

## Cleanup Phases

### Phase 1: Docker Container Cleanup (Immediate)

**Goal:** Remove all references to legacy agent containers

**Tasks:**
1. [ ] Comment out agent services in `docker-compose.yml` (lines 231-813)
2. [ ] Add deprecation notice at top of commented section
3. [ ] Update `docker-compose.yml` architecture diagram to show Gateway-only
4. [ ] Move `docker-compose.agent.yml` to `docs/archive/docker-compose.agent.yml`
5. [ ] Move `Dockerfile.agent` to `docs/archive/Dockerfile.agent`
6. [ ] Update `agents/deploy-agent.sh` for workspace-only deployment
7. [ ] Move legacy agent directories to `agents/legacy/`

**Risk:** Low - containers already stopped, no active dependencies

---

### Phase 2: Redis Pub/Sub Removal (High Effort)

**Goal:** Remove Redis Pub/Sub A2A communication code

**Tasks:**
1. [ ] Create `modules/communication/legacy/` directory
2. [ ] Move `redis-websocket-bridge.js` to legacy
3. [ ] Move `channel-manager.js` to legacy
4. [ ] Move `channel-ws-adapter.js` to legacy
5. [ ] Move `agents/lib/redis-subscriber.js` to legacy
6. [ ] Update `agents/lib/agent-client.js` to remove Redis fallback
7. [ ] Update consciousness modules to remove Redis event bus
8. [ ] Update tests to use Gateway WebSocket RPC

**Risk:** Medium - requires careful code review to ensure Gateway RPC works

**Testing Required:**
- A2A message sending between agents
- Triad deliberation flow
- User chat flow
- Skill execution

---

### Phase 3: Health Check Updates (Low Effort)

**Goal:** Update health checks for Gateway architecture

**Tasks:**
1. [ ] Update `skills/deployment-health-check/check.js`
2. [ ] Replace port checks with Gateway workspace status
3. [ ] Update health check SKILL.md documentation
4. [ ] Test health check against Gateway deployment

**Risk:** Low - isolated change, easy to test

---

### Phase 4: Session Storage Migration (Medium Effort)

**Goal:** Ensure all session storage uses JSONL files

**Tasks:**
1. [ ] Audit all session storage code
2. [ ] Remove Redis hash operations
3. [ ] Verify JSONL session storage in workspaces
4. [ ] Update session schema documentation

**Risk:** Medium - session data integrity critical

---

### Phase 5: Documentation Cleanup (Low Effort)

**Goal:** Remove or mark all legacy documentation

**Tasks:**
1. [ ] Review `docs/architecture/REDIS_A2A_ARCHITECTURE.md` - mark as legacy
2. [ ] Update all operation runbooks
3. [ ] Update API documentation
4. [ ] Create `docs/archive/` for deprecated docs
5. [ ] Update PRIME_DIRECTIVE.md if needed

**Risk:** Low - documentation only

---

## Files Already Updated

The following files have been updated in previous commits:

- ✅ [`README.md`](../README.md) - Gateway architecture diagram
- ✅ [`docs/README.md`](../docs/README.md) - Service architecture
- ✅ [`docs/architecture/A2A_ARCHITECTURE.md`](../docs/architecture/A2A_ARCHITECTURE.md) - Gateway WebSocket RPC
- ✅ [`docs/architecture/GATEWAY_ARCHITECTURE.md`](../docs/architecture/GATEWAY_ARCHITECTURE.md) - New Gateway reference
- ✅ [`docs/deployment/LOCAL_DEPLOYMENT.md`](../docs/deployment/LOCAL_DEPLOYMENT.md) - Local deployment guide
- ✅ [`docs/operations/LEGACY_CLEANUP.md`](../docs/operations/LEGACY_CLEANUP.md) - Container cleanup procedure
- ✅ [`CHANGELOG.md`](../CHANGELOG.md) - v2.0.1 entry

---

## Git Strategy

**Branch:** `cleanup/legacy-code-removal`

**Commit Strategy:**
1. Commit 1: Docker container cleanup (Phase 1)
2. Commit 2: Redis Pub/Sub removal (Phase 2)
3. Commit 3: Health check updates (Phase 3)
4. Commit 4: Session storage migration (Phase 4)
5. Commit 5: Documentation cleanup (Phase 5)

**PR Description:**
```
## Legacy Code Cleanup - OpenClaw Gateway Migration

### Summary
Removes legacy Docker agent container configuration and Redis Pub/Sub A2A communication code following migration to OpenClaw Gateway v2026.3.28.

### Changes
- Commented out 11 agent services in docker-compose.yml (ports 8001-8011)
- Moved legacy communication modules to modules/communication/legacy/
- Updated agent-client.js to use Gateway WebSocket RPC only
- Updated health checks for Gateway workspace status
- Updated documentation to reflect Gateway architecture

### Resource Savings
- 65% reduction in containers (17 → 6)
- 91% reduction in Node.js runtimes (11 → 1)
- Simplified A2A communication (Gateway WebSocket RPC)
```

---

## Testing Checklist

Before merging, verify:

- [ ] Gateway status shows all 12 agents healthy
- [ ] A2A messages send between agents via Gateway
- [ ] Triad deliberation works with Gateway RPC
- [ ] User chat flow completes successfully
- [ ] Skills execute correctly
- [ ] Health check passes for all workspaces
- [ ] Dashboard connects to Gateway WebSocket
- [ ] No Redis connection errors in logs
- [ ] Session storage writes to JSONL files
- [ ] LiteLLM passthrough endpoints work

---

## Rollback Procedure

If issues occur:

1. **Revert Git commit:**
   ```bash
   git revert HEAD~5..HEAD
   ```

2. **Restart legacy containers:**
   ```bash
   cd /root/heretek/heretek-openclaw
   docker compose up -d steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian
   ```

3. **Restore Redis configuration:**
   ```bash
   git checkout <previous-commit> -- modules/communication/ agents/lib/
   ```

---

## Post-Cleanup Verification

After cleanup, verify:

1. **Gateway Health:**
   ```bash
   openclaw gateway status
   openclaw agent list
   ```

2. **A2A Communication:**
   ```bash
   # Send test message via Gateway
   openclaw agent message steward "Test message"
   ```

3. **No Legacy Dependencies:**
   ```bash
   grep -r "redis.*pub\|800[1-9]\|801[0-1]" --include="*.js" .
   # Should return no results in active code
   ```

---

## Next Steps

1. Review this plan with the team
2. Create cleanup branch
3. Execute Phase 1 (Docker cleanup)
4. Test Phase 1 changes
5. Continue through remaining phases
6. Create PR and request review
7. Merge after validation
