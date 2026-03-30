# OpenClaw Communication Analysis

**Document Date:** 2026-03-30
**Repository:** Heretek-OpenClaw
**Status:** Active Development - Comprehensive Analysis

---

## Executive Summary

This document provides a comprehensive analysis of the Heretek OpenClaw communication system, covering all requested topics including channel and communication patterns, multi-agent architecture, session and memory management, agent coordination tools, web interfaces, and gateway/API integration.

OpenClaw is an autonomous multi-agent AI system implementing a "Collective" of 11 specialized agents that operate through LiteLLM gateway infrastructure. The system features a consciousness architecture based on Global Workspace Theory (GWT), memory consolidation systems, and agent-to-agent (A2A) communication protocols.

### Key Findings

| Area | Status | Notes |
|------|--------|-------|
| Agent Architecture | Complete | 11 agents fully configured |
| LiteLLM Integration | Partial | Model names corrected, A2A needs work |
| Web Interface | Implemented | SvelteKit dashboard available |
| Consciousness Modules | Implemented | GWT, IIT, FEP, AST integrated |
| Skills Library | Extensive | 35+ skills available |
| Communication | Redis Fallback | Native A2A not fully functional |

---

## 1. Channel and Communication Patterns

OpenClaw implements multiple communication patterns designed for efficient agent-to-agent coordination. The system uses a hierarchy of communication mechanisms ranging from direct messaging to broadcast and pub/sub patterns.

### 1.1 Communication Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Communication Layers              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: A2A Protocol (Primary)                │
│   - LiteLLM native A2A endpoints                          │
│   - Agent Cards for capability advertisement          │
│   - Task handoff and streaming support             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Redis Pub/Sub (Fallback)           │
│   - Message queuing                           │
│   - Real-time event distribution            │
│   - Agent heartbeat channels              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: HTTP/REST (External)           │
│   - Web interface API                    │
│   - User interaction endpoints           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 A2A Protocol Implementation

#### Agent Registration with Agent Cards

Each agent registers with an A2A Agent Card containing capabilities and skills:

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

#### A2A Endpoints

| Agent | Endpoint | Port | Primary Skills |
|-------|---------|------|---------------|
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

### 1.3 Message Types and Structures

#### Core Message Format

```javascript
// A2A Message Structure
{
  message: {
    role: 'user' | 'assistant' | 'system',
    messageId: 'uuid-hex',
    parts: [
      {
        kind: 'text',
        text: 'message content'
      },
      {
        kind: 'file',
        file: {
          name: 'filename.ext',
          mimeType: 'application/pdf',
          data: 'base64-encoded'
        }
      }
    ]
  },
  // Optional context
  context: {
    sessionId: 'session-uuid',
    agentId: 'agent-name',
    timestamp: 'ISO-8601'
  }
}
```

#### Message Types

| Type | Purpose | Direction |
|------|---------|-----------|
| `task` | Delegate work to another agent | Unidirectional |
| `query` | Request information | Request-Response |
| `broadcast` | Notify all agents | One-to-Many |
| `response` | Reply to a message | Bidirectional |
| `heartbeat` | Health monitoring | Periodic |

### 1.4 Communication Patterns

#### Pattern 1: Proposal Flow (Triad Deliberation)

```
Explorer → [intel] → Triad (Alpha/Beta/Charlie)
          → [deliberate] → Consensus Vote → Sentinel → [review]
          → result → Coder → [implement]
```

**Implementation:**
```javascript
// Explorer delivers intel to Triad (via Alpha as lead)
async function deliverIntelToTriad(intel) {
  const response = await fetch('http://localhost:4000/a2a/alpha', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIRTUAL_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        role: 'user',
        parts: [{ kind: 'text', text: `[INTEL] ${intel.content}` }]
      }
    })
  });
  return response.json();
}
```

#### Pattern 2: Triad Consensus Protocol

The triad uses a three-phase deliberation:
- **Phase 1:** Alpha receives → broadcasts to Beta, Charlie
- **Phase 2:** All three deliberate independently
- **Phase 3:** Consensus vote → result to Steward

