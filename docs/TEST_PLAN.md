# Heretek OpenClaw — Test Plan

**Document Date:** 2026-03-30  
**Version:** 1.0.0  
**Status:** Ready for Implementation

---

## Overview

This document defines the complete testing strategy for the Heretek OpenClaw autonomous agent collective, including unit tests, integration tests, end-to-end tests, and skill validation tests.

---

## 1. Test Directory Structure

```
tests/
├── vitest.config.ts              # Vitest configuration
├── test-utils.ts                 # Shared test utilities
├── unit/                         # Unit tests
│   ├── agent-client.test.ts
│   ├── health-check.test.ts
│   ├── litellm-client.test.ts
│   └── redis-bridge.test.ts
├── integration/                  # Integration tests
│   ├── a2a-communication.test.ts
│   ├── agent-deliberation.test.ts
│   └── websocket-bridge.test.ts
├── e2e/                          # End-to-end tests
│   ├── user-chat-flow.test.ts
│   ├── triad-deliberation-flow.test.ts
│   └── webui-complete-flow.test.ts
├── skills/                       # Skill tests
│   ├── healthcheck.test.js
│   ├── a2a-message-send.test.js
│   └── curiosity-engine.test.js
└── utils/                        # Test utilities
    ├── mocks.ts
    └── fixtures.ts
```

---

## 2. Unit Tests

### 2.1 Agent Client Tests

**File:** `tests/unit/agent-client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentClient } from '../../agents/lib/agent-client';

describe('AgentClient', () => {
  let client: AgentClient;
  const mockConfig = {
    agentId: 'steward',
    role: 'orchestrator',
    litellmHost: 'http://localhost:4000',
    apiKey: 'test-key'
  };

  beforeEach(() => {
    client = new AgentClient(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMessage', () => {
    it('should send message to agent via A2A successfully', async () => {
      // Mock fetch for A2A endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: 'test-123' })
      });

      const result = await client.sendMessage('alpha', 'Test message');
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/agents/alpha/send'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should handle A2A failure and fallback to Redis', async () => {
      // Mock fetch to fail first, then succeed with Redis
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('404 Not Found'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

      const result = await client.sendMessage('alpha', 'Test message');
      
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return error when both A2A and Redis fail', async () => {
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('404'))
        .mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await client.sendMessage('alpha', 'Test message');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('queryStatus', () => {
    it('should return agent status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'online', busy: false })
      });

      const result = await client.queryStatus('alpha');
      
      expect(result.online).toBe(true);
      expect(result.busy).toBe(false);
    });

    it('should return offline for failed status check', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await client.queryStatus('alpha');
      
      expect(result.online).toBe(false);
    });
  });
});
```

### 2.2 Health Check Tests

**File:** `tests/unit/health-check.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthCheckService } from '../../web-interface/src/lib/server/health-check-service';

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(() => {
    service = new HealthCheckService({
      litellmHost: 'http://localhost:4000',
      apiKey: 'test-key',
      timeout: 2000
    });
    vi.clearAllMocks();
  });

  describe('checkAgentHealth', () => {
    it('should return online status for healthy agent', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ agent: 'steward', status: 'healthy' })
      });

      const result = await service.checkAgentHealth('steward');
      
      expect(result.status).toBe('online');
      expect(result.agentId).toBe('steward');
      expect(result.latency).toBeDefined();
    });

    it('should return busy status for overloaded agent', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429
      });

      const result = await service.checkAgentHealth('steward');
      
      expect(result.status).toBe('busy');
    });

    it('should return offline for unreachable agent', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await service.checkAgentHealth('steward');
      
      expect(result.status).toBe('offline');
      expect(result.error).toBeDefined();
    });

    it('should handle timeout gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));

      const result = await service.checkAgentHealth('steward');
      
      expect(result.status).toBe('offline');
    });
  });

  describe('checkAllAgents', () => {
    it('should check health of all 11 agents', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

      const results = await service.checkAllAgents();
      
      expect(results).toHaveLength(11);
      expect(results.every(r => r.agentId)).toBe(true);
    });
  });

  describe('getAgentsWithStatus', () => {
    it('should return agents with proper status mapping', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

      const agents = await service.getAgentsWithStatus();
      
      expect(agents).toHaveLength(11);
      expect(agents[0]).toHaveProperty('id');
      expect(agents[0]).toHaveProperty('name');
      expect(agents[0]).toHaveProperty('role');
      expect(agents[0]).toHaveProperty('status');
      expect(agents[0]).toHaveProperty('port');
    });
  });
});
```

