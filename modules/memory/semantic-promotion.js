#!/usr/bin/env node
/**
 * Semantic Knowledge Promotion Pipeline
 * 
 * Implements automatic promotion of frequent episodic memories to semantic knowledge.
 * Features:
 * - Knowledge abstraction pipelines
 * - Forgetting curves for memory decay
 * - Schema formation from related memories
 * - Integration with GraphRAG for relationship mapping
 * 
 * Usage:
 *   const promoter = new SemanticPromotion();
 *   await promoter.initialize();
 *   await promoter.processEpisodicMemories();
 */

const fs = require('fs');
const path = require('path');

// Try to load required dependencies
let neo4jDriver = null;
try {
  neo4jDriver = require('neo4j-driver');
} catch (e) {
  console.warn('[SemanticPromotion] neo4j-driver not available');
}

class SemanticPromotion {
  /**
   * Create SemanticPromotion instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = Object.assign({
      // Promotion thresholds
      promotionThreshold: 0.7,
      minMentions: 3,
      minAccessCount: 5,
      minImportance: 0.6,
      
      // Abstraction settings
      abstractionLevels: ['specific', 'general', 'abstract', 'schema'],
      maxAbstractionDepth: 3,
      
      // Forgetting curve parameters
      forgettingCurve: {
        baseDecay: 0.05,        // Decay rate per day
        importanceModifier: 0.5, // High importance reduces decay
        consolidationBoost: 1.3  // Sleep consolidation boost
      },
      
      // Schema formation
      schema: {
        minRelatedMemories: 5,
        similarityThreshold: 0.6,
        abstractionWeight: 0.7
      },
      
      // Storage paths
      dataDir: path.join(__dirname, 'data', 'semantic'),
      stateFile: path.join(__dirname, 'state', 'semantic-promotion-state.json')
    }, config);
    
    // Memory stores
    this.episodicMemories = new Map();
    this.semanticMemories = new Map();
    this.schemas = new Map();
    
    // Promotion queue
    this.promotionQueue = [];
    this.processingLock = false;
    
    // Statistics
    this.stats = {
      totalPromotions: 0,
      totalAbstractions: 0,
      totalSchemasFormed: 0,
      lastPromotionCycle: null,
      memoriesDecayed: 0
    };
    
    // Neo4j session (optional)
    this.neo4jSession = null;
    
    // State
    this.initialized = false;
  }

  /**
   * Initialize the semantic promotion system
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure directories exist
      this.ensureDirectories();
      
      // Load persisted state
      await this.loadState();
      
      // Initialize Neo4j if available
      if (neo4jDriver) {
        await this.initializeNeo4j();
      }
      
      // Load episodic memories from consolidation module
      await this.loadEpisodicMemories();
      
      this.initialized = true;
      console.log('[SemanticPromotion] Initialized with', this.episodicMemories.size, 'episodic memories');
    } catch (error) {
      console.error('[SemanticPromotion] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Ensure data directories exist
   */
  ensureDirectories() {
    const dirs = [
      this.config.dataDir,
      path.dirname(this.config.stateFile)
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Initialize Neo4j connection
   * @returns {Promise<void>}
   */
  async initializeNeo4j() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    
    try {
      const driver = neo4jDriver.driver(uri, neo4jDriver.auth.basic(user, password));
      this.neo4jSession = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
      
      // Test connection
      await this.neo4jSession.run('RETURN 1');
      console.log('[SemanticPromotion] Neo4j connected');
    } catch (error) {
      console.warn('[SemanticPromotion] Neo4j connection failed:', error.message);
      this.neo4jSession = null;
    }
  }

  /**
   * Load episodic memories from consolidation module
   * @returns {Promise<void>}
   */
  async loadEpisodicMemories() {
    const consolidationStateFile = path.join(__dirname, 'state', 'consolidation-state.json');
    
    if (fs.existsSync(consolidationStateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(consolidationStateFile, 'utf8'));
        
        // Load episodic memories
        if (state.episodicMemory) {
          for (const [id, memory] of state.episodicMemory) {
            this.episodicMemories.set(id, {
              ...memory,
              tier: 'episodic',
              promotionScore: this.calculatePromotionScore(memory)
            });
          }
        }
        
        // Load semantic memories
        if (state.semanticMemory) {
          for (const [id, memory] of state.semanticMemory) {
            this.semanticMemories.set(id, {
              ...memory,
              tier: 'semantic'
            });
          }
        }
        
        console.log('[SemanticPromotion] Loaded', this.episodicMemories.size, 'episodic,', this.semanticMemories.size, 'semantic memories');
      } catch (error) {
        console.warn('[SemanticPromotion] Failed to load consolidation state:', error.message);
      }
    }
  }

