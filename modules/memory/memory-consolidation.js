#!/usr/bin/env node
/**
 * Memory Consolidation Module
 * 
 * Implements memory tier management with episodic-to-semantic conversion.
 * Based on research findings from:
 * - Memory Consolidation Research (docs/research/MEMORY_CONSOLIDATION_RESEARCH.md)
 * - Memory Tier Management (modules/memory/memory-consolidation.js)
 * 
 * Key concepts:
 * - Episodic Memory: Short-term, detailed memories of recent events
 * - Semantic Memory: Long-term, generalized knowledge
 * - Pad Memory: Temporary working memory buffer
 * - Consolidation: Extract patterns from episodic memories
 * - Forgetting: Natural decay of less frequently accessed memories
 * - Sleep: Offline consolidation during rest periods
 * - Replay: Reactivation of consolidated memories during tasks
 * - Promotion Threshold: Criteria for promoting episodic to semantic memory
 */

const fs = require('fs');
const path = require('path');

class MemoryConsolidation {
    /**
     * Constructor - Initialize memory consolidation system
     * @param {Object} config - Configuration options
     */
    constructor(config = {}) {
        // Configuration
        this.config = Object.assign({
            episodicMaxAge: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
            semanticMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            padMaxAge: 60 * 60 * 1000, // 1 hour in milliseconds
            replayThreshold: 0.1,
            consolidationInterval: 5 * 60 * 1000, // 5 minutes
            sleepDuration: 4.8 * 60 * 1000, // 4.8 minutes
            decayRate: 0.001, // Importance decay rate per hour
            promotionThreshold: 0.7, // Minimum score for promotion
            maxEpisodicMemories: 1000,
            maxSemanticMemories: 5000,
            maxPadMemories: 100
        }, config);

        // Memory tiers
        this.episodicMemory = new Map();
        this.semanticMemory = new Map();
        this.padMemory = new Map();

        // Promotion history
        this.promotionHistory = [];
        this.promoteToSemantic = [];

        // Access patterns
        this.accessPatterns = new Map();

        // Sleep schedule
        this.sleepSchedule = null;
        this.sleepCounter = 0;

        // State tracking
        this.lastConsolidation = null;
        this.decayRate = this.config.decayRate;

        // Persisted state file path
        this.stateFilePath = config.stateFilePath || path.join(__dirname, 'state', 'consolidation-state.json');

        // Load persisted state
        this.load();
    }

    /**
     * Add episodic memory
     * @param {Object} memory - Memory object to add
     * @returns {string} Memory ID
     */
    addEpisodicMemory(memory) {
        const id = memory.id || `epi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const memoryEntry = {
            id: id,
            timestamp: Date.now(),
            content: memory.content || '',
            importance: memory.importance || 0.5,
            accessCount: memory.accessCount || 0,
            lastAccess: Date.now(),
            metadata: memory.metadata || {},
            concepts: memory.concepts || [],
            entities: memory.entities || []
        };

        // Calculate initial promotion score
        memoryEntry.promotionScore = this.calculatePromotionScore(memoryEntry);

        this.episodicMemory.set(id, memoryEntry);

        // Track access pattern
        this.trackAccess(id, 'episodic');

        // Check memory limits
        this.enforceMemoryLimits('episodic');

        return id;
    }

    /**
     * Add pad memory (temporary working memory)
     * @param {Object} memory - Memory object to add
     * @returns {string} Memory ID
     */
    addPadMemory(memory) {
        const id = memory.id || `pad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const memoryEntry = {
            id: id,
            timestamp: Date.now(),
            content: memory.content || '',
            importance: memory.importance || 0.3,
            accessCount: 0,
            lastAccess: Date.now(),
            metadata: memory.metadata || {},
            expiresAt: Date.now() + this.config.padMaxAge
        };

        this.padMemory.set(id, memoryEntry);
        this.trackAccess(id, 'pad');

        return id;
    }

    /**
     * Calculate promotion score for a memory
     * @param {Object} memory - Memory to evaluate
     * @returns {number} Promotion score (0-1)
     */
    calculatePromotionScore(memory) {
        if (!memory) return 0;

        const now = Date.now();
        const age = now - memory.timestamp;
        
        // Factors affecting promotion
        const accessFrequency = memory.accessCount || 0;
        const importance = memory.importance || 0.5;
        const recency = Math.exp(-age / this.config.episodicMaxAge);

        // Weighted score calculation
        let score = (accessFrequency * 0.4) + (importance * 0.4) + (recency * 0.2);

        // Normalize score to 0-1 range
        if (score > 1) {
            score = 1;
        } else if (score < 0) {
            score = 0;
        }

        return score;
    }

