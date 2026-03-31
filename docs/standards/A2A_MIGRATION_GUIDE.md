# A2A Protocol Migration Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28

---

## Overview

This guide documents the migration from the legacy A2A communication system to the standardized A2A Protocol v1.0.0. The new specification introduces WebSocket RPC transport with standardized message formats, handshake procedures, and error handling.

---

## Summary of Changes

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **Transport** | HTTP endpoints via LiteLLM Gateway | WebSocket RPC via OpenClaw Gateway |
| **Endpoint** | `http://localhost:4000/v1/agents/{agent}/send` | `ws://127.0.0.1:18789` |
| **Subprotocol** | None | `a2a-v1` |
| **Message Format** | Simple JSON | Standardized A2A envelope |
| **Handshake** | None | Required capability advertisement |
| **Error Codes** | HTTP status codes | Numeric error codes (1xxx-5xxx) |
| **Session** | Redis hashes | JSONL files |

### Documents Updated

The following documents have been updated to align with A2A Protocol v1.0.0:

1. **[`docs/api/WEBSOCKET_API.md`](../api/WEBSOCKET_API.md)** - Complete rewrite for Gateway WebSocket RPC
2. **[`docs/architecture/A2A_ARCHITECTURE.md`](../architecture/A2A_ARCHITECTURE.md)** - Added handshake, discovery, error codes
3. **Agent TOOLS.md files** - Updated for all agents (steward, alpha, explorer, sentinel, historian)

---

## Breaking Changes

### 1. Transport Layer Change

**Breaking:** The transport layer has changed from HTTP to WebSocket.

**Before (HTTP):**
```javascript
// Deprecated: HTTP-based communication
const response = await fetch('http://localhost:4000/v1/agents/steward/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' })
});
```

**After (WebSocket):**
```javascript
// Current: WebSocket RPC communication
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'message',
    agent: 'steward',
    content: { role: 'user', content: 'Hello' }
  }));
});
```

### 2. Message Format Change

**Breaking:** Message envelope format now requires specific fields.

**Before:**
```json
{
  "message": "Hello",
  "agent": "steward"
}
```

**After:**
```json
{
  "type": "message",
  "agent": "steward",
  "content": {
    "role": "user",
    "content": "Hello"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "requiresResponse": true
  }
}
```

### 3. Handshake Requirement

**Breaking:** WebSocket connections now require a handshake procedure.

**Before:**
```javascript
// No handshake required
const ws = new WebSocket('ws://localhost:3003');
```

**After:**
```javascript
// Handshake required
const ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'handshake',
    content: {
      action: 'advertise',
      capabilities: {
        supportedMessageTypes: ['message', 'status', 'error'],
        version: '1.0.0'
      }
    }
  }));
});
```

### 4. Error Handling Change

**Breaking:** Error responses now use numeric error codes instead of HTTP status codes.

**Before:**
```json
{
  "status": 404,
  "error": "Agent not found"
}
```

**After:**
```json
{
  "type": "error",
  "content": {
    "error": "AGENT_NOT_FOUND",
    "message": "Agent not found: unknown-agent",
    "code": 3001
  }
}
```

### 5. Session Storage Change

**Breaking:** Sessions are now stored as JSONL files instead of Redis hashes.

**Before (Redis):**
```
Redis key: session:steward:123
Redis hash: { messages: [...], timestamp: ... }
```

**After (JSONL):**
```
File: ~/.openclaw/agents/steward/session.jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello", "sessionId": "sess-123"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi", "sessionId": "sess-123"}
```

---

## Migration Path

### Phase 1: Preparation

1. **Review the new specification:**
   - Read [`A2A_PROTOCOL.md`](./A2A_PROTOCOL.md) for complete protocol details
   - Review [`A2A_ARCHITECTURE.md`](../architecture/A2A_ARCHITECTURE.md) for architecture overview
   - Check [`WEBSOCKET_API.md`](../api/WEBSOCKET_API.md) for API reference

2. **Install required dependencies:**
   ```bash
   npm install ws
   ```

3. **Ensure Gateway is running:**
   ```bash
   openclaw gateway status
   ```

### Phase 2: Code Updates

#### Step 1: Update Connection Code

**Before:**
```javascript
const fetch = require('node-fetch');

async function sendMessage(agent, content) {
  const response = await fetch(`http://localhost:4000/v1/agents/${agent}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  return response.json();
}
```

**After:**
```javascript
const WebSocket = require('ws');

