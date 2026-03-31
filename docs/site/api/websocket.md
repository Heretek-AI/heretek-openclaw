# WebSocket RPC API Reference

**Version:** 2.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Connection](#connection)
3. [Message Format](#message-format)
4. [Message Types](#message-types)
5. [Handshake](#handshake)
6. [Discovery](#discovery)
7. [Error Handling](#error-handling)
8. [Client Example](#client-example)
9. [Related Documents](#related-documents)

---

## Overview

The WebSocket RPC API provides real-time bidirectional communication between agents and the OpenClaw Gateway. This is the primary transport layer for the A2A (Agent-to-Agent) Protocol.

**Endpoint:** `ws://127.0.0.1:18789`

---

## Connection

### Connection Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `protocol` | string | No | `a2a-v1` | WebSocket subprotocol identifier |
| `timeout` | number | No | `30000` | Connection timeout (ms) |
| `heartbeat` | number | No | `30000` | Heartbeat interval (ms) |

### Connection States

| State | Code | Description |
|-------|------|-------------|
| `CONNECTING` | 0 | Connection initiated |
| `OPEN` | 1 | Connection established |
| `CLOSING` | 2 | Connection closing |
| `CLOSED` | 3 | Connection closed |

### WebSocket Subprotocol

Clients SHOULD specify the subprotocol during handshake:

```javascript
const ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);
```

---

## Message Format

### Envelope Structure

```typescript
interface A2AMessage {
  // Required fields
  type: MessageType;           // Message type
  content: MessageContent;     // Message payload
  
  // Optional fields
  id?: string;                 // Unique message identifier (UUID)
  agent?: string;              // Target agent name
  from?: string;               // Source agent name
  sessionId?: string;          // Session identifier
  timestamp?: number;          // Unix timestamp (milliseconds)
  metadata?: MessageMetadata;  // Additional metadata
}
```

### Message Content

```typescript
interface MessageContent {
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string | object;
}
```

### Message Metadata

```typescript
interface MessageMetadata {
  priority?: 'low' | 'normal' | 'high' | 'critical';
  requiresResponse?: boolean;
  threadId?: string;
  parentId?: string;
  ttl?: number;              // Time-to-live in seconds
  correlationId?: string;    // For request/response correlation
}
```

### Example Message

```json
{
  "id": "msg-550e8400-e29b-41d4-a716-446655440000",
  "type": "message",
  "from": "steward",
  "agent": "alpha",
  "sessionId": "sess-12345",
  "content": {
    "role": "agent",
    "content": "Proposal received: Implement feature X"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true,
    "threadId": "thread-abc",
    "correlationId": "corr-xyz"
  }
}
```

---

## Message Types

### Core Message Types

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x01 | `message` | Standard agent message | `content`, `agent` |
| 0x02 | `status` | Agent status update | `content` |
| 0x03 | `error` | Error notification | `content`, `error` |
| 0x04 | `event` | Gateway event | `content`, `event` |

### Control Message Types

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x10 | `handshake` | Connection handshake | `content.action` |
| 0x11 | `discovery` | Agent/service discovery | `content.action` |
| 0x12 | `subscribe` | Channel subscription | `content.channel` |
| 0x13 | `unsubscribe` | Channel unsubscription | `content.channel` |
| 0x14 | `ping` | Keep-alive ping | - |
| 0x15 | `pong` | Keep-alive response | - |

### Application Message Types

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x30 | `proposal` | Triad proposal | `content.proposal` |
| 0x31 | `decision` | Triad decision | `content.result` |
| 0x32 | `vote` | Triad vote | `content.vote` |
| 0x33 | `request` | Service request | `content.service` |
| 0x34 | `response` | Service response | `content.result` |
| 0x35 | `broadcast` | Multi-agent broadcast | `content.message` |

---

## Handshake

### Connection Establishment

1. Client initiates WebSocket connection
2. Gateway accepts and assigns client ID
3. Client sends capability advertisement (optional)
4. Gateway acknowledges

### Capability Advertisement

```json
{
  "type": "handshake",
  "content": {
    "action": "advertise",
    "capabilities": {
      "supportedMessageTypes": ["message", "status", "error"],
      "supportedAgents": ["steward", "alpha", "beta"],
      "version": "1.0.0"
    }
  }
}
```

### Gateway Response

```json
{
  "type": "handshake",
  "content": {
    "action": "acknowledge",
    "clientId": "client-uuid",
    "availableAgents": ["steward", "alpha", "beta", "charlie"],
    "protocolVersion": "1.0.0"
  }
}
```

---

## Discovery

### Agent Discovery

**Request:**
```json
{
  "type": "discovery",
  "content": {
    "action": "list"
  }
}
```

**Response:**
```json
{
  "type": "discovery",
  "content": {
    "agents": [
      {
        "name": "steward",
        "role": "orchestrator",
        "status": "online",
        "workspace": "~/.openclaw/agents/steward"
      },
      {
        "name": "alpha",
        "role": "triad-member",
        "status": "online",
        "workspace": "~/.openclaw/agents/alpha"
      }
    ]
  }
}
```

### Agent Status Subscription

```json
{
  "type": "subscribe",
  "content": {
    "channel": "agent:status",
    "agents": ["steward", "alpha"]
  }
}
```

---

## Error Handling

### Error Message Format

```json
{
  "type": "error",
  "from": "gateway",
  "content": {
    "error": "AGENT_NOT_FOUND",
    "message": "Agent not found: unknown-agent",
    "code": 3001
  },
  "timestamp": 1711843200000
}
```

### Error Code Registry

#### Connection Errors (1xxx)

| Code | Error | Description |
|------|-------|-------------|
| 1001 | `CONNECTION_REFUSED` | Gateway rejected connection |
| 1002 | `CONNECTION_TIMEOUT` | Connection timed out |
| 1003 | `CONNECTION_RESET` | Connection was reset |
| 1004 | `PROTOCOL_ERROR` | Protocol violation detected |

#### Message Errors (2xxx)

| Code | Error | Description |
|------|-------|-------------|
| 2001 | `INVALID_JSON` | Message is not valid JSON |
| 2002 | `MISSING_FIELD` | Required field is missing |
| 2003 | `INVALID_TYPE` | Field has invalid type |
| 2004 | `UNKNOWN_TYPE` | Unknown message type |
| 2005 | `INVALID_CONTENT` | Message content is invalid |

#### Agent Errors (3xxx)

| Code | Error | Description |
|------|-------|-------------|
| 3001 | `AGENT_NOT_FOUND` | Target agent does not exist |
| 3002 | `AGENT_OFFLINE` | Target agent is offline |
| 3003 | `AGENT_BUSY` | Agent is busy processing |
| 3004 | `AGENT_ERROR` | Agent encountered an error |

#### Session Errors (4xxx)

| Code | Error | Description |
|------|-------|-------------|
| 4001 | `SESSION_NOT_FOUND` | Session does not exist |
| 4002 | `SESSION_EXPIRED` | Session has expired |
| 4003 | `SESSION_LOCKED` | Session is locked by another process |
| 4004 | `SESSION_CORRUPT` | Session data is corrupted |

---

## Client Example

```javascript
const WebSocket = require('ws');

class A2AClient {
  constructor(gatewayUrl = 'ws://127.0.0.1:18789') {
    this.gatewayUrl = gatewayUrl;
    this.ws = null;
    this.messageHandlers = new Map();
    this.clientId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.gatewayUrl, ['a2a-v1']);
      
      this.ws.on('open', () => {
        console.log('Connected to Gateway');
        this.sendHandshake().then(resolve).catch(reject);
      });
      
      this.ws.on('error', reject);
      this.ws.on('message', (data) => this.handleMessage(JSON.parse(data)));
    });
  }

  async sendHandshake() {
    return new Promise((resolve) => {
      const handler = (message) => {
        if (message.type === 'handshake' && message.content.action === 'acknowledge') {
          this.clientId = message.content.clientId;
          this.off('handshake', handler);
          resolve(message);
        }
      };
      this.on('handshake', handler);
      
      this.send({
        type: 'handshake',
        content: {
          action: 'advertise',
          capabilities: {
            supportedMessageTypes: ['message', 'status', 'error'],
            version: '1.0.0'
          }
        }
      });
    });
  }

  async sendMessage(agent, content, metadata = {}) {
    return new Promise((resolve) => {
      const correlationId = `corr-${Date.now()}`;
      
      const handler = (message) => {
        if (message.metadata?.correlationId === correlationId) {
          this.off('message', handler);
          resolve(message);
        }
      };
      this.on('message', handler);
      
      this.send({
        type: 'message',
        agent: agent,
        content: content,
        metadata: {
          ...metadata,
          requiresResponse: true,
          correlationId: correlationId
        }
      });
    });
  }

  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  handleMessage(message) {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  disconnect() {
    if (this.ws) {
      this.send({
        type: 'disconnect',
        content: { reason: 'manual' }
      });
      this.ws.close();
    }
  }
}

// Usage example
async function main() {
  const client = new A2AClient();
  await client.connect();
  
  const response = await client.sendMessage('steward', {
    role: 'user',
    content: 'What is the current status of the collective?'
  });
  
  console.log('Response:', response);
  client.disconnect();
}

main().catch(console.error);
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [API Overview](./overview.md) | API reference overview |
| [LiteLLM API](./litellm.md) | LiteLLM Gateway reference |
| [A2A Protocol](../architecture/a2a-protocol.md) | A2A communication protocol |

---

🦞 *The thought that never ends.*