    /**
     * Calculate importance weight with time decay
     * @param {Object} memory - Memory to evaluate
     * @param {number} importance - Base importance value
     * @returns {number} Decayed importance weight
     */
    calculateImportanceWeight(memory, importance) {
        if (!memory) return 0;
        
        const now = Date.now();
        const ageHours = (now - memory.timestamp) / (60 * 60 * 1000);
        
        // Weight decays over time
        const weight = Math.max(0, importance * Math.exp(-this.decayRate * ageHours));
        return weight;
    }

    /**
     * Extract semantic content from memory
     * @param {Object} memory - Memory to extract from
     * @returns {Object} Extracted concepts and entities
     */
    extractSemanticContent(memory) {
        const concepts = new Set();
        const entities = new Set();

        if (!memory || !memory.content) {
            return { concepts: [], entities: [] };
        }

        // Simple extraction: words longer than 3 characters
        const words = memory.content.split(/\s+/);
        for (const word of words) {
            // Clean the word
            const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
            if (cleanWord.length > 3) {
                concepts.add(cleanWord);
            }
        }

        // Extract entities (capitalized words, proper nouns)
        const entityPattern = /\b([A-Z][a-z]+)\b/g;
        let entityMatch;
        while ((entityMatch = entityPattern.exec(memory.content)) !== null) {
            entities.add(entityMatch[1].toLowerCase());
        }

        return {
            concepts: Array.from(concepts),
            entities: Array.from(entities)
        };
    }

    /**
     * Check if a memory should be promoted to semantic tier
     * @param {Object} memory - Memory to evaluate
     * @returns {boolean} True if memory should be promoted
     */
    shouldPromote(memory) {
        if (!memory) return false;

        const score = this.calculatePromotionScore(memory);
        return score >= this.config.promotionThreshold;
    }

    /**
     * Promote episodic memory to semantic memory
     * @param {Object} memory - Memory to promote
     * @returns {Object|null} Promoted semantic memory or null on failure
     */
    promoteToSemanticMemory(memory) {
        if (!memory) return null;

        const semanticId = `sem-${memory.id}`;
        
        // Extract semantic content
        const extracted = this.extractSemanticContent(memory);

        const semanticMemory = {
            id: semanticId,
            originalId: memory.id,
            timestamp: Date.now(),
            originalTimestamp: memory.timestamp,
            content: memory.content,
            concepts: extracted.concepts,
            entities: extracted.entities,
            importance: this.calculateImportanceWeight(memory, memory.importance),
            accessCount: memory.accessCount,
            promotionScore: memory.promotionScore,
            metadata: memory.metadata || {}
        };

        // Store in semantic memory
        this.semanticMemory.set(semanticId, semanticMemory);

        // Record promotion
        this.promotionHistory.push({
            originalId: memory.id,
            semanticId: semanticId,
            timestamp: Date.now(),
            score: memory.promotionScore
        });

        // Track in promoteToSemantic array
        this.promoteToSemantic.push(semanticId);

        // Remove from episodic memory
        this.episodicMemory.delete(memory.id);

        return semanticMemory;
    }

    /**
     * Archive old pad memories
     * @returns {number} Number of archived memories
     */
    archiveOldPadMemories() {
        const now = Date.now();
        let archivedCount = 0;

        for (const [id, memory] of this.padMemory.entries()) {
            if (memory.expiresAt && now > memory.expiresAt) {
                this.padMemory.delete(id);
                archivedCount++;
            }
        }

        return archivedCount;
    }

    /**
     * Decay importance of unused memories
     * @returns {number} Number of memories affected
     */
    decayUnusedMemories() {
        const now = Date.now();
        let affectedCount = 0;

        // Decay episodic memories
        for (const [id, memory] of this.episodicMemory.entries()) {
            const hoursSinceAccess = (now - memory.lastAccess) / (60 * 60 * 1000);
            
            if (hoursSinceAccess > 1) {
                const decayFactor = Math.exp(-this.decayRate * hoursSinceAccess);
                memory.importance = memory.importance * decayFactor;
                affectedCount++;
            }
        }

        // Decay semantic memories (slower rate)
        for (const [id, memory] of this.semanticMemory.entries()) {
            const hoursSinceAccess = (now - (memory.lastAccess || memory.timestamp)) / (60 * 60 * 1000);
            
            if (hoursSinceAccess > 24) {
                const decayFactor = Math.exp(-this.decayRate * 0.1 * hoursSinceAccess);
                memory.importance = memory.importance * decayFactor;
                affectedCount++;
            }
        }

        return affectedCount;
    }

