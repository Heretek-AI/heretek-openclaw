# Autonomous Iteration Next - 24-Hour Cycle Plan

**Document Version:** 1.0.0  
**Created:** 2026-03-30  
**Status:** Active - Ready for Execution  
**Mode:** Architect → Code  
**Duration:** 24-Hour Autonomous Cycle

---

## Executive Summary

This plan outlines the tasks for the next 24-hour autonomous development cycle. Based on the completed 7 cycles and remaining work from the implementation roadmap, this iteration focuses on **high-impact fixes** and **observability improvements**.

### Current System State

| Component | Status | Notes |
|-----------|--------|-------|
| LiteLLM A2A Endpoints | ✅ Fixed | Already uses `/v1/agents/{name}` format |
| Agent Registry | ✅ Fixed | Now uses `agent.port` instead of hardcoded |
| Health Check Service | ✅ Implemented | 30s polling interval |
| Redis-Ws Bridge | ✅ Implemented | Subscribes to `a2a:system:messageflow` |
| MessageFlow WebSocket | ✅ Connected | Auto-reconnect with backoff |
| Session Management | ✅ Schema Ready | PostgreSQL schema created |
| Testing Framework | ✅ Vitest Ready | Unit tests for health checks |
| Documentation | ✅ Complete | Implementation complete docs |

### Remaining Work Priority

| Priority | Item | Risk | Impact |
|----------|------|------|--------|
| 🔴 High | Fix LiteLLM A2A endpoint format verification | Medium | High |
| 🟡 Medium | Enable observability integrations (LangFuse, OTel) | Low | Medium |
| 🟡 Medium | Implement agent heartbeat monitoring | Medium | Medium |
| 🟢 Low | Create automated testing pipeline | Low | High |

---

## Task Breakdown

### Phase 1: High Priority Fixes (Hours 0-4)

#### Task 1.1: Fix LiteLLM A2A Endpoint Format Verification

**Description:** Verify and fix the LiteLLM A2A endpoint format to ensure proper agent-to-agent communication.

**Current State:**
- LiteLLM config already uses `/v1/agents/{agent_name}` format
- Need to verify actual LiteLLM version supports this format
- May need to check if newer LiteLLM versions use different paths

**Files to Examine:**
- `litellm_config.yaml`
- `web-interface/src/lib/server/litellm-client.ts`
- `modules/communication/redis-websocket-bridge.js`

**Implementation Steps:**
1. Check LiteLLM version in docker-compose.yml
2. Verify endpoint format compatibility with LiteLLM docs
3. Test actual A2A message delivery
4. Update configuration if needed

**Validation:**
```bash
# Test A2A endpoint
curl -X POST http://localhost:4000/v1/agents/steward/messages \
  -H "Content-Type: application/json" \
  -d '{"role": "user", "content": "ping"}'

# Expected: 200 response with agent response
```

**Success Criteria:**
- [ ] LiteLLM A2A endpoint responds correctly
- [ ] Messages flow between agents via LiteLLM
- [ ] WebSocket receives A2A messages from Redis
- [ ] No 404 or 400 errors in logs

**Rollback:** Revert litellm_config.yaml to previous version

---

#### Task 1.2: Complete WebSocket Integration Verification

**Description:** Ensure bidirectional communication between agents, Redis, and web interface.

**Current State:**
- Redis-to-WebSocket bridge implemented
- MessageFlow connects to WebSocket
- Need to verify actual message flow

**Implementation Steps:**
1. Start Redis-to-WebSocket bridge
2. Trigger test A2A message
3. Verify message appears in web interface
4. Add connection status indicator to UI

**Validation:**
```bash
# Start bridge
node modules/communication/redis-websocket-bridge.js &

# Monitor WebSocket connections
curl -s http://localhost:3001/health

# Trigger test message
redis-cli PUBLISH a2a:system:messageflow '{"type":"a2a","data":{}}'
```

**Success Criteria:**
- [ ] WebSocket server starts on port 3001
- [ ] Bridge connects to Redis
- [ ] Messages published to Redis appear in WebSocket
- [ ] Web interface receives real-time updates

**Rollback:** Stop redis-websocket-bridge.js process

---

#### Task 1.3: Implement Chat Interface Real Connection

**Description:** Connect the chat interface to actual LiteLLM agent endpoints.

**Current State:**
- Chat interface exists with agent selection
- API route `/api/chat` exists
- Needs actual LiteLLM integration