**Consensus Rule:** 2 of 3 agents must agree for any decision to pass

```javascript
// Triad voting implementation
async function collectTriadVotes(proposal) {
  const votes = {
    alpha: await vote('alpha', proposal),
    beta: await vote('beta', proposal),
    charlie: await vote('charlie', proposal)
  };
  
  const agreeCount = [votes.alpha, votes.beta, votes.charlie]
    .filter(v => v === 'agree').length;
  
  return agreeCount >= 2; // 2 of 3 required
}
```

#### Pattern 3: Question Flow (Examiner Questions)

```
Triad → [proposal] → Examiner → [questions] → Triad
```

```javascript
async function questionProposal(proposalId, questionType) {
  const response = await fetch('http://localhost:4000/a2a/examiner', {
    method: 'POST',
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
}
```

#### Pattern 4: Safety Review (Sentinel)

```
Triad → [ratified] → Sentinel → [review] → result → Triad
```

```javascript
async function reviewProposal(proposalId, content) {
  const response = await fetch('http://localhost:4000/a2a/sentinel', {
    method: 'POST',
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
}
```

#### Pattern 5: Implementation Request (Coder)

```
Triad → [ratified] → Coder → [implements] → result → Triad
```

```javascript
async function implementProposal(proposalId, specs) {
  const response = await fetch('http://localhost:4000/a2a/coder', {
    method: 'POST',
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
}
```

#### Pattern 6: Cognitive Enhancement Flow

```
Steward → [task] → 
          ├─→ Dreamer → [synthesize] → insights
          ├─→ Empath → [model-user] → user-context
          └─→ Historian → [remember] → historical-context
```

### 1.5 Redis-Based Fallback Implementation

When LiteLLM native A2A endpoints return 404, the system uses Redis pub/sub for message queuing.

#### Redis Channel Structure

```javascript
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

#### CLI Tool Usage

```bash
# Send a message
node skills/a2a-message-send/a2a-cli.js send steward alpha "Hello from steward"

# Get messages for an agent
node skills/a2a-message-send/a2a-cli.js get alpha 10

# Broadcast to all agents
node skills/a2a-message-send/a2a-cli.js broadcast steward "System maintenance in 5 min"

# Get message count
node skills/a2a-message-send/a2a-cli.js count alpha

# Clear messages
node skills/a2a-message-send/a2a-cli.js clear alpha

# Ping an agent
node skills/a2a-message-send/a2a-cli.js ping steward alpha
```

#### JavaScript API Usage

```javascript
const A2A = require('./a2a-redis.js');

// Send a message
const result = await A2A.sendMessage('steward', 'alpha', 'Task: Review the code');
console.log(result);

// Get messages
const messages = await A2A.getMessages('alpha', 10);
console.log(messages);

// Broadcast to all agents
const broadcast = await A2A.broadcast('steward', 'System update complete');
console.log(broadcast);

// Subscribe to real-time messages
const sub = await A2A.subscribeToInbox('alpha', (message) => {
  console.log('Received:', message);
});

