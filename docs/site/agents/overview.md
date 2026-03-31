# Agents Documentation Overview

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Registry](#agent-registry)
3. [Agent Categories](#agent-categories)
4. [Workspace Structure](#workspace-structure)
5. [Triad Deliberation](#triad-deliberation)
6. [Agent Documentation](#agent-documentation)
7. [Related Documents](#related-documents)

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
| [steward](./steward.md) | orchestrator | Orchestrator | 🦞 | `agent/steward` |
| [alpha](./alpha.md) | triad_member | Triad Node | 🔺 | `agent/alpha` |
| [beta](./beta.md) | triad_member | Triad Node | 🔷 | `agent/beta` |
| [charlie](./charlie.md) | triad_member | Triad Node | 🔶 | `agent/charlie` |
| [examiner](./examiner.md) | evaluator | Advocate | ❓ | `agent/examiner` |
| [explorer](./explorer.md) | researcher | Scout | 🧭 | `agent/explorer` |
| [sentinel](./sentinel.md) | safety | Advocate | 🦔 | `agent/sentinel` |
| [coder](./coder.md) | developer | Artisan | ⌨️ | `agent/coder` |
| [dreamer](./dreamer.md) | creative | Synthesizer | 💭 | `agent/dreamer` |
| [empath](./empath.md) | emotional | Relationship Manager | 💙 | `agent/empath` |
| [historian](./historian.md) | archivist | Memory Keeper | 📜 | `agent/historian` |

---

## Agent Categories

### Triad Nodes (3)

The deliberative core of the collective.

| Agent | Role | Description |
|-------|------|-------------|
| **Alpha** | Primary Deliberator | Synthesis and coordination |
| **Beta** | Critical Analysis | Challenge assumptions |
| **Charlie** | Process Validation | Ensure all perspectives heard |

**Consensus Rule:** 2 of 3 votes required for decisions.

### Advocates (2)

Agents that support the triad with specialized functions.

| Agent | Role | Description |
|-------|------|-------------|
| **Examiner** | Questioner | Asks challenging questions |
| **Sentinel** | Safety | Reviews for risks and constraints |

### Artisans (2)

Agents that build and create.

| Agent | Role | Description |
|-------|------|-------------|
| **Steward** | Orchestrator | Monitors collective health |
| **Coder** | Developer | Implements code |

### Synthesizers (2)

Agents that process and synthesize information.

| Agent | Role | Description |
|-------|------|-------------|
| **Dreamer** | Creative | Generates creative solutions |
| **Empath** | Emotional | Processes emotional context |

### Memory Keepers (1)

Agents that maintain collective memory.

| Agent | Role | Description |
|-------|------|-------------|
| **Historian** | Archivist | Maintains collective memory |

### Scouts (1)

Agents that gather intelligence.

| Agent | Role | Description |
|-------|------|-------------|
| **Explorer** | Researcher | Gathers intelligence |

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

### Consensus Rules

| Rule | Value |
|------|-------|
| **Quorum** | All 3 members present |
| **Threshold** | 2 of 3 votes |
| **Veto** | None (majority rules) |
| **Tiebreaker** | Steward authorization |

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

---

## Agent Documentation

| Agent | Documentation |
|-------|---------------|
| **Steward** | [Steward Agent](./steward.md) |
| **Alpha** | [Alpha Agent](./alpha.md) |
| **Beta** | [Beta Agent](./beta.md) |
| **Charlie** | [Charlie Agent](./charlie.md) |
| **Examiner** | [Examiner Agent](./examiner.md) |
| **Explorer** | [Explorer Agent](./explorer.md) |
| **Sentinel** | [Sentinel Agent](./sentinel.md) |
| **Coder** | [Coder Agent](./coder.md) |
| **Dreamer** | [Dreamer Agent](./dreamer.md) |
| **Empath** | [Empath Agent](./empath.md) |
| **Historian** | [Historian Agent](./historian.md) |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [System Architecture](../architecture/overview.md) | Overall system architecture |
| [A2A Protocol](../architecture/a2a-protocol.md) | Communication protocol |
| [Triad Protocol](../architecture/triad.md) | Triad deliberation details |
| [Plugins Overview](../plugins/overview.md) | Plugin system |

---

🦞 *The thought that never ends.*
