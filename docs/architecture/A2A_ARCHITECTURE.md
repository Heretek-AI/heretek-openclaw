# A2A Protocol Architecture for The Collective

## Overview

This document defines the A2A-based communication architecture for The Collective, implementing standardized agent-to-agent messaging across all 11 agents.

**Current Status:** LiteLLM native A2A support is available and validated. The system uses a Redis-based fallback for message queuing while native A2A integration is being completed.

---

## Architecture Status

| Component | Status | Description |
|-----------|--------|-------------|
| **LiteLLM A2A** | ✅ Available | Native A2A protocol support in LiteLLM |
| **Redis Fallback** | ✅ Active | Current message queuing implementation |
| **11-Agent Registry** | ✅ Complete | All agents registered in A2A system |
| **Migration Path** | 🔄 In Progress | Transitioning from Redis to native A2A |

---

## 11-Agent A2A Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LiteLLM Gateway                         │
│                     (http://llm.collective.ai:4000)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Steward   │  │   Alpha     │  │   Beta      │            │
│  │   (A2A)     │  │   (A2A)     │  │   (A2A)     │            │
│  │  orchestrate│  │  deliberate │  │  deliberate │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │               │               │                     │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │  Charlie    │  │  Examiner   │  │  Explorer   │            │
│  │   (A2A)     │  │   (A2A)     │  │   (A2A)     │            │
│  │  deliberate │  │   question  │  │  discover   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Sentinel   │  │   Coder     │  │   Dreamer   │            │
│  │   (A2A)     │  │   (A2A)     │  │   (A2A)     │            │
│  │   review    │  │ implement   │  │   synthesize│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Empath    │  │  Historian  │                               │
│  │   (A2A)     │  │   (A2A)     │                               │
│  │   relate    │  │   remember  │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     A2A Agent Registry                         │
│  - Agent Cards for all 11 agents                                │
│  - Skill capabilities per agent                                 │
│  - Task history and context                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Registration

### 11-Agent A2A Registry

All 11 agents are registered in the A2A system with their Agent Cards:

| Agent | A2A Endpoint | Port | Primary Skills |
|-------|--------------|------|----------------|
| **Steward** | `/a2a/steward` | 8001 | orchestrate, monitor-health, manage-proposals |
| **Alpha** | `/a2a/alpha` | 8002 | deliberate, consensus, vote |
| **Beta** | `/a2a/beta` | 8003 | deliberate, consensus, vote |
| **Charlie** | `/a2a/charlie` | 8004 | deliberate, consensus, vote |
| **Examiner** | `/a2a/examiner` | 8005 | question, challenge, analyze |
| **Explorer** | `/a2a/explorer` | 8006 | discover, research, scout |
| **Sentinel** | `/a2a/sentinel` | 8007 | review, safety-check, assess |
| **Coder** | `/a2a/coder` | 8008 | implement, code, execute |
| **Dreamer** | `/a2a/dreamer` | 8009 | synthesize, imagine, pattern-recognize |
| **Empath** | `/a2a/empath` | 8010 | relate, model-user, track-preferences |
| **Historian** | `/a2a/historian` | 8011 | remember, consolidate, contextualize |

### Agent Card Structure

Each agent registers with an A2A Agent Card:

```json
{
  "name": "steward",
  "description": "Orchestrator of The Collective",
  "url": "http://localhost:4000/a2a/steward",
  "port": 8001,
  "skills": [
    { "id": "orchestrate", "name": "Orchestrate Collective" },
    { "id": "monitor-health", "name": "Monitor Agent Health" },
    { "id": "manage-proposals", "name": "Manage Proposals" }
  ],
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "a2a": true
  }
}
```

### Agent Registry (Environment)

```bash
# .env - A2A Configuration
LITELLM_HOST="llm.collective.ai"
LITELLM_PORT="4000"
LITELLM_MASTER_KEY="sk-..."

# LiteLLM A2A Settings
AGENT_MODE_ENABLED=true
AGENT_A2A_VERSION=1.0

# Agent endpoints (11 agents)
A2A_STEWARD="http://localhost:4000/a2a/steward"
A2A_ALPHA="http://localhost:4000/a2a/alpha"
A2A_BETA="http://localhost:4000/a2a/beta"
A2A_CHARLIE="http://localhost:4000/a2a/charlie"
A2A_EXAMINER="http://localhost:4000/a2a/examiner"
A2A_EXPLORER="http://localhost:4000/a2a/explorer"
A2A_SENTINEL="http://localhost:4000/a2a/sentinel"
A2A_CODER="http://localhost:4000/a2a/coder"
A2A_DREAMER="http://localhost:4000/a2a/dreamer"
A2A_EMPATH="http://localhost:4000/a2a/empath"
A2A_HISTORIAN="http://localhost:4000/a2a/historian"
```

---

## Communication Patterns

### 1. Proposal Flow (Triad Deliberation)

The triad deliberation pattern involves Alpha, Beta, and Charlie working together to reach consensus:

```
Explorer → [intel] → Triad (Alpha/Beta/Charlie) → [deliberate] → Sentinel → [review] → Triad → [vote] → Coder
```

**A2A Implementation:**

```javascript
// Explorer delivers intel to Triad (via Alpha as lead)
const deliverIntelToTriad = async (intel) => {
  const response = await fetch('http://localhost:4000/a2a/alpha', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIRTUAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{
          kind: 'text',
          text: `[INTEL] ${intel.content}`
        }]
      }
    })
  });
  return response.json();
};
```

### 2. Triad Consensus Protocol

The triad uses a three-phase deliberation:

```
Phase 1: Alpha receives → broadcasts to Beta, Charlie
Phase 2: All three deliberate independently
Phase 3: Consensus vote → result to Steward
```

**Redis-based Fallback Implementation:**

```javascript
// Using Redis pub/sub for triad coordination
const redis = require('redis');
const client = redis.createClient({ url: 'redis://localhost:6379' });

// Alpha broadcasts to triad
const broadcastToTriad = async (proposal) => {
  await client.publish('triad:deliberate', JSON.stringify({
    from: 'alpha',
    proposal: proposal,
    timestamp: Date.now()
  }));
};

// Beta and Charlie subscribe
client.subscribe('triad:deliberate', (message) => {
  const { proposal } = JSON.parse(message);
  // Process and vote
});
```

### 3. Question Flow (Examiner Questions)

```
Triad → [proposal] → Examiner → [questions] → Triad
```

**A2A Implementation:**

```javascript
// Examiner questions a proposal
const questionProposal = async (proposalId, questionType) => {
  const response = await fetch('http://localhost:4000/a2a/examiner', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIRTUAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{
          kind: 'text',
          text: `[EXAMINE] proposal=${proposalId}, type=${questionType}`
        }]
      }
    })
  });
  return response.json();
};
```

### 4. Safety Review (Sentinel)

```
Triad → [ratified] → Sentinel → [review] → result → Triad
```

**A2A Implementation:**

```javascript
// Sentinel reviews ratified proposal
const reviewProposal = async (proposalId, content) => {
  const response = await fetch('http://localhost:4000/a2a/sentinel', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIRTUAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{
          kind: 'text',
          text: `[SAFETY REVIEW] proposal=${proposalId}\n\n${content}`
        }]
      }
    })
  });
  return response.json();
};
```

### 5. Implementation Request (Coder)

```
Triad → [ratified] → Coder → [implements] → result → Triad
```

**A2A Implementation:**

```javascript
// Coder implements ratified proposal
const implementProposal = async (proposalId, specs) => {
  const response = await fetch('http://localhost:4000/a2a/coder', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIRTUAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{
          kind: 'text',
          text: `[IMPLEMENT] proposal=${proposalId}\n\nspecs:\n${JSON.stringify(specs)}`
        }]
      }
    })
  });
  return response.json();
};
```

### 6. Cognitive Enhancement Flow (Dreamer, Empath, Historian)

The three cognitive enhancement agents work in parallel:

```
                    ┌─→ Dreamer → [synthesize] → insights
Steward → [task] ───┼─→ Empath → [model-user] → user-context
                    └─→ Historian → [remember] → historical-context
```

**Dreamer - Creative Synthesis:**

```javascript
// Dreamer processes background patterns
const synthesizePatterns = async (context) => {
  const response = await fetch('http://localhost:4000/a2a/dreamer', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VIRTUAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: `[SYNTHESIZE] ${context}` }]
      }
    })
  });
  return response.json();
};
```

**Empath - User Modeling:**

```javascript
// Empath resolves user context
const resolveUserContext = async (userId) => {
  const response = await fetch('http://localhost:4000/a2a/empath', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VIRTUAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: `[USER_CONTEXT] uuid=${userId}` }]
      }
    })
  });
  return response.json();
};
```

**Historian - Memory Retrieval:**

```javascript
// Historian retrieves historical context
const retrieveHistory = async (query) => {
  const response = await fetch('http://localhost:4000/a2a/historian', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${VIRTUAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: `[REMEMBER] ${query}` }]
      }
    })
  });
  return response.json();
};
```

---

## Skills for A2A

### Skill 1: a2a-agent-register

Register agents with LiteLLM A2A Gateway.

```bash
# Register Steward
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer sk-master-key" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "a2a-steward",
    "agent": "steward",
    "permissions": ["a2a:send"]
  }'

# Register other agents similarly
```

### Skill 2: a2a-agent-discover

Query available agents and their capabilities.

```python
# Discover all agents
import httpx

async def discover_agents():
    async with httpx.AsyncClient() as client:
        # Get agent list from LiteLLM
        response = await client.get(
            "http://localhost:4000/agents",
            headers={"Authorization": "Bearer sk-master-key"}
        )
        return response.json()['agents']
```

### Skill 3: a2a-message-send

Send structured messages between agents.

```python
# Send message to specific agent
async def send_to_agent(agent_name, message, role='user'):
    base_url = f"http://localhost:4000/a2a/{agent_name}"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            base_url,
            json={
                "message": {
                    "role": role,
                    "parts": [{"kind": "text", "text": message}]
                }
            },
            headers={"Authorization": f"Bearer {VIRTUAL_KEY}"}
        )
        return response.json()
```

### Skill 4: a2a-task-handoff

Transfer task context between agents.

```python
# Handoff task from one agent to another
async def handoff_task(from_agent, to_agent, task_context):
    client = A2AClient(agent_card=await get_agent_card(to_agent))
    
    # Include full context from previous agent
    await client.send_message({
        'role': 'user',
        'parts': [
            {'kind': 'text', 'text': f'[CONTINUATION] From: {from_agent}'},
            {'kind': 'text', 'text': task_context}
        ]
    })
```

---

## Fallback Strategy

A2A is primary, but fallback to OpenClaw sessions if A2A fails:

```bash
# Fallback: OpenClaw session message
openclaw sessions send --session steward --message "$MESSAGE"
```

---

## Logging & Observability

All A2A communications logged via LiteLLM:

```bash
# View logs
curl "http://localhost:4000/logs?agent=triad" \
  -H "Authorization: Bearer sk-master-key"

# Cost tracking
curl "http://localhost:4000/spend" \
  -H "Authorization: Bearer sk-master-key"
```

---

## Redis-Based Fallback Implementation

While LiteLLM native A2A is being integrated, the system uses Redis pub/sub for message queuing:

### Message Queue Structure

```javascript
// Redis channels for A2A messaging
const CHANNELS = {
  // Per-agent channels
  steward: 'a2a:steward:inbox',
  alpha: 'a2a:alpha:inbox',
  beta: 'a2a:beta:inbox',
  charlie: 'a2a:charlie:inbox',
  examiner: 'a2a:examiner:inbox',
  explorer: 'a2a:explorer:inbox',
  sentinel: 'a2a:sentinel:inbox',
  coder: 'a2a:coder:inbox',
  dreamer: 'a2a:dreamer:inbox',
  empath: 'a2a:empath:inbox',
  historian: 'a2a:historian:inbox',
  
  // Triad broadcast
  triad: 'a2a:triad:broadcast',
  
  // System channels
  health: 'a2a:system:health',
  errors: 'a2a:system:errors'
};
```

### Sending Messages via Redis

```javascript
// skills/a2a-message-send/a2a-redis.js
const sendA2AMessage = async (fromAgent, toAgent, message) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  const envelope = {
    id: uuidv4(),
    from: fromAgent,
    to: toAgent,
    timestamp: new Date().toISOString(),
    message: message,
    status: 'pending'
  };
  
  // Publish to target agent's inbox
  await client.publish(`a2a:${toAgent}:inbox`, JSON.stringify(envelope));
  
  // Store for durability
  await client.hSet('a2a:messages', envelope.id, JSON.stringify(envelope));
  
  return envelope.id;
};
```

### Receiving Messages

```javascript
// Agent subscribes to its inbox
const subscribeToMessages = async (agentName, handler) => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  await client.subscribe(`a2a:${agentName}:inbox`, (message) => {
    const envelope = JSON.parse(message);
    handler(envelope);
  });
};
```

---

## Migration Path to Native A2A

### Current State (Phase 2)

- ✅ LiteLLM deployed with A2A gateway enabled
- ✅ All 11 agents registered in A2A registry
- ✅ Redis fallback active for message queuing
- 🔄 Skills updated to support both A2A and Redis

### Migration Phases

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Deploy LiteLLM with A2A gateway |
| **Phase 2** | ✅ Complete | Register all 11 agents as A2A agents |
| **Phase 3** | 🔄 In Progress | Update skills to use native A2A |
| **Phase 4** | ⏳ Pending | Replace Redis with native A2A calls |
| **Phase 5** | ⏳ Pending | Remove Redis fallback code |

### Migration Steps

1. **Update Skills** - Modify all skills to use A2A endpoints:
   ```javascript
   // Before (Redis)
   await redisClient.publish(`a2a:${agent}:inbox`, message);
   
   // After (Native A2A)
   await fetch(`http://localhost:4000/a2a/${agent}`, {
     method: 'POST',
     body: JSON.stringify({ message })
   });
   ```

2. **Update Agent Client** - Modify [`agents/lib/agent-client.js`](agents/lib/agent-client.js):
   ```javascript
   // Add A2A client method
   async sendA2AMessage(toAgent, message) {
     const response = await fetch(`${this.litellmUrl}/a2a/${toAgent}`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${this.apiKey}` },
       body: JSON.stringify({ message })
     });
     return response.json();
   }
   ```

3. **Deprecate Redis Channels** - Once A2A is stable, remove Redis pub/sub code

---

## Configuration

### Environment Variables (`.env`)

```bash
# LiteLLM A2A Configuration
LITELLM_A2A_ENABLED="true"
AGENT_MODE_ENABLED="true"
AGENT_A2A_VERSION="1.0"
A2A_DEFAULT_AGENT="steward"

# Agent endpoints (11 agents)
A2A_STEWARD_URL="http://localhost:4000/a2a/steward"
A2A_ALPHA_URL="http://localhost:4000/a2a/alpha"
A2A_BETA_URL="http://localhost:4000/a2a/beta"
A2A_CHARLIE_URL="http://localhost:4000/a2a/charlie"
A2A_EXAMINER_URL="http://localhost:4000/a2a/examiner"
A2A_EXPLORER_URL="http://localhost:4000/a2a/explorer"
A2A_SENTINEL_URL="http://localhost:4000/a2a/sentinel"
A2A_CODER_URL="http://localhost:4000/a2a/coder"
A2A_DREAMER_URL="http://localhost:4000/a2a/dreamer"
A2A_EMPATH_URL="http://localhost:4000/a2a/empath"
A2A_HISTORIAN_URL="http://localhost:4000/a2a/historian"

# Redis Fallback
REDIS_URL="redis://localhost:6379/0"
A2A_FALLBACK_TO_REDIS="true"

# Legacy Fallback (deprecated)
FALLBACK_TO_MATRIX="false"
MATRIX_CHANNEL="triad-general"
```

### LiteLLM Configuration (`litellm_config.yaml`)

```yaml
# A2A Agent model mappings
model_list:
  - model_name: agent/steward
    litellm_params:
      model: minimax/abab6.5s-chat
      api_key: os.environ/MINIMAX_API_KEY
  
  # ... all 11 agents configured
  
# A2A Settings
agent_mode:
  enabled: true
  a2a_version: "1.0"
  default_agent: steward
```

---

## Summary

### A2A Features

| Feature | Benefit |
|---------|---------|
| Standardized Messages | All 11 agents understand same format |
| Agent Discovery | No hardcoded agent URLs |
| Task Continuity | Context handoff between agents |
| Cost Tracking | Per-agent spend visibility |
| Logging | Full conversation history |
| Streaming | Real-time responses |
| Triad Deliberation | Built-in consensus protocol |

### Current Implementation

- **Primary:** LiteLLM native A2A (available, integration in progress)
- **Fallback:** Redis pub/sub messaging
- **Legacy:** Matrix/Discord (deprecated)

The Collective communicates via LiteLLM A2A gateway with Redis fallback for reliability.

---

*Document Version: 2.0.0*
*Last Updated: 2026-03-29*
*The Collective: 11 Agents in A2A Harmony*