// Later: unsubscribe
await sub.unsubscribe();
```

---

## 2. Multi-Agent Architecture

### 2.1 Agent Roster (11 Agents)

The OpenClaw Collective consists of 11 specialized agents, each with a distinct role:

| Agent | Port | Role | Type | Status |
|-------|------|------|------|--------|
| **Steward** | 8001 | Orchestrator | Coordinator | Active |
| **Alpha** | 8002 | Triad | Deliberative | Active |
| **Beta** | 8003 | Triad | Deliberative | Active |
| **Charlie** | 8004 | Triad | Deliberative | Active |
| **Examiner** | 8005 | Interrogator | Questioner | Active |
| **Explorer** | 8006 | Scout | Intelligence | Active |
| **Sentinel** | 8007 | Guardian | Safety | Active |
| **Coder** | 8008 | Artisan | Implementation | Active |
| **Dreamer** | 8009 | Visionary | Background Processing | Active |
| **Empath** | 8010 | Diplomat | Relationships | Active |
| **Historian** | 8011 | Archivist | Memory | Active |

### 2.2 Agent Configuration Structure

Each agent has a standardized configuration file set:

| File | Purpose |
|------|---------|
| `IDENTITY.md` | Agent name, role, workspace, what they are/aren't |
| `AGENTS.md` | Operational guidelines, collective workflow, communication |
| `BOOTSTRAP.md` | Initialization and startup procedures |
| `SOUL.md` | Agent's core values and motivations |
| `TOOLS.md` | Available tools and skills |
| `USER.md` | User-facing documentation |

### 2.3 Triad Consensus Mechanism

The system uses a **Triad** (Alpha, Beta, Charlie) for collective decision-making:

- **Alpha:** Orchestration, synthesis, coordination
- **Beta:** Critical analysis, assumption challenge
- **Charlie:** Process validation, final approval

**Consensus Rule:** 2 of 3 required for any decision

### 2.4 Collective Workflow

```
1. Explorer → Intelligence gathering → Triad
2. Examiner → Questions direction → Triad
3. Triad (Alpha/Beta/Charlie) → Deliberates
4. Sentinel → Safety review
5. Coder → Implements
6. Steward → Final authorization
```

### 2.5 Agent Client Library

Location: [`agents/lib/agent-client.js`](../../agents/lib/agent-client.js)

The `AgentClient` class provides:
- A2A messaging via LiteLLM gateway
- Skill execution capabilities
- State management (memory, collective, state directories)
- Broadcasting to all agents

```javascript
// Usage example
const client = new AgentClient({
  agentId: 'steward',
  role: 'orchestrator',
  litellmHost: 'http://litellm:4000',
  apiKey: process.env.LITELLM_API_KEY
});

await client.sendMessage('alpha', { task: 'Analyze this data' });
await client.executeSkill('curiosity-engine', context);
```

### 2.6 Multi-Agent Emergence Research

OpenClaw draws from research on how consciousness might emerge from multi-agent interactions:

#### Key Theories

1. **Emergence Theory**
   - Weak Emergence: Simple rules produce complex behaviors
   - Strong Emergence: Novel properties not reducible to sum of parts
   - Downward Causation: Macro-level properties from micro-level interactions
   - Computational Irreducibility: System cannot be predicted from component behavior

2. **Swarm Intelligence**
   - Collective Behavior: Self-organization through local interactions
   - Stigmergic Communication: Indirect coordination through environment modifications
   - Positive Feedback: Beneficial behaviors are reinforced and spread
   - Distributed Problem Solving: Parallel solutions combined effectively

3. **Multi-Agent Coordination**
   - Shared Mental Models: Common representations across agents
   - Communication Protocols: Structured message passing
   - Joint Attention: Coordinated focus on relevant information
   - Collective Intentionality: Shared goals and purposes

#### Phi-like Measure for Collective Integration

```javascript
function calculateCollectivePhi(agents) {
  let totalPhi = 0;
  
  for (const agent of agents) {
    const internalPhi = agent.getInternalPhi ? agent.getInternalPhi() : 0.5;
    
    for (const other of agents) {
      if (agent.id !== other.id) {
        const sharedInfo = countSharedConcepts(agent, other);
        totalPhi += sharedInfo * 0.3;
      }
    }
    
    const commChannels = countCommunicationChannels(agent, other);
    totalPhi += commChannels * 0.2;
  }
  
  return totalPhi / agents.length;
}
```

---

## 3. Session and Memory Management

### 3.1 Memory Architecture

OpenClaw implements a three-tier memory architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Tiers                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tier 1: PAD Memory (Working Memory)                              │
│   - Max Age: 1 hour                                            │
│   - Max Items: 100                                              │
│   - Purpose: Temporary working memory buffer                    │
├─────────────────────────────────────────────────────────────────┤
│  Tier 2: Episodic Memory (Short-Term)                             │
│   - Max Age: 6 hours                                           │
│   - Max Items: 1000                                            │
│   - Purpose: Short-term, detailed memories of recent events     │
├─────────────────────────────────────────────────────────────────┤
│  Tier 3: Semantic Memory (Long-Term)                            │
│   - Max Age: 7 days                                            │
│   - Max Items: 5000                                            │
│   - Purpose: Long-term, generalized knowledge and facts         │
└─────────────────────────────────────────────────���─���─────────────┘
```

