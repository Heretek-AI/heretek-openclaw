/**
 * Vector Store Module - Hybrid Hot/Cold Tiering
 * 
 * Provides dual-storage vector management with:
 * - Hot tier: DeepLake for fast recent memory access (1536-dim embeddings)
 * - Cold tier: pgvector for historical memory storage (768-dim embeddings)
 * 
 * Architecture:
 *   ┌─────────────────────────────────────────────────┐
 *   │              VectorStore API                    │
 *   │  ┌─────────────────┐   ┌─────────────────────┐  │
 *   │  │   Hot Tier      │   │    Cold Tier        │  │
 *   │  │   (DeepLake)    │   │    (pgvector)       │  │
 *   │  │   1536-dim      │   │    768-dim          │  │
 *   │  │   Recent memory │   │    Historical       │  │
 *   │  └────────┬────────┘   └──────────┬──────────┘  │
 *   │           │                       │             │
 *   └───────────┼───────────────────────┼─────────────┘
 *               │                       │
 *               ▼                       ▼
 *          [Fast Query]          [Batch Query]
 * 
 * Tiering Policy:
 * - Hot tier: memories < 24 hours old or accessed > 3 times in last 7 days
 * - Cold tier: historical memories >= 24 hours old
 * 
 * Usage:
 *   const vectorStore = new VectorStore();
 *   await vectorStore.storeEmbedding({ id, vector, metadata });
 *   const results = await vectorStore.search(queryVector, { topK: 10 });
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuration defaults
const DEFAULT_CONFIG = {
  // Hot tier (DeepLake)
  hotTier: {
    enabled: true,
    host: process.env.DEEPLAKE_HOST || 'http://localhost:8082',
    dimension: 1536,  // Multi-modal embeddings for images/audio
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    minAccessCount: 3,
    accessWindowDays: 7
  },
  
  // Cold tier (pgvector)
  coldTier: {
    enabled: true,
    host: process.env.PGHOST || process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'openclaw',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    dimension: 768,  // Standard text embeddings
    indexType: 'ivfflat',  // or 'hnsw' for faster queries
    lists: 100  // IVFFLAT parameter
  },
  
  // General settings
  tiering: {
    hotToColdAge: 24 * 60 * 60 * 1000, // Move to cold after 24 hours
    coldToHotAccessCount: 3, // Move to hot if accessed 3+ times in window
    hotAccessWindow: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

class VectorStore {
  /**
   * Create VectorStore instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config);
    this.hotStore = null;  // DeepLake store
    this.coldPool = null; // PostgreSQL pool
    this.initialized = false;
  }

  /**
   * Initialize storage backends
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize cold tier (pgvector)
      if (this.config.coldTier.enabled) {
        await this.initializeColdTier();
      }

      // Initialize hot tier (DeepLake)
      if (this.config.hotTier.enabled) {
        await this.initializeHotTier();
      }

      this.initialized = true;
      console.log('[VectorStore] Initialized with hot/cold tiering');
    } catch (error) {
      console.error('[VectorStore] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize pgvector cold tier
   * @returns {Promise<void>}
   */
  async initializeColdTier() {
    try {
      this.coldPool = new Pool({
        host: this.config.coldTier.host,
        port: this.config.coldTier.port,
        database: this.config.coldTier.database,
        user: this.config.coldTier.user,
        password: this.config.coldTier.password,
        max: 10,
        idleTimeoutMillis: 30000
      });

      // Test connection
      const client = await this.coldPool.connect();
      console.log('[VectorStore] Cold tier (pgvector) connected');

      // Ensure table exists with 768-dim vectors
      await this.createColdTable(client);
      client.release();
    } catch (error) {
      console.warn('[VectorStore] Cold tier initialization failed, will retry on use:', error.message);
      this.coldPool = null;
    }
  }

  /**
   * Create pgvector table with ivfflat index
   * @param {Object} client - PostgreSQL client
   */
  async createColdTable(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vector_memories (
        id VARCHAR(255) PRIMARY KEY,
        vector VECTOR(${this.config.coldTier.dimension}) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        last_accessed TIMESTAMP DEFAULT NOW(),
        access_count INTEGER DEFAULT 0,
        memory_type VARCHAR(50)
      )
    `);

    // Create index for faster searches
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_memories_idx 
      ON vector_memories USING ivfflat (vector vector_l2_ops)
      WITH (lists = ${this.config.coldTier.lists})
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_memories_access
      ON vector_memories (last_accessed)
    `);
  }

  /**
   * Initialize DeepLake hot tier (in-memory/file-based)
   * For production, replace with actual DeepLake client
   */
  async initializeHotTier() {
    // DeepLake hot store implementation
    // Using file-based storage with memory map for fast access
    const dataDir = path.join(__dirname, 'data', 'deeplake-hot');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.hotStore = {
      path: dataDir,
      dimension: this.config.hotTier.dimension,
      vectors: new Map(),      // id -> { vector, metadata, timestamp, accessCount }
      accessLog: new Map(),    // id -> [timestamps]
      initialized: true
    };

    // Load existing data
    await this.loadHotStore();

    console.log('[VectorStore] Hot tier (DeepLake) initialized');
  }

  /**
   * Load hot store from disk
   */
  async loadHotStore() {
    const stateFile = path.join(this.hotStore.path, 'hot-store.json');
    
    if (fs.existsSync(stateFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        this.hotStore.vectors = new Map(Object.entries(data.vectors || {}));
        this.hotStore.accessLog = new Map(Object.entries(data.accessLog || {}));
      } catch (error) {
        console.warn('[VectorStore] Failed to load hot store:', error.message);
      }
    }
  }

  /**
   * Save hot store to disk
   */
  async saveHotStore() {
    const stateFile = path.join(this.hotStore.path, 'hot-store.json');
    const data = {
      vectors: Object.fromEntries(this.hotStore.vectors),
      accessLog: Object.fromEntries(this.hotStore.accessLog),
      savedAt: Date.now()
    };
    fs.writeFileSync(stateFile, JSON.stringify(data, null, 2));
  }

  /**
   * Determine if memory should be in hot tier
   * @param {Object} memory - Memory object with metadata
   * @returns {boolean} True if should be in hot tier
   */
  shouldBeHot(memory) {
    const now = Date.now();
    const age = now - (memory.timestamp || now);
    const accessCount = memory.accessCount || 0;
    const accessWindow = this.config.tiering.hotAccessWindow;

    // Age-based check
    if (age < this.config.tiering.hotToColdAge) {
      return true;
    }

    // Access frequency check
    if (accessCount >= this.config.tiering.coldToHotAccessCount) {
      return true;
    }

    return false;
  }

  /**
   * Store embedding with automatic tier selection
   * @param {Object} options - { id, vector, metadata, memoryType }
   * @returns {Promise<string>} Memory ID
   */
  async storeEmbedding({ id, vector, metadata = {}, memoryType = 'generic' }) {
    if (!this.initialized) await this.initialize();

    const memoryId = id || `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const memoryData = {
      id: memoryId,
      vector,
      metadata,
      memoryType,
      timestamp,
      accessCount: 0,
      lastAccessed: timestamp
    };

    // Auto-tier based on current load and time
    const shouldHot = this.shouldBeHot(memoryData);

    if (shouldHot && this.hotStore) {
      await this.storeInHot(memoryData);
    } else if (this.coldPool) {
      await this.storeInCold(memoryData);
    } else if (this.hotStore) {
      // Fallback to hot if cold unavailable
      await this.storeInHot(memoryData);
    }

    return memoryId;
  }

  /**
   * Store in hot tier (DeepLake)
   * @param {Object} memoryData - Memory to store
   */
  async storeInHot(memoryData) {
    // Ensure vector dimension matches hot tier
    const hotVector = this.adjustVectorDimension(
      memoryData.vector, 
      this.config.hotTier.dimension
    );

    this.hotStore.vectors.set(memoryData.id, {
      vector: hotVector,
      metadata: memoryData.metadata,
      memoryType: memoryData.memoryType,
      timestamp: memoryData.timestamp,
      accessCount: 0,
      lastAccessed: Date.now()
    });

    this.hotStore.accessLog.set(memoryData.id, []);
    await this.saveHotStore();
  }

  /**
   * Store in cold tier (pgvector)
   * @param {Object} memoryData - Memory to store
   */
  async storeInCold(memoryData) {
    if (!this.coldPool) {
      throw new Error('Cold tier (pgvector) not available');
    }

    // Ensure vector dimension matches cold tier
    const coldVector = this.adjustVectorDimension(
      memoryData.vector,
      this.config.coldTier.dimension
    );

    const client = await this.coldPool.connect();
    try {
      await client.query(`
        INSERT INTO vector_memories (id, vector, metadata, memory_type, created_at, last_accessed, access_count)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), 0)
        ON CONFLICT (id) DO UPDATE SET
          vector = $2,
          metadata = $3,
          last_accessed = NOW()
      `, [memoryData.id, coldVector, JSON.stringify(memoryData.metadata), memoryData.memoryType]);
    } finally {
      client.release();
    }
  }

  /**
   * Adjust vector dimension (pad or truncate)
   * @param {number[]} vector - Input vector
   * @param {number} targetDim - Target dimension
   * @returns {number[]} Adjusted vector
   */
  adjustVectorDimension(vector, targetDim) {
    if (!vector || !Array.isArray(vector)) {
      return new Array(targetDim).fill(0);
    }

    if (vector.length === targetDim) {
      return vector;
    }

    if (vector.length > targetDim) {
      return vector.slice(0, targetDim);
    }

    // Pad with zeros
    return [...vector, ...new Array(targetDim - vector.length).fill(0)];
  }

  /**
   * Search for similar vectors
   * @param {number[]} queryVector - Query vector
   * @param {Object} options - { topK, threshold, hybridSearch }
   * @returns {Promise<Array>} Search results with scores
   */
  async search(queryVector, options = {}) {
    if (!this.initialized) await this.initialize();

    const { topK = 10, threshold = 0.7, hybridSearch = true } = options;

    const results = [];

    if (hybridSearch) {
      // Search both tiers and merge
      const [hotResults, coldResults] = await Promise.all([
        this.searchHot(queryVector, topK),
        this.searchCold(queryVector, topK)
      ]);

      // Merge and deduplicate results
      const mergedMap = new Map();

      for (const result of hotResults) {
        result.tier = 'hot';
        mergedMap.set(result.id, result);
      }

      for (const result of coldResults) {
        result.tier = 'cold';
        if (!mergedMap.has(result.id)) {
          mergedMap.set(result.id, result);
        }
      }

      results.push(...Array.from(mergedMap.values()));
    } else {
      // Search hot tier first, then cold if needed
      const hotResults = await this.searchHot(queryVector, topK);
      
      if (hotResults.length >= topK) {
        results.push(...hotResults);
      } else {
        const coldResults = await this.searchCold(queryVector, topK - hotResults.length);
        results.push(...hotResults, ...coldResults);
      }
    }

    // Sort by similarity and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Search hot tier (DeepLake)
   * @param {number[]} queryVector - Query vector
   * @param {number} topK - Number of results
   * @returns {Promise<Array>} Search results
   */
  async searchHot(queryVector, topK) {
    if (!this.hotStore || this.hotStore.vectors.size === 0) {
      return [];
    }

    const queryNorm = this.normalizeVector(queryVector);
    const results = [];

    for (const [id, data] of this.hotStore.vectors.entries()) {
      const similarity = this.cosineSimilarity(queryNorm, data.vector);
      
      if (similarity >= 0.0) {
        results.push({
          id,
          score: similarity,
          metadata: data.metadata,
          memoryType: data.memoryType,
          timestamp: data.timestamp
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Search cold tier (pgvector)
   * @param {number[]} queryVector - Query vector
   * @param {number} topK - Number of results
   * @returns {Promise<Array>} Search results
   */
  async searchCold(queryVector, topK) {
    if (!this.coldPool) {
      return [];
    }

    try {
      const coldVector = this.adjustVectorDimension(
        queryVector,
        this.config.coldTier.dimension
      );

      const client = await this.coldPool.connect();
      try {
        const result = await client.query(`
          SELECT id, vector, metadata, memory_type, created_at,
                 1 - (vector <=> $1::vector) as score
          FROM vector_memories
          ORDER BY vector <=> $1::vector
          LIMIT $2
        `, [coldVector, topK]);

        return result.rows.map(row => ({
          id: row.id,
          score: parseFloat(row.score),
          metadata: row.metadata,
          memoryType: row.memory_type,
          timestamp: new Date(row.created_at).getTime()
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[VectorStore] Cold search failed:', error.message);
      return [];
    }
  }

  /**
   * Normalize vector
   * @param {number[]} vector - Vector to normalize
   * @returns {number[]} Normalized vector
   */
  normalizeVector(vector) {
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      return [];
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;

    return vector.map(v => v / magnitude);
  }

  /**
   * Calculate cosine similarity
   * @param {number[]} a - Vector A
   * @param {number[]} b - Vector B
   * @returns {number} Similarity score
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Record memory access (for tiering decisions)
   * @param {string} memoryId - Memory ID
   */
  async recordAccess(memoryId) {
    if (!this.initialized) await this.initialize();

    // Update hot tier access
    if (this.hotStore && this.hotStore.vectors.has(memoryId)) {
      const data = this.hotStore.vectors.get(memoryId);
      data.accessCount++;
      data.lastAccessed = Date.now();

      // Update access log
      if (!this.hotStore.accessLog.has(memoryId)) {
        this.hotStore.accessLog.set(memoryId, []);
      }
      this.hotStore.accessLog.get(memoryId).push(Date.now());

      await this.saveHotStore();
    }

    // Update cold tier access
    if (this.coldPool) {
      const client = await this.coldPool.connect();
      try {
        await client.query(`
          UPDATE vector_memories
          SET last_accessed = NOW(),
              access_count = access_count + 1
          WHERE id = $1
        `, [memoryId]);
      } finally {
        client.release();
      }
    }
  }

  /**
   * Get memory by ID
   * @param {string} memoryId - Memory ID
   * @returns {Promise<Object|null>} Memory data or null
   */
  async getMemory(memoryId) {
    if (!this.initialized) await this.initialize();

    // Check hot tier first
    if (this.hotStore && this.hotStore.vectors.has(memoryId)) {
      await this.recordAccess(memoryId);
      return this.hotStore.vectors.get(memoryId);
    }

    // Check cold tier
    if (this.coldPool) {
      const client = await this.coldPool.connect();
      try {
        const result = await client.query(`
          SELECT id, vector, metadata, memory_type, created_at, access_count
          FROM vector_memories
          WHERE id = $1
        `, [memoryId]);

        if (result.rows.length > 0) {
          await this.recordAccess(memoryId);
          return result.rows[0];
        }
      } finally {
        client.release();
      }
    }

    return null;
  }

  /**
   * Delete memory
   * @param {string} memoryId - Memory ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteMemory(memoryId) {
    if (!this.initialized) await this.initialize();

    // Delete from hot tier
    if (this.hotStore) {
      this.hotStore.vectors.delete(memoryId);
      this.hotStore.accessLog.delete(memoryId);
      await this.saveHotStore();
    }

    // Delete from cold tier
    if (this.coldPool) {
      const client = await this.coldPool.connect();
      try {
        await client.query('DELETE FROM vector_memories WHERE id = $1', [memoryId]);
      } finally {
        client.release();
      }
    }

    return true;
  }

  /**
   * Migrate memories between tiers
   * @param {string} fromTier - Source tier ('hot' or 'cold')
   * @param {string} toTier - Target tier
   * @param {Object} criteria - Migration criteria
   * @returns {Promise<Object>} Migration results
   */
  async migrateTier(fromTier, toTier, criteria = {}) {
    const results = { migrated: 0, failed: 0, errors: [] };

    try {
      if (fromTier === 'hot' && toTier === 'cold') {
        // Migrate old hot memories to cold
        const now = Date.now();
        const threshold = this.config.tiering.hotToColdAge;

        for (const [id, data] of this.hotStore.vectors.entries()) {
          const age = now - data.timestamp;
          const shouldMigrate = criteria.force || age > threshold;

          if (shouldMigrate && data.accessCount < this.config.tiering.coldToHotAccessCount) {
            try {
              await this.storeInCold({
                id,
                vector: data.vector,
                metadata: data.metadata,
                memoryType: data.memoryType,
                timestamp: data.timestamp
              });

              this.hotStore.vectors.delete(id);
              this.hotStore.accessLog.delete(id);
              results.migrated++;
            } catch (error) {
              results.failed++;
              results.errors.push(`Failed to migrate ${id}: ${error.message}`);
            }
          }
        }

        await this.saveHotStore();
      } else if (fromTier === 'cold' && toTier === 'hot') {
        // Migrate frequently accessed cold memories to hot
        if (!this.coldPool) {
          throw new Error('Cold tier not available');
        }

        const client = await this.coldPool.connect();
        try {
          const result = await client.query(`
            SELECT id, vector, metadata, memory_type, created_at, access_count
            FROM vector_memories
            WHERE access_count >= $1
          `, [this.config.tiering.coldToHotAccessCount]);

          for (const row of result.rows) {
            try {
              await this.storeInHot({
                id: row.id,
                vector: row.vector,
                metadata: row.metadata,
                memoryType: row.memory_type,
                timestamp: new Date(row.created_at).getTime()
              });

              await client.query('DELETE FROM vector_memories WHERE id = $1', [row.id]);
              results.migrated++;
            } catch (error) {
              results.failed++;
              results.errors.push(`Failed to migrate ${row.id}: ${error.message}`);
            }
          }
        } finally {
          client.release();
        }
      }
    } catch (error) {
      results.errors.push(`Migration failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Get store statistics
   * @returns {Promise<Object>} Store statistics
   */
  async getStats() {
    const stats = {
      hotTier: {
        enabled: this.config.hotTier.enabled,
        count: this.hotStore ? this.hotStore.vectors.size : 0,
        dimension: this.config.hotTier.dimension
      },
      coldTier: {
        enabled: this.config.coldTier.enabled,
        dimension: this.config.coldTier.dimension
      }
    };

    if (this.coldPool) {
      try {
        const client = await this.coldPool.connect();
        try {
          const result = await client.query('SELECT COUNT(*) FROM vector_memories');
          stats.coldTier.count = parseInt(result.rows[0].count);
        } finally {
          client.release();
        }
      } catch (error) {
        stats.coldTier.error = error.message;
      }
    }

    return stats;
  }

  /**
   * Close connections
   */
  async close() {
    if (this.coldPool) {
      await this.coldPool.end();
      this.coldPool = null;
    }

    if (this.hotStore) {
      await this.saveHotStore();
    }

    this.initialized = false;
    console.log('[VectorStore] Closed connections');
  }
}

