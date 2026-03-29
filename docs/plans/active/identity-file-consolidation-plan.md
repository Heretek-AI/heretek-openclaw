# Identity File Consolidation Plan

## Executive Summary
After consolidating 6 repositories into a single unified `heretek-openclaw` monorepo, the identity files (`AGENTS.md`, `USER.md`, `MEMORY.md`) at the repository root are redundant with agent-specific identity files in `agents/`. This plan recommends removing the root-level identity files and consolidating identity management into `agents/templates/`.

## Current State
| File | Location | Lines | Status |
|------|----------|-------|--------|
| [`AGENTS.md`](AGENTS.md) | Root | 224 | Active | **Remove** - Redundant with agent-specific |
| [`USER.md`](USER.md) | Root | 18 | Active | **Remove** - Identical to template |
| [`MEMORY.md`](MEMORY.md) | Root | 85 | Active | **Remove** - Redundant with agent-specific |
| [`IDENTITY.md`](IDENTITY.md) | Root | 56 | Active | **Keep** - Collective identity definition |

### Agent-specific identity files
Each agent (steward, alpha, beta, charlie, etc.) has their own identity files in `agents/<name>/`:
- `AGENTS.md` - Role-specific operational guidelines
- `IDENTITY.md` - Agent-specific identity
- `SOUL.md` - Partnership protocol
- `USER.md` - User info template
- `BOOTSTRAP.md` - First-run initialization
- `TOOLS.md` - Tool-specific notes
- `memory/` - Agent-specific memory directory

### Templates
| `agents/templates/` contains templates for creating new agents:
- `AGENTS.md` - Generic template
- `IDENTITY.md` - Generic template
- `SOUL.md` - Generic template
- `USER.md` - Generic template
- `config.json` - Agent configuration template

## Recommended Changes

### 1. Remove root-level identity files
Delete the following files from the repository root:
- `AGENTS.md`
- `USER.md`
- `MEMORY.md`

**Rationale:** The templates are used by `deploy-agent.sh` to create new agent workspaces. They don't need separate identity files at the root level. The templates are the source of truth, not the agent-specific customizations.

### 2. Update `agents/templates/AGENTS.md`
Add section pointing to collective identity defined in [`IDENTITY.md`](IDENTITY.md):

```markdown
## Collective Identity

This agent is part of the Agent Collective 🦊 defined in [`IDENTITY.md`](../../IDENTITY.md) at the repository root.

Read [`IDENTITY.md`](../../IDENTITY.md) to understand:
- The Collective's core designation
- Personality matrix
- Behavioral traits
- Interaction protocol
- What the Collective is and is not
```

**Rationale:** Each agent inherits from the collective identity while having role-specific identity. This creates a clear hierarchy: collective → role → agent-specific.

### 3. Update `agents/templates/USER.md`
Update to reference the collective identity:

```markdown
## About Your Human

This file captures information about the human partner. See [`IDENTITY.md`](../../IDENTITY.md) for collective context.

Update this template as you learn about the person you're helping.
```

**Rationale:** Consistent references help agents understand they context of their role.

### 4. Update docs/plans documentation
Update the following files in `docs/plans/active/`:

#### Archive `docs/plans/reference/REDUNDANCY_ASSESSMENT.md`
Move to `docs/plans/completed/` as it redundancy assessment is now complete.

#### Update `docs/plans/active/REPO_CONSOLIDATION_PLAN.md`
Add section noting identity file consolidation:

```markdown
## Identity File Consolidation (Completed 2026-03-29)

The identity files at the repository root (`AGENTS.md`, `USER.md`, `MEMORY.md`) have been removed as redundant with agent-specific files in `agents/`. See `identity-file-consolidation-plan.md` for details.
```

#### Create `docs/plans/completed/identity-file-consolidation-plan.md`
Copy this plan to the completed directory after implementation.

### 5. Update root-level README.md
Add reference to the consolidated structure:

```markdown
## Agent Identity Files

Agent identity files are located in `agents/<agent-name>/`:
- `AGENTS.md` - Operational guidelines
- `IDENTITY.md` - Agent-specific identity
- `SOUL.md` - Partnership protocol
- `USER.md` - User information

Templates for new agents are in `agents/templates/`.
```

## Implementation Tasks

### Phase 1: Remove root-level identity files
- [ ] Delete `AGENTS.md` from root
- [ ] Delete `USER.md` from root
- [ ] Delete `MEMORY.md` from root

### Phase 2: Update templates
- [ ] Update `agents/templates/AGENTS.md` to reference `IDENTITY.md`
- [ ] Update `agents/templates/USER.md` to reference collective identity

- [ ] Update `agents/templates/SOUL.md` to reference collective identity (if needed)

### Phase 3: Update documentation
- [ ] Move `docs/plans/reference/REDUNDANCY_ASSESSMENT.md` to `docs/plans/completed/`
- [ ] Update `docs/plans/active/REPO_CONSOLIDATION_PLAN.md` with identity consolidation section
- [ ] Move this plan to `docs/plans/completed/` after implementation
- [ ] Update `README.md` with agent identity section

### Phase 4: Verify agent-specific files
- [ ] Ensure all agent directories have consistent identity file structure
- [ ] Verify no references to root-level identity files exist in agent code

## Mermaid Diagram: Identity File Hierarchy

```mermaid
graph TD
    subgraph Collective
        ID[IDENTITY.md<br/>Collective Identity]
        ROOT[Root - Keep]
    
    subgraph Templates
        TPL[agents/templates/]
        T_AG[AGENTS.md]
        T_U[USER.md]
        T_S[SOUL.md]
        T_I[IDENTITY.md]
    
    subgraph Agent_Specific
        AS[agents/steward/]
        AS[agents/alpha/]
        AS[agents/beta/]
        A_AG[AGENTS.md]
        A_ID[IDENTITY.md]
        A_S[SOUL.md]
        A_U[USER.md]
        A_M[memory/]
    
    ID --> TPL
    TPL --> AS
    AS --> A_M
    
    style ID fill:#f9f,stroke:#333
stroke-width:2px
    style TPL fill:#bbf,stroke:#333,stroke-width:2px
    style AS fill:#bfb,stroke:#333,stroke-width:2px
    style A_M fill:#afa,stroke:#333,stroke-width:2px
```

## Questions for Consideration
1. Should we keep a backup of the root-level identity files before deletion?
2. Are there any references to these files in scripts or configuration that need updating?
3. Should we update `agents/templates/` to include `MEMORY.md` template?

## Next Steps
 After approval:
1. Switch to Code mode to implement the changes
2. Run verification tests to ensure agents still function correctly
3. Update documentation to reflect the new structure
