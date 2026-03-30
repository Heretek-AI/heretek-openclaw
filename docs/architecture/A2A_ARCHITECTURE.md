# A2A Protocol Architecture for The Collective

## Overview

This document defines the A2A-based communication architecture for The Collective, implementing standardized agent-to-agent messaging across all 11 agents.

**Current Status:** The system uses **Redis pub/sub as the primary A2A communication mechanism**. Native HTTP endpoints are intentionally deprecated in favor of Redis-based messaging for superior performance, reliability, and simpler deployment.

---

## Architecture Status

| Component | Status | Description |
|-----------|--------|-------------|
| **Redis Pub/Sub A2A** | ✅ Primary | Production-ready message queuing |
| **LiteLLM A2A HTTP** | ⏸️ Deprecated | Intentionally not implemented |
| **11-Agent Registry** | ✅ Complete | All agents registered in Redis |
| **Architecture Decision** | ✅ Final | Redis chosen over HTTP endpoints |

---

## 11-Agent A2A Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Redis Pub/Sub Core                       │
│                     (redis://localhost:6379)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Steward   │  │   Alpha     │  │   Beta      │            │
│  │   (Redis)   │  │   (Redis)   │  │   (Redis)   │            │
│  │  orchestrate│  │  deliberate │  │  deliberate │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │               │               │                     │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │  Charlie    │  │  Examiner   │  │  Explorer   │            │
│  │   (Redis)   │  │   (Redis)   │  │   (Redis)   │            │
│  │  deliberate │  │   question  │  │  discover   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Sentinel   │  │   Coder     │  │   Dreamer   │            │
│  │   (Redis)   │  │   (Redis)   │  │   (Redis)   │            │
│  │   review    │  │ implement   │  │   synthesize│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Empath    │  │  Historian  │                               │
│  │   (Redis)   │  │   (Redis)   │                               │
│  │   relate    │  │   remember  │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Redis A2A Channels                         │
│  - agent:a2a (main message channel)                             │
│  - agent:status (status updates)                                │
│  - agent:message (direct messages)                              │
│  - agent:activity (activity feed)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Redis Pub/Sub is Primary

### Architectural Decision

The Collective uses **Redis pub/sub as the primary A2A communication mechanism** rather than native HTTP endpoints. This is an intentional architectural choice, not a temporary workaround.

### Benefits of Redis-Based A2A

| Benefit | Description |
|---------|-------------|
| **Lower Latency** | Redis pub/sub delivers messages in sub-millisecond time, faster than HTTP request/response |
| **Better Reliability** | No HTTP server needed per agent; Redis is a single, proven infrastructure component |
| **Simpler Deployment** | No need to manage 11 separate HTTP endpoints; agents just subscribe to channels |
| **Native Async** | Pub/sub is inherently asynchronous, matching agent communication patterns |
| **Built-in Fanout** | Broadcast to multiple agents with a single publish operation |
| **Message Durability** | Messages can be persisted to Redis streams for replay and audit |
| **Reduced Complexity** | No HTTP routing, CORS, or connection pooling concerns |

### Message Flow

```
Agent A → Publish to Redis → Redis Broker → Subscribe Agent B → Agent B Processes
```

1. **Sender** publishes message to appropriate channel
2. **Redis** brokers the message to all subscribers
3. **Receiver(s)** get instant notification and process message
4. **Acknowledgment** optionally sent back via separate channel

---

## Agent Registration

### 11-Agent Redis Channel Registry

All 11 agents are registered in Redis with their subscription channels:

| Agent | Subscribe Channel | Publish Channel | Primary Skills |
|-------|------------------|-----------------|----------------|
| **Steward** | `agent:steward:inbox` | `agent:steward:outbox` | orchestrate, monitor-health, manage-proposals |
| **Alpha** | `agent:alpha:inbox` | `agent:alpha:outbox` | deliberate, consensus, vote |
| **Beta** | `agent:beta:inbox` | `agent:beta:outbox` | deliberate, consensus, vote |
| **Charlie** | `agent:charlie:inbox` | `agent:charlie:outbox` | deliberate, consensus, vote |
| **Examiner** | `agent:examiner:inbox` | `agent:examiner:outbox` | question, challenge, analyze |
| **Explorer** | `agent:explorer:inbox` | `agent:explorer:outbox` | discover, research, scout |
| **Sentinel** | `agent:sentinel:inbox` | `agent:sentinel:outbox` | review, safety-check, assess |
| **Coder** | `agent:coder:inbox` | `agent:coder:outbox` | implement, code, execute |
| **Dreamer** | `agent:dreamer:inbox` | `agent:dreamer:outbox` | synthesize, imagine, pattern-recognize |
| **Empath** | `agent:empath:inbox` | `agent:empath:outbox` | relate, model-user, track-preferences |
| **Historian** | `agent:historian:inbox` | `agent:historian:outbox` | remember, consolidate, contextualize |

### Shared Channels

| Channel | Purpose | Subscribers |
|---------|---------|-------------|
| `agent:a2a` | Main A2A message bus | All agents |
| `agent:status` | Status updates | Steward, WebUI |
| `agent:message` | Direct messages | Target agent |
| `agent:activity` | Activity feed | All agents, WebUI |
| `triad:deliberate` | Triad coordination | Alpha, Beta, Charlie |

### Agent Registration (Environment)

```bash
# .env - Redis A2A Configuration
REDIS_URL="redis://localhost:6379/0"
REDIS_PUBSUB_ENABLED=true
A2A_CHANNEL_PREFIX="agent"

# Agent channels (11 agents)
REDIS_CHANNEL_STEWARD="agent:steward"
REDIS_CHANNEL_ALPHA="agent:alpha"
REDIS_CHANNEL_BETA="agent:beta"
REDIS_CHANNEL_CHARLIE="agent:charlie"
REDIS_CHANNEL_EXAMINER="agent:examiner"
REDIS_CHANNEL_EXPLORER="agent:explorer"
REDIS_CHANNEL_SENTINEL="agent:sentinel"
REDIS_CHANNEL_CODER="agent:coder"
REDIS_CHANNEL_DREAMER="agent:dreamer"
REDIS_CHANNEL_EMPATH="agent:empath"
REDIS_CHANNEL_HISTORIAN="agent:historian"
```

---

## Communication Patterns

### 1. Proposal Flow (Triad Deliberation)

The triad deliberation pattern involves Alpha, Beta, and Charlie working together to reach consensus:

```
Explorer → [intel] → Triad (Alpha/Beta/Charlie) → [deliberate] → Sentinel → [review] → Triad → [vote] → Coder
```

**Redis Implementation:**

```javascript
// Explorer delivers intel to Triad (via Alpha as lead)
const deliverIntelToTriad = async (intel) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  const envelope = {
    id: crypto.randomUUID(),
    from: 'explorer',
    to: 'alpha',
    type: 'intel',
    timestamp: new Date().toISOString(),
    content: intel.content
  };
  
  // Publish to Alpha's inbox
  await client.publish('agent:alpha:inbox', JSON.stringify(envelope));
  return envelope.id;
};
```

### 2. Triad Consensus Protocol

The triad uses a three-phase deliberation:

```
Phase 1: Alpha receives → broadcasts to Beta, Charlie
Phase 2: All three deliberate independently
Phase 3: Consensus vote → result to Steward
```

**Redis Implementation:**

```javascript
// Using Redis pub/sub for triad coordination
const redis = require('redis');

// Alpha broadcasts to triad
const broadcastToTriad = async (proposal) => {
  const client = redis.createClient({ url: process.env.REDIS_URL });
  await client.publish('triad:deliberate', JSON.stringify({
    from: 'alpha',
    type: 'proposal',
    proposal: proposal,
    timestamp: Date.now()
  }));
};

// Beta and Charlie subscribe
const subscribeToTriad = async (agentName, handler) => {
  const client = redis.createClient({ url: process.env.REDIS_URL });
  await client.subscribe('triad:deliberate', (message) => {
    const { proposal } = JSON.parse(message);
    handler(proposal);
  });
};
```

### 3. Question Flow (Examiner Questions)

```
Triad → [proposal] → Examiner → [questions] → Triad
```

**Redis Implementation:**

```javascript
// Examiner questions a proposal
const questionProposal = async (proposalId, questionType) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  const envelope = {
    id: crypto.randomUUID(),
    from: 'triad',
    to: 'examiner',
    type: 'question',
    timestamp: new Date().toISOString(),
    content: { proposalId, questionType }
  };
  
  await client.publish('agent:examiner:inbox', JSON.stringify(envelope));
  return envelope.id;
};
```

### 4. Safety Review (Sentinel)

```
Triad → [ratified] → Sentinel → [review] → result → Triad
```

**Redis Implementation:**

```javascript
// Sentinel reviews ratified proposal
const reviewProposal = async (proposalId, content) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  const envelope = {
    id: crypto.randomUUID(),
    from: 'triad',
    to: 'sentinel',
    type: 'safety-review',
    timestamp: new Date().toISOString(),
    content: { proposalId, content }
  };
  
  await client.publish('agent:sentinel:inbox', JSON.stringify(envelope));
  return envelope.id;
};
```

### 5. Implementation Request (Coder)

```
Triad → [ratified] → Coder → [implements] → result → Triad
```

**Redis Implementation:**

```javascript
// Coder implements ratified proposal
const implementProposal = async (proposalId, specs) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  const envelope = {
    id: crypto.randomUUID(),
    from: 'triad',
    to: 'coder',
    type: 'implementation',
    timestamp: new Date().toISOString(),
    content: { proposalId, specs }
  };
  
  await client.publish('agent:coder:inbox', JSON.stringify(envelope));
  return envelope.id;
};
```

### 6. Cognitive Enhancement Flow (Dreamer, Empath, Historian)

The three cognitive enhancement agents work in parallel:

```
                    ┌─→ Dreamer → [synthesize] → insights
Steward → [task] ───┼─→ Empath → [model-user] → user-context
                    └─→ Historian → [remember] → historical-context
```

**Redis Implementation:**

```javascript
// Broadcast to cognitive enhancement agents
const requestCognitiveEnhancement = async (task, context) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  const envelope = {
    id: crypto.randomUUID(),
    from: 'steward',
    type: 'cognitive-request',
    timestamp: new Date().toISOString(),
    content: { task, context }
  };
  
  // Send to all three cognitive agents
  await client.publish('agent:dreamer:inbox', JSON.stringify({
    ...envelope,
    to: 'dreamer',
    subType: 'synthesize'
  }));
  
  await client.publish('agent:empath:inbox', JSON.stringify({
    ...envelope,
    to: 'empath',
    subType: 'model-user'
  }));
  
  await client.publish('agent:historian:inbox', JSON.stringify({
    ...envelope,
    to: 'historian',
    subType: 'remember'
  }));
};
```

---

## Skills for Redis A2A

### Skill 1: a2a-message-send

Send structured messages between agents via Redis pub/sub.

**Location:** [`skills/a2a-message-send/SKILL.md`](skills/a2a-message-send/SKILL.md)

```bash
# CLI usage
node skills/a2a-message-send/a2a-cli.js --from steward --to alpha --message "Hello"

# Programmatic usage
const { sendA2AMessage } = require('./a2a-redis.js');
await sendA2AMessage('steward', 'alpha', { type: 'proposal', content: '...' });
```

### Skill 2: a2a-channel-subscribe

Subscribe to agent channels for receiving messages.

```javascript
const { subscribeToChannel } = require('./a2a-redis.js');

// Subscribe to inbox
await subscribeToChannel('agent:alpha:inbox', (message) => {
  console.log('Received:', message);
});

// Subscribe to broadcast channel
await subscribeToChannel('agent:a2a', (message) => {
  console.log('Broadcast:', message);
});
```

### Skill 3: triad-heartbeat

Monitor triad health and coordination.

**Location:** [`skills/triad-heartbeat/SKILL.md`](skills/triad-heartbeat/SKILL.md)

```bash
# Run triad heartbeat check
node skills/triad-heartbeat/heartbeat.js --agents alpha,beta,charlie
```

---

## Message Envelope Format

All Redis A2A messages use a standardized envelope format:

```json
{
  "id": "uuid-v4-identifier",
  "from": "sender-agent-name",
  "to": "recipient-agent-name",
  "type": "message-type",
  "priority": "normal|high|urgent",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "content": {
    "subject": "Message subject",
    "body": "Message content"
  },
  "metadata": {
    "conversationId": "optional-conversation-id",
    "inReplyTo": "optional-parent-message-id",
    "requiresAck": true
  }
}
```

### Message Types

| Type | Description | Example |
|------|-------------|---------|
| `proposal` | New proposal for deliberation | Triad voting |
| `vote` | Vote on a proposal | Alpha approving |
| `question` | Request for clarification | Examiner questioning |
| `intel` | Information delivery | Explorer reporting |
| `request` | General request | Steward orchestrating |
| `response` | Response to request | Agent replying |
| `status` | Status update | Health check result |
| `broadcast` | Broadcast to all agents | System announcement |

---

## Logging & Observability

All Redis A2A communications are logged:

```bash
# View Redis message log
redis-cli MONITOR | grep "a2a"

# View agent-specific messages
redis-cli --raw -h localhost -p 6379 SUBSCRIBE agent:steward:inbox

# Message durability (stored in Redis hash)
redis-cli HGETALL a2a:messages
```

### Message Persistence

Messages are persisted in Redis for audit and replay:

```javascript
// Store message for durability
await client.hSet('a2a:messages', messageId, JSON.stringify(envelope));

// Retrieve message history
const history = await client.hGetAll('a2a:messages');

// Clear old messages (cleanup)
await client.del('a2a:messages');
```

---

## Configuration

### Environment Variables (`.env`)

```bash
# Redis A2A Configuration (Primary)
REDIS_URL="redis://localhost:6379/0"
REDIS_PUBSUB_ENABLED=true
A2A_CHANNEL_PREFIX="agent"
A2A_MESSAGE_TTL=3600

# Agent channels (11 agents)
REDIS_CHANNEL_STEWARD="agent:steward"
REDIS_CHANNEL_ALPHA="agent:alpha"
REDIS_CHANNEL_BETA="agent:beta"
REDIS_CHANNEL_CHARLIE="agent:charlie"
REDIS_CHANNEL_EXAMINER="agent:examiner"
REDIS_CHANNEL_EXPLORER="agent:explorer"
REDIS_CHANNEL_SENTINEL="agent:sentinel"
REDIS_CHANNEL_CODER="agent:coder"
REDIS_CHANNEL_DREAMER="agent:dreamer"
REDIS_CHANNEL_EMPATH="agent:empath"
REDIS_CHANNEL_HISTORIAN="agent:historian"

# LiteLLM (Model routing only, not A2A)
LITELLM_HOST="llm.collective.ai"
LITELLM_PORT="4000"
LITELLM_MASTER_KEY="sk-..."

# Legacy Fallback (deprecated)
FALLBACK_TO_MATRIX="false"
MATRIX_CHANNEL="triad-general"
```

### Redis Configuration

```bash
# Redis server settings
maxmemory 256mb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 0

# Pub/Sub settings
notify-keyspace-events KEA
client-output-buffer-limit pubsub 0 0 0
```

---

## Summary

### Redis A2A Features

| Feature | Benefit |
|---------|---------|
| **Sub-millisecond Latency** | Faster than HTTP request/response |
| **Native Async** | Perfect for agent communication patterns |
| **Built-in Fanout** | Broadcast to multiple agents efficiently |
| **Message Durability** | Persistent storage for audit/replay |
| **Simple Deployment** | Single infrastructure component |
| **Proven Reliability** | Redis is battle-tested in production |
| **Standardized Messages** | All 11 agents understand same format |
| **Triad Deliberation** | Built-in consensus protocol |

### Architecture Decision

- **Primary:** Redis pub/sub messaging (production-ready)
- **HTTP Endpoints:** Intentionally deprecated (not implemented)
- **Legacy:** Matrix/Discord (deprecated)

The Collective uses Redis pub/sub as the primary A2A communication mechanism because it provides:
1. Lower latency than HTTP
2. Better reliability (no per-agent HTTP servers)
3. Simpler deployment (single Redis instance)
4. Native asynchronous messaging
5. Built-in broadcast/fanout capabilities

This is an intentional architectural choice, not a temporary workaround.

---

*Document Version: 3.0.0*
*Last Updated: 2026-03-30*
*The Collective: 11 Agents Communicating via Redis Pub/Sub*