#!/usr/bin/env node
/**
 * GraphRAG Neo4j Integration - Knowledge Graph with Native Graph Database
 * 
 * Provides Neo4j-backed knowledge graph with:
 * - Native graph storage with Cypher queries
 * - Hybrid vector-graph retrieval using Neo4j GDS
 * - Entity-relationship extraction and mapping
 * - Graph-based reasoning for complex queries
 * - Integration with pgvector for hybrid queries
 * 
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                    GraphRAG Neo4j API                           │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │                                                                  │
 *   │  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
 *   │  │   Neo4j      │    │   Vector     │    │   Hybrid        │   │
 *   │  │   Graph      │    │   Index      │    │   Search        │   │
 *   │  │   Store      │    │   (GDS)      │    │                 │   │
 *   │  └──────────────┘    └──────────────┘    └─────────────────┘   │
 *   │          │                   │                    │             │
 *   │          ▼                   ▼                    ▼             │
 *   │  ┌─────────────────────────────────────────────────────────┐  │
 *   │  │              Entity Extraction Pipeline                  │  │
 *   │  │  Conversations → NER → Relations → Neo4j Storage        │  │
 *   │  └─────────────────────────────────────────────────────────┘  │
 *   │                                                                  │
 *   └─────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 *   const graphRAG = new GraphRAGNeo4j({ neo4j: { uri, user, password } });
 *   await graphRAG.initialize();
 *   
 *   // Extract and store entities
 *   await graphRAG.extractAndStoreEntities(conversation);
 *   
 *   // Hybrid search
 *   const results = await graphRAG.hybridSearch(query, { topK: 10 });
 *   
 *   // Graph reasoning
 *   const path = await graphRAG.findPath('agent-1', 'memory-concept');
 */

const neo4j = require('neo4j-driver');

// Optional pg dependency for hybrid queries
let Pool = null;
try {
  Pool = require('pg').Pool;
} catch (error) {
  console.warn('[GraphRAG-Neo4j] pg module not available');
}

// Relationship types for knowledge graph
const RELATIONSHIP_TYPES = {
  REFERENCES: 'REFERENCES',
  CAUSES: 'CAUSES',
  RELATES_TO: 'RELATES_TO',
  OWNS: 'OWNS',
  KNOWS: 'KNOWS',
  CREATED: 'CREATED',
  PREFERS: 'PREFERS',
  REQUIRES: 'REQUIRES',
  FOLLOWS: 'FOLLOWS',
  SIMILAR_TO: 'SIMILAR_TO',
  PART_OF: 'PART_OF',
  INSTANCE_OF: 'INSTANCE_OF',
  DERIVED_FROM: 'DERIVED_FROM'
};

// Entity types for knowledge graph
const ENTITY_TYPES = {
  AGENT: 'Agent',
  CONCEPT: 'Concept',
  MEMORY: 'Memory',
  USER: 'User',
  SKILL: 'Skill',
  TASK: 'Task',
  TOOL: 'Tool',
  EPISODE: 'Episode',
  SEMANTIC: 'Semantic'
};

// Default configuration
const DEFAULT_CONFIG = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: process.env.NEO4J_DATABASE || 'neo4j',
    maxConnections: 10,
    connectionTimeout: 30000
  },
  vector: {
    dimension: 768,
    indexName: 'entityEmbeddings',
    similarity: 'cosine'
  },
  extraction: {
    minEntityLength: 2,
    maxEntitiesPerMessage: 50,
    confidenceThreshold: 0.5,
    extractRelationships: true
  },
  search: {
    vectorWeight: 0.6,
    graphWeight: 0.4,
    maxGraphDepth: 3,
    minRelevanceScore: 0.1,
    topK: 10
  },
  consolidation: {
    episodicToSemanticThreshold: 0.7,
    minMentionsForPromotion: 3,
    decayRate: 0.001
  }
};

