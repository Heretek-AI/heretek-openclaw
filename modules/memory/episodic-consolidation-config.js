#!/usr/bin/env node
/**
 * Episodic Memory Consolidation Configuration
 * 
 * Configures the episodic-claw plugin for experience storage with:
 * - Consolidation schedules (hourly, daily, weekly)
 * - Experience replay for learning
 * - Memory prioritization based on emotional salience and frequency
 * - Integration with existing memory consolidation module
 * 
 * Usage:
 *   const config = require('./modules/memory/episodic-consolidation-config.js');
 *   await config.initialize();
 */

const fs = require('fs');
const path = require('path');

// Consolidation schedule configuration
const CONSOLIDATION_SCHEDULE = {
  // Hourly consolidation - quick pass for recent memories
  hourly: {
    enabled: true,
    intervalMinutes: 60,
    maxMemories: 100,
    priorityThreshold: 0.6,
    operations: ['replay', 'decay', 'promotion-check']
  },
  
  // Daily consolidation - full consolidation cycle
  daily: {
    enabled: true,
    hour: 3, // 3 AM for overnight consolidation
    maxMemories: 500,
    operations: ['replay', 'decay', 'promotion', 'abstraction', 'forgetting']
  },
  
  // Weekly consolidation - deep consolidation and schema formation
  weekly: {
    enabled: true,
    dayOfWeek: 0, // Sunday
    hour: 4,
    maxMemories: 2000,
    operations: ['replay', 'schema-formation', 'long-term-integration', 'pruning']
  }
};

// Memory prioritization configuration
const PRIORITIZATION_CONFIG = {
  // Emotional salience weights
  emotionalSalience: {
    weights: {
      surprise: 0.3,      // Unexpected events get priority
      reward: 0.25,       // Positive outcomes
      punishment: 0.2,    // Negative outcomes (avoidance learning)
      novelty: 0.15,      // New information
      relevance: 0.1      // Goal relevance
    },
    decayRate: 0.05,      // Emotional intensity decay per hour
    boostDuration: 24     // Hours emotional boost lasts
  },
  
  // Frequency-based prioritization
  frequency: {
    accessWeight: 0.4,
    mentionWeight: 0.3,
    recencyWeight: 0.3,
    decayRate: 0.01,      // Frequency decay per day
    minAccesses: 3        // Minimum accesses for frequency boost
  },
  
  // Combined priority calculation
  combined: {
    emotionalWeight: 0.4,
    frequencyWeight: 0.35,
    semanticWeight: 0.25,
    minPriorityForRetention: 0.2
  }
};

// Experience replay configuration
const REPLAY_CONFIG = {
  // Replay triggers
  triggers: {
    consolidationCycle: true,
    lowRetrievability: 0.3,  // Replay when retrievability drops below
    highImportance: 0.8,     // Always replay high importance memories
    relatedQuery: true       // Replay related memories on query
  },
  
  // Replay selection
  selection: {
    maxReplayPerCycle: 20,
    diversityFactor: 0.3,    // Ensure diverse replay, not just top scores
    minRetrievability: 0.1,  // Don't replay completely lost memories
    preferRecent: 0.2        // Slight bias toward recent memories
  },
  
  // Replay effects
  effects: {
    stabilityBoost: 1.5,     // Multiplier for stability after replay
    retrievabilityReset: 0.8, // Reset retrievability to this value
    importanceDecay: 0.95    // Slight importance decay after each replay
  }
};

// Forgetting curve configuration (Ebbinghaus-based)
const FORGETTING_CONFIG = {
  // Base forgetting curve parameters
  curve: {
    initialRetention: 1.0,
    decayConstant: 0.693,    // Half-life in days
    asymptote: 0.1,          // Minimum retention level
    inflectionPoint: 1       // Days until rapid decay begins
  },
  
  // Modifiers based on memory properties
  modifiers: {
    importanceMultiplier: 2.0,    // High importance = 2x half-life
    frequencyMultiplier: 1.5,     // Frequent access = 1.5x half-life
    emotionalMultiplier: 1.8,     // Emotional = 1.8x half-life
    sleepConsolidationBoost: 1.3  // Post-sleep = 1.3x half-life
  },
  
  // Forgetting thresholds
  thresholds: {
    needsReview: 0.5,        // Review when retention drops below
    criticalLoss: 0.2,       // Critical - needs immediate attention
    permanentRetention: 0.95 // Above this = essentially permanent
  }
};

