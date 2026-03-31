#!/usr/bin/env node
/**
 * Dreamer Agent - Overnight Memory Consolidation
 * 
 * Implements sleep-based memory consolidation inspired by human neuroscience.
 * Features:
 * - Simulated sleep cycles for memory processing
 * - Experience replay during rest periods
 * - Memory abstraction and schema formation
 * - Integration with episodic-claw plugin
 * 
 * Neuroscience Background:
 * - Hippocampal replay during sleep strengthens memories
 * - REM sleep associated with schema formation
 * - Slow-wave sleep important for declarative memory consolidation
 * 
 * Usage:
 *   const dreamer = new DreamerAgent();
 *   await dreamer.initialize();
 *   await dreamer.runSleepCycle();
 */

const fs = require('fs');
const path = require('path');

class DreamerAgent {
  /**
   * Create Dreamer Agent instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = Object.assign({
      // Sleep configuration
      sleep: {
        durationMinutes: 4.8,      // Simulated sleep duration
        triggerHour: 3,            // Hour to trigger sleep (3 AM)
        autoTrigger: true          // Automatically trigger at scheduled time
      },
      
      // Sleep stages (simulated)
      stages: {
        nrem1: { duration: 0.1, replayRate: 1.0, abstractionDepth: 0 },
        nrem2: { duration: 0.15, replayRate: 1.2, abstractionDepth: 1 },
        nrem3: { duration: 0.2, replayRate: 1.5, abstractionDepth: 1 },
        rem: { duration: 0.25, replayRate: 2.0, abstractionDepth: 2 }
      },
      
      // Dream configuration
      dreams: {
        enabled: true,
        maxDreams: 10,
        minMemoryPriority: 0.5,
        diversityFactor: 0.3
      },
      
      // Replay configuration
      replay: {
        maxMemories: 50,
        preferWeaklyLearned: true,  // Prioritize memories needing reinforcement
        preferImportant: true,
        speedMultiplier: 2.0
      },
      
      // Consolidation settings
      consolidation: {
        episodicToSemantic: true,
        schemaFormation: true,
        forgettingCurve: true
      },
      
      // Storage paths
      stateFile: path.join(__dirname, 'state', 'dreamer-state.json'),
      dreamLogFile: path.join(__dirname, 'data', 'dream-log.json')
    }, config);
    
    // State
    this.initialized = false;
    this.isSleeping = false;
    this.currentStage = null;
    this.sleepCycleCount = 0;
    this.totalDreams = 0;
    
    // Memory references
    this.consolidationModule = null;
    this.semanticPromoter = null;
    this.graphRAG = null;
    
    // Dream log
    this.dreamLog = [];
    
    // Sleep timer
    this.sleepTimer = null;
  }

  /**
   * Initialize the Dreamer Agent
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure directories exist
      this.ensureDirectories();
      
      // Load state
      await this.loadState();
      
      // Load dream log
      await this.loadDreamLog();
      
      // Try to load memory modules
      await this.loadMemoryModules();
      
      // Set up auto-trigger if enabled
      if (this.config.sleep.autoTrigger) {
        this.scheduleSleep();
      }
      
      this.initialized = true;
      console.log('[DreamerAgent] Initialized, sleep scheduled for', this.config.sleep.triggerHour, ':00');
    } catch (error) {
      console.error('[DreamerAgent] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Ensure data directories exist
   */
  ensureDirectories() {
    const dirs = [
      path.dirname(this.config.stateFile),
      path.dirname(this.config.dreamLogFile)
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Load persisted state
   */
  async loadState() {
    if (fs.existsSync(this.config.stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(this.config.stateFile, 'utf8'));
        this.sleepCycleCount = state.sleepCycleCount || 0;
        this.totalDreams = state.totalDreams || 0;
        console.log('[DreamerAgent] State loaded, cycles:', this.sleepCycleCount);
      } catch (error) {
        console.warn('[DreamerAgent] Failed to load state:', error.message);
      }
    }
  }

  /**
   * Save state to disk
   */
  saveState() {
    try {
      const state = {
        sleepCycleCount: this.sleepCycleCount,
        totalDreams: this.totalDreams,
        lastSleep: this.lastSleepTime,
        savedAt: Date.now()
      };
      
      fs.writeFileSync(this.config.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('[DreamerAgent] Failed to save state:', error.message);
    }
  }

  /**
   * Load dream log
   */
  async loadDreamLog() {
    if (fs.existsSync(this.config.dreamLogFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.config.dreamLogFile, 'utf8'));
        this.dreamLog = data.slice(-100); // Keep last 100 dreams
      } catch (error) {
        this.dreamLog = [];
      }
    }
  }

