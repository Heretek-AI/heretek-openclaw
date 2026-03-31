# Agent-to-Agent (A2A) Architecture

**Version:** 3.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28

This document describes the Agent-to-Agent (A2A) communication architecture in Heretek OpenClaw using OpenClaw Gateway.

---

## Overview

Heretek OpenClaw uses **OpenClaw Gateway WebSocket RPC** as the primary communication mechanism between 12 specialized agents (main + 11 collective). This architecture enables real-time, decoupled message passing with automatic session persistence.

### Current Architecture (Gateway-Based)

| Component | Technology | Status |
|-----------|------------|--------|
| **A2A Protocol** | Gateway WebSocket RPC | ✅ Current |
| **Gateway Port** | 18789 | ✅ Active |
| **WebSocket Subprotocol** | `a2a-v1` | ✅ Active |
| **Session Storage** | JSONL files per workspace | ✅ Active |
| **Agent Workspaces** | `~/.openclaw/agents/` | ✅ Active |

### Legacy Architecture (Deprecated)

| Component | Technology | Status |
|-----------|------------|--------|
| **A2A Protocol** | Redis Pub/Sub | ⛔ Deprecated |
| **Agent Ports** | 8001-8011 | ⛔ Stopped |
| **Session Storage** | Redis hashes | ⛔ Deprecated |

---

## Architectural Decision

### Gateway WebSocket RPC (Current)

**OpenClaw Gateway WebSocket RPC was chosen for A2A communication because:**

1. **Unified Runtime** - All agents run within a single Gateway process
2. **Simplified Deployment** - No need for 11 separate containers
3. **Native Protocol** - Built-in WebSocket RPC for agent communication
4. **Session Isolation** - Per-workspace JSONL session storage
5. **Plugin Integration** - Native plugin system for extended functionality
6. **Reduced Overhead** - Single Node.js runtime instead of 11

### Redis Pub/Sub (Legacy - Deprecated)

**Redis Pub/Sub was the original A2A mechanism but is now deprecated:**

- Required 11 separate Docker containers (ports 8001-8011)
- Complex orchestration with docker-compose
- High resource overhead (11x Node.js runtimes)
- Redis used for both A2A and session storage

**Migration Note:** Redis is still used for **caching only**, not A2A communication.

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

### Connection Example

```javascript
const WebSocket = require('ws');

// Connect to Gateway
const ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);

ws.on('open', () => {
  console.log('Connected to Gateway');
  
  // Send handshake
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

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
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
      "supportedMessageTypes": ["message", "status", "error", "proposal", "vote", "decision"],
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

### Connection Termination

Either party MAY terminate the connection:

```json
{
  "type": "disconnect",
  "content": {
    "reason": "shutdown" | "timeout" | "error" | "manual",
    "message": "Optional explanation"
  }
}
```

---

## Message Envelope Format

### Gateway Message Structure

```typescript
interface A2AMessage {
  // Required fields
  type: MessageType;           // Message type (see Message Types section)
  content: MessageContent;     // Message payload
  
  // Optional fields
  id?: string;                 // Unique message identifier (UUID)
  agent?: string;              // Target agent name
  from?: string;               // Source agent name
  sessionId?: string;          // Session identifier
  timestamp?: number;          // Unix timestamp (ms)
  metadata?: MessageMetadata;  // Additional metadata
}

interface MessageContent {
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string | object;
}

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

### Message Validation

Messages MUST be valid UTF-8 encoded JSON. Invalid messages SHOULD be rejected with an error response.

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

### Authentication Message Types (0x20-0x2F)

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x20 | `auth` | Authentication request | `content.token` |
| 0x21 | `auth-response` | Authentication response | `content.status` |
| 0x22 | `disconnect` | Connection termination | `content.reason` |

### Application Message Types (0x30-0x4F)

| Code | Type | Description | Required Fields |
|------|------|-------------|-----------------|
| 0x30 | `proposal` | Triad proposal | `content.proposal` |
| 0x31 | `decision` | Triad decision | `content.result` |
| 0x32 | `vote` | Triad vote | `content.vote` |
| 0x33 | `request` | Service request | `content.service` |
| 0x34 | `response` | Service response | `content.result` |
| 0x35 | `broadcast` | Multi-agent broadcast | `content.message` |

