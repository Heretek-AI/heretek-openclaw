# Heretek-OpenClaw Implementation Roadmap

**Created:** 2026-03-30  
**Status:** Active Planning  
**Mode:** Architect  
**Purpose:** 24-hour autonomous loop implementation with atomic operations

---

## Executive Summary

This roadmap provides a detailed implementation plan for the Heretek-OpenClaw multi-agent system, focusing on fixing critical communication issues and enabling full autonomous operation. The plan prioritizes fixes based on impact and dependencies, with clear atomic operations, commit taxonomy, and validation criteria.

### Current System State Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| LiteLLM A2A Config | ✅ DONE | Endpoint format already corrected to `/v1/agents/{name}` |
| Agent Client | ✅ DONE | Already uses correct endpoint format |
| Agent Registry | ❌ BUG | Line 112 uses hardcoded `8000` instead of `agent.port` |
| WebSocket Integration | ❌ PENDING | No client connected to MessageFlow |
| Agent Health Status | ❌ PENDING | All agents show offline - needs health check service |
| Session Management | 🔲 PENDING | PostgreSQL persistence needed |
| Testing Framework | 🔲 PENDING | Unit/integration/E2E tests needed |

---

## Prioritized Task List

### P0 - Critical (Must Fix First)

| # | Task | Root Cause | Files to Modify | Status |
|---|------|-----------|-----------------|--------|
| P0.1 | Fix agent-registry.ts line 112 | Uses `8000` instead of `agent.port` | `web-interface/src/lib/server/agent-registry.ts` | 🔲 TODO |
| P0.2 | Create Health Check Service | No real-time agent status | New: `web-interface/src/lib/server/health-check-service.ts` | 🔲 TODO |
| P0.3 | Connect MessageFlow to WebSocket | No real-time data source | `web-interface/src/lib/components/MessageFlow.svelte` | 🔲 TODO |
| P0.4 | Create Redis-to-WebSocket Bridge | No bridge for real-time updates | New: `modules/communication/redis-websocket-bridge.js` | 🔲 TODO |

### P1 - High Priority

| # | Task | Files to Modify | Status |
|---|------|-----------------|--------|
| P1.1 | Update AgentStatus with live polling | `web-interface/src/lib/components/AgentStatus.svelte` | 🔲 TODO |
| P1.2 | Implement session persistence | New: `init/session-schema.sql`, `modules/session/` | 🔲 TODO |
| P1.3 | Add error handling and toast notifications | WebUI components | 🔲 TODO |
| P1.4 | Configure LiteLLM per-agent models | `litellm_config.yaml` (verify settings) | 🔲 TODO |

### P2 - Medium Priority

| # | Task | Files to Modify | Status |
|---|------|-----------------|--------|
| P2.1 | Create room management system | New: `modules/room/` | 🔲 TODO |
| P2.2 | Implement testing framework | New: `tests/` directories | 🔲 TODO |
| P2.3 | Add validation logging | `validation-logs/` enhancement | 🔲 TODO |
| P2.4 | Document completed implementation | `docs/architecture/IMPLEMENTATION_COMPLETE.md` | 🔲 TODO |

---

## Atomic Operations Plan

### Cycle 1: Fix Agent Registry Port Bug

**Directory:** `web-interface/src/lib/server/`

**Files to Modify:**
- `agent-registry.ts` (line 112)

**Change:**
```typescript
// BEFORE (line 111-113)
const port = process.env.DOCKER_ENV === 'true'
    ? 8000  // BUG: hardcoded port
    : agent.port;

// AFTER
const port = process.env.DOCKER_ENV === 'true'
    ? agent.port  // Use agent's actual port
    : agent.port;
```

**New File:** `health-check-service.ts`
```typescript
// Health check service using LiteLLM A2A endpoints
export class HealthCheckService {
  async checkAgentHealth(agentName: string): Promise<boolean> {
    // Check via LiteLLM A2A endpoint
  }
  async checkAllAgents(): Promise<AgentStatus[]> {
    // Check all 11 agents
  }
}
```

