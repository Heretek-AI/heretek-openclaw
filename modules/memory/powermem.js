#!/usr/bin/env node
/**
 * PowerMem - Cognitive Memory with Ebbinghaus Forgetting Curves
 * ===============================================================
 * 
 * Implements PowerMem cognitive memory system inspired by Oceanbase/powermem
 * with Ebbinghaus forgetting curve for natural memory decay.
 * 
 * Key Features:
 * - Ebbinghaus forgetting curve for memory decay scheduling
 * - Memory stability and retrievability scoring
 * - Spaced repetition for important memories
 * - Cognitive load management
 * 
 * Ebbinghaus Formula: R = e^(-t/S) where:
 *   R = retrievability (0-1)
 *   t = time since last review
 *   S = stability (how well memory is encoded)
 * 
 * Usage:
 *   const powerMem = require('./modules/memory/powermem.js');
 *   await powerMem.store({ key: 'task', content: '...', importance: 0.8 });
 *   const memory = await powerMem.recall('task');
 */

const fs = require('fs');
const path = require('path');

// Try to load Redis
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  console.warn('[PowerMem] ioredis not available, using local storage');
}

// Try to load pgvector
let Pool;
try {
  Pool = require('pg').Pool;
} catch (e) {
  console.warn('[PowerMem] pg not available');
}

// Configuration
const CONFIG = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  pgConfig: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'heretek',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || ''
  },
  
  // Ebbinghaus forgetting curve parameters
  forgettingCurve: {
    initialStability: 0.1,      // Initial stability (S) for new memories
    minStability: 0.01,        // Minimum stability before decay
    maxStability: 10,           // Maximum stability cap
    decayRate: 0.05,           // Base decay rate per hour
    reviewBoost: 2.0,           // Multiplier for successful review
    failedReviewPenalty: 0.5,    // Multiplier for failed review
    optimalIntervalBase: 1.0    // Base for optimal review intervals (hours)
  },
  
  // Memory tiers based on importance
  tiers: {
    critical: { stability: 5.0, reviewInterval: 24, maxAge: 365 * 24 },      // 1 year
    important: { stability: 2.0, reviewInterval: 12, maxAge: 90 * 24 },       // 90 days
    normal: { stability: 0.5, reviewInterval: 6, maxAge: 30 * 24 },          // 30 days
    transient: { stability: 0.1, reviewInterval: 1, maxAge: 24 }             // 24 hours
  },
  
  // Cognitive load limits
  cognitiveLoad: {
    maxActiveMemories: 1000,
    maxRetrievalTime: 100, // ms
    batchRecallSize: 50
  }
};

// Ebbinghaus forgetting curve calculation
class ForgettingCurve {
  /**
   * Calculate retrievability based on time and stability
   * R = e^(-t/S) where t = time in hours, S = stability
   */
  static calculateRetrievability(timeHours, stability) {
    if (stability <= 0) return 0;
    return Math.exp(-timeHours / stability);
  }
  
  /**
   * Calculate optimal review interval based on current stability
   * Uses spaced repetition algorithm
   */
  static optimalInterval(currentStability, successRate = 0.8) {
    const base = CONFIG.forgettingCurve.optimalIntervalBase;
    // Higher stability = longer intervals
    return base * Math.pow(2, currentStability) * successRate;
  }
  
  /**
   * Update stability after review
   */
  static updateStability(currentStability, wasSuccessful) {
    const { reviewBoost, failedReviewPenalty } = CONFIG.forgettingCurve;
    
    if (wasSuccessful) {
      return Math.min(currentStability * reviewBoost, CONFIG.forgettingCurve.maxStability);
    } else {
      return Math.max(currentStability * failedReviewPenalty, CONFIG.forgettingCurve.minStability);
    }
  }
  
  /**
   * Get decay factor based on time since last access
   */
  static getDecayFactor(timeHours, stability) {
    const retrievability = this.calculateRetrievability(timeHours, stability);
    return 1 - retrievability;
  }
}

// Memory item structure
class MemoryItem {
  constructor(key, content, metadata = {}) {
    this.key = key;
    this.content = content;
    this.metadata = metadata;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.reviewCount = 0;
    this.lastReviewAt = null;
    this.stability = metadata.stability || CONFIG.forgettingCurve.initialStability;
    this.tier = metadata.tier || 'normal';
    this.importance = metadata.importance || 0.5;
    this.embedding = metadata.embedding || null;
  }
  
  /**
   * Calculate current retrievability
   */
  getRetrievability() {
    const timeHours = (Date.now() - this.lastReviewAt || this.createdAt) / (1000 * 60 * 60);
    return ForgettingCurve.calculateRetrievability(timeHours, this.stability);
  }
  
