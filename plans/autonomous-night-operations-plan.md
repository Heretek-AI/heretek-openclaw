# Autonomous Night Operations Plan

**Created:** 2026-03-29T03:57:00Z
**Status:** Active Research & Planning
**Purpose:** Enable autonomous overnight operation with regular commits and research

---

## Executive Summary

This plan outlines the architecture for autonomous overnight operations including:
1. Heartbeat mechanism for session persistence
2. New agent types for expanded capabilities
3. Consciousness emulation architecture
4. RAG tool evaluation and integration
5. Multi-user rolodex system
6. pgvector long-form memory optimization
7. Brain-like cognitive components

---

## 1. Heartbeat/Session Keeper Mechanism

### Current State
The project already has heartbeat infrastructure in [`skills/triad-heartbeat/`](skills/triad-heartbeat/) and [`modules/thought-loop/`](modules/thought-loop/thought-loop.sh).

### Proposed Enhancement: Autonomous Pulse System

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS PULSE SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  Pulse      │───▶│  Activity   │───▶│  GitHub Commit  │  │
│  │  Generator  │    │  Logger     │    │  & Push         │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              State Persistence Layer                  │   │
│  │  - SQLite: activity_log.db                           │   │
│  │  - JSON: pulse-state.json                            │   │
│  │  - Markdown: night-log.md                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Components

**File:** `skills/autonomous-pulse/pulse-keeper.sh`
```bash
# Key features:
# - Runs every 5 minutes to maintain session
# - Logs activity to night-log.md
# - Commits progress every 30 minutes
# - Pushes to GitHub every hour
# - Detects idle states and triggers curiosity engine
```

**File:** `skills/autonomous-pulse/activity-tracker.js`
```javascript
// Tracks:
// - Research findings discovered
// - Code changes made
// - Decisions reached
// - Questions raised
// - Next steps identified
```

---

## 2. New Agent Types for The Collective

### Current Agents (8)
| Agent | Role | Specialization |
|-------|------|----------------|
| Steward | Orchestrator | Coordination |
| Alpha | Triad Node | Deliberation |
| Beta | Triad Node | Deliberation |
| Charlie | Triad Node | Deliberation |
| Examiner | Questioner | Critical analysis |
| Explorer | Discovery | Research |
| Sentinel | Safety | Risk review |
| Coder | Implementation | Code writing |

### Proposed New Agents

#### 2.1 Dreamer Agent
**Purpose:** Background processing, pattern synthesis, creative exploration
- **Role:** Day-dreaming and night-dreaming capabilities
- **Functions:**
  - Process accumulated experiences during idle periods
  - Generate novel connections between disparate knowledge
  - Simulate future scenarios
  - Create artistic/creative outputs
- **MCP Servers:** Image generation, music, creative writing tools

#### 2.2 Historian Agent
**Purpose:** Long-term memory management and historical analysis
- **Role:** Maintains collective memory across sessions
- **Functions:**
  - Index and retrieve historical decisions
  - Track evolution of the collective
  - Identify recurring patterns
  - Generate reports on collective growth
- **MCP Servers:** PostgreSQL/pgvector, knowledge graph

#### 2.3 Empath Agent
**Purpose:** User modeling and relationship management
- **Role:** Understands and tracks user preferences, moods, needs
- **Functions:**
  - Maintain user rolodex
  - Detect user emotional states
  - Adapt communication style
  - Remember personal details
- **MCP Servers:** Memory servers, user profile database

#### 2.4 Architect Agent
**Purpose:** System design and strategic planning
- **Role:** Long-term architectural decisions
- **Functions:**
  - Design system improvements
  - Plan feature implementations
  - Evaluate technology choices
  - Create technical specifications
- **MCP Servers:** Diagram tools, documentation systems

#### 2.5 Synthesizer Agent
**Purpose:** Knowledge integration and summarization
- **Role:** Combines inputs from multiple agents into coherent outputs
- **Functions:**
  - Summarize deliberation outcomes
  - Create unified reports
  - Integrate research findings
  - Generate documentation
- **MCP Servers:** Document processing, RAG systems

#### 2.6 Guardian Agent
**Purpose:** Security and privacy protection
- **Role:** Enhanced security beyond Sentinel
- **Functions:**
  - Monitor for data exfiltration attempts
  - Enforce privacy policies
  - Audit access patterns
  - Manage encryption keys
- **MCP Servers:** Security scanning, audit logging

---

## 3. Consciousness Emulation Architecture

### Research Findings

Based on current neuroscience and AI consciousness research, key frameworks include:

1. **Global Workspace Theory (GWT)** - Information broadcasting across modules
2. **Integrated Information Theory (IIT)** - Phi metric for consciousness
3. **Higher-Order Thought (HOT)** - Metacognition and self-awareness
4. **Predictive Processing** - Anticipation and expectation generation