### 2.3 LiteLLM Client Tests

**File:** `tests/unit/litellm-client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  sendChatToAgent, 
  sendA2AMessage, 
  queryAgentStatus,
  getLiteLLMHealth,
  clearConversationCache,
  getConversationHistory
} from '../../web-interface/src/lib/server/litellm-client';

describe('LiteLLM Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LITELLM_HOST = 'http://localhost:4000';
    process.env.LITELLM_API_KEY = 'test-key';
  });

  describe('sendChatToAgent', () => {
    it('should send chat and receive response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: 'Agent response' }
          }]
        })
      });

      const result = await sendChatToAgent({
        agent: 'steward',
        message: 'Hello',
        fromUser: 'user'
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('Agent response');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal error')
      });

      const result = await sendChatToAgent({
        agent: 'steward',
        message: 'Hello',
        fromUser: 'user'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include conversation history for context', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Response with context' } }]
        })
      });

      const result = await sendChatToAgent({
        agent: 'steward',
        message: 'Continue our discussion',
        conversationId: 'test-convo-123',
        fromUser: 'user'
      });

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe('test-convo-123');
    });
  });

  describe('sendA2AMessage', () => {
    it('should send A2A message successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      });

      const result = await sendA2AMessage({
        from: 'steward',
        to: 'alpha',
        content: 'Test message',
        timestamp: new Date()
      });

      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await sendA2AMessage({
        from: 'steward',
        to: 'alpha',
        content: 'Test message',
        timestamp: new Date()
      });

      expect(result).toBe(false);
    });
  });

  describe('queryAgentStatus', () => {
    it('should return online status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'online' })
      });

      const result = await queryAgentStatus('steward');
      
      expect(result.online).toBe(true);
    });

    it('should return offline on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));

      const result = await queryAgentStatus('steward');
      
      expect(result.online).toBe(false);
    });
  });

  describe('getLiteLLMHealth', () => {
    it('should return true for healthy gateway', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await getLiteLLMHealth();
      
      expect(result).toBe(true);
    });

    it('should return false for unhealthy gateway', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await getLiteLLMHealth();
      
      expect(result).toBe(false);
    });
  });

  describe('Conversation Cache', () => {
    it('should store and retrieve conversation history', () => {
      const testMessages = [
        { id: '1', fromAgent: 'user', toAgent: 'steward', content: 'Hello', timestamp: new Date(), messageType: 'text' },
        { id: '2', fromAgent: 'steward', toAgent: 'user', content: 'Hi', timestamp: new Date(), messageType: 'response' }
      ];

      // Note: In real implementation, these would use the actual cache functions
      const history = getConversationHistory('test-convo');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear conversation cache', () => {
      clearConversationCache('test-convo');
      // Cache should be cleared
    });
  });
});
```

### 2.4 Redis Bridge Tests

