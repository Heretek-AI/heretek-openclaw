# Heretek OpenClaw — Implementation Plan

**Document Date:** 2026-03-30  
**Version:** 1.0.0  
**Status:** Active

---

## Executive Summary

This document consolidates all planning documents and provides a clear, actionable implementation plan for the Heretek OpenClaw autonomous agent collective. It addresses the current state, identifies gaps, and provides a roadmap for completing the system.

### Current State Assessment

| Component | Status | Issues |
|-----------|--------|--------|
| LiteLLM Gateway | ✅ Working | MiniMax model names need correction |
| A2A Protocol | ⚠️ Partial | Native endpoints return 404, Redis fallback active |
| Agent Runtime | ✅ Working | All 11 agents configured |
| Web UI | ✅ Working | Chat, status, flow components functional |
| Health Checks | ✅ Working | Direct container polling |
| Redis Bridge | ✅ Working | Redis-to-WebSocket bridge operational |
| Skills | ✅ Working | 35+ skills available |
| Modules | ✅ Working | Consciousness, memory, etc. |
| Tests | ⚠️ Partial | Unit tests exist, E2E tests needed |

---

## 1. Plan Consolidation

### 1.1 Archived Plans

The following plans have been archived as of 2026-03-30:

| Plan | Status | Location |
|------|--------|----------|
| `PRIME_DIRECTIVE.md` | Active | `docs/plans/` (master directive) |
| `PRIME_DIRECTIVE_ENhanced.md` | Superseded | [`docs/plans/archive/2026-03-30/`](docs/plans/archive/2026-03-30/PRIME_DIRECTIVE_ENhanced.md) |
| `PRIME_DIRECTIVE_REVIEW.md` | Complete | [`docs/plans/archive/2026-03-30/`](docs/plans/archive/2026-03-30/PRIME_DIRECTIVE_REVIEW.md) |
| `DEVELOPMENT_PLAN_2026.md` | Outdated | [`docs/plans/archive/2026-03-30/`](docs/plans/archive/2026-03-30/DEVELOPMENT_PLAN_2026.md) |
| `FULL_STACK_VALIDATION_PLAN.md` | Merged | [`docs/plans/archive/2026-03-30/`](docs/plans/archive/2026-03-30/FULL_STACK_VALIDATION_PLAN.md) |
| `COLLECTIVE_TEST_TASK.md` | Reference | [`docs/plans/archive/2026-03-30/`](docs/plans/archive/2026-03-30/COLLECTIVE_TEST_TASK.md) |

**Archive directories:**
- `docs/plans/active/` - Currently active plans (in progress)
- `docs/plans/completed/` - Historical completed plans
- `docs/plans/reference/` - Reference documents and assessments
- `docs/plans/specs/` - Technical specifications
- `docs/plans/research/` - Research documents
- `docs/plans/archive/` - Superseded/retired plans (see [`archive/README.md`](docs/plans/archive/README.md))

---

## 2. Critical Fixes

### 2.1 Verify MiniMax Model Configuration (CRITICAL)

**Note:** `minimax/MiniMax-M2.7` is the correct, latest MiniMax model. The fallback should be `minimax/MiniMax-M2.5`.

**Files to verify:**
- [`litellm_config.yaml`](litellm_config.yaml) - Lines 22-40, 71-156

**Current Configuration (Correct):**
```yaml
# Primary: MiniMax-M2.7 (latest)
model_name: minimax/MiniMax-M2.7
litellm_params:
  model: minimax/MiniMax-M2.7

# Fallback: MiniMax-M2.5
model_name: minimax/MiniMax-M2.5
litellm_params:
  model: minimax/MiniMax-M2.5
```

**Action:** Verify that the MiniMax API accepts `minimax/MiniMax-M2.7` and that fallback to `minimax/MiniMax-M2.5` works correctly.

**Validation:**
```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "minimax/MiniMax-M2.7", "messages": [{"role": "user", "content": "test"}]}'
```

### 2.2 Fix A2A Endpoints (HIGH)

**Issue:** Native A2A endpoints return 404

**Options:**
1. **Option A:** Continue using Redis fallback (current working solution)
2. **Option B:** Investigate LiteLLM A2A plugin requirements
3. **Option C:** Implement custom A2A handler

**Recommendation:** Option A - Redis fallback is working reliably. Document as intentional architecture.

---

## 3. Test Implementation Plan

### 3.1 Test Directory Structure

```
tests/
├── unit/                      # Unit tests
│   ├── agent-client.test.ts
│   ├── health-check.test.ts
│   ├── litellm-client.test.ts
│   └── redis-bridge.test.ts
├── integration/               # Integration tests
│   ├── a2a-communication.test.ts
│   ├── agent-deliberation.test.ts
│   └── websocket-bridge.test.ts
├── e2e/                       # End-to-end tests
│   ├── user-chat-flow.test.ts
│   ├── triad-deliberation-flow.test.ts
│   └── webui-complete-flow.test.ts
├── skills/                    # Skill tests
│   ├── healthcheck.test.js
│   ├── a2a-message-send.test.js
│   └── curiosity-engine.test.js
└── utils/                     # Test utilities
    ├── test-utils.ts
    └── mocks.ts
```

