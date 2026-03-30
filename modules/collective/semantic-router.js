#!/usr/bin/env node
/**
 * SemanticRouter - Intelligent A2A Dispatch
 * ===========================================
 * 
 * Implements semantic routing for agent-to-agent communication.
 * Routes messages based on semantic understanding rather than simple name matching.
 * 
 * Key Features:
 * - Semantic embedding of messages and agent capabilities
 * - Intent classification for routing decisions
 * - Confidence scoring for routing choices
 * - Learned routing patterns from past interactions
 * - Fallback to deterministic routing when needed
 * 
 * Architecture:
 * 
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                    SEMANTIC ROUTER                        │
 *   │                                                              │
 *   │   Input: "Analyze this code for bugs"                      │
 *   │                      │                                      │
 *   │                      ▼                                      │
 *   │   ┌─────────────────────────────────────────────────────┐  │
 *   │   │              EMBEDDING ENGINE                       │  │
 *   │   │   - Sentence transformers                           │  │
 *   │   │   - Intent classification                           │  │
 *   │   │   - Semantic similarity                            │  │
 *   │   └─────────────────────────────────────────────────────┘  │
 *   │                      │                                      │
 *   │                      ▼                                      │
 *   │   ┌─────────────────────────────────────────────────────┐  │
 *   │   │              ROUTING DECISION                       │  │
 *   │   │   - Best agent match                                │  │
 *   │   │   - Confidence score                                 │  │
 *   │   │   - Fallback routing                                │  │
 *   │   └─────────────────────────────────────────────────────┘  │
 *   │                      │                                      │
 *   └──────────────────────┼──────────────────────────────────────┘
 *                          │
 *         ┌────────────────┼────────────────┐
 *         │                │                │
 *         ▼                ▼                ▼
 *   ┌───────────┐   ┌───────────┐   ┌───────────┐
 *   │ examiner  │   │   coder   │   │ sentinel  │
 *   │  (high)   │   │  (high)   │   │  (med)    │
 *   └───────────┘   └───────────┘   └───────────┘
 * 
 * Usage:
 *   const SemanticRouter = require('./modules/collective/semantic-router.js');
 *   const router = new SemanticRouter();
 *   
 *   // Register agents with capabilities
 *   router.registerAgent('coder', ['code', 'debug', 'review']);
 *   router.registerAgent('examiner', ['analyze', 'critique', 'review']);
 *   
 *   // Route a message
 *   const route = await router.route("Fix the memory leak in agents/client.js");
 *   console.log(route); // { agent: 'coder', confidence: 0.92 }
 */

const fs = require('fs');
const path = require('path');

// Try to load Redis
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  console.warn('[SemanticRouter] ioredis not available, using local mode');
}

// Configuration
const CONFIG = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Embedding settings
  embedding: {
    dimension: 384,           // Embedding dimension (using lightweight model)
    model: 'all-MiniLM-L6-v2', // Default model for embeddings
    threshold: 0.5            // Minimum confidence threshold
  },
  
  // Routing settings
  routing: {
    maxCandidates: 5,         // Max agents to consider
    confidenceThreshold: 0.6, // Minimum confidence for routing
    enableFallback: true,      // Fall back to deterministic routing
    enableLearning: true,      // Learn from past routing decisions
    cacheSize: 1000           // Size of routing cache
  },
  
  // Intent classification
  intents: {
    code: ['code', 'implement', 'write', 'create', 'fix', 'debug', 'build'],
    analyze: ['analyze', 'review', 'examine', 'check', 'audit', 'inspect'],
    research: ['research', 'find', 'search', 'discover', 'explore', 'investigate'],
    coordinate: ['coordinate', 'orchestrate', 'manage', 'delegate', 'plan'],
    protect: ['protect', 'secure', 'guard', 'validate', 'sanitize', 'verify'],
    creative: ['design', 'creative', 'imagine', 'suggest', 'propose', 'brainstorm'],
    memory: ['remember', 'store', 'recall', 'forget', 'archive', 'retrieve'],
    communicate: ['tell', 'ask', 'inform', 'report', 'explain', 'describe']
  },
  
  // Channels
  channels: {
    routing: 'semantic:router',
    training: 'semantic:training',
    metrics: 'semantic:metrics'
  }
};