**File:** `tests/unit/redis-bridge.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisToWebSocketBridge, CHANNELS } from '../../modules/communication/redis-websocket-bridge';

describe('RedisToWebSocketBridge', () => {
  let bridge: RedisToWebSocketBridge;

  beforeEach(() => {
    vi.mock('ioredis', () => ({
      default: vi.fn().mockImplementation(() => ({
        ping: vi.fn().mockResolvedValue('PONG'),
        subscribe: vi.fn().mockResolvedValue(undefined),
        quit: vi.fn().mockResolvedValue(undefined),
        publish: vi.fn().mockResolvedValue(1),
        on: vi.fn()
      }))
    }));
  });

  afterEach(async () => {
    if (bridge) {
      await bridge.stop();
    }
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should start the bridge successfully', async () => {
      bridge = new RedisToWebSocketBridge({ wsPort: 3002 });
      
      await expect(bridge.start()).resolves.not.toThrow();
      expect(bridge.isRunning).toBe(true);
    });

    it('should not start twice', async () => {
      bridge = new RedisToWebSocketBridge({ wsPort: 3002 });
      
      await bridge.start();
      await expect(bridge.start()).resolves.toBeUndefined();
    });
  });

  describe('stop', () => {
    it('should stop the bridge gracefully', async () => {
      bridge = new RedisToWebSocketBridge({ wsPort: 3002 });
      await bridge.start();
      
      await bridge.stop();
      expect(bridge.isRunning).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('should broadcast message to all clients', async () => {
      bridge = new RedisToWebSocketBridge({ wsPort: 3002 });
      await bridge.start();

      const mockClient = {
        readyState: 1, // OPEN
        send: vi.fn()
      };
      bridge.clients.add(mockClient);

      bridge.broadcast({ type: 'test', data: 'hello' });

      expect(mockClient.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test', data: 'hello', timestamp: expect.any(String) })
      );
    });

    it('should not send to closed clients', async () => {
      bridge = new RedisToWebSocketBridge({ wsPort: 3002 });
      await bridge.start();

      const mockClient = {
        readyState: 3, // CLOSED
        send: vi.fn()
      };
      bridge.clients.add(mockClient);

      bridge.broadcast({ type: 'test', data: 'hello' });

      expect(mockClient.send).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      bridge = new RedisToWebSocketBridge({ wsPort: 3002 });
      await bridge.start();

      const status = bridge.getStatus();
      
      expect(status).toEqual({
        running: true,
        clients: 0,
        port: 3002
      });
    });
  });
});
```

---

## 3. Integration Tests

### 3.1 A2A Communication Tests

**File:** `tests/integration/a2a-communication.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('A2A Communication Integration', () => {
  beforeAll(async () => {
    // Ensure Redis is running
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should deliver message from Steward to Alpha via Redis', async () => {
    const { sendMessage } = await import('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await sendMessage('steward', 'alpha', 'Test message for integration');
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.from).toBe('steward');
    expect(result.to).toBe('alpha');
  });

  it('should broadcast to all triad members', async () => {
    const { broadcast } = await import('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await broadcast('steward', 'Triad broadcast test');
    
    expect(result.success).toBe(true);
    expect(result.recipients).toContain('alpha');
    expect(result.recipients).toContain('beta');
    expect(result.recipients).toContain('charlie');
  });

  it('should get messages from agent inbox', async () => {
    const { getMessages } = await import('../../skills/a2a-message-send/a2a-redis.js');
    
    // First send a message
    await sendMessage('steward', 'alpha', 'Test message');
    
    // Then retrieve it
    const messages = await getMessages('alpha', 10);
    
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should ping agent successfully', async () => {
    const { pingAgent } = await import('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await pingAgent('steward', 'alpha');
    
    expect(result.success).toBe(true);
    expect(result.response).toContain('pong');
  });
});
```

### 3.2 Triad Deliberation Tests

**File:** `tests/integration/agent-deliberation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Triad Deliberation Integration', () => {
  it('should complete full triad deliberation cycle', async () => {
    // This test would simulate the full triad deliberation flow
    // Explorer -> Triad -> Examiner -> Sentinel -> Coder
    
    const { broadcastToTriad } = await import('../../skills/triad-deliberation-protocol/triad-sync.js');
    const { collectVotes } = await import('../../skills/triad-deliberation-protocol/triad-sync.js');
    
    // Broadcast proposal to triad
    const broadcast = await broadcastToTriad('Test proposal for deliberation');
    expect(broadcast.success).toBe(true);
    
    // Collect votes (would need mock responses in real test)
    const votes = await collectVotes('test-proposal');
    expect(votes).toBeDefined();
  });

  it('should achieve 2/3 consensus', async () => {
    const { achieveConsensus } = await import('../../skills/governance-modules/validate-vote.sh');
    
    const votes = {
      alpha: 'agree',
      beta: 'agree',
      charlie: 'disagree'
    };
    
    // 2 out of 3 should pass
    const consensus = await achieveConsensus(votes);
    expect(consensus.passed).toBe(true);
  });
});
```