  /**
   * Save dream log
   */
  saveDreamLog() {
    try {
      // Keep only last 100 dreams to prevent file bloat
      const truncatedLog = this.dreamLog.slice(-100);
      fs.writeFileSync(this.config.dreamLogFile, JSON.stringify(truncatedLog, null, 2));
    } catch (error) {
      console.error('[DreamerAgent] Failed to save dream log:', error.message);
    }
  }

  /**
   * Load memory modules
   */
  async loadMemoryModules() {
    try {
      // Try to load consolidation module
      const ConsolidationModule = require('./memory-consolidation.js');
      this.consolidationModule = new ConsolidationModule();
      console.log('[DreamerAgent] Consolidation module loaded');
    } catch (error) {
      console.warn('[DreamerAgent] Could not load consolidation module:', error.message);
    }

    try {
      // Try to load semantic promotion
      const { SemanticPromotion } = require('./semantic-promotion.js');
      this.semanticPromoter = new SemanticPromotion();
      await this.semanticPromoter.initialize();
      console.log('[DreamerAgent] Semantic promoter loaded');
    } catch (error) {
      console.warn('[DreamerAgent] Could not load semantic promoter:', error.message);
    }

    try {
      // Try to load GraphRAG
      const { GraphRAG } = require('./graph-rag.js');
      this.graphRAG = new GraphRAG();
      await this.graphRAG.initialize();
      console.log('[DreamerAgent] GraphRAG loaded');
    } catch (error) {
      console.warn('[DreamerAgent] Could not load GraphRAG:', error.message);
    }
  }