class A2AClient {
  constructor() {
    this.ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);
    this.messageHandlers = new Map();
  }

  async connect() {
    return new Promise((resolve) => {
      this.ws.on('open', () => {
        this.sendHandshake();
        resolve();
      });
    });
  }

  sendHandshake() {
    this.ws.send(JSON.stringify({
      type: 'handshake',
      content: {
        action: 'advertise',
        capabilities: {
          supportedMessageTypes: ['message', 'status', 'error'],
          version: '1.0.0'
        }
      }
    }));
  }

  sendMessage(agent, content, metadata = {}) {
    return new Promise((resolve) => {
      const correlationId = `corr-${Date.now()}`;
      
      const handler = (message) => {
        if (message.metadata?.correlationId === correlationId) {
          resolve(message);
        }
      };
      this.on('message', handler);

      this.ws.send(JSON.stringify({
        type: 'message',
        agent: agent,
        content: content,
        metadata: {
          ...metadata,
          requiresResponse: true,
          correlationId: correlationId
        }
      }));
    });
  }

  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }
}
```

#### Step 2: Update Message Format

**Before:**
```json
{
  "message": "Hello steward",
  "timestamp": 1711843200000
}
```

**After:**
```json
{
  "type": "message",
  "from": "client",
  "agent": "steward",
  "content": {
    "role": "user",
    "content": "Hello steward"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true
  }
}
```

#### Step 3: Update Error Handling

**Before:**
```javascript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
} catch (error) {
  console.error('Request failed:', error.message);
}
```

**After:**
```javascript
ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'error') {
    console.error(`Error ${message.content.code}: ${message.content.message}`);
    
    switch (message.content.code) {
      case 3001:
        // Agent not found
        break;
      case 3002:
        // Agent offline
        break;
      case 2001:
        // Invalid JSON
        break;
    }
  }
});
```

### Phase 3: Testing

1. **Test WebSocket connection:**
   ```bash
   wscat -c ws://127.0.0.1:18789
   ```

2. **Test handshake:**
   ```json
   {"type": "handshake", "content": {"action": "advertise"}}
   ```

3. **Test message sending:**
   ```json
   {"type": "message", "agent": "steward", "content": {"role": "user", "content": "test"}}
   ```

4. **Test error handling:**
   ```json
   {"type": "message", "agent": "nonexistent-agent", "content": {"role": "user", "content": "test"}}
   ```

### Phase 4: Deployment

1. **Update agent configurations:**
   - Update all TOOLS.md files with new endpoint
   - Update any hardcoded URLs in agent code

2. **Update monitoring:**
   - Update health checks to use WebSocket endpoint
   - Update alerting for new error codes

3. **Roll out gradually:**
   - Test with non-critical agents first
   - Monitor for errors during transition

---

## Migration Checklist

### Infrastructure

- [ ] OpenClaw Gateway installed and running on port 18789
- [ ] WebSocket subprotocol `a2a-v1` configured
- [ ] Agent workspaces created at `~/.openclaw/agents/`
- [ ] Session storage directories writable

### Code Changes

- [ ] WebSocket client library installed (`ws`)
- [ ] Connection code updated to use WebSocket
- [ ] Handshake procedure implemented
- [ ] Message format updated to A2A envelope
- [ ] Error handling updated for numeric codes
- [ ] Session storage updated to JSONL

### Agent Updates

- [ ] Steward TOOLS.md updated
- [ ] Alpha TOOLS.md updated
- [ ] Beta TOOLS.md updated
- [ ] Charlie TOOLS.md updated
- [ ] Examiner TOOLS.md updated
- [ ] Explorer TOOLS.md updated
- [ ] Sentinel TOOLS.md updated
- [ ] Coder TOOLS.md updated
- [ ] Dreamer TOOLS.md updated
- [ ] Empath TOOLS.md updated
- [ ] Historian TOOLS.md updated

### Testing

- [ ] WebSocket connection tested
- [ ] Handshake procedure verified
- [ ] All message types tested
- [ ] Error handling verified
- [ ] Session persistence verified

### Documentation

- [ ] API documentation updated
- [ ] Architecture diagrams updated
- [ ] Runbooks updated
- [ ] Training materials updated

---

## Rollback Procedure

If migration issues occur, rollback to the legacy system:

1. **Stop Gateway:**
   ```bash
   openclaw gateway stop
   ```

2. **Restore legacy containers:**
   ```bash
   docker compose up -d steward alpha beta charlie ...
   ```

3. **Revert code changes:**
   ```bash
   git checkout <previous-commit>
   ```

4. **Restore Redis sessions:**
   ```bash
   # If sessions were backed up
   redis-cli --restore < backup.rdb
   ```

---

## Support

For migration issues:

1. Check the [A2A Protocol Specification](./A2A_PROTOCOL.md)
2. Review the [A2A Architecture](../architecture/A2A_ARCHITECTURE.md)
3. Consult the [WebSocket API Reference](../api/WEBSOCKET_API.md)
4. Open an issue on the Heretek OpenClaw repository

---

## Appendix: Error Code Reference

### Connection Errors (1xxx)

| Code | Error | Migration Action |
|------|-------|------------------|
| 1001 | `CONNECTION_REFUSED` | Check Gateway is running |
| 1002 | `CONNECTION_TIMEOUT` | Increase timeout or check network |
| 1004 | `PROTOCOL_ERROR` | Verify WebSocket subprotocol |

### Message Errors (2xxx)

| Code | Error | Migration Action |
|------|-------|------------------|
| 2001 | `INVALID_JSON` | Validate JSON before sending |
| 2002 | `MISSING_FIELD` | Check required fields (type, content) |
| 2004 | `UNKNOWN_TYPE` | Use valid message type from registry |

### Agent Errors (3xxx)

| Code | Error | Migration Action |
|------|-------|------------------|
| 3001 | `AGENT_NOT_FOUND` | Verify agent name in registry |
| 3002 | `AGENT_OFFLINE` | Check agent workspace status |

### Session Errors (4xxx)

| Code | Error | Migration Action |
|------|-------|------------------|
| 4001 | `SESSION_NOT_FOUND` | Create session before use |
| 4004 | `SESSION_CORRUPT` | Restore from backup |

### Authentication Errors (5xxx)

| Code | Error | Migration Action |
|------|-------|------------------|
| 5001 | `AUTH_REQUIRED` | Provide authentication token |
| 5002 | `AUTH_FAILED` | Verify token validity |

---

🦞 *The thought that never ends.*