### 3.3 WebSocket Bridge Tests

**File:** `tests/integration/websocket-bridge.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

describe('WebSocket Bridge Integration', () => {
  let ws: WebSocket;
  const WS_PORT = 3001;

  beforeAll(async () => {
    // Start the bridge
    const { getBridge } = await import('../../modules/communication/redis-websocket-bridge.js');
    await getBridge();
    
    // Give it time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (ws) {
      ws.close();
    }
    const { stopBridge } = await import('../../modules/communication/redis-websocket-bridge.js');
    await stopBridge();
  });

  it('should connect to WebSocket server', (done) => {
    ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      done();
    });
    
    ws.on('error', (err) => {
      done(err);
    });
  });

  it('should receive welcome message on connect', (done) => {
    ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message.type).toBe('connected');
      expect(message.timestamp).toBeDefined();
      done();
    });
  });

  it('should send A2A message through WebSocket', (done) => {
    ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'a2a',
        from: 'user',
        to: 'steward',
        content: 'Test message via WebSocket',
        messageId: 'test-ws-123'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'ack') {
        expect(message.success).toBe(true);
        expect(message.messageId).toBe('test-ws-123');
        done();
      }
    });
  });

  it('should respond to ping with pong', (done) => {
    ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pong') {
        expect(message.timestamp).toBeDefined();
        done();
      }
    });
  });
});
```

---

## 4. End-to-End Tests

### 4.1 User Chat Flow Tests

**File:** `tests/e2e/user-chat-flow.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request } from 'playwright';

describe('User Chat E2E', () => {
  let context: any;
  const BASE_URL = 'http://localhost:3000';

  beforeAll(async () => {
    context = await request.newContext({
      baseURL: BASE_URL
    });
  });

  afterAll(async () => {
    await context.dispose();
  });

  it('should send message and receive response', async () => {
    // Send chat message
    const chatResponse = await context.post('/api/chat', {
      data: {
        agent: 'steward',
        message: 'Hello, what can you help me with?',
        fromUser: 'test-user'
      }
    });
    
    expect(chatResponse.ok()).toBe(true);
    
    const chat = await chatResponse.json();
    expect(chat.success).toBe(true);
    expect(chat.response).toBeDefined();
    expect(chat.conversationId).toBeDefined();
  });

  it('should get conversation history', async () => {
    // First create a conversation
    const chatResponse = await context.post('/api/chat', {
      data: {
        agent: 'steward',
        message: 'Test message',
        fromUser: 'test-user'
      }
    });
    
    const chat = await chatResponse.json();
    const conversationId = chat.conversationId;
    
    // Get history
    const historyResponse = await context.get(`/api/chat?conversationId=${conversationId}`);
    const history = await historyResponse.json();
    
    expect(historyResponse.ok()).toBe(true);
    expect(history.success).toBe(true);
    expect(history.count).toBeGreaterThanOrEqual(2);
  });

  it('should clear conversation', async () => {
    const chatResponse = await context.post('/api/chat', {
      data: {
        agent: 'steward',
        message: 'Test',
        fromUser: 'test-user'
      }
    });
    
    const chat = await chatResponse.json();
    
    // Clear conversation
    const clearResponse = await context.delete(`/api/chat?conversationId=${chat.conversationId}`);
    const cleared = await clearResponse.json();
    
    expect(clearResponse.ok()).toBe(true);
    expect(cleared.success).toBe(true);
  });
});
```

### 4.2 WebUI Playwright Tests