/**
 * Simple embedding generator (placeholder - use actual model in production)
 * In production, integrate with transformers.js or OpenAI embeddings
 */
class EmbeddingEngine {
  constructor() {
    this.cache = new Map();
    this.dimension = CONFIG.embedding.dimension;
  }
  
  /**
   * Generate embedding for text
   * Uses simple hash-based approach as placeholder
   * In production, use actual embedding model
   */
  async embed(text) {
    if (this.cache.has(text)) {
      return this.cache.get(text);
    }
    
    // Simple hash-based embedding (placeholder)
    // In production, use: transformers.js pipeline or OpenAI embeddings
    const vector = new Array(this.dimension).fill(0);
    
    // Hash characters into vector dimensions
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vector[i % this.dimension] += (charCode / 255) * 0.5;
      vector[(i * 7) % this.dimension] += (charCode / 255) * 0.3;
      vector[(i * 13) % this.dimension] += (charCode / 255) * 0.2;
    }
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    const normalized = magnitude > 0 ? vector.map(v => v / magnitude) : vector;
    
    this.cache.set(text, normalized);
    
    // Limit cache size
    if (this.cache.size > CONFIG.routing.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return normalized;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2) + 0.0001);
    return Math.max(0, Math.min(1, similarity));
  }
  
  /**
   * Classify intent from text
   */
  classifyIntent(text) {
    const textLower = text.toLowerCase();
    const scores = {};
    
    for (const [intent, keywords] of Object.entries(CONFIG.intents)) {
      let score = 0;
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          score += 1;
        }
      }
      scores[intent] = score;
    }
    
    // Sort by score
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    
    return {
      primary: sorted[0]?.[0] || 'unknown',
      scores,
      confidence: sorted[0]?.[1] / (keywords?.length || 1) || 0
    };
  }
}

/**
 * Agent capability profile
 */
class AgentProfile {
  constructor(agentId, capabilities = [], metadata = {}) {
    this.agentId = agentId;
    this.capabilities = capabilities.map(c => c.toLowerCase());
    this.metadata = metadata;
    this.embedding = null;
    this.intents = [];
    this.totalRouted = 0;
    this.successfulRouted = 0;
    this.createdAt = Date.now();
    this.lastUsed = Date.now();
  }
  
  /**
   * Generate profile embedding from capabilities
   */
  async generateEmbedding(embeddingEngine) {
    const capabilityText = this.capabilities.join(' ');
    this.embedding = await embeddingEngine.embed(capabilityText);
    
    // Generate intent list
    for (const cap of this.capabilities) {
      const intent = embeddingEngine.classifyIntent(cap);
      if (intent.scores[intent.primary] > 0) {
        this.intents.push(intent.primary);
      }
    }
    
    return this.embedding;
  }
  
  /**
   * Record successful routing
   */
  recordSuccess() {
    this.totalRouted++;
    this.successfulRouted++;
    this.lastUsed = Date.now();
  }
  
  /**
   * Record failed routing
   */
  recordFailure() {
    this.totalRouted++;
    this.lastUsed = Date.now();
  }
  
  /**
   * Get success rate
   */
  getSuccessRate() {
    if (this.totalRouted === 0) return 0;
    return this.successfulRouted / this.totalRouted;
  }
  
  toJSON() {
    return {
      agentId: this.agentId,
      capabilities: this.capabilities,
      metadata: this.metadata,
      intents: this.intents,
      totalRouted: this.totalRouted,
      successfulRouted: this.successfulRouted,
      successRate: this.getSuccessRate(),
      lastUsed: this.lastUsed
    };
  }
}

/**
 * Routing decision
 */