**Commit:** `fix(webui): correct agent port and add health check service`

**Validation:**
- [ ] Run: `node scripts/health-check.sh`
- [ ] Verify agent-registry returns correct ports
- [ ] Check health endpoint responds for each agent

---

### Cycle 2: Create Redis-to-WebSocket Bridge

**Directory:** `modules/communication/`

**New Files:**
- `redis-websocket-bridge.js` - Main bridge module
- `message-handler.js` - Message processing
- `index.js` - Module exports

**Implementation:**
```javascript
// modules/communication/redis-websocket-bridge.js
class RedisToWebSocketBridge {
  constructor(wsPort = 3001) {
    this.redis = Redis.createClient({ url: process.env.REDIS_URL });
    this.wss = new WebSocketServer({ port: wsPort });
    this.clients = new Set();
  }
  
  async start() {
    await this.redis.connect();
    this.setupWebSocketServer();
    await this.subscribeToChannels();
  }
  
  async subscribeToChannels() {
    // Subscribe to messageflow channel
    // Broadcast to all WebSocket clients
  }
}
```

**Commit:** `merge(modules): add Redis-to-WebSocket bridge for real-time communication`

**Validation:**
- [ ] WebSocket server starts on port 3001
- [ ] Redis messages appear in WebSocket clients
- [ ] Connection/reconnection handles gracefully

---

### Cycle 3: Connect MessageFlow to WebSocket

**Directory:** `web-interface/src/lib/components/`

**Files to Modify:**
- `MessageFlow.svelte` - Add WebSocket integration

**Changes:**
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  let ws: WebSocket;
  let reconnectTimer: NodeJS.Timeout;
  
  onMount(() => {
    connectWebSocket();
  });
  
  onDestroy(() => {
    if (ws) ws.close();
  });
  
  function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3001');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'a2a') {
        messages = [...messages, data.data];
      }
    };
    
    ws.onclose = () => {
      reconnectTimer = setTimeout(connectWebSocket, 5000);
    };
  }
</script>
```

**Commit:** `merge(webui): integrate WebSocket for real-time MessageFlow updates`

**Validation:**
- [ ] MessageFlow displays new A2A messages in real-time
- [ ] Reconnection works after disconnect
- [ ] Empty state shown when no messages

---

### Cycle 4: Update AgentStatus with Live Polling

**Directory:** `web-interface/src/lib/components/`

**Files to Modify:**
- `AgentStatus.svelte` - Add health service integration

**Changes:**
```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { HealthCheckService } from '../server/health-check-service';
  
  const healthService = new HealthCheckService();
  let pollInterval: NodeJS.Timeout;
  
  onMount(() => {
    // Initial load
    refreshStatus();
    // Poll every 30 seconds
    pollInterval = setInterval(refreshStatus, 30000);
  });
  
  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });
  
  async function refreshStatus() {
    const statuses = await healthService.checkAllAgents();
    agents = statuses;
  }
</script>
```

**Commit:** `fix(webui): connect AgentStatus to live health check service`

**Validation:**
- [ ] Agent status shows accurate online/offline
- [ ] Status updates without page refresh
- [ ] Count statistics update correctly

---

### Cycle 5: Implement Session Management

**Directory:** `init/`, `web-interface/src/lib/server/`

**New Files:**
- `init/session-schema.sql` - PostgreSQL schema
- `session-manager.ts` - Session manager class
- `room-manager.ts` - Room management

**Schema:**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    participants JSONB NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    context JSONB DEFAULT '{}',
    state JSONB DEFAULT '{"status": "active", "messages": []}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE session_messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    from_agent VARCHAR(50) NOT NULL,
    to_agent VARCHAR(50),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Commit:** `merge(modules): implement session and room management with PostgreSQL`

**Validation:**
- [ ] Sessions persist across server restarts
- [ ] Messages stored and retrieved correctly
- [ ] Room functionality works

---

### Cycle 6: Implement Testing Framework

**Directory:** `tests/`

**New Structure:**
```
tests/
├── unit/
│   ├── agent-client.test.ts
│   ├── session-manager.test.ts
│   └── health-check.test.ts
├── integration/
│   ├── a2a-communication.test.ts
│   └── websocket.test.ts
└── e2e/
    ├── user-chat-flow.test.ts
    └── agent-deliberation.test.ts
