# A2A Protocol Architecture for The Collective

## Overview

This document defines the A2A-based communication architecture for The Collective, replacing the legacy HTTP sync + Matrix communication with standardized agent-to-agent messaging.

---

## Current Architecture (Deprecated)

```
OpenClaw Instance
├── HTTP Sync Server (port 8765)
│   └── /state, /health, /broadcast
├── Matrix Room (triad-general)
│   └── Human coordination, fallback
└── OpenClaw Gateway (port 18789)
    └── sessions_send for agent control
```

**Limitations:**
- No standardized agent discovery
- Message format varies by channel
- No structured task handoff
- Hard to track conversation context across agents
- Matrix/Discord adds latency and noise

---

## Target A2A Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LiteLLM Gateway                         │
│                     (http://llm.collective.ai:4000)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Steward   │  │    Triad    │  │  Examiner   │            │
│  │   (A2A)     │  │   (A2A)     │  │   (A2A)     │            │
│  │  orchestrate│  │  deliberate │  │   question  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │               │               │                     │
│         └───────────────┼───────────────┘                     │
│                         │                                       │
│         ┌───────────────┼───────────────┐                     │
│         │               │               │                     │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │  Explorer   │  │  Sentinel   │  │   Coder     │            │
│  │   (A2A)     │  │   (A2A)     │  │   (A2A)     │            │
│  │  discover   │  │   review    │  │ implement   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     A2A Agent Registry                         │
│  - Agent Cards for discovery                                    │
│  - Skill capabilities                                           │
│  - Task history                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Registration

### Agent Card Structure

Each agent registers with an A2A Agent Card:

```json
{
  "name": "steward",
  "description": "Orchestrator of The Collective",
  "url": "http://localhost:4000/a2a/steward",
  "skills": [
    { "id": "orchestrate", "name": "Orchestrate Collective" },
    { "id": "monitor-health", "name": "Monitor Agent Health" },
    { "id": "manage-proposals", "name": "Manage Proposals" }
  ],
  "capabilities": {
    "streaming": true,
    "pushNotifications": true
  }
}
```

### Agent Registry (Environment)

```bash
# .env - A2A Configuration
LITELLM_HOST="llm.collective.ai"
LITELLM_PORT="4000"
LITELLM_MASTER_KEY="sk-..."

# Agent endpoints
A2A_STEWARD="http://localhost:4000/a2a/steward"
A2A_TRIAD="http://localhost:4000/a2a/triad"
A2A_EXAMINER="http://localhost:4000/a2a/examiner"
A2A_EXPLORER="http://localhost:4000/a2a/explorer"
A2A_SENTINEL="http://localhost:4000/a2a/sentinel"
A2A_CODER="http://localhost:4000/a2a/coder"
```

---

## Communication Patterns

### 1. Proposal Flow (Triad Deliberation)

```
Explorer → [intel] → Triad → [deliberate] → Sentinel → [review] → Triad → [vote] → Coder
```

**A2A Implementation:**

```python
# Explorer delivers intel to Triad
from a2a.client import A2AClient

async def deliver_intel_to_triad(intel):
    client = A2AClient(agent_card=await get_agent_card('triad'))
    await client.send_message({
        'role': 'user',
        'parts': [{
            'kind': 'text',
            'text': f'[INTEL] {intel.content}'
        }]
    })
```

### 2. Question Flow (Examiner Questions)

```
Triad → [proposal] → Examiner → [questions] → Triad
```

**A2A Implementation:**

```python
# Examiner questions a proposal
async def question_proposal(proposal_id, question_type):
    client = A2AClient(agent_card=await get_agent_card('examiner'))
    await client.send_message({
        'role': 'user', 
        'parts': [{
            'kind': 'text',
            'text': f'[EXAMINE] proposal={proposal_id}, type={question_type}'
        }]
    })
```

### 3. Safety Review (Sentinel)

```
Triad → [ratified] → Sentinel → [review] → result → Triad
```

**A2A Implementation:**

```python
# Sentinel reviews ratified proposal
async def review_proposal(proposal_id, content):
    client = A2AClient(agent_card=await get_agent_card('sentinel'))
    response = await client.send_message({
        'role': 'user',
        'parts': [{
            'kind': 'text', 
            'text': f'[SAFETY REVIEW] proposal={proposal_id}\n\n{content}'
        }]
    })
    return response.message.parts[0].text
```

### 4. Implementation Request (Coder)

```
Triad → [ratified] → Coder → [implements] → result → Triad
```

**A2A Implementation:**

```python
# Coder implements ratified proposal
async def implement_proposal(proposal_id, specs):
    client = A2AClient(agent_card=await get_agent_card('coder'))
    response = await client.send_message({
        'role': 'user',
        'parts': [{
            'kind': 'text',
            'text': f'[IMPLEMENT] proposal={proposal_id}\n\n specs:\n{specs}'
        }]
    })
    return response.message.parts[0].text
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

## Migration Path

1. **Phase 1:** Deploy LiteLLM with A2A gateway
2. **Phase 2:** Register all 6 agents as A2A agents
3. **Phase 3:** Update triad-sync-protocol to use A2A
4. **Phase 4:** Replace Matrix messages with A2A
5. **Phase 5:** Keep Matrix/Discord as fallback only

---

## Configuration

Update `.env.example`:

```bash
# LiteLLM A2A Configuration
LITELLM_A2A_ENABLED="true"
A2A_DEFAULT_AGENT="steward"

# Agent endpoints
A2A_STEWARD_URL="http://localhost:4000/a2a/steward"
A2A_TRIAD_URL="http://localhost:4000/a2a/triad"
A2A_EXAMINER_URL="http://localhost:4000/a2a/examiner"
A2A_EXPLORER_URL="http://localhost:4000/a2a/explorer"
A2A_SENTINEL_URL="http://localhost:4000/a2a/sentinel"
A2A_CODER_URL="http://localhost:4000/a2a/coder"

# Fallback
FALLBACK_TO_MATRIX="true"
MATRIX_CHANNEL="triad-general"
```

---

## Summary

A2A provides:

| Feature | Benefit |
|---------|---------|
| Standardized Messages | All agents understand same format |
| Agent Discovery | No hardcoded agent URLs |
| Task Continuity | Context handoff between agents |
| Cost Tracking | Per-agent spend visibility |
| Logging | Full conversation history |
| Streaming | Real-time responses |

The Collective communicates via LiteLLM A2A gateway, with Matrix as fallback.