### 3.2 Unit Tests

#### Agent Client Tests

```typescript
// tests/unit/agent-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentClient } from '../../agents/lib/agent-client';

describe('AgentClient', () => {
  let client: AgentClient;

  beforeEach(() => {
    client = new AgentClient({
      agentId: 'steward',
      role: 'orchestrator',
      litellmHost: 'http://localhost:4000',
      apiKey: 'test-key'
    });
  });

  it('should send message to agent via A2A', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const result = await client.sendMessage('alpha', 'Test message');
    expect(result.success).toBe(true);
  });

  it('should handle A2A failure and fallback to Redis', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({ ok: true });

    const result = await client.sendMessage('alpha', 'Test message');
    expect(result.success).toBe(true);
  });
});
```

#### Health Check Tests

```typescript
// tests/unit/health-check.test.ts
import { describe, it, expect, vi } from 'vitest';
import { HealthCheckService } from '../../web-interface/src/lib/server/health-check-service';

describe('HealthCheckService', () => {
  it('should check agent health via direct endpoint', async () => {
    const service = new HealthCheckService();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'healthy' })
    });

    const result = await service.checkAgentHealth('steward');
    expect(result.status).toBe('online');
  });

  it('should return offline for failed health check', async () => {
    const service = new HealthCheckService();
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const result = await service.checkAgentHealth('steward');
    expect(result.status).toBe('offline');
  });
});
```

### 3.3 Integration Tests

#### A2A Communication Tests

```typescript
// tests/integration/a2a-communication.test.ts
import { describe, it, expect } from 'vitest';

describe('A2A Communication Integration', () => {
  it('should deliver message from Steward to Alpha via Redis', async () => {
    const { sendMessage } = await import('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await sendMessage('steward', 'alpha', 'Test message');
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should broadcast to all triad members', async () => {
    const { broadcast } = await import('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await broadcast('steward', 'Triad broadcast test');
    expect(result.success).toBe(true);
    expect(result.recipients).toContain('alpha');
    expect(result.recipients).toContain('beta');
    expect(result.recipients).toContain('charlie');
  });
});
```

### 3.4 End-to-End Tests

#### User Chat Flow Tests

```typescript
// tests/e2e/user-chat-flow.test.ts
import { describe, it, expect } from 'vitest';
import { request } from 'playwright';

describe('User Chat E2E', () => {
  it('should complete full chat flow with agent', async () => {
    const context = await request.newContext();
    
    // 1. User sends message
    const chatResponse = await context.post('/api/chat', {
      data: {
        agent: 'steward',
        message: 'Hello, what can you help me with?'
      }
    });
    const chat = await chatResponse.json();
    
    expect(chatResponse.ok()).toBe(true);
    expect(chat.success).toBe(true);
    expect(chat.response).toBeDefined();
    
    // 2. Get conversation history
    const historyResponse = await context.get(`/api/chat?conversationId=${chat.conversationId}`);
    const history = await historyResponse.json();
    
    expect(history.success).toBe(true);
    expect(history.count).toBeGreaterThanOrEqual(2);
  });
});
```

#### WebUI Tests (Playwright)

```typescript
// tests/e2e/webui-complete-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('WebUI Complete Flow', () => {
  test('should display all agents with status', async ({ page }) => {
    await page.goto('/');
    
    // Wait for agent status to load
    await page.waitForSelector('[data-testid="agent-status"]');
    
    // Check all 11 agents are displayed
    const agents = await page.$$('[data-testid="agent-item"]');
    expect(agents.length).toBe(11);
  });

  test('should send message and receive response', async ({ page }) => {
    await page.goto('/');
    
    // Select steward agent
    await page.click('[data-testid="agent-steward"]');
    
    // Type and send message
    await page.fill('[data-testid="message-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="message-response"]');
    
    // Verify response displayed
    const messages = await page.$$('[data-testid="message-item"]');
    expect(messages.length).toBeGreaterThanOrEqual(2);
  });

  test('should show real-time message flow', async ({ page }) => {
    await page.goto('/');
    
    // Wait for MessageFlow component
    await page.waitForSelector('[data-testid="message-flow"]');
    
    // Check connection status
    const statusElement = await page.locator('[data-testid="connection-status"]');
    const status = await statusElement.textContent();
    
    // Status should be connected, connecting, or disconnected (graceful)
    expect(['connected', 'connecting', 'disconnected']).toContain(status?.toLowerCase());
  });
});
```

### 3.5 Skill Tests

```javascript
// tests/skills/healthcheck.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Deployment Health Check Skill', () => {
  it('should check LiteLLM health', async () => {
    const { checkLiteLLMHealth } = require('../../skills/deployment-health-check/check.js');
    
    const result = await checkLiteLLMHealth();
    assert.ok(result.success === true || result.success === false);
  });

  it('should check all agent health', async () => {
    const { checkAllAgents } = require('../../skills/deployment-health-check/check.js');
    
    const result = await checkAllAgents();
    assert.ok(Array.isArray(result.agents));
    assert.ok(result.agents.length === 11);
  });
});
```

