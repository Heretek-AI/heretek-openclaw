# Redis A2A Architecture Details

## Channel Specifications

### Channel Naming Convention

```
agent:{type}              # Broadcast channels
agent:{name}:inbox        # Per-agent direct message inbox
agent:{name}:status       # Per-agent status (optional)
```

### All Agent Channels

| Agent | Inbox Channel | Subscriptions |
|-------|---------------|---------------|
| steward | `agent:steward:inbox` | `agent:a2a`, `agent:status`, `agent:steward:inbox` |
| alpha | `agent:alpha:inbox` | `agent:a2a`, `agent:status`, `agent:alpha:inbox` |
| beta | `agent:beta:inbox` | `agent:a2a`, `agent:status`, `agent:beta:inbox` |
| charlie | `agent:charlie:inbox` | `agent:a2a`, `agent:status`, `agent:charlie:inbox` |
| examiner | `agent:examiner:inbox` | `agent:a2a`, `agent:status`, `agent:examiner:inbox` |
| explorer | `agent:explorer:inbox` | `agent:a2a`, `agent:status`, `agent:explorer:inbox` |
| sentinel | `agent:sentinel:inbox` | `agent:a2a`, `agent:status`, `agent:sentinel:inbox` |
| coder | `agent:coder:inbox` | `agent:a2a`, `agent:status`, `agent:coder:inbox` |
| dreamer | `agent:dreamer:inbox` | `agent:a2a`, `agent:status`, `agent:dreamer:inbox` |
| empath | `agent:empath:inbox` | `agent:a2a`, `agent:status`, `agent:empath:inbox` |
| historian | `agent:historian:inbox` | `agent:a2a`, `agent:status`, `agent:historian:inbox` |

## Message Flow Patterns

### Pattern 1: Broadcast to All Agents

```
[Publisher] → agent:a2a → [All 11 Agents]
```

### Pattern 2: Direct Message to Specific Agent

```
[Publisher] → agent:{name}:inbox → [Target Agent]
```

### Pattern 3: Triad Consensus

```
[Steward] → agent:a2a → [Alpha, Beta, Charlie]
[Alpha] → agent:a2a → [All agents see vote]
[Beta] → agent:a2a → [All agents see vote]
[Charlie] → agent:a2a → [All agents see vote]
[Consensus] → Decision published → [All agents act]
```

## Envelope Structure

```json
{
  "id": "uuid-string",
  "type": "proposal|decision|request|response|question|vote|status|error",
  "from": "agent-name",
  "to": "target-agent-or-null",
  "channel": "publishing-channel",
  "content": {
    // Message-specific payload
  },
  "timestamp": 1234567890,
  "threadId": "optional-thread-id",
  "parentId": "optional-parent-message-id",
  "metadata": {
    "priority": "low|normal|high",
    "requiresResponse": false,
    "consensusNeeded": false
  }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique message identifier (UUID) |
| `type` | string | Yes | Message type for routing/handling |
| `from` | string | Yes | Sending agent name |
| `to` | string | No | Target agent for direct messages |
| `channel` | string | Yes | Channel where message was published |
| `content` | object | Yes | Message payload (type-specific) |
| `timestamp` | number | Yes | Unix timestamp in milliseconds |
| `threadId` | string | No | Groups related messages |
| `parentId` | string | No | Creates message threads |
| `metadata.priority` | string | No | Message priority |
| `metadata.requiresResponse` | boolean | No | Indicates response expected |
| `metadata.consensusNeeded` | boolean | No | Triggers triad voting |

## Triad Deliberation Flow

```
┌─────────────┐
│   Steward   │ Proposes action
└──────┬──────┘
       │ Publishes to agent:a2a
       ▼
┌─────────────────────────────────┐
│         agent:a2a               │
│     (Redis Pub/Sub Channel)     │
└───────┬─────────┬───────────────┘
        │         │
        ▼         ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│   Alpha   │ │   Beta    │ │  Charlie  │
│  Analyzes │ │  Analyzes │ │  Analyzes │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │
      │ Vote        │ Vote        │ Vote
      ▼             ▼             ▼
┌─────────────────────────────────────┐
│      Consensus Check (2/3 votes)    │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    Consensus         No Consensus
         │                 │
         ▼                 ▼
   Publish Decision    Retry/Timeout
```

## Persistence Strategy

Messages are stored in Redis hashes with date-based keys:

```
Key Pattern: A2A:messages:{channel}:{YYYY-MM-DD}
Field: {message-id}
Value: JSON.stringify(message)
```

### Storage Structure

```bash
# Daily message storage
A2A:messages:agent:a2a:2026-03-30
A2A:messages:agent:status:2026-03-30
A2A:messages:agent:message:2026-03-30
A2A:messages:agent:activity:2026-03-30

# Per-agent inbox storage (optional)
A2A:inbox:steward
A2A:inbox:alpha
# ... etc
```

### Message Retention

```bash
# Set expiration on daily keys (7 days default)
EXPIRE A2A:messages:agent:a2a:2026-03-30 604800

# Clean old messages (maintenance)
# Keys auto-expire based on TTL
```

## Redis Configuration

```ini
# Redis server configuration

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# A2A channel configuration
notify-keyspace-events Ex

# Triad configuration
# No special config needed - uses standard pub/sub

# Agent configuration
# Each agent connects as pub/sub client

# Connection settings
timeout 300
tcp-keepalive 60
```

## Common Operations

### Check Pub/Sub Clients

```bash
redis-cli CLIENT LIST | grep SUB
```

### Check Channel Subscriptions

```bash
redis-cli PUBSUB NUMSUB agent:a2a agent:status agent:message agent:activity
```

### Get Message Count

```bash
redis-cli HLEN A2A:messages:agent:a2a:2026-03-30
```

### Clear Old Messages

```bash
# Delete specific date
redis-cli DEL A2A:messages:agent:a2a:2026-03-29

# Or let TTL expire naturally
```

## Error Handling

### Connection Lost

Agents should implement reconnection with exponential backoff:

```javascript
async reconnect() {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (const delay of delays) {
    try {
      await this.connect();
      return;
    } catch (e) {
      await sleep(delay);
    }
  }
  throw new Error('Failed to reconnect to Redis');
}
```

### Message Processing Errors

```javascript
try {
  await this.handleMessage(message);
} catch (error) {
  // Publish error to activity channel
  this.publish('agent:activity', {
    type: 'error',
    from: this.agentName,
    content: { error: error.message, messageId: message.id }
  });
}
```

## Performance Considerations

1. **Pub/Sub is fire-and-forget** - Messages not queued for disconnected subscribers
2. **Use hashes for persistence** - Store messages separately from pub/sub
3. **Limit message size** - Keep payloads under 1KB when possible
4. **Batch status updates** - Don't flood status channel
5. **Use TTL for cleanup** - Auto-expire old messages
