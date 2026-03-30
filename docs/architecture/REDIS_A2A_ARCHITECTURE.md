# Redis-based A2A Architecture for The Collective

**Document Date:** 2026-03-30  
**Version:** 1.0.0  
**Status:** Production Architecture

---

## Executive Summary

This document details the Redis pub/sub-based Agent-to-Agent (A2A) communication architecture used by The Collective. Unlike traditional HTTP-based A2A protocols, this system uses Redis pub/sub as the **primary and intentional** communication mechanism, providing superior performance, reliability, and deployment simplicity.

### Key Architectural Decision

**Redis pub/sub is the primary A2A communication mechanism.** Native HTTP endpoints are intentionally deprecated (not implemented) in favor of Redis-based messaging.

---

## Why Redis Pub/Sub?

### Comparison: Redis vs HTTP for A2A

| Criterion | Redis Pub/Sub | HTTP Endpoints | Winner |
|-----------|---------------|----------------|--------|
| **Latency** | Sub-millisecond | 10-100ms+ | Redis |
| **Connection Overhead** | Persistent subscription | New connection per request | Redis |
| **Broadcast/Fanout** | Native support | Requires multiple requests | Redis |
| **Async Native** | Yes (push-based) | No (poll-based) | Redis |
| **Deployment** | Single Redis instance | 11 HTTP servers + routing | Redis |
| **Reliability** | Single point (Redis) | Multiple points (11 servers) | Redis |
| **Message Durability** | Redis persistence | Requires separate storage | Redis |
| **Complexity** | Low | High | Redis |

### Benefits Realized

1. **Lower Latency**: Messages delivered in <1ms vs 10-100ms for HTTP
2. **Better Reliability**: No per-agent HTTP servers to manage or fail
3. **Simpler Deployment**: Single Redis instance vs 11 HTTP endpoints
4. **Native Asynchrony**: Push-based delivery matches agent communication patterns
5. **Built-in Broadcast**: Single publish reaches all subscribers
6. **Message Persistence**: Redis hashes for audit and replay

---

## Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Redis Pub/Sub Core                          │
│                  (redis://localhost:6379/0)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Steward   │  │   Alpha     │  │   Beta      │            │
│  │  Subscribe  │  │  Subscribe  │  │  Subscribe  │            │
│  │  :inbox     │  │  :inbox     │  │  :inbox     │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │               │               │                     │
│         └───────────────┼───────────────┘                     │
│                         │                                     │
│              ┌──────────┴──────────┐                         │
│              │   Triad Channel     │                         │
│              │  triad:deliberate   │                         │
│              └──────────┬──────────┘                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │           Shared Broadcast Channels                 │      │
│  │  agent:a2a | agent:status | agent:message          │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Message Flow

```
Agent A                          Redis                    Agent B
   │                              │                          │
   │  PUBLISH agent:B:inbox       │                          │
   ├─────────────────────────────>│                          │
   │                              │  SUBSCRIBE agent:B:inbox │
   │                              │─────────────────────────>│
   │                              │  DELIVER message         │
   │                              │─────────────────────────>│
   │                              │                          │  Process
   │                              │                          │
   │  PUBLISH agent:A:inbox       │                          │
   │<─────────────────────────────┤  ACK                     │
   │  DELIVER ack                 │                          │
   │                              │                          │
```

---

## Channel Architecture

### Channel Types

| Type | Pattern | Purpose | Subscribers |
|------|---------|---------|-------------|
| **Inbox** | `agent:{name}:inbox` | Direct messages to agent | Target agent only |
| **Outbox** | `agent:{name}:outbox` | Messages from agent | All listening |
| **Broadcast** | `agent:a2a` | System-wide broadcast | All agents |
| **Status** | `agent:status` | Health/status updates | Steward, WebUI |
| **Activity** | `agent:activity` | Activity feed | All agents, WebUI |
| **Coordination** | `triad:deliberate` | Triad coordination | Alpha, Beta, Charlie |

### Channel Naming Convention

```
agent:{agent-name}:{channel-type}
```

Examples:
- `agent:steward:inbox` - Steward's private inbox
- `agent:alpha:outbox` - Alpha's published messages
- `agent:coder:status` - Coder's status updates

### All Agent Channels

| Agent | Inbox Channel | Outbox Channel | Status Channel |
|-------|--------------|----------------|----------------|
| Steward | `agent:steward:inbox` | `agent:steward:outbox` | `agent:steward:status` |
| Alpha | `agent:alpha:inbox` | `agent:alpha:outbox` | `agent:alpha:status` |
| Beta | `agent:beta:inbox` | `agent:beta:outbox` | `agent:beta:status` |
| Charlie | `agent:charlie:inbox` | `agent:charlie:outbox` | `agent:charlie:status` |
| Examiner | `agent:examiner:inbox` | `agent:examiner:outbox` | `agent:examiner:status` |
| Explorer | `agent:explorer:inbox` | `agent:explorer:outbox` | `agent:explorer:status` |
| Sentinel | `agent:sentinel:inbox` | `agent:sentinel:outbox` | `agent:sentinel:status` |
| Coder | `agent:coder:inbox` | `agent:coder:outbox` | `agent:coder:status` |
| Dreamer | `agent:dreamer:inbox` | `agent:dreamer:outbox` | `agent:dreamer:status` |
| Empath | `agent:empath:inbox` | `agent:empath:outbox` | `agent:empath:status` |
| Historian | `agent:historian:inbox` | `agent:historian:outbox` | `agent:historian:status` |

---

## Message Format

### Envelope Structure

All A2A messages use a standardized envelope:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "from": "steward",
  "to": "alpha",
  "type": "proposal",
  "priority": "normal",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "content": {
    "subject": "New proposal for deliberation",
    "body": "Proposal content here..."
  },
  "metadata": {
    "conversationId": "conv-12345",
    "inReplyTo": null,
    "requiresAck": true,
    "ttl": 3600
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique message identifier |
| `from` | string | Yes | Sender agent name |
| `to` | string | Yes | Recipient agent name |
| `type` | string | Yes | Message type (see below) |
| `priority` | string | No | `low`, `normal`, `high`, `urgent` |
| `timestamp` | ISO8601 | Yes | Message creation time |
| `content` | object | Yes | Message payload |
| `metadata` | object | No | Optional metadata |

### Message Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `proposal` | New proposal for deliberation | Triad voting |
| `vote` | Vote on a proposal | Alpha approving |
| `question` | Request for clarification | Examiner questioning |
| `intel` | Information delivery | Explorer reporting |
| `request` | General request | Steward orchestrating |
| `response` | Response to request | Agent replying |
| `status` | Status update | Health check result |
| `broadcast` | Broadcast to all | System announcement |
| `ack` | Acknowledgment | Message received confirmation |
| `error` | Error notification | Processing failed |

---

## Subscription Patterns

### Agent Subscription Model

Each agent subscribes to its channels on startup:

```javascript
// agents/lib/agent-client.js
class AgentClient {
  constructor(agentName) {
    this.agentName = agentName;
    this.redis = redis.createClient({ url: process.env.REDIS_URL });
    this.subscribeToChannels();
  }
  
  async subscribeToChannels() {
    // Subscribe to inbox
    await this.redis.subscribe(`agent:${this.agentName}:inbox`, (message) => {
      this.handleInboxMessage(JSON.parse(message));
    });
    
    // Subscribe to broadcast channel
    await this.redis.subscribe('agent:a2a', (message) => {
      this.handleBroadcast(JSON.parse(message));
    });
    
    // Triad agents subscribe to triad channel
    if (['alpha', 'beta', 'charlie'].includes(this.agentName)) {
      await this.redis.subscribe('triad:deliberate', (message) => {
        this.handleTriadMessage(JSON.parse(message));
      });
    }
  }
  
  async handleInboxMessage(envelope) {
    // Process direct message
    console.log(`[${this.agentName}] Received:`, envelope);
    // ... process message ...
    
    // Send acknowledgment if required
    if (envelope.metadata?.requiresAck) {
      await this.sendAck(envelope);
    }
  }
}
```

### Publishing Messages

```javascript
// Send message to specific agent
async sendMessage(toAgent, content, type = 'request') {
  const envelope = {
    id: crypto.randomUUID(),
    from: this.agentName,
    to: toAgent,
    type: type,
    priority: 'normal',
    timestamp: new Date().toISOString(),
    content: content,
    metadata: {
      requiresAck: true
    }
  };
  
  // Publish to target agent's inbox
  await this.redis.publish(
    `agent:${toAgent}:inbox`,
    JSON.stringify(envelope)
  );
  
  // Also publish to broadcast channel for visibility
  await this.redis.publish(
    'agent:a2a',
    JSON.stringify({ ...envelope, _broadcast: true })
  );
  
  // Store for durability
  await this.redis.hSet('a2a:messages', envelope.id, JSON.stringify(envelope));
  
  return envelope.id;
}
```

---

## Triad Coordination Pattern

### Overview

The triad (Alpha, Beta, Charlie) uses a specialized coordination pattern for consensus deliberation:

```
                    ┌─────────────────┐
                    │  Triad Channel  │
                    │ triad:deliberate│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │  Alpha  │         │  Beta   │         │ Charlie │
   │ (Lead)  │         │         │         │         │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    Consensus Required
                    (2/3 majority)
```

### Triad Deliberation Flow

```javascript
// Phase 1: Alpha receives proposal and broadcasts
async function broadcastToTriad(proposal) {
  const envelope = {
    id: crypto.randomUUID(),
    from: 'alpha',
    type: 'triad-proposal',
    timestamp: new Date().toISOString(),
    content: { proposal }
  };
  
  await redis.publish('triad:deliberate', JSON.stringify(envelope));
}

// Phase 2: Beta and Charlie receive and deliberate
async function handleTriadProposal(envelope) {
  const { proposal } = envelope.content;
  
  // Deliberate independently
  const vote = await deliberate(proposal);
  
  // Send vote back to Alpha
  await sendToAgent('alpha', {
    type: 'vote',
    proposalId: proposal.id,
    vote: vote,
    rationale: vote.rationale
  });
}

// Phase 3: Alpha tallies votes
async function tallyVotes(proposalId, votes) {
  const approved = votes.filter(v => v.vote === 'approve').length;
  const rejected = votes.filter(v => v.vote === 'reject').length;
  
  // 2/3 majority required
  if (approved >= 2) {
    return { result: 'approved', votes: { approved, rejected } };
  } else if (rejected >= 2) {
    return { result: 'rejected', votes: { approved, rejected } };
  }
  return { result: 'pending', votes: { approved, rejected } };
}
```

---

## Message Durability

### Persistence Strategy

Messages are persisted in Redis for:
- Audit trail
- Message replay
- Debugging
- Recovery after agent restart

### Storage Structure

```javascript
// Store message in Redis hash
await redis.hSet('a2a:messages', messageId, JSON.stringify(envelope));

// Store with TTL for automatic cleanup
await redis.hSet('a2a:messages', messageId, JSON.stringify(envelope));
await redis.expire('a2a:messages', 3600); // 1 hour TTL

// Retrieve message history
const messages = await redis.hGetAll('a2a:messages');

// Get specific message
const message = await redis.hGet('a2a:messages', messageId);
```

### Message Log

```bash
# View all pending messages
redis-cli HGETALL a2a:messages

# View message count
redis-cli HLEN a2a:messages

# Delete processed message
redis-cli HDEL a2a:messages <message-id>

# Clear all messages (maintenance)
redis-cli DEL a2a:messages
```

---

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL="redis://localhost:6379/0"
REDIS_PUBSUB_ENABLED=true
REDIS_MESSAGE_TTL=3600

# A2A Channel Configuration
A2A_CHANNEL_PREFIX="agent"
A2A_BROADCAST_CHANNEL="agent:a2a"
A2A_STATUS_CHANNEL="agent:status"
A2A_ACTIVITY_CHANNEL="agent:activity"

# Triad Configuration
TRIAD_CHANNEL="triad:deliberate"
TRIAD_AGENTS="alpha,beta,charlie"
TRIAD_QUORUM=2

# Agent Configuration
AGENT_NAME="steward"  # Each agent sets its own name
AGENT_SUBSCRIBE_INBOX=true
AGENT_SUBSCRIBE_BROADCAST=true
```

### Redis Server Configuration

```conf
# redis.conf

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfsync everysec

# Pub/Sub settings
notify-keyspace-events KEA
client-output-buffer-limit pubsub 0 0 0

# Connection settings
tcp-keepalive 300
timeout 0
maxclients 10000
```

---

## Implementation Files

### Core Files

| File | Purpose |
|------|---------|
| [`agents/lib/agent-client.js`](../../agents/lib/agent-client.js) | Redis A2A client library |
| [`agents/entrypoint.sh`](../../agents/entrypoint.sh) | Agent runtime with Redis subscription |
| [`skills/a2a-message-send/a2a-redis.js`](../../skills/a2a-message-send/a2a-redis.js) | A2A messaging implementation |
| [`skills/a2a-message-send/a2a-cli.js`](../../skills/a2a-message-send/a2a-cli.js) | CLI tool for A2A |
| [`modules/communication/redis-websocket-bridge.js`](../../modules/communication/redis-websocket-bridge.js) | Redis-to-WebSocket bridge |
| [`modules/communication/channel-manager.js`](../../modules/communication/channel-manager.js) | Channel management |

### Test Files

| File | Purpose |
|------|---------|
| [`tests/integration/a2a-communication.test.ts`](../../tests/integration/a2a-communication.test.ts) | A2A communication tests |
| [`tests/unit/redis-bridge.test.ts`](../../tests/unit/redis-bridge.test.ts) | Redis bridge unit tests |
| [`tests/skills/a2a-message-send.test.js`](../../tests/skills/a2a-message-send.test.js) | A2A skill tests |

---

## Monitoring & Debugging

### Redis CLI Commands

```bash
# Monitor all Redis operations in real-time
redis-cli MONITOR

# Subscribe to agent inbox
redis-cli SUBSCRIBE agent:steward:inbox

# Subscribe to broadcast channel
redis-cli SUBSCRIBE agent:a2a

# View message storage
redis-cli HGETALL a2a:messages

# Check Redis info
redis-cli INFO

# Check pub/sub clients
redis-cli CLIENT LIST | grep SUBSCRIBE
```

### Application Logging

```javascript
// Enable debug logging
process.env.DEBUG='a2a:*'

// Log format
[timestamp] [agent] [channel] [message-type] content
```

### Health Checks

```bash
# Check Redis connectivity
redis-cli PING

# Check agent subscriptions
redis-cli PUBSUB CHANNELS agent:*

# Check message queue depth
redis-cli HLEN a2a:messages
```

---

## Error Handling

### Common Error Scenarios

| Error | Cause | Resolution |
|-------|-------|------------|
| Connection refused | Redis not running | Start Redis: `redis-server` |
| Channel not found | Typo in channel name | Verify channel naming convention |
| Message not delivered | Agent not subscribed | Check agent subscription on startup |
| Duplicate messages | Agent reconnected | Implement idempotent message handling |

### Retry Strategy

```javascript
async function sendMessageWithRetry(toAgent, content, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendMessage(toAgent, content);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

---

## Migration Notes

### From HTTP to Redis

This architecture was designed with Redis as primary from the start. There is no migration path from HTTP because HTTP A2A endpoints were intentionally never implemented.

### Why Not HTTP?

HTTP endpoints for A2A were evaluated and rejected because:

1. **Higher Latency**: HTTP request/response adds 10-100ms overhead
2. **Connection Management**: Each agent needs HTTP server + connection pooling
3. **Polling Required**: Agents must poll for messages instead of push-based delivery
4. **Complex Routing**: Need load balancer/reverse proxy for 11 agents
5. **No Native Broadcast**: Must send same message 11 times for broadcast
6. **Stateless**: HTTP is stateless, requiring additional session management

Redis pub/sub solves all these problems natively.

---

## Summary

### Architecture Decision Record

| Decision | Outcome |
|----------|---------|
| **Primary A2A Mechanism** | Redis Pub/Sub |
| **HTTP Endpoints** | Intentionally deprecated (not implemented) |
| **Message Format** | Standardized JSON envelope |
| **Channels** | Per-agent inbox + shared broadcast |
| **Durability** | Redis hash storage with TTL |
| **Triad Coordination** | Dedicated `triad:deliberate` channel |

### Key Takeaways

1. **Redis pub/sub is production-ready** for A2A communication
2. **Lower latency** than HTTP (sub-millisecond vs 10-100ms)
3. **Simpler deployment** (single Redis vs 11 HTTP servers)
4. **Native async** matches agent communication patterns
5. **Built-in broadcast** for efficient multi-agent messaging
6. **Message durability** via Redis persistence

---

*Document Version: 1.0.0*  
*Last Updated: 2026-03-30*  
*The Collective: 11 Agents Communicating via Redis Pub/Sub*
