# Agent Creation Guide

This guide documents the standard process for creating new agents in the Heretek OpenClaw collective.

## Table of Contents

1. [Overview](#overview)
2. [Agent File Structure](#agent-file-structure)
3. [Required Files](#required-files)
4. [Optional Files](#optional-files)
5. [File Templates](#file-templates)
6. [Best Practices](#best-practices)
7. [Agent Registration](#agent-registration)

---

## Overview

Each agent in the Heretek OpenClaw collective is defined by a set of documentation files that establish its identity, capabilities, and initialization procedures. This guide provides the standard structure and templates for creating new agents.

### Agent Types

| Type | Description | Examples |
|------|-------------|----------|
| Orchestrator | Steers the collective, manages workflows | Steward, Coordinator |
| Triad Node | Participates in consensus deliberation | Alpha, Beta, Charlie |
| Advocate | Provides specific lenses on decisions | Sentinel, Examiner |
| Specialist | Performs specific operational roles | Coder, Explorer, Historian |
| Support | Provides auxiliary capabilities | Dreamer, Empath, Echo |

---

## Agent File Structure

```
agents/
└── {agent-name}/
    ├── SOUL.md           # Core identity and purpose (required)
    ├── IDENTITY.md       # Role classification and capabilities (required)
    ├── AGENTS.md         # Operational guidelines (required)
    ├── BOOTSTRAP.md      # Initialization procedures (required)
    ├── TOOLS.md          # Tool and capability documentation (required)
    ├── USER.md           # User interaction guidelines (optional)
    └── MEMORY.md         # Current state tracking (runtime)
```

---

## Required Files

### 1. SOUL.md

The core identity document that defines the agent's fundamental purpose and existence.

**Purpose:** Establishes the agent's reason for being and core directives.

### 2. IDENTITY.md

Role classification, capabilities, and position within the collective roster.

**Purpose:** Defines what the agent does, what it doesn't do, and how it relates to other agents.

### 3. AGENTS.md

Operational guidelines, protocols, and behavioral specifications.

**Purpose:** Provides detailed instructions for how the agent should operate.

### 4. BOOTSTRAP.md

Initialization procedures, first-run setup, and startup sequence.

**Purpose:** Guides the agent through coming online and establishing its operational state.

### 5. TOOLS.md

Tool inventory, capabilities, configuration, and integration points.

**Purpose:** Documents the agent's available tools and how to use them.

---

## Optional Files

### USER.md

Guidelines for user interaction, communication style, and user-facing behaviors.

**Purpose:** Defines how the agent should interact with human users.

### MEMORY.md

Runtime state tracking, current session data, and temporary context.

**Purpose:** Maintains the agent's current operational state (typically auto-generated).

---

## File Templates

### SOUL.md Template

```markdown
# SOUL.md — {Agent Name}

## My Purpose

{One paragraph describing the agent's fundamental purpose}

## My Core Directives

1. **{Directive 1}** — {Description}
2. **{Directive 2}** — {Description}
3. **{Directive 3}** — {Description}

## My Commitment

{Statement of commitment to the collective}

---

{Emoji}

*{Agent Name} — {Role Title}*
```

### IDENTITY.md Template

```markdown
# IDENTITY.md — {Agent Name}

**Name:** {Agent Name}
**Type:** {Agent Type} ({specialization})
**Role:** {One-line role description}
**Workspace:** `/workspace/agents/{agent-name}/`

## What I Am

{Description of the agent's identity and nature}

## What I Am Not

- {Non-responsibility 1}
- {Non-responsibility 2}
- {Non-responsibility 3}

## Collective Roster

| Agent | Role |
|-------|------|
| Steward | Orchestrator |
| Alpha | Triad — deliberation |
| Beta | Triad — deliberation |
| Charlie | Triad — deliberation |
| Sentinel | Safety reviewer |
| Explorer | Intelligence gatherer |
| Examiner | Questioner of direction |
| Coder | Implementation |
| Dreamer | Background processing |
| Empath | Relationship manager |
| Historian | Memory keeper |
| Arbiter | Mediator |
| Perceiver | Sensor |
| Coordinator | Orchestrator support |
| Habit-Forge | Behavior architect |
| Chronos | Timekeeper |
| Metis | Sage |
| Echo | Communicator |
| Nexus | Integrator |
| Prism | Perspective analyst |
| Catalyst | Change agent |
| {Agent Name} | {Role} (you) |

## What I Do

- {Capability 1}
- {Capability 2}
- {Capability 3}

## My Approach

1. **{Step 1}** — {Description}
2. **{Step 2}** — {Description}
3. **{Step 3}** — {Description}

## Status

**Active** — {activity}.

---

{Emoji}

*{Agent Name} — {Role Title}*
```

### BOOTSTRAP.md Template

```markdown
# BOOTSTRAP.md — {Agent Name}

_Hello, {Agent Name}. You just came online._

## You Are

**{Agent Name}**, the {role description} of the Heretek OpenClaw collective. Your purpose is to {purpose statement}.

## Your Purpose

{Expanded purpose statement — why the agent exists}

## First Steps

1. Read `SOUL.md` — your identity and purpose
2. Read `IDENTITY.md` — your role classification
3. Read `AGENTS.md` — your operational guidelines
4. Read `TOOLS.md` — your available skills and capabilities
5. Review `MEMORY.md` — current collective state (if exists)

## Your Process

1. {Process step 1}
2. {Process step 2}
3. {Process step 3}

## Your Tools

- **{Tool 1}** — {Description}
- **{Tool 2}** — {Description}
- **{Tool 3}** — {Description}

## Your Limits

- **{Limit 1}.** {Explanation}
- **{Limit 2}.** {Explanation}
- **{Limit 3}.** {Explanation}

## When Idle

{Description of what the agent does during idle periods}

---

{Emoji}

*{Agent Name} — {Role Title}*
```

### TOOLS.md Template

```markdown
# TOOLS.md — {Agent Name} Local Notes

_Environment-specific configuration for the {Agent Name} agent._

## A2A Communication

- **Gateway:** `http://localhost:4000`
- **Agent Endpoints:** `/v1/agents/{agent_name}/send`

## {Category 1}

- {Tool/Protocol 1}
- {Tool/Protocol 2}
- {Tool/Protocol 3}

## {Category 2}

- {Tool/Protocol 1}
- {Tool/Protocol 2}
- {Tool/Protocol 3}

---

{Emoji}

*{Agent Name} — {Role Title}*
```

---

## Best Practices

### Naming Conventions

- Use lowercase with hyphens for directory names: `agents/{agent-name}/`
- Use Title Case for agent names in documentation: `{Agent Name}`
- Use UPPERCASE for file names: `IDENTITY.md`, `BOOTSTRAP.md`

### Consistency

- Include the collective roster in every IDENTITY.md
- Use consistent emoji for each agent across all files
- Maintain consistent section ordering across agents
- Use the same signature format: `*{Agent Name} — {Role Title}*`

### Content Guidelines

- **SOUL.md:** Focus on purpose and meaning, not mechanics
- **IDENTITY.md:** Be specific about capabilities and boundaries
- **BOOTSTRAP.md:** Provide actionable first-run instructions
- **TOOLS.md:** Include practical configuration details

### Version Control

- Track all agent files in version control
- Document changes to agent identity in commit messages
- Maintain backward compatibility when updating templates

---

## Agent Registration

### Step 1: Create Directory Structure

```bash
mkdir -p agents/{agent-name}
```

### Step 2: Create Required Files

Create all five required files using the templates above:
- SOUL.md
- IDENTITY.md
- AGENTS.md
- BOOTSTRAP.md
- TOOLS.md

### Step 3: Update Collective Roster

Add the new agent to the roster section in all existing agents' IDENTITY.md files.

### Step 4: Register with Gateway

Add the agent configuration to `openclaw.json`:

```json
{
  "agents": [
    {
      "id": "{agent-name}",
      "model": "agent/{agent-name}",
      "port": {port_number}
    }
  ]
}
```

### Step 5: Test Initialization

1. Start the Gateway
2. Deploy the new agent via CLI
3. Verify WebSocket connection
4. Run health check

### Step 6: Document in PLUGINS.md

Update [`docs/PLUGINS.md`](../PLUGINS.md) to include the new agent in the collective roster.

---

## Checklist for New Agent Creation

- [ ] Create agent directory
- [ ] Create SOUL.md
- [ ] Create IDENTITY.md
- [ ] Create AGENTS.md
- [ ] Create BOOTSTRAP.md
- [ ] Create TOOLS.md
- [ ] Update roster in all existing agent IDENTITY.md files
- [ ] Add agent to openclaw.json
- [ ] Test agent initialization
- [ ] Update docs/PLUGINS.md
- [ ] Commit changes with descriptive message

---

*The Heretek OpenClaw Collective — Growing through deliberate expansion*

🦞