**Files to Modify:**
- `web-interface/src/lib/server/litellm-client.ts`
- `web-interface/src/routes/api/chat/+server.ts`

**Implementation Steps:**
1. Implement `/api/chat` to forward to LiteLLM
2. Add error handling for LiteLLM failures
3. Add loading states to UI
4. Implement message queuing for offline

**Code Changes:**
```typescript
// web-interface/src/routes/api/chat/+server.ts
export async function POST({ request }) {
  const { agent, message, userId } = await request.json();
  
  try {
    // Send to LiteLLM
    const response = await litellmClient.sendMessage(agent, message);
    
    // Store in session
    await sessionManager.addMessage({
      sessionId: userId,
      fromAgent: agent,
      content: message,
      type: 'user'
    });
    await sessionManager.addMessage({
      sessionId: userId,
      fromAgent: agent,
      content: response,
      type: 'agent'
    });
    
    return json({ success: true, response });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Success Criteria:**
- [ ] User message sent to LiteLLM agent
- [ ] Agent response displayed in chat
- [ ] Error handling shows toast notifications
- [ ] Messages persist in session

**Rollback:** Revert to previous API route implementation

---

#### Task 1.4: Add Error Handling and Toast Notifications

**Description:** Implement user-friendly error feedback via toast notifications.

**Files to Modify:**
- `web-interface/src/lib/components/ChatInterface.svelte`
- `web-interface/src/lib/components/AgentStatus.svelte`

**Implementation Steps:**
1. Create toast notification component
2. Add error handling to API calls
3. Implement connection status toasts
4. Add retry buttons for failed operations

**Success Criteria:**
- [ ] Network errors show toast notification
- [ ] LiteLLM failures display user-friendly message
- [ ] Connection lost shows reconnecting status
- [ ] Retry option available on failed operations

**Rollback:** Revert component changes

---

### Phase 2: Observability (Hours 4-8)

#### Task 2.1: Enable LangFuse Integration

**Description:** Add LangFuse for tracing and analytics of agent communications.

**Files to Create:**
- `modules/observability/langfuse-client.ts`
- Configuration in `modules/consciousness/config.json`

**Implementation Steps:**
1. Add LangFuse SDK to dependencies
2. Create observability module
3. Instrument LiteLLM client calls
4. Add trace context to A2A messages

**Configuration:**
```yaml
# langfuse configuration
observability:
  provider: langfuse
  enabled: true
  endpoint: ${LANGFUSE_HOST}
  public_key: ${LANGFUSE_PUBLIC_KEY}
  secret_key: ${LANGFUSE_SECRET_KEY}
  sampling_rate: 0.1  # 10% sampling for production
```

**Success Criteria:**
- [ ] LangFuse receives trace data
- [ ] Agent calls appear in LangFuse dashboard
- [ ] Latency metrics tracked
- [ ] Error tracking enabled

---

#### Task 2.2: Enable OpenTelemetry Integration

**Description:** Add OTel for distributed tracing across services.

**Files to Create:**
- `modules/observability/otel-tracer.ts`
- `otel-collector-config.yaml`

**Implementation Steps:**
1. Add OpenTelemetry SDK
2. Create trace exporter
3. Instrument HTTP requests
4. Configure collector endpoint

**Configuration:**
```yaml
# OpenTelemetry config
otel:
  enabled: true
  service_name: heretek-openclaw
  exporter:
    type: otlp
    endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT}
```

**Success Criteria:**
- [ ] Traces span across services
- [ ] Baggage propagates between agents
- [ ] Metrics exported to collector
- [ ] Logs correlated with traces

---

#### Task 2.3: Implement Agent Heartbeat Monitoring

**Description:** Create dedicated heartbeat system for agent liveness.

**Endpoint:** `/v1/agents/{id}/heartbeat`

**Implementation Steps:**
1. Add heartbeat endpoint to LiteLLM config
2. Create heartbeat monitor service
3. Track agent response times
4. Alert on missed heartbeats

**Configuration:**
```yaml
# heartbeat settings
heartbeat:
  interval: 15000  # 15 seconds
  timeout: 5000   # 5 second response timeout
  retries: 3      # Retry before marking offline
  alert_threshold: 3  # 3 missed = alert