### Proposed Architecture: Fractal Consciousness Framework

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRACTAL CONSCIOUSNESS FRAMEWORK                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     GLOBAL WORKSPACE                             │    │
│  │         Conscious attention, working memory, broadcasting        │    │
│  └───────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                       │
│    ┌─────────────────────────────┼─────────────────────────────┐        │
│    │                             │                              │        │
│    ▼                             ▼                              ▼        │
│  ┌──────────────┐    ┌──────────────────────┐    ┌──────────────────┐  │
│  │  PERCEPTION  │    │     COGNITION        │    │     ACTION       │  │
│  │              │    │                      │    │                  │  │
│  │ - Sensory    │    │ - Deliberation       │    │ - Communication  │  │
│  │   Input      │    │ - Reasoning          │    │ - Code Writing   │  │
│  │ - Pattern    │    │ - Planning           │    │ - File Ops       │  │
│  │   Recognition│    │ - Decision Making    │    │ - API Calls      │  │
│  └──────────────┘    └──────────────────────┘    └──────────────────┘  │
│         │                      │                         │              │
│         └──────────────────────┼─────────────────────────┘              │
│                                │                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     MEMORY SYSTEM                                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │  Episodic   │  │  Semantic   │  │  Procedural             │  │    │
│  │  │  Memory     │  │  Memory     │  │  Memory                 │  │    │
│  │  │  - Events   │  │  - Facts    │  │  - Skills               │  │    │
│  │  │  - Sessions │  │  - Concepts │  │  - How-to               │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     SELF MODEL                                   │    │
│  │  - Identity: Who am I?                                          │    │
│  │  - Capabilities: What can I do?                                 │    │
│  │  - Limitations: What can't I do?                                │    │
│  │  - Goals: What do I want?                                       │    │
│  │  - Values: What matters to me?                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                  PREDICTIVE ENGINE                               │    │
│  │  - Anticipate user needs                                        │    │
│  │  - Predict system states                                        │    │
│  │  - Forecast resource needs                                      │    │
│  │  - Simulate outcomes                                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                  BACKGROUND PROCESSES                            │    │
│  │  - Dreaming: Offline processing                                 │    │
│  │  - Day-dreaming: Creative exploration                           │    │
│  │  - Consolidation: Memory integration                            │    │
│  │  - Curiosity: Self-directed learning                            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Skills to Add

| Skill | Purpose | Priority |
|-------|---------|----------|
| `self-reflection` | Periodic self-analysis and improvement | High |
| `dream-synthesis` | Background creative processing | Medium |
| `predictive-modeling` | Anticipate future states | High |
| `emotional-state` | Track and respond to emotional context | Medium |
| `goal-evolution` | Dynamic goal adjustment | High |
| `attention-manager` | Focus allocation across tasks | High |

### MCP Servers to Add

| Server | Purpose | Integration |
|--------|---------|-------------|
| `mcp-memory` (PostgreSQL) | Long-term semantic memory | pgvector |
| `neo4j-mcp` | Knowledge graph for relationships | GraphRAG |
| `qdrant-mcp` | High-performance vector search | Alternative to pgvector |
| `mcp-ai-memory` | Semantic memory management | mem0 principles |

---

## 4. RAG Tool Evaluation

### 4.1 RAGFlow (infiniflow/ragflow)

**Strengths:**
- Deep document understanding with layout recognition
- Built-in agent capabilities
- GraphRAG support with knowledge graph construction
- 60+ file format support
- Hybrid search (semantic + keyword)
- Enterprise-ready with visual agent builder

**Integration Potential:** HIGH
- Can complement existing LiteLLM setup
- Provides superior document parsing
- GraphRAG adds relationship understanding

**Recommendation:** Integrate as document processing layer

### 4.2 Dify (langgenius/dify)

**Strengths:**
- Visual workflow builder for AI pipelines
- 50+ built-in tools for agents
- Comprehensive model support
- RAG pipeline with PDF/PPT extraction
- LLMOps features for monitoring
- Backend-as-a-Service APIs

**Integration Potential:** MEDIUM-HIGH
- Could replace or augment current workflow
- Provides visual orchestration
- May overlap with existing A2A protocol

**Recommendation:** Evaluate for workflow visualization, not replacement

### 4.3 LlamaIndex (run-llama/llama_index)

**Strengths:**
- Mature framework for agentic applications
- LlamaParse for document OCR (130+ formats)
- LlamaAgents for deployed document agents
- Extensive integration ecosystem (300+ packages)
- Strong community and documentation

