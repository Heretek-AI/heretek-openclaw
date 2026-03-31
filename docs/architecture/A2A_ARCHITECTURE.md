# Agent-to-Agent (A2A) Architecture

**Version:** 2.0.0  
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

## Gateway WebSocket RPC

### Connection Endpoint

```
ws://127.0.0.1:18789
```

### Connection Example

```javascript
const WebSocket = require('ws');

// Connect to Gateway
const ws = new WebSocket('ws://127.0.0.1:18789');

ws.on('open', () => {
  console.log('Connected to Gateway');
  
  // Send message to agent
  ws.send(JSON.stringify({
    type: 'message',
    agent: 'steward',
    sessionId: 'session-123',
    content: {
      role: 'user',
      content: 'Hello, steward!'
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

---

## Message Envelope Format

### Gateway Message Structure

```typescript
interface GatewayMessage {
  type: 'message' | 'status' | 'error' | 'event';
  agent?: string;           // Target agent name
  sessionId?: string;       // Session identifier
  content: MessageContent;  // Message payload
  timestamp?: number;       // Unix timestamp (ms)
  metadata?: {
    priority?: 'low' | 'normal' | 'high';
    requiresResponse?: boolean;
    threadId?: string;
  };
}

interface MessageContent {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### Example Message

```json
{
  "type": "message",
  "agent": "steward",
  "sessionId": "session-123",
  "content": {
    "role": "user",
    "content": "What is the current status of the collective?"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true
  }
}
```

---

## Message Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `message` | Standard agent message | User query, agent response |
| `status` | Agent status update | Online, offline, busy, idle |
| `error` | Error notification | Task failure, validation error |
| `event` | Gateway event | Agent started, plugin loaded |

---

## Triad Deliberation Protocol

The Alpha, Beta, and Charlie agents form a triad for consensus-based decision making:

```
1. Proposal received via Gateway WebSocket RPC
2. Gateway routes to triad members (alpha, beta, charlie)
3. Each triad member analyzes and votes
4. Votes sent back via Gateway WebSocket RPC
5. 2/3 consensus triggers decision
6. Decision sent to requesting agent
7. Other agents can be notified via Gateway broadcast
```

### Triad Message Flow

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

---

## Session Management

### JSONL Session Storage

Sessions are stored as JSONL files in each agent workspace:

```
~/.openclaw/agents/steward/session.jsonl
```

### Session Entry Format

```jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello!", "sessionId": "sess-123"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi there!", "sessionId": "sess-123"}
```

### Session Commands

```bash
# List active sessions
openclaw session list

# Get session details
openclaw session get steward sess-123

# Commit session
openclaw session commit steward sess-123

# Archive old sessions
openclaw session archive steward --older-than 7d
```

---

## Agent Registry

### Available Agents

| Agent | Role | Workspace Path |
|-------|------|----------------|
| **main** | Default agent | `~/.openclaw/agents/main` |
| **steward** | Orchestrator | `~/.openclaw/agents/steward` |
| **alpha** | Triad member | `~/.openclaw/agents/alpha` |
| **beta** | Triad member | `~/.openclaw/agents/beta` |
| **charlie** | Triad member | `~/.openclaw/agents/charlie` |
| **examiner** | Evaluator | `~/.openclaw/agents/examiner` |
| **explorer** | Researcher | `~/.openclaw/agents/explorer` |
| **sentinel** | Safety | `~/.openclaw/agents/sentinel` |
| **coder** | Developer | `~/.openclaw/agents/coder` |
| **dreamer** | Creative | `~/.openclaw/agents/dreamer` |
| **empath** | Emotional | `~/.openclaw/agents/empath` |
| **historian** | Historical | `~/.openclaw/agents/historian` |

### Agent Discovery

```bash
# List all agents
openclaw agent list

# Get agent status
openclaw agent status steward

# Get agent configuration
openclaw agent config steward get
```

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
   const ws = new WebSocket('ws://127.0.0.1:18789');
   ws.send(JSON.stringify({type: 'message', agent: 'steward', content}));
   ```

### Migration Checklist

- [ ] OpenClaw Gateway installed and running
- [ ] All agent workspaces created
- [ ] Client code updated to use WebSocket RPC
- [ ] Legacy containers stopped
- [ ] Redis Pub/Sub subscriptions removed
- [ ] Session data migrated (if needed)

---

## References

- [Gateway Architecture](./GATEWAY_ARCHITECTURE.md) - OpenClaw Gateway details
- [Local Deployment Guide](../deployment/LOCAL_DEPLOYMENT.md) - Deployment instructions
- [Legacy Cleanup Procedure](../operations/LEGACY_CLEANUP.md) - Container cleanup
- [Redis A2A Architecture](./REDIS_A2A_ARCHITECTURE.md) - Legacy reference

---

🦞 *The thought that never ends.*
