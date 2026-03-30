#!/usr/bin/env node
/**
 * GraphRAG Module - Knowledge Graph with Hybrid Search
 * 
 * Provides entity-relationship management with:
 * - Knowledge Graph: Entity-relationship representation
 * - Graph-based Retrieval: Navigate relationships for context
 * - Hybrid Search: Combine vector similarity + graph traversal
 * - Entity Extraction: Auto-extract entities from agent interactions
 * 
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                      GraphRAG API                              │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │                                                                  │
 *   │  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
 *   │  │   Entity     │    │  Relationship│    │   Hybrid        │   │
 *   │  │   Store      │    │   Store      │    │   Search        │   │
 *   │  │              │    │              │    │                 │   │
 *   │  │  JSON-based  │    │  Graph       │    │  Vector + Graph │   │
 *   │  │  with        │    │  Traversal   │    │  Combined       │   │
 *   │  │  pgvector    │    │              │    │                 │   │
 *   │  └──────────────┘    └──────────────┘    └─────────────────┘   │
 *   │          │                   │                    │             │
 *   │          ▼                   ▼                    ▼             │
 *   │  ┌─────────────────────────────────────────────────────────┐  │
 *   │  │              Entity Extraction Pipeline                  │  │
 *   │  │  Conversations → NER → Relations → Graph Storage        │  │
 *   │  └─────────────────────────────────────────────────────────┘  │
 *   │                                                                  │
 *   └─────────────────────────────────────────────────────────────────┘
 * 
 * Relationship Types:
 * - references: Entity A references Entity B
 * - causes: Entity A causes Entity B
 * - relates_to: Entity A is related to Entity B
 * - owns: Entity A owns Entity B
 * 
 * Usage:
 *   const graphRAG = new GraphRAG();
 *   await graphRAG.initialize();
 *   
 *   // Extract entities from conversation
 *   const entities = await graphRAG.extractEntities(conversation);
 *   
 *   // Add entities and relationships
 *   await graphRAG.addEntity({ id: 'agent-1', type: 'Agent', name: 'Explorer' });
 *   await graphRAG.addRelationship({ from: 'agent-1', to: 'memory', type: 'KNOWS' });
 *   
 *   // Hybrid search
 *   const results = await graphRAG.hybridSearch(query, { topK: 10 });
 */

const fs = require('fs');
const path = require('path');

// Optional PostgreSQL dependency
let Pool = null;
try {
  Pool = require('pg');
} catch (error) {
  console.warn('[GraphRAG] pg module not available, using JSON storage only');
}

// Relationship type definitions
const RELATIONSHIP_TYPES = {
  REFERENCES: 'references',
  CAUSES: 'causes',
  RELATES_TO: 'relates_to',
  OWNS: 'owns',
  KNOWS: 'knows',
  CREATED: 'created',
  PREFERS: 'prefers',
  REQUIRES: 'requires',
  FOLLOWS: 'follows'
};

// Entity type definitions
const ENTITY_TYPES = {
  AGENT: 'Agent',
  CONCEPT: 'Concept',
  MEMORY: 'Memory',
  USER: 'User',
  SKILL: 'Skill',
  TASK: 'Task',
  TOOL: 'Tool'
};

// Configuration defaults
const DEFAULT_CONFIG = {
  // Storage settings
  storage: {
    type: 'json',  // json or pgvector
    dataDir: path.join(__dirname, 'data', 'graph'),
    entityTable: 'graph_entities',
    relationshipTable: 'graph_relationships'
  },
  
  // PostgreSQL settings for pgvector storage
  pgvector: {
    host: process.env.PGHOST || process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'openclaw',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    dimension: 768  // Standard text embeddings
  },
  
  // Entity extraction settings
  extraction: {
    minEntityLength: 2,
    maxEntitiesPerMessage: 50,
    confidenceThreshold: 0.5,
    extractRelationships: true
  },
  
  // Hybrid search settings
  search: {
    vectorWeight: 0.6,
    graphWeight: 0.4,
    maxGraphDepth: 3,
    minRelevanceScore: 0.1
  },
  
  // Graph traversal settings
  traversal: {
    maxHops: 3,
    expandFactor: 10
  }
};

