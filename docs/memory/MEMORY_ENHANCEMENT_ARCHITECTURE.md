# Memory Enhancement Architecture

## Phase 7: Memory Enhancement System

This document describes the advanced memory systems implemented in Phase 7, including GraphRAG with Neo4j integration, episodic memory consolidation, and semantic knowledge promotion.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [GraphRAG with Neo4j](#graphrag-with-neo4j)
4. [Episodic Memory Consolidation](#episodic-memory-consolidation)
5. [Semantic Knowledge Promotion](#semantic-knowledge-promotion)
6. [Dreamer Agent](#dreamer-agent)
7. [Configuration](#configuration)
8. [API Reference](#api-reference)
9. [Operations](#operations)

---

## Overview

The Memory Enhancement system provides advanced cognitive memory capabilities inspired by human neuroscience research. The system implements:

- **GraphRAG**: Knowledge graph with hybrid vector-graph retrieval
- **Episodic Consolidation**: Experience storage with prioritization and replay
- **Semantic Promotion**: Automatic abstraction of episodic memories to semantic knowledge
- **Dreamer Agent**: Sleep-based memory consolidation

### Key Capabilities

| Capability | Description |
|------------|-------------|
| Hybrid Search | Combined vector similarity + graph traversal |
| Entity Extraction | Automatic NER from conversations |
| Relationship Mapping | Entity relationship discovery and storage |
| Memory Prioritization | Emotional salience + frequency-based scoring |
| Experience Replay | Hippocampal replay simulation |
| Forgetting Curves | Ebbinghaus-based memory decay |
| Schema Formation | Abstract knowledge structure creation |
| Sleep Consolidation | Overnight memory processing |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Memory Enhancement System                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   GraphRAG       │  │   Episodic       │  │   Semantic       │      │
│  │   Neo4j          │  │   Consolidation  │  │   Promotion      │      │
│  │                  │  │                  │  │                  │      │
│  │  - Vector Index  │  │  - Schedules     │  │  - Abstraction   │      │
│  │  - Graph Store   │  │  - Replay        │  │  - Schema Form   │      │
│  │  - Hybrid Search │  │  - Prioritization│  │  - Forgetting    │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                 │
│           └─────────────────────┼─────────────────────┘                 │
│                                 │                                       │
│                    ┌────────────▼────────────┐                         │
│                    │     Dreamer Agent       │                         │
│                    │                         │                         │
│                    │  - Sleep Cycles         │                         │
│                    │  - Experience Replay    │                         │
│                    │  - Dream Generation     │                         │
│                    └─────────────────────────┘                         │
│                                 │                                       │
│           ┌─────────────────────┼─────────────────────┐                │
│           │                     │                     │                 │
│  ┌────────▼─────────┐  ┌────────▼─────────┐  ┌────────▼─────────┐     │
│  │  episodic-claw   │  │   pgvector       │  │   Neo4j GDS      │     │
│  │  Plugin          │  │   Storage        │  │   Graph DB       │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Memory Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Tier Hierarchy                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  Working Memory │ ← Pad Memory (60 min)                     │
│  │  (Immediate)    │                                            │
│  └────────┬────────┘                                            │
│           │ Consolidation                                        │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Episodic       │ ← Recent experiences (6 hours)             │
│  │  Memory         │                                            │
│  └────────┬────────┘                                            │
│           │ Promotion (threshold ≥ 0.7)                         │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Semantic       │ ← Generalized knowledge (7 days)           │
│  │  Memory         │                                            │
│  └────────┬────────┘                                            │
│           │ Schema Formation                                     │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Schema         │ ← Abstract knowledge structures            │
│  │  Memory         │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## GraphRAG with Neo4j

### Module: [`graph-rag-neo4j.js`](../../modules/memory/graph-rag-neo4j.js)

The GraphRAG module provides knowledge graph capabilities with native Neo4j integration.

### Features

- **Native Neo4j Storage**: Full graph database with Cypher queries
- **Vector Index**: Neo4j GDS vector similarity search
- **Hybrid Retrieval**: Combined vector + graph traversal
- **Entity Extraction**: Automatic NER from conversations
- **Graph Reasoning**: Path finding and relationship discovery

### Usage Example

```javascript
const { GraphRAGNeo4j } = require('./modules/memory/graph-rag-neo4j.js');

// Initialize
const graphRAG = new GraphRAGNeo4j({
  neo4j: {
    uri: 'bolt://localhost:7687',
    user: 'neo4j',
    password: 'password'
  }
});
await graphRAG.initialize();

// Extract and store entities from conversation
const messages = [{ content: 'Explorer agent uses vector search for memory' }];
const results = await graphRAG.processConversation(messages);

// Hybrid search
const searchResults = await graphRAG.hybridSearch('vector memory search', {
  topK: 10,
  vectorWeight: 0.6,
  graphWeight: 0.4
});

// Graph reasoning
const reasoning = await graphRAG.graphReasoning('How does Explorer relate to memory?');
```

### API Reference

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `initialize()` | Initialize Neo4j connection | - | Promise<void> |
| `addEntity(entity)` | Add entity to graph | `{id, type, name, description, embedding}` | Promise<string> |
| `addRelationship(rel)` | Add relationship | `{from, to, type, weight}` | Promise<Object> |
| `extractEntities(content)` | Extract entities from text | `content: string` | Promise<Array> |
| `vectorSearch(queryVector, opts)` | Vector similarity search | `queryVector, {topK, threshold}` | Promise<Array> |
| `traverseGraph(startId, opts)` | Graph traversal | `startId, {maxDepth, limit}` | Promise<Array> |
| `hybridSearch(query, opts)` | Combined search | `query, {topK, vectorWeight}` | Promise<Array> |
| `findPath(fromId, toId)` | Shortest path | `fromId, toId` | Promise<Object|null> |
| `getSubgraph(entityId, depth)` | Get local subgraph | `entityId, depth` | Promise<Object> |
| `graphReasoning(query, opts)` | Graph-based reasoning | `query, {maxDepth}` | Promise<Object> |

### Configuration

```javascript
const config = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: 'neo4j',
    maxConnections: 10
  },
  vector: {
    dimension: 768,
    indexName: 'entityEmbeddings',
    similarity: 'cosine'
  },
  search: {
    vectorWeight: 0.6,
    graphWeight: 0.4,
    maxGraphDepth: 3,
    minRelevanceScore: 0.1
  }
};
```

---

## Episodic Memory Consolidation

### Module: [`episodic-consolidation-config.js`](../../modules/memory/episodic-consolidation-config.js)

Configures episodic memory consolidation with schedules, prioritization, and replay.

### Consolidation Schedules

| Schedule | Interval | Operations | Max Memories |
|----------|----------|------------|--------------|
| Hourly | 60 minutes | replay, decay, promotion-check | 100 |
| Daily | 3 AM daily | replay, decay, promotion, abstraction, forgetting | 500 |
| Weekly | Sunday 4 AM | replay, schema-formation, long-term-integration, pruning | 2000 |

### Memory Prioritization

Priority score calculation:

```
priority = emotionalScore × 0.4 + frequencyScore × 0.35 + semanticScore × 0.25

emotionalScore = surprise×0.3 + reward×0.25 + punishment×0.2 + novelty×0.15 + relevance×0.1
frequencyScore = accessComponent×0.4 + recencyComponent×0.3 + mentionBonus×0.3
semanticScore = min(1, conceptCount / 10)
```

### Forgetting Curve (Ebbinghaus)

```
retention = initialRetention × 0.5^(ageDays / halfLife)

halfLife = baseDecay × importanceModifier × frequencyModifier × emotionalModifier
```

### Usage Example

```javascript
const consolidation = require('./modules/memory/episodic-consolidation-config.js');

// Initialize
const config = await consolidation.initialize();

// Calculate priority for a memory
const memory = {
  timestamp: Date.now() - 3600000, // 1 hour ago
  accessCount: 5,
  accessHistory: [Date.now() - 100000],
  concepts: ['memory', 'vector'],
  emotionalMarkers: { surprise: 0.8, reward: 0.6 }
};

const priority = consolidation.calculatePriority(memory);
const retention = consolidation.calculateRetention(memory);
const needsReview = consolidation.needsReview(memory);

// Get next scheduled consolidation
const nextConsolidation = consolidation.getNextConsolidation();
console.log('Next consolidation:', nextConsolidation.type, 'at', nextConsolidation.time);
```

### Episodic-Claw Plugin Integration

The episodic-claw plugin is configured with:

```javascript
const EPISODIC_CLAW_CONFIG = {
  plugin: {
    enabled: true,
    path: 'plugins/episodic-claw',
    autoStart: true
  },
  storage: {
    format: 'pebble-db',
    vectorIndex: 'hnsw',
    embeddingDimension: 768,
    embeddingProvider: 'gemini'
  },
  segmentation: {
    surpriseThreshold: 0.7,
    maxBufferChars: 7200,
    adaptiveSegmentation: true
  },
  hierarchy: {
    d0Retention: { maxAge: 30, compressionThreshold: 5 },
    d1Consolidation: {
      enabled: true,
      minEpisodes: 3,
      summaryLength: 500
    }
  }
};
```

---

## Semantic Knowledge Promotion

### Module: [`semantic-promotion.js`](../../modules/memory/semantic-promotion.js)

Implements automatic promotion of episodic memories to semantic knowledge.

### Promotion Criteria

A memory is eligible for promotion when:

1. **Promotion Score ≥ 0.7**
   - Access frequency (30% weight)
   - Importance (30% weight)
   - Recency (20% weight)
   - Conceptual richness (20% weight)

2. **Retention > 0.3** (not yet forgotten)

3. **Not already promoted**

### Abstraction Pipeline

```
Episodic Memory → Content Extraction → Concept Identification → 
Abstraction → Semantic Memory → Schema Formation
```

### Usage Example

```javascript
const { SemanticPromotion } = require('./modules/memory/semantic-promotion.js');

// Initialize
const promoter = await SemanticPromotion.create();

// Process episodic memories for promotion
const results = await promoter.processEpisodicMemories();
console.log('Promoted:', results.promoted, 'Decayed:', results.decayed);

// Form schema from related memories
const schema = promoter.formSchema('vector search');

// Apply abstraction
const abstracted = promoter.applyAbstraction(semanticMemory, 2);

// Get statistics
const stats = promoter.getStats();
```

### API Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `initialize()` | Initialize promoter | Promise<void> |
| `calculatePromotionScore(memory)` | Calculate promotion score | number |
| `calculateRetention(memory)` | Calculate forgetting curve retention | number |
| `shouldPromote(memory)` | Check promotion eligibility | boolean |
| `promoteToSemantic(episodicMemory)` | Promote to semantic | Object|null |
| `formSchema(concept)` | Form schema from related memories | Object|null |
| `applyAbstraction(memory, level)` | Apply abstraction level | Object |
| `processEpisodicMemories()` | Process all episodic memories | Promise<Object> |
| `applyForgettingDecay()` | Apply decay to all memories | Object |

---

## Dreamer Agent

### Module: [`dreamer-agent.js`](../../modules/memory/dreamer-agent.js)

Implements sleep-based memory consolidation inspired by human neuroscience.

### Sleep Stages

| Stage | Duration | Replay Rate | Abstraction Depth | Function |
|-------|----------|-------------|-------------------|----------|
| NREM1 | 10% | 1.0× | 0 | Transition |
| NREM2 | 15% | 1.2× | 1 | Light consolidation |
| NREM3 | 20% | 1.5× | 1 | Deep consolidation |
| REM | 25% | 2.0× | 2 | Schema formation, dreams |

### Sleep Cycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Sleep Cycle (4.8 min)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NREM1 (0.5min) → NREM2 (0.7min) → NREM3 (1.0min) → REM (1.2min)│
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│   Transition    Light Replay   Deep Replay   Dream Gen        │
│                                                                  │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │  Post-Sleep Tasks     │                          │
│              │  - Semantic Promotion │                          │
│              │  - Forgetting Decay   │                          │
│              │  - Schema Formation   │                          │
│              └───────────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Usage Example

```javascript
const { DreamerAgent } = require('./modules/memory/dreamer-agent.js');

// Initialize
const dreamer = await DreamerAgentFactory.create({
  sleep: {
    durationMinutes: 4.8,
    triggerHour: 3,
    autoTrigger: true
  },
  dreams: {
    enabled: true,
    maxDreams: 10,
    minMemoryPriority: 0.5
  }
});

// Run sleep cycle manually
const results = await dreamer.runSleepCycle();
console.log('Sleep complete:', results.stages.length, 'stages,', results.dreams.length, 'dreams');

// Get statistics
const stats = dreamer.getStats();
console.log('Total sleep cycles:', stats.sleepCycles);

// Get recent dreams
const dreams = dreamer.getRecentDreams(5);
```

### Dream Generation

Dreams are generated during REM sleep by:

1. Selecting high-priority memories (importance ≥ 0.5)
2. Finding related memories (shared concepts)
3. Combining into abstract narrative
4. Recording emotional tone

Example dream output:
```json
{
  "id": "dream-1774849179092-0",
  "baseMemory": "epi-1774849179092",
  "relatedMemories": ["epi-1774849179093", "epi-1774849179094"],
  "content": "Dream narrative involving: vector, memory, search, agent",
  "emotionalTone": "positive",
  "abstractionLevel": 2,
  "timestamp": 1774849179092
}
```

---

## Configuration

### Environment Variables

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# PostgreSQL Configuration (for hybrid queries)
PGHOST=localhost
PGPORT=5432
PGDATABASE=openclaw
PGUSER=postgres
PGPASSWORD=

# DeepLake Configuration (hot tier)
DEEPLAKE_HOST=http://localhost:8082
```

### Configuration Files

#### Main Memory Config: [`modules/memory/config.json`](../../modules/memory/config.json)

```json
{
  "memory": {
    "vectorStore": {
      "hotTier": {
        "enabled": true,
        "provider": "deeplake",
        "dimension": 1536
      },
      "coldTier": {
        "enabled": true,
        "provider": "pgvector",
        "dimension": 768
      }
    },
    "consolidation": {
      "episodicMaxAgeHours": 6,
      "semanticMaxAgeDays": 7,
      "promotionThreshold": 0.7,
      "decayRate": 0.001
    }
  }
}
```

---

## API Reference

### Quick Reference

```javascript
// GraphRAG Neo4j
const { GraphRAGNeo4j } = require('./modules/memory/graph-rag-neo4j.js');
const graphRAG = await GraphRAGNeo4jFactory.create(config);
await graphRAG.hybridSearch('query');

// Episodic Consolidation
const consolidation = require('./modules/memory/episodic-consolidation-config.js');
await consolidation.initialize();
consolidation.calculatePriority(memory);

// Semantic Promotion
const { SemanticPromotion } = require('./modules/memory/semantic-promotion.js');
const promoter = await SemanticPromotionFactory.create();
await promoter.processEpisodicMemories();

// Dreamer Agent
const { DreamerAgent } = require('./modules/memory/dreamer-agent.js');
const dreamer = await DreamerAgentFactory.create();
await dreamer.runSleepCycle();
```

---

## Operations

### Starting Memory Systems

```javascript
// Initialize all memory systems
const initializeMemory = async () => {
  // GraphRAG
  const graphRAG = await GraphRAGNeo4jFactory.create();
  
  // Consolidation config
  const consolidation = await require('./episodic-consolidation-config.js').initialize();
  
  // Semantic promoter
  const promoter = await SemanticPromotionFactory.create();
  
  // Dreamer agent (auto-triggers at 3 AM)
  const dreamer = await DreamerAgentFactory.create();
  
  return { graphRAG, consolidation, promoter, dreamer };
};
```

### Monitoring

```javascript
// Get system statistics
const stats = {
  graphRAG: await graphRAG.getStats(),
  semantic: promoter.getStats(),
  dreamer: dreamer.getStats()
};

console.log('Memory System Stats:', stats);
```

### Maintenance

#### Manual Consolidation Trigger

```javascript
// Trigger immediate consolidation
await promoter.processEpisodicMemories();
```

#### Clear Memory

```javascript
// Clear specific memory tier
promoter.episodicMemories.clear();
promoter.semanticMemories.clear();
promoter.schemas.clear();
```

#### Backup State

```javascript
// State files are auto-saved to:
// - modules/memory/state/consolidation-state.json
// - modules/memory/state/semantic-promotion-state.json
// - modules/memory/state/dreamer-state.json
```

---

## Research Foundation

This implementation is based on:

1. **Ebbinghaus Forgetting Curve**: Mathematical model of memory decay
2. **Hippocampal Replay**: Neural replay during sleep for memory consolidation
3. **Systems Consolidation Theory**: Episodic to semantic memory transformation
4. **Schema Theory**: Abstract knowledge structures for efficient retrieval
5. **GraphRAG Research**: Hybrid vector-graph retrieval for RAG systems

### Key Papers

- Ebbinghaus, H. (1885). *Memory: A Contribution to Experimental Psychology*
- McClelland, J. L., et al. (1995). *Complementary Learning Systems*
- Wilson, M. A., & McNaughton, B. L. (1994). *Reactivation of hippocampal ensemble memories during sleep*
- Lewis, P. A., & Durrant, S. J. (2011). *Overlapping memory replay during sleep builds cognitive schema*

---

## Files Reference

| File | Purpose |
|------|---------|
| [`graph-rag-neo4j.js`](../../modules/memory/graph-rag-neo4j.js) | Neo4j GraphRAG implementation |
| [`graph-rag.js`](../../modules/memory/graph-rag.js) | Original GraphRAG (JSON/pgvector) |
| [`vector-store.js`](../../modules/memory/vector-store.js) | Hot/cold tiered vector storage |
| [`memory-consolidation.js`](../../modules/memory/memory-consolidation.js) | Episodic-to-semantic consolidation |
| [`powermem.js`](../../modules/memory/powermem.js) | Ebbinghaus forgetting curve |
| [`episodic-consolidation-config.js`](../../modules/memory/episodic-consolidation-config.js) | Consolidation schedules & config |
| [`semantic-promotion.js`](../../modules/memory/semantic-promotion.js) | Semantic knowledge promotion |
| [`dreamer-agent.js`](../../modules/memory/dreamer-agent.js) | Sleep-based consolidation |
| `plugins/episodic-claw/` | Episodic memory plugin |

---

*Phase 7 Memory Enhancement - Documentation generated 2026-03-31*