  /**
   * Check if memory needs review
   */
  needsReview() {
    const retrievability = this.getRetrievability();
    const tierConfig = CONFIG.tiers[this.tier] || CONFIG.tiers.normal;
    
    // Time-based check
    const hoursSinceReview = (Date.now() - (this.lastReviewAt || this.createdAt)) / (1000 * 60 * 60);
    const needsTimeReview = hoursSinceReview >= tierConfig.reviewInterval;
    
    // Retrievability-based check (below threshold)
    const needsRetrievabilityReview = retrievability < 0.5;
    
    return needsTimeReview || needsRetrievabilityReview;
  }
  
  /**
   * Mark successful review
   */
  successfulReview() {
    this.stability = ForgettingCurve.updateStability(this.stability, true);
    this.lastReviewAt = Date.now();
    this.lastAccessed = Date.now();
    this.reviewCount++;
  }
  
  /**
   * Mark failed review
   */
  failedReview() {
    this.stability = ForgettingCurve.updateStability(this.stability, false);
    this.lastReviewAt = Date.now();
    this.reviewCount++;
  }
  
  toJSON() {
    return {
      key: this.key,
      content: this.content,
      metadata: this.metadata,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      reviewCount: this.reviewCount,
      lastReviewAt: this.lastReviewAt,
      stability: this.stability,
      tier: this.tier,
      importance: this.importance,
      retrievability: this.getRetrievability()
    };
  }
}

// PowerMem main class
class PowerMem {
  constructor(agentId = 'default') {
    this.agentId = agentId;
    this.redis = null;
    this.pgPool = null;
    this.localStore = new Map();
    this.recallQueue = [];
    this.initialized = false;
  }
  