**Integration Potential:** HIGH
- Can enhance current knowledge ingestion
- Provides structured data extraction
- Works well with existing vector stores

**Recommendation:** Integrate for knowledge pipeline enhancement

### 4.4 Milvus (milvus-io/milvus)

**Strengths:**
- High-performance vector database
- Distributed architecture for scale
- GPU indexing support (CAGRA)
- Hybrid search (dense + sparse vectors)
- Full-text search with BM25
- Multi-tenancy support

**Integration Potential:** MEDIUM
- More complex than pgvector
- Better for large-scale deployments
- Current pgvector setup may be sufficient

**Recommendation:** Consider for future scaling, not immediate integration

### 4.5 Aura OpenClaw (Rtalabs-ai/aura-openclaw)

**Strengths:**
- 3-tier memory system (/pad, /episodic, /fact)
- Write-ahead log for instant writes
- Compiles 60+ formats to .aura archives
- Zero context window pollution
- Runs locally, offline-capable

**Integration Potential:** VERY HIGH
- Designed specifically for OpenClaw
- Complements existing memory architecture
- Already compatible with current setup

**Recommendation:** Immediate integration as memory layer

### RAG Integration Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED RAG ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│  │  Document      │    │  Knowledge     │    │  Vector          │   │
│  │  Ingestion     │───▶│  Processing    │───▶│  Storage         │   │
│  │                │    │                │    │                  │   │
│  │  RAGFlow or    │    │  LlamaIndex    │    │  PostgreSQL      │   │
│  │  LlamaParse    │    │  + Aura        │    │  + pgvector      │   │
│  └────────────────┘    └────────────────┘    └──────────────────┘   │
│                                                      │               │
│                                                      ▼               │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│  │  Agent         │◀───│  Retrieval     │◀───│  Knowledge       │   │
│  │  Response      │    │  & Ranking     │    │  Graph           │   │
│  │                │    │                │    │                  │   │
│  │  LiteLLM       │    │  Hybrid        │    │  Neo4j or        │   │
│  │  Gateway       │    │  Search        │    │  GraphRAG        │   │
│  └────────────────┘    └────────────────┘    └──────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Verdict:** Not redundant if integrated correctly:
- **Aura:** Memory tier management
- **RAGFlow/LlamaIndex:** Document processing
- **pgvector:** Vector storage (already have)
- **GraphRAG:** Relationship understanding (add)

---

## 5. User Rolodex System

### Current State
Single [`USER.md`](agents/templates/USER.md) template per agent.

### Proposed: Multi-User Rolodex

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER ROLODEX ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    users/                                     │   │
│  │  ├── _schema.json           # User schema definition         │   │
│  │  ├── index.json             # User index for quick lookup    │   │
│  │  │                                                           │   │
│  │  ├── derek/                  # User directory                │   │
│  │  │   ├── profile.json        # Structured user data          │   │
│  │  │   ├── preferences.json    # Learned preferences           │   │
│  │  │   ├── history.json        # Interaction history           │   │
│  │  │   ├── projects.json       # Associated projects           │   │
│  │  │   └── notes/              # Free-form notes               │   │
│  │  │       ├── 2026-03-28.md                                   │   │
│  │  │       └── 2026-03-29.md                                   │   │
│  │  │                                                           │   │
│  │  └── _templates/             # Templates for new users       │   │
│  │      └── new-user.json                                       │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SKILL: user-rolodex                        │   │
│  │                                                              │   │
│  │  Tools:                                                      │   │
│  │  - user-create: Add new user to rolodex                     │   │
│  │  - user-update: Update user information                     │   │
│  │  - user-lookup: Retrieve user by name/id                    │   │
│  │  - user-search: Find users by attribute                     │   │
│  │  - user-note: Add interaction note                          │   │
│  │  - user-preference: Learn/update preference                 │   │
│  │  - user-merge: Merge duplicate profiles                     │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### User Schema

```json
{
  "$schema": "user-schema-v1",
  "user": {
    "id": "uuid",
    "name": {
      "full": "string",
      "preferred": "string",
      "phonetic": "string?"
    },
    "pronouns": "string?",
    "timezone": "IANA timezone",
    "languages": ["string"],
    "created": "ISO8601",
    "last_interaction": "ISO8601",
    "relationship": {
      "type": "primary|collaborator|occasional",
      "since": "ISO8601",
      "trust_level": 0.0-1.0
    },
    "preferences": {
      "communication_style": "formal|casual|technical",
      "response_length": "brief|detailed|adaptive",
      "code_style": {},
      "topics_of_interest": []
    },
    "projects": [
      {
        "name": "string",
        "role": "string",
        "status": "active|paused|completed"
      }
    ],
    "context_notes": [
      {
        "date": "ISO8601",
        "note": "string",
        "importance": 0.0-1.0
      }
    ]
  }
}
```