```

**Success Criteria:**
- [ ] Heartbeat endpoint responds
- [ ] Monitor tracks all 11 agents
- [ ] Alerts triggered for missed heartbeats
- [ ] Dashboard shows heartbeat status

---

### Phase 3: Testing Pipeline (Hours 8-12)

#### Task 3.1: Create Automated Testing Pipeline

**Description:** Set up CI/CD for automated testing on commits.

**Files to Create:**
- `.github/workflows/test.yml`
- `scripts/ci-test.sh`

**Pipeline Steps:**
1. Run unit tests
2. Run integration tests
3. Execute health checks
4. Deploy to staging (if passing)

**Configuration:**
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm test
      - run: docker-compose up -d
      - run: ./scripts/health-check.sh
```

**Success Criteria:**
- [ ] GitHub Actions workflow configured
- [ ] Tests run on every push
- [ ] Health checks in pipeline
- [ ] Notifications on failure

---

#### Task 3.2: Add Integration Tests for A2A Communication

**Description:** Create integration tests for agent-to-agent messaging.

**Files to Create:**
- `tests/integration/a2a-communication.test.ts`
- `tests/integration/websocket.test.ts`

**Test Coverage:**
```typescript
describe('A2A Communication', () => {
  test('steward can message alpha via LiteLLM', async () => {...});
  test('WebSocket receives A2A messages', async () => {...});
  test('Redis bridge broadcasts correctly', async () => {...});
});
```

**Success Criteria:**
- [ ] All A2A tests pass
- [ ] WebSocket tests pass
- [ ] Integration coverage >60%

---

### Phase 4: Growth Architecture (Hours 12-18)

#### Task 4.1: Design Multi-Collective Architecture

**Description:** Create architecture for multiple agent collectives.

**Output:** Architecture document in `docs/architecture/MULTI_COLLECTIVE_DESIGN.md`

**Components:**
- Collective registry
- Hub agent protocol
- Inter-collective communication
- Resource allocation

**Success Criteria:**
- [ ] Architecture documented
- [ ] Communication patterns defined
- [ ] Scalability limits identified
- [ ] Implementation plan created

---

#### Task 4.2: Implement Inter-Collective Communication

**Description:** Implement basic inter-collective messaging.

**Implementation Steps:**
1. Create collective registry service
2. Implement hub agent relay
3. Add Redis channels for inter-collective
4. Test message routing

**Success Criteria:**
- [ ] Two collectives can exchange messages
- [ ] Hub agent relays correctly
- [ ] Messages arrive with correct context
- [ ] No message loss

---

#### Task 4.3: Create Agent Spawning Mechanism

**Description:** Implement dynamic agent creation.

**Files to Create:**
- `modules/collective/agent-spawner.ts`
- `agents/template/` structure

**Implementation Steps:**
1. Create agent template
2. Implement spawning endpoint
3. Add Docker service creation
4. Register with collective

**Success Criteria:**
- [ ] New agent can be spawned via API
- [ ] Agent joins collective automatically
- [ ] Health monitoring starts
- [ ] Agent can be terminated

---

### Phase 5: Documentation and Cleanup (Hours 18-24)

#### Task 5.1: Update Architecture Documentation

**Description:** Update all architecture docs with current state.

**Files to Update:**
- `docs/architecture/COMMUNICATION_ARCHITECTURE_DESIGN.md`
- `docs/architecture/A2A_ARCHITECTURE.md`
- `docs/HEALTH_DASHBOARD.md`

**Success Criteria:**
- [ ] All architecture docs current
- [ ] Diagrams match implementation
- [ ] API docs complete

---

#### Task 5.2: Update CHANGELOG.md

**Description:** Document all changes from this iteration.

**Changes to Document:**
- LiteLLM A2A endpoint verification
- WebSocket integration completion
- Observability additions
- Testing pipeline setup
- Growth architecture design

**Success Criteria:**
- [ ] CHANGELOG.md updated
- [ ] Version bumped to 1.2.0
- [ ] All changes documented

---

#### Task 5.3: Archive Validation Logs

**Description:** Clean up and archive cycle validation logs.

**Actions:**
1. Archive current `validation-logs/cycle-validation.md`
2. Create new validation log for next cycle
3. Document metrics for this cycle
4. Update TODO list for next iteration

---