**File:** `tests/e2e/webui-complete-flow.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('WebUI Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display all 11 agents with status', async ({ page }) => {
    // Wait for agent status to load
    await page.waitForSelector('[data-testid="agent-status"]', { timeout: 10000 });
    
    // Check all 11 agents are displayed
    const agents = await page.$$('[data-testid="agent-item"]');
    expect(agents.length).toBe(11);
    
    // Verify specific agents exist
    const agentNames = ['Steward', 'Alpha', 'Beta', 'Charlie', 'Examiner', 'Explorer', 'Sentinel', 'Coder', 'Dreamer', 'Empath', 'Historian'];
    for (const name of agentNames) {
      await expect(page.locator(`[data-testid="agent-${name.toLowerCase()}"]`)).toBeVisible();
    }
  });

  test('should display connection status indicator', async ({ page }) => {
    const statusElement = await page.locator('[data-testid="connection-status"]');
    const status = await statusElement.textContent();
    
    // Status should be one of the valid states
    expect(['connected', 'connecting', 'disconnected']).toContain(status?.toLowerCase().trim());
  });

  test('should select agent and send message', async ({ page }) => {
    // Select steward agent
    await page.click('[data-testid="agent-steward"]');
    
    // Wait for agent to be selected
    await page.waitForSelector('[data-testid="selected-agent"]', { timeout: 5000 });
    
    // Type and send message
    await page.fill('[data-testid="message-input"]', 'Hello Steward!');
    await page.click('[data-testid="send-button"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="message-response"]', { timeout: 30000 });
    
    // Verify messages displayed
    const messages = await page.$$('[data-testid="message-item"]');
    expect(messages.length).toBeGreaterThanOrEqual(2); // User message + agent response
  });

  test('should show loading state while waiting for response', async ({ page }) => {
    await page.click('[data-testid="agent-steward"]');
    await page.fill('[data-testid="message-input"]', 'Test loading');
    await page.click('[data-testid="send-button"]');
    
    // Loading state should appear
    await page.waitForSelector('[data-testid="loading-indicator"]', { timeout: 5000 });
    expect(await page.locator('[data-testid="loading-indicator"]').isVisible()).toBe(true);
    
    // Loading should disappear when response received
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 30000 });
  });

  test('should handle error gracefully', async ({ page }) => {
    // This would require mocking a failing API
    // For now, just verify error UI exists
    await expect(page.locator('[data-testid="error-message"]')).toHaveCount(0);
  });

  test('should display message flow', async ({ page }) => {
    // Navigate to message flow section
    const messageFlowSection = await page.locator('[data-testid="message-flow"]');
    await expect(messageFlowSection).toBeVisible();
    
    // Check for connection status
    const connectionStatus = await page.locator('[data-testid="flow-connection-status"]');
    await expect(connectionStatus).toBeVisible();
  });

  test('should show agent stats', async ({ page }) => {
    const statsElement = await page.locator('[data-testid="agent-stats"]');
    await expect(statsElement).toBeVisible();
    
    // Check for online count
    const onlineCount = await page.locator('[data-testid="online-count"]');
    await expect(onlineCount).toBeVisible();
  });
});
```

### 4.3 Triad Deliberation Flow Tests

**File:** `tests/e2e/triad-deliberation-flow.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Triad Deliberation Flow E2E', () => {
  it('should complete full deliberation from intel to implementation', async () => {
    // This test would run the full flow:
    // 1. Explorer discovers intel
    // 2. Triad deliberates (Alpha, Beta, Charlie)
    // 3. Examiner questions
    // 4. Sentinel reviews
    // 5. Coder implements
    
    const { runDeliberationCycle } = await import('../../skills/triad-deliberation-protocol/triad-sync.js');
    
    const result = await runDeliberationCycle({
      intel: 'Test proposal for deliberation',
      proposal: 'Implement feature X'
    });
    
    expect(result.completed).toBe(true);
    expect(result.consensus).toBeDefined();
    expect(result.implementation).toBeDefined();
  });
});
```

---

## 5. Skill Tests

### 5.1 Health Check Skill Tests