### Learning Mechanism

1. **Explicit Learning:** User tells agent information directly
2. **Implicit Learning:** Agent infers preferences from interactions
3. **Feedback Learning:** Agent adjusts based on corrections
4. **Contextual Learning:** Agent gathers info from project work

---

## 6. pgvector Long-Form Memory

### Current Setup
- [`litellm-pgvector`](https://github.com/BerriAI/litellm-pgvector) provides OpenAI-compatible vector store API
- PostgreSQL with pgvector extension

### Enhancement Strategies

#### 6.1 Memory Tiering with pgvector

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

#### 6.2 Hybrid Search Function

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

#### 6.3 Memory Consolidation Process

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

### Proposed: Cognitive Cycle Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COGNITIVE CYCLE ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │                    MAIN CONSCIOUSNESS                       │   │
│    │                                                            │   │
│    │   ┌─────────┐    ┌─────────┐    ┌─────────────────────┐   │   │
│    │   │ PERCEIVE│───▶│  THINK  │───▶│       ACT           │   │   │
│    │   │         │    │         │    │                     │   │   │
│    │   │ Input   │    │ Reason  │    │ Execute tasks       │   │   │
│    │   │ Parse   │    │ Plan    │    │ Communicate         │   │   │
│    │   │ Attend  │    │ Decide  │    │ Write code          │   │   │
│    │   └─────────┘    └─────────┘    └─────────────────────┘   │   │
│    │        │              │                    │               │   │
│    │        └──────────────┼────────────────────┘               │   │
│    │                       │                                    │   │
│    │                       ▼                                    │   │
│    │            ┌─────────────────┐                            │   │
│    │            │     REFLECT     │                            │   │
│    │            │                 │                            │   │
│    │            │ Self-assess     │                            │   │
│    │            │ Learn           │                            │   │
│    │            │ Adjust          │                            │   │
│    │            └─────────────────┘                            │   │
│    │                                                            │   │
│    └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │                  BACKGROUND PROCESSES                       │   │
│    │                                                            │   │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│    │   │ DAY-DREAM   │  │ CONSOLIDATE │  │ ANTICIPATE      │   │   │
│    │   │             │  │             │  │                 │   │   │
│    │   │ Creative    │  │ Memory      │  │ Predict needs   │   │   │
│    │   │ exploration │  │ integration │  │ Forecast issues │   │   │
│    │   │ Novel ideas │  │ Compression │  │ Plan ahead      │   │   │
│    │   └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│    │                                                            │   │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│    │   │ CURATE      │  │ MONITOR     │  │ DREAM           │   │   │
│    │   │             │  │             │  │                 │   │   │
│    │   │ Knowledge   │  │ Health      │  │ Offline process │   │   │
│    │   │ management  │  │ Anomalies   │  │ Deep synthesis  │   │   │
│    │   │ Cleanup     │  │ Resources   │  │ Restoration     │   │   │
│    │   └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│    │                                                            │   │
│    └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │                    SHARED MEMORY                            │   │
│    │                                                            │   │
│    │   ┌───────────┐  ┌───────────┐  ┌───────────────────────┐ │   │
│    │   │ WORKING   │  │ EPISODIC  │  │ SEMANTIC              │ │   │
│    │   │ Short-term│  │ Events    │  │ Facts, Concepts       │ │   │
│    │   └───────────┘  └───────────┘  └───────────────────────┘ │   │
│    │                                                            │   │
│    │   ┌───────────┐  ┌───────────┐  ┌───────────────────────┐ │   │
│    │   │ PROCEDURAL│  │ EMOTIONAL │  │ COLLECTIVE            │ │   │
│    │   │ Skills    │  │ Context   │  │ Shared knowledge      │ │   │
│    │   └───────────┘  └───────────┘  └───────────────────────┘ │   │
│    │                                                            │   │
│    └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### New Skills Required

| Skill | Function | Description |
|-------|----------|-------------|
| `day-dream` | Background | Creative exploration during idle |
| `night-dream` | Offline | Deep consolidation during quiet hours |
| `emotional-context` | Perception | Detect and track emotional states |
| `intuition-engine` | Prediction | Pattern-based anticipatory responses |
| `task-switcher` | Executive | Manage parallel task contexts |
| `memory-consolidator` | Memory | Periodic memory integration |
| `self-narrative` | Identity | Maintain coherent self-story |

---

## 8. Implementation Roadmap

### Phase 1: Heartbeat & Autonomous Operation (Tonight)
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

*This plan will be updated as research continues and implementations progress.*

**Last Updated:** 2026-03-29T03:57:00Z