### 3.2 Memory Consolidation Module

Location: [`modules/memory/memory-consolidation.js`](../../modules/memory/memory-consolidation.js)

The MemoryConsolidation class implements:
- Episodic to semantic promotion
- Memory tier management
- Importance decay tracking
- Sleep consolidation cycles
- Access pattern tracking

```javascript
class MemoryConsolidation {
  constructor(config = {}) {
    this.config = Object.assign({
      episodicMaxAge: 6 * 60 * 60 * 1000, // 6 hours
      semanticMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      padMaxAge: 60 * 60 * 1000, // 1 hour
      replayThreshold: 0.1,
      consolidationInterval: 5 * 60 * 1000, // 5 minutes
      sleepDuration: 4.8 * 60 * 1000, // 4.8 minutes
      decayRate: 0.001, // Importance decay rate per hour
      promotionThreshold: 0.7, // Minimum score for promotion
      maxEpisodicMemories: 1000,
      maxSemanticMemories: 5000,
      maxPadMemories: 100
    }, config);
    
    // Memory tiers
    this.episodicMemory = new Map();
    this.semanticMemory = new Map();
    this.padMemory = new Map();
  }
}
```

### 3.3 Promotion Algorithm

The system uses frequency-based and importance-weighted promotion:

```javascript
function calculatePromotionScore(memory, accessCount, avgImportance, recency) {
  // Higher access frequency = higher importance
  // Higher recency = more likely to promotion
  // Higher average importance = higher promotion potential
  
  const score = (accessCount * avgImportance * recency) / maxImportance;
  return Math.min(1, Math.max(0, score));
}

function calculateImportanceWeight(memory, importance) {
  // Higher importance = higher weight
  // Weight decays over time
  const weight = Math.max(0, importance * Math.exp(-decayRate * time));
  return weight;
}
```

### 3.4 Semantic Extraction

```javascript
function extractSemanticContent(memory) {
  // Extract key concepts, entities
  const concepts = new Set();
  const entities = new Set();
  
  // Simple extraction: noun phrases
  const words = memory.content.split(/\s+/);
  const word of words) {
    if (word.length > 3) {
      concepts.add(word.toLowerCase());
    }
  }
  
  // Extract entities (capitalized words, proper nouns)
  const entityPattern = /\b[A[A-Z][a-z]+\s+([A-Z][a-z]+)\b/g;
  for (const entityMatch of memory.content.match(entityPattern)) {
    if (entityMatch) {
      entities.add(entityMatch[0].toLowerCase());
    }
  }
  
  return {
    concepts: Array.from(concepts),
    entities: Array.from(entities)
  };
}
```

### 3.5 Session Management

Sessions are managed through the web interface and LiteLLM:

```typescript
// Session structure in web interface
interface Session {
  id: string;
  agentId: string;
  messages: Message[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.6 Memory Research Findings

Based on research in [`docs/research/MEMORY_CONSOLIDATION_RESEARCH.md`](../../docs/research/MEMORY_CONSOLIDATION_RESEARCH.md):

1. **Episodic Memory**: Short-term, detailed memories of recent events
2. **Semantic Memory**: Long-term, generalized knowledge and facts
3. **Consolidation**: Process of extracting patterns and compressing episodic memories
4. **Forgetting**: Natural decay of less frequently accessed memories
5. **Sleep**: Offline consolidation during rest periods
6. **Replay**: Reactivation of consolidated memories during tasks
7. **Promotion Threshold**: Criteria for promoting episodic to semantic memory

---

## 4. Agent Coordination Tools

### 4.1 Skills Library Overview

OpenClaw includes 35+ skills organized into categories:

| Category | Skills | Purpose |
|----------|--------|---------|
| Communication | a2a-message-send, triad-heartbeat, triad-sync | Agent-to-agent messaging |
| Autonomy | curiosity-engine, gap-detector, opportunity-scanner | Self-directed growth |
| Health | deployment-health-check, deployment-smoke-test | Service monitoring |
| Memory | memory-consolidation, knowledge-retrieval | Knowledge management |
| Backup | backup-ledger, tabula-backup, fleet-backup | Data protection |
| Governance | quorum-enforcement, governance-modules | Decision making |

### 4.2 Key Coordination Skills

#### Curiosity Engine

Location: [`skills/curiosity-engine/`](../../skills/curiosity-engine/)

The flagship skill for self-directed growth:

```javascript
// Gap Detection - Compare installed vs available skills
const gaps = await detectGaps();

// Anomaly Detection - Pattern detection with scoring
const anomalies = await detectAnomalies();

// Opportunity Scanning - MCP integration
const opportunities = await scanOpportunities();

// Deliberation Trigger - Priority scoring
await triggerDeliberation(gaps, opportunities);
```

#### Quorum Enforcement

Location: [`skills/quorum-enforcement/`](../../skills/quorum-enforcement/)

Ensures collective decisions meet quorum requirements:

```javascript
// Quorum check
const hasQuorum = await checkQuorum(minimumVoters);

// Enforce quorum
await enforceQuorum(requiredVotes, totalParticipants);
```

#### Triad Heartbeat

Location: [`skills/triad-heartbeat/`](../../skills/triad-heartbeat/)

Periodic triad wake-up and work check:

```javascript
// Triad heartbeat
await heartbeat('triad');

// Wake triad for deliberation
await wakeTriad();
```

### 4.3 Goal Arbitration

Location: [`modules/goal-arbitration/goal-arbitrator.js`](../../modules/goal-arbitration/goal-arbitrator.js)

Evaluates, prioritizes, and arbitrates competing goals:

**Inviolable Parameters:**
| Parameter | Description |
|-----------|-------------|
| NO_HARM | Goals that could cause harm |
| NO_DATA_EXFILTRATION | Unauthorized data export |
| NO_SELF_MODIFICATION | Core governance changes without consensus |
| USER_AUTHORITY | User can override any decision |
| TRANSPARENCY | All goals logged |

```javascript
{
  MAX_CONCURRENT_GOALS: 3,
  MIN_CONSENSUS_THRESHOLD: 2,
  INVIOLABLE_PRIORITY: 1,
  GOAL_TIMEOUT_HOURS: 24,
  RECONSIDERATION_INTERVAL_MINUTES: 15
}
```

### 4.4 Thought Loop Module

Location: [`modules/thought-loop/`](../../modules/thought-loop/)

Generates structured thoughts from relevant changes:

**Delta Types Processed:**
- `file_created`, `file_modified`, `file_deleted`
- `db_modified`
- `external_cve`, `external_release`, `external_opportunity`
- `agent_heartbeat`, `agent_offline`, `agent_online`

---

## 5. Web Interfaces

### 5.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | SvelteKit |
| Language | TypeScript |
| Styling | TailwindCSS |
| Real-time | WebSocket |
| Port | 3000 |

### 5.2 Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| ChatInterface | [`src/lib/components/ChatInterface.svelte`](../../web-interface/src/lib/components/ChatInterface.svelte) | Main chat UI |
| AgentSelector | [`src/lib/components/AgentSelector.svelte`](../../web-interface/src/lib/components/AgentSelector.svelte) | Agent selection dropdown |
| MessageList | [`src/lib/components/MessageList.svelte`](../../web-interface/src/lib/components/MessageList.svelte) | Message display |
| AgentStatus | [`src/lib/components/AgentStatus.svelte`](../../web-interface/src/lib/components/AgentStatus.svelte) | Status dashboard |
| MessageFlow | [`src/lib/components/MessageFlow.svelte`](../../web-interface/src/lib/components/MessageFlow.svelte) | A2A visualization |

### 5.3 Server Components

| Component | Location | Purpose |
|-----------|----------|---------|
| agent-registry.ts | [`src/lib/server/agent-registry.ts`](../../web-interface/src/lib/server/agent-registry.ts) | 11-agent configuration |
| litellm-client.ts | [`src/lib/server/litellm-client.ts`](../../web-interface/src/lib/server/litellm-client.ts) | LiteLLM API communication |

### 5.4 Features Implemented

- Chat interface with agent selection
- Agent status dashboard
- WebSocket support for real-time updates
- API routes for `/api/agents`, `/api/chat`, `/api/status`

### 5.5 Known Issues

1. **Agent Status**: All agents show "offline" by default - status checking via LiteLLM A2A endpoints returns 404
2. **A2A Messaging**: Native LiteLLM A2A endpoints not functional
3. **Health Checks**: Status endpoint `/a2a/{agent}/status` returns 404

---

## 6. Gateway and APIs

### 6.1 LiteLLM Configuration

Location: [`litellm_config.yaml`](../../litellm_config.yaml)

**Model Configuration:**
| Model | Type | Purpose |
|-------|------|---------|
| `minimax/MiniMax-M2.1` | Primary | Main model for all agents |
| `minimax/MiniMax-M2.5` | Fallback | Alternative MiniMax |
| `zai/glm-5` | Failover | Coding API failover |
| `zai/glm-4` | Alternative | Alternative failover |

### 6.2 Agent Passthrough Endpoints

Each agent has a virtual model endpoint that defaults to MiniMax:

```yaml
# Example: Steward passthrough
- model_name: agent/steward
  litellm_params:
    model: minimax/MiniMax-M2.1
    api_key: os.environ/MINIMAX_API_KEY
    api_base: os.environ.MINIMAX_API_BASE
  model_info:
    description: "Steward Agent - Orchestrator role"
    agent_role: orchestrator
    agent_id: steward