// Episodic-claw plugin integration
const EPISODIC_CLAW_CONFIG = {
  // Plugin settings
  plugin: {
    enabled: true,
    path: 'plugins/episodic-claw',
    autoStart: true
  },
  
  // Episode storage
  storage: {
    format: 'pebble-db',
    vectorIndex: 'hnsw',
    embeddingDimension: 768,
    embeddingProvider: 'gemini'
  },
  
  // Episode segmentation
  segmentation: {
    surpriseThreshold: 0.7,     // Bayesian surprise for boundaries
    maxBufferChars: 7200,
    minEpisodeLength: 500,
    adaptiveSegmentation: true
  },
  
  // D0/D1 hierarchy
  hierarchy: {
    d0Retention: {
      maxAge: 30,              // Days to keep raw episodes
      compressionThreshold: 5  // Compress after this many related D0s
    },
    d1Consolidation: {
      enabled: true,
      minEpisodes: 3,
      summaryLength: 500,
      abstractionLevel: 'medium'
    }
  },
  
  // Recall configuration
  recall: {
    topK: 10,
    minScore: 0.5,
    recencyBias: 0.2,
    diversityFactor: 0.3,
    crossEpisodeLinks: true
  }
};

// Dreamer agent configuration for overnight consolidation
const DREAMER_CONFIG = {
  enabled: true,
  
  // Sleep schedule
  sleep: {
    duration: 4.8,             // Minutes for simulated sleep
    triggerHour: 3,            // Hour to trigger sleep
    triggerMinute: 0
  },
  
  // Dream content generation
  dreams: {
    enabled: true,
    type: 'memory-replay',     // 'memory-replay', 'abstraction', 'schema-formation'
    maxDreams: 10,
    minMemoryPriority: 0.5
  },
  
  // Consolidation during sleep
  consolidation: {
    replaySpeed: 2.0,          // Faster replay during sleep
    abstractionDepth: 2,       // Levels of abstraction to attempt
    schemaIntegration: true
  }
};

/**
 * Initialize episodic consolidation system
 */
async function initialize() {
  console.log('[EpisodicConsolidation] Initializing...');
  
  // Load or create consolidation state
  const stateDir = path.join(__dirname, 'state');
  const stateFile = path.join(stateDir, 'episodic-consolidation-state.json');
  
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  
  let state = {
    lastHourlyConsolidation: null,
    lastDailyConsolidation: null,
    lastWeeklyConsolidation: null,
    lastSleepCycle: null,
    totalConsolidationCycles: 0,
    totalMemoriesProcessed: 0,
    totalPromotions: 0,
    schedules: {}
  };
  
  if (fs.existsSync(stateFile)) {
    try {
      const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      state = { ...state, ...savedState };
      console.log('[EpisodicConsolidation] State loaded from', stateFile);
    } catch (error) {
      console.warn('[EpisodicConsolidation] Failed to load state:', error.message);
    }
  }
  
  // Save initial state
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  
  console.log('[EpisodicConsolidation] Configuration loaded:');
  console.log('  - Hourly consolidation:', CONSOLIDATION_SCHEDULE.hourly.enabled ? 'enabled' : 'disabled');
  console.log('  - Daily consolidation:', CONSOLIDATION_SCHEDULE.daily.enabled ? 'enabled' : 'disabled');
  console.log('  - Weekly consolidation:', CONSOLIDATION_SCHEDULE.weekly.enabled ? 'enabled' : 'disabled');
  console.log('  - Dreamer agent:', DREAMER_CONFIG.enabled ? 'enabled' : 'disabled');
  console.log('  - Episodic-claw plugin:', EPISODIC_CLAW_CONFIG.plugin.enabled ? 'enabled' : 'disabled');
  
  return {
    schedule: CONSOLIDATION_SCHEDULE,
    prioritization: PRIORITIZATION_CONFIG,
    replay: REPLAY_CONFIG,
    forgetting: FORGETTING_CONFIG,
    episodicClaw: EPISODIC_CLAW_CONFIG,
    dreamer: DREAMER_CONFIG,
    state
  };
}

/**
 * Calculate memory priority score
 * @param {Object} memory - Memory object
 * @param {Object} context - Current context
 * @returns {number} Priority score (0-1)
 */