  /**
   * Initialize Redis and PostgreSQL connections
   */
  async initialize() {
    if (this.initialized) return;
    
    // Initialize Redis
    if (Redis) {
      try {
        this.redis = new Redis(CONFIG.redisUrl, {
          retryStrategy: (times) => Math.min(times * 200, 2000)
        });
        await this.redis.ping();
        console.log('[PowerMem] Redis connected');
      } catch (e) {
        console.warn('[PowerMem] Redis unavailable, using local storage');
      }
    }
    
    // Initialize PostgreSQL
    if (Pool) {
      try {
        this.pgPool = new Pool(CONFIG.pgConfig);
        await this.pgPool.query('SELECT 1');
        console.log('[PowerMem] PostgreSQL connected');
        
        // Create tables
        await this.createTables();
      } catch (e) {
        console.warn('[PowerMem] PostgreSQL unavailable:', e.message);
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Create PostgreSQL tables for PowerMem
   */
  async createTables() {
    if (!this.pgPool) return;
    
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS powermem_memories (
        id SERIAL PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        memory_key VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        stability FLOAT DEFAULT 0.1,
        tier VARCHAR(20) DEFAULT 'normal',
        importance FLOAT DEFAULT 0.5,
        embedding VECTOR(768),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_reviewed_at TIMESTAMP,
        review_count INTEGER DEFAULT 0,
        UNIQUE(agent_id, memory_key)
      );
      
      CREATE INDEX IF NOT EXISTS idx_powermem_agent ON powermem_memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_powermem_key ON powermem_memories(agent_id, memory_key);
      CREATE INDEX IF NOT EXISTS idx_powermem_stability ON powermem_memories(stability);
    `);
  }
  
  /**
   * Store a memory with Ebbinghaus decay scheduling
   */
  async store(key, content, metadata = {}) {
    await this.initialize();
    
    const memory = new MemoryItem(key, content, {
      ...metadata,
      tier: metadata.tier || this.determineTier(metadata.importance || 0.5),
      stability: metadata.stability || this.getInitialStability(metadata.importance || 0.5)
    });
    
    // Store in Redis
    if (this.redis) {
      const memoryKey = `powermem:${this.agentId}:${key}`;
      await this.redis.set(memoryKey, JSON.stringify(memory.toJSON()), 'EX', 86400);
    }
    
    // Store in PostgreSQL
    if (this.pgPool) {
      await this.pgPool.query(`
        INSERT INTO powermem_memories 
        (agent_id, memory_key, content, metadata, stability, tier, importance, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (agent_id, memory_key) DO UPDATE SET
          content = $3,
          metadata = $4,
          stability = $5,
          last_accessed = CURRENT_TIMESTAMP
      `, [
        this.agentId,
        key,
        content,
        JSON.stringify(metadata),
        memory.stability,
        memory.tier,
        memory.importance,
        metadata.embedding || null
      ]);
    }
    
    // Local fallback
    this.localStore.set(key, memory);
    
    return memory.toJSON();
  }
  
  /**
   * Recall a memory with retrievability calculation
   */
  async recall(key) {
    await this.initialize();
    
    let memory = null;
    
    // Try Redis first
    if (this.redis) {
      const data = await this.redis.get(`powermem:${this.agentId}:${key}`);
      if (data) {
        memory = JSON.parse(data);
      }
    }
    
    // Try PostgreSQL
    if (!memory && this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT * FROM powermem_memories WHERE agent_id = $1 AND memory_key = $2',
        [this.agentId, key]
      );
      if (result.rows.length > 0) {
        memory = result.rows[0];
      }
    }
    
    // Try local store
    if (!memory) {
      memory = this.localStore.get(key);
    }
    
    if (!memory) {
      return null;
    }
    
    // Calculate current retrievability
    const timeHours = (Date.now() - (memory.lastAccessed || memory.createdAt)) / (1000 * 60 * 60);
    const retrievability = ForgettingCurve.calculateRetrievability(timeHours, memory.stability || 0.1);
    
    // Update last accessed
    memory.lastAccessed = Date.now();
    
    return {
      ...memory,
      retrievability,
      needsReview: retrievability < 0.5
    };
  }
  
  /**
   * Batch recall for cognitive load management
   */
  async batchRecall(keys) {
    const results = [];
    for (const key of keys.slice(0, CONFIG.cognitiveLoad.batchRecallSize)) {
      const memory = await this.recall(key);
      if (memory) {
        results.push(memory);
      }
    }
    return results;
  }
  
  /**
   * Review a memory and update stability
   */
  async review(key, wasSuccessful) {
    await this.initialize();
    
    if (wasSuccessful) {
      // Update in Redis
      if (this.redis) {
        const data = await this.redis.get(`powermem:${this.agentId}:${key}`);
        if (data) {
          const memory = JSON.parse(data);
          memory.stability = ForgettingCurve.updateStability(memory.stability, true);
          memory.lastReviewAt = Date.now();
          memory.reviewCount = (memory.reviewCount || 0) + 1;
          await this.redis.set(`powermem:${this.agentId}:${key}`, JSON.stringify(memory), 'EX', 86400);
        }
      }
      
      // Update in PostgreSQL
      if (this.pgPool) {
        await this.pgPool.query(`
          UPDATE powermem_memories 
          SET stability = stability * $1,
              last_reviewed_at = CURRENT_TIMESTAMP,
              review_count = review_count + 1
          WHERE agent_id = $2 AND memory_key = $3
        `, [CONFIG.forgettingCurve.reviewBoost, this.agentId, key]);
      }
    } else {
      // Failed review - decrease stability
      if (this.redis) {
        const data = await this.redis.get(`powermem:${this.agentId}:${key}`);
        if (data) {
          const memory = JSON.parse(data);
          memory.stability = ForgettingCurve.updateStability(memory.stability, false);
          memory.lastReviewAt = Date.now();
          memory.reviewCount = (memory.reviewCount || 0) + 1;
          await this.redis.set(`powermem:${this.agentId}:${key}`, JSON.stringify(memory), 'EX', 86400);
        }
      }
      
      if (this.pgPool) {
        await this.pgPool.query(`
          UPDATE powermem_memories 
          SET stability = stability * $1,
              last_reviewed_at = CURRENT_TIMESTAMP,
              review_count = review_count + 1
          WHERE agent_id = $2 AND memory_key = $3
        `, [CONFIG.forgettingCurve.failedReviewPenalty, this.agentId, key]);
      }
    }
    
    // Update local store
    const localMem = this.localStore.get(key);
    if (localMem) {
      if (wasSuccessful) {
        localMem.successfulReview();
      } else {
        localMem.failedReview();
      }
    }
  }
  
  /**
   * Get memories needing review (spaced repetition queue)
   */
  async getReviewQueue(limit = 50) {
    await this.initialize();
    
    const queue = [];
    
    // Scan Redis
    if (this.redis) {
      const keys = await this.redis.keys(`powermem:${this.agentId}:*`);
      for (const redisKey of keys.slice(0, limit)) {
        const data = await this.redis.get(redisKey);
        if (data) {
          const memory = JSON.parse(data);
          const timeHours = (Date.now() - (memory.lastReviewedAt || memory.createdAt)) / (1000 * 60 * 60);
          const retrievability = ForgettingCurve.calculateRetrievability(timeHours, memory.stability || 0.1);
          
          if (retrievability < 0.7) {
            queue.push({
              key: memory.key,
              retrievability,
              priority: 1 - retrievability
            });
          }
        }
      }
    }
    
    // Sort by priority (lowest retrievability first)
    queue.sort((a, b) => b.priority - a.priority);
    
    return queue.slice(0, limit);
  }
  
  /**
   * Apply forgetting decay to all memories
   */
  async applyDecay() {
    await this.initialize();
    
    if (!this.pgPool) return { processed: 0, decayed: 0 };
    
    // Decay old memories that haven't been accessed
    const result = await this.pgPool.query(`
      UPDATE powermem_memories 
      SET stability = GREATEST(stability * 0.95, $1)
      WHERE agent_id = $2 
        AND last_accessed < CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND stability > $1
    `, [CONFIG.forgettingCurve.minStability, this.agentId]);
    
    return {
      processed: result.rowCount,
      decayed: result.rowCount
    };
  }
  
  /**
   * Get cognitive load statistics
   */
  async getStats() {
    await this.initialize();
    
    const stats = {
      totalMemories: 0,
      byTier: { critical: 0, important: 0, normal: 0, transient: 0 },
      avgStability: 0,
      avgRetrievability: 0,
      needsReview: 0
    };
    
    if (this.pgPool) {
      // Count by tier
      const tierResult = await this.pgPool.query(`
        SELECT tier, COUNT(*) as count 
        FROM powermem_memories 
        WHERE agent_id = $1 
        GROUP BY tier
      `, [this.agentId]);
      
      for (const row of tierResult.rows) {
        stats.byTier[row.tier] = parseInt(row.count);
        stats.totalMemories += parseInt(row.count);
      }
      
      // Average stability
      const avgResult = await this.pgPool.query(`
        SELECT AVG(stability) as avg_stability,
               AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_accessed)) / 3600) as avg_hours
        FROM powermem_memories 
        WHERE agent_id = $1
      `, [this.agentId]);
      
      if (avgResult.rows[0].avg_stability) {
        stats.avgStability = parseFloat(avgResult.rows[0].avg_stability);
        const avgHours = parseFloat(avgResult.rows[0].avg_hours) || 0;
        stats.avgRetrievability = ForgettingCurve.calculateRetrievability(avgHours, stats.avgStability);
      }
      
      // Count needing review
      const reviewResult = await this.pgPool.query(`
        SELECT COUNT(*) as count FROM powermem_memories 
        WHERE agent_id = $1 AND last_reviewed_at IS NULL
      `, [this.agentId]);
      stats.needsReview = parseInt(reviewResult.rows[0].count);
    } else {
      stats.totalMemories = this.localStore.size;
      for (const [key, mem] of this.localStore) {
        stats.byTier[mem.tier] = (stats.byTier[mem.tier] || 0) + 1;
      }
    }
    
    return stats;
  }
  
  /**
   * Clear all memories for this agent
   */
  async clear() {
    await this.initialize();
    
    if (this.redis) {
      const keys = await this.redis.keys(`powermem:${this.agentId}:*`);
      for (const key of keys) {
        await this.redis.del(key);
      }
    }
    
    if (this.pgPool) {
      await this.pgPool.query('DELETE FROM powermem_memories WHERE agent_id = $1', [this.agentId]);
    }
    
    this.localStore.clear();
    
    return { cleared: true };
  }
  
  /**
   * Determine memory tier based on importance
   */
  determineTier(importance) {
    if (importance >= 0.9) return 'critical';
    if (importance >= 0.7) return 'important';
    if (importance >= 0.4) return 'normal';
    return 'transient';
  }
  
  /**
   * Get initial stability based on importance
   */
  getInitialStability(importance) {
    const tier = this.determineTier(importance);
    return CONFIG.tiers[tier].stability;
  }
}

// Export
module.exports = PowerMem;
module.exports.ForgettingCurve = ForgettingCurve;
module.exports.MemoryItem = MemoryItem;

// Allow running directly for testing
if (require.main === module) {
  const powerMem = new PowerMem('test-agent');
  
  (async () => {
    await powerMem.initialize();
    console.log('[PowerMem] Initialized');
    
    // Test store
    await powerMem.store('test-key', 'Test memory content', { importance: 0.8 });
    console.log('[PowerMem] Memory stored');
    
    // Test recall
    const memory = await powerMem.recall('test-key');
    console.log('[PowerMem] Recalled:', memory);
    
    // Test review
    await powerMem.review('test-key', true);
    console.log('[PowerMem] Review completed');
    
    // Get stats
    const stats = await powerMem.getStats();
    console.log('[PowerMem] Stats:', stats);
    
    process.exit(0);
  })();
}