    /**
     * Track memory access
     * @param {string} memoryId - Memory ID
     * @param {string} tier - Memory tier (episodic, semantic, pad)
     */
    trackAccess(memoryId, tier) {
        if (!this.accessPatterns.has(memoryId)) {
            this.accessPatterns.set(memoryId, {
                count: 0,
                lastAccess: null,
                tier: tier,
                accessTimes: []
            });
        }

        const pattern = this.accessPatterns.get(memoryId);
        pattern.count++;
        pattern.lastAccess = Date.now();
        pattern.accessTimes.push(Date.now());

        // Keep only last 100 access times
        if (pattern.accessTimes.length > 100) {
            pattern.accessTimes = pattern.accessTimes.slice(-100);
        }
    }

    /**
     * Access a memory (increments access count)
     * @param {string} memoryId - Memory ID to access
     * @returns {Object|null} Memory object or null if not found
     */
    accessMemory(memoryId) {
        let memory = null;
        let tier = null;

        // Search in all tiers
        if (this.episodicMemory.has(memoryId)) {
            memory = this.episodicMemory.get(memoryId);
            tier = 'episodic';
        } else if (this.semanticMemory.has(memoryId)) {
            memory = this.semanticMemory.get(memoryId);
            tier = 'semantic';
        } else if (this.padMemory.has(memoryId)) {
            memory = this.padMemory.get(memoryId);
            tier = 'pad';
        }

        if (memory) {
            memory.accessCount = (memory.accessCount || 0) + 1;
            memory.lastAccess = Date.now();
            this.trackAccess(memoryId, tier);
        }

        return memory;
    }

    /**
     * Enforce memory limits for a specific tier
     * @param {string} tier - Memory tier to enforce
     */
    enforceMemoryLimits(tier) {
        let memoryMap, maxLimit;

        switch (tier) {
            case 'episodic':
                memoryMap = this.episodicMemory;
                maxLimit = this.config.maxEpisodicMemories;
                break;
            case 'semantic':
                memoryMap = this.semanticMemory;
                maxLimit = this.config.maxSemanticMemories;
                break;
            case 'pad':
                memoryMap = this.padMemory;
                maxLimit = this.config.maxPadMemories;
                break;
            default:
                return;
        }

        if (memoryMap.size > maxLimit) {
            // Sort by importance and remove lowest importance memories
            const entries = Array.from(memoryMap.entries());
            entries.sort((a, b) => (a[1].importance || 0) - (b[1].importance || 0));

            const toRemove = entries.slice(0, entries.length - maxLimit);
            for (const [id] of toRemove) {
                memoryMap.delete(id);
            }
        }
    }

    /**
     * Schedule consolidation
     */
    scheduleConsolidation() {
        if (this.sleepSchedule) {
            clearTimeout(this.sleepSchedule);
        }

        this.sleepSchedule = setTimeout(() => {
            this.runConsolidationCycle();
            this.sleepSchedule = null;
            this.sleepCounter++;
        }, this.config.consolidationInterval);
    }

    /**
     * Run consolidation cycle
     * @returns {Object} Consolidation results
     */
    runConsolidationCycle() {
        const now = Date.now();
        const results = {
            promoted: 0,
            archived: 0,
            decayed: 0,
            totalProcessed: 0,
            errors: []
        };

        try {
            // Reset promotion tracking
            this.promoteToSemantic = [];

            // Process episodic memories for promotion
            for (const [id, memory] of this.episodicMemory.entries()) {
                results.totalProcessed++;
                
                try {
                    // Update promotion score
                    memory.promotionScore = this.calculatePromotionScore(memory);

                    // Check for promotion
                    if (this.shouldPromote(memory)) {
                        this.promoteToSemanticMemory(memory);
                        results.promoted++;
                    }

                    // Check for expiration
                    if (now - memory.timestamp > this.config.episodicMaxAge) {
                        this.episodicMemory.delete(id);
                    }
                } catch (err) {
                    results.errors.push(`Error processing episodic memory ${id}: ${err.message}`);
                }
            }

            // Archive old pad memories
            results.archived = this.archiveOldPadMemories();

            // Decay unused memories
            results.decayed = this.decayUnusedMemories();

            // Update last consolidation time
            this.lastConsolidation = now;

            // Enforce memory limits
            this.enforceMemoryLimits('episodic');
            this.enforceMemoryLimits('semantic');
            this.enforceMemoryLimits('pad');

            // Save state
            this.save();

        } catch (err) {
            results.errors.push(`Consolidation cycle error: ${err.message}`);
        }

        return results;
    }

