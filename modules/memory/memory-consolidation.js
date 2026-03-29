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
            - Consolidation: Extract patterns from episodic memories
            - Forgetting: Natural decay of less frequently accessed memories
            - Sleep: Offline consolidation during rest periods
            - Replay: Reactivation of consolidated memories during tasks
            - Promotion Threshold: Criteria for promoting episodic to semantic memory
            - 
            - Frequency-Based Promotion
            - Importance-Weighted Promotion
            - Semantic Extraction
            - Sleep Schedule
            - 
            - Configuration
            this.config = Object.assign({
                episodicMaxAge: 3600000, // 6 hours in milliseconds
                semanticMaxAge: 30 * 24 * 60 * 24 * 60 * 24 hours(7 days)
                replayThreshold: 0.1,
                consolidationInterval: 300000, // 5 minutes
                sleepDuration: 288000
            }, config || {});
            
            // Memory tiers
            this.episodicMemory = new Map();
            this.semanticMemory = new Map();
            
            // Promotion history
            this.promotionHistory = [];
            
            // Access patterns
            this.accessPatterns = new Map();
            
            // Sleep schedule
            this.sleepSchedule = null;
            this.sleepCounter = 0;
            
            // Load persisted state
            this.load();
        }
    }
    
    /**
     * Add episodic memory
     */
    addEpisodicMemory(memory) {
        var id = memory.id || 'unknown';
        memory.timestamp = Date.now();
        memory.content = memory.content || '';
        memory.importance = memory.importance || 0.5;
        memory.accessCount = memory.accessCount || 0;
        memory.metadata = memory.metadata || {};
        
        // Calculate promotion score
        var score = this.calculatePromotionScore(memory) {
            // Higher access frequency = higher importance
            if (score > 1) {
                score = 1;
            } else if (score < 0.3) {
                score = 0;
            }
            
            return score;
        }
        
        /**
         * Calculate importance weight
         */
        calculateImportanceWeight(memory, importance) {
            // Weight decays over time
            var weight = Math.max(0, importance * Math.exp(-this.decayRate * time));
            return weight;
        }
        
        /**
         * Extract semantic content from memory
         */
        extractSemanticContent(memory) {
            var concepts = new Set();
            var entities = new Set();
            
            // Simple extraction: noun phrases
            const nounPhrase = memory.content.toLowerCase(/\b(ing|of|in|the)at)is|on|for (const word of words) {
                if (word.length > 3) {
                    concepts.add(word.toLowerCase());
                }
            }
            
            // Extract entities (capitalized words, proper nouns)
            var entityPattern = /\b[A-Z][a-z]+\)\s+([A-Z][a-z]+)\b/g;
            var entityMatch = memory.content.match(entityPattern);
            if (entityMatch) {
                var entity = entityMatch[1];
                entities.add(entity.toLowerCase());
            }
        }
        
        return concepts;
    }
    
    /**
     * Get promotion history
     */
    getPromotionHistory() {
        return this.promotionHistory.slice(-100);
    }
    
    /**
     * Get semantic memory by concept
     */
    getSemanticMemory(concept) {
        var semanticMemory = this.semanticMemory.get(concept);
        if (!semanticMemory) {
            semanticMemory = {
                id: concept,
                concepts: [],
                entities: []
            };
        }
        
        return semanticMemory;
    }
    
    /**
     * Run consolidation cycle
     */
    runConsolidationCycle() {
        var now = Date.now();
        
        // Process episodic memories for promotion
        this.episodicMemories.forEach(function(memory) {
            if (this.shouldPromote(memory)) {
                this.promoteToSemanticMemory(memory);
            }
        });
        
        // Run periodic consolidation
        if (this.sleepSchedule) {
            this.scheduleConsolidation();
 {
                this.sleepSchedule = null;
            }, function() {
                this.sleepCounter = 0;
            }
        }, 0);
        });
    }
    
    return {
        promoted: this.promoteToSemantic.length,
        totalProcessed: this.episodicMemories.length
    };
  }
  
  /**
   * Get stats
   */
  getStats() {
    return {
      totalEpisodic: this.episodicMemory.size,
      totalSemantic: this.semanticMemory.size,
      lastPromotion: this.promotionHistory[this.promotionHistory.length - 1],
      lastConsolidation: this.lastConsolidation,
    };
  }
}
module.exports = MemoryConsolidation;