function calculatePriority(memory, context = {}) {
  const now = Date.now();
  const ageHours = (now - (memory.timestamp || now)) / (1000 * 60 * 60);
  
  // Emotional salience score
  let emotionalScore = 0;
  if (memory.emotionalMarkers) {
    const { weights } = PRIORITIZATION_CONFIG.emotionalSalience;
    emotionalScore = 
      (memory.emotionalMarkers.surprise || 0) * weights.surprise +
      (memory.emotionalMarkers.reward || 0) * weights.reward +
      (memory.emotionalMarkers.punishment || 0) * weights.punishment +
      (memory.emotionalMarkers.novelty || 0) * weights.novelty +
      (memory.emotionalMarkers.relevance || 0) * weights.relevance;
    
    // Apply decay
    const decayFactor = Math.exp(-PRIORITIZATION_CONFIG.emotionalSalience.decayRate * ageHours);
    emotionalScore *= decayFactor;
  }
  
  // Frequency score
  let frequencyScore = 0;
  if (memory.accessHistory) {
    const accessCount = memory.accessHistory.length || memory.accessCount || 0;
    const lastAccess = memory.accessHistory?.[memory.accessHistory.length - 1] || memory.lastAccess || memory.timestamp;
    const recencyHours = (now - lastAccess) / (1000 * 60 * 60);
    
    const { accessWeight, mentionWeight, recencyWeight, decayRate, minAccesses } = 
      PRIORITIZATION_CONFIG.frequency;
    
    const accessComponent = Math.min(1, accessCount / 10);
    const recencyComponent = Math.exp(-decayRate * recencyHours);
    
    frequencyScore = accessComponent * accessWeight + recencyComponent * recencyWeight;
    
    if (accessCount >= minAccesses) {
      frequencyScore += mentionWeight;
    }
  }
  
  // Semantic score (based on concepts/entities)
  let semanticScore = 0;
  if (memory.concepts?.length > 0 || memory.entities?.length > 0) {
    const conceptCount = (memory.concepts?.length || 0) + (memory.entities?.length || 0);
    semanticScore = Math.min(1, conceptCount / 10);
  }
  
  // Combined priority
  const { emotionalWeight, frequencyWeight, semanticWeight } = PRIORITIZATION_CONFIG.combined;
  const priority = 
    emotionalScore * emotionalWeight +
    frequencyScore * frequencyWeight +
    semanticScore * semanticWeight;
  
  return Math.max(0, Math.min(1, priority));
}

/**
 * Calculate forgetting curve retention
 * @param {Object} memory - Memory object
 * @returns {number} Retention score (0-1)
 */
function calculateRetention(memory) {
  const now = Date.now();
  const ageDays = (now - (memory.timestamp || now)) / (1000 * 60 * 60 * 24);
  
  const { curve, modifiers } = FORGETTING_CONFIG;
  
  // Base retention from exponential decay
  let halfLife = curve.decayConstant;
  
  // Apply modifiers
  if (memory.importance > 0.7) halfLife *= modifiers.importanceMultiplier;
  if ((memory.accessCount || 0) >= 3) halfLife *= modifiers.frequencyMultiplier;
  if (memory.emotionalMarkers) halfLife *= modifiers.emotionalMultiplier;
  if (memory.lastConsolidation) halfLife *= modifiers.sleepConsolidationBoost;
  
  // Calculate retention
  const baseRetention = curve.initialRetention * Math.pow(0.5, ageDays / halfLife);
  const retention = Math.max(curve.asymptote, baseRetention);
  
  return retention;
}

/**
 * Check if memory needs review based on forgetting curve
 * @param {Object} memory - Memory object
 * @returns {boolean} True if review needed
 */
function needsReview(memory) {
  const retention = calculateRetention(memory);
  return retention < FORGETTING_CONFIG.thresholds.needsReview;
}

/**
 * Get next consolidation schedule
 * @returns {Object} Next scheduled consolidation
 */
function getNextConsolidation() {
  const now = new Date();
  const next = [];
  
  // Check hourly
  if (CONSOLIDATION_SCHEDULE.hourly.enabled) {
    const nextHourly = new Date(now);
    nextHourly.setHours(now.getHours() + 1);
    nextHourly.setMinutes(0, 0, 0);
    next.push({ type: 'hourly', time: nextHourly });
  }
  
  // Check daily
  if (CONSOLIDATION_SCHEDULE.daily.enabled) {
    const nextDaily = new Date(now);
    nextDaily.setHours(CONSOLIDATION_SCHEDULE.daily.hour, 0, 0, 0);
    if (nextDaily <= now) {
      nextDaily.setDate(nextDaily.getDate() + 1);
    }
    next.push({ type: 'daily', time: nextDaily });
  }
  
  // Check weekly
  if (CONSOLIDATION_SCHEDULE.weekly.enabled) {
    const nextWeekly = new Date(now);
    nextWeekly.setHours(CONSOLIDATION_SCHEDULE.weekly.hour, 0, 0, 0);
    const daysUntilTarget = CONSOLIDATION_SCHEDULE.weekly.dayOfWeek - nextWeekly.getDay();
    nextWeekly.setDate(nextWeekly.getDate() + (daysUntilTarget >= 0 ? daysUntilTarget : 7 + daysUntilTarget));
    if (nextWeekly <= now) {
      nextWeekly.setDate(nextWeekly.getDate() + 7);
    }
    next.push({ type: 'weekly', time: nextWeekly });
  }
  
  // Sort by time
  next.sort((a, b) => a.time - b.time);
  
  return next[0];
}

module.exports = {
  initialize,
  calculatePriority,
  calculateRetention,
  needsReview,
  getNextConsolidation,
  CONSOLIDATION_SCHEDULE,
  PRIORITIZATION_CONFIG,
  REPLAY_CONFIG,
  FORGETTING_CONFIG,
  EPISODIC_CLAW_CONFIG,
  DREAMER_CONFIG
};
