# Swarm Memory Architecture

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Shared Episodic Memory Structure](#shared-episodic-memory-structure)
4. [Semantic Memory Consolidation](#semantic-memory-consolidation)
5. [Memory Access Control Model](#memory-access-control-model)
6. [Memory Synchronization Protocol](#memory-synchronization-protocol)
7. [Integration with 3-Tier Memory System](#integration-with-3-tier-memory-system)
8. [Implementation Recommendations](#implementation-recommendations)
9. [API Reference](#api-reference)
10. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Purpose

This document defines the **Swarm Memory Architecture** for Heretek OpenClaw, enabling shared knowledge and collective learning across agent swarms. The architecture addresses the gap identified in [`GAP_ANALYSIS_REPORT.md`](../GAP_ANALYSIS_REPORT.md:403) where "No Swarm Memory" was identified as a P1 high-priority initiative, with recommendation to "Fork and integrate" SwarmRecall-inspired memory capabilities.

### Problem Statement

Current memory architecture limitations:

| Limitation | Impact | Current State |
|------------|--------|---------------|
| **Triad-Only Memory Sharing** | Limited collective learning | Only Alpha, Beta, Charlie share memory |
| **No Cross-Agent Context** | Agents lack swarm awareness | Each agent has isolated session storage |
| **No Distributed Storage** | Single-instance limitation | Memory tied to Gateway process |
| **No Real-Time Sync** | Stale knowledge across agents | HTTP sync only |

### Solution Overview

The Swarm Memory Architecture introduces:

1. **Shared Episodic Memory Pool** - Cross-agent experience storage with vector search
2. **Swarm Semantic Layer** - Consolidated knowledge accessible by all agents
3. **Memory Access Control** - Permission-based memory operations
4. **Synchronization Protocol** - Real-time memory consistency across distributed agents
5. **3-Tier Integration** - Backward-compatible with existing Session → Episodic → Semantic flow

### Key Capabilities

| Capability | Description | Priority |
|------------|-------------|----------|
| **Swarm Memory Pool** | Shared memory storage accessible by all agents | P0 |
| **Cross-Agent Retrieval** | Vector search across swarm experiences | P0 |
| **Memory Permissions** | Read/write access control per agent | P1 |
| **Real-Time Sync** | Event-based memory synchronization | P1 |
| **Distributed Support** | Multi-instance swarm coordination | P2 |

---

## Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Heretek OpenClaw Stack                                    │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                    OpenClaw Gateway (Port 18789)                          │   │
│  │                                                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Agent Workspaces (11)                             │  │   │
│  │  │                                                                      │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │  │   │
│  │  │  │  Triad   │ │ Advocates│ │ Artisans │ │Synthesizers│             │  │   │
│  │  │  │  α,β,χ   │ │ 🦔❓🧭   │ │ ⌨️🦞    │ │ 💭💙     │               │  │   │
│  │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │  │   │
│  │  │       │            │            │            │                       │  │   │
│  │  │       └────────────┴────────────┴────────────┘                       │  │   │
│  │  │                            │                                         │  │   │
│  │  │                   ┌────────▼────────┐                               │  │   │
│  │  │                   │ Memory Keeper   │                               │  │   │
│  │  │                   │ Historian 📜    │                               │  │   │
│  │  │                   └────────┬────────┘                               │  │   │
│  │  └────────────────────────────┼────────────────────────────────────────┘  │   │
│  └───────────────────────────────┼────────────────────────────────────────────┘   │
│                                  │                                                 │
│  ┌───────────────────────────────▼────────────────────────────────────────────┐   │
│  │                        Swarm Memory Layer                                   │   │
│  │                                                                             │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │   │
│  │  │ Shared Episodic     │  │ Swarm Semantic      │  │ Memory Sync        │  │   │
│  │  │ Memory Pool         │  │ Knowledge Base      │  │ Protocol           │  │   │
│  │  │                     │  │                     │  │                    │  │   │
│  │  │ - Vector Index      │  │ - Consolidated      │  │ - Event Bus        │  │   │
│  │  │ - Multi-Agent       │  │   Knowledge         │  │ - Conflict         │  │   │
│  │  │   Access            │  │ - Schema Graph      │  │   Resolution       │  │   │
│  │  │ - Priority Queue    │  │ - Cross-Agent       │  │ - Consistency      │  │   │
│  │  └─────────────────────┘  │   Links           │  │   Guarantees       │  │   │
│  │                           └─────────────────────┘  └────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                    Existing Memory Tiers (Backward Compatible)               │  │
│  │                                                                              │  │
│  │  Session → [Consolidation] → Episodic → [Promotion] → Semantic              │  │
│  │                                                                                  │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Swarm Memory Architecture                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Swarm Memory API Layer                                │    │
│  │                                                                          │    │
│  │  swarmMemory.write(agentId, memory)     → Write memory to swarm pool    │    │
│  │  swarmMemory.read(agentId, query)       → Read from swarm pool          │    │
│  │  swarmMemory.search(agentId, vector)    → Vector search across swarm    │    │
│  │  swarmMemory.subscribe(agentId, filter) → Subscribe to memory events    │    │
│  │  swarmMemory.getPermissions(agentId)    → Get agent memory permissions  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│  ┌───────────────────────────────┼─────────────────────────────────────────┐    │
│  │                               ▼                                          │    │
│  │  ┌───────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Memory Access Controller                        │   │    │
│  │  │                                                                   │   │    │
│  │  │  - Agent Authentication                                           │   │    │
│  │  │  - Permission Validation                                          │   │    │
│  │  │  - Access Logging                                                 │   │    │
│  │  │  - Rate Limiting                                                  │   │    │
│  │  └───────────────────────────────────────────────────────────────────┘   │    │
│  │                                    │                                      │    │
│  │  ┌───────────────────────────────┼───────────────────────────────────┐   │    │
│  │  │                               ▼                                    │   │    │
│  │  │  ┌─────────────────────────────────────────────────────────────┐   │   │    │
│  │  │  │                    Shared Memory Store                       │   │   │    │
│  │  │  │                                                              │   │   │    │
│  │  │  │  ┌──────────────────┐  ┌──────────────────┐                │   │   │    │
│  │  │  │  │ Episodic Pool    │  │ Semantic Pool    │                │   │   │    │
│  │  │  │  │                  │  │                  │                │   │   │    │
│  │  │  │  │ - HNSW Index     │  │ - Neo4j Graph    │                │   │   │    │
│  │  │  │  │ - Pebble DB      │  │ - pgvector       │                │   │   │    │
│  │  │  │  │ - Priority Queue │  │ - Schema Store   │                │   │   │    │
│  │  │  │  └──────────────────┘  └──────────────────┘                │   │   │    │
│  │  │  └─────────────────────────────────────────────────────────────┘   │   │    │
│  │  │                                    │                                 │    │
│  │  │  ┌───────────────────────────────┼───────────────────────────────┐ │    │
│  │  │  │                               ▼                                │ │    │
│  │  │  │  ┌────────────────────────────────────────────────────────┐   │ │    │
│  │  │  │  │                    Synchronization Layer                │   │ │    │
│  │  │  │  │                                                         │   │ │    │
│  │  │  │  │  - Memory Event Bus (WebSocket)                        │   │ │    │
│  │  │  │  │  - Conflict Detection & Resolution                      │   │ │    │
│  │  │  │  │  - Consistency Protocol (Eventual → Strong)            │   │ │    │
│  │  │  │  │  - Distributed Lock Manager                            │   │ │    │
│  │  │  │  └─────────────────────────���──────────────────────────────┘   │ │    │
│  │  │  └───────────────────────────────────────────────────────────────┘ │    │
│  │  │                                    │                                 │    │
│  │  │  ┌───────────────────────────────┼───────────────────────────────┐ │    │
│  │  │  │                               ▼                                │ │    │
│  │  │  │  ┌────────────────────────────────────────────────────────┐   │ │    │
│  │  │  │  │                    Consolidation Engine                 │   │ │    │
│  │  │  │  │                                                         │   │ │    │
│  │  │  │  │  - Cross-Agent Memory Promotion                         │   │ │    │
│  │  │  │  │  - Swarm Schema Formation                               │   │ │    │
│  │  │  │  │  - Collective Forgetting (Decay)                        │   │ │    │
│  │  │  │  └────────────────────────────────────────────────────────┘   │ │    │
│  │  │  └───────────────────────────────────────────────────────────────┘ │    │
│  │  └─────────────────────────────────────────────────────────────────────┘    │
│  └──────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Agent      │     │   Swarm      │     │   Shared     │
│   Write      │────>│   Access     │────>│   Memory     │
│   Request    │     │   Control    │     │   Store      │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   Access     │     │   Memory     │
                     │   Log        │     │   Event      │
                     └──────────────┘     └──────────────┘
                                                 │
                                                 │
                    ┌────────────────────────────┘
                    │
                    ▼
          ┌──────────────────┐     ┌──────────────────┐
          │   Subscribed     │     │   Conflict       │
          │   Agents         │<────│   Resolver       │
          └──────────────────┘     └──────────────────┘
```

---

## Shared Episodic Memory Structure

### Memory Pool Architecture

The shared episodic memory pool enables cross-agent experience storage and retrieval.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Shared Episodic Memory Pool                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Memory Entry Structure                                │    │
│  │                                                                          │    │
│  │  {                                                                        │    │
│  │    "id": "mem-{agent_id}-{timestamp}-{sequence}",                        │    │
│  │    "sourceAgent": "explorer",                                            │    │
│  │    "sessionId": "session-123",                                           │    │
│  │    "content": {                                                          │    │
│  │      "text": "...",                                                      │    │
│  │      "embedding": [768 dimensions],                                      │    │
│  │      "metadata": {...}                                                   │    │
│  │    },                                                                    │    │
│  │    "priority": {                                                         │    │
│  │      "emotionalScore": 0.8,                                              │    │
│  │      "frequencyScore": 0.6,                                              │    │
│  │      "semanticScore": 0.7,                                               │    │
│  │      "swarmRelevance": 0.9                                               │    │
│  │    },                                                                    │    │
│  │    "accessControl": {                                                    │    │
│  │      "owner": "explorer",                                                │    │
│  │      "readPermissions": ["triad", "historian"],                          │    │
│  │      "writePermissions": ["explorer"],                                   │    │
│  │      "inheritable": true                                                 │    │    │
│  │    },                                                                    │    │
│  │    "timestamps": {                                                       │    │
│  │      "created": 1711843200000,                                           │    │
│  │      "lastAccessed": 1711843300000,                                      │    │
│  │      "expiresAt": 1712448000000                                          │    │
│  │    },                                                                    │    │
│  │    "consolidation": {                                                    │    │
│  │      "status": "pending",                                                │    │
│  │      "promotedToSemantic": false,                                        │    │
│  │      "schemaLinks": []                                                   │    │
│  │    }                                                                     │    │
│  │  }                                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Storage Backend                                       │    │
│  │                                                                          │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                      │    │
│  │  │  HNSW Vector Index  │  │  Pebble DB KV       │                      │    │
│  │  │  (Similarity Search)│  │  (Document Store)   │                      │    │
│  │  │                     │  │                     │                      │    │
│  │  │  - 768 dimensions   │  │  - Full documents   │                      │    │
│  │  │  - Cosine similarity│  │  - Metadata index   │                      │    │
│  │  │  - 10K entries hot  │  │  - Compression      │                      │    │
│  │  └─────────────────────┘  └─────────────────────┘                      │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Memory Entry Schema

```typescript
interface SwarmMemoryEntry {
  // Identification
  id: string;                    // Unique memory identifier
  sourceAgent: AgentId;          // Agent that created this memory
  sessionId: string;             // Source session identifier
  
  // Content
  content: {
    text: string;                // Raw text content
    embedding: number[];         // Vector embedding (768 dimensions)
    metadata: MemoryMetadata;    // Additional metadata
  };
  
  // Priority scoring for consolidation
  priority: {
    emotionalScore: number;      // 0-1 emotional significance
    frequencyScore: number;      // 0-1 access frequency
    semanticScore: number;       // 0-1 conceptual richness
    swarmRelevance: number;      // 0-1 relevance to swarm goals
  };
  
  // Access control
  accessControl: {
    owner: AgentId;              // Owning agent
    readPermissions: PermissionGroup[];  // Groups with read access
    writePermissions: AgentId[];         // Agents with write access
    inheritable: boolean;        // Can permissions be inherited
  };
  
  // Lifecycle
  timestamps: {
    created: number;             // Creation timestamp (ms)
    lastAccessed: number;        // Last access timestamp
    expiresAt: number;           // Expiration timestamp
  };
  
  // Consolidation state
  consolidation: {
    status: 'pending' | 'consolidating' | 'consolidated' | 'decayed';
    promotedToSemantic: boolean;
    schemaLinks: string[];       // Links to semantic schemas
  };
}

interface MemoryMetadata {
  // Context
  conversationContext?: string;
  agentState?: AgentState;
  environmentalContext?: Record<string, any>;
  
  // Emotional markers (from consciousness plugin)
  emotionalMarkers?: {
    surprise: number;
    reward: number;
    punishment: number;
    novelty: number;
    relevance: number;
  };
  
  // Access tracking
  accessHistory?: {
    timestamp: number;
    accessor: AgentId;
    operation: 'read' | 'write' | 'search';
  }[];
  
  // Tags and categories
  tags?: string[];
  categories?: string[];
}
```

### Memory Priority Calculation

```javascript
/**
 * Calculate priority score for swarm memory entry
 * Used for consolidation scheduling and retention decisions
 */
function calculatePriority(memory) {
  const { priority, timestamps, consolidation } = memory;
  
  // Base priority from scores
  const basePriority = 
    priority.emotionalScore * 0.35 +
    priority.frequencyScore * 0.30 +
    priority.semanticScore * 0.20 +
    priority.swarmRelevance * 0.15;
  
  // Recency modifier (decay over time)
  const ageHours = (Date.now() - timestamps.created) / (1000 * 60 * 60);
  const recencyModifier = Math.exp(-ageHours / 24); // 24-hour half-life
  
  // Consolidation bonus (higher priority if not yet consolidated)
  const consolidationBonus = consolidation.status === 'pending' ? 1.2 : 1.0;
  
  return basePriority * recencyModifier * consolidationBonus;
}
```

### Cross-Agent Retrieval

```javascript
/**
 * Search across swarm memory pool with agent-specific filtering
 */
async function swarmSearch(agentId, query, options = {}) {
  const {
    topK = 10,
    threshold = 0.5,
    includeAgents = [],      // Filter by specific agents
    excludeAgents = [],      // Exclude specific agents
    timeRange = null,        // { start, end }
    categories = [],         // Filter by categories
  } = options;
  
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Build access filter based on agent permissions
  const accessFilter = buildAccessFilter(agentId);
  
  // 3. Perform vector search with filters
  const results = await vectorStore.search(queryEmbedding, {
    topK: topK * 2,  // Retrieve more for filtering
    threshold,
    filters: {
      ...accessFilter,
      ...(includeAgents.length > 0 && { sourceAgent: { $in: includeAgents } }),
      ...(excludeAgents.length > 0 && { sourceAgent: { $nin: excludeAgents } }),
      ...(timeRange && { 
        'timestamps.created': { 
          $gte: timeRange.start, 
          $lte: timeRange.end 
        } 
      }),
      ...(categories.length > 0 && { categories: { $in: categories } }),
    },
  });
  
  // 4. Re-rank by combined relevance + priority
  const rankedResults = results
    .map(result => ({
      ...result,
      combinedScore: 
        result.similarity * 0.7 + 
        result.document.priority.swarmRelevance * 0.3,
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, topK);
  
  return rankedResults;
}
```

---

## Semantic Memory Consolidation

### Swarm Semantic Layer

The swarm semantic layer consolidates knowledge from multiple agents into shared schemas.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Swarm Semantic Layer                                      │
├───────────────────────────────────────────────────────────────────────────��─────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Knowledge Schema Structure                            │    │
│  │                                                                          │    │
│  │  Schema: "Vector Search Implementation"                                  │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                                                                  │    │    │
│  │  │  id: "schema-vector-search-001"                                  │    │    │
│  │  │  concept: "vector_search"                                        │    │    │
│  │  │                                                                  │    │    │
│  │  │  contributors: [                                                 │    │    │
│  │  │    { agent: "explorer", memoryCount: 15, confidence: 0.9 },      │    │    │
│  │  │    { agent: "historian", memoryCount: 8, confidence: 0.85 },     │    │    │
│  │  │    { agent: "coder", memoryCount: 5, confidence: 0.95 }          │    │    │
│  │  │  ]                                                               │    │    │
│  │  │                                                                  │    │    │
│  │  │  abstraction: {                                                  │    │    │
│  │  │    level: 2,  // 0=concrete, 1=abstract, 2=principle             │    │    │
│  │  │    summary: "HNSW algorithm enables efficient approximate        │    │    │
│  │  │              nearest neighbor search in high-dimensional         │    │    │
│  │  │              spaces with logarithmic query time.",               │    │    │
│  │  │    keyConcepts: ["HNSW", "vector indexing", "ANN search"],       │    │    │
│  │  │    relationships: [                                              │    │    │
│  │  │      { to: "memory_systems", type: "implements" },               │    │    │
│  │  │      { to: "similarity_search", type: "enables" }                │    │    │
│  │  │    ]                                                             │    │    │
│  │  │  }                                                               │    │    │
│  │  │                                                                  │    │    │
│  │  │  provenance: {                                                   │    │    │
│  │  │    firstObserved: 1711843200000,                                 │    │    │
│  │  │    lastUpdated: 1711929600000,                                   │    │    │
│  │  │    consolidationCycles: 3                                        │    │    │
│  │  │  }                                                               │    │    │
│  │  │                                                                  │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Schema Graph (Neo4j)                                  │    │
│  │                                                                          │    │
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐                       │    │
│  │  │  Vector  │─────>│  Memory  │─────>│  Agent   │                       │    │
│  │  │  Search  │ IMPLEMENTS │ Systems │ OWNS     │  explorer  │            │    │
│  │  └──────────┘      └──────────┘      └──────────┘                       │    │
│  │       │                                      │                           │    │
│  │       │ ENABLES                              │ CONTRIBUTED_BY            │    │
│  │       ▼                                      ▼                           │    │
│  │  ┌──────────┐                          ┌──────────┐                      │    │
│  │  │ Similarity│                         │ Historian │                      │    │
│  │  │  Search  │                          └──────────┘                      │    │
│  │  └──────────┘                                                             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Schema Schema Definition

```typescript
interface SwarmSchema {
  // Identification
  id: string;                    // Unique schema identifier
  concept: string;               // Canonical concept name
  
  // Contributor tracking
  contributors: {
    agent: AgentId;
    memoryCount: number;         // Number of memories contributed
    confidence: number;          // Agent's confidence in contribution
  }[];
  
  // Abstraction details
  abstraction: {
    level: 0 | 1 | 2;           // 0=concrete, 1=abstract, 2=principle
    summary: string;            // Natural language summary
    keyConcepts: string[];      // Core concepts
    relationships: {
      to: string;               // Target schema ID
      type: string;             // Relationship type
    }[];
  };
  
  // Provenance tracking
  provenance: {
    firstObserved: number;      // Timestamp of first contributing memory
    lastUpdated: number;        // Last schema update
    consolidationCycles: number; // Number of consolidation cycles
  };
  
  // Access control (inherited from contributing memories)
  accessControl: {
    readPermissions: PermissionGroup[];
    writePermissions: AgentId[];
  };
}
```

### Consolidation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Swarm Consolidation Pipeline                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Episode    │───>│   Content    │───>│   Concept    │───>│   Schema     │  │
│  │   Memories   │    │   Extract    │    │   Identify   │    │   Form       │  │
│  │   (Multi-    │    │   (LLM +     │    │   (Clustering│    │   (Graph     │  │
│  │    Agent)    │    │    NER)      │    │    + LLM)    │    │    Merge)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │                   │           │
│         ▼                   ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Consolidation State Tracking                          │    │
│  │                                                                          │    │
│  │  {                                                                        │    │
│  │    "stage": "schema-form",                                               │    │
│  │    "inputMemories": ["mem-1", "mem-2", "mem-3"],                         │    │
│  │    "extractedConcepts": ["vector", "search", "hnsw"],                    │    │
│  │    "targetSchema": "schema-vector-search-001",                           │    │
│  │    "contributors": ["explorer", "historian"],                            │    │
│  │    "confidence": 0.87                                                    │    │
│  │  }                                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Cross-Agent Schema Formation

```javascript
/**
 * Form schema from memories contributed by multiple agents
 */
async function formSwarmSchema(concept, memories) {
  // 1. Group memories by contributing agent
  const byAgent = groupBy(memories, 'sourceAgent');
  
  // 2. Extract concepts from each agent's memories
  const agentConcepts = {};
  for (const [agent, agentMemories] of Object.entries(byAgent)) {
    agentConcepts[agent] = await extractConcepts(agentMemories);
  }
  
  // 3. Find overlapping concepts (consensus)
  const consensusConcepts = findIntersection(Object.values(agentConcepts));
  
  // 4. Build schema with contributor attribution
  const schema = {
    id: generateSchemaId(concept),
    concept,
    contributors: Object.entries(byAgent).map(([agent, memories]) => ({
      agent,
      memoryCount: memories.length,
      confidence: calculateConfidence(memories),
    })),
    abstraction: {
      level: determineAbstractionLevel(consensusConcepts),
      summary: await generateSummary(consensusConcepts),
      keyConcepts: Array.from(consensusConcepts),
      relationships: await findRelationships(consensusConcepts),
    },
    provenance: {
      firstObserved: Math.min(...memories.map(m => m.timestamps.created)),
      lastUpdated: Date.now(),
      consolidationCycles: 1,
    },
  };
  
  // 5. Store in Neo4j graph
  await neo4jStore.saveSchema(schema);
  
  return schema;
}
```

---

## Memory Access Control Model

### Permission Groups

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Memory Access Control Model                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Permission Hierarchy                                  │    │
│  │                                                                          │    │
│  │  ┌──────────────────┐                                                   │    │
│  │  │  OWNER           │  Full control (read, write, delete, share)        │    │
│  │  │  (Creating Agent)│                                                   │    │
│  │  └──────────────────┘                                                   │    │
│  │           │                                                             │    │
│  │           ▼                                                             │    │
│  │  ┌──────────────────┐                                                   │    │
│  │  │  TRIAD           │  Read all, write own, propose deletions           │    │
│  │  │  (α, β, χ)       │                                                   │    │
│  │  └──────────────────┘                                                   │    │
│  │           │                                                             │    │
│  │           ▼                                                             │    │
│  │  ┌──────────────────┐                                                   │    │
│  │  │  MEMORY_KEEPER   │  Read all, consolidate, promote to semantic       │    │
│  │  │  (Historian)     │                                                   │    │
│  │  └──────────────────┘                                                   │    │
│  │           │                                                             │    │
│  │           ▼                                                             │    │
│  │  ┌──────────────────┐                                                   │    │
│  │  │  ADVOCATES       │  Read relevant, write own                         │    │
│  │  │  (❓🦔🧭)        │                                                   │    │
│  │  └──────────────────┘                                                   │    │
│  │           │                                                             │    │
│  │           ▼                                                             │    │
│  │  ┌──────────────────┐                                                   │    │
│  │  │  ARTISANS        │  Read relevant, write own                         │    │
│  │  │  (⌨️🦞)          │                                                   │    │
│  │  └──────────────────┘                                                   │    │
│  │           │                                                             │    │
│  │           ▼                                                             │    │
│  │  ┌──────────────────┐                                                   │    │
│  │  │  SYNTHESIZERS    │  Read relevant, write own                         │    │
│  │  │  (💭💙)          │                                                   │    │
│  │  └──────────────────┘                                                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Permission Matrix                                     │    │
│  │                                                                          │    │
│  │  Operation          │ OWNER │ TRIAD │ KEEPER │ ADVOCATE │ ARTISAN │ SYN │   │
│  │  ────────────────────────────────────────────────────────────────────   │    │
│  │  Read own           │   ✓   │   ✓   │   ✓    │    ✓     │    ✓    │  ✓  │   │
│  │  Read swarm         │   ✓   │   ✓   │   ✓    │    △     │    △    │  △  │   │
│  │  Write own          │   ✓   │   ✓   │   ✓    │    ✓     │    ✓    │  ✓  │   │
│  │  Write swarm        │   ✓   │   △   │   △    │    ✗     │    ✗    │  ✗  │   │
│  │  Delete own         │   ✓   │   △   │   ✗    │    ✗     │    ✗    │  ✗  │   │
│  │  Delete swarm       │   ✓   │   ✗   │   ✗    │    ✗     │    ✗    │  ✗  │   │
│  │  Consolidate        │   ✗   │   ✗   │   ✓    │    ✗     │    ✗    │  ✗  │   │
│  │  Promote to semantic│   ✗   │   ✗   │   ✓    │    ✗     │    ✗    │  ✗  │   │
│  │  Share (grant read) │   ✓   │   ✗   │   ✗    │    ✗     │    ✗    │  ✗  │   │
│  │                                                                          │    │
│  │  Legend: ✓ = Allowed, △ = Conditional, ✗ = Denied                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Access Control Schema

```typescript
interface MemoryAccessControl {
  owner: AgentId;              // Owning agent
  
  // Read permissions by group
  readPermissions: {
    groups: PermissionGroup[]; // Groups with read access
    specificAgents: AgentId[]; // Individual agents with access
    public: boolean;           // Publicly readable (rare)
  };
  
  // Write permissions
  writePermissions: {
    ownerOnly: boolean;        // Only owner can write
    allowedAgents: AgentId[];  // Specific agents allowed to write
    inheritable: boolean;      // Can write permission be inherited
  };
  
  // Operation-specific permissions
  operations: {
    delete: AgentId[];         // Agents allowed to delete
    consolidate: AgentId[];    // Agents allowed to consolidate
    promote: AgentId[];        // Agents allowed to promote to semantic
    share: AgentId[];          // Agents allowed to grant permissions
  };
  
  // Inheritance rules
  inheritance: {
    enabled: boolean;
    inheritRead: boolean;      // Inherit read permissions to related memories
    inheritWrite: boolean;     // Inherit write permissions
    maxDepth: number;          // Maximum inheritance depth
  };
}

type PermissionGroup = 
  | 'OWNER'           // Single agent (owner)
  | 'TRIAD'           // Alpha, Beta, Charlie
  | 'MEMORY_KEEPER'   // Historian
  | 'ADVOCATES'       // Examiner, Sentinel, Explorer
  | 'ARTISANS'        // Coder, Steward
  | 'SYNTHESIZERS'    // Dreamer, Empath
  | 'ALL_AGENTS';     // All 11 agents

type AgentId = 
  | 'steward' | 'alpha' | 'beta' | 'charlie'
  | 'examiner' | 'explorer' | 'sentinel'
  | 'coder' | 'dreamer' | 'empath' | 'historian';
```

### Access Control Implementation

```javascript
/**
 * Memory Access Controller
 * Validates and enforces memory access permissions
 */
class MemoryAccessController {
  constructor() {
    this.permissionCache = new Map();
    this.accessLog = new AccessLogger();
  }
  
  /**
   * Validate read access
   */
  async canRead(agentId, memoryId) {
    const memory = await memoryStore.get(memoryId);
    if (!memory) return false;
    
    const { accessControl } = memory;
    
    // Owner always has read access
    if (accessControl.owner === agentId) {
      return true;
    }
    
    // Check group permissions
    const agentGroups = this.getAgentGroups(agentId);
    const hasGroupPermission = accessControl.readPermissions.groups.some(
      group => agentGroups.includes(group)
    );
    
    // Check specific agent permissions
    const hasSpecificPermission = accessControl.readPermissions.specificAgents
      .includes(agentId);
    
    // Check public access
    const isPublic = accessControl.readPermissions.public;
    
    const allowed = hasGroupPermission || hasSpecificPermission || isPublic;
    
    // Log access attempt
    await this.accessLog.log({
      agent: agentId,
      memory: memoryId,
      operation: 'read',
      allowed,
      timestamp: Date.now(),
    });
    
    return allowed;
  }
  
  /**
   * Validate write access
   */
  async canWrite(agentId, memoryId) {
    const memory = await memoryStore.get(memoryId);
    if (!memory) return false;
    
    const { accessControl } = memory;
    
    // Owner-only write
    if (accessControl.writePermissions.ownerOnly) {
      return accessControl.owner === agentId;
    }
    
    // Check allowed agents list
    return accessControl.writePermissions.allowedAgents.includes(agentId);
  }
  
  /**
   * Validate operation access
   */
  async canPerformOperation(agentId, memoryId, operation) {
    const memory = await memoryStore.get(memoryId);
    if (!memory) return false;
    
    const { accessControl } = memory;
    
    // Check operation-specific permissions
    return accessControl.operations[operation]?.includes(agentId) ?? false;
  }
  
  /**
   * Get agent's permission groups
   */
  getAgentGroups(agentId) {
    const groups = [];
    
    // All agents are in their owner group
    groups.push('OWNER');
    
    // Triad members
    if (['alpha', 'beta', 'charlie'].includes(agentId)) {
      groups.push('TRIAD');
    }
    
    // Memory keeper
    if (agentId === 'historian') {
      groups.push('MEMORY_KEEPER');
    }
    
    // Advocates
    if (['examiner', 'sentinel', 'explorer'].includes(agentId)) {
      groups.push('ADVOCATES');
    }
    
    // Artisans
    if (['coder', 'steward'].includes(agentId)) {
      groups.push('ARTISANS');
    }
    
    // Synthesizers
    if (['dreamer', 'empath'].includes(agentId)) {
      groups.push('SYNTHESIZERS');
    }
    
    return groups;
  }
}
```

### Access Logging

```typescript
interface AccessLogEntry {
  id: string;
  agent: AgentId;
  memory: string;
  operation: 'read' | 'write' | 'delete' | 'consolidate' | 'promote' | 'share';
  allowed: boolean;
  reason?: string;
  timestamp: number;
  sessionId?: string;
  metadata?: {
    query?: string;
    changes?: any;
    grantedBy?: AgentId;
  };
}
```

---

## Memory Synchronization Protocol

### Synchronization Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Memory Synchronization Architecture                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Event-Based Synchronization                           │    │
│  │                                                                          │    │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐                          │    │
│  │  │  Agent   │    │  Agent   │    │  Agent   │                          │    │
│  │  │  Alpha   │    │  Beta    │    │ Explorer │                          │    │
│  │  └────┬─────┘    └────┬─────┘    └────┬─────┘                          │    │
│  │       │               │               │                                 │    │
│  │       │  WebSocket    │               │                                 │    │
│  │       │  Connection   │               │                                 │    │
│  │       ▼               ▼               ▼                                 │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Memory Event Bus                              │   │    │
│  │  │                                                                 │   │    │
│  │  │  Events:                                                        │   │    │
│  │  │  - memory:created    - memory:updated                           │   │    │
│  │  │  - memory:deleted    - memory:consolidated                      │   │    │
│  │  │  - memory:promoted   - schema:created                           │   │    │
│  │  │  - schema:updated    - sync:request                             │   │    │
│  │  └─────────────────────────────────────────────────────────────────┘   │    │
│  │                                    │                                    │    │
│  │                                    ▼                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Sync Coordinator                              │   │    │
│  │  │                                                                 │   │    │
│  │  │  - Event ordering (vector clocks)                               │   │    │
│  │  │  - Conflict detection                                           │   │    │
│  │  │  - Resolution strategies                                        │   │    │
│  │  │  - Consistency guarantees                                       │   │    │
│  │  └─────────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Event Protocol

```typescript
interface MemoryEvent {
  id: string;                    // Unique event ID
  type: MemoryEventType;
  timestamp: number;
  sourceAgent: AgentId;
  
  // Vector clock for ordering
  vectorClock: {
    [agentId: string]: number;   // Counter per agent
  };
  
  // Event payload
  payload: {
    memoryId: string;
    data?: any;
    previousVersion?: string;    // For conflict detection
  };
  
  // Delivery guarantees
  delivery: {
    reliability: 'at-most-once' | 'at-least-once' | 'exactly-once';
    ordering: 'fifo' | 'causal' | 'total';
  };
}

type MemoryEventType =
  | 'memory:created'
  | 'memory:updated'
  | 'memory:deleted'
  | 'memory:consolidated'
  | 'memory:promoted'
  | 'schema:created'
  | 'schema:updated'
  | 'sync:request';
```

### Conflict Detection and Resolution

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Conflict Resolution Protocol                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Scenario: Two agents update the same memory concurrently                        │
│                                                                                  │
│  ┌──────────────┐                    ┌──────────────┐                           │
│  │   Agent A    │                    │   Agent B    │                           │
│  │   (Explorer) │                    │  (Historian) │                           │
│  └──────┬───────┘                    └──────┬───────���                           │
│         │                                   │                                   │
│         │ Update memory M                   │ Update memory M                   │
│         │ version: v1 → v2                  │ version: v1 → v2                  │
│         │                                   │                                   │
│         ▼                                   ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Conflict Detector                                     │    │
│  │                                                                          │    │
│  │  1. Detect version conflict (both updating v1)                          │    │
│  │  2. Compare vector clocks                                               │    │
│  │  3. Apply resolution strategy                                           │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│         ┌──────────────────────────┼──────────────────────────┐                 │
│         │                          │                          │                  │
│         ▼                          ▼                          ▼                  │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐            │
│  │  Strategy:  │           │  Strategy:  │           │  Strategy:  │            │
│  │  Last-Write │           │  Merge      │           │  Owner      │            │
│  │  Wins       │           │  (LLM)      │           │  Decides    │            │
│  └─────────────┘           └─────────────┘           └─────────────┘            │
│                                                                                  │
│  Resolution Strategies:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  1. Last-Write-Wins (LWW)                                               │    │
│  │     - Use timestamp to determine winner                                 │    │
│  │     - Fast, but may lose data                                           │    │
│  │                                                                          │    │
│  │  2. Merge with LLM                                                      │    │
│  │     - Send conflicting versions to LLM for merge                        │    │
│  │     - Preserves information, slower                                     │    │
│  │                                                                          │    │
│  │  3. Owner Decides                                                       │    │
│  │     - Forward conflict to memory owner                                  │    │
│  │     - Respects ownership, requires owner availability                   │    │
│  │                                                                          │    │
│  │  4. Consensus (Triad)                                                   │    │
│  │     - Forward to triad for deliberation                                 │    │
│  │     - Used for high-importance conflicts                                │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Implementation

```javascript
/**
 * Conflict Resolution Engine
 */
class ConflictResolver {
  constructor() {
    this.strategies = {
      'lww': this.lastWriteWins.bind(this),
      'merge': this.mergeWithLLM.bind(this),
      'owner': this.ownerDecides.bind(this),
      'consensus': this.triadConsensus.bind(this),
    };
  }
  
  /**
   * Detect and resolve conflicts
   */
  async resolve(event1, event2) {
    // Check if events conflict
    if (!this.isConflict(event1, event2)) {
      return { resolved: false };
    }
    
    // Determine resolution strategy based on memory importance
    const memory = await memoryStore.get(event1.payload.memoryId);
    const strategy = this.selectStrategy(memory);
    
    // Apply resolution
    const resolution = await this.strategies[strategy](event1, event2, memory);
    
    // Log resolution
    await this.logResolution(event1, event2, resolution);
    
    return { resolved: true, resolution, strategy };
  }
  
  /**
   * Check if two events conflict
   */
  isConflict(event1, event2) {
    // Same memory being modified
    if (event1.payload.memoryId !== event2.payload.memoryId) {
      return false;
    }
    
    // Concurrent updates (neither sees the other's version)
    return event1.payload.previousVersion === event2.payload.previousVersion;
  }
  
  /**
   * Select resolution strategy based on memory importance
   */
  selectStrategy(memory) {
    const priority = calculatePriority(memory);
    
    if (priority.swarmRelevance > 0.9) {
      return 'consensus';  // High importance → triad
    }
    if (priority.emotionalScore > 0.8) {
      return 'owner';      // Emotional → owner decides
    }
    if (memory.content.text.length > 1000) {
      return 'merge';      // Long content → merge
    }
    return 'lww';          // Default → last-write-wins
  }
  
  /**
   * Last-Write-Wins resolution
   */
  lastWriteWins(event1, event2) {
    const winner = event1.timestamp > event2.timestamp ? event1 : event2;
    return {
      winningEvent: winner,
      mergedData: winner.payload.data,
    };
  }
  
  /**
   * Merge conflicting versions using LLM
   */
  async mergeWithLLM(event1, event2, memory) {
    const prompt = `
      Merge the following two versions of a memory:
      
      Original: ${JSON.stringify(memory.content)}
      Version A: ${JSON.stringify(event1.payload.data)}
      Version B: ${JSON.stringify(event2.payload.data)}
      
      Create a merged version that preserves information from both.
    `;
    
    const mergedContent = await llm.generate(prompt);
    
    return {
      mergedData: JSON.parse(mergedContent),
      mergeStrategy: 'llm-assisted',
    };
  }
  
  /**
   * Forward to memory owner for resolution
   */
  async ownerDecides(event1, event2, memory) {
    const owner = memory.accessControl.owner;
    
    // Send resolution request to owner
    const resolution = await agentClient.send(owner, {
      type: 'conflict-resolution',
      memoryId: memory.id,
      versions: [event1.payload.data, event2.payload.data],
    });
    
    return {
      resolvedBy: owner,
      mergedData: resolution.selectedVersion,
    };
  }
  
  /**
   * Triad consensus for high-importance conflicts
   */
  async triadConsensus(event1, event2, memory) {
    // Send to triad for deliberation
    const decision = await triadProtocol.deliberate({
      type: 'conflict-resolution',
      memoryId: memory.id,
      options: [
        { version: 'A', data: event1.payload.data },
        { version: 'B', data: event2.payload.data },
      ],
    });
    
    return {
      resolvedBy: 'triad',
      mergedData: decision.selectedOption.data,
      deliberationId: decision.id,
    };
  }
}
```

### Consistency Guarantees

| Consistency Level | Description | Use Case |
|-------------------|-------------|----------|
| **Eventual** | Updates propagate asynchronously | Default for most operations |
| **Causal** | Causally related updates ordered | Memory chains, conversations |
| **Read-Your-Writes** | Agent sees its own writes immediately | Single-agent sessions |
| **Strong** | All agents see same order | Triad deliberation, consensus |

---

## Integration with 3-Tier Memory System

### Backward Compatibility

The swarm memory layer integrates with the existing 3-tier memory system (Session → Episodic → Semantic) while adding cross-agent capabilities.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    3-Tier Memory System with Swarm Layer                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Tier 1: Session Memory (Per-Agent)                    │    │
│  │                                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │    │
│  │  │ Session  │ │ Session  │ │ Session  │ │ Session  │                   │    │
│  │  │ Alpha    │ │ Beta     │ │ Explorer │ │ ...      │                   │    │
│  │  │ (JSONL)  │ │ (JSONL)  │ │ (JSONL)  │ │          │                   │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                   │    │
│  │       │            │            │            │                          │    │
│  │       └────────────┴────────────┴────────────┘                          │    │
│  │                            │                                            │    │
│  │                            ▼                                            │    │
│  │              ┌─────────────────────────┐                               │    │
│  │              │ Consolidation Trigger   │                               │    │
│  │              │ (Dreamer / Cron)        │                               │    │
│  │              └────────────┬────────────┘                               │    │
│  └───────────────────────────┼────────────────────────────────────────────┘    │
│                              │                                                   │
│  ┌───────────────────────────┼────────────────────────────────────────────┐    │
│  │                           ▼                                            │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Tier 2: Episodic Memory                       │   │    │
│  │  │                                                                  │   │    │
│  │  │  ┌──────────────────┐  ┌──────────────────┐                     │   │    │
│  │  │  │ Agent-Specific   │  │ Shared Swarm     │                     │   │    │
│  │  │  │ Episodic Store   │  │ Episodic Pool    │                     │   │    │
│  │  │  │                  │  │                  │                     │   │    │
│  │  │  │ - Private        │  │ - Cross-agent    │                     │   │    │
│  │  │  │   memories       │  │   memories       │                     │   │    │
│  │  │  │ - Agent-only     │  │ - Permission-    │                     │   │    │
│  │  │  │   access         │  │   based access   │                     │   │    │
│  │  │  └──────────────────┘  └──────────────────┘                     │   │    │
│  │  └─────────────────────────────────────────────────────────────────┘   │    │
│  │                              │                                           │    │
│  │                              ▼                                           │    │
│  │              ┌─────────────────────────┐                               │    │
│  │              │ Promotion Trigger       │                               │    │
│  │              │ (Threshold ≥ 0.7)       │                               │    │
│  │              └────────────┬────────────┘                               │    │
│  └───────────────────────────┼────────────────────────────────────────────┘    │
│                              │                                                   │
│  ┌───────────────────────────┼────────────────────────────────────────────┐    │
│  │                           ▼                                            │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Tier 3: Semantic Memory                       │   │    ��
│  │  │                                                                  │   │    │
│  │  │  ┌──────────────────┐  ┌──────────────────┐                     │   │    │
│  │  │  │ Agent-Specific   │  │ Swarm Semantic   │                     │   │    │
│  │  │  │ Schemas          │  │ Knowledge Graph  │                     │   │    │
│  │  │  │                  │  │                  │                     │   │    │
│  │  │  │ - Individual     │  │ - Collective     │                     │   │    │
│  │  │  │   knowledge      │  │   knowledge      │                     │   │    │
│  │  │  │ - Local context  │  │ - Neo4j graph    │                     │   │    │
│  │  │  └──────────────────┘  └──────────────────┘                     │   │    │
│  │  └─────────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Data Flow Summary                                     │    │
│  │                                                                          │    │
│  │  Session → [Consolidation] → Agent Episodic ──┐                         │    │
│  │                                               │                         │    │
│  │  Session → [Swarm Write] → Shared Episodic ──┼──> [Promotion] → Swarm  │    │
│  │                                               │       Semantic           │    │
│  │  Agent Episodic → [Share] → Shared Episodic ─┘                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Integration Points

```javascript
/**
 * Swarm Memory integration with existing 3-tier system
 */
class SwarmMemoryIntegration {
  constructor() {
    this.sessionStore = new SessionStore();
    this.episodicStore = new EpisodicStore();
    this.semanticStore = new SemanticStore();
    this.swarmPool = new SwarmMemoryPool();
  }
  
  /**
   * Write to swarm memory from session
   * Called when agent wants to share session content with swarm
   */
  async shareToSwarm(agentId, sessionId, memoryContent, options = {}) {
    const {
      priority = 'normal',
      categories = [],
      readPermissions = ['TRIAD', 'MEMORY_KEEPER'],
    } = options;
    
    // 1. Get session content
    const session = await this.sessionStore.get(sessionId);
    
    // 2. Create swarm memory entry
    const swarmMemory = {
      id: generateSwarmMemoryId(agentId),
      sourceAgent: agentId,
      sessionId,
      content: {
        text: memoryContent,
        embedding: await generateEmbedding(memoryContent),
        metadata: {
          conversationContext: session.context,
          emotionalMarkers: await extractEmotionalMarkers(memoryContent),
        },
      },
      priority: await calculatePriority({
        emotionalScore: priority === 'high' ? 0.9 : 0.5,
        frequencyScore: 0.5,
        semanticScore: 0.5,
        swarmRelevance: await assessSwarmRelevance(memoryContent),
      }),
      accessControl: {
        owner: agentId,
        readPermissions: {
          groups: readPermissions,
          specificAgents: [],
          public: false,
        },
        writePermissions: {
          ownerOnly: true,
          allowedAgents: [agentId],
        },
      },
      timestamps: {
        created: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      consolidation: {
        status: 'pending',
        promotedToSemantic: false,
        schemaLinks: [],
      },
    };
    
    // 3. Write to swarm pool
    await this.swarmPool.write(swarmMemory);
    
    // 4. Emit sync event
    await syncBus.publish({
      type: 'memory:created',
      payload: { memory: swarmMemory },
    });
    
    return swarmMemory;
  }
  
  /**
   * Consolidate session to agent episodic AND swarm episodic
   */
  async consolidateSession(agentId, sessionId) {
    const session = await this.sessionStore.get(sessionId);
    
    // Standard consolidation to agent episodic
    const agentEpisodic = await this.episodicStore.consolidate(agentId, session);
    
    // Check if content should be shared with swarm
    const shouldShare = await this.shouldShareWithSwarm(agentEpisodic);
    
    if (shouldShare) {
      const swarmEpisodic = await this.shareToSwarm(agentId, sessionId, session.content);
      return { agentEpisodic, swarmEpisodic };
    }
    
    return { agentEpisodic };
  }
  
  /**
   * Promote swarm episodic to swarm semantic
   */
  async promoteSwarmMemory(memoryId) {
    const memory = await this.swarmPool.get(memoryId);
    
    // Check promotion criteria
    const priority = calculatePriority(memory);
    const shouldPromote = priority.swarmRelevance >= 0.7;
    
    if (!shouldPromote) {
      return { promoted: false, reason: 'below threshold' };
    }
    
    // Extract concepts
    const concepts = await extractConcepts(memory.content.text);
    
    // Find or create schema
    let schema = await this.semanticStore.findSchema(concepts);
    
    if (!schema) {
      // Create new schema
      schema = await formSwarmSchema(concepts.primary, [memory]);
    } else {
      // Update existing schema
      schema = await updateSchema(schema, memory);
    }
    
    // Update memory consolidation status
    await this.swarmPool.update(memoryId, {
      consolidation: {
        ...memory.consolidation,
        status: 'consolidated',
        promotedToSemantic: true,
        schemaLinks: [...memory.consolidation.schemaLinks, schema.id],
      },
    });
    
    // Emit promotion event
    await syncBus.publish({
      type: 'memory:promoted',
      payload: { memoryId, schemaId: schema.id },
    });
    
    return { promoted: true, schema };
  }
  
  /**
   * Determine if memory should be shared with swarm
   */
  async shouldShareWithSwarm(memory) {
    // Criteria for swarm sharing:
    // 1. Contains knowledge useful to other agents
    // 2. Not agent-specific personal context
    // 3. Meets minimum quality threshold
    
    const qualityScore = await assessMemoryQuality(memory);
    const swarmRelevance = await assessSwarmRelevance(memory.content);
    
    return qualityScore >= 0.6 && swarmRelevance >= 0.5;
  }
}
```

### Migration Path

| Phase | Description | Changes |
|-------|-------------|---------|
| **Phase 1** | Swarm Pool Setup | Deploy shared memory infrastructure |
| **Phase 2** | Agent Integration | Enable agents to write/read from swarm |
| **Phase 3** | Access Control | Implement permission model |
| **Phase 4** | Sync Protocol | Deploy event-based synchronization |
| **Phase 5** | Consolidation | Enable cross-agent semantic promotion |

---

## Implementation Recommendations

### Phase 1: Foundation (Weeks 1-2)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 1: Foundation                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Deliverables:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  1. Swarm Memory Pool Infrastructure                                     │    │
│  │     - HNSW vector index setup                                            │    │
│  │     - Pebble DB document store                                           │    │
│  │     - Basic CRUD API                                                     │    │
│  │                                                                          │    │
│  │  2. Memory Entry Schema                                                  │    │
│  │     - TypeScript interfaces                                              │    │
│  │     - Validation functions                                               │    │
│  │     - ID generation utilities                                            │    │
│  │                                                                          │    │
│  │  3. Basic Access Control                                                 │    │
│  │     - Permission group definitions                                       │    │
│  │     - Simple allow/deny checks                                           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  Files to Create:                                                                │
│  - plugins/swarm-memory/src/index.js                                             │
│  - plugins/swarm-memory/src/swarm-pool.js                                        │
│  - plugins/swarm-memory/src/memory-schema.js                                     │
│  - plugins/swarm-memory/src/access-control.js                                    │
│  - plugins/swarm-memory/SKILL.md                                                 │
│  - plugins/swarm-memory/package.json                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Agent Integration (Weeks 3-4)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 2: Agent Integration                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Deliverables:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  1. Agent API Integration                                                │    │
│  │     - swarmMemory.write() skill                                         │    │
│  │     - swarmMemory.read() skill                                          │    │
│  │     - swarmMemory.search() skill                                        │    │
│  │                                                                          │    │
│  │  2. Historian Integration                                                │    │
│  │     - Consolidation from swarm pool                                     │    │
│  │     - Schema formation from multi-agent memories                        │    │
│  │                                                                          │    │
│  │  3. Explorer Integration                                                 │    │
│  │     - Cross-agent intelligence search                                   │    │
│  │     - Swarm-aware gap detection                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  Files to Create:                                                                │
│  - skills/swarm-memory-read/SKILL.md                                             │
│  - skills/swarm-memory-write/SKILL.md                                            │
│  - skills/swarm-memory-search/SKILL.md                                           │
│  - agents/historian/src/swarm-consolidation.js                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Access Control (Weeks 5-6)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 3: Access Control                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Deliverables:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  1. Full Permission Model                                                │    │
│  │     - Group-based permissions                                           │    │
│  │     - Operation-level control                                           │    │
│  │     - Inheritance rules                                                 │    │
│  │                                                                          │    │
│  │  2. Access Logging                                                       │    │
│  │     - Complete audit trail                                              │    │
│  │     - Langfuse integration                                              │    │
│  │                                                                          │    │
│  │  3. Permission Management Skills                                         │    │
│  │     - Grant/revoke permissions                                          │    │
│  │     - View effective permissions                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  Files to Create:                                                                │
│  - plugins/swarm-memory/src/access-controller.js                                 │
│  - plugins/swarm-memory/src/access-logger.js                                     │
│  - skills/memory-grant-permission/SKILL.md                                       │
│  - skills/memory-revoke-permission/SKILL.md                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Synchronization (Weeks 7-8)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 4: Synchronization                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Deliverables:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  1. Event Bus Implementation                                             │    │
│  │     - WebSocket-based event distribution                                │    │
│  │     - Event types and schemas                                           │    │
│  │                                                                          │    │
│  │  2. Conflict Detection                                                   │    │
│  │     - Vector clock implementation                                       │    │
│  │     - Conflict detection logic                                          │    │
│  │                                                                          │    │
│  │  3. Resolution Strategies                                                │    │
│  │     - LWW, merge, owner-decides, consensus                              │    │
│  │     - Strategy selection logic                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  Files to Create:                                                                │
│  - plugins/swarm-memory/src/sync-bus.js                                          │
│  - plugins/swarm-memory/src/conflict-detector.js                                 │
│  - plugins/swarm-memory/src/conflict-resolver.js                                 │
│  - plugins/swarm-memory/src/vector-clock.js                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Consolidation (Weeks 9-10)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Phase 5: Consolidation                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Deliverables:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  1. Cross-Agent Schema Formation                                         │    │
│  │     - Multi-agent concept extraction                                    │    │
│  │     - Consensus detection                                               │    │
│  │     - Schema merging                                                    │    │
│  │                                                                          │    │
│  │  2. Swarm Semantic Layer                                                 │    │
│  │     - Neo4j schema graph                                                │    │
│  │     - Contributor attribution                                           │    │
│  │                                                                          │    │
│  │  3. Collective Forgetting                                                │    │
│  │     - Swarm-wide decay calculation                                      │    │
│  │     - Pruning low-value memories                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  Files to Create:                                                                │
│  - plugins/swarm-memory/src/schema-former.js                                     │
│  - plugins/swarm-memory/src/swarm-semantic.js                                    │
│  - plugins/swarm-memory/src/collective-forgetting.js                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Swarm Memory Plugin API

```javascript
const swarmMemory = require('@heretek/swarm-memory-plugin');

// Initialize
await swarmMemory.initialize({
  vectorStore: {
    provider: 'hnsw',
    dimension: 768,
    indexSize: 10000,
  },
  documentStore: {
    provider: 'pebble-db',
    path: '~/.openclaw/swarm-memory',
  },
  sync: {
    enabled: true,
    busUrl: 'ws://localhost:18789/swarm-sync',
  },
});

// Write memory
const memory = await swarmMemory.write({
  agent: 'explorer',
  content: 'Discovered new API endpoint for vector search',
  categories: ['api', 'vector-search'],
  priority: 'high',
  readPermissions: ['TRIAD', 'MEMORY_KEEPER', 'ADVOCATES'],
});

// Read memory
const retrieved = await swarmMemory.read(memory.id, {
  agent: 'historian',
});

// Search swarm memory
const results = await swarmMemory.search({
  agent: 'explorer',
  query: 'vector search implementation',
  topK: 10,
  filter: {
    categories: ['api'],
    minPriority: 0.5,
  },
});

// Subscribe to memory events
const subscription = await swarmMemory.subscribe({
  agent: 'historian',
  filter: {
    types: ['memory:created', 'memory:promoted'],
    sourceAgents: ['explorer', 'coder'],
  },
  callback: (event) => {
    console.log('Memory event:', event);
  },
});

// Get permissions
const permissions = await swarmMemory.getPermissions(memory.id, 'alpha');
```

### Skills API

```markdown
# SKILL.md: swarm-memory-write

## Description
Write a memory entry to the shared swarm memory pool.

## Usage
```
/swarm-memory-write --content "Memory content" --priority high --categories api,research
```

## Parameters
- `--content` (required): The memory content to store
- `--priority` (optional): Priority level (low, normal, high) - default: normal
- `--categories` (optional): Comma-separated categories
- `--read-permissions` (optional): Comma-separated permission groups

## Returns
- `memoryId`: Unique identifier for the stored memory
- `status`: 'written' | 'rejected'
- `reason`: (if rejected) Explanation

---

# SKILL.md: swarm-memory-read

## Description
Read a specific memory from the swarm memory pool.

## Usage
```
/swarm-memory-read --memoryId mem-123
```

## Parameters
- `--memoryId` (required): The memory identifier to retrieve

## Returns
- `memory`: The memory entry (if accessible)
- `error`: (if access denied) Permission error

---

# SKILL.md: swarm-memory-search

## Description
Search across the swarm memory pool using natural language queries.

## Usage
```
/swarm-memory-search --query "vector search implementation" --topK 10
```

## Parameters
- `--query` (required): Natural language search query
- `--topK` (optional): Number of results - default: 10
- `--filter-agents` (optional): Filter by source agents
- `--filter-categories` (optional): Filter by categories
- `--time-range` (optional): Time range filter (start,end)

## Returns
- `results`: Array of matching memories with scores
- `totalFound`: Total number of matches
```

---

## Risk Assessment

### Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Unauthorized Access** | High | Strict permission validation, access logging |
| **Memory Injection** | Medium | Content validation, embedding verification |
| **Data Leakage** | High | Permission groups, encryption at rest |
| **Conflict Exploitation** | Medium | Consensus-based resolution for critical memories |

### Performance Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Vector Index Bloat** | Medium | Periodic index optimization, memory pruning |
| **Sync Overhead** | Medium | Configurable sync frequency, batch events |
| **Query Latency** | Low | HNSW indexing, result caching |

### Integration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **3-Tier Incompatibility** | Low | Backward-compatible design, gradual migration |
| **Agent Behavior Changes** | Medium | Clear documentation, testing with each agent |
| **Plugin Conflicts** | Low | Isolated plugin namespace, dependency management |

---

## References

- [`GAP_ANALYSIS_REPORT.md`](../GAP_ANALYSIS_REPORT.md) - Gap analysis identifying swarm memory need
- [`EXTERNAL_PROJECTS_GAP_ANALYSIS.md`](../EXTERNAL_PROJECTS_GAP_ANALYSIS.md) - SwarmRecall analysis
- [`MEMORY_ENHANCEMENT_ARCHITECTURE.md`](memory/MEMORY_ENHANCEMENT_ARCHITECTURE.md) - Existing 3-tier memory system
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - System architecture overview
- [`A2A_ARCHITECTURE.md`](../architecture/A2A_ARCHITECTURE.md) - Agent communication protocol

---

*Swarm Memory Architecture - Generated 2026-03-31*