  /**
   * Schedule next sleep cycle
   */
  scheduleSleep() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
    }

    const now = new Date();
    const nextSleep = new Date(now);
    nextSleep.setHours(this.config.sleep.triggerHour, 0, 0, 0);
    
    // If already past trigger time today, schedule for tomorrow
    if (nextSleep <= now) {
      nextSleep.setDate(nextSleep.getDate() + 1);
    }

    const delay = nextSleep.getTime() - now.getTime();
    
    console.log('[DreamerAgent] Next sleep scheduled in', Math.round(delay / 60000), 'minutes');
    
    this.sleepTimer = setTimeout(() => {
      this.runSleepCycle();
    }, delay);
  }

  /**
   * Run a complete sleep cycle
   * @returns {Promise<Object>} Sleep cycle results
   */
  async runSleepCycle() {
    if (this.isSleeping) {
      console.log('[DreamerAgent] Already sleeping, skipping');
      return { skipped: true, reason: 'already_sleeping' };
    }

    this.isSleeping = true;
    this.sleepCycleCount++;
    this.lastSleepTime = Date.now();
    
    const results = {
      cycleNumber: this.sleepCycleCount,
      startTime: this.lastSleepTime,
      stages: [],
      dreams: [],
      consolidations: 0,
      errors: []
    };

    console.log('[DreamerAgent] Starting sleep cycle', this.sleepCycleCount);

    try {
      // Run through sleep stages
      const stageOrder = ['nrem1', 'nrem2', 'nrem3', 'rem'];
      
      for (const stageName of stageOrder) {
        const stageConfig = this.config.stages[stageName];
        this.currentStage = stageName;
        
        console.log('[DreamerAgent] Entering stage:', stageName);
        
        const stageResult = await this.runSleepStage(stageName, stageConfig);
        results.stages.push(stageResult);
        
        // Record dreams during REM
        if (stageName === 'rem' && this.config.dreams.enabled) {
          const dreams = await this.generateDreams(stageConfig);
          results.dreams = dreams;
          this.dreamLog.push(...dreams.map(d => ({
            ...d,
            cycle: this.sleepCycleCount,
            timestamp: Date.now()
          })));
          this.totalDreams += dreams.length;
        }
        
        // Small delay between stages (simulated)
        await this.sleep(100);
      }

      // Post-sleep consolidation
      if (this.config.consolidation.episodicToSemantic && this.semanticPromoter) {
        console.log('[DreamerAgent] Running post-sleep semantic promotion');
        const promotionResults = await this.semanticPromoter.processEpisodicMemories();
        results.consolidations = promotionResults.promoted;
      }

      // Apply forgetting curve
      if (this.config.consolidation.forgettingCurve && this.consolidationModule) {
        console.log('[DreamerAgent] Applying forgetting decay');
        this.consolidationModule.decayUnusedMemories();
      }

      // Save dream log
      this.saveDreamLog();
      this.saveState();

    } catch (error) {
      results.errors.push(error.message);
      console.error('[DreamerAgent] Sleep cycle error:', error.message);
    }

    this.isSleeping = false;
    this.currentStage = null;
    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    console.log('[DreamerAgent] Sleep cycle complete, duration:', Math.round(results.duration / 60000), 'minutes');

    // Schedule next sleep
    if (this.config.sleep.autoTrigger) {
      this.scheduleSleep();
    }

    return results;
  }

  /**
   * Run a specific sleep stage
   * @param {string} stageName - Stage name
   * @param {Object} stageConfig - Stage configuration
   * @returns {Promise<Object>} Stage results
   */
  async runSleepStage(stageName, stageConfig) {
    const results = {
      stage: stageName,
      memoriesProcessed: 0,
      replayCount: 0,
      abstractionDepth: stageConfig.abstractionDepth
    };

    // Get memories for replay
    const memoriesToReplay = await this.selectMemoriesForReplay(stageConfig);

    // Replay memories at accelerated speed
    for (const memory of memoriesToReplay) {
      try {
        await this.replayMemory(memory, stageConfig);
        results.replayCount++;
      } catch (error) {
        console.warn('[DreamerAgent] Replay error:', error.message);
      }
    }

    results.memoriesProcessed = memoriesToReplay.length;

    return results;
  }

  /**
   * Select memories for replay
   * @param {Object} stageConfig - Current stage configuration
   * @returns {Promise<Array>} Memories to replay
   */
  async selectMemoriesForReplay(stageConfig) {
    const memories = [];
    const maxMemories = Math.floor(this.config.replay.maxMemories * stageConfig.replayRate);

    // Get memories from consolidation module if available
    if (this.consolidationModule) {
      const episodicMemories = Array.from(this.consolidationModule.episodicMemory?.values() || []);
      
      // Sort by priority (weakly learned first if configured)
      episodicMemories.sort((a, b) => {
        if (this.config.replay.preferWeaklyLearned) {
          // Lower importance = higher priority for replay
          return (a.importance || 0.5) - (b.importance || 0.5);
        }
        return (b.importance || 0.5) - (a.importance || 0.5);
      });

      memories.push(...episodicMemories.slice(0, maxMemories));
    }

    return memories;
  }

  /**
   * Replay a memory (simulated hippocampal replay)
   * @param {Object} memory - Memory to replay
   * @param {Object} stageConfig - Current stage configuration
   * @returns {Promise<void>}
   */
  async replayMemory(memory, stageConfig) {
    // Simulate replay by reinforcing the memory
    if (this.consolidationModule) {
      // Increase access count (simulates replay)
      memory.accessCount = (memory.accessCount || 0) + 1;
      memory.lastAccess = Date.now();
      
      // Boost stability based on replay
      if (memory.stability) {
        memory.stability = Math.min(10, memory.stability * 1.1);
      }
    }

    // During deeper stages, attempt abstraction
    if (stageConfig.abstractionDepth > 0 && this.semanticPromoter) {
      const score = this.semanticPromoter.calculatePromotionScore(memory);
      if (score >= this.config.consolidation.episodicToSemantic) {
        this.semanticPromoter.promoteToSemantic(memory);
      }
    }
  }

  /**
   * Generate dreams (abstract memory combinations)
   * @param {Object} stageConfig - REM stage configuration
   * @returns {Promise<Array>} Generated dreams
   */
  async generateDreams(stageConfig) {
    const dreams = [];
    const maxDreams = this.config.dreams.maxDreams;

    // Get high-priority memories for dream content
    const dreamMemories = await this.selectMemoriesForReplay(stageConfig);
    
    // Filter by minimum priority
    const eligibleMemories = dreamMemories.filter(
      m => (m.importance || 0) >= this.config.dreams.minMemoryPriority
    );

    // Generate dreams by combining related memories
    for (let i = 0; i < Math.min(maxDreams, eligibleMemories.length); i++) {
      const baseMemory = eligibleMemories[i];
      
      // Find related memories for combination
      const relatedMemories = this.findRelatedMemories(baseMemory, 2);
      
      // Create dream content
      const dream = {
        id: `dream-${Date.now()}-${i}`,
        baseMemory: baseMemory.id,
        relatedMemories: relatedMemories.map(m => m.id),
        content: this.generateDreamContent(baseMemory, relatedMemories),
        emotionalTone: this.estimateEmotionalTone(baseMemory),
        abstractionLevel: stageConfig.abstractionDepth,
        timestamp: Date.now()
      };

      dreams.push(dream);
      console.log('[DreamerAgent] Generated dream:', dream.id);
    }

    return dreams;
  }

  /**
   * Find memories related to a base memory
   * @param {Object} baseMemory - Base memory
   * @param {number} maxResults - Maximum related memories
   * @returns {Array} Related memories
   */
  findRelatedMemories(baseMemory, maxResults = 5) {
    const related = [];
    
    if (!this.consolidationModule) return related;

    const baseConcepts = new Set(baseMemory.concepts || []);
    
    for (const [id, memory] of (this.consolidationModule.episodicMemory || new Map()).entries()) {
      if (id === baseMemory.id) continue;
      
      // Count shared concepts
      const memoryConcepts = new Set(memory.concepts || []);
      const sharedConcepts = [...baseConcepts].filter(c => memoryConcepts.has(c));
      
      if (sharedConcepts.length > 0) {
        related.push({
          ...memory,
          id,
          sharedConcepts: sharedConcepts.length
        });
      }
    }

    // Sort by shared concepts and return top results
    related.sort((a, b) => b.sharedConcepts - a.sharedConcepts);
    return related.slice(0, maxResults);
  }

  /**
   * Generate dream content from memories
   * @param {Object} baseMemory - Base memory
   * @param {Array} relatedMemories - Related memories
   * @returns {string} Dream content
   */
  generateDreamContent(baseMemory, relatedMemories) {
    // Combine concepts from all memories
    const allConcepts = new Set([
      ...(baseMemory.concepts || []),
      ...relatedMemories.flatMap(m => m.concepts || [])
    ]);

    // Create abstract narrative
    const conceptList = Array.from(allConcepts).slice(0, 10);
    
    return `Dream narrative involving: ${conceptList.join(', ')}`;
  }

  /**
   * Estimate emotional tone of a memory
   * @param {Object} memory - Memory to analyze
   * @returns {string} Emotional tone
   */
  estimateEmotionalTone(memory) {
    if (memory.emotionalMarkers) {
      const { reward, punishment, surprise } = memory.emotionalMarkers;
      
      if (reward > 0.7) return 'positive';
      if (punishment > 0.7) return 'negative';
      if (surprise > 0.7) return 'surprising';
    }

    return 'neutral';
  }

  /**
   * Utility sleep function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get dreamer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      sleepCycles: this.sleepCycleCount,
      totalDreams: this.totalDreams,
      isSleeping: this.isSleeping,
      currentStage: this.currentStage,
      lastSleepTime: this.lastSleepTime,
      dreamLogSize: this.dreamLog.length
    };
  }

  /**
   * Get recent dreams
   * @param {number} limit - Maximum dreams to return
   * @returns {Array} Recent dreams
   */
  getRecentDreams(limit = 10) {
    return this.dreamLog.slice(-limit);
  }

  /**
   * Close and cleanup
   * @returns {Promise<void>}
   */
  async close() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }

    this.saveState();
    this.saveDreamLog();

    if (this.semanticPromoter) {
      await this.semanticPromoter.close();
    }

    this.initialized = false;
    console.log('[DreamerAgent] Closed');
  }
}

/**
 * Factory for creating DreamerAgent instances
 */
class DreamerAgentFactory {
  static async create(config = {}) {
    const agent = new DreamerAgent(config);
    await agent.initialize();
    return agent;
  }
}

module.exports = {
  DreamerAgent,
  DreamerAgentFactory
};