For complete message type registry, see [`../standards/A2A_PROTOCOL.md`](../standards/A2A_PROTOCOL.md#appendix-a-message-type-registry).

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

### Workspace Discovery

Workspaces can be discovered and queried:

```json
{
  "type": "workspace",
  "content": {
    "action": "list"
  }
}
```

---

## Triad Deliberation Protocol

The Alpha, Beta, and Charlie agents form a triad for consensus-based decision making:

### Message Flow

```
1. Proposal received via Gateway WebSocket RPC
2. Gateway routes to triad members (alpha, beta, charlie)
3. Each triad member analyzes and votes
4. Votes sent back via Gateway WebSocket RPC
5. 2/3 consensus triggers decision
6. Decision sent to requesting agent
7. Other agents can be notified via Gateway broadcast
```

### Triad Architecture Diagram

```
┌──────────────┐     ┌─────────────────────────────────────────┐     ┌──────────────┐
│   Client     │────>│         OpenClaw Gateway                │────>│   Steward    │
│              │     │         (Port 18789)                    │     │              │
└──────────────┘     └─────────────────────────────────────────┘     └──────────────┘
                            │              │              │
                            │              │              │
                            ▼              ▼              ▼
                     ┌────────────┐ ┌────────────┐ ┌────────────┐
                     │   Alpha    │ │    Beta    │ │  Charlie   │
                     │  (Vote)    │ │  (Vote)    │ │  (Vote)    │
                     └────────────┘ └────────────┘ └────────────┘
```

### Proposal Message

```json
{
  "type": "proposal",
  "from": "steward",
  "content": {
    "proposal": "Implement new feature X",
    "reasoning": "User request analysis indicates need",
    "deadline": 1711843200000
  },
  "metadata": {
    "requiresResponse": true,
    "correlationId": "prop-001"
  }
}
```

### Vote Message

```json
{
  "type": "vote",
  "from": "alpha",
  "content": {
    "proposalId": "prop-001",
    "vote": "approve" | "reject" | "abstain",
    "reasoning": "Feature aligns with roadmap"
  },
  "metadata": {
    "correlationId": "prop-001"
  }
}
```

### Decision Message

```json
{
  "type": "decision",
  "from": "gateway",
  "content": {
    "proposalId": "prop-001",
    "result": "approved" | "rejected",
    "votes": {
      "alpha": "approve",
      "beta": "approve",
      "charlie": "abstain"
    },
    "consensus": true
  }
}
```

### Consensus Rules

| Votes | Result |
|-------|--------|
| 3-0 | Approved |
| 2-1 | Approved |
| 2-0-1 | Approved |
| 1-2 | Rejected |
| 0-3 | Rejected |
| 1-1-1 | Rejected (no consensus) |

---

## Session Management

### JSONL Session Storage

Sessions are stored as JSONL files in each agent workspace:

```
~/.openclaw/agents/steward/session.jsonl
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

### Session Persistence

Sessions are automatically persisted on:
- Message receipt
- Session commit command
- Agent shutdown (graceful)

### Session Isolation

Each workspace maintains isolated sessions. Cross-workspace session sharing requires explicit export/import.

---

## Agent Registry

### Available Agents

| Agent | Role | Workspace Path | Status |
|-------|------|----------------|--------|
| `main` | Default agent | `~/.openclaw/agents/main` | Active |
| `steward` | Orchestrator | `~/.openclaw/agents/steward` | Active |
| `alpha` | Triad member | `~/.openclaw/agents/alpha` | Active |
| `beta` | Triad member | `~/.openclaw/agents/beta` | Active |
| `charlie` | Triad member | `~/.openclaw/agents/charlie` | Active |
| `examiner` | Evaluator | `~/.openclaw/agents/examiner` | Active |
| `explorer` | Researcher | `~/.openclaw/agents/explorer` | Active |
| `sentinel` | Safety | `~/.openclaw/agents/sentinel` | Active |
| `coder` | Developer | `~/.openclaw/agents/coder` | Active |
| `dreamer` | Creative | `~/.openclaw/agents/dreamer` | Active |
| `empath` | Emotional | `~/.openclaw/agents/empath` | Active |
| `historian` | Historical | `~/.openclaw/agents/historian` | Active |

### Agent Status States

| Status | Description |
|--------|-------------|
| `online` | Agent is running and accepting messages |
| `offline` | Agent is not running |
| `busy` | Agent is processing a task |
| `idle` | Agent is available but not processing |
| `error` | Agent encountered an error |

### Agent Commands

```bash
# List all agents
openclaw agent list

# Get agent status
openclaw agent status {agent-name}

# Get agent configuration
openclaw agent config {agent-name} get

# Restart agent
openclaw agent restart {agent-name}
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

#### Authentication Errors (5xxx)

| Code | Error | Description |
|------|-------|-------------|
| 5001 | `AUTH_REQUIRED` | Authentication required |
| 5002 | `AUTH_FAILED` | Authentication failed |
| 5003 | `TOKEN_EXPIRED` | Authentication token expired |
| 5004 | `PERMISSION_DENIED` | Insufficient permissions |

For complete error code registry, see [`../standards/A2A_PROTOCOL.md`](../standards/A2A_PROTOCOL.md#appendix-b-error-codes).

---

## Model Routing

### LiteLLM Integration

The Gateway integrates with LiteLLM Gateway (port 4000) for model routing:

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  OpenClaw        │      │  LiteLLM         │      │  Model           │
│  Gateway         │─────>│  Gateway         │─────>│  Providers       │
│  (18789)         │      │  (4000)          │      │  (MiniMax, z.ai) │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### Passthrough Endpoints

| Endpoint | Backend Model | Agent |
|----------|---------------|-------|
| `/agent/steward` | `minimax/MiniMax-M2.7` | steward |
| `/agent/alpha` | `minimax/MiniMax-M2.7` | alpha |
| `/agent/beta` | `minimax/MiniMax-M2.7` | beta |
| `/agent/charlie` | `minimax/MiniMax-M2.7` | charlie |
| `/agent/examiner` | `minimax/MiniMax-M2.7` | examiner |
| `/agent/explorer` | `minimax/MiniMax-M2.7` | explorer |
| `/agent/sentinel` | `minimax/MiniMax-M2.7` | sentinel |
| `/agent/coder` | `minimax/MiniMax-M2.7` | coder |
| `/agent/dreamer` | `minimax/MiniMax-M2.7` | dreamer |
| `/agent/empath` | `minimax/MiniMax-M2.7` | empath |
| `/agent/historian` | `minimax/MiniMax-M2.7` | historian |

---

## Redis Pub/Sub (Legacy Reference)

**This section is for historical reference only. Redis Pub/Sub is deprecated for A2A communication.**

### Legacy Channel Registry

#### Shared Channels (Deprecated)

| Channel | Purpose | Status |
|---------|---------|--------|
| `agent:a2a` | General A2A communication | ⛔ Deprecated |
| `agent:status` | Status broadcasting | ⛔ Deprecated |
| `agent:message` | Chat messages | ⛔ Deprecated |
| `agent:activity` | Activity tracking | ⛔ Deprecated |

#### Per-Agent Inbox Channels (Deprecated)

| Channel | Agent | Status |
|---------|-------|--------|
| `agent:steward:inbox` | steward | ⛔ Deprecated |
| `agent:alpha:inbox` | alpha | ⛔ Deprecated |
| `agent:beta:inbox` | beta | ⛔ Deprecated |
| `agent:charlie:inbox` | charlie | ⛔ Deprecated |
| `agent:examiner:inbox` | examiner | ⛔ Deprecated |
| `agent:explorer:inbox` | explorer | ⛔ Deprecated |
| `agent:sentinel:inbox` | sentinel | ⛔ Deprecated |
| `agent:coder:inbox` | coder | ⛔ Deprecated |
| `agent:dreamer:inbox` | dreamer | ⛔ Deprecated |
| `agent:empath:inbox` | empath | ⛔ Deprecated |
| `agent:historian:inbox` | historian | ⛔ Deprecated |

### Legacy Message Format

```typescript
// Legacy Redis Pub/Sub message format (deprecated)
interface LegacyA2AMessage {
  id: string;           // UUID
  type: string;         // proposal, decision, request, response, etc.
  from: string;         // Sending agent name
  to?: string;          // Target agent (optional for broadcast)
  channel: string;      // Publishing channel
  content: any;         // Message payload
  timestamp: number;    // Unix timestamp
  threadId?: string;    // Conversation thread ID
  parentId?: string;    // Parent message ID for threading
}
```

### Legacy Implementation

```javascript
// Legacy Redis Pub/Sub (deprecated)
const redis = require('redis');
const client = redis.createClient();

const message = {
  id: 'msg-' + Date.now(),
  type: 'proposal',
  from: 'steward',
  content: {
    proposal: 'Implement new feature X',
    reasoning: 'User request analysis indicates need'
  },
  timestamp: Date.now()
};

// Deprecated: Use Gateway WebSocket RPC instead
client.publish('agent:a2a', JSON.stringify(message));
```

---

## Implementation Files

### Current (Gateway-Based)

| File | Purpose |
|------|---------|
| `modules/communication/channel-ws-adapter.js` | WebSocket adapter for Gateway |
| `web-interface/src/lib/server/agent-registry.ts` | Agent registry for UI |
| `web-interface/src/lib/server/litellm-client.ts` | LiteLLM client |

### Legacy (Deprecated)

| File | Purpose | Status |
|------|---------|--------|
| `modules/communication/redis-websocket-bridge.js` | Redis-to-WebSocket bridge | ⛔ Deprecated |
| `modules/communication/redis-subscriber.js` | Redis subscriber | ⛔ Deprecated |

---

## Health Monitoring

### Gateway Health

```bash
# Check Gateway status
openclaw gateway status

# Deep health check
openclaw gateway status --deep
```

### Agent Health

```bash
# List all agents
openclaw agent list

# Check specific agent
openclaw agent status steward

# Check all agents
for agent in main steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
  openclaw agent status $agent
done
```

### WebSocket Health

```bash
# Test WebSocket connection
wscat -c ws://127.0.0.1:18789

# Send test message
wscat -c ws://127.0.0.1:18789 -x '{"type":"status"}'
```

---

## Migration from Redis Pub/Sub

### Migration Steps

1. **Install OpenClaw Gateway**
   ```bash
   curl -fsSL https://openclaw.ai/install.sh | bash
   ```

2. **Configure Gateway**
   ```bash
   cp openclaw.json ~/.openclaw/openclaw.json
   openclaw gateway validate
   ```

3. **Create Agent Workspaces**
   ```bash
   ./agents/deploy-agent.sh steward orchestrator
   # ... repeat for all agents
   ```

4. **Stop Legacy Containers**
   ```bash
   docker stop heretek-steward heretek-alpha ... heretek-historian
   ```

5. **Update Client Code**
   ```javascript
   // Before (Redis Pub/Sub)
   const redis = require('redis');
   client.publish('agent:a2a', JSON.stringify(message));
   
   // After (Gateway WebSocket RPC)
   const WebSocket = require('ws');
   const ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);
   ws.send(JSON.stringify({
     type: 'message',
     agent: 'steward',
     content: content,
     metadata: { requiresResponse: true }
   }));
   ```

### Migration Checklist

- [ ] OpenClaw Gateway installed and running
- [ ] All agent workspaces created
- [ ] Client code updated to use WebSocket RPC with subprotocol
- [ ] Legacy containers stopped
- [ ] Redis Pub/Sub subscriptions removed
- [ ] Session data migrated (if needed)
- [ ] Handshake procedures implemented
- [ ] Error handling updated for new error codes

---

## References

- [`../standards/A2A_PROTOCOL.md`](../standards/A2A_PROTOCOL.md) - Complete A2A Protocol specification
- [`./GATEWAY_ARCHITECTURE.md`](./GATEWAY_ARCHITECTURE.md) - OpenClaw Gateway details
- [`../api/WEBSOCKET_API.md`](../api/WEBSOCKET_API.md) - WebSocket RPC API reference
- [`../deployment/LOCAL_DEPLOYMENT.md`](../deployment/LOCAL_DEPLOYMENT.md) - Deployment instructions
- [`../operations/LEGACY_CLEANUP.md`](../operations/LEGACY_CLEANUP.md) - Container cleanup
- [`./REDIS_A2A_ARCHITECTURE.md`](./REDIS_A2A_ARCHITECTURE.md) - Legacy reference

---

🦞 *The thought that never ends.*
