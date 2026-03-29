# GraphRAG Integration Research

**Research Date:** 2026-03-29
**Status:** Active Research
**Purpose:** Evaluate GraphRAG for knowledge graph integration with The Collective

---

## What is GraphRAG?

GraphRAG (Graph-based Retrieval-Augmented Generation) combines knowledge graphs with vector retrieval to provide:
- **Structured relationships** between concepts
- **Multi-hop reasoning** across connected information
- **Context-rich retrieval** using graph traversals
- **Explainable results** through relationship paths

---

## GraphRAG Implementations

### 1. Microsoft GraphRAG

**Repository:** microsoft/graphrag

**Features:**
- Automated knowledge graph construction from documents
- Community detection for topic clustering
- Hierarchical summarization
- Global and local search modes

**Pros:**
- Production-ready
- Well-documented
- Active development
- Integrates with Azure OpenAI

**Cons:**
- Resource-intensive indexing
- Requires significant setup
- Azure-centric

---

### 2. RAGFlow GraphRAG

**Repository:** infiniflow/ragflow

**Features:**
- Built-in GraphRAG support
- Deduplication of named entities
- Knowledge graph construction during preprocessing
- Visual graph exploration

**Pros:**
- Integrated with RAGFlow platform
- Visual interface
- Entity deduplication
- Easy to use

**Cons:**
- Part of larger platform
- Less flexible than standalone

---

### 3. Neo4j + LLM Integration

**Repository:** neo4j-contrib/neo4j-graphrag-python

**Features:**
- Native graph database
- Cypher query language
- GraphRAG retrieval patterns
- Vector index support

**Pros:**
- Mature graph database
- Powerful query capabilities
- Excellent for complex relationships
- Good performance at scale

**Cons:**
- Requires separate database
- Learning curve for Cypher
- Resource overhead

---

### 4. LlamaIndex GraphRAG

**Repository:** run-llama/llama_index

**Features:**
- KnowledgeGraphIndex
- Graph store integrations (Neo4j, Nebula, etc.)
- Graph query engines
- Automatic graph construction

**Pros:**
- Flexible graph backends
- Part of mature framework
- Good documentation
- Active community

**Cons:**
- Requires graph store setup
- Complex configuration

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAPH-ENHANCED RAG ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│  │  Document      │    │  Entity        │    │  Knowledge       │   │
│  │  Ingestion     │───▶│  Extraction    │───▶│  Graph           │   │
│  │                │    │                │    │                  │   │
│  │  RAGFlow or    │    │  NER +         │    │  Neo4j or        │   │
│  │  LlamaParse    │    │  Relations     │    │  GraphRAG        │   │
│  └────────────────┘    └────────────────┘    └──────────────────┘   │
│                                                      │               │
│                                                      ▼               │
│  ┌────────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│  │  Agent         │◀───│  Hybrid        │◀───│  Vector          │   │
│  │  Response      │    │  Retrieval     │    │  Store           │   │
│  │                │    │                │    │                  │   │
│  │  LiteLLM       │    │  Graph +       │    │  PostgreSQL      │   │
│  │  Gateway       │    │  Vector        │    │  + pgvector      │   │
│  └────────────────┘    └────────────────┘    └──────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration Plan

### Phase 1: Neo4j Setup
1. Add Neo4j to docker-compose.yml
2. Create graph schema for The Collective
3. Implement entity extraction pipeline

### Phase 2: Graph Construction
1. Extract entities from existing documents
2. Create relationships between concepts
3. Build initial knowledge graph

### Phase 3: Hybrid Retrieval
1. Implement graph traversal queries
2. Combine with vector similarity search
3. Create unified retrieval API

### Phase 4: Agent Integration
1. Add GraphRAG tools to agents
2. Enable multi-hop reasoning
3. Track relationship paths in responses

---

## Neo4j Schema for The Collective

```cypher
// Nodes
CREATE CONSTRAINT agent_id IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (c:Concept) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT memory_id IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE;

// Relationships
// (:Agent)-[:KNOWS]->(:Concept)
// (:Agent)-[:CREATED]->(:Memory)
// (:Memory)-[:REFERENCES]->(:Concept)
// (:Memory)-[:FOLLOWS]->(:Memory)
// (:Concept)-[:RELATED_TO]->(:Concept)
// (:User)-[:PREFERS]->(:Concept)
// (:Skill)-[:REQUIRES]->(:Concept)
```

---

## Example Graph Queries

### Multi-hop Reasoning
```cypher
// Find all concepts related to consciousness through any path
MATCH path = (c:Concept {name: 'consciousness'})-[:RELATED_TO*1..3]-(related)
RETURN path

// Find memories that reference concepts the user is interested in
MATCH (u:User {id: 'derek'})-[:PREFERS]->(c:Concept)<-[:REFERENCES]-(m:Memory)
RETURN m
```

### Context Expansion
```cypher
// Expand context around a topic
MATCH (center:Concept {name: 'memory'})
CALL {
  WITH center
  MATCH (center)-[:RELATED_TO]-(direct)
  RETURN direct
  UNION
  WITH center
  MATCH (center)-[:RELATED_TO*2]-(indirect)
  RETURN indirect
}
RETURN center, collect(DISTINCT direct) as direct_relations
```

---

## Docker Compose Addition

```yaml
neo4j:
  image: neo4j:5.15.0
  ports:
    - "7474:7474"  # HTTP
    - "7687:7687"  # Bolt
  environment:
    - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
    - NEO4J_PLUGINS=["apoc"]
  volumes:
    - neo4j_data:/data
    - neo4j_logs:/logs
  networks:
    - collective-network
```

---

## Next Steps

1. [ ] Add Neo4j to docker-compose.yml
2. [ ] Create graph schema initialization script
3. [ ] Implement entity extraction pipeline
4. [ ] Create GraphRAG retrieval skill
5. [ ] Test hybrid search performance
6. [ ] Document graph query patterns

---

*GraphRAG - Where knowledge becomes connected.*
