# A2A Communication Protocol

**Version:** 1.0.0  
**Status:** Standard  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28

---

## Table of Contents

1. [Introduction](#introduction)
2. [Protocol Overview](#protocol-overview)
3. [Transport Layer](#transport-layer)
4. [Message Format](#message-format)
5. [Handshake Procedures](#handshake-procedures)
6. [Discovery Mechanisms](#discovery-mechanisms)
7. [Session Management](#session-management)
8. [Message Types](#message-types)
9. [Error Handling](#error-handling)
10. [Reference Implementation](#reference-implementation)
11. [Related Documents](#related-documents)

---

## Introduction

### Purpose

This document specifies the Agent-to-Agent (A2A) Protocol used in Heretek OpenClaw for inter-agent communication. The protocol enables real-time, decoupled message passing between specialized AI agents within a unified runtime environment.

### Scope

The A2A Protocol defines:
- Message envelope formats and encoding
- Transport layer specifications (WebSocket RPC)
- Handshake and connection procedures
- Agent discovery mechanisms
- Session management protocols
- Standard message types and semantics
- Error handling and recovery procedures

### Terminology

| Term | Definition |
|------|------------|
| **A2A** | Agent-to-Agent communication |
| **Gateway** | OpenClaw Gateway - central message broker and runtime |
| **Agent** | An autonomous AI entity within the OpenClaw system |
| **Workspace** | Isolated environment for agent execution and session storage |
| **Session** | A persistent conversation context between agents |
| **Triad** | A consensus group of three agents (Alpha, Beta, Charlie) |
| **JSONL** | JSON Lines - newline-delimited JSON format |

---

## Protocol Overview

### Architecture

The A2A Protocol follows a hub-and-spoke architecture with OpenClaw Gateway as the central broker:

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         OpenClaw Gateway                │
│         (Port 18789)                    │
└──────┬──────────────────────────────────┘
       │
       ├─────────┬─────────┬──────────┐
       ▼         ▼         ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│ Steward  │ │ Alpha  │ │ Beta   │ │ Charlie  │
└──────────┘ └────────┘ └────────┘ └──────────┘
```

### Design Principles

1. **Unified Runtime** - All agents operate within a single Gateway process
2. **Session Isolation** - Per-workspace JSONL session storage
3. **Real-time Communication** - WebSocket-based bidirectional messaging
4. **Decoupled Architecture** - Agents communicate through the Gateway, not directly
5. **Extensibility** - Plugin system for extended functionality

### Protocol Layers

| Layer | Responsibility |
|-------|----------------|
| **Transport** | WebSocket connection management |
| **Message** | Envelope formatting and encoding |
| **Session** | Conversation context and persistence |
| **Application** | Agent-specific message semantics |

---

## Transport Layer

### Connection Endpoint

The Gateway WebSocket endpoint:

```
ws://127.0.0.1:18789
```

### Connection Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `protocol` | string | No | `a2a-v1` | Subprotocol identifier |
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

All A2A messages follow a standardized envelope format:

```typescript
interface A2AMessage {
  // Required fields
  type: MessageType;           // Message type (Section 9)
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

## Handshake Procedures

### Connection Establishment

1. Client initiates WebSocket connection to Gateway
2. Gateway accepts connection and assigns client ID
3. Client optionally sends capability advertisement
4. Gateway acknowledges and connection is ready

### Capability Advertisement (Optional)

After connection, clients MAY advertise capabilities:

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

Gateway responds with acknowledgment:

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

### Authentication (Optional)

For secured deployments, authentication MAY be required:

```json
{
  "type": "auth",
  "content": {
    "token": "<JWT-or-API-key>"
  }
}
```

---

## Discovery Mechanisms

### Agent Discovery

Agents are discovered through the Gateway registry:

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

Clients MAY subscribe to agent status updates:

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

## Session Management

### Session Storage

Sessions are stored as JSONL files:

```
~/.openclaw/agents/{agent-name}/session.jsonl
```

### Session Entry Format

```jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello!", "sessionId": "sess-123", "id": "msg-001"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi there!", "sessionId": "sess-123", "id": "msg-002"}
```

### Session Lifecycle

| Operation | Command | Description |
|-----------|---------|-------------|
| Create | `openclaw session create {agent}` | Initialize new session |
| List | `openclaw session list` | List active sessions |
| Get | `openclaw session get {agent} {sessionId}` | Retrieve session data |
| Commit | `openclaw session commit {agent} {sessionId}` | Persist session |
| Archive | `openclaw session archive {agent} --older-than 7d` | Archive old sessions |
| Delete | `openclaw session delete {agent} {sessionId}` | Remove session |

---

## Message Types

### Core Message Types (0x00-0x0F)

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x01 | `message` | Standard agent message | `content`, `agent` |
| 0x02 | `status` | Agent status update | `content` |
| 0x03 | `error` | Error notification | `content`, `error` |
| 0x04 | `event` | Gateway event | `content`, `event` |

### Control Message Types (0x10-0x1F)

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x10 | `handshake` | Connection handshake | `content.action` |
| 0x11 | `discovery` | Agent/service discovery | `content.action` |
| 0x12 | `subscribe` | Channel subscription | `content.channel` |
| 0x13 | `unsubscribe` | Channel unsubscription | `content.channel` |
| 0x14 | `ping` | Keep-alive ping | - |
| 0x15 | `pong` | Keep-alive response | - |

### Application Message Types (0x30-0x4F)

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x30 | `proposal` | Triad proposal | `content.proposal` |
| 0x31 | `decision` | Triad decision | `content.result` |
| 0x32 | `vote` | Triad vote | `content.vote` |
| 0x33 | `request` | Service request | `content.service` |
| 0x34 | `response` | Service response | `content.result` |
| 0x35 | `broadcast` | Multi-agent broadcast | `content.message` |

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

#### Agent Errors (3xxx)

| Code | Error | Description |
|------|-------|-------------|
| 3001 | `AGENT_NOT_FOUND` | Target agent does not exist |
| 3002 | `AGENT_OFFLINE` | Target agent is offline |
| 3003 | `AGENT_BUSY` | Agent is busy processing |
| 3004 | `AGENT_ERROR` | Agent encountered an error |

---

## Reference Implementation

### Client Connection Example

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
| [System Architecture](./overview.md) | Overall system architecture |
| [Agents Documentation](./agents.md) | Agent collective details |
| [Triad Protocol](./triad.md) | Triad deliberation protocol |
| [WebSocket API](../api/websocket.md) | WebSocket API reference |

---

🦞 *The thought that never ends.*