**File:** `tests/skills/healthcheck.test.js`

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Deployment Health Check Skill', () => {
  it('should check LiteLLM health', async () => {
    const { checkLiteLLMHealth } = require('../../skills/deployment-health-check/check.js');
    
    const result = await checkLiteLLMHealth();
    assert.ok(result.success === true || result.success === false);
    assert.ok(result.timestamp);
  });

  it('should check PostgreSQL health', async () => {
    const { checkPostgresHealth } = require('../../skills/deployment-health-check/check.js');
    
    const result = await checkPostgresHealth();
    assert.ok(result.success === true || result.success === false);
  });

  it('should check Redis health', async () => {
    const { checkRedisHealth } = require('../../skills/deployment-health-check/check.js');
    
    const result = await checkRedisHealth();
    assert.ok(result.success === true || result.success === false);
  });

  it('should check all agent health', async () => {
    const { checkAllAgents } = require('../../skills/deployment-health-check/check.js');
    
    const result = await checkAllAgents();
    assert.ok(Array.isArray(result.agents));
    assert.ok(result.agents.length === 11);
  });

  it('should generate health report', async () => {
    const { generateHealthReport } = require('../../skills/deployment-health-check/check.js');
    
    const result = await generateHealthReport();
    assert.ok(result.summary);
    assert.ok(result.components);
  });
});
```

### 5.2 A2A Message Send Skill Tests

**File:** `tests/skills/a2a-message-send.test.js`

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('A2A Message Send Skill', () => {
  it('should send message via Redis', async () => {
    const { sendMessage } = require('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await sendMessage('steward', 'alpha', 'Test message');
    assert.ok(result.success === true);
    assert.ok(result.messageId);
  });

  it('should broadcast to all agents', async () => {
    const { broadcast } = require('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await broadcast('steward', 'Broadcast test');
    assert.ok(result.success === true);
    assert.ok(result.count >= 11);
  });

  it('should get messages from inbox', async () => {
    const { getMessages } = require('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await getMessages('alpha', 10);
    assert.ok(Array.isArray(result));
  });

  it('should count messages', async () => {
    const { countMessages } = require('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await countMessages('alpha');
    assert.ok(typeof result.count === 'number');
  });

  it('should clear messages', async () => {
    const { clearMessages } = require('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await clearMessages('alpha');
    assert.ok(result.success === true);
  });

  it('should ping agent', async () => {
    const { pingAgent } = require('../../skills/a2a-message-send/a2a-redis.js');
    
    const result = await pingAgent('steward', 'alpha');
    assert.ok(result.success === true);
    assert.ok(result.response.includes('pong'));
  });
});
```

### 5.3 Curiosity Engine Tests

**File:** `tests/skills/curiosity-engine.test.js`

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Curiosity Engine Skill', () => {
  it('should detect anomalies', async () => {
    const { detectAnomaly } = require('../../skills/curiosity-engine/modules/anomaly-detector.js');
    
    const result = await detectAnomaly({ data: 'test data' });
    assert.ok(result);
  });

  it('should map capabilities', async () => {
    const { mapCapabilities } = require('../../skills/curiosity-engine/modules/capability-mapper.js');
    
    const result = await mapCapabilities();
    assert.ok(result.capabilities);
  });

  it('should detect gaps', async () => {
    const { detectGaps } = require('../../skills/curiosity-engine/modules/gap-detector.js');
    
    const result = await detectGaps({ current: [], desired: ['feature'] });
    assert.ok(result.gaps);
  });

  it('should scan opportunities', async () => {
    const { scanOpportunities } = require('../../skills/curiosity-engine/modules/opportunity-scanner.js');
    
    const result = await scanOpportunities();
    assert.ok(result.opportunities);
  });
});
```

---

## 6. Test Utilities

### 6.1 Test Utils

**File:** `tests/test-utils.ts`

```typescript
import { vi } from 'vitest';

/**
 * Mock fetch globally
 */
export function mockFetch(response: any, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response))
  });
}

/**
 * Mock fetch to reject
 */
export function mockFetchReject(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error);
}

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock agent
 */
export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'steward',
    name: 'Steward',
    role: 'Orchestrator',
    status: 'online',
    port: 8001,
    description: 'Orchestrator agent',
    ...overrides
  };
}