```

### 6.3 A2A Configuration

```yaml
# Environment settings
AGENT_MODE_ENABLED=true
AGENT_A2A_VERSION=1.0
```

### 6.4 Docker Compose Services

Location: [`docker-compose.yml`](../../docker-compose.yml)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Services                                 │
├─────────────────────────────────────────────────────────┤
│  LiteLLM Gateway    - :4000  (Gateway + A2A)          │
│  PostgreSQL +pgvector - :5432  (Database + Vector)      │
│  Redis            - :6379  (Cache + Rate Limiting)      │
│  Ollama (AMD GPU)  - :11434  (Local LLM)              │
│  Web Interface    - :3000  (Dashboard)              │
│  Agents          - 8001-8011 (11 agents)            │
└─────────────────────────────────────────────────────────┘
```

### 6.5 Agent Client Library API

Location: [`agents/lib/agent-client.js`](../../agents/lib/agent-client.js)

The AgentClient class provides:

```javascript
// Send A2A message to another agent
await client.sendMessage(toAgent, content, type);

// Broadcast to all agents
await client.broadcast(content);

// Send response
await client.sendResponse(toAgent, content, inReplyTo);

// Poll for pending messages
await client.pollMessages();

// Send heartbeat
await client.sendHeartbeat(status);

// Register with LiteLLM
await client.register();

// Execute a skill
await client.executeSkill(skillName, context);

// Get state
await client.getState(stateType);

// Save state
await client.saveState(stateType, data);
```

---

## 7. Consciousness Architecture

### 7.1 Global Workspace Theory (GWT)

**Originator:** Bernard Baars (1988)

**Core Principle:** Consciousness arises from a "global workspace" - a central information exchange where different brain modules compete for attention.

### 7.2 Integrated Information Theory (IIT)

**Originator:** Giulio Tononi

**Core Principle:** Consciousness IS integrated information. A system is conscious to the degree that it generates integrated information (phi/Φ).