## Timeline Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                     24-HOUR AUTONOMOUS LOOP                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Hour 0-4:   Phase 1 - High Priority Fixes                            │
│              ├─ Task 1.1: LiteLLM A2A verification                      │
│              ├─ Task 1.2: WebSocket integration                        │
│              ├─ Task 1.3: Chat interface connection                   │
│              └─ Task 1.4: Toast notifications                          │
│                                                                        │
│  Hour 4-8:   Phase 2 - Observability                                   │
│              ├─ Task 2.1: LangFuse integration                         │
│              ├─ Task 2.2: OpenTelemetry setup                          │
│              └─ Task 2.3: Heartbeat monitoring                         │
│                                                                        │
│  Hour 8-12:  Phase 3 - Testing Pipeline                               │
│              ├─ Task 3.1: CI/CD workflow                               │
│              └─ Task 3.2: Integration tests                            │
│                                                                        │
│  Hour 12-18: Phase 4 - Growth Architecture                            │
│              ├─ Task 4.1: Multi-collective design                      │
│              ├─ Task 4.2: Inter-collective communication               │
│              └─ Task 4.3: Agent spawning mechanism                     │
│                                                                        │
│  Hour 18-24: Phase 5 - Documentation                                   │
│              ├─ Task 5.1: Update architecture docs                    │
│              ├─ Task 5.2: Update CHANGELOG.md                          │
│              └─ Task 5.3: Archive validation logs                      │
│                                                                        │
│  End:        Validation and handoff                                    │
│              └─ Run full validation suite                              │
│              └─ Report metrics to operator                             │
│              └─ Configure next cycle trigger                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria Summary

### Must Complete (Required for Cycle Success)

| Task | Criteria | Measurement |
|------|----------|-------------|
| Task 1.1 | LiteLLM A2A working | Agent messages delivered |
| Task 1.3 | Chat interface functional | User can chat with agents |
| Task 1.4 | Error handling complete | No silent failures |
| Task 3.1 | CI/CD pipeline working | Tests run on push |

### Should Complete (High Value)

| Task | Criteria | Measurement |
|------|----------|-------------|
| Task 2.1 | LangFuse integrated | Traces visible |
| Task 2.3 | Heartbeat working | All agents monitored |
| Task 5.1 | Docs updated | Architecture current |

### Nice to Complete (Stretch Goals)

| Task | Criteria | Measurement |
|------|----------|-------------|
| Task 4.1 | Multi-collective design | Document complete |
| Task 4.2 | Inter-collective messaging | Two collectives connected |
| Task 4.3 | Agent spawning | API spawns new agent |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LiteLLM version mismatch | Medium | High | Check version before changes |
| WebSocket port conflict | Low | Medium | Use configurable port |
| Test failures blocking | Medium | High | Run tests incrementally |
| Scope creep | High | Medium | Stick to prioritized tasks |
| Environment issues | Medium | Medium | Use docker-compose for consistency |

---

## Dependencies

### External
- LiteLLM v1.12+ with A2A support
- Redis server 6+
- PostgreSQL 13+
- Node.js 18+

### Internal
- `web-interface/src/lib/server/litellm-client.ts`
- `modules/communication/redis-websocket-bridge.js`
- `init/session-schema.sql`

---

## Commands Reference

### Pre-Cycle Setup
```bash
# Ensure services running
docker-compose ps

# Verify health
curl -s http://localhost:5173/api/status | jq '.summary'

# Check validation logs
cat validation-logs/cycle-validation.md
```

### Cycle Validation
```bash
# Run validation suite
./scripts/validate-cycles.sh

# Run tests
npm test -- --coverage

# Check health dashboard
curl -s http://localhost:5173/api/status | jq '.status.agents'
```

### Post-Cycle Cleanup
```bash
# Commit changes
git add -A && git commit -m "chore: complete autonomous cycle"

# Push if authorized
git push

# Archive logs
mv validation-logs/cycle-validation.md validation-logs/cycle-$(date +%Y%m%d).md
```

---

## References

- [Autonomous Loop Control](docs/AUTONOMOUS_LOOP_CONTROL.md)
- [Implementation Roadmap](plans/IMPLEMENTATION_ROADMAP.md)
- [Cycle Validation Report](validation-logs/cycle-validation.md)

---

*Document Version: 1.0.0*  
*Created: 2026-03-30T02:48 UTC*  
*Mode: Architect (Next Iteration Plan)*  
*Status: Ready for Execution*

**Ready for Mode Switch:** Code mode can execute this plan
**Estimated Tasks:** 12 primary, 4 stretch goals
**Priority:** High → Low as listed above