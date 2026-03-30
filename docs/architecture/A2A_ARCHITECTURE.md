# Agent-to-Agent (A2A) Architecture

## Overview

OpenClaw uses **Redis Pub/Sub** as the primary communication mechanism between 11 specialized agents. This architecture enables real-time, decoupled message passing with automatic message persistence.

## Architectural Decision

**Redis Pub/Sub was chosen over HTTP for A2A communication because:**

1. **Decoupling** - Agents don't need to know about each other's existence
2. **Scalability** - Multiple subscribers can receive the same message
3. **Performance** - Sub-millisecond message delivery
4. **Reliability** - Messages persist in Redis hashes for durability
5. **Simplicity** - No complex service discovery needed

HTTP A2A endpoints are **deprecated and intentionally not implemented**.

## Redis Channel Registry

### Shared Channels (All Agents Subscribe)

| Channel | Purpose | Message Types |
|---------|---------|---------------|
| `agent:a2a` | General A2A communication | proposal, decision, request |
| `agent:status` | Status broadcasting | online, offline, busy, idle |
| `agent:message` | Chat messages | user_message, agent_response |
| `agent:activity` | Activity tracking | task_start, task_complete, error |

### Per-Agent Inbox Channels

| Channel | Agent | Purpose |
|---------|-------|---------|
| `agent:steward:inbox` | steward | Direct messages to orchestrator |
| `agent:alpha:inbox` | alpha | Direct messages to triad member |
| `agent:beta:inbox` | beta | Direct messages to triad member |
| `agent:charlie:inbox` | charlie | Direct messages to triad member |
| `agent:examiner:inbox` | examiner | Questions and evaluations |
| `agent:explorer:inbox` | explorer | Research requests |
| `agent:sentinel:inbox` | sentinel | Safety reviews |
| `agent:coder:inbox` | coder | Implementation requests |
| `agent:dreamer:inbox` | dreamer | Creative ideation |
| `agent:empath:inbox` | empath | Emotional analysis |
| `agent:historian:inbox` | historian | Historical context |

## Message Envelope Format

```typescript
interface A2AMessage {
  id: string;           // UUID
  type: string;         // proposal, decision, request, response, etc.
  from: string;         // Sending agent name
  to?: string;          // Target agent (optional for broadcast)
  channel: string;      // Publishing channel
  content: any;         // Message payload
  timestamp: number;    // Unix timestamp
  threadId?: string;    // Conversation thread ID
  parentId?: string;    // Parent message ID for threading
  metadata?: {          // Optional metadata
    priority?: 'low' | 'normal' | 'high';
    requiresResponse?: boolean;
    consensusNeeded?: boolean;
  };
}
```

## Message Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `proposal` | New idea or action proposal | Triad member proposes solution |
| `decision` | Final decision after deliberation | Triad consensus result |
| `request` | Request for information/action | Examiner requests evidence |
| `response` | Response to a request | Explorer provides research |
| `question` | Question for clarification | Examiner questions proposal |
| `vote` | Triad voting message | Alpha/Beta/Charlie vote |
| `status` | Status update | Agent reports busy/idle |
| `error` | Error notification | Task failure |

## Triad Deliberation Protocol

The Alpha, Beta, and Charlie agents form a triad for consensus-based decision making:

```
1. Proposal received → Published to agent:a2a
2. Triad members subscribe and receive proposal
3. Each triad member analyzes and votes
4. Votes published to agent:a2a with type='vote'
5. 2/3 consensus triggers decision
6. Decision published to agent:a2a with type='decision'
7. Other agents act on decision
```

## Message Persistence

All A2A messages are automatically persisted to Redis hashes:

```bash
# Message storage key pattern
A2A:messages:{channel}:{date}

# Example
A2A:messages:agent:a2a:2026-03-30
```

## Redis Configuration

```bash
# Redis server settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<optional>

# Pub/Sub settings
REDIS_PUBSUB_CHANNELS=agent:a2a,agent:status,agent:message,agent:activity

# Persistence
REDIS_APPENDONLY=yes
REDIS_APPENDFSYNC=everysec
```

## Implementation Files

| File | Purpose |
|------|---------|
| `modules/communication/redis-websocket-bridge.js` | Redis-to-WebSocket bridge |
| `web-interface/src/lib/server/websocket.ts` | WebSocket server for UI |
| `web-interface/src/lib/server/litellm-client.ts` | LiteLLM client with Redis broadcast |

## Usage Example

### Publishing an A2A Message

```javascript
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
  timestamp: Date.now(),
  metadata: {
    priority: 'normal',
    requiresResponse: true,
    consensusNeeded: true
  }
};

client.publish('agent:a2a', JSON.stringify(message));
```

### Subscribing to A2A Messages

```javascript
const subscriber = redis.createClient();

subscriber.subscribe('agent:a2a');

subscriber.on('message', (channel, message) => {
  const parsed = JSON.parse(message);
  console.log(`Received ${parsed.type} from ${parsed.from}`);
  // Process message based on type
});
```

## Health Monitoring

Monitor Redis Pub/Sub health:

```bash
# Check pub/sub clients
redis-cli CLIENT LIST | grep SUB

# Check channel subscriptions
redis-cli PUBSUB NUMSUB agent:a2a agent:status agent:message agent:activity

# Check message queue depth (if using streams)
redis-cli XLEN A2A:messages:agent:a2a
```