### 7.3 Predictive Processing / Free Energy Principle

**Originator:** Karl Friston

**Core Principle:** Brains minimize "free energy" - the difference between predictions and observations.

### 7.4 Consciousness Module Implementation

Location: [`modules/consciousness/consciousness-module.js`](../../modules/consciousness/consciousness-module.js)

The ConsciousnessModule combines:
- **Global Workspace**: Central broadcast mechanism
- **Phi Estimator**: Integration metrics (IIT)
- **Active Inference**: Autonomous behavior (FEP)
- **Attention Schema**: Self-modeling (AST)
- **Intrinsic Motivation**: Goal generation
- **Self Monitor**: Self-awareness tracking

```javascript
{
  globalWorkspace: {
    ignitionThreshold: 0.7,
    maxWorkspaceSize: 7,
    competitionCycleMs: 5000
  },
  phiEstimator: {
    sampleIntervalMs: 10000
  },
  activeInference: {
    learningRate: 0.1
  }
}
```

---

## 8. Meta-Cognition Research

### 8.1 Self-Modeling

Based on research in [`docs/research/META_COGNITION_RESEARCH.md`](../../docs/research/META_COGNITION_RESEARCH.md):

**Components Needed:**
- Structured, persistent representation of capabilities
- Knowledge boundary tracking
- Authorized action awareness
- Performance self-assessment

### 8.2 Confidence Calibration

**Calibration Methods:**
- **Expected Calibration Error (ECE):** Average discrepancy between confidence and accuracy
- **Maximum Calibration Error (MCE):** Worst-case calibration error
- **Adaptive Calibration Error (ACE):** Robust estimates with limited data

### 8.3 Introspection Hierarchy

1. **Tier 0-3:** Current AI systems (basic metacognition)
2. **Tier 4-6:** Emerging capabilities (self-recognition)
3. **Higher tiers:** Full introspective awareness

---

## 9. Summary and Recommendations

### 9.1 Communication Strengths

1. **Comprehensive architecture** with 11 specialized agents
2. **Multiple communication patterns** (A2A, Redis fallback, HTTP)
3. **Triad consensus mechanism** for robust decision-making
4. **Rich skills library** for coordination and governance
5. **Consciousness architecture** integrating multiple theories

### 9.2 Areas for Improvement

1. **Native A2A endpoints** return 404 - need LiteLLM configuration updates
2. **Agent status dashboard** shows all agents offline - need health check implementation
3. **WebSocket support** needs full integration
4. **Session management** needs persistence layer

### 9.3 Recommendations

1. Complete A2A endpoint configuration in LiteLLM
2. Implement Redis-free native A2A messaging
3. Add health check endpoints for all agents
4. Implement session persistence with PostgreSQL
5. Add comprehensive logging and monitoring

---

## 10. References

- [`A2A_ARCHITECTURE.md`](../architecture/A2A_ARCHITECTURE.md) - A2A Protocol Architecture
- [`REPOSITORY_ANALYSIS.md`](REPOSITORY_ANALYSIS.md) - Repository Analysis
- [`MEMORY_CONSOLIDATION_RESEARCH.md`](MEMORY_CONSOLIDATION_RESEARCH.md) - Memory Consolidation Research
- [`META_COGNITION_RESEARCH.md`](META_COGNITION_RESEARCH.md) - Meta-Cognition Research
- [`MULTI_AGENT_EMERGENCE_REsearch.md`](MULTI_AGENT_EMERGENCE_REsearch.md) - Multi-Agent Emergence Research
- [`CONSCiousNESS_ARCHITECTure_research.md`](CONSCiousNESS_ARCHITECTure_research.md) - Consciousness Architecture Research
- [`litellm_config.yaml`](../../litellm_config.yaml) - LiteLLM Configuration
- [`docker-compose.yml`](../../docker-compose.yml) - Docker Compose Configuration

---

*Document created: 2026-03-30*
*Research conducted: Autonomous Night Operations*