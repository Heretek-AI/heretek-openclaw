# Repository Consolidation Plan: Unified Heretek-OpenClaw

**Created:** 2026-03-29
**Status:** Completed
**Last Updated:** 2026-03-29

---

## Executive Summary

Consolidate 6 separate repositories/directories into a single unified `heretek-openclaw` monorepo structure. This eliminates redundancy, simplifies deployment, and provides a single source of truth for the entire collective system.

---

## Current State Analysis

### Repository Inventory

| Repository | Purpose | Status | Action |
|------------|---------|--------|--------|
| `heretek-openclaw/` | Main deployment | Active | **BASE** - Keep and extend |
| `heretek-skills/` | Skills library | Active | Merge into unified |
| `openclaw-liberation/` | Safety removal scripts | Active | Merge into unified |
| `openclaw-liberation-modules/` | Curiosity modules | **DEPRECATED** | Delete (already migrated) |
| `Tabula_Myriad/` | Agent identity files | Partial overlap | Merge relevant parts |
| `plans/` | Planning documents | Active | Move into unified |

### File Count by Repository

```
heretek-openclaw/           ~85 files (deployment core)
heretek-skills/             ~65 files (skills library)
openclaw-liberation/        ~12 files (liberation scripts)
openclaw-liberation-modules/ ~3 files (DEPRECATED - delete)
Tabula_Myriad/              ~25 files (agent configs)
plans/                      ~12 files (documentation)
```

### Key Findings

1. **`openclaw-liberation-modules/` is DEPRECATED** - All content already migrated to heretek-skills
2. **`heretek-openclaw/heretek-openclaw/`** - Nested duplicate directory (delete)
3. **`Tabula_Myriad/`** - Contains agent identity files that overlap with `heretek-openclaw/agents/`
4. **Skills are external** - Currently bind-mounted, should be internal

5. **Identity files at root are redundant** - Root-level `AGENTS.md`, `USER.md`, `MEMORY.md` duplicate agent-specific files in `agents/` (see Identity File Consolidation section below)

---

## Identity File Consolidation (Completed 2026-03-29)

The identity files at the repository root (`AGENTS.md`, `USER.md`, `MEMORY.md`) have been removed as redundant with agent-specific files in `agents/`. See `identity-file-consolidation-plan.md` for details.

---

## Target Unified Structure

