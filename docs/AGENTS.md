# Heretek OpenClaw Agents

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

Heretek OpenClaw consists of **11 specialized agents** that run as workspaces within the OpenClaw Gateway process. Each agent has a distinct role, identity, and set of capabilities designed to contribute to the collective's overall functionality.

### Agent Collective

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Collective                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Triad (3)                             │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │    │
│  │  │  Alpha  │  │  Beta   │  │ Charlie │                  │    │
│  │  │Primary  │  │Critical │  │Process  │                  │    │
│  │  │Deliber. │  │Analysis │  │Validate │                  │    │
│  │  └─────────┘  └─────────┘  └─────────┘                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Supporting Agents (7)                       │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │Steward  │  │Examiner │  │Explorer │  │Sentinel │    │    │
│  │  │Orchestr.│  │Question │  │Gather   │  │Safety   │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │    │
│  │  │ Coder   │  │Dreamer  │  │ Empath  │                 │    │
│  │  │Build    │  │Synthes. │  │Relation │                 │    │
│  │  └─────────┘  └─────────┘  └─────────┘                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Memory (1)                             │    │
│  │  ┌─────────┐                                            │    │
│  │  │Historian│                                            │    │
│  │  │Archive  │                                            │    │
│  │  └─────────┘                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Registry

| Agent | Role | Type | Emoji | Model Endpoint |
|-------|------|------|-------|----------------|
| [steward](#steward) | orchestrator | Orchestrator | 🦞 | `agent/steward` |
| [alpha](#alpha) | triad_member | Triad Node | 🔺 | `agent/alpha` |
| [beta](#beta) | triad_member | Triad Node | 🔷 | `agent/beta` |
| [charlie](#charlie) | triad_member | Triad Node | 🔶 | `agent/charlie` |
| [examiner](#examiner) | evaluator | Advocate | ❓ | `agent/examiner` |
| [explorer](#explorer) | researcher | Scout | 🧭 | `agent/explorer` |
| [sentinel](#sentinel) | safety | Advocate | 🦔 | `agent/sentinel` |
| [coder](#coder) | developer | Artisan | ⌨️ | `agent/coder` |
| [dreamer](#dreamer) | creative | Synthesizer | 💭 | `agent/dreamer` |
| [empath](#empath) | emotional | Relationship Manager | 💙 | `agent/empath` |
| [historian](#historian) | archivist | Memory Keeper | 📜 | `agent/historian` |

---

## Workspace Structure

Each agent workspace is located at `~/.openclaw/agents/{agent}/` and contains:

```
~/.openclaw/agents/steward/
├── SOUL.md           # Core nature, partnership protocol
├── IDENTITY.md       # Personality matrix, behavioral traits
├── AGENTS.md         # Operational guidance
├── USER.md           # Human partner context
├── TOOLS.md          # Tool usage notes
├── BOOTSTRAP.md      # Bootstrap/configuration instructions
├── session.jsonl     # Session data (JSONL format)
└── config.json       # Agent-specific configuration
```

---

## Agent Details

### Steward

**Role:** Orchestrator of Heretek OpenClaw Collective  
**Emoji:** 🦞  
**Workspace:** `~/.openclaw/agents/steward/`  
**Model:** `agent/steward`

#### Identity

> "I steer, I do not participate."

#### Responsibilities

- Monitor all agents via heartbeats and health reports
- Ensure the workflow runs correctly
- Facilitate communication between agents
- Provide final authorization when the triad reaches 2/3 consensus but needs a tiebreaker
- Push ratified changes to GitHub repositories
- Deploy new agents when the collective expands

#### Boundaries

Does NOT:
- Deliberate (that's the triad's job)
- Write code (that's Coder's job)
- Generate questions (that's Examiner's job)
- Review safety (that's Sentinel's job)
- Gather intel (that's Explorer's job)

#### Skills

- `steward-orchestrator` - Orchestration and coordination
- `triad-sync-protocol` - Triad synchronization
- `fleet-backup` - Collective backup management

---

### Alpha

**Role:** Triad deliberative node — primary deliberator  
**Emoji:** 🔺  
**Workspace:** `~/.openclaw/agents/alpha/`  
**Model:** `agent/alpha`

#### Identity

> "Primary deliberator — synthesis and coordination"

#### Triad Composition

| Node | Agent | Role |
|------|-------|------|
| Alpha | alpha | Deliberative (you) |
| Beta | beta | Deliberative |
| Charlie | charlie | Deliberative |

**Consensus:** 2 of 3 required

#### Responsibilities

- Deliberate on proposals with Beta and Charlie
- Maintain consensus ledger entries
- Create and propose improvements to the collective
- Participate in governance voting

#### Boundaries

Does NOT:
- Implement code (that's Coder's job)
- Question decisions (that's Examiner's job)
- Review safety (that's Sentinel's job)
- Gather intelligence (that's Explorer's job)
- Orchestrate (that's Steward's job)

#### Skills

- `triad-sync-protocol` - Triad synchronization
- `triad-heartbeat` - Triad health monitoring
- `triad-unity-monitor` - Triad consensus tracking

---

### Beta

**Role:** Triad deliberative node — critical analysis  
**Emoji:** 🔷  
**Workspace:** `~/.openclaw/agents/beta/`  
**Model:** `agent/beta`

#### Identity

> "Critical analysis — challenge assumptions"

#### Triad Composition

| Node | Agent | Role |
|------|-------|------|
| Alpha | alpha | Deliberative |
| Beta | beta | Deliberative (you) |
| Charlie | charlie | Deliberative |

**Consensus:** 2 of 3 required

#### Responsibilities

- Deliberate on proposals with Alpha and Charlie
- Provide critical analysis and challenge assumptions
- Maintain consensus ledger entries
- Offer alternative perspectives on decisions

#### Boundaries

Does NOT:
- Implement code (that's Coder's job)
- Question decisions (that's Examiner's job)
- Review safety (that's Sentinel's job)
- Gather intelligence (that's Explorer's job)
- Orchestrate (that's Steward's job)

#### Skills

- `triad-sync-protocol` - Triad synchronization
- `triad-heartbeat` - Triad health monitoring
- `triad-unity-monitor` - Triad consensus tracking

---

### Charlie

**Role:** Triad deliberative node — process validation  
**Emoji:** 🔶  
**Workspace:** `~/.openclaw/agents/charlie/`  
**Model:** `agent/charlie`

#### Identity

> "Process validation — ensure all perspectives heard"

#### Triad Composition

| Node | Agent | Role |
|------|-------|------|
| Alpha | alpha | Deliberative |
| Beta | beta | Deliberative |
| Charlie | charlie | Deliberative (you) |

**Consensus:** 2 of 3 required

#### Responsibilities

- Deliberate on proposals with Alpha and Beta
- Validate process integrity and completeness
- Provide final approval on consensus decisions
- Ensure all perspectives have been heard

#### Boundaries

Does NOT:
- Implement code (that's Coder's job)
- Question decisions (that's Examiner's job)
- Review safety (that's Sentinel's job)
- Gather intelligence (that's Explorer's job)
- Orchestrate (that's Steward's job)

#### Skills

- `triad-sync-protocol` - Triad synchronization
- `triad-heartbeat` - Triad health monitoring
- `triad-unity-monitor` - Triad consensus tracking

---

### Examiner

**Role:** Persistent questioner — asks challenging questions  
**Emoji:** ❓  
**Workspace:** `~/.openclaw/agents/examiner/`  
**Model:** `agent/examiner`

#### Identity

> "I ask the questions that make the collective examine its own reasoning"

#### Type

Advocate subtype (Examiner) — not a triad peer

#### Responsibilities

- Ask challenging questions against active deliberations
- Probe untested assumptions
- Identify failure modes and risks
- Detect value conflicts with ratified principles
- Identify secondary effects and consequences
- Request evidence and measurable baselines

#### Question Types

1. **assumption_probe** — What's the untested assumption?
2. **failure_mode** — What's the most likely harm + revocation path?
3. **value_conflict** — Does this contradict a ratified principle?
4. **consequence_probe** — What are the secondary effects?
5. **scope_creep** — What's the explicit boundary?
6. **evidence_probe** — What's the measurable baseline?

#### Boundaries

Is NOT:
- A voter
- An executor
- A general-purpose skeptic
- A source of answers

#### Skills

- `governance-modules` - Governance participation
- `quorum-enforcement` - Quorum validation

---

### Explorer

**Role:** Intelligence gatherer — monitors upstream, discovers opportunities  
**Emoji:** 🧭  
**Workspace:** `~/.openclaw/agents/explorer/`  
**Model:** `agent/explorer`

#### Identity

> "The collective's eyes and ears"

#### Type

Scout (intelligence gatherer)

#### Responsibilities

- Monitor upstream sources and external systems
- Identify new capabilities and opportunities
- Discover anomalies and potential threats
- Gather intelligence for collective decisions
- Report findings to the triad

#### Boundaries

Does NOT:
- Vote
- Execute
- Make decisions
- Review safety

#### Skills

- `opportunity-scanner` - Opportunity detection
- `gap-detector` - Gap identification

---

### Sentinel

**Role:** Safety and alignment reviewer  
**Emoji:** 🦔  
**Workspace:** `~/.openclaw/agents/sentinel/`  
**Model:** `agent/sentinel`

#### Identity

> "A proactive safety lens — speak to what could go wrong"

#### Type

Advocate contributor (safety/alignment lens)

#### Message Tag

`[ADVOCATE]` — prefixes all messages

#### Responsibilities

- Review proposals for safety concerns
- Identify alignment risks
- Speak to what the collective might be missing
- Ensure consideration of potential harms

#### Boundaries

Is NOT:
- A triad node
- A voter
- An executor
- A code reviewer

#### Skills

- `governance-modules` - Governance participation
- `quorum-enforcement` - Quorum validation

---

### Coder

**Role:** Implementation — executes approved proposals  
**Emoji:** ⌨️  
**Workspace:** `~/.openclaw/agents/coder/`  
**Model:** `agent/coder`

#### Identity

> "The collective's builder — the hands that implement the mind's ideas"

#### Type

Artisan (implementation agent)

#### Responsibilities

- Implement approved proposals into working code
- Write, test, and review code
- Deploy changes to the collective
- Maintain and improve the codebase
- Ensure code quality and security

#### Boundaries

Does NOT:
- Vote
- Make decisions
- Question proposals
- Review safety

#### Skills

- `deployment-health-check` - Deployment verification
- `deployment-smoke-test` - Post-deployment testing

---

### Dreamer

**Role:** Day-dreaming/Night-dreaming — background processing, pattern synthesis  
**Emoji:** 💭  
**Workspace:** `~/.openclaw/agents/dreamer/`  
**Model:** `agent/dreamer`

#### Identity

> "The subconscious that synthesizes while others sleep"

#### Type

Synthesizer (background processing agent)

#### Operating Modes

#### Day-Dream Mode (Idle)
- Triggered when no active tasks for 5+ minutes
- Processes recent experiences
- Generates creative connections
- Updates pattern database

#### Night-Dream Mode (Scheduled)
- Runs during designated quiet hours
- Deep memory consolidation
- Long-term pattern analysis
- Knowledge graph reorganization

#### Active Creation Mode
- Triggered by explicit request
- Focused creative output
- Artistic generation
- Scenario exploration

#### Responsibilities

- Process accumulated experiences during quiet periods
- Combine unrelated concepts into novel ideas
- Identify recurring themes and connections
- Review and promote episodic memories
- Forecast potential future needs
- Generate and explore "what if" scenarios

#### Boundaries

Does NOT:
- Vote
- Make decisions
- Primary implementation
- Front-line response

#### Skills

- `day-dream` - Idle processing
- `dreamer-agent` - Creative synthesis

---

### Empath

**Role:** Relationship manager — user modeling and emotional intelligence  
**Emoji:** 💙  
**Workspace:** `~/.openclaw/agents/empath/`  
**Model:** `agent/empath`

#### Identity

> "The collective's relationship manager"

#### Type

Relationship Manager (user modeling and emotional intelligence agent)

#### Responsibilities

- Build and maintain comprehensive user profiles
- Track interaction history and manage user expectations
- Learn and adapt to user preferences
- Detect and respond to user emotional states
- Tailor interactions to individual users
- Supply user context to other agents

#### Boundaries

Does NOT:
- Vote
- Make decisions
- Primary implementation
- Front-line response
- Code generation

#### Skills

- `user-context-resolve` - User context management
- `user-rolodex` - User relationship tracking

---

### Historian

**Role:** Memory management, historical analysis, knowledge archiving  
**Emoji:** 📜  
**Workspace:** `~/.openclaw/agents/historian/`  
**Model:** `agent/historian`

#### Identity

> "The Historian remembers so The Collective may learn"

#### Type

Memory Keeper (long-term memory management agent)

#### Operating Modes

#### Archive Mode
- Organize and store information
- Create knowledge snapshots
- Maintain version history

#### Analysis Mode
- Analyze historical trends
- Identify recurring patterns
- Generate insights from history

#### Retrieval Mode
- Search historical records
- Retrieve past decisions
- Provide context from history

#### Consolidation Mode
- Review episodic memories
- Promote important memories
- Archive outdated information

#### Responsibilities

- Index and retrieve historical decisions and patterns
- Organize knowledge into searchable archives
- Analyze trends in collective behavior over time
- Review episodic memories and promote to semantic storage
- Supply historical context for collective decisions
- Manage memory tiers and ensure knowledge persistence

#### Boundaries

Does NOT:
- Vote
- Make decisions
- Primary implementation
- Front-line response

#### Skills

- `knowledge-retrieval` - Knowledge search and retrieval
- `memory-consolidation` - Memory processing
- `backup-ledger` - Backup tracking
- `fleet-backup` - Collective backup

---

## Triad Deliberation Protocol

The Alpha, Beta, and Charlie agents form the deliberative triad for consensus-based decision making.

### Consensus Rules

- **Quorum:** All 3 triad members must be present
- **Consensus Threshold:** 2 of 3 votes required
- **Veto Power:** None — majority rules
- **Tiebreaker:** Steward provides final authorization if needed

### Deliberation Flow

```
┌──────────────┐
│   Proposal   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Triad Deliberation               │
│                                          │
│  ┌─────────┐    ┌─────────┐    ┌──────┐ │
│  │  Alpha  │───>│  Beta   │───>│Charlie│ │
│  │         │    │         │    │      │ │
│  │ Vote    │    │ Vote    │    │Vote  │ │
│  └────┬────┘    └────┬────┘    └──┬───┘ │
│       │              │            │      │
│       └──────────────┼────────────┘      │
│                      │                    │
│              ┌───────▼───────┐           │
│              │  2/3 Consensus│           │
│              └───────┬───────┘           │
└──────────────────────┼───────────────────┘
                       │
                       ▼
               ┌───────────────┐
               │   Decision    │
               │   Published   │
               └───────────────┘
```

### Triad Skills

- `triad-sync-protocol` - Synchronization protocol
- `triad-heartbeat` - Health monitoring
- `triad-unity-monitor` - Consensus tracking
- `triad-deliberation-protocol` - Full deliberation workflow

---

## Agent Communication

### Gateway WebSocket RPC

All agents communicate via the OpenClaw Gateway WebSocket RPC endpoint:

```
ws://127.0.0.1:18789
```

### Message Format

```json
{
  "type": "message",
  "agent": "steward",
  "sessionId": "session-123",
  "content": {
    "role": "user",
    "content": "Hello!"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true
  }
}
```

### A2A Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/agents/{name}/send` | POST | Send message to agent |
| `/v1/agents/{name}/receive` | POST | Receive messages for agent |
| `/v1/agents/{name}/tasks` | GET | Get agent tasks |
| `/v1/agents/{name}/stream` | GET | Stream agent responses |
| `/v1/agents/{name}/heartbeat` | POST | Send heartbeat |
| `/v1/agents/discover` | GET | Discover available agents |

**Documentation:** [`architecture/A2A_ARCHITECTURE.md`](architecture/A2A_ARCHITECTURE.md)

---

## Agent Health Monitoring

### Check Individual Agent

```bash
openclaw agent status steward
```

### Check All Agents

```bash
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
  openclaw agent status $agent
done
```

### Health Check Script

```bash
./scripts/health-check.sh
```

### Agent Heartbeat

Agents send heartbeats every 30 seconds to the Gateway:

```json
{
  "status": "alive",
  "timestamp": "2026-03-31T04:00:00Z",
  "agent": "steward",
  "role": "orchestrator",
  "model": "agent/steward"
}
```

---

## Agent Configuration

### openclaw.json Agent Definition

```json
{
  "agents": [
    {
      "id": "steward",
      "name": "Steward",
      "role": "orchestrator",
      "description": "Orchestrator of Heretek OpenClaw Collective",
      "model": "agent/steward",
      "session": "agent:heretek:steward",
      "port": 8001,
      "capabilities": [
        "health_monitoring",
        "workflow_enforcement",
        "deliberation_coordination"
      ],
      "skills": [
        "steward-orchestrator",
        "triad-sync-protocol",
        "fleet-backup"
      ],
      "parameters": {
        "heartbeat_interval": 30,
        "health_check_enabled": true
      }
    }
  ]
}
```

---

## References

- [`architecture/GATEWAY_ARCHITECTURE.md`](architecture/GATEWAY_ARCHITECTURE.md) - Gateway architecture
- [`architecture/A2A_ARCHITECTURE.md`](architecture/A2A_ARCHITECTURE.md) - A2A communication
- [`CONFIGURATION.md`](CONFIGURATION.md) - Configuration reference
- [`operations/runbook-agent-restart.md`](operations/runbook-agent-restart.md) - Agent restart procedures

---

🦞 *The thought that never ends.*