    /**
     * Get promotion history
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Promotion history
     */
    getPromotionHistory(limit = 100) {
        return this.promotionHistory.slice(-limit);
    }

    /**
     * Get semantic memory by concept
     * @param {string} concept - Concept to search for
     * @returns {Object|null} Semantic memory or null
     */
    getSemanticMemory(concept) {
        // Search by concept
        for (const [id, memory] of this.semanticMemory.entries()) {
            if (memory.concepts && memory.concepts.includes(concept.toLowerCase())) {
                return memory;
            }
        }

        // Return null if not found
        return null;
    }

    /**
     * Get all memories containing a specific concept
     * @param {string} concept - Concept to search for
     * @returns {Array} Matching memories
     */
    getMemoriesByConcept(concept) {
        const results = [];
        const lowerConcept = concept.toLowerCase();

        // Search episodic memories
        for (const memory of this.episodicMemory.values()) {
            if (memory.concepts && memory.concepts.includes(lowerConcept)) {
                results.push({ ...memory, tier: 'episodic' });
            }
        }

        // Search semantic memories
        for (const memory of this.semanticMemory.values()) {
            if (memory.concepts && memory.concepts.includes(lowerConcept)) {
                results.push({ ...memory, tier: 'semantic' });
            }
        }

        return results;
    }

    /**
     * Get statistics about memory system
     * @returns {Object} Memory statistics
     */
    getStats() {
        return {
            totalEpisodic: this.episodicMemory.size,
            totalSemantic: this.semanticMemory.size,
            totalPad: this.padMemory.size,
            totalPromotions: this.promotionHistory.length,
            lastPromotion: this.promotionHistory[this.promotionHistory.length - 1] || null,
            lastConsolidation: this.lastConsolidation,
            sleepCounter: this.sleepCounter,
            config: { ...this.config }
        };
    }

    /**
     * Save state to disk
     */
    save() {
        try {
            const stateDir = path.dirname(this.stateFilePath);
            
            // Ensure directory exists
            if (!fs.existsSync(stateDir)) {
                fs.mkdirSync(stateDir, { recursive: true });
            }

            const state = {
                episodicMemory: Array.from(this.episodicMemory.entries()),
                semanticMemory: Array.from(this.semanticMemory.entries()),
                padMemory: Array.from(this.padMemory.entries()),
                promotionHistory: this.promotionHistory.slice(-1000), // Keep last 1000
                accessPatterns: Array.from(this.accessPatterns.entries()),
                lastConsolidation: this.lastConsolidation,
                sleepCounter: this.sleepCounter,
                savedAt: Date.now()
            };

            fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
        } catch (err) {
            console.error('Failed to save memory consolidation state:', err.message);
        }
    }

    /**
     * Load state from disk
     */
    load() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf8');
                const state = JSON.parse(data);

                this.episodicMemory = new Map(state.episodicMemory || []);
                this.semanticMemory = new Map(state.semanticMemory || []);
                this.padMemory = new Map(state.padMemory || []);
                this.promotionHistory = state.promotionHistory || [];
                this.accessPatterns = new Map(state.accessPatterns || []);
                this.lastConsolidation = state.lastConsolidation || null;
                this.sleepCounter = state.sleepCounter || 0;
            }
        } catch (err) {
            console.error('Failed to load memory consolidation state:', err.message);
            // Initialize with empty state on error
            this.episodicMemory = new Map();
            this.semanticMemory = new Map();
            this.padMemory = new Map();
            this.promotionHistory = [];
            this.accessPatterns = new Map();
        }
    }

    /**
     * Start automatic consolidation
     */
    start() {
        this.scheduleConsolidation();
        console.log('Memory consolidation started with interval:', this.config.consolidationInterval);
    }

    /**
     * Stop automatic consolidation
     */
    stop() {
        if (this.sleepSchedule) {
            clearTimeout(this.sleepSchedule);
            this.sleepSchedule = null;
        }
        this.save();
        console.log('Memory consolidation stopped');
    }

    /**
     * Clear all memories (use with caution)
     */
    clear() {
        this.episodicMemory.clear();
        this.semanticMemory.clear();
        this.padMemory.clear();
        this.promotionHistory = [];
        this.promoteToSemantic = [];
        this.accessPatterns.clear();
        this.lastConsolidation = null;
    }
}

module.exports = MemoryConsolidation;