/**
 * Migration utility for existing pgvector data
 */
class VectorStoreMigration {
  /**
   * Create migration utility
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.sourcePool = new Pool({
      host: config.sourceHost || process.env.PGHOST || 'localhost',
      port: config.sourcePort || process.env.PGPORT || 5432,
      database: config.sourceDatabase || process.env.PGDATABASE || 'openclaw',
      user: config.sourceUser || process.env.PGUSER || 'postgres',
      password: config.sourcePassword || process.env.PGPASSWORD || ''
    });

    this.targetStore = new VectorStore(config.targetConfig);
  }

  /**
   * Migrate all memories from pgvector to hybrid store
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration results
   */
  async migrateAll(options = {}) {
    const { batchSize = 100, hotThreshold = 24 * 60 * 60 * 1000 } = options;
    const results = {
      total: 0,
      migrated: 0,
      failed: 0,
      hot: 0,
      cold: 0,
      errors: []
    };

    await this.targetStore.initialize();

    const client = await this.sourcePool.connect();
    try {
      // Get total count
      const countResult = await client.query('SELECT COUNT(*) FROM vector_memories');
      results.total = parseInt(countResult.rows[0].count);

      // Migrate in batches
      let offset = 0;
      while (offset < results.total) {
        const batch = await client.query(`
          SELECT id, vector, metadata, memory_type, created_at, access_count, last_accessed
          FROM vector_memories
          ORDER BY created_at
          LIMIT $1 OFFSET $2
        `, [batchSize, offset]);

        for (const row of batch.rows) {
          try {
            const now = Date.now();
            const age = now - new Date(row.created_at).getTime();
            const shouldBeHot = age < hotThreshold && row.access_count >= 3;

            await this.targetStore.storeEmbedding({
              id: row.id,
              vector: row.vector,
              metadata: row.metadata,
              memoryType: row.memory_type
            });

            if (shouldBeHot) {
              results.hot++;
            } else {
              results.cold++;
            }
            results.migrated++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed: ${row.id} - ${error.message}`);
          }
        }

        offset += batchSize;
        console.log(`[Migration] Progress: ${results.migrated}/${results.total}`);
      }
    } finally {
      client.release();
    }

    return results;
  }

  /**
   * Verify migration integrity
   * @returns {Promise<Object>} Verification results
   */
  async verify() {
    const results = {
      sourceCount: 0,
      targetCount: 0,
      missing: [],
      dimension: null
    };

    // Count source
    const client = await this.sourcePool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) FROM vector_memories');
      results.sourceCount = parseInt(result.rows[0].count);
    } finally {
      client.release();
    }

    // Count target
    const stats = await this.targetStore.getStats();
    results.targetCount = stats.hotTier.count + stats.coldTier.count;

    // Check for missing
    if (results.sourceCount !== results.targetCount) {
      results.missingCount = results.sourceCount - results.targetCount;
    }

    return results;
  }

  /**
   * Close connections
   */
  async close() {
    await this.sourcePool.end();
    await this.targetStore.close();
  }
}

module.exports = {
  VectorStore,
  VectorStoreMigration
};