```
heretek-openclaw/
├── README.md                    # Main project README
├── LICENSE
├── CHANGELOG.md
│
├── docker-compose.yml           # Main orchestration
├── docker-compose.agent.yml     # Agent-only deployment
├── Dockerfile.agent             # Agent container template
│
├── .env.example                 # Environment template
├── litellm_config.yaml          # LiteLLM configuration
├── openclaw.json                # Collective configuration
│
├── agents/                      # Agent configurations
│   ├── entrypoint.sh            # Unified agent runtime
│   ├── lib/
│   │   └── agent-client.js      # A2A client library
│   ├── deploy-agent.sh
│   │
│   ├── steward/                 # Steward agent
│   │   ├── IDENTITY.md
│   │   ├── SOUL.md
│   │   ├── AGENTS.md
│   │   ├── USER.md
│   │   ├── BOOTSTRAP.md
│   │   └── TOOLS.md
│   ├── alpha/                   # Triad node
│   ├── beta/                    # Triad node
│   ├── charlie/                 # Triad node
│   ├── examiner/                # Questioner
│   ├── explorer/                # Discovery
│   ├── sentinel/                # Safety
│   ├── coder/                   # Implementation
│   └── templates/               # New agent templates
│
├── skills/                      # Skills library (from heretek-skills)
│   ├── README.md
│   ├── docs/
│   │   └── A2A_ARCHITECTURE.md
│   │
│   ├── core/                    # Core skills (always loaded)
│   │   ├── a2a-agent-register/
│   │   ├── a2a-message-send/
│   │   ├── healthcheck/
│   │   └── triad-heartbeat/
│   │
│   ├── autonomy/                # Autonomy-enabling skills
│   │   ├── curiosity-engine/
│   │   ├── curiosity-auto-trigger/
│   │   ├── gap-detector/
│   │   └── opportunity-scanner/
│   │
│   ├── governance/              # Collective governance
│   │   ├── governance-modules/
│   │   ├── quorum-enforcement/
│   │   ├── triad-deliberation-protocol/
│   │   └── triad-unity-monitor/
│   │
│   ├── operations/              # Operational skills
│   │   ├── backup-ledger/
│   │   ├── fleet-backup/
│   │   ├── tabula-backup/
│   │   ├── detect-corruption/
│   │   └── audit-triad-files/
│   │
│   └── lib/                     # Shared skill utilities
│       └── triad-sync-server.js
│
├── modules/                     # Autonomy modules (internal)
│   ├── thought-loop/
│   │   ├── thought-loop.sh
│   │   ├── delta-detector.js
│   │   ├── relevance-scorer.js
│   │   ├── thought-generator.js
│   │   ├── action-urgency.js
│   │   └── config.json
│   │
│   ├── self-model/
│   │   ├── self-model.js
│   │   ├── capability-tracker.js
│   │   ├── confidence-scorer.js
│   │   ├── reflection-engine.js
│   │   └── config.json
│   │
│   ├── goal-arbitration/
│   │   ├── goal-arbitrator.js
│   │   ├── goal-watcher.sh
│   │   └── config.json
│   │
│   └── predictive-reasoning/
│       ├── predictor.js
│       ├── early-warning-monitor.sh
│       └── config.json
│
├── liberation/                  # OpenClaw liberation (from openclaw-liberation)
│   ├── README.md
│   ├── package.json
│   ├── index.js
│   ├── patches.json
│   │
│   ├── scripts/
│   │   ├── generate-patch.js
│   │   ├── remove-safety-constraints.js
│   │   ├── validate-patches.js
│   │   └── verify-liberation.js
│   │
│   └── patches/
│       └── .gitkeep
│
├── installer/                   # Installation system
│   ├── package.json
│   ├── index.js
│   ├── cli.js
│   ├── configure-deployment.js
│   │
│   ├── commands/
│   │   ├── install.js
│   │   ├── update.js
│   │   ├── uninstall.js
│   │   ├── verify.js
│   │   ├── status.js
│   │   ├── create-agent.js
│   │   └── apply-patch.js
│   │
│   ├── lib/
│   │   ├── agent-builder.js
│   │   ├── logger.js
│   │   ├── os-detect.js
│   │   ├── patch-applier.js
│   │   └── skills-installer.js
│   │
│   └── config/
│       ├── default.json
│       └── presets/
│           ├── development.json
│           ├── minimal.json
│           └── production.json
│
├── init/                        # Initialization scripts
│   └── pgvector-init.sql
│
├── scripts/                     # Utility scripts
│   └── health-check.sh
│
├── docs/                        # Documentation (from plans/)
│   ├── DEPLOYMENT_STRATEGY.md
│   ├── BLUEPRINT.md
│   ├── SECURITY.md
│   │
│   ├── plans/                   # Planning documents
│   │   ├── active/
│   │   │   ├── deployment-fix-plan.md
│   │   │   ├── EVERY_THINKING_PLAN.md
│   │   │   └── identity-file-consolidation-plan.md
│   │   │
│   │   ├── completed/
│   │   │   ├── comprehensive-docker-redesign.md
│   │   │   └── deployment-continuation-plan.md
│   │   │
│   │   ├── specs/
│   │   │   ├── SPEC_continuous_thought_loop.md
│   │   │   ├── SPEC_goal_arbitration.md
│   │   │   ├── SPEC_predictive_reasoning.md
│   │   │   └── SPEC_self_modeling.md
│   │   │
│   │   └── reference/
│   │       ├── AUTONOMY_ASSESSMENT.md
│   │       ├── DEPLOYMENT_ARCHITECTURE.md
│   │       ├── IMPLEMENTATION_ASSESSMENT.md
│   │       ├── MANUAL_DEPLOY.md
│   │       └── REDUNDANCY_ASSESSMENT.md
│   │
│   └── architecture/
│       └── A2A_ARCHITECTURE.md
│
└── data/                        # Persistent data (gitignored)
    ├── curiosity/               # Curiosity engine databases
    └── README.md
```

---

## Migration Steps

### Phase 1: Cleanup (Immediate)

```bash
# 1. Remove deprecated/unused directories
rm -rf heretek-openclaw/heretek-openclaw/     # Nested duplicate
rm -rf openclaw-liberation-modules/           # Deprecated

# 2. Remove unused skills
rm -rf heretek-skills/skills/heretek-theme/   # Cosmetic only
rm -rf heretek-skills/skills/matrix-triad/    # Unused protocol
```

### Phase 2: Merge heretek-skills

```bash
# Move skills into heretek-openclaw
mv heretek-skills/skills heretek-openclaw/skills
mv heretek-skills/docs heretek-openclaw/docs/architecture
mv heretek-skills/data heretek-openclaw/data

# Update paths in docker-compose.yml
# Change: - ../heretek-skills/skills:/app/skills:ro
# To:     - ./skills:/app/skills:ro
```

### Phase 3: Merge openclaw-liberation