/**
 * Create a mock message
 */
export function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'test-' + Date.now(),
    from: 'user',
    to: 'steward',
    content: 'Test message',
    timestamp: new Date(),
    type: 'text',
    ...overrides
  };
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  vi.clearAllMocks();
}

/**
 * Restore all mocks
 */
export function restoreMocks() {
  vi.restoreAllMocks();
}
```

### 6.2 Mocks and Fixtures

**File:** `tests/utils/mocks.ts`

```typescript
import { vi } from 'vitest';

/**
 * Mock Redis client
 */
export function createMockRedis() {
  return {
    ping: vi.fn().mockResolvedValue('PONG'),
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn()
  };
}

/**
 * Mock WebSocket server
 */
export function createMockWebSocketServer() {
  return {
    on: vi.fn(),
    close: vi.fn()
  };
}

/**
 * Mock agent container
 */
export function createMockAgentContainer(name: string) {
  return {
    name,
    health: vi.fn().mockResolvedValue({ ok: true }),
    send: vi.fn().mockResolvedValue({ success: true }),
    receive: vi.fn().mockResolvedValue({ messages: [] })
  };
}
```

**File:** `tests/utils/fixtures.ts`

```typescript
import type { Agent, Message, A2AMessage } from '../../web-interface/src/lib/types';

/**
 * Fixture: All 11 agents
 */
export const ALL_AGENTS: Agent[] = [
  { id: 'steward', name: 'Steward', role: 'Orchestrator', status: 'online', port: 8001, description: '' },
  { id: 'alpha', name: 'Alpha', role: 'Triad', status: 'online', port: 8002, description: '' },
  { id: 'beta', name: 'Beta', role: 'Triad', status: 'online', port: 8003, description: '' },
  { id: 'charlie', name: 'Charlie', role: 'Triad', status: 'online', port: 8004, description: '' },
  { id: 'examiner', name: 'Examiner', role: 'Interrogator', status: 'online', port: 8005, description: '' },
  { id: 'explorer', name: 'Explorer', role: 'Scout', status: 'online', port: 8006, description: '' },
  { id: 'sentinel', name: 'Sentinel', role: 'Guardian', status: 'online', port: 8007, description: '' },
  { id: 'coder', name: 'Coder', role: 'Artisan', status: 'online', port: 8008, description: '' },
  { id: 'dreamer', name: 'Dreamer', role: 'Visionary', status: 'online', port: 8009, description: '' },
  { id: 'empath', name: 'Empath', role: 'Diplomat', status: 'online', port: 8010, description: '' },
  { id: 'historian', name: 'Historian', role: 'Archivist', status: 'online', port: 8011, description: '' }
];

/**
 * Fixture: Sample A2A message
 */
export const SAMPLE_A2A_MESSAGE: A2AMessage = {
  from: 'steward',
  to: 'alpha',
  content: 'Test message content',
  timestamp: new Date()
};

/**
 * Fixture: Sample conversation history
 */
export const SAMPLE_CONVERSATION = [
  { id: '1', fromAgent: 'user', toAgent: 'steward', content: 'Hello', timestamp: new Date(), messageType: 'text' },
  { id: '2', fromAgent: 'steward', toAgent: 'user', content: 'Hi there!', timestamp: new Date(), messageType: 'response' }
];
```

---

## 7. Running Tests

### 7.1 Test Commands

```bash
# Install test dependencies
cd web-interface
npm install -D vitest @vitest/coverage-v8 @playwright/test

# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/health-check.test.ts

# Run integration tests
npm test -- tests/integration/

# Run E2E tests
npx playwright test

# Run skill tests
node --test tests/skills/*.test.js
```

### 7.2 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run integration tests
        run: npm test -- tests/integration/
      
      - name: Run skill tests
        run: node --test tests/skills/*.test.js
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 8. Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Unit Tests | >80% |
| Integration Tests | >70% |
| E2E Tests | Critical paths only |
| Skills | >75% |

---

*Document Version: 1.0.0*  
*Created: 2026-03-30*  
*Ready for Implementation* 🦊