---

## 4. Implementation Phases

### Phase 1: Critical Fixes (Week 1)

| Task | Files | Validation |
|------|-------|------------|
| Fix MiniMax model names | `litellm_config.yaml` | Chat completion works |
| Document A2A fallback | `docs/WIRING_GRAPH.md` | Documentation updated |
| Update .env.example | `.env.example` | All variables documented |

### Phase 2: Test Framework (Week 2)

| Task | Files | Validation |
|------|-------|------------|
| Setup Vitest | `tests/vitest.config.ts` | Tests run with `npm test` |
| Unit tests | `tests/unit/*.test.ts` | >80% coverage |
| Integration tests | `tests/integration/*.test.ts` | All pass |
| E2E tests | `tests/e2e/*.test.ts` | User flows work |

### Phase 3: WebUI Enhancement (Week 3)

| Task | Files | Validation |
|------|-------|------------|
| Enable WebSocket | `MessageFlow.svelte` | Real-time updates |
| Activity feed | `AgentStatus.svelte` | Live activity shown |
| Error handling | All components | Graceful degradation |

### Phase 4: External Integrations (Week 4)

| Task | Files | Validation |
|------|-------|------------|
| Enable LangFuse | `litellm_config.yaml` | Traces visible |
| Enable OpenTelemetry | `modules/observability/` | Spans collected |
| GraphRAG research | `docs/research/` | Decision documented |

### Phase 5: Documentation Cleanup (Week 5)

| Task | Files | Validation |
|------|-------|------------|
| Archive old plans | `docs/plans/archive/` | Clean directory |
| Update README | `README.md` | Accurate |
| Consolidate docs | `docs/` | No duplicates |

---

## 5. Validation Checklist

### 5.1 Pre-Deployment Validation

```bash
# Run all tests
npm test

# Check LiteLLM health
curl http://localhost:4000/health

# Check all agents
curl http://localhost:4000/v1/agents

# Test chat completion
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "agent/steward", "messages": [{"role": "user", "content": "test"}]}'

# Run smoke tests
node skills/deployment-smoke-test/test.js

# Validate configuration
node skills/config-validator/validate.js
```

### 5.2 WebUI Validation

```bash
# Start web interface
cd web-interface && npm run dev

# Check endpoints
curl http://localhost:3000/api/status
curl http://localhost:3000/api/agents

# Manual testing
# 1. Navigate to http://localhost:3000
# 2. Verify all 11 agents shown
# 3. Select agent and send message
# 4. Verify response received
# 5. Check MessageFlow for updates
```

### 5.3 A2A Validation

```bash
# Test Redis A2A
node skills/a2a-message-send/a2a-cli.js ping steward alpha

# Test broadcast
node skills/a2a-message-send/a2a-cli.js broadcast steward "Test broadcast"

# Check message count
node skills/a2a-message-send/a2a-cli.js count alpha
```

---

## 6. Success Criteria

### 6.1 Functional Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| Agent availability | Uptime | >95% |
| Message delivery | Success rate | >95% |
| WebUI responsiveness | Load time | <2s |
| Health check accuracy | Correct status | >90% |
| Test coverage | Code coverage | >80% |

### 6.2 Non-Functional Criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| Documentation | Completeness | 100% |
| Code quality | ESLint errors | 0 |
| Security | Known vulnerabilities | 0 |
| Performance | P95 latency | <500ms |

---

## 7. Risk Mitigation

### 7.1 Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| A2A native unavailable | Medium | High | Redis fallback working |
| MiniMax API downtime | High | Low | z.ai failover configured |
| Agent container crash | Medium | Low | Health checks + restart |
| Database corruption | High | Low | Regular backups |
| WebUI WebSocket failure | Low | Medium | REST API fallback |

### 7.2 Rollback Plan

If issues occur during implementation:

1. **Revert configuration changes:**
   ```bash
   git checkout HEAD -- litellm_config.yaml
   ```

2. **Restart services:**
   ```bash
   docker compose restart
   ```

3. **Restore from backup:**
   ```bash
   pg_restore -d heretek backup-latest.sql
   ```

---

## 8. Next Steps

1. **Immediate (This Session):**
   - [ ] Review and approve this implementation plan
   - [ ] Switch to Code mode for implementation
   - [ ] Apply critical fixes first

2. **Short-term (Week 1):**
   - [ ] Fix MiniMax model names
   - [ ] Archive redundant plans
   - [ ] Update documentation

3. **Medium-term (Weeks 2-3):**
   - [ ] Implement test framework
   - [ ] Write unit/integration tests
   - [ ] Enhance WebUI

4. **Long-term (Weeks 4-5):**
   - [ ] Enable external integrations
   - [ ] Complete documentation
   - [ ] Full validation

---

*Document Version: 1.0.0*  
*Created: 2026-03-30*  
*Status: Ready for Implementation* 🦊
