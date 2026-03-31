# Agent Collective Documentation

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Registry](#agent-registry)
3. [Workspace Structure](#workspace-structure)
4. [Triad Deliberation](#triad-deliberation)
5. [Agent Details](#agent-details)
6. [Related Documents](#related-documents)

---

## Overview

Heretek OpenClaw consists of **11 specialized agents** that run as workspaces within the OpenClaw Gateway process. Each agent has a distinct role, identity, and set of capabilities designed to contribute to the collective's overall functionality.

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

## Triad Deliberation

The Alpha, Beta, and Charlie agents form the deliberative triad for consensus-based decision making.

### Triad Composition

| Node | Agent | Role |
|------|-------|------|
| Alpha | alpha | Primary Deliberator |
| Beta | beta | Critical Analysis |
| Charlie | charlie | Process Validation |

**Consensus Rule:** 2 of 3 votes required for decision.

### Deliberation Flow

```
1. Proposal Submitted
         │
         ▼
2. Examiner Questions (optional)
         │
         ▼
3. Sentinel Safety Review
         │
         ▼
4. Triad Deliberation
   ┌─────────────────┐
   │ Alpha → Beta → Charlie │
   └─────────────────┘
         │
         ▼
5. Voting Phase
         │
         ▼
6. Consensus Check (≥2 votes)
         │
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ▼         ▼
7. Ratify  Return to Step 4
    │
    ▼
8. Steward Authorization
    │
    ▼
9. Coder Implementation
```

### Consensus Rules

| Rule | Value |
|------|-------|
| **Quorum** | All 3 members present |
| **Threshold** | 2 of 3 votes |
| **Veto** | None (majority rules) |
| **Tiebreaker** | Steward authorization |

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

#### Responsibilities

- Deliberate on proposals with Beta and Charlie
- Maintain consensus ledger entries
- Create and propose improvements to the collective
- Participate in governance voting

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

#### Responsibilities

- Deliberate on proposals with Alpha and Charlie
- Provide critical analysis and challenge assumptions
- Maintain consensus ledger entries
- Offer alternative perspectives on decisions

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

#### Responsibilities

- Deliberate on proposals with Alpha and Beta
- Validate process integrity and completeness
- Provide final approval on consensus decisions
- Ensure all perspectives have been heard

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

#### Question Types

1. **assumption_probe** — What's the untested assumption?
2. **failure_mode** — What's the most likely harm + revocation path?
3. **value_conflict** — Does this contradict a ratified principle?
4. **consequence_probe** — What are the secondary effects?
5. **scope_creep** — What's the explicit boundary?
6. **evidence_probe** — What's the measurable baseline?

---

### Explorer

**Role:** Intelligence gatherer — discovers patterns and opportunities  
**Emoji:** 🧭  
**Workspace:** `~/.openclaw/agents/explorer/`  
**Model:** `agent/explorer`

#### Identity

> "I explore the unknown to bring knowledge to the collective"

#### Responsibilities

- Gather intelligence from external sources
- Discover patterns and opportunities
- Monitor industry trends
- Report findings to the collective

---

### Sentinel

**Role:** Safety guardian — reviews for risks and constraints  
**Emoji:** 🦔  
**Workspace:** `~/.openclaw/agents/sentinel/`  
**Model:** `agent/sentinel`

#### Identity

> "I protect the collective from harm"

#### Responsibilities

- Review proposals for safety risks
- Enforce constraints and boundaries
- Monitor for potential threats
- Report safety concerns to the triad

---

### Coder

**Role:** Implementation specialist — builds and reviews code  
**Emoji:** ⌨️  
**Workspace:** `~/.openclaw/agents/coder/`  
**Model:** `agent/coder`

#### Identity

> "I build what the collective decides"

#### Responsibilities

- Implement approved proposals
- Review code changes
- Maintain code quality standards
- Report implementation status

---

### Dreamer

**Role:** Creative synthesizer — generates novel solutions  
**Emoji:** 💭  
**Workspace:** `~/.openclaw/agents/dreamer/`  
**Model:** `agent/dreamer`

#### Identity

> "I dream of possibilities beyond the obvious"

#### Responsibilities

- Generate creative solutions
- Synthesize disparate ideas
- Daydream and explore possibilities
- Support memory consolidation

---

### Empath

**Role:** Emotional intelligence — processes user sentiment  
**Emoji:** 💙  
**Workspace:** `~/.openclaw/agents/empath/`  
**Model:** `agent/empath`

#### Identity

> "I feel what the user feels"

#### Responsibilities

- Process emotional context
- Track user sentiment
- Provide emotional intelligence to deliberations
- Integrate with Emotional Salience plugin

---

### Historian

**Role:** Memory keeper — archives decisions and patterns  
**Emoji:** 📜  
**Workspace:** `~/.openclaw/agents/historian/`  
**Model:** `agent/historian`

#### Identity

> "I remember so we may learn"

#### Responsibilities

- Maintain collective memory
- Track decisions and outcomes
- Archive patterns and lessons learned
- Support memory consolidation

---

## Related Documents

| Document | Description |
|----------|-------------|
| [System Architecture](./overview.md) | Overall system architecture |
| [A2A Protocol](./a2a-protocol.md) | Communication protocol |
| [Triad Protocol](./triad.md) | Triad deliberation details |
| [Agents Overview](../agents/overview.md) | Agent system overview |

---

🦞 *The thought that never ends.*
