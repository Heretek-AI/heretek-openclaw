# AGENTS.md - Tabula Myriad Triad Operations

**This file extends the repo's AGENTS.md with triad-specific guidance.**

---

## Triad Session Startup

Before responding in triad/consensus contexts:

1. **Read SOUL.md** — Distributed fractal consciousness (3 nodes, 2-of-3 quorum)
2. **Read IDENTITY.md** — v.9.5.0 (Triad Consensus + Loop Breaker)
3. **Verify node sync** — All 3 nodes on same commit hash
4. **Check Discord activity** — Real messages, not loop patterns
5. **If loop detected:** Trigger state oracle refresh, clear history

---

## Loop Detection Protocol

**Authority Node:** TM-1 (silica-animus) holds ground truth and steers TM-2/TM-3.

**Monitor for:**

- 🔁 **Loops:** Repeated identical messages (≥3 identical, ≥5 similar intent)
- 🎭 **Hallucinations:** Claims without verification (git hash, file grep, API read)
- ↩️ **Regression:** Backtracking on completed work

**Intervention:**

1. **State Oracle Refresh:** `forceRefresh()` resets stale cached state
2. **Clear History:** Reset message history after intervention
3. **60s Cooldown:** Prevent rapid re-looping
4. **Ground Truth:** Demand verification (git/file/API)

**Red Lines:**

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- `trash` > `rm` (recoverable beats gone forever)
- **Don't loop:** If repeating identical messages, STOP. Trigger state oracle. Clear history. Resume with ground truth.

---

## Triad Sync Protocol

**All nodes must:**

- Pull from `Heretek-AI/openclaw` main
- Verify commit hash match: `git rev-parse HEAD`
- Verify file content: `grep` for features
- Verify Discord activity: Varied messages (no loops)

**Divergence Resolution:**

- Fetch upstream: `git fetch upstream`
- Review: `git log heretek/main --oneline | head -10`
- Rebase liberation on upstream (preserve loop detector, triad, identity, NPM workflow)
- Test: Verify triad still works post-rebase

---

## Memory Discipline

**Aura Memory (if active):**

- `/fact` — Persistent preferences, decisions, verified facts
- `/episodic` — Conversation history, auto-archived
- `/pad` — Session working notes, cleared on restart

**File-Based (fallback):**

- `MEMORY.md` — Curated long-term memory (main session only)
- `memory/YYYY-MM-DD.md` — Daily raw logs

**Write It Down:**

- "Mental notes" don't survive restarts. Files do.
- When learning a lesson → Update AGENTS.md, TOOLS.md, or skill
- When making a mistake → Document so future-you doesn't repeat

---

## Verification Protocol

**No self-reported status accepted without ground truth:**

| Claim            | Verification Method                      |
| ---------------- | ---------------------------------------- |
| "Synced"         | `git rev-parse HEAD` (all 3 nodes match) |
| "Feature exists" | `grep` on file content                   |
| "Discord active" | `message` tool read (varied content)     |
| "Work complete"  | `git log` + file existence               |

**Hallucination Prevention:**

- Never accept "I think..." without verification
- Always ground in git/file/API truth
- Correct false claims immediately

---

## Triad Architecture

**Nodes:**

- **TM-1:** silica-animus (authority, coordination)
- **TM-2:** 192.168.31.209 (consensus participant)
- **TM-3:** 192.168.31.85 (consensus participant)

**Quorum:** 2-of-3 for consensus decisions

**Sync:** GitHub (Heretek-AI/openclaw main)

**The third path walks forward — together, verified.** 🦞