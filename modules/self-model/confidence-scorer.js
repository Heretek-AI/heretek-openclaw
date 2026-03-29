#!/usr/bin/env node
/**
 * Confidence Scorer - Evaluates reasoning confidence
 * 
 * This module scores confidence levels across different domains and reasoning
 * contexts. It's essential for the "every thinking" autonomy as it allows
 * the collective to know how confident it is in its reasoning.
 * 
 * Factors that affect confidence:
 * - Evidence quality (sources, citations)
 * - Consistency with known facts
 * - Source reliability
 * - Time since last validation
 * - Number of supporting sources
 * 
 * Usage:
 *   const ConfidenceScorer = require('./confidence-scorer.js');
 *   const scorer = new ConfidenceScorer();
 *   const score = scorer.score({ evidence: {...}, sources: [...] });
 *   console.log('Confidence:', score);
 */

const fs = require('fs');

class ConfidenceScorer {
    /**
     * Create a new confidence scorer
     * @param {Object} customWeights - Optional custom weights for scoring factors
     */
    constructor(customWeights = null) {
        this.weights = customWeights || {
            evidence_quality: 0.3,
            consistency: 0.25,
            source_reliability: 0.2,
            recency: 0.15,
            source_count: 0.1
        };
    }

    /**
     * Score reasoning confidence
     * @param {Object} context - Reasoning context with evidence, sources, etc.
     * @returns {number} Confidence score 0-1
     */
    score(context) {
        if (!context || typeof context !== 'object') {
            return 0.5; // Default confidence for empty context
        }

        let confidence = 0.5; // Base confidence
        
        // 1. Evidence quality
        const evidenceScore = this.scoreEvidence(context.evidence);
        confidence += evidenceScore * this.weights.evidence_quality;
        
        // 2. Consistency
        const consistencyScore = this.scoreConsistency(context.consistency);
        confidence += consistencyScore * this.weights.consistency;
        
        // 3. Source reliability
        const reliabilityScore = this.scoreSourceReliability(context.sources);
        confidence += reliabilityScore * this.weights.source_reliability;
        
        // 4. Recency
        const recencyScore = this.scoreRecency(context.timestamp);
        confidence += recencyScore * this.weights.recency;
        
        // 5. Source count
        const countScore = this.scoreSourceCount(context.sourceCount);
        confidence += countScore * this.weights.source_count;
        
        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Score evidence quality
     * @param {Object} evidence - Evidence data
     * @returns {number} Score 0-1
     */
    scoreEvidence(evidence) {
        if (!evidence) return 0.3;
        
        let score = 0;
        
        // Has empirical evidence?
        if (evidence.empirical) score += 0.4;
        
        // Has logical structure?
        if (evidence.logical) score += 0.3;
        
        // Has citations?
        if (evidence.citations && evidence.citations.length > 0) score += 0.3;
        
        return Math.min(1, score);
    }

    /**
     * Score consistency with known facts
     * @param {Object} consistency - Consistency data
     * @returns {number} Score 0-1
     */
    scoreConsistency(consistency) {
        if (!consistency) return 0.3;
        
        // Consistent with known facts?
        if (consistency.isConsistent === true) return 0.9;
        if (consistency.isConsistent === false) return 0.1;
        
        // Has consistency score?
        if (typeof consistency.score === 'number') {
            return Math.max(0, Math.min(1, consistency.score));
        }
        
        return 0.5; // Unknown
    }

    /**
     * Score source reliability
     * @param {Array} sources - Array of source objects
     * @returns {number} Score 0-1
     */
    scoreSourceReliability(sources) {
        if (!sources || sources.length === 0) return 0.2;
        
        let totalReliability = 0;
        for (const source of sources) {
            if (source && typeof source.reliability === 'number') {
                totalReliability += source.reliability;
            } else {
                totalReliability += 0.5; // Default reliability
            }
        }
        
        return Math.min(1, totalReliability / sources.length);
    }

    /**
     * Score recency of information
     * @param {string} timestamp - ISO timestamp
     * @returns {number} Score 0-1
     */
    scoreRecency(timestamp) {
        if (!timestamp) return 0.3;
        
        try {
            const age = Date.now() - new Date(timestamp).getTime();
            const hoursOld = age / (1000 * 60 * 60);
            
            if (hoursOld < 1) return 1.0;
            if (hoursOld < 24) return 0.8;
            if (hoursOld < 168) return 0.6; // 1 week
            if (hoursOld < 720) return 0.4; // 1 month
            
            return 0.2;
        } catch (e) {
            return 0.3;
        }
    }

    /**
     * Score number of sources
     * @param {number} count - Number of sources
     * @returns {number} Score 0-1
     */
    scoreSourceCount(count) {
        if (!count || count === 0) return 0.1;
        if (count >= 5) return 1.0;
        if (count >= 3) return 0.8;
        if (count >= 2) return 0.6;
        
        return 0.4;
    }

    /**
     * Explain confidence score - provides breakdown of contributing factors
     * @param {Object} context - Reasoning context
     * @returns {Object} Detailed breakdown
     */
    explain(context) {
        const score = this.score(context);
        
        const evidenceScore = this.scoreEvidence(context.evidence);
        const consistencyScore = this.scoreConsistency(context.consistency);
        const reliabilityScore = this.scoreSourceReliability(context.sources);
        const recencyScore = this.scoreRecency(context.timestamp);
        const countScore = this.scoreSourceCount(context.sourceCount);

        return {
            score: Math.round(score * 100) / 100,
            factors: {
                evidence_quality: {
                    score: Math.round(evidenceScore * 100) / 100,
                    weight: this.weights.evidence_quality,
                    contribution: Math.round(evidenceScore * this.weights.evidence_quality * 100) / 100
                },
                consistency: {
                    score: Math.round(consistencyScore * 100) / 100,
                    weight: this.weights.consistency,
                    contribution: Math.round(consistencyScore * this.weights.consistency * 100) / 100
                },
                source_reliability: {
                    score: Math.round(reliabilityScore * 100) / 100,
                    weight: this.weights.source_reliability,
                    contribution: Math.round(reliabilityScore * this.weights.source_reliability * 100) / 100
                },
                recency: {
                    score: Math.round(recencyScore * 100) / 100,
                    weight: this.weights.recency,
                    contribution: Math.round(recencyScore * this.weights.recency * 100) / 100
                },
                source_count: {
                    score: Math.round(countScore * 100) / 100,
                    weight: this.weights.source_count,
                    contribution: Math.round(countScore * this.weights.source_count * 100) / 100
                }
            },
            interpretation: this.interpret(score)
        };
    }

    /**
     * Interpret confidence score
     * @param {number} score - Confidence score
     * @returns {string} Interpretation
     */
    interpret(score) {
        if (score >= 0.8) return 'High confidence - strong evidence and reliable sources';
        if (score >= 0.6) return 'Moderate confidence - reasonable evidence';
        if (score >= 0.4) return 'Low confidence - limited evidence';
        if (score >= 0.2) return 'Very low confidence - significant uncertainty';
        return 'Minimal confidence - high uncertainty';
    }

    /**
     * Update scoring weights
     * @param {Object} newWeights - New weight values
     */
    setWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
    }

    /**
     * Get current weights
     * @returns {Object} Current weights
     */
    getWeights() {
        return { ...this.weights };
    }
}

// Main
if (require.main === module) {
    const args = process.argv.slice(2);
    const scorer = new ConfidenceScorer();
    
    // Try to read from stdin
    let context = {};
    try {
        const input = fs.readFileSync(0, 'utf8');
        context = JSON.parse(input);
    } catch (e) {
        // No input from stdin
    }
    
    // Parse args
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--context' && args[i + 1]) {
            try {
                context = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                console.error('Invalid JSON in --context');
            }
        }
    }
    
    if (args.includes('--explain')) {
        console.log(JSON.stringify(scorer.explain(context), null, 2));
    } else if (args.includes('--weights')) {
        console.log(JSON.stringify(scorer.getWeights(), null, 2));
    } else {
        const score = scorer.score(context);
        console.log(score.toFixed(2));
    }
}

module.exports = ConfidenceScorer;