class GraphRAG {
  /**
   * Create GraphRAG instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config);
    
    // In-memory graph storage
    this.entities = new Map();           // id -> entity data
    this.relationships = [];              // Array of relationship objects
    this.entityIndex = new Map();         // type -> [entity ids]
    this.relationshipIndex = new Map();  // fromId -> [relationship objects]
    
    // PostgreSQL pool for pgvector
    this.pgPool = null;
    
    // Vector store reference
    this.vectorStore = null;
    
    // State
    this.initialized = false;
    this.stateFilePath = path.join(__dirname, 'state', 'graph-state.json');
    
    // Load persisted state
    this.load();
  }

  /**
   * Set vector store reference for hybrid search
   * @param {Object} vectorStore - VectorStore instance
   */
  setVectorStore(vectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * Initialize the GraphRAG system
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize storage based on configuration
      if (this.config.storage.type === 'pgvector') {
        await this.initializePgvector();
      } else {
        await this.initializeJsonStorage();
      }

      this.initialized = true;
      console.log('[GraphRAG] Initialized with ' + this.entities.size + ' entities');
    } catch (error) {
      console.error('[GraphRAG] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize JSON-based storage
   * @returns {Promise<void>}
   */
  async initializeJsonStorage() {
    const dataDir = this.config.storage.dataDir;
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Ensure state directory exists
    const stateDir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // Load existing data
    await this.loadGraphData();
    
    console.log('[GraphRAG] JSON storage initialized');
  }

  /**
   * Initialize pgvector storage
   * @returns {Promise<void>}
   */
  async initializePgvector() {
    if (!Pool) {
      console.warn('[GraphRAG] pg module not available, using JSON fallback');
      this.config.storage.type = 'json';
      await this.initializeJsonStorage();
      return;
    }

    try {
      this.pgPool = new Pool({
        host: this.config.pgvector.host,
        port: this.config.pgvector.port,
        database: this.config.pgvector.database,
        user: this.config.pgvector.user,
        password: this.config.pgvector.password,
        max: 10,
        idleTimeoutMillis: 30000
      });

      // Test connection
      const client = await this.pgPool.connect();
      console.log('[GraphRAG] pgvector connected');
      
      // Create tables
      await this.createPgTables(client);
      client.release();
      
      // Load existing data
      await this.loadPgData();
      
    } catch (error) {
      console.warn('[GraphRAG] pgvector initialization failed, using JSON fallback:', error.message);
      this.config.storage.type = 'json';
      await this.initializeJsonStorage();
    }
  }

  /**
   * Create pgvector tables for entities and relationships
   * @param {Object} client - PostgreSQL client
   */
  async createPgTables(client) {
    // Entities table with vector embedding
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.storage.entityTable} (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(500),
        description TEXT,
        embedding VECTOR(${this.config.pgvector.dimension}),
        properties JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Relationships table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.storage.relationshipTable} (
        id SERIAL PRIMARY KEY,
        from_id VARCHAR(255) NOT NULL,
        to_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        properties JSONB,
        weight FLOAT DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entities_type ON ${this.config.storage.entityTable} (type)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_from ON ${this.config.storage.relationshipTable} (from_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_relationships_to ON ${this.config.storage.relationshipTable} (to_id)
    `);
  }

  /**
   * Load graph data from JSON storage
   */
  async loadGraphData() {
    const entitiesFile = path.join(this.config.storage.dataDir, 'entities.json');
    const relationshipsFile = path.join(this.config.storage.dataDir, 'relationships.json');

    // Load entities
    if (fs.existsSync(entitiesFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(entitiesFile, 'utf8'));
        this.entities = new Map(Object.entries(data));
        
        // Rebuild type index
        this.rebuildEntityIndex();
      } catch (error) {
        console.warn('[GraphRAG] Failed to load entities:', error.message);
      }
    }

    // Load relationships
    if (fs.existsSync(relationshipsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(relationshipsFile, 'utf8'));
        this.relationships = data;
        
        // Rebuild relationship index
        this.rebuildRelationshipIndex();
      } catch (error) {
        console.warn('[GraphRAG] Failed to load relationships:', error.message);
      }
    }
  }

  /**
   * Load graph data from pgvector
   */
  async loadPgData() {
    if (!this.pgPool) return;

    const client = await this.pgPool.connect();
    try {
      // Load entities
      const entityResult = await client.query(`
        SELECT id, type, name, description, embedding, properties
        FROM ${this.config.storage.entityTable}
      `);

      for (const row of entityResult.rows) {
        this.entities.set(row.id, {
          id: row.id,
          type: row.type,
          name: row.name,
          description: row.description,
          embedding: row.embedding,
          properties: row.properties,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime()
        });
      }

      // Load relationships
      const relResult = await client.query(`
        SELECT from_id, to_id, type, properties, weight
        FROM ${this.config.storage.relationshipTable}
      `);

      this.relationships = relResult.rows.map(row => ({
        from: row.from_id,
        to: row.to_id,
        type: row.type,
        properties: row.properties,
        weight: row.weight,
        createdAt: new Date(row.created_at).getTime()
      }));

      // Rebuild indexes
      this.rebuildEntityIndex();
      this.rebuildRelationshipIndex();

    } finally {
      client.release();
    }
  }

  /**
   * Rebuild entity type index
   */
  rebuildEntityIndex() {
    this.entityIndex = new Map();
    
    for (const [id, entity] of this.entities.entries()) {
      const type = entity.type;
      if (!this.entityIndex.has(type)) {
        this.entityIndex.set(type, []);
      }
      this.entityIndex.get(type).push(id);
    }
  }

  /**
   * Rebuild relationship index
   */
  rebuildRelationshipIndex() {
    this.relationshipIndex = new Map();
    
    for (const rel of this.relationships) {
      if (!this.relationshipIndex.has(rel.from)) {
        this.relationshipIndex.set(rel.from, []);
      }
      this.relationshipIndex.get(rel.from).push(rel);
    }
  }

  /**
   * Save graph data to JSON storage
   */
  async saveGraphData() {
    if (this.config.storage.type !== 'json') return;

    const entitiesFile = path.join(this.config.storage.dataDir, 'entities.json');
    const relationshipsFile = path.join(this.config.storage.dataDir, 'relationships.json');

    // Save entities
    const entityData = Object.fromEntries(this.entities);
    fs.writeFileSync(entitiesFile, JSON.stringify(entityData, null, 2));

    // Save relationships
    fs.writeFileSync(relationshipsFile, JSON.stringify(this.relationships, null, 2));
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
    // Extract capitalized words (potential proper nouns/named entities)
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

    // Extract key concepts (words that might be concepts)
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

    // Extract numeric patterns (dates, versions, etc.)
    const numericPattern = /\b(v?\d+\.\d+(?:\.\d+)?)\b/g;
    
    while ((match = numericPattern.exec(content)) !== null) {
      const versionId = `version-${match[1]}`;
      
      if (!seenEntities.has(versionId)) {
        seenEntities.add(versionId);
        
        entities.push({
          id: versionId,
          name: match[1],
          type: 'Version',
          source: 'extraction',
          confidence: 0.9,
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
    
    // Check for known patterns
    if (lowerName.includes('agent')) return ENTITY_TYPES.AGENT;
    if (lowerName.includes('user')) return ENTITY_TYPES.USER;
    if (lowerName.includes('skill')) return ENTITY_TYPES.SKILL;
    if (lowerName.includes('tool')) return ENTITY_TYPES.TOOL;
    if (lowerName.includes('memory') || lowerName.includes('thought')) return ENTITY_TYPES.MEMORY;
    if (lowerName.includes('task')) return ENTITY_TYPES.TASK;
    
    // Default to Concept
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

    const entityIds = entities.map(e => e.id);
    
    // Pattern-based relationship extraction
    const patterns = [
      { regex: /\b(\w+)\s+(?:knows|understands|learns about)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.KNOWS },
      { regex: /\b(\w+)\s+(?:creates?|made|generated)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.CREATED },
      { regex: /\b(\w+)\s+(?:needs?|requires?|depends on)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.REQUIRES },
      { regex: /\b(\w+)\s+(?:relates to|connected to|related to)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.RELATES_TO },
      { regex: /\b(\w+)\s+(?:causes?|leads to|results in)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.CAUSES },
      { regex: /\b(\w+)\s+(?:owns?|has|possesses)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.OWNS },
      { regex: /\b(\w+)\s+(?:follows?|precedes)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.FOLLOWS },
      { regex: /\b(\w+)\s+(?:references?|mentions?)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.REFERENCES },
      { regex: /\b(\w+)\s+(?:prefers?|likes?)\s+(\w+)\b/gi, type: RELATIONSHIP_TYPES.PREFERS }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const fromName = match[1].toLowerCase().replace(/\s+/g, '-');
        const toName = match[2].toLowerCase().replace(/\s+/g, '-');
        
        // Find matching entities
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

    // Add sequential relationships between consecutive entities
    for (let i = 0; i < entities.length - 1; i++) {
      const from = entities[i];
      const to = entities[i + 1];
      
      // Check if relationship already exists
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
   * Add entity to graph
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
      createdAt: entity.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    this.entities.set(id, entityData);
    
    // Update type index
    if (!this.entityIndex.has(entityData.type)) {
      this.entityIndex.set(entityData.type, []);
    }
    this.entityIndex.get(entityData.type).push(id);

    // Save to storage
    await this.saveGraphData();

    return id;
  }

  /**
   * Add multiple entities
   * @param {Array} entities - Array of entity objects
   * @returns {Promise<Array>} Array of entity IDs
   */
  async addEntities(entities) {
    const ids = [];
    
    for (const entity of entities) {
      const id = await this.addEntity(entity);
      ids.push(id);
    }
    
    return ids;
  }

  /**
   * Add relationship to graph
   * @param {Object} relationship - Relationship data
   * @returns {Promise<Object>} Relationship object
   */
  async addRelationship(relationship) {
    if (!this.initialized) await this.initialize();

    const rel = {
      from: relationship.from,
      to: relationship.to,
      type: relationship.type || RELATIONSHIP_TYPES.RELATES_TO,
      properties: relationship.properties || {},
      weight: relationship.weight || 1.0,
      createdAt: Date.now()
    };

    this.relationships.push(rel);
    
    // Update relationship index
    if (!this.relationshipIndex.has(rel.from)) {
      this.relationshipIndex.set(rel.from, []);
    }
    this.relationshipIndex.get(rel.from).push(rel);

    // Save to storage
    await this.saveGraphData();

    return rel;
  }

  /**
   * Add multiple relationships
   * @param {Array} relationships - Array of relationship objects
   * @returns {Promise<Array>} Array of relationship objects
   */
  async addRelationships(relationships) {
    const results = [];
    
    for (const relationship of relationships) {
      const rel = await this.addRelationship(relationship);
      results.push(rel);
    }
    
    return results;
  }

  /**
   * Get entity by ID
   * @param {string} entityId - Entity ID
   * @returns {Object|null} Entity data or null
   */
  getEntity(entityId) {
    return this.entities.get(entityId) || null;
  }

  /**
   * Get entities by type
   * @param {string} type - Entity type
   * @returns {Array} Array of entities
   */
  getEntitiesByType(type) {
    const ids = this.entityIndex.get(type) || [];
    return ids.map(id => this.entities.get(id)).filter(Boolean);
  }

  /**
   * Get relationships for an entity
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   * @returns {Array} Array of relationships
   */
  getRelationships(entityId, options = {}) {
    const { type, direction = 'outgoing' } = options;
    
    let rels = [];
    
    if (direction === 'outgoing' || direction === 'both') {
      rels = rels.concat(this.relationshipIndex.get(entityId) || []);
    }
    
    if (direction === 'incoming' || direction === 'both') {
      for (const rel of this.relationships) {
        if (rel.to === entityId) {
          rels.push(rel);
        }
      }
    }

    // Filter by type if specified
    if (type) {
      rels = rels.filter(r => r.type === type);
    }

    return rels;
  }

  /**
   * Traverse graph from a starting entity
   * @param {string} startId - Starting entity ID
   * @param {Object} options - Traversal options
   * @returns {Promise<Array>} Array of visited entities with paths
   */
  async traverseGraph(startId, options = {}) {
    const { 
      maxDepth = this.config.traversal.maxHops,
      types = null,
      limit = this.config.traversal.expandFactor
    } = options;

    const visited = new Set();
    const results = [];
    const queue = [{ id: startId, depth: 0, path: [] }];

    while (queue.length > 0 && results.length < limit) {
      const current = queue.shift();
      
      if (visited.has(current.id) || current.depth > maxDepth) {
        continue;
      }

      visited.add(current.id);
      
      const entity = this.entities.get(current.id);
      if (entity) {
        results.push({
          ...entity,
          depth: current.depth,
          path: [...current.path, current.id]
        });
      }

      // Get next relationships
      const rels = this.getRelationships(current.id, { direction: 'outgoing' });
      
      for (const rel of rels) {
        // Filter by types if specified
        if (types && !types.includes(rel.type)) {
          continue;
        }

        if (!visited.has(rel.to)) {
          queue.push({
            id: rel.to,
            depth: current.depth + 1,
            path: [...current.path, { type: rel.type, to: rel.to }]
          });
        }
      }
    }

    return results;
  }

  /**
   * Search entities by name or description
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Matching entities
   */
  searchEntities(query, options = {}) {
    const { types = null, limit = 20 } = options;
    
    if (!query) {
      return Array.from(this.entities.values()).slice(0, limit);
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const entity of this.entities.values()) {
      // Filter by types if specified
      if (types && !types.includes(entity.type)) {
        continue;
      }

      // Calculate simple relevance score
      let score = 0;
      if (entity.name && entity.name.toLowerCase().includes(lowerQuery)) {
        score += 1;
      }
      if (entity.description && entity.description.toLowerCase().includes(lowerQuery)) {
        score += 0.5;
      }

      if (score > 0) {
        results.push({ ...entity, score });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Hybrid search combining vector and graph traversal
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Combined search results
   */
  async hybridSearch(query, options = {}) {
    const { 
      topK = 10,
      vectorWeight = this.config.search.vectorWeight,
      graphWeight = this.config.search.graphWeight,
      maxGraphDepth = this.config.search.maxGraphDepth
    } = options;

    const results = [];
    const seenEntities = new Set();

    // 1. Vector similarity search (if vector store available)
    let vectorResults = [];
    if (this.vectorStore) {
      try {
        // Create a simple query vector (placeholder - in production use actual embeddings)
        const queryVector = this.createQueryVector(query);
        
        vectorResults = await this.vectorStore.search(queryVector, {
          topK: topK * 2,
          hybridSearch: false
        });
        
        // Apply vector weight
        for (const result of vectorResults) {
          result.vectorScore = result.score;
          result.score = result.score * vectorWeight;
          result.source = 'vector';
        }
      } catch (error) {
        console.warn('[GraphRAG] Vector search failed:', error.message);
      }
    }

    // 2. Graph-based search
    let graphResults = [];
    
    // First, search entities by name/description
    const entitySearchResults = this.searchEntities(query, { limit: topK * 2 });
    
    for (const entity of entitySearchResults) {
      if (!seenEntities.has(entity.id)) {
        seenEntities.add(entity.id);
        
        // Calculate graph score based on traversal
        const traversal = await this.traverseGraph(entity.id, { 
          maxDepth: maxGraphDepth,
          limit: 5
        });
        
        const graphScore = traversal.length > 0 ? 
          Math.min(1, traversal.length / maxGraphDepth) : 0;
        
        graphResults.push({
          ...entity,
          graphScore,
          score: graphScore * graphWeight,
          source: 'graph',
          traversal: traversal.slice(0, 3)
        });
      }
    }

    // 3. Merge results
    const mergedMap = new Map();

    // Add vector results
    for (const result of vectorResults) {
      if (result.metadata && result.metadata.entityId) {
        const entityId = result.metadata.entityId;
        if (!mergedMap.has(entityId)) {
          mergedMap.set(entityId, {
            ...result,
            graphScore: 0,
            combinedScore: result.score
          });
        } else {
          const existing = mergedMap.get(entityId);
          existing.score = (existing.score || 0) + result.score;
          existing.combinedScore = existing.score;
        }
      }
    }

    // Add graph results
    for (const result of graphResults) {
      if (!mergedMap.has(result.id)) {
        mergedMap.set(result.id, {
          ...result,
          combinedScore: result.score
        });
      } else {
        const existing = mergedMap.get(result.id);
        existing.score = (existing.score || 0) + result.score;
        existing.combinedScore = existing.score;
        if (result.traversal) {
          existing.traversal = result.traversal;
        }
      }
    }

    // Convert to array and sort
    results.push(...Array.from(mergedMap.values()));
    results.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));

    // Filter by minimum relevance score
    const filteredResults = results.filter(r => 
      (r.combinedScore || 0) >= this.config.search.minRelevanceScore
    );

    return filteredResults.slice(0, topK);
  }

  /**
   * Create a simple query vector (placeholder)
   * In production, this would use actual embeddings
   * @param {string} query - Query string
   * @returns {Array} Query vector
   */
  createQueryVector(query) {
    // Simple hash-based vector for demonstration
    // In production, use actual embedding model
    const dimension = this.config.pgvector.dimension;
    const vector = new Array(dimension).fill(0);
    
    // Hash characters into vector dimensions
    for (let i = 0; i < query.length; i++) {
      const charCode = query.charCodeAt(i);
      vector[i % dimension] += charCode / 255;
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      return vector.map(v => v / magnitude);
    }
    
    return vector;
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
      // Combine all message content
      const allContent = messages.map(m => m.content || m.text || '').join(' ');
      
      // Extract entities
      const extractedEntities = await this.extractEntities(allContent);
      
      // Add entities to graph
      for (const entity of extractedEntities) {
        try {
          const id = await this.addEntity(entity);
          results.entities.push({ ...entity, id });
        } catch (error) {
          results.errors.push(`Entity error: ${error.message}`);
        }
      }

      // Extract relationships
      if (this.config.extraction.extractRelationships) {
        const extractedRelationships = await this.extractRelationships(results.entities, allContent);
        
        // Add relationships to graph
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
   * Get graph statistics
   * @returns {Object} Graph statistics
   */
  getStats() {
    const typeCounts = {};
    for (const [type, ids] of this.entityIndex.entries()) {
      typeCounts[type] = ids.length;
    }

    const relationshipCounts = {};
    for (const rel of this.relationships) {
      relationshipCounts[rel.type] = (relationshipCounts[rel.type] || 0) + 1;
    }

    return {
      totalEntities: this.entities.size,
      totalRelationships: this.relationships.length,
      entityTypes: typeCounts,
      relationshipTypes: relationshipCounts,
      storageType: this.config.storage.type
    };
  }

  /**
   * Get subgraph around an entity
   * @param {string} entityId - Entity ID
   * @param {number} depth - Traversal depth
   * @returns {Object} Subgraph data
   */
  async getSubgraph(entityId, depth = 2) {
    const traversal = await this.traverseGraph(entityId, { maxDepth: depth, limit: 50 });
    
    const subgraph = {
      centralEntity: this.entities.get(entityId),
      entities: traversal,
      relationships: []
    };

    // Get relationships for all entities in traversal
    for (const entity of traversal) {
      const rels = this.getRelationships(entity.id);
      subgraph.relationships.push(...rels);
    }

    return subgraph;
  }

  /**
   * Find shortest path between two entities
   * @param {string} fromId - Starting entity ID
   * @param {string} toId - Target entity ID
   * @returns {Promise<Array|null>} Path or null if not found
   */
  async findPath(fromId, toId) {
    // BFS for shortest path
    const visited = new Set();
    const queue = [{ id: fromId, path: [] }];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (current.id === toId) {
        return current.path;
      }
      
      if (visited.has(current.id)) {
        continue;
      }
      
      visited.add(current.id);
      
      const rels = this.getRelationships(current.id, { direction: 'outgoing' });
      
      for (const rel of rels) {
        if (!visited.has(rel.to)) {
          queue.push({
            id: rel.to,
            path: [...current.path, { type: rel.type, to: rel.to }]
          });
        }
      }
    }

    return null;
  }

  /**
   * Delete entity and its relationships
   * @param {string} entityId - Entity ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEntity(entityId) {
    if (!this.entities.has(entityId)) {
      return false;
    }

    // Remove entity
    const entity = this.entities.get(entityId);
    this.entities.delete(entityId);

    // Remove from type index
    if (this.entityIndex.has(entity.type)) {
      const ids = this.entityIndex.get(entity.type);
      const index = ids.indexOf(entityId);
      if (index > -1) {
        ids.splice(index, 1);
      }
    }

    // Remove relationships
    this.relationships = this.relationships.filter(
      rel => rel.from !== entityId && rel.to !== entityId
    );

    // Rebuild relationship index
    this.rebuildRelationshipIndex();

    // Save changes
    await this.saveGraphData();

    return true;
  }

  /**
   * Update entity
   * @param {string} entityId - Entity ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object|null>} Updated entity or null
   */
  async updateEntity(entityId, updates) {
    const entity = this.entities.get(entityId);
    
    if (!entity) {
      return null;
    }

    const updated = {
      ...entity,
      ...updates,
      id: entityId,  // Preserve original ID
      updatedAt: Date.now()
    };

    this.entities.set(entityId, updated);
    await this.saveGraphData();

    return updated;
  }

  /**
   * Save state to disk
   */
  save() {
    try {
      const state = {
        entityCount: this.entities.size,
        relationshipCount: this.relationships.length,
        savedAt: Date.now()
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('[GraphRAG] Failed to save state:', err.message);
    }
  }

  /**
   * Load state from disk
   */
  load() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
        // State loaded via initialize() method
        console.log('[GraphRAG] State loaded, entities:', data.entityCount);
      }
    } catch (err) {
      console.error('[GraphRAG] Failed to load state:', err.message);
    }
  }

  /**
   * Close connections
   */
  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }

    this.save();
    this.initialized = false;
    console.log('[GraphRAG] Closed connections');
  }
}

/**
 * GraphRAG Factory - Create configured instances
 */
class GraphRAGFactory {
  /**
   * Create GraphRAG instance with configuration
   * @param {Object} config - Configuration options
   * @returns {Promise<GraphRAG>} Configured GraphRAG instance
   */
  static async create(config = {}) {
    const graphRAG = new GraphRAG(config);
    await graphRAG.initialize();
    return graphRAG;
  }

  /**
   * Create GraphRAG with vector store integration
   * @param {Object} vectorStore - VectorStore instance
   * @param {Object} config - Configuration options
   * @returns {Promise<GraphRAG>} Configured GraphRAG instance
   */
  static async createWithVectorStore(vectorStore, config = {}) {
    const graphRAG = new GraphRAG(config);
    graphRAG.setVectorStore(vectorStore);
    await graphRAG.initialize();
    return graphRAG;
  }
}

module.exports = {
  GraphRAG,
  GraphRAGFactory,
  RELATIONSHIP_TYPES,
  ENTITY_TYPES
};