```

**Package.json additions:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest tests/unit",
    "test:integration": "vitest tests/integration",
    "test:e2e": "vitest tests/e2e",
    "test:coverage": "vitest --coverage"
  }
}
```

**Commit:** `merge(scripts): implement testing framework with unit, integration, E2E tests`

**Validation:**
- [ ] All unit tests pass
- [ ] Integration tests verify communication
- [ ] E2E tests complete user workflows

---

### Cycle 7: Prune Legacy Code

**Directories to audit:**
- `skills/` - Remove redundant skills
- `modules/` - Consolidate fragmented modules
- `web-interface/` - Remove unused components

**Items to remove:**
- Redundant health check implementations
- Duplicate A2A implementations
- Deprecated communication patterns

**Commit:** `prune(skills): remove redundant legacy code and patterns`

**Validation:**
- [ ] No breaking changes to functionality
- [ ] All skills still loadable
- [ ] Documentation updated

---

### Cycle 8: Document Implementation

**Directory:** `docs/architecture/`

**New Files:**
- `IMPLEMENTATION_COMPLETE.md` - Completion status
- Update `COMMUNICATION_ARCHITECTURE_DESIGN.md`

**Commit:** `docs(architecture): document completed implementation`

**Validation:**
- [ ] All fixes documented
- [ ] Architecture diagrams updated
- [ ] Inline comments added to code

---

## Commit Message Taxonomy

| Type | Purpose | Example |
|------|---------|---------|
| `fix` | Resolve broken dependency or bug | `fix(litellm): update A2A endpoint format` |
| `merge` | Consolidate fragmented code | `merge(modules): add Redis-to-WS bridge` |
| `prune` | Remove unneeded legacy code | `prune(skills): remove redundant patterns` |
| `docs` | Add documentation or comments | `docs(architecture): document completion` |

**Allowed Scopes:**
`(docs)`, `(plans)`, `(agents)`, `(skills)`, `(modules)`, `(liberation)`, `(scripts)`, `(init)`, `(installer)`, `(litellm)`, `(webui)`, `(communication)`

---

## Validation Criteria Per Cycle

### Cycle 1: Agent Registry Fix
1. Health check script returns correct agent ports
2. `GET /api/agents` returns all 11 agents with correct ports
3. Manual verification via browser dev tools

### Cycle 2: Redis-to-WebSocket Bridge
1. WebSocket server starts without errors
2. `ws://localhost:3001` accepts connections
3. Redis publish triggers WebSocket broadcast

### Cycle 3: MessageFlow Integration
1. A2A message appears in MessageFlow within 1 second
2. Component handles 100+ messages without performance issues
3. Reconnection after network loss works

### Cycle 4: AgentStatus Live Updates
1. Agent status reflects actual LiteLLM health
2. Stats (online/offline/busy counts) accurate
3. No memory leaks from polling

### Cycle 5: Session Management
1. Sessions survive container restart
2. Message history retrievable
3. Room creation and joining works

### Cycle 6: Testing Framework
1. `npm test` passes all unit tests
2. Integration tests pass against running system
3. E2E tests verify complete workflows

### Cycle 7: Pruning
1. No runtime errors after removal
2. All critical paths still functional
3. Codebase size reduced

### Cycle 8: Documentation
1. All inline comments added
2. Architecture diagrams current
3. README updated with changes

---

## Risk Assessment and Rollback Plan

### Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-------------|--------|------------|
| WebSocket connection failures | Medium | Medium | Implement reconnection with exponential backoff |
| Health check timeout issues | Medium | Low | Use 2-second timeout, graceful degradation |
| Session persistence failures | Low | High | Backup before migration, rollback capability |
| Breaking changes to A2A | Low | High | Test against staging first |
| Performance regression | Medium | Medium | Monitor response times, test with load |

### Rollback Procedures

**Cycle 1 Rollback:**
```bash
# Revert agent-registry changes
git checkout HEAD -- web-interface/src/lib/server/agent-registry.ts
```

**Cycle 2 Rollback:**
```bash
# Stop WebSocket bridge
pkill -f redis-websocket-bridge
# Revert to direct Redis polling
```

**Cycle 3 Rollback:**
```bash
# Revert MessageFlow to static mode
git checkout HEAD -- web-interface/src/lib/components/MessageFlow.svelte
```

**Full System Rollback:**
```bash
# Stop all services
docker-compose down

# Restore previous version
git checkout <previous-tag>
docker-compose up -d

# Verify system health
./scripts/health-check.sh
```

---

## 24-Hour Loop Timeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                      24-HOUR AUTONOMOUS LOOP                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Hour 0-1:   Cycle 1 - Fix Agent Registry Port Bug                      │
│              └─ Verify health check service                             │
│                                                                        │
│  Hour 1-2:   Cycle 2 - Create Redis-to-WebSocket Bridge                 │
│              └─ Test WebSocket server                                   │
│                                                                        │
│  Hour 2-3:   Cycle 3 - Connect MessageFlow to WebSocket                 │
│              └─ Verify real-time updates                                │
│                                                                        │
│  Hour 3-4:   Cycle 4 - Update AgentStatus with Live Polling            │
│              └─ Verify agent status accuracy                             │
│                                                                        │
│  Hour 4-6:   Cycle 5 - Implement Session Management                     │
│              └─ Test persistence                                        │
│                                                                        │
│  Hour 6-8:   Cycle 6 - Implement Testing Framework                     │
│              └─ Run all test suites                                     │
│                                                                        │
│  Hour 8-10:  Cycle 7 - Prune Legacy Code                                │
│              └─ Verify no breaking changes                              │
│                                                                        │
│  Hour 10-12: Cycle 8 - Document Implementation                          │
│              └─ Update all documentation                                │
│                                                                        │
│  Hour 12-24: Continuous validation and monitoring                       │
│              └─ Run health checks every 30 min                          │
│              └─ Commit progress every hour                              │
│              └─ Push to GitHub every 4 hours                            │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Metrics

### Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| A2A Delivery Rate | >95% | Unknown |
| Message Latency | <500ms | Unknown |
| Agent Status Accuracy | >90% | 0% (all offline) |
| MessageFlow Updates | Real-time | None |
| Unit Test Pass Rate | >90% | 0% |
| Integration Test Pass Rate | >90% | 0% |
| E2E Test Pass Rate | >90% | 0% |

### Tracking

All validation results logged to `validation-logs/VALIDATION-report.md`

---

## Dependencies

### External Dependencies
- LiteLLM v1.x with A2A support
- Redis server for Pub/Sub
- PostgreSQL for session persistence
- Node.js 18+ for WebSocket bridge

### Internal Dependencies
- `litellm_config.yaml` (already configured)
- `agents/lib/agent-client.js` (already working)
- `web-interface/` (needs updates)

---

## Next Steps

1. **Approve this plan** - Confirm atomic operations are correct
2. **Begin Cycle 1** - Fix agent-registry.ts port bug
3. **Validate each cycle** - Run validation criteria before proceeding
4. **Commit progress** - Use commit taxonomy for each operation
5. **Monitor system** - Track metrics throughout implementation

---

*Document Version: 1.0.0*  
*Created: 2026-03-30*  
*Mode: Architect*  
*Status: Ready for Implementation*