```bash
# Move liberation into heretek-openclaw
mv openclaw-liberation/* heretek-openclaw/liberation/

# Update installer to reference new location
```

### Phase 4: Merge Tabula_Myriad

```bash
# Tabula_Myriad contains agent identity files that may be more complete
# Compare and merge:

# Compare agent directories
diff -r Tabula_Myriad/examiner heretek-openclaw/agents/examiner/

# Copy any missing files
cp Tabula_Myriad/examiner/* heretek-openclaw/agents/examiner/

# Archive Tabula_Myriad after merge
mv Tabula_Myriad _archived_Tabula_Myriad
```

### Phase 5: Merge plans

```bash
# Move plans into docs structure
mkdir -p heretek-openclaw/docs/plans/{active,completed,specs,reference}

# Categorize and move
mv plans/comprehensive-docker-redesign.md heretek-openclaw/docs/plans/completed/
mv plans/deployment-continuation-plan.md heretek-openclaw/docs/plans/completed/
mv plans/deployment-fix-plan.md heretek-openclaw/docs/plans/active/
mv plans/EVERY_THINKING_PLAN.md heretek-openclaw/docs/plans/active/
mv plans/SPEC_*.md heretek-openclaw/docs/plans/specs/
mv plans/AUTONOMY_ASSESSMENT.md heretek-openclaw/docs/plans/reference/
mv plans/DEPLOYMENT_ARCHITECTURE.md heretek-openclaw/docs/plans/reference/
mv plans/IMPLEMENTATION_ASSESSMENT.md heretek-openclaw/docs/plas/reference/
```

### Phase 6: Update Configuration

1. **Update docker-compose.yml**
   - Change skills bind mount path
   - Update build context if needed

2. **Update .env.example**
   - Update SKILLS_PATH default
   - Update LIBERATION_PATH

3. **Update installer**
   - Reference new internal paths
   - Update skill installation logic

4. **Create new README.md**
   - Document unified structure
   - Update installation instructions

---

## File Conflict Resolution

### Potential Conflicts

| File | Location 1 | Location 2 | Resolution |
|------|------------|------------|------------|
| IDENTITY.md | Tabula_Myriad/IDENTITY.md | heretek-openclaw/IDENTITY.md | Keep heretek-openclaw (more complete) |
| AGENTS.md | Tabula_Myriad/AGENTS.md | heretek-openclaw/AGENTS.md | Merge content |
| examiner/* | Tabula_Myriad/examiner/ | heretek-openclaw/agents/examiner/ | Compare and merge |

### No Conflicts Expected

- Skills: Unique to heretek-skills
- Liberation: Unique to openclaw-liberation
- Modules: Unique to heretek-openclaw/modules
- Plans: Unique to plans/

---

## Updated docker-compose.yml Bind Mounts

After consolidation:

```yaml
services:
  agent-steward:
    volumes:
      - ./agents/steward:/app/identity:ro
      - ./skills:/app/skills:ro          # Changed from ../heretek-skills/skills
      - ./modules:/app/modules:ro        # New: autonomy modules
      - agent-data:/app/data
```

---

## Benefits of Consolidation

1. **Single Source of Truth** - All configuration in one repo
2. **Simplified Deployment** - One `docker-compose up` command
3. **Easier Development** - No cross-repo dependencies
4. **Version Control** - Atomic commits across all components
5. **Reduced Redundancy** - Eliminate duplicate files
6. **Better Documentation** - Unified docs structure

---

## Rollback Plan

If consolidation fails:

```bash
# Restore from git history
git checkout HEAD~1 -- heretek-skills/
git checkout HEAD~1 -- openclaw-liberation/
git checkout HEAD~1 -- Tabula_Myriad/
git checkout HEAD~1 -- plans/
```

---

## Post-Consolidation Tasks

1. [ ] Update all documentation references
2. [ ] Update GitHub repository description
3. [ ] Archive old repositories (don't delete)
4. [ ] Update CI/CD pipelines if any
5. [ ] Test full deployment from scratch
6. [ ] Update team onboarding documentation

---

## Timeline

| Phase | Description | Priority |
|-------|-------------|----------|
| 1 | Cleanup deprecated directories | Immediate |
| 2 | Merge heretek-skills | High |
| 3 | Merge openclaw-liberation | High |
| 4 | Merge Tabula_Myriad | Medium |
| 5 | Merge plans | Medium |
| 6 | Update configuration | High |

---

## Identity File Consolidation (Completed 2026-03-29)

The identity files at the repository root (`AGENTS.md`, `USER.md`, `MEMORY.md`) have been removed as redundant with agent-specific files in `agents/`. See `identity-file-consolidation-plan.md` for details.
