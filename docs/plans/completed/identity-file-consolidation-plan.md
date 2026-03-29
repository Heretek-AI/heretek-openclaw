# Identity File Consolidation Plan

## Executive Summary
After consolidating 6 repositories into a single unified `heretek-openclaw` monorepo, the identity files (`AGENTS.md`, `USER.md`, `MEMORY.md`) at the repository root have been removed as redundant with agent-specific identity files in `agents/`. This plan documents the recommended changes and## Current State
| File | Location | Lines | Status |
|------|----------|-------|--------|
| [`AGENTS.md`](../../AGENTS.md) | Root | 224 | Active | **Remove** - Redundant with agent-specific |
| [`USER.md`](../../USER.md) | Root | 18 | Active | **Remove** - Identical to template |
| [`MEMORY.md`](../../MEMORY.md) | Root | 85 | Active | **Remove** - Redundant with agent-specific |
| [`IDENTITY.md`](../../IDENTITY.md) | Root | 56 | Active | **Keep** - Collective identity definition |

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
- `AGENTS.md` (redundant with agent-specific)
- `USER.md` (identical to template)
- `MEMORY.md` (redundant with agent-specific)

**Rationale:** Each agent has their own identity files in `agents/<name>/`. The root-level files duplicate this structure and create confusion. The templates in `agents/templates/` are the source of truth, not the agent-specific customizations.

### 2. Update `agents/templates/AGENTS.md`
Add section pointing to collective identity defined in [`IDENTITY.md`](../../IDENTITY.md):
```markdown
## Collective Identity

This identity file serves as the "default" for any agent. The agent inherits from the collective identity defined in `IDENTITY.md` in the root directory, while having role-specific customizations defined in this file.

```

**Rationale:** The templates are used by `deploy-agent.sh` to create new agent workspaces. They should reference the collective identity so new agents understand their context.

### 3. Update `agents/templates/USER.md`
Update to reference the collective identity:
```markdown
## About Your Human

This file captures information about the human partner. See [`IDENTITY.md`](../../IDENTITY.md) for collective context.

Update this template as you learn about the person you're helping.
```

**Rationale:** Consistent references help agents understand their context.

### 4. Update docs/plans documentation
Update the following files:
- `docs/plans/active/REPO_CONSOLIDATION_PLAN.md` → Add identity consolidation section
- `docs/plans/reference/REDUNDANCY_ASSESSMENT.md` → Mark as completed (move to `docs/plans/completed/`)
- `README.md` → Add agent identity section

## Implementation Tasks

### Phase 1: Remove root-level identity files
- [ ] Delete `AGENTS.md` from root
- [ ] Delete `USER.md` from root
- [ ] Delete `MEMORY.md` from root

### Phase 2: Update templates
- [ ] Update `agents/templates/AGENTS.md` to reference `IDENTITY.md`
- [ ] Update `agents/templates/USER.md` to reference collective identity
- [ ] Update `agents/templates/SOUL.md` to reference collective identity (if needed)

- [ ] Ensure all agent directories have consistent identity file structure

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
        AGT[agents/steward/]
        AGT_A[AGENTS.md]
        AGT_I[IDENTITY.md]
        AGT_S[SOUL.md]
        AGT_U[USER.md]
    
    ID --> TPL
    TPL --> AGT
```

## Questions for Consideration
1. Should we keep a backup of the root-level identity files before deletion?
2. Are there any scripts or configuration that references the root-level identity files?
3. Should we create a symlink from root to templates for backwards compatibility?

## Next Steps
After approval:
1. Switch to Code mode to implement the changes
2. Run verification tests to ensure agents still function correctly
3. Update any CI/CD pipelines or deployment scripts