class RouteDecision {
  constructor(agentId, confidence, method, reasoning) {
    this.agentId = agentId;
    this.confidence = confidence;
    this.method = method; // 'semantic', 'intent', 'fallback', 'learning'
    this.reasoning = reasoning;
    this.timestamp = Date.now();
  }
  
  toJSON() {
    return {
      agentId: this.agentId,
      confidence: this.confidence,
      method: this.method,
      reasoning: this.reasoning,
      timestamp: this.timestamp
    };
  }
}

/**
 * SemanticRouter - Main routing class
 */
class SemanticRouter {
  constructor(options = {}) {
    this.options = {
      ...CONFIG.routing,
      ...options
    };
    
    this.redis = null;
    this.embeddingEngine = new EmbeddingEngine();
    this.agentProfiles = new Map();
    this.routingCache = new Map();
    this.learningHistory = [];
    this.initialized = false;
  }
  
  /**
   * Initialize Redis and load agent profiles
   */
  async initialize() {
    if (this.initialized) return;
    
    if (Redis) {
      try {
        this.redis = new Redis(CONFIG.redisUrl, {
          retryStrategy: (times) => Math.min(times * 200, 2000)
        });
        await this.redis.ping();
        console.log('[SemanticRouter] Redis connected');
        
        // Load agent profiles from Redis
        await this.loadProfiles();
      } catch (e) {
        console.warn('[SemanticRouter] Redis unavailable, using local mode');
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Load agent profiles from Redis
   */
  async loadProfiles() {
    if (!this.redis) return;
    
    try {
      const data = await this.redis.hgetall('semantic:agent_profiles');
      for (const [agentId, profileJson] of Object.entries(data)) {
        const profile = JSON.parse(profileJson);
        this.agentProfiles.set(agentId, new AgentProfile(
          profile.agentId,
          profile.capabilities,
          profile.metadata
        ));
      }
      console.log(`[SemanticRouter] Loaded ${this.agentProfiles.size} agent profiles`);
    } catch (e) {
      console.warn('[SemanticRouter] Failed to load profiles:', e.message);
    }
  }
  
  /**
   * Register an agent with capabilities
   */
  async registerAgent(agentId, capabilities, metadata = {}) {
    await this.initialize();
    
    const profile = new AgentProfile(agentId, capabilities, metadata);
    await profile.generateEmbedding(this.embeddingEngine);
    
    this.agentProfiles.set(agentId, profile);
    
    // Store in Redis
    if (this.redis) {
      await this.redis.hset('semantic:agent_profiles', agentId, JSON.stringify(profile.toJSON()));
    }
    
    console.log(`[SemanticRouter] Agent registered: ${agentId} with capabilities: ${capabilities.join(', ')}`);
    
    return profile;
  }
  
  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId) {
    this.agentProfiles.delete(agentId);
    
    if (this.redis) {
      await this.redis.hdel('semantic:agent_profiles', agentId);
    }
    
    console.log(`[SemanticRouter] Agent unregistered: ${agentId}`);
  }
  
  /**
   * Route a message to the best agent
   */
  async route(message, options = {}) {
    await this.initialize();
    
    const maxCandidates = options.maxCandidates || this.options.maxCandidates;
    
    // Check cache first
    const cacheKey = this.hashMessage(message);
    if (this.routingCache.has(cacheKey) && this.options.enableLearning) {
      const cached = this.routingCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        console.log('[SemanticRouter] Using cached route');
        return new RouteDecision(cached.agentId, cached.confidence, 'cache', 'From routing cache');
      }
    }
    
    // Generate message embedding
    const messageEmbedding = await this.embeddingEngine.embed(message);
    const intentClassification = this.embeddingEngine.classifyIntent(message);
    
    console.log(`[SemanticRouter] Routing message: "${message.substring(0, 50)}..."`);
    console.log(`[SemanticRouter] Primary intent: ${intentClassification.primary}`);
    
    // Calculate scores for all agents
    const candidates = [];
    
    for (const [agentId, profile] of this.agentProfiles) {
      let score = 0;
      let method = 'unknown';
      
      // Semantic similarity
      if (profile.embedding) {
        const semanticScore = this.embeddingEngine.cosineSimilarity(messageEmbedding, profile.embedding);
        score += semanticScore * 0.4;
        method = 'semantic';
      }
      
      // Intent matching
      if (profile.intents.includes(intentClassification.primary)) {
        score += 0.4;
        if (method === 'unknown') method = 'intent';
      }
      
      // Capability keyword matching
      for (const cap of profile.capabilities) {
        if (message.toLowerCase().includes(cap)) {
          score += 0.1;
        }
      }
      
      // Learning adjustment (success rate)
      if (this.options.enableLearning && profile.totalRouted > 0) {
        const successRate = profile.getSuccessRate();
        score *= (0.8 + successRate * 0.4); // 0.8 to 1.2 multiplier
      }
      
      candidates.push({
        agentId,
        score,
        method,
        profile
      });
    }
    
    // Sort by score
    candidates.sort((a, b) => b.score - a.score);
    
    // Get top candidates
    const topCandidates = candidates.slice(0, maxCandidates);
    
    if (topCandidates.length === 0) {
      console.log('[SemanticRouter] No agents registered, using fallback');
      return this.fallbackRoute(message, intentClassification);
    }
    
    const top = topCandidates[0];
    
    // Check confidence threshold
    if (top.score < this.options.confidenceThreshold && this.options.enableFallback) {
      console.log(`[SemanticRouter] Low confidence (${top.score.toFixed(2)}), using fallback`);
      return this.fallbackRoute(message, intentClassification);
    }
    
    // Create routing decision
    const decision = new RouteDecision(
      top.agentId,
      top.score,
      top.method,
      `Matched via ${top.method} with score ${top.score.toFixed(2)}`
    );
    
    // Cache the result
    this.routingCache.set(cacheKey, {
      agentId: top.agentId,
      confidence: top.score,
      timestamp: Date.now()
    });
    
    // Record in learning history
    this.learningHistory.push({
      message: message.substring(0, 100),
      intent: intentClassification.primary,
      decision: decision.toJSON(),
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.learningHistory.length > 1000) {
      this.learningHistory = this.learningHistory.slice(-500);
    }
    
    // Store in Redis for learning
    if (this.redis) {
      await this.redis.lpush('semantic:history', JSON.stringify({
        message: message.substring(0, 200),
        intent: intentClassification.primary,
        agentId: top.agentId,
        confidence: top.score,
        timestamp: Date.now()
      }));
      await this.redis.ltrim('semantic:history', 0, 999);
    }
    
    console.log(`[SemanticRouter] Routed to: ${top.agentId} (${top.method}, ${(top.score * 100).toFixed(0)}%)`);
    
    return decision;
  }
  
  /**
   * Fallback routing when semantic routing fails
   */
  fallbackRoute(message, intentClassification) {
    // Map intents to default agents
    const intentFallbacks = {
      code: 'coder',
      analyze: 'examiner',
      research: 'explorer',
      coordinate: 'steward',
      protect: 'sentinel',
      creative: 'dreamer',
      memory: 'historian',
      communicate: 'empath'
    };
    
    const fallbackAgent = intentFallbacks[intentClassification.primary] || 'steward';
    
    return new RouteDecision(
      fallbackAgent,
      0.5,
      'fallback',
      `Fallback to ${fallbackAgent} for intent: ${intentClassification.primary}`
    );
  }
  
  /**
   * Record routing outcome for learning
   */
  async recordOutcome(agentId, success) {
    const profile = this.agentProfiles.get(agentId);
    if (profile) {
      if (success) {
        profile.recordSuccess();
      } else {
        profile.recordFailure();
      }
      
      // Update Redis
      if (this.redis) {
        await this.redis.hset('semantic:agent_profiles', agentId, JSON.stringify(profile.toJSON()));
      }
    }
  }
  
  /**
   * Train the router from history
   */
  async train() {
    if (!this.redis) {
      console.log('[SemanticRouter] Training requires Redis');
      return { trained: false };
    }
    
    try {
      const history = await this.redis.lrange('semantic:history', 0, 999);
      
      if (history.length === 0) {
        return { trained: false, reason: 'No history' };
      }
      
      console.log(`[SemanticRouter] Training from ${history.length} history entries`);
      
      // Analyze patterns and update agent profiles
      // This is a simplified version - production would use more sophisticated ML
      const patterns = {};
      
      for (const entry of history) {
        const data = JSON.parse(entry);
        if (!patterns[data.agentId]) {
          patterns[data.agentId] = { count: 0, totalConfidence: 0 };
        }
        patterns[data.agentId].count++;
        patterns[data.agentId].totalConfidence += data.confidence;
      }
      
      // Update agent success rates based on patterns
      for (const [agentId, stats] of Object.entries(patterns)) {
        const profile = this.agentProfiles.get(agentId);
        if (profile) {
          // Adjust success rate based on recent performance
          const avgConfidence = stats.totalConfidence / stats.count;
          console.log(`[SemanticRouter] ${agentId}: ${stats.count} routes, avg confidence ${(avgConfidence * 100).toFixed(0)}%`);
        }
      }
      
      return { trained: true, patterns: Object.keys(patterns).length };
    } catch (e) {
      console.error('[SemanticRouter] Training failed:', e);
      return { trained: false, error: e.message };
    }
  }
  
  /**
   * Get routing statistics
   */
  async getStats() {
    const stats = {
      agents: this.agentProfiles.size,
      cacheSize: this.routingCache.size,
      historySize: this.learningHistory.length,
      agentStats: []
    };
    
    for (const [agentId, profile] of this.agentProfiles) {
      stats.agentStats.push({
        agentId,
        capabilities: profile.capabilities,
        totalRouted: profile.totalRouted,
        successRate: profile.getSuccessRate(),
        lastUsed: profile.lastUsed
      });
    }
    
    return stats;
  }
  
  /**
   * Clear routing cache and history
   */
  async clear() {
    this.routingCache.clear();
    this.learningHistory = [];
    
    if (this.redis) {
      await this.redis.del('semantic:history');
    }
    
    console.log('[SemanticRouter] Cache and history cleared');
  }
  
  /**
   * Simple hash for cache key
   */
  hashMessage(message) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Export
module.exports = SemanticRouter;
module.exports.EmbeddingEngine = EmbeddingEngine;
module.exports.AgentProfile = AgentProfile;
module.exports.RouteDecision = RouteDecision;

// Allow running directly for testing
if (require.main === module) {
  const router = new SemanticRouter();
  
  (async () => {
    await router.initialize();
    
    // Register agents
    await router.registerAgent('coder', ['code', 'implement', 'debug', 'fix', 'write'], { role: 'artisan' });
    await router.registerAgent('examiner', ['analyze', 'review', 'critique', 'examine'], { role: 'interrogator' });
    await router.registerAgent('explorer', ['research', 'find', 'search', 'discover'], { role: 'scout' });
    await router.registerAgent('sentinel', ['protect', 'secure', 'validate', 'sanitize'], { role: 'guardian' });
    await router.registerAgent('dreamer', ['design', 'creative', 'imagine', 'propose'], { role: 'visionary' });
    
    // Test routing
    const routes = [
      'Fix the memory leak in agent-client.js',
      'Analyze this architecture for bottlenecks',
      'Research new OpenClaw integration patterns',
      'Design a new agent communication protocol',
      'Check if this input is safe'
    ];
    
    for (const msg of routes) {
      const route = await router.route(msg);
      console.log(`  "${msg.substring(0, 40)}..." → ${route.agentId} (${(route.confidence * 100).toFixed(0)}%)`);
    }
    
    // Get stats
    console.log('\nStats:', await router.getStats());
    
    process.exit(0);
  })();
}