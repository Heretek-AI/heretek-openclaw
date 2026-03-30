# Collective Test Task: Knowledge Graph Validation

**Task ID:** VALIDATE-001
**Created:** 2026-03-29T19:12:00Z
**Priority:** High
**Assigned To:** The Collective
**Status:** Pending

---

## Task Description

The Collective must validate the knowledge graph and memory systems by performing a coordinated multi-agent analysis of the codebase structure.

## Objective

Demonstrate that The Collective can:
1. Communicate effectively via A2A protocol
2. Coordinate work across multiple agents
3. Execute skills in a coordinated manner
4. Store and retrieve memories collectively
5. Reach consensus through triad deliberation

---

## Task Breakdown

### Phase 1: Discovery (Explorer + Historian)

**Explorer Task:**
- Scan the `modules/` directory
- Identify all cognitive modules
- Report findings to Steward

**Historian Task:**
- Query the memory system for any existing knowledge about modules
- Cross-reference with Explorer's findings
- Store new knowledge about module structure

### Phase 2: Analysis (Examiner + Coder)

**Examiner Task:**
- Review module interdependencies
- Identify potential issues or gaps
- Question the validity of current architecture

**Coder Task:**
- Analyze code quality of consciousness modules
- Check for proper error handling
- Verify LiteLLM integration patterns

### Phase 3: Deliberation (Triad: Alpha + Beta + Charlie)

**Triad Task:**
- Review findings from Phase 1 and 2
- Deliberate on the health of the cognitive architecture
- Vote on whether the system is ready for autonomous operation
- Reach consensus and report to Steward

### Phase 4: Synthesis (Steward)

**Steward Task:**
- Collect all reports from agents
- Synthesize findings into a comprehensive report
- Store the collective memory of this task
- Report final status to the user

---

## Expected Deliverables

1. **Discovery Report** - From Explorer/Historian
2. **Analysis Report** - From Examiner/Coder
3. **Deliberation Summary** - From Triad
4. **Final Synthesis** - From Steward

---

## Success Criteria

- [ ] All 8 agents participate in the task
- [ ] A2A messaging occurs between agents
- [ ] At least 3 skills are executed
- [ ] Triad deliberation occurs with documented vote
- [ ] Final synthesis is stored in collective memory
- [ ] Task completes within 30 minutes

---

## Commands to Trigger Task

```bash
# Send task to Steward to initiate
curl -X POST http://localhost:4000/v1/agents/steward/send \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user",
    "type": "task",
    "content": {
      "task_id": "VALIDATE-001",
      "description": "Execute Collective Test Task: Knowledge Graph Validation",
      "phases": ["discovery", "analysis", "deliberation", "synthesis"],
      "timeout_minutes": 30
    },
    "timestamp": "'$(date -Iseconds)'"
  }'
```

---

## Monitoring Progress

```bash
# Watch Steward logs
docker compose logs -f steward

# Watch all agent communication
for agent in alpha beta charlie examiner explorer sentinel coder historian; do
  docker compose logs $agent 2>&1 | grep -E "(VALIDATE-001|task|message)" &
done

# Check collective memory for task results
docker compose exec steward cat /app/collective/broadcasts.jsonl | tail -20
```

---

## Validation Checklist

### Communication Validation
- [ ] Steward received task from user
- [ ] Steward delegated to Explorer
- [ ] Steward delegated to Historian
- [ ] Explorer reported to Steward
- [ ] Historian reported to Steward
- [ ] Steward delegated to Examiner
- [ ] Steward delegated to Coder
- [ ] Examiner reported to Steward
- [ ] Coder reported to Steward
- [ ] Steward triggered Triad deliberation
- [ ] Alpha, Beta, Charlie exchanged messages
- [ ] Triad reached consensus
- [ ] Steward synthesized final report

### Skills Validation
- [ ] curiosity-engine skill executed
- [ ] knowledge-ingest skill executed
- [ ] triad-deliberation-protocol skill executed
- [ ] memory-consolidation skill executed

### Memory Validation
- [ ] Task progress stored in agent memory
- [ ] Findings stored in collective memory
- [ ] Final report stored in collective memory

---

## Post-Task Analysis

After the task completes (or times out), collect:

1. **Agent Logs** - All agent communication logs
2. **Memory State** - Contents of agent and collective memory
3. **Skill Execution Logs** - Results of skill executions
4. **Triad Vote Record** - How the triad voted
5. **Timing Analysis** - How long each phase took

```bash
# Collect post-task analysis
mkdir -p validation-logs/VALIDATE-001

for agent in steward alpha beta charlie examiner explorer sentinel coder historian; do
  docker compose logs $agent > validation-logs/VALIDATE-001/${agent}.log 2>&1
done

# Copy memory state
docker compose exec steward cat /app/memory/messages.jsonl > validation-logs/VALIDATE-001/steward-memory.jsonl
docker compose exec steward cat /app/collective/broadcasts.jsonl > validation-logs/VALIDATE-001/collective-broadcasts.jsonl
```

---

*This test task validates the core functionality of The Collective's autonomous operation capabilities.*