class GraphRAGNeo4j {
  /**
   * Create GraphRAG Neo4j instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config);
    
    // Neo4j driver and session
    this.driver = null;
    this.session = null;
    
    // PostgreSQL pool for hybrid queries
    this.pgPool = null;
    
    // In-memory cache for frequently accessed entities
    this.entityCache = new Map();
    this.cacheMaxSize = 1000;
    
    // State
    this.initialized = false;
    this.stateFilePath = null;
    
    // Statistics
    this.stats = {
      entitiesCreated: 0,
      relationshipsCreated: 0,
      queriesExecuted: 0,
      lastConsolidation: null
    };
  }

  /**
   * Initialize the GraphRAG Neo4j system
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Neo4j driver
      await this.initializeNeo4j();
      
      // Initialize PostgreSQL for hybrid queries (optional)
      if (Pool) {
        await this.initializePgvector();
      }
      
      // Create vector index in Neo4j
      await this.createVectorIndex();
      
      this.initialized = true;
      console.log('[GraphRAG-Neo4j] Initialized successfully');
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize Neo4j driver
   * @returns {Promise<void>}
   */
  async initializeNeo4j() {
    const { uri, user, password, database, maxConnections, connectionTimeout } = this.config.neo4j;
    
    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: maxConnections,
        connectionTimeout: connectionTimeout,
        disableLosslessIntegers: true
      });
      
      // Test connection
      this.session = this.driver.session({ database });
      await this.session.run('RETURN 1');
      
      console.log('[GraphRAG-Neo4j] Neo4j connected to', uri);
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Neo4j connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize pgvector for hybrid queries
   * @returns {Promise<void>}
   */
  async initializePgvector() {
    try {
      this.pgPool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'openclaw',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        max: 10,
        idleTimeoutMillis: 30000
      });
      
      await this.pgPool.query('SELECT 1');
      console.log('[GraphRAG-Neo4j] pgvector connected for hybrid queries');
    } catch (error) {
      console.warn('[GraphRAG-Neo4j] pgvector initialization failed:', error.message);
      this.pgPool = null;
    }
  }

  /**
   * Create vector index in Neo4j using GDS
   * @returns {Promise<void>}
   */
  async createVectorIndex() {
    try {
      // Create full-text index for entity embeddings
      await this.session.run(`
        CREATE VECTOR INDEX ${this.config.vector.indexName} IF NOT EXISTS
        FOR (e:Entity)
        ON EACH (e.embedding)
        OPTIONS { indexConfig: {
          \`vector.dimensions\`: ${this.config.vector.dimension},
          \`vector.similarity_function\`: '${this.config.vector.similarity}'
        }}
      `);
      
      // Create regular indexes for faster lookups
      await this.session.run('CREATE INDEX entity_id_index IF NOT EXISTS FOR (e:Entity) ON (e.id)');
      await this.session.run('CREATE INDEX entity_type_index IF NOT EXISTS FOR (e:Entity) ON (e.type)');
      await this.session.run('CREATE INDEX entity_name_index IF NOT EXISTS FOR (e:Entity) ON (e.name)');
      await this.session.run('CREATE INDEX relationship_type_index IF NOT EXISTS FOR ()-[r:RELATED]->() ON (r.type)');
      
      console.log('[GraphRAG-Neo4j] Vector index created');
    } catch (error) {
      console.warn('[GraphRAG-Neo4j] Vector index creation failed:', error.message);
    }
  }

  /**
   * Add entity to the knowledge graph
   * @param {Object} entity - Entity data
   * @returns {Promise<string>} Entity ID
   */
  async addEntity(entity) {
    if (!this.initialized) await this.initialize();

    const id = entity.id || `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const entityData = {
      id,
      type: entity.type || ENTITY_TYPES.CONCEPT,
      name: entity.name || id,
      description: entity.description || '',
      embedding: entity.embedding || null,
      properties: entity.properties || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
      importance: entity.importance || 0.5
    };

    try {
      const result = await this.session.run(`
        MERGE (e:Entity {id: $id})
        SET e += $data
        RETURN e.id as id
      `, { id, data: entityData });
      
      // Update cache
      if (this.entityCache.size >= this.cacheMaxSize) {
        this.entityCache.clear();
      }
      this.entityCache.set(id, entityData);
      
      this.stats.entitiesCreated++;
      return id;
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Failed to add entity:', error.message);
      throw error;
    }
  }

  /**
   * Add multiple entities in a batch
   * @param {Array} entities - Array of entity objects
   * @returns {Promise<Array>} Array of entity IDs
   */
  async addEntities(entities) {
    if (!this.initialized) await this.initialize();

    const ids = [];
    
    try {
      for (const entity of entities) {
        const id = await this.addEntity(entity);
        ids.push(id);
      }
      return ids;
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Failed to add entities:', error.message);
      throw error;
    }
  }

  /**
   * Add relationship between entities
   * @param {Object} relationship - Relationship data
   * @returns {Promise<Object>} Relationship object
   */
  async addRelationship(relationship) {
    if (!this.initialized) await this.initialize();

    const { from, to, type, weight = 1.0, properties = {} } = relationship;
    
    try {
      const result = await this.session.run(`
        MATCH (from:Entity {id: $fromId})
        MATCH (to:Entity {id: $toId})
        MERGE (from)-[r:RELATED {type: $type}]->(to)
        SET r += $properties
        SET r.weight = $weight
        SET r.createdAt = timestamp()
        RETURN r
      `, { fromId: from, toId: to, type, properties, weight });
      
      this.stats.relationshipsCreated++;
      
      return {
        from,
        to,
        type,
        weight,
        properties,
        createdAt: Date.now()
      };
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Failed to add relationship:', error.message);
      throw error;
    }
  }

  /**
   * Add multiple relationships in a batch
   * @param {Array} relationships - Array of relationship objects
   * @returns {Promise<Array>} Array of relationship objects
   */
  async addRelationships(relationships) {
    if (!this.initialized) await this.initialize();

    const results = [];
    
    try {
      for (const rel of relationships) {
        const result = await this.addRelationship(rel);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Failed to add relationships:', error.message);
      throw error;
    }
  }

  /**
   * Extract entities from text content
   * @param {string} content - Text content to extract from
   * @param {Object} options - Extraction options
   * @returns {Promise<Array>} Extracted entities
   */
  async extractEntities(content, options = {}) {
    const { maxEntities = this.config.extraction.maxEntitiesPerMessage } = options;
    
    const entities = [];
    const seenEntities = new Set();
    
    if (!content || typeof content !== 'string') {
      return entities;
    }

    // Pattern-based entity extraction
    const capitalizedPattern = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*)\b/g;
    let match;
    
    while ((match = capitalizedPattern.exec(content)) !== null) {
      const entityName = match[1].trim();
      const entityId = entityName.toLowerCase().replace(/\s+/g, '-');
      
      if (!seenEntities.has(entityId) && entityName.length >= this.config.extraction.minEntityLength) {
        seenEntities.add(entityId);
        
        entities.push({
          id: entityId,
          name: entityName,
          type: this.inferEntityType(entityName),
          source: 'extraction',
          confidence: 0.8,
          mentions: 1
        });
      }
      
      if (entities.length >= maxEntities) break;
    }

    // Extract key concepts
    const conceptPattern = /\b(concept|memory|agent|skill|tool|consciousness|reasoning|thought|belief|goal|plan)\b/gi;
    
    while ((match = conceptPattern.exec(content)) !== null) {
      const conceptName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const conceptId = conceptName.toLowerCase();
      
      if (!seenEntities.has(conceptId)) {
        seenEntities.add(conceptId);
        
        entities.push({
          id: conceptId,
          name: conceptName,
          type: ENTITY_TYPES.CONCEPT,
          source: 'extraction',
          confidence: 0.7,
          mentions: 1
        });
      }
    }

    return entities;
  }

  /**
   * Infer entity type from name
   * @param {string} name - Entity name
   * @returns {string} Inferred entity type
   */
  inferEntityType(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('agent')) return ENTITY_TYPES.AGENT;
    if (lowerName.includes('user')) return ENTITY_TYPES.USER;
    if (lowerName.includes('skill')) return ENTITY_TYPES.SKILL;
    if (lowerName.includes('tool')) return ENTITY_TYPES.TOOL;
    if (lowerName.includes('memory') || lowerName.includes('thought')) return ENTITY_TYPES.MEMORY;
    if (lowerName.includes('task')) return ENTITY_TYPES.TASK;
    if (lowerName.includes('episode')) return ENTITY_TYPES.EPISODE;
    
    return ENTITY_TYPES.CONCEPT;
  }

  /**
   * Extract relationships from content and entities
   * @param {Array} entities - Extracted entities
   * @param {string} content - Original content
   * @returns {Promise<Array>} Extracted relationships
   */
  async extractRelationships(entities, content) {
    const relationships = [];
    
    if (!entities || entities.length < 2) {
      return relationships;
    }

    const patterns = [
      { regex: /\b(\w+)\s+(?:knows|understands|learns about)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.KNOWS },
      { regex: /\b(\w+)\s+(?:creates?|made|generated)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.CREATED },
      { regex: /\b(\w+)\s+(?:needs?|requires?|depends on)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.REQUIRES },
      { regex: /\b(\w+)\s+(?:relates to|connected to|related to)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.RELATES_TO },
      { regex: /\b(\w+)\s+(?:causes?|leads to|results in)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.CAUSES },
      { regex: /\b(\w+)\s+(?:owns?|has|possesses)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.OWNS },
      { regex: /\b(\w+)\s+(?:follows?|precedes)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.FOLLOWS },
      { regex: /\b(\w+)\s+(?:references?|mentions?)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.REFERENCES }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const fromName = match[1].toLowerCase().replace(/\s+/g, '-');
        const toName = match[2].toLowerCase().replace(/\s+/g, '-');
        
        const fromEntity = entities.find(e => e.name.toLowerCase().includes(match[1].toLowerCase()));
        const toEntity = entities.find(e => e.name.toLowerCase().includes(match[2].toLowerCase()));
        
        if (fromEntity && toEntity && fromEntity.id !== toEntity.id) {
          relationships.push({
            from: fromEntity.id,
            to: toEntity.id,
            type: pattern.type,
            source: 'extraction',
            confidence: 0.7
          });
        }
      }
    }

    // Add sequential relationships
    for (let i = 0; i < entities.length - 1; i++) {
      const from = entities[i];
      const to = entities[i + 1];
      
      const exists = relationships.some(r => 
        (r.from === from.id && r.to === to.id) ||
        (r.from === to.id && r.to === from.id)
      );
      
      if (!exists) {
        relationships.push({
          from: from.id,
          to: to.id,
          type: RELATIONSHIP_TYPES.RELATES_TO,
          source: 'extraction',
          confidence: 0.5
        });
      }
    }

    return relationships;
  }

  /**
   * Process conversation and extract entities/relationships
   * @param {Array} messages - Array of message objects
   * @returns {Promise<Object>} Processing results
   */
  async processConversation(messages) {
    const results = {
      entities: [],
      relationships: [],
      errors: []
    };

    try {
      const allContent = messages.map(m => m.content || m.text || '').join(' ');
      
      const extractedEntities = await this.extractEntities(allContent);
      
      for (const entity of extractedEntities) {
        try {
          const id = await this.addEntity(entity);
          results.entities.push({ ...entity, id });
        } catch (error) {
          results.errors.push(`Entity error: ${error.message}`);
        }
      }

      if (this.config.extraction.extractRelationships) {
        const extractedRelationships = await this.extractRelationships(results.entities, allContent);
        
        for (const rel of extractedRelationships) {
          try {
            const saved = await this.addRelationship(rel);
            results.relationships.push(saved);
          } catch (error) {
            results.errors.push(`Relationship error: ${error.message}`);
          }
        }
      }

    } catch (error) {
      results.errors.push(`Conversation processing error: ${error.message}`);
    }

    return results;
  }

  /**
   * Vector-based similarity search in Neo4j
   * @param {Array} queryVector - Query embedding vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async vectorSearch(queryVector, options = {}) {
    if (!this.initialized) await this.initialize();

    const { topK = this.config.search.topK, threshold = 0.5, entityTypes = null } = options;

    try {
      const entityTypeFilter = entityTypes ? `e.type IN $entityTypes` : 'true';
      
      const result = await this.session.run(`
        CALL db.index.vector.queryNodes($indexName, $topK, $queryVector)
        YIELD node AS entity, score
        WHERE ${entityTypeFilter} AND score >= $threshold
        RETURN entity.id AS id, entity.name AS name, entity.type AS type, 
               entity.description AS description, entity.properties AS properties,
               score
        ORDER BY score DESC
      `, { 
        indexName: this.config.vector.indexName,
        topK, 
        queryVector: queryVector,
        entityTypes,
        threshold 
      });
      
      this.stats.queriesExecuted++;
      
      return result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        type: record.get('type'),
        description: record.get('description'),
        properties: record.get('properties'),
        score: record.get('score'),
        source: 'vector'
      }));
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Vector search failed:', error.message);
      return [];
    }
  }

  /**
   * Graph traversal from a starting entity
   * @param {string} startId - Starting entity ID
   * @param {Object} options - Traversal options
   * @returns {Promise<Array>} Traversed entities with paths
   */
  async traverseGraph(startId, options = {}) {
    if (!this.initialized) await this.initialize();

    const { 
      maxDepth = this.config.search.maxGraphDepth,
      relationshipTypes = null,
      limit = 50
    } = options;

    try {
      const relTypeFilter = relationshipTypes 
        ? `type(r) IN $relationshipTypes` 
        : 'true';
      
      const result = await this.session.run(`
        MATCH (start:Entity {id: $startId})
        CALL {
          WITH start
          MATCH path = (start)-[r:RELATED*1..${maxDepth}]->(target)
          WHERE ${relTypeFilter}
          RETURN path, length(path) AS depth
          LIMIT $limit
        }
        RETURN path, depth
        ORDER BY depth
      `, { startId, relationshipTypes, limit });
      
      this.stats.queriesExecuted++;
      
      const visited = new Set();
      const results = [];
      
      for (const record of result.records) {
        const path = record.get('path');
        const depth = record.get('depth');
        
        const nodes = path.nodes;
        for (let i = 1; i < nodes.length; i++) {
          const node = nodes[i];
          const id = node.properties.id;
          
          if (!visited.has(id)) {
            visited.add(id);
            results.push({
              id,
              name: node.properties.name,
              type: node.properties.type,
              description: node.properties.description,
              depth,
              path: path.relationships.map(r => ({
                type: r.type,
                to: r.end.properties.id
              }))
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Graph traversal failed:', error.message);
      return [];
    }
  }

  /**
   * Hybrid search combining vector similarity and graph traversal
   * @param {string} query - Search query string
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Combined search results
   */
  async hybridSearch(query, options = {}) {
    if (!this.initialized) await this.initialize();

    const { 
      topK = this.config.search.topK,
      vectorWeight = this.config.search.vectorWeight,
      graphWeight = this.config.search.graphWeight,
      maxGraphDepth = this.config.search.maxGraphDepth
    } = options;

    const results = [];
    const seenEntities = new Map();

    // 1. Extract query entities for graph search
    const queryEntities = await this.extractEntities(query);
    
    // 2. Vector search for each query entity
    for (const entity of queryEntities) {
      const cached = this.entityCache.get(entity.id);
      if (cached && cached.embedding) {
        const vectorResults = await this.vectorSearch(cached.embedding, { topK: topK * 2 });
        
        for (const result of vectorResults) {
          if (!seenEntities.has(result.id)) {
            seenEntities.set(result.id, {
              ...result,
              vectorScore: result.score * vectorWeight,
              graphScore: 0,
              combinedScore: result.score * vectorWeight
            });
          }
        }
      }
    }

    // 3. Graph-based search from query entities
    for (const entity of queryEntities) {
      const traversal = await this.traverseGraph(entity.id, { maxDepth: maxGraphDepth, limit: 20 });
      
      for (const result of traversal) {
        if (!seenEntities.has(result.id)) {
          const graphScore = Math.min(1, (maxGraphDepth - result.depth + 1) / maxGraphDepth);
          seenEntities.set(result.id, {
            ...result,
            vectorScore: 0,
            graphScore: graphScore * graphWeight,
            combinedScore: graphScore * graphWeight
          });
        } else {
          const existing = seenEntities.get(result.id);
          const graphScore = Math.min(1, (maxGraphDepth - result.depth + 1) / maxGraphDepth);
          existing.graphScore = Math.max(existing.graphScore, graphScore * graphWeight);
          existing.combinedScore = existing.vectorScore + existing.graphScore;
        }
      }
    }

    // 4. Merge and sort results
    results.push(...Array.from(seenEntities.values()));
    results.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));

    // 5. Filter by minimum relevance
    const filteredResults = results.filter(r => 
      (r.combinedScore || 0) >= this.config.search.minRelevanceScore
    );

    return filteredResults.slice(0, topK);
  }

  /**
   * Find shortest path between two entities
   * @param {string} fromId - Starting entity ID
   * @param {string} toId - Target entity ID
   * @returns {Promise<Array|null>} Path or null if not found
   */
  async findPath(fromId, toId) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.session.run(`
        MATCH (from:Entity {id: $fromId})
        MATCH (to:Entity {id: $toId})
        MATCH path = shortestPath((from)-[*..10]-(to))
        RETURN path
      `, { fromId, toId });
      
      this.stats.queriesExecuted++;
      
      if (result.records.length === 0 || !result.records[0].get('path')) {
        return null;
      }
      
      const path = result.records[0].get('path');
      return {
        nodes: path.nodes.map(n => ({ id: n.properties.id, name: n.properties.name, type: n.properties.type })),
        relationships: path.relationships.map(r => ({ type: r.type, from: r.start.properties.id, to: r.end.properties.id }))
      };
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Path finding failed:', error.message);
      return null;
    }
  }

  /**
   * Get subgraph around an entity
   * @param {string} entityId - Entity ID
   * @param {number} depth - Traversal depth
   * @returns {Promise<Object>} Subgraph data
   */
  async getSubgraph(entityId, depth = 2) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.session.run(`
        MATCH (center:Entity {id: $entityId})
        OPTIONAL MATCH (center)-[r:RELATED*1..${depth}]-(neighbor)
        RETURN center, collect(DISTINCT neighbor) AS neighbors, collect(DISTINCT r) AS relationships
      `, { entityId });
      
      this.stats.queriesExecuted++;
      
      if (result.records.length === 0) {
        return { centralEntity: null, entities: [], relationships: [] };
      }
      
      const record = result.records[0];
      const center = record.get('center');
      const neighbors = record.get('neighbors');
      const relationships = record.get('relationships');
      
      return {
        centralEntity: {
          id: center.properties.id,
          name: center.properties.name,
          type: center.properties.type,
          description: center.properties.description
        },
        entities: neighbors.filter(n => n !== null).map(n => ({
          id: n.properties.id,
          name: n.properties.name,
          type: n.properties.type,
          description: n.properties.description
        })),
        relationships: relationships.filter(r => r !== null).map(r => ({
          type: r.type,
          from: r.start.properties.id,
          to: r.end.properties.id,
          weight: r.properties.weight
        }))
      };
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Subgraph retrieval failed:', error.message);
      return { centralEntity: null, entities: [], relationships: [] };
    }
  }

  /**
   * Get entity by ID
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object|null>} Entity data or null
   */
  async getEntity(entityId) {
    if (!this.initialized) await this.initialize();

    // Check cache first
    if (this.entityCache.has(entityId)) {
      return this.entityCache.get(entityId);
    }

    try {
      const result = await this.session.run(`
        MATCH (e:Entity {id: $entityId})
        RETURN e
      `, { entityId });
      
      this.stats.queriesExecuted++;
      
      if (result.records.length === 0) {
        return null;
      }
      
      const entity = result.records[0].get('e');
      const entityData = {
        id: entity.properties.id,
        name: entity.properties.name,
        type: entity.properties.type,
        description: entity.properties.description,
        properties: entity.properties.properties,
        createdAt: entity.properties.createdAt,
        updatedAt: entity.properties.updatedAt,
        accessCount: entity.properties.accessCount,
        importance: entity.properties.importance
      };
      
      // Update cache
      if (this.entityCache.size >= this.cacheMaxSize) {
        this.entityCache.clear();
      }
      this.entityCache.set(entityId, entityData);
      
      return entityData;
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Entity retrieval failed:', error.message);
      return null;
    }
  }

  /**
   * Get entities by type
   * @param {string} type - Entity type
   * @returns {Promise<Array>} Array of entities
   */
  async getEntitiesByType(type) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.session.run(`
        MATCH (e:Entity {type: $type})
        RETURN e
      `, { type });
      
      this.stats.queriesExecuted++;
      
      return result.records.map(record => {
        const entity = record.get('e');
        return {
          id: entity.properties.id,
          name: entity.properties.name,
          type: entity.properties.type,
          description: entity.properties.description
        };
      });
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Type-based retrieval failed:', error.message);
      return [];
    }
  }

  /**
   * Get relationships for an entity
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of relationships
   */
  async getRelationships(entityId, options = {}) {
    if (!this.initialized) await this.initialize();

    const { type, direction = 'outgoing' } = options;

    try {
      let query;
      if (direction === 'outgoing') {
        query = `
          MATCH (e:Entity {id: $entityId})-[r:RELATED]->(target)
          WHERE $type IS NULL OR type(r) = $type
          RETURN r, target
        `;
      } else if (direction === 'incoming') {
        query = `
          MATCH (source)-[r:RELATED]->(e:Entity {id: $entityId})
          WHERE $type IS NULL OR type(r) = $type
          RETURN r, source
        `;
      } else {
        query = `
          MATCH (e:Entity {id: $entityId})-[r:RELATED]-(other)
          WHERE $type IS NULL OR type(r) = $type
          RETURN r, other
        `;
      }
      
      const result = await this.session.run(query, { entityId, type: type || null });
      
      this.stats.queriesExecuted++;
      
      return result.records.map(record => {
        const rel = record.get('r');
        const other = record.get('target') || record.get('source');
        return {
          type: rel.type,
          from: direction === 'incoming' ? other.properties.id : entityId,
          to: direction === 'incoming' ? entityId : other.properties.id,
          weight: rel.properties.weight,
          properties: rel.properties,
          relatedEntity: {
            id: other.properties.id,
            name: other.properties.name,
            type: other.properties.type
          }
        };
      });
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Relationship retrieval failed:', error.message);
      return [];
    }
  }

  /**
   * Update entity importance based on access patterns
   * @param {string} entityId - Entity ID
   * @param {number} importanceDelta - Importance change
   * @returns {Promise<Object>} Updated entity
   */
  async updateEntityImportance(entityId, importanceDelta) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.session.run(`
        MATCH (e:Entity {id: $entityId})
        SET e.importance = e.importance + $delta
        SET e.updatedAt = timestamp()
        SET e.accessCount = e.accessCount + 1
        RETURN e
      `, { entityId, delta: importanceDelta });
      
      this.stats.queriesExecuted++;
      
      if (result.records.length === 0) {
        return null;
      }
      
      const entity = result.records[0].get('e');
      const updated = {
        id: entity.properties.id,
        name: entity.properties.name,
        type: entity.properties.type,
        importance: entity.properties.importance,
        accessCount: entity.properties.accessCount
      };
      
      // Update cache
      this.entityCache.set(entityId, updated);
      
      return updated;
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Importance update failed:', error.message);
      return null;
    }
  }

  /**
   * Perform graph-based reasoning for complex queries
   * @param {string} query - Reasoning query
   * @param {Object} options - Reasoning options
   * @returns {Promise<Object>} Reasoning results
   */
  async graphReasoning(query, options = {}) {
    if (!this.initialized) await this.initialize();

    const { maxDepth = 3, minConfidence = 0.5 } = options;

    // Extract entities from query
    const queryEntities = await this.extractEntities(query);
    
    if (queryEntities.length === 0) {
      return { reasoning: null, confidence: 0, paths: [] };
    }

    // Find connections between query entities
    const paths = [];
    for (let i = 0; i < queryEntities.length - 1; i++) {
      for (let j = i + 1; j < queryEntities.length; j++) {
        const path = await this.findPath(queryEntities[i].id, queryEntities[j].id);
        if (path) {
          paths.push({
            from: queryEntities[i],
            to: queryEntities[j],
            path
          });
        }
      }
    }

    // Calculate confidence based on path quality
    const avgPathLength = paths.length > 0 
      ? paths.reduce((sum, p) => sum + p.path.relationships.length, 0) / paths.length 
      : Infinity;
    
    const confidence = paths.length > 0 ? Math.max(0, 1 - (avgPathLength / 10)) : 0;

    return {
      reasoning: paths.length > 0 ? 'Found connections between entities' : 'No direct connections found',
      confidence,
      paths,
      entities: queryEntities
    };
  }

  /**
   * Get graph statistics
   * @returns {Promise<Object>} Graph statistics
   */
  async getStats() {
    if (!this.initialized) await this.initialize();

    try {
      const entityResult = await this.session.run(`
        MATCH (e:Entity)
        RETURN count(e) as count, count(DISTINCT e.type) as types
      `);
      
      const relResult = await this.session.run(`
        MATCH ()-[r:RELATED]->()
        RETURN count(r) as count, count(DISTINCT r.type) as types
      `);
      
      this.stats.queriesExecuted += 2;
      
      return {
        totalEntities: entityResult.records[0]?.get('count') || 0,
        entityTypes: entityResult.records[0]?.get('types') || 0,
        totalRelationships: relResult.records[0]?.get('count') || 0,
        relationshipTypes: relResult.records[0]?.get('types') || 0,
        cacheSize: this.entityCache.size,
        ...this.stats
      };
    } catch (error) {
      console.error('[GraphRAG-Neo4j] Stats retrieval failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Close Neo4j connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
    
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    
    this.entityCache.clear();
    this.initialized = false;
    
    console.log('[GraphRAG-Neo4j] Closed connections');
  }
}

/**
 * GraphRAG Factory - Create configured instances
 */
class GraphRAGNeo4jFactory {
  /**
   * Create GraphRAG Neo4j instance with configuration
   * @param {Object} config - Configuration options
   * @returns {Promise<GraphRAGNeo4j>} Configured instance
   */
  static async create(config = {}) {
    const graphRAG = new GraphRAGNeo4j(config);
    await graphRAG.initialize();
    return graphRAG;
  }
}

module.exports = {
  GraphRAGNeo4j,
  GraphRAGNeo4jFactory,
  RELATIONSHIP_TYPES,
  ENTITY_TYPES
};