  /**
   * Load persisted state
   * @returns {Promise<void>}
   */
  async loadState() {
    if (fs.existsSync(this.config.stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(this.config.stateFile, 'utf8'));
        this.stats = { ...this.stats, ...state.stats };
        
        // Load schemas
        if (state.schemas) {
          for (const [id, schema] of Object.entries(state.schemas)) {
            this.schemas.set(id, schema);
          }
        }
        
        console.log('[SemanticPromotion] State loaded');
      } catch (error) {
        console.warn('[SemanticPromotion] Failed to load state:', error.message);
      }
    }
  }

  /**
   * Save state to disk
   */
  saveState() {
    try {
      const state = {
        stats: this.stats,
        schemas: Object.fromEntries(this.schemas),
        lastSaved: Date.now()
      };
      
      fs.writeFileSync(this.config.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('[SemanticPromotion] Failed to save state:', error.message);
    }
  }

  /**
   * Calculate promotion score for an episodic memory
   * @param {Object} memory - Memory to evaluate
   * @returns {number} Promotion score (0-1)
   */
  calculatePromotionScore(memory) {
    if (!memory) return 0;
    
    const now = Date.now();
    const ageHours = (now - (memory.timestamp || now)) / (1000 * 60 * 60);
    
    // Factor 1: Access frequency
    const accessScore = Math.min(1, (memory.accessCount || 0) / this.config.minAccessCount);
    
    // Factor 2: Importance
    const importanceScore = memory.importance || 0.5;
    
    // Factor 3: Recency (recent memories get slight boost)
    const recencyScore = Math.exp(-ageHours / 168); // 1 week half-life
    
    // Factor 4: Conceptual richness
    const conceptCount = (memory.concepts?.length || 0) + (memory.entities?.length || 0);
    const richnessScore = Math.min(1, conceptCount / 10);
    
    // Weighted combination
    const score = 
      accessScore * 0.3 +
      importanceScore * 0.3 +
      recencyScore * 0.2 +
      richnessScore * 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate forgetting curve retention
   * @param {Object} memory - Memory object
   * @returns {number} Retention score (0-1)
   */
  calculateRetention(memory) {
    const now = Date.now();
    const ageDays = (now - (memory.timestamp || now)) / (1000 * 60 * 60 * 24);
    
    const { baseDecay, importanceModifier, consolidationBoost } = this.config.forgettingCurve;
    
    // Base decay
    let decay = baseDecay;
    
    // Reduce decay for important memories
    if (memory.importance > 0.7) {
      decay *= importanceModifier;
    }
    
    // Boost for consolidated memories
    if (memory.lastConsolidation) {
      decay /= consolidationBoost;
    }
    
    // Exponential decay
    const retention = Math.exp(-decay * ageDays);
    
    return Math.max(0, Math.min(1, retention));
  }

  /**
   * Check if memory should be promoted
   * @param {Object} memory - Memory to check
   * @returns {boolean} True if should be promoted
   */
  shouldPromote(memory) {
    const score = this.calculatePromotionScore(memory);
    const retention = this.calculateRetention(memory);
    
    return score >= this.config.promotionThreshold && retention > 0.3;
  }

  /**
   * Extract semantic content from episodic memory
   * @param {Object} episodicMemory - Source episodic memory
   * @returns {Object} Extracted semantic content
   */
  extractSemanticContent(episodicMemory) {
    const content = episodicMemory.content || '';
    
    // Extract key concepts (words appearing multiple times or capitalized)
    const words = content.toLowerCase().split(/\s+/);
    const wordFrequency = {};
    
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, '');
      if (clean.length > 3) {
        wordFrequency[clean] = (wordFrequency[clean] || 0) + 1;
      }
    }
    
    // Filter to significant concepts
    const concepts = Object.entries(wordFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([word]) => word);
    
    // Extract entities (capitalized phrases)
    const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    const entities = [];
    let match;
    
    while ((match = entityPattern.exec(content)) !== null) {
      entities.push(match[1]);
    }
    
    // Generate abstract summary
    const summary = this.generateAbstractSummary(episodicMemory, concepts);
    
    return {
      concepts: concepts.slice(0, 20),
      entities: [...new Set(entities)].slice(0, 10),
      summary,
      keywords: concepts.slice(0, 5),
      category: this.categorizeMemory(episodicMemory, concepts)
    };
  }

  /**
   * Generate abstract summary from episodic memory
   * @param {Object} memory - Source memory
   * @param {Array} concepts - Extracted concepts
   * @returns {string} Abstract summary
   */
  generateAbstractSummary(memory, concepts) {
    // Simple abstraction: extract the most common concepts into a summary
    const topConcepts = concepts.slice(0, 5);
    
    if (topConcepts.length === 0) {
      return memory.content?.substring(0, 100) || '';
    }
    
    // Create a generalized statement
    const template = `Knowledge about: ${topConcepts.join(', ')}`;
    
    return template;
  }

  /**
   * Categorize memory based on content
   * @param {Object} memory - Memory to categorize
   * @param {Array} concepts - Extracted concepts
   * @returns {string} Category
   */
  categorizeMemory(memory, concepts) {
    const categories = {
      technical: ['code', 'function', 'api', 'system', 'software', 'programming'],
      personal: ['preference', 'like', 'dislike', 'habit', 'routine'],
      procedural: ['step', 'process', 'method', 'procedure', 'algorithm'],
      factual: ['fact', 'information', 'data', 'knowledge', 'definition'],
      social: ['person', 'user', 'team', 'conversation', 'discussion']
    };
    
    const conceptStr = concepts.join(' ').toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(k => conceptStr.includes(k));
      if (matches.length >= 2) {
        return category;
      }
    }
    
    return 'general';
  }

  /**
   * Promote episodic memory to semantic memory
   * @param {Object} episodicMemory - Memory to promote
   * @returns {Object|null} Promoted semantic memory or null
   */
  promoteToSemantic(episodicMemory) {
    if (!this.shouldPromote(episodicMemory)) {
      return null;
    }
    
    const semanticId = `sem-${episodicMemory.id}`;
    const semanticContent = this.extractSemanticContent(episodicMemory);
    
    const semanticMemory = {
      id: semanticId,
      originalId: episodicMemory.id,
      timestamp: Date.now(),
      originalTimestamp: episodicMemory.timestamp,
      content: semanticContent.summary,
      concepts: semanticContent.concepts,
      entities: semanticContent.entities,
      category: semanticContent.category,
      keywords: semanticContent.keywords,
      importance: episodicMemory.importance,
      abstractionLevel: 1,
      sourceMemories: [episodicMemory.id],
      promotionScore: episodicMemory.promotionScore,
      metadata: episodicMemory.metadata || {}
    };
    
    // Store in semantic memory
    this.semanticMemories.set(semanticId, semanticMemory);
    
    // Remove from episodic (or mark as promoted)
    episodicMemory.promoted = true;
    episodicMemory.semanticId = semanticId;
    
    this.stats.totalPromotions++;
    
    console.log('[SemanticPromotion] Promoted memory', episodicMemory.id, 'to semantic');
    
    return semanticMemory;
  }

  /**
   * Find related memories for schema formation
   * @param {string} concept - Concept to find related memories for
   * @returns {Array} Related memories
   */
  findRelatedMemories(concept) {
    const related = [];
    const lowerConcept = concept.toLowerCase();
    
    // Search semantic memories
    for (const [id, memory] of this.semanticMemories.entries()) {
      if (memory.concepts?.some(c => c.toLowerCase().includes(lowerConcept))) {
        related.push({ id, memory, type: 'semantic' });
      }
    }
    
    // Search episodic memories
    for (const [id, memory] of this.episodicMemories.entries()) {
      if (memory.concepts?.some(c => c.toLowerCase().includes(lowerConcept))) {
        related.push({ id, memory, type: 'episodic' });
      }
    }
    
    return related;
  }

  /**
   * Form schema from related memories
   * @param {string} concept - Central concept for schema
   * @returns {Object|null} Formed schema or null
   */
  formSchema(concept) {
    const related = this.findRelatedMemories(concept);
    
    if (related.length < this.config.schema.minRelatedMemories) {
      return null;
    }
    
    const schemaId = `schema-${concept.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Extract common patterns
    const allConcepts = related.flatMap(r => r.memory.concepts || []);
    const conceptFrequency = {};
    
    for (const c of allConcepts) {
      conceptFrequency[c.toLowerCase()] = (conceptFrequency[c.toLowerCase()] || 0) + 1;
    }
    
    // Find core concepts (appearing in multiple memories)
    const coreConcepts = Object.entries(conceptFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([concept]) => concept);
    
    // Create schema
    const schema = {
      id: schemaId,
      centralConcept: concept,
      coreConcepts,
      relatedMemoryIds: related.map(r => r.id),
      abstractionLevel: 2,
      formedAt: Date.now(),
      lastUpdated: Date.now(),
      confidence: coreConcepts.length / allConcepts.length,
      summary: `Schema for ${concept}: ${coreConcepts.slice(0, 10).join(', ')}`
    };
    
    this.schemas.set(schemaId, schema);
    this.stats.totalSchemasFormed++;
    
    console.log('[SemanticPromotion] Formed schema for', concept);
    
    return schema;
  }

  /**
   * Apply abstraction to semantic memory
   * @param {Object} semanticMemory - Memory to abstract
   * @param {number} level - Abstraction level
   * @returns {Object} Abstracted memory
   */
  applyAbstraction(semanticMemory, level = 1) {
    if (!semanticMemory || level > this.config.maxAbstractionDepth) {
      return semanticMemory;
    }
    
    const abstractedId = `${semanticMemory.id}-abs-${level}`;
    
    // Higher abstraction = fewer, more general concepts
    const abstractionFactor = 0.7 ** level;
    const maxConcepts = Math.max(3, Math.floor(semanticMemory.concepts?.length * abstractionFactor) || 3);
    
    const abstracted = {
      ...semanticMemory,
      id: abstractedId,
      parentMemory: semanticMemory.id,
      abstractionLevel: (semanticMemory.abstractionLevel || 1) + level,
      concepts: semanticMemory.concepts?.slice(0, maxConcepts) || [],
      summary: this.generateHigherAbstraction(semanticMemory, level)
    };
    
    this.stats.totalAbstractions++;
    
    return abstracted;
  }

  /**
   * Generate higher-level abstraction
   * @param {Object} memory - Source memory
   * @param {number} level - Abstraction level
   * @returns {string} Higher abstraction summary
   */
  generateHigherAbstraction(memory, level) {
    const concepts = memory.concepts?.slice(0, 5 - level) || [];
    
    if (concepts.length === 0) {
      return memory.summary || '';
    }
    
    return `Abstract knowledge: ${concepts.join(' → ')}`;
  }

  /**
   * Process all episodic memories for promotion
   * @returns {Promise<Object>} Processing results
   */
  async processEpisodicMemories() {
    if (this.processingLock) {
      return { processed: 0, promoted: 0, skipped: 0 };
    }
    
    this.processingLock = true;
    const results = {
      processed: 0,
      promoted: 0,
      skipped: 0,
      decayed: 0,
      errors: []
    };
    
    try {
      for (const [id, memory] of this.episodicMemories.entries()) {
        results.processed++;
        
        try {
          // Check retention
          const retention = this.calculateRetention(memory);
          
          if (retention < 0.2) {
            // Memory has decayed significantly
            results.decayed++;
            this.stats.memoriesDecayed++;
            continue;
          }
          
          // Check promotion eligibility
          if (this.shouldPromote(memory) && !memory.promoted) {
            const promoted = this.promoteToSemantic(memory);
            if (promoted) {
              results.promoted++;
              
              // Try to form schemas from promoted concepts
              for (const concept of promoted.keywords || []) {
                this.formSchema(concept);
              }
            }
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push(`Error processing ${id}: ${error.message}`);
        }
      }
      
      this.stats.lastPromotionCycle = Date.now();
      this.saveState();
      
      console.log('[SemanticPromotion] Processed', results.processed, 'memories:', 
        results.promoted, 'promoted,', results.decayed, 'decayed');
      
    } finally {
      this.processingLock = false;
    }
    
    return results;
  }

  /**
   * Apply forgetting decay to all memories
   * @returns {Object} Decay results
   */
  applyForgettingDecay() {
    const results = {
      episodicDecayed: 0,
      semanticDecayed: 0,
      removed: 0
    };
    
    // Decay episodic memories
    for (const [id, memory] of this.episodicMemories.entries()) {
      const retention = this.calculateRetention(memory);
      
      if (retention < 0.1) {
        // Remove completely forgotten memories
        this.episodicMemories.delete(id);
        results.removed++;
      } else if (retention < 0.5) {
        memory.importance = (memory.importance || 0.5) * 0.9;
        results.episodicDecayed++;
      }
    }
    
    // Decay semantic memories (slower rate)
    for (const [id, memory] of this.semanticMemories.entries()) {
      const retention = this.calculateRetention(memory);
      
      if (retention < 0.3) {
        memory.importance = (memory.importance || 0.5) * 0.95;
        results.semanticDecayed++;
      }
    }
    
    return results;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      episodicCount: this.episodicMemories.size,
      semanticCount: this.semanticMemories.size,
      schemaCount: this.schemas.size,
      ...this.stats
    };
  }

  /**
   * Close and cleanup
   * @returns {Promise<void>}
   */
  async close() {
    this.saveState();
    
    if (this.neo4jSession) {
      await this.neo4jSession.close();
      this.neo4jSession = null;
    }
    
    this.initialized = false;
    console.log('[SemanticPromotion] Closed');
  }
}

/**
 * Factory for creating SemanticPromotion instances
 */
class SemanticPromotionFactory {
  static async create(config = {}) {
    const promoter = new SemanticPromotion(config);
    await promoter.initialize();
    return promoter;
  }
}

module.exports = {
  SemanticPromotion,
  SemanticPromotionFactory
};
