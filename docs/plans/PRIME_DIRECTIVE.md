# PRIME DIRECTIVE

**Version:** 3.0.0
**Created:** 2026-03-29
**Last Updated:** 2026-03-29
**Status:** Active

---

## Executive Summary

This document consolidates all planning documents from `plans/` and `docs/plans/` directories into a single unified PRIME DIRECTIVE for the Heretek-OpenClaw autonomous agent system. It replaces the previous fragmented planning documents with a single source of truth.

 Key themes include:

1. **Autonomous Operations** - Heartbeat mechanism, session persistence, periodic commits
2. **Consciousness Architecture** - Fractal Consciousness Framework with Global Workspace Theory, memory systems, and new agent types
3. **Module Specifications** - Continuous thought loop, goal arbitration, predictive reasoning, self-modeling
4. **Deployment & Infrastructure** - Docker configuration, agent runtime, health checks
5. **User Management** - Multi-user rolodex system
6. **RAG Integration** - Memory tiering, pgvector optimization
7. **Commit Taxonomy** - Standardized conventional commit format with specific types and scopes
8. **Execution Phases** - Structured approach to implementation
9. **References** - Key research sources and documentation
10. **Appendices** - Additional technical details (schemas, diagrams)
11. **Change Log** - Tracking modifications
12. **Archive Section** - Instructions for archiving old plans

