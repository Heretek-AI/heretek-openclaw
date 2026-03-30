# MASTER DIRECTIVE: HERetek-OpenClaw Autonomy & LiteLLM Migration

**Version:** 2.0.0
**Last Updated:** 2026-03-29

---

## PRIME DIRECTIVE

**Mission:** Audit, consolidate, and evolve the Heretek-OpenClaw architecture.

**Goal:** Complete deprecation of direct GLM-5 API integrations and migrate 100% of LLM routing, reasoning, and tool-calling through LiteLLM.

**Absolute Constraints:**
1. **No Human Intervention:** Resolve ambiguities using repository context or external searches.
2 - **The Strangler Fig Pattern:** Do not attempt a global find-and-replace for GLM-5. Migrate one logical module or agent at a time, ensuring the system remains executable after every commit.
3 - **Atomic Operations:** Never modify more than one directory scope per cycle
4 - **Ruthless Consolidation:** As you migrate to LiteLLM, aggressively delete redundant parsers, formatters, or network wrappers that were specifically built to handle GLM-5 quirks. LiteLLM should handle standardizing the payload.

**Allowed Types:**
- `migrate`: Transitioning a specific function/agent from GLM-5 to LiteLLM.
- `prune`: Deletion of unneeded GLM-5 legacy code or bloated logic
    - `merge`: Consolidating fragmented scripts into unified handlers
    - `docs`: Generation of verbose inline comments or architecture updates
    - `fix`: Resolving a broken dependency caused by a previous cycle

**Allowed Scopes:** `(docs)`, `(plans)`, `(agents)`, `(skills)`, `(modules)`, `(liberation)`, `(scripts)`, `(init)`, `(installer)`, `(litellm)`

---

## EXECUTION PHASE

### PHASE 1: Deep Codebase & GLM-5 Audit (Execute Once on Startup)
1. Scan `/init` and `/installer` to understand environment variables and boot sequences.
2. Scan `/modules`, `/agents`, and `/skills` to identify every hardcoded GLM-5 call, custom request wrapper, or GLM-specific prompt formatter
    - Read `/docs` and `/plans` to align with the overarching Heretek autonomy goals
**Phase 1 Output:** Generate `/docs/LITELLM_MIGRATION_STATE.md`. This file must contain a prioritized checklist of every file dependent on GLM-5, and a hit-list of redundant code slated for deletion.
**Commit this file using type `docs(litellm)`.

### PHASE 2: The Migration & Consolidation Cycle (Loop Indefinitely)
1. Read `/docs/LITELLM_MIGRATION_STATE.md` and `agent_state.md` to select ONE specific file or agent from the hit-list to migrate and consolidate
    - Select ONE specific file or agent from the hit-list to migrate and consolidate
    - Rewrite the target component to route exclusively through LiteLLM
            - Delete any custom GLM-5 network retry logic, API formatting, or token-counting functions within that scope. Rely entirely on LiteLLM's unified architecture
        - Merge any scattered helper functions into the newly updated LiteLLM-compliant file
        - Write verbose inline docstrings detailing *why* the logic was structured this way for LiteLLM
        - Update any relevant architecture markdown files in `/docs`
        - Run local syntax checks and validation tests on the changed components
        - **Failure Condition:** If the migration breaks the local build or LiteLLM proxy routing fails, you have a maximum of 3 attempts to self-correct. If unfixable, execute `git restore .` to revert the cycle, document the failure in `agent_state.md`, and select a new target
        - **Step 6: Atomic Commit**
            - Stage the modified files
            - Commit using the STRICT COMMIT MESSAGE TAXONOMY
            - Push to the remote branch
        - **Step 6: Handoff & Pulse Synchronization**
            - Update `/docs/LITELLM_MIGRATION_STATE.md` to check off the completed target
            - Write a brief summary of the cycle to `agent_state.md`
            - Print the exact string `[CYCLE_COMPLETE_AWAITING_PULSE]` to the terminal to trigger the external script