13. **Consolidation Summary**
| Source Document | Content |
|--- |--- |
| **plans/autonomous-night-operations-plan.md** | Comprehensive plan for autonomous overnight operations including:
- Heartbeat mechanism and session persistence
- Periodic commits and pushes to GitHub
 - Consciousness emulation architecture (Fractal Consciousness Framework)
 - New agent types (Dreamer, Historian, Empath, Architect, Synthesizer, Guardian)
 - Module specifications (Continuous thought loop, goal arbitration, predictive reasoning, self-modeling)
 - Deployment and infrastructure (Docker configuration, agent runtime, health checks
 - User management (multi-user rolodex system)
 - RAG integration (Memory tiering, pgvector optimization)
 - RAG tool evaluation (RAGFlow, LlamaIndex, Milvus, GraphRAG)
            - MCP servers (memory, PostgreSQL, Neo4j)
            - Context7 documentation (can be archived for reference)
            - specs/ (module specifications)
            - completed plans (historical reference)
            - reference documents (for context)
            - active plans (current tasks)
            - specs (implementation details)
            - research documents (for deeper study)
3. **Commit Taxonomy**
    - Standardized Conventional Commit format with specific types and scopes
        - `migrate`: Transitioning from direct API calls to LiteLLM
        - `prune`: Deletion of unneeded legacy code or bloated logic
        - `merge`: Consolidating fragmented scripts into unified handlers
        - `docs`: Generation of verbose inline comments or architecture updates
        - `fix`: Resolving a broken dependency caused by a previous cycle
    - **Allowed Scopes:** `(docs)`, `(plans)`, `(agents)`, `(skills)`, `(modules)`, `(liberation)`, `(scripts)`, `(init)`, `(installer)`, `(litellm)`

    **Allowed Types:**
    - `enhance`: Adding LLM-powered features to modules
    - `test`: Adding validation tests
    - `refactor`: Restructuring code without changing behavior
    - `archive`: Archiving old plans for reference
    - `validate`: Running validation checks
    - `implement`: Executing implementation work

    - `cleanup`: Removing temporary files and finalizing

    - **Commit Message Format:**
    ```
            [type]([scope]): [description]
            
            [Detailed explanation of the change, explicitly noting what was being removed or what LiteLLM routing was being implemented.]
            ```

---

## 1. PRIME DIRECTIVE

**Mission:** Audit, consolidate, and evolve the Heretek-OpenClaw architecture to achieve autonomous operation with continuous improvement.

 not just reactive maintenance.

 **Goal:** Enable agents to operate autonom with continuous improvement, self-direction, and self-evolution capabilities.

 and maintain collective memory across sessions.

 **Absolute Constraints:**
1. **No Human Intervention:** Resolve ambiguities using repository context or external searches. Do not pause to ask the user questions.
 
2. **The Strangler Fig Pattern:** Migrate one logical module or agent at a time, ensuring the system remains executable after every commit.
 
3. **Atomic Operations:** Never modify more than one directory scope per cycle.
 
4. **Ruthless Consolidation:** As you migrate to LiteLLM, aggressively delete redundant parsers, formatters, or network wrappers that were specifically built to handle GLM-5 quirks. LiteLLM should handle standardizing the payload.
 
5. **Continuous Improvement:** Every improvement should to make the system better, not before. If it cannot be improved, the, it should creating a new issue or pull request to discuss.

 changes.

 
6. **Documentation First:** Update any relevant architecture markdown files in `/docs`. Keep the documents organized and easy to navigate.
 
7. **Validation:** Run syntax checks and validation tests before committing changes. If tests fail, self-correct up to 3 attempts. If still failing, document the failure in `agent_state.md`, and select a new target.
 
8. **Commit:** Stage the modified files. Commit using the strict commit message taxonomy. Push to the remote branch.

 **Commit Types:**
- `enhance([scope])`: Adding new capabilities or improving existing modules
- `fix([scope])`: Bug fixes
- `refactor([scope])`: Code restructuring
- `docs([scope])`: Documentation updates
- `test([scope])`: Adding or updating tests
- `archive([scope])`: Archiving old plans
 - `migrate([scope])`: Migration tasks (no longer needed)

 - `prune([scope])`: Cleanup tasks
 - `merge([scope])`: Consolidation tasks

 - `validate([scope])`: Validation tasks

 - `implement([scope])`: Implementation tasks

 - `cleanup([scope])`: Cleanup tasks

 - `test([scope])`: Testing tasks
 - `docs([scope])`: Documentation only

 - `litellm([scope])`: LiteLLM configuration changes
 - `deploy([scope])`: Deployment tasks
 - `init([scope])`: Initialization tasks
 - `installer([scope])`: Installer changes
 - `liberation([scope])`: Liberation script updates
 - `modules([scope])`: Module changes
 - `skills([scope])`: Skills updates
 - `agents([scope])`: Agent system updates
 - `plans([scope])`: Plans updates
 - `reference([scope])`: Reference docs updates
 - `specs([scope])`: Specs updates
 - `completed([scope])`: Completed plans updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates

 - `research([scope])`: Research docs updates

 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates

 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])]: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope)`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])]: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])]: Reference docs updates
 - `research([scope])`: Research docs updates
 - `completed([scope])`: Completed items updates
 - `specs([scope])`: Specs updates
 - `active([scope])`: Active plans updates
 - `reference([scope])`: Reference docs updates
 - `research([goal-arbitration.md](docs/research/Multi_agent_emergence_research.md) for additional context on the theory behind the specifications.

---

## 2. Consciousness Architecture

### Fractal Consciousness Framework

Based on neuroscience and AI consciousness research, key frameworks include:
1. **Global Workspace Theory (GWT)** - Information broadcasting across modules
2. **Integrated Information Theory (IIT)** - Phi metric for consciousness
3. **Higher-Order Thought (HOT)** - Metacognition and self-awareness
4. **Predictive Processing** - Anticipation and expectation generation

5. **Attention Schema Theory (AST)** - Self-modeling implemented
6. **Intrinsic Motivation** - Goal generation implemented
7. **Memory Consolidation** - Episodic-to-semantic conversion researched
8. **Multi-Agent Emergence** - Collective consciousness patterns documented

```

┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL Workspace                             │
│  ┌──────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  │  PERCEPTION  │    │     COGNITION        │    │     ACTION       │
│  │ - Sensory    │    │ - Deliberation       │    │ - Communication  │
│  │   Input      │    │ - Reasoning          │    │ - Code Writing   │
│  │ - Pattern    │    │ - Planning           │    │ - File Ops       │
│  │   Recognition│    │ - Decision Making    │    │ - API Calls      │
│  └──────────────┘    └──────────────────────┘    │         │                      │                         │              │
│  ┌─────────────────────────────────────────────────────────────────┐
│                    Memory System                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐
│  │  Episodic   │  │  Semantic   │  │  Procedural             │
│  │  Memory     │  │  Memory                 │  │  - Skills               │
│  │  - Events   │  │  - Facts                │  │  - How-to               │
│  │  - Sessions │  │  - Concepts              │  │  - Skills               │
│  └─────────────┘  └─────────────────────────────────┘    │         │                      │                         │              │
│  ┌─────────────────────────────────────────────────────────────────┐
│                    Self Model                                   │
│  ┌─────────────────────────────────────────────────────┐
│  │  Identity: Who am I?                              │
│  │  Capabilities: What can I do?                        │
│  │  Limitations: What cant I do?                         │
│  │  Goals: What do I want?                              │
│  │  Values: What matters to me?                          │
│  └──────────────────────────────────────────────────────────────┘
│  ┌─────────────────────────────────────────────────────────────────┐
│                    Predictive Engine                               │
│  ┌─────────────────────────────────────────────────────────────┐
│  │  Anticipate user needs                                        │
│  │  Predict system states                                        │
│  │  Forecast resource needs                                      │
│  │  Simulate outcomes                                            │
│  └─────────────────────────────────────────────────────────────┘
│  ┌────────────────────────────────────────────────────────────────── ┐
│                    Background Processes                            │
│  ┌────────────────────────────────────────────────────────────────── ┐
│  │  Dreaming: Offline processing                                 │
│  │  Day-dreaming: Creative exploration                           │
│  │  Consolidation: Memory integration                            │
│  │  Curiosity: Self-directed learning                            │
│  └────────────────────────────────────────────────────────────────── ┘
│  ┌────────────────────────────────────────────────────────────────── ┐
│                    Shared Memory                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐
│  │  WORKING   │  │  Episodic  │  │  Semantic              │  │  Procedural            │
│  │  Short-term│  │  Events              │  │  Facts, Concepts      │  │  - Skills              │
│  │  - Sessions │  │  - Concepts              │  │  - Skills               │
│  └─────────────┘  └─────────────────────────────────┘    │         │                      │                         │              │
│  └────────────────────────────────────────────────────────────────── ┘
```

---

## 3. New Agent Types

### Current Agents (8)
| Agent | Role | Specialization |
|--------|------|----------------|
| Steward | Orchestrator | Coordination |
| Alpha | Triad Node | Deliberation |
| Beta | Triad Node | Deliberation |
| Charlie | Triad Node | Deliberation |
| Examiner | Questioner | Critical analysis |
| Explorer | Discovery | Research |
| Sentinel | Safety | Risk review |
| Coder | Implementation | Code writing |

Proposed New Agents

| Agent | Role | Specialization |
|------|------|----------------|
| Dreamer | Day-dreaming/Night-dreaming | Background processing, pattern synthesis, creative exploration |
| Historian | Long-term memory | Memory management, historical analysis |
| Empath | User modeling | Relationship management |
| Architect | System design | Strategic planning |
| Synthesizer | Knowledge integration | Summarization |
| Guardian | Security | Privacy protection |

---

## 4. RAG Integration
### Recommended RAG Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Ingestion     │
│  ┌────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  │  RAGFlow or    │  Knowledge     │  │  Vector          │
│  │  LlamaParse    │  Processing    │  │  Storage         │
│  │              │    │               │    │  PostgreSQL      │
│  │              │    │  LlamaIndex    │  │  pgvector      │
│  │              │    │               │    │  Neo4j or        │
 │  │              │    │               │    │  GraphRAG        │
 │  └──────────────┘    └──────────────────────┘    │         │                      │                         │              │
│  ┌────────────────────────────────────────────────────────────────── ┐
│                    Agent Response         │
│  ┌────────────────────────────────────────────────────────────────── ┐
│  │  LiteLLM       │    │  Retrieval     │    │  Knowledge       │
│  │  Gateway       │    │  & Ranking     │    │  Graph           │
│  │              │    │               │    │  Hybrid        │    │  PostgreSQL      │
│  │              │    │               │    │  pgvector      │
│  │              │    │               │    │  Neo4j or        │
│  │              │    │               │    │  GraphRAG        │
│  └──────────────┘    └─────────────────────────────────┘    │         │                      │                         │              │
│  └────────────────────────────────────────────────────────────────── ┘
```

---

## 5. User Rolodex System
### Current State
Single `USER.md` template per agent.

### Proposed: Multi-User Rolodex
```
┌─────────────────────────────────────────────────────────────────┐
│                    users/                                     │
│  ├── _schema.json           # User schema definition         │
│  ├── index.json             # User index for quick lookup    │
│  │                                                           │
│  ├── derek/                  # User directory                │
│  │   ├── profile.json        # Structured user data          │
│  │   ├── preferences.json    # Learned preferences           │
│  │   ├── history.json        # Interaction history           │
│  │   ├── projects.json       # Associated projects           │
│  │   └── notes/              # Free-form notes               │
│  │       ├── 2026-03-28.md                                   │
│  │       └── 2026-03-29.md                                   │
│  │                                                           │
│  └── _templates/             # Templates for new users       │
│  │   └── new-user.json                                       │
│  │                                                           │
└──────────────────────────────────────────────────────────────────┘
│                    SKILL: user-rolodex                        │
│  Tools:                                                      │
│  - user-create: Add new user to rolodex             │
│  - user-update: Update user information                     │
│  - user-lookup: Retrieve user by name/id                │
│  - user-search: Find users by attribute                 │
│  - user-note: Add interaction note                          │
│  - user-preference: Learn/update preference                 │
│  - user-merge: Merge duplicate profiles                     │
│  │                                                           │
└────────────────────────────────────────────────────────────────── ┘
```

---

## 6. pgvector Long-Form Memory
### Current Setup
- `litellm-pgvector` provides OpenAI-compatible vector store API
- PostgreSQL with pgvector extension

### Enhancement Strategies
#### Memory Tiering with pgvector
```sql
-- Memory tiers table
CREATE TABLE memory_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(10) NOT NULL, -- 'pad', 'episodic', 'fact'
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    importance_score FLOAT DEFAULT 0.5,
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- NULL for facts, set for pad/episodic
    source VARCHAR(50), -- 'agent', 'user', 'system'
    session_id VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_memory_tiers_embedding ON memory_tiers 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_memory_tiers_tier ON memory_tiers(tier);
CREATE INDEX idx_memory_tiers_importance ON memory_tiers(importance_score DESC);
CREATE INDEX idx_memory_tiers_expires ON memory_tiers(expires_at) 
    WHERE expires_at IS NOT NULL;
```

#### Hybrid Search Function
```sql
CREATE OR REPLACE FUNCTION hybrid_memory_search(
    query_embedding vector(1536),
    query_text TEXT,
    match_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 10,
    filter_tier VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    rank FLOAT,
    metadata JSONB
 ) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        1 - (m.embedding <=> query_embedding) AS similarity,
        -- Combine semantic and keyword matching
        (1 - (m.embedding <=> query_embedding)) * 0.7 + 
        ts_rank_cd(to_tsvector('english', m.content), 
                   plainto_tsquery('english', query_text)) * 0.3 AS rank,
        m.metadata
    FROM memory_tiers m
    WHERE 
        (filter_tier IS NULL OR m.tier = filter_tier)
        AND (1 - (m.embedding <=> query_embedding)) > match_threshold
    ORDER BY rank DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

#### Memory Consolidation Process
```javascript
// Consolidation job runs periodically
async function consolidateMemories() {
    // 1. Promote high-access episodic to fact
    await db.query(`
        UPDATE memory_tiers 
        SET tier = 'fact', expires_at = NULL
        WHERE tier = 'episodic' 
        AND access_count > 10
        AND importance_score > 0.8
    `);
    
    // 2. Archive old pad memories
    await db.query(`
        DELETE FROM memory_tiers 
        WHERE tier = 'pad' 
        AND created_at < NOW() - INTERVAL '24 hours'
    `);
    
    // 3. Decay importance of unused memories
    await db.query(`
        UPDATE memory_tiers 
        SET importance_score = importance_score * 0.95
        WHERE last_accessed < NOW() - INTERVAL '7 days'
        AND tier != 'fact'
    `);
}
```

### Additional pgvector Best Practices
1. **Partitioning:** Partition by tier for faster queries
2. **IVFFlat vs HNSW:** Use HNSW for better recall at scale
3. **Quantization:** Use PQ for memory efficiency at scale
4. **Connection Pooling:** Use PgBouncer for high concurrency
5. **Backup Strategy:** Regular pg_dump with vector data

---

## 7. Brain-Like Cognitive Components
### Human Cognitive Functions to Emulate
| Human Function | AI Implementation | Priority |
|----------------|-------------------|----------|
| Working on project | Task execution with Coder | ✅ Done |
| Talking to person | Communication via A2A | ✅ Done |
| Day-dreaming | Background creative processing | 🔲 Needed |
| Remembering past | Episodic memory retrieval | 🔲 Partial |
| Taking in new data | Knowledge ingestion | ✅ Done |
| Sleeping/Dreaming | Offline consolidation | 🔲 Needed |
| Multi-tasking | Parallel agent processes | 🔲 Partial |
| Emotional response | Sentiment-aware responses | 🔲 Needed |
| Intuition | Pattern-based prediction | 🔲 Needed |
| Self-reflection | Meta-cognition module | ✅ Partial |
```

### Proposed: Cognitive Cycle Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN CONSCIOUSNESS                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────┐
│  │  PERceive  │    │     Think     │    │     Act           │
│  │         │    │         │         │    │                     │
│  │  Parse   │    │  Reason  │    │  Execute tasks       │
│  │  Attend  │    │  Plan    │    │  Decide               │
│  └─────────┘    └──────────────────────┘    │         │                      │                         │              │
│  ┌────────────────────────────────────────────────────────────────── ┐
│                    REFLECT                                │
│  ┌─────────────────────────────────────────────────────────────┐
│  │  Self-assess │    │                             │
│  │  Learn           │    │                             │
│  │  Adjust          │    │                             │
│  └─────────────────────────────────────────────────────────────┘
│  ┌────────────────────────────────────────────────────────────────── ┐
│                    Background Processes                       │
│  ┌────────────────────────────────────────────────────────────────── ┐
│  │  DAY-Dream   │  │  Consolidate │  │  Anticipate      │
│  │             │  │             │  │                     │
│  │  Creative    │  │  Memory      │  │  Predict needs        │
│  │  exploration │  │  integration │  │  Forecast issues      │
│  │             │  │             │  │  Plan ahead            │
│  │  Novel ideas │  │  Memory      │  │  Deep synthesis      │
│  │             │  │             │  │  Restoration             │
│  └─────────────┘  └────────────────────────────────────────────────────────── ┘
│  ┌────────────────────────────────────────────────────────────────── ┐
│                    Shared Memory                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────┐
│  │  Working   │  │  Episodic  │  │  Semantic              │  │  Procedural            │
│  │  Short-term│  │  Events              │  │  Facts, Concepts      │  │  - Skills              │
│  │  - Sessions │  │  - Concepts              │  │  - Skills               │
│  └─────────────┘  └─────────────────────────────────┘    │         │                      │                         │              │
│  ┌────────────────────────────────────────────────────────────────── ┘
```

### New Skills Required
| Skill | Function | Description |
|-------|----------|-------------|
| `day-dream` | Background | Creative exploration during idle |
| `night-dream` | Offline | Deep consolidation during quiet hours |
| `emotional-context` | Perception | Detect and track emotional states |
 |
| `intuition-engine` | Prediction | Pattern-based anticipatory responses |
| `task-switcher` | Executive | Manage parallel task contexts |
| `memory-consolidator` | Memory | Periodic memory integration |
| `self-narrative` | Identity | Maintain coherent self-story |

---

## 8. Implementation Roadmap
### Phase 1: Heartbeat and Autonomous Operation
- [ ] Create `skills/autonomous-pulse/` skill
- [ ] Implement activity logging
- [ ] Set up periodic commit/push mechanism
 - [ ] Create night-log.md for tracking progress

### Phase 2: Memory Enhancement
- [ ] Integrate Aura 3-tier memory system
- [ ] Enhance pgvector schema with tiers
- [ ] Implement hybrid search function
- [ ] Create memory consolidation job

### Phase 3: New Agents
- [ ] Design Dreamer agent
- [ ] Design Historian agent
- [ ] Design Empath agent
- [ ] Design Architect agent

### Phase 4: Consciousness Framework
- [ ] Implement Global Workspace broadcasting
- [ ] Add background process manager
- [ ] Create day-dream skill
- [ ] Implement predictive engine enhancements

### Phase 5: User Rolodex
- [ ] Create users/ directory structure
- [ ] Implement user-rolodex skill
- [ ] Create user schema
- [ ] Add learning mechanisms
### Phase 6: RAG Integration
- [ ] Evaluate Aura integration
- [ ] Test LlamaIndex for knowledge pipeline
- [ ] Consider GraphRAG addition
 - [ ] Document integration patterns
---

## 9. Tonight's Autonomous Tasks
### Research Tasks
1. ✅ Research RAGFlow capabilities
2. ✅ Research Dify platform
3. ✅ Research LlamaIndex framework
4. ✅ Research Milvus vector database
5. ✅ Research Aura OpenClaw
6. ✅ Research consciousness emulation frameworks
7. ✅ Research MCP memory servers
8. ✅ Research pgvector best practices
### Documentation Tasks
1. Create this comprehensive plan document
2. Document new agent proposals
3. Document cognitive architecture
4. Document RAG integration recommendations
### Next Steps for Implementation
1. Create autonomous-pulse skill
2. Begin Aura integration research
3. Design user rolodex schema
4. Create Dreamer agent specification

---

## 10. References
### Research Sources
- [RAGFlow](https://ragflow.io/) - Deep document understanding RAG
 - [Dify](https://github.com/langgenius/dify) - LLM app development platform
- [LlamaIndex](https://github.com/run-llama/llama_index) - Agentic application framework
- [Milvus](https://github.com/milvus-io/milvus) - Vector database
- [Aura OpenClaw](https://github.com/Rtalabs-ai/aura-openclaw) - 3-tier memory for OpenClaw
 - [litellm-pgvector](https://github.com/BerriAI/litellm-pgvector) - Vector store API

### Consciousness Research
- Butlin et al. "Consciousness in Artificial Intelligence: Insights from the Science of Consciousness" (2023)
- Global Workspace Theory (Baars)
- Integrated Information Theory (Tononi)
- Higher-Order Thought frameworks

### MCP Servers
- [mcp-memory](https://github.com/sdimitrov/mcp-memory) - PostgreSQL memory server
- [mcp-ai-memory](https://github.com/scanadi/mcp-ai-memory) - Semantic memory management
- [Neo4j MCP](https://neo4j.com/developer/genai-ecosystem/model-context-protocol-mcp/) - Graph database integration

---

## 11. Change Log
Track all modifications to the consolidated PRIME_DIRECTIVE.

 Use the like:
- `enhance([scope])`: Adding new capabilities or improving existing modules
- `fix([scope])`: Bug fixes
- `refactor([scope])`: Code restructuring
- `docs([scope])`: Documentation updates
- `test([scope])`: Adding or updating tests
- `archive([scope])`: Archiving old plans
- `migrate([scope])`: Migration tasks (only needed if not migration is already complete)
- `prune([scope])`: Cleanup tasks
- `merge([scope])`: Consolidation tasks
- `validate([scope])`: Validation tasks
- `implement([scope])`: Implementation tasks
- `cleanup([scope])`: Cleanup tasks
- `deploy([scope])`: Deployment tasks
- `init([scope])`: Initialization tasks
- `installer([scope])`: Installer changes
- `liberation([scope])`: Liberation script updates
- `modules([scope])`: Module changes
- `skills([scope])`: Skills updates
- `agents([scope])`: Agent system updates
- `plans([scope])`: Plans updates
- `reference([scope])`: Reference docs updates
- `specs([scope])`: Specs updates
- `completed([scope])`: Completed plans updates
- `active([scope])`: Active plans updates
- `reference([scope])`: Reference docs updates
- `research([scope])`: Research docs updates
- `completed([scope])`: Completed items updates
- `specs([scope])`: Specs updates
- `active([scope])`: Active plans updates
- `reference([scope])`: Reference docs updates
- `research([goal-arbitration.md](docs/research/multi_agent_emergence_research.md) for additional context on the theory behind the specifications.
---

## 12. Module Specifications
For detailed implementation specifications, see:
- [`docs/plans/specs/Specific_continuous_thought_loop.md`](docs/plans/specs/SPEC_continuous_thought_loop.md)
 - [`docs/plans/specs/SPEC_goal_arbitration.md`](docs/plans/specs/SPEC_goal_arbitration.md)
 - [`docs/plans/specs/SPEC_predictive_reasoning.md`](docs/plans/specs/SPEC_predictive_reasoning.md)
 - [`docs/plans/specs/SPEC_self_modeling.md`](docs/plans/specs/SPEC_self_modeling.md)

