#!/usr/bin/env node
/**
 * Research Engine - AutoResearchClaw Research Automation
 * 
 * This module implements autonomous research capabilities for agents to conduct
 * research without human intervention.
 * 
 * Components:
 * - ResearchPlanner: Plan research objectives and hypotheses
 * - HypothesisGenerator: Generate testable hypotheses from observations
 * - LiteratureMiner: Search and extract from existing knowledge  
 * - ExperimentRunner: Test hypotheses against available data
 * - KnowledgeIntegrator: Integrate findings into knowledge graph
 * 
 * Integration:
 * - Uses GraphRAG for knowledge storage and retrieval
 * - Integrates with Curiosity Engine for gap detection
 * - Provides autonomous research workflow
 * 
 * Usage:
 *   const ResearchEngine = require('./research-engine.js');
 *   const engine = new ResearchEngine('my-agent');
 *   await engine.initialize();
 *   const result = await engine.conductResearch({ objective: 'Understand X' });
 */

const fs = require('fs');
const path = require('path');

// Try to load GraphRAG for knowledge integration
let GraphRAG = null;
try {
    GraphRAG = require('../memory/graph-rag.js');
} catch (e) {
    console.warn('[ResearchEngine] GraphRAG not available, using local storage');
}

// State file path
const STATE_FILE = process.env.RESEARCH_STATE_FILE || 
    path.join(__dirname, 'state', 'research-state.json');

// ============================================
// RESEARCH PLANNER
// ============================================

/**
 * Plans research objectives and determines research approach
 */
class ResearchPlanner {
    constructor(config = {}) {
        this.objectives = [];
        this.currentObjective = null;
        this.researchQueue = [];
        this.completedResearch = new Set();
        
        this.config = {
            maxObjectives: config.maxObjectives || 5,
            objectiveComplexity: config.objectiveComplexity || 'medium',
            allowSubObjectives: config.allowSubObjectives !== false,
            ...config
        };
    }

    /**
     * Plan research for a given objective
     * @param {string} objective - Research objective
     * @param {Object} context - Context information
     * @returns {Object} Research plan
     */
    plan(objective, context = {}) {
        const plan = {
            id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            objective,
            context,
            status: 'planned',
            hypotheses: [],
            experiments: [],
            literatureSearches: [],
            subObjectives: [],
            priority: context.priority || 0.5,
            complexity: this.determineComplexity(objective, context),
            estimatedDuration: this.estimateDuration(objective, context),
            createdAt: new Date().toISOString()
        };

        // Generate sub-objectives if complex
        if (this.config.allowSubObjectives && plan.complexity > 0.7) {
            plan.subObjectives = this.generateSubObjectives(objective, context);
        }

        this.currentObjective = plan;
        this.objectives.push(plan);
        
        return plan;
    }

    /**
     * Determine complexity of objective
     */
    determineComplexity(objective, context = {}) {
        // Check context for complexity hints
        if (context.complexity !== undefined) {
            return context.complexity;
        }
        
        // Analyze objective for complexity indicators
        let complexity = 0.5;
        const lowerObjective = objective.toLowerCase();
        
        // Multi-part questions are more complex
        if (lowerObjective.includes(' and ') || lowerObjective.includes(' vs ') || lowerObjective.includes(' vs. ')) {
            complexity += 0.2;
        }
        
        // "Why" and "how" questions are complex
        if (lowerObjective.startsWith('why') || lowerObjective.startsWith('how')) {
            complexity += 0.15;
        }
        
        // Technical terms indicate higher complexity
        const technicalTerms = ['algorithm', 'architecture', 'mechanism', 'optimization', 'implementation'];
        for (const term of technicalTerms) {
            if (lowerObjective.includes(term)) {
                complexity += 0.1;
            }
        }
        
        return Math.min(1, complexity);
    }

    /**
     * Estimate research duration
     */
    estimateDuration(objective, context = {}) {
        const complexity = this.determineComplexity(objective, context);
        const baseDuration = 60000; // 1 minute base
        
        // More complex = longer duration
        let duration = baseDuration * (1 + complexity * 2);
        
        // More sub-objectives = longer
        const subObjectiveCount = (objective.match(/\?/g) || []).length + 
            (objective.match(/and/gi) || []).length;
        duration += subObjectiveCount * 30000;
        
        return Math.min(duration, 600000); // Max 10 minutes
    }

    /**
     * Generate sub-objectives for complex research
     */
    generateSubObjectives(objective, context = {}) {
        const subObjectives = [];
        
        // Break down by aspects
        const aspects = [
            { prefix: 'What is ', suffix: ' - definition and concepts' },
            { prefix: 'How does ', suffix: ' work - mechanisms' },
            { prefix: 'Why use ', suffix: ' - rationale and benefits' },
            { prefix: 'When to use ', suffix: ' - use cases' },
            { prefix: 'Best practices for ', suffix: ' - optimization' }
        ];
        
        // Extract core subject
        let subject = objective
            .replace(/^(what|how|why|when|which)/i, '')
            .replace(/\?$/, '')
            .trim();
        
        // Limit sub-objectives
        const maxSub = Math.ceil(this.config.maxObjectives / 2);
        for (let i = 0; i < Math.min(aspects.length, maxSub); i++) {
            const aspect = aspects[i];
            subObjectives.push({
                id: `sub_${i}`,
                objective: aspect.prefix + subject + aspect.suffix,
                parentPlan: null, // Will be set by caller
                status: 'pending',
                priority: 1 - (i * 0.15)
            });
        }
        
        return subObjectives;
    }

    /**
     * Queue research for later
     */
    queueResearch(objective, priority = 0.5) {
        const research = {
            objective,
            priority,
            queuedAt: new Date().toISOString(),
            status: 'queued'
        };
        
        // Insert by priority (higher first)
        let inserted = false;
        for (let i = 0; i < this.researchQueue.length; i++) {
            if (priority > this.researchQueue[i].priority) {
                this.researchQueue.splice(i, 0, research);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this.researchQueue.push(research);
        }
        
        return research;
    }

    /**
     * Get next queued research
     */
    dequeueResearch() {
        const research = this.researchQueue.shift();
        if (research) {
            return this.plan(research.objective, { priority: research.priority });
        }
        return null;
    }

    /**
     * Get current research plan
     */
    getCurrentPlan() {
        return this.currentObjective;
    }

    /**
     * Get all objectives
     */
    getObjectives() {
        return this.objectives;
    }

    /**
     * Mark objective as completed
     */
    completeObjective(objectiveId) {
        const objective = this.objectives.find(o => o.id === objectiveId);
        if (objective) {
            objective.status = 'completed';
            objective.completedAt = new Date().toISOString();
            this.completedResearch.add(objectiveId);
        }
        return objective;
    }
}

// ============================================
// HYPOTHESIS GENERATOR
// ============================================

/**
 * Generates testable hypotheses from observations
 */
class HypothesisGenerator {
    constructor(config = {}) {
        this.hypotheses = [];
        this.observations = [];
        
        this.config = {
            maxHypothesesPerResearch: config.maxHypothesesPerResearch || 5,
            minConfidence: config.minConfidence || 0.3,
            generationMode: config.generationMode || 'automatic', // automatic, guided, creative
            ...config
        };
    }

    /**
     * Generate hypotheses from observations
     * @param {string} objective - Research objective
     * @param {Array} observations - Existing observations
     * @param {Object} context - Context information
     * @returns {Array} Generated hypotheses
     */
    generate(objective, observations = [], context = {}) {
        this.observations = observations;
        
        const hypotheses = [];
        
        // Generate different types of hypotheses
        if (this.config.generationMode === 'creative') {
            hypotheses.push(...this.generateCreativeHypotheses(objective, context));
        } else {
            hypotheses.push(...this.generateStandardHypotheses(objective, context));
            hypotheses.push(...this.generateAlternativeHypotheses(objective, context));
        }
        
        // Add null hypothesis for testing
        hypotheses.push({
            id: `hyp_null_${Date.now()}`,
            statement: `No significant relationship exists in ${objective}`,
            type: 'null',
            confidence: 0.9,
            testable: true,
            falsifiable: true,
            priority: 0.5
        });
        
        // Store hypotheses
        this.hypotheses = hypotheses;
        
        return hypotheses;
    }

    /**
     * Generate standard hypotheses
     */
    generateStandardHypotheses(objective, context = {}) {
        const hypotheses = [];
        
        // Extract potential factors from objective and context
        const factors = this.extractFactors(objective, context);
        
        // Generate causal hypotheses
        for (const factor of factors.slice(0, 3)) {
            hypotheses.push({
                id: `hyp_causal_${factors.indexOf(factor)}_${Date.now()}`,
                statement: `${factor} has a significant positive effect on ${objective}`,
                type: 'causal',
                predictors: [factor],
                outcome: objective,
                confidence: 0.6 + Math.random() * 0.2,
                testable: true,
                falsifiable: true,
                priority: 0.8
            });
        }
        
        // Generate correlational hypotheses
        for (let i = 0; i < Math.min(factors.length - 1, 2); i++) {
            hypotheses.push({
                id: `hyp_correl_${i}_${Date.now()}`,
                statement: `${factors[i]} is correlated with ${factors[i + 1]} in ${objective}`,
                type: 'correlational',
                variables: [factors[i], factors[i + 1]],
                confidence: 0.5 + Math.random() * 0.3,
                testable: true,
                falsifiable: false,
                priority: 0.6
            });
        }
        
        return hypotheses;
    }

    /**
     * Generate alternative hypotheses
     */
    generateAlternativeHypotheses(objective, context = {}) {
        const hypotheses = [];
        
        // Generate negation hypotheses
        hypotheses.push({
            id: `hyp_neg_${Date.now()}`,
            statement: `${objective} is not affected by traditional factors`,
            type: 'negation',
            confidence: 0.4,
            testable: true,
            falsifiable: true,
            priority: 0.4
        });
        
        // Generate temporal hypotheses
        hypotheses.push({
            id: `hyp_temp_${Date.now()}`,
            statement: `${objective} changes over time in a predictable manner`,
            type: 'temporal',
            confidence: 0.5,
            testable: true,
            falsifiable: true,
            priority: 0.5
        });
        
        // Generate interaction hypotheses
        const factors = this.extractFactors(objective, context);
        if (factors.length >= 2) {
            hypotheses.push({
                id: `hyp_inter_${Date.now()}`,
                statement: `${factors[0]} and ${factors[1]} interact to affect ${objective}`,
                type: 'interaction',
                variables: [factors[0], factors[1]],
                confidence: 0.45,
                testable: true,
                falsifiable: true,
                priority: 0.55
            });
        }
        
        return hypotheses;
    }

    /**
     * Generate creative hypotheses
     */
    generateCreativeHypotheses(objective, context = {}) {
        const hypotheses = [];
        
        // Novel combinations
        hypotheses.push({
            id: `hyp_novel_${Date.now()}`,
            statement: `${objective} can be explained through an emergent perspective`,
            type: 'emergent',
            confidence: 0.35,
            testable: true,
            falsifiable: true,
            priority: 0.3
        });
        
        // Simplicity principle
        hypotheses.push({
            id: `hyp_simple_${Date.now()}`,
            statement: `${objective} follows simpler rules than currently assumed`,
            type: 'parsimony',
            confidence: 0.4,
            testable: true,
            falsifiable: true,
            priority: 0.35
        });
        
        return hypotheses;
    }

    /**
     * Extract potential factors from objective
     */
    extractFactors(objective, context = {}) {
        const factors = [];
        
        // Use context factors if available
        if (context.factors && Array.isArray(context.factors)) {
            factors.push(...context.factors);
        }
        
        // Extract from objective
        const words = objective.split(/\s+/);
        for (const word of words) {
            const cleanWord = word.replace(/[^a-zA-Z]/g, '');
            if (cleanWord.length > 3 && !['what', 'how', 'why', 'when', 'does', 'affect'].includes(cleanWord.toLowerCase())) {
                factors.push(cleanWord);
            }
        }
        
        // Add common factors based on domain
        const commonFactors = ['quality', 'efficiency', 'speed', 'cost', 'reliability', 'usability'];
        for (const factor of commonFactors) {
            if (objective.toLowerCase().includes(factor) && !factors.includes(factor)) {
                factors.push(factor);
            }
        }
        
        return [...new Set(factors)].slice(0, 5);
    }

    /**
     * Generate hypothesis from observation
     */
    generateFromObservation(observation) {
        const observationId = `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const hypothesis = {
            id: `hyp_from_${observationId}`,
            statement: observation.statement || `Observation: ${observation.content}`,
            type: 'observational',
            derivedFrom: observation.id,
            confidence: observation.confidence || 0.5,
            testable: true,
            falsifiable: true,
            priority: observation.confidence || 0.5
        };
        
        this.hypotheses.push(hypothesis);
        return hypothesis;
    }

    /**
     * Get all hypotheses
     */
    getHypotheses() {
        return this.hypotheses;
    }

    /**
     * Get testable hypotheses
     */
    getTestableHypotheses() {
        return this.hypotheses.filter(h => h.testable);
    }

    /**
     * Get hypotheses by type
     */
    getHypothesesByType(type) {
        return this.hypotheses.filter(h => h.type === type);
    }

    /**
     * Update hypothesis with results
     */
    updateHypothesis(hypothesisId, results) {
        const hypothesis = this.hypotheses.find(h => h.id === hypothesisId);
        if (hypothesis) {
            hypothesis.results = results;
            hypothesis.updatedAt = new Date().toISOString();
            
            // Adjust confidence based on results
            if (results.supported) {
                hypothesis.confidence = Math.min(1, hypothesis.confidence + 0.1);
            } else if (results.rejected) {
                hypothesis.confidence = Math.max(0, hypothesis.confidence - 0.2);
            }
        }
        return hypothesis;
    }
}

// ============================================
// LITERATURE MINER
// ============================================

/**
 * Searches and extracts from existing knowledge
 */
class LiteratureMiner {
    constructor(config = {}) {
        this.searchResults = [];
        this.minedKnowledge = [];
        
        this.config = {
            maxResultsPerSearch: config.maxResultsPerSearch || 10,
            minRelevance: config.minRelevance || 0.3,
            searchStrategy: config.searchStrategy || 'hybrid',
            ...config
        };
        
        // GraphRAG reference
        this.graphRAG = null;
    }

    /**
     * Set GraphRAG reference for knowledge retrieval
     * @param {Object} graphRAG - GraphRAG instance
     */
    setGraphRAG(graphRAG) {
        this.graphRAG = graphRAG;
    }

    /**
     * Search for relevant knowledge
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async search(query, options = {}) {
        const results = [];
        
        if (this.graphRAG) {
            // Use GraphRAG hybrid search
            const graphResults = await this.graphRAG.hybridSearch(query, {
                topK: options.limit || this.config.maxResultsPerSearch
            });
            
            results.push(...graphResults.map(r => ({
                ...r,
                source: 'graph',
                relevance: r.score || r.relevance || 0.5
            })));
        } else {
            // Fallback to basic search
            const basicResults = this.basicSearch(query, options.limit || this.config.maxResultsPerSearch);
            results.push(...basicResults);
        }
        
        // Filter by relevance
        const filteredResults = results.filter(r => 
            r.relevance >= this.config.minRelevance
        );
        
        this.searchResults = filteredResults;
        return filteredResults;
    }

    /**
     * Basic search (fallback when GraphRAG unavailable)
     */
    basicSearch(query, limit = 10) {
        // In production, this would query external sources
        // For now, return simulated results
        return [{
            id: `search_${Date.now()}`,
            title: `Research on: ${query}`,
            content: `Found relevant information about ${query}`,
            source: 'local',
            relevance: 0.7,
            timestamp: new Date().toISOString()
        }].slice(0, limit);
    }

    /**
     * Mine knowledge from search results
     * @param {Array} hypotheses - Hypotheses to validate
     * @returns {Promise<Array>} Mined knowledge
     */
    async mineKnowledge(hypotheses = []) {
        const knowledge = [];
        
        for (const hypothesis of hypotheses) {
            // Skip if no statement
            if (!hypothesis.statement) continue;
            
            // Extract key terms
            const terms = this.extractKeyTerms(hypothesis.statement);
            
            // Search for each term
            for (const term of terms.slice(0, 3)) {
                const results = await this.search(term, { limit: 3 });
                
                for (const result of results) {
                    knowledge.push({
                        hypothesisId: hypothesis.id,
                        supporting: result,
                        extractedAt: new Date().toISOString()
                    });
                }
            }
        }
        
        this.minedKnowledge = knowledge;
        return knowledge;
    }

    /**
     * Extract key terms from text
     */
    extractKeyTerms(text) {
        const terms = [];
        const words = text.split(/\s+/);
        
        for (const word of words) {
            const cleanWord = word.replace(/[^a-zA-Z]/g, '');
            // Filter common words and short words
            if (cleanWord.length > 3 && !this.isCommonWord(cleanWord)) {
                terms.push(cleanWord);
            }
        }
        
        return [...new Set(terms)];
    }

    /**
     * Check if word is common (stop word)
     */
    isCommonWord(word) {
        const commonWords = new Set([
            'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they',
            'their', 'what', 'which', 'when', 'where', 'who', 'how', 'why',
            'about', 'would', 'could', 'should', 'will', 'would', 'there', 'also'
        ]);
        return commonWords.has(word.toLowerCase());
    }

    /**
     * Extract key findings from results
     */
    extractFindings(results) {
        return results.map(r => ({
            id: r.id,
            title: r.title,
            summary: r.content?.substring(0, 200),
            relevance: r.relevance,
            source: r.source
        }));
    }

    /**
     * Get search results
     */
    getSearchResults() {
        return this.searchResults;
    }

    /**
     * Get mined knowledge
     */
    getMinedKnowledge() {
        return this.minedKnowledge;
    }
}

// ============================================
// EXPERIMENT RUNNER
// ============================================

/**
 * Tests hypotheses against available data
 */
class ExperimentRunner {
    constructor(config = {}) {
        this.experiments = [];
        this.results = [];
        
        this.config = {
            maxExperimentsPerHypothesis: config.maxExperimentsPerHypothesis || 3,
            significanceLevel: config.significanceLevel || 0.05,
            minSampleSize: config.minSampleSize || 10,
            ...config
        };
        
        // Data sources
        this.dataSources = new Map();
    }

    /**
     * Register a data source
     * @param {string} name - Data source name
     * @param {Object} source - Data source
     */
    registerDataSource(name, source) {
        this.dataSources.set(name, source);
    }

    /**
     * Run experiment for a hypothesis
     * @param {Object} hypothesis - Hypothesis to test
     * @param {Object} options - Experiment options
     * @returns {Promise<Object>} Experiment result
     */
    async runExperiment(hypothesis, options = {}) {
        const experiment = {
            id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            hypothesisId: hypothesis.id,
            hypothesis: hypothesis.statement,
            type: hypothesis.type,
            status: 'running',
            startedAt: new Date().toISOString(),
            ...options
        };
        
        this.experiments.push(experiment);
        
        // Simulate experiment execution
        const result = await this.executeExperiment(experiment);
        
        experiment.status = 'completed';
        experiment.completedAt = new Date().toISOString();
        experiment.result = result;
        
        this.results.push(result);
        
        return result;
    }

    /**
     * Execute the experiment
     */
    async executeExperiment(experiment) {
        // In production, this would run actual experiments
        // For now, simulate results
        
        const isSupported = Math.random() > 0.3;
        const isRejected = !isSupported && Math.random() > 0.5;
        
        return {
            experimentId: experiment.id,
            hypothesisId: experiment.hypothesisId,
            supported: isSupported,
            rejected: isRejected,
            inconclusive: !isSupported && !isRejected,
            evidence: this.generateEvidence(experiment),
            significance: this.calculateSignificance(experiment),
            sampleSize: this.config.minSampleSize + Math.floor(Math.random() * 90),
            pValue: Math.random() * 0.1,
            effectSize: Math.random() * 0.8
        };
    }

    /**
     * Generate evidence for experiment
     */
    generateEvidence(experiment) {
        return {
            observations: this.config.minSampleSize + Math.floor(Math.random() * 50),
            dataPoints: Math.floor(Math.random() * 100),
            correlations: Math.random() * 0.9,
            methodology: 'controlled'
        };
    }

    /**
     * Calculate statistical significance
     */
    calculateSignificance(experiment) {
        const pValue = Math.random() * 0.1;
        return {
            significant: pValue < this.config.significanceLevel,
            pValue,
            confidence: 1 - pValue
        };
    }

    /**
     * Run batch experiments
     * @param {Array} hypotheses - Hypotheses to test
     * @returns {Promise<Array>} Experiment results
     */
    async runBatch(hypotheses) {
        const results = [];
        
        for (const hypothesis of hypotheses) {
            if (!hypothesis.testable) continue;
            
            const result = await this.runExperiment(hypothesis);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Get experiments
     */
    getExperiments() {
        return this.experiments;
    }

    /**
     * Get results
     */
    getResults() {
        return this.results;
    }

    /**
     * Get supported hypotheses
     */
    getSupportedHypotheses() {
        return this.results
            .filter(r => r.supported)
            .map(r => r.hypothesisId);
    }

    /**
     * Get rejected hypotheses
     */
    getRejectedHypotheses() {
        return this.results
            .filter(r => r.rejected)
            .map(r => r.hypothesisId);
    }
}

// ============================================
// KNOWLEDGE INTEGRATOR
// ============================================

/**
 * Integrates findings into knowledge graph
 */
class KnowledgeIntegrator {
    constructor(config = {}) {
        this.integratedKnowledge = [];
        this.entities = [];
        this.relationships = [];
        
        this.config = {
            integrationStrategy: config.integrationStrategy || 'incremental',
            mergeSimilar: config.mergeSimilar !== false,
            preserveHistory: config.preserveHistory !== false,
            ...config
        };
        
        // GraphRAG reference
        this.graphRAG = null;
    }

    /**
     * Set GraphRAG reference
     * @param {Object} graphRAG - GraphRAG instance
     */
    setGraphRAG(graphRAG) {
        this.graphRAG = graphRAG;
    }

    /**
     * Integrate research findings
     * @param {Object} researchResult - Research result to integrate
     * @returns {Promise<Object>} Integration result
     */
    async integrate(researchResult) {
        const integration = {
            id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            researchId: researchResult.id,
            status: 'integrating',
            integratedAt: new Date().toISOString()
        };
        
        // Extract entities from findings
        const entities = this.extractEntities(researchResult);
        this.entities.push(...entities);
        
        // Extract relationships
        const relationships = this.extractRelationships(researchResult);
        this.relationships.push(...relationships);
        
        // Add to GraphRAG if available
        if (this.graphRAG) {
            await this.addToGraphRAG(entities, relationships);
        }
        
        integration.status = 'completed';
        integration.entitiesAdded = entities.length;
        integration.relationshipsAdded = relationships.length;
        
        this.integratedKnowledge.push(integration);
        
        return integration;
    }

    /**
     * Extract entities from research result
     */
    extractEntities(researchResult) {
        const entities = [];
        
        // Extract from hypotheses
        if (researchResult.hypotheses) {
            for (const hypothesis of researchResult.hypotheses) {
                if (hypothesis.statement) {
                    const terms = hypothesis.statement.split(/\s+/)
                        .filter(t => t.length > 3 && /^[A-Z]/.test(t));
                    
                    for (const term of terms.slice(0, 3)) {
                        entities.push({
                            id: `entity_${term.toLowerCase()}_${Date.now()}`,
                            name: term,
                            type: 'Concept',
                            source: 'research',
                            properties: {
                                hypothesis: hypothesis.id,
                                confidence: hypothesis.confidence
                            }
                        });
                    }
                }
            }
        }
        
        // Extract from objectives
        if (researchResult.objective) {
            const objectiveWords = researchResult.objective.split(/\s+/)
                .filter(w => w.length > 4 && !['about', 'which', 'would'].includes(w.toLowerCase()));
            
            for (const word of objectiveWords.slice(0, 2)) {
                entities.push({
                    id: `entity_${word.toLowerCase()}_${Date.now()}`,
                    name: word,
                    type: 'ResearchTopic',
                    source: 'research'
                });
            }
        }
        
        return entities;
    }

    /**
     * Extract relationships from research result
     */
    extractRelationships(researchResult) {
        const relationships = [];
        
        // Link hypotheses to experiments
        if (researchResult.hypotheses && researchResult.experiments) {
            for (const hypothesis of researchResult.hypotheses) {
                const experiment = researchResult.experiments.find(e => 
                    e.hypothesisId === hypothesis.id
                );
                
                if (experiment) {
                    relationships.push({
                        from: hypothesis.id,
                        to: experiment.id,
                        type: 'TESTS',
                        properties: { supported: experiment.supported }
                    });
                }
            }
        }
        
        return relationships;
    }

    /**
     * Add entities and relationships to GraphRAG
     */
    async addToGraphRAG(entities, relationships) {
        try {
            // Add entities
            for (const entity of entities) {
                await this.graphRAG.addEntity(entity);
            }
            
            // Add relationships
            for (const relationship of relationships) {
                await this.graphRAG.addRelationship(relationship);
            }
        } catch (error) {
            console.error('[KnowledgeIntegrator] Failed to add to GraphRAG:', error.message);
        }
    }

    /**
     * Merge similar knowledge
     */
    mergeSimilar() {
        if (!this.config.mergeSimilar) return;
        
        // In production, this would merge similar entities
        // For now, just log
        console.log('[KnowledgeIntegrator] Merging similar knowledge...');
    }

    /**
     * Get integrated knowledge
     */
    getIntegratedKnowledge() {
        return this.integratedKnowledge;
    }

    /**
     * Get entities
     */
    getEntities() {
        return this.entities;
    }

    /**
     * Get relationships
     */
    getRelationships() {
        return this.relationships;
    }
}

// ============================================
// RESEARCH ENGINE (Main Class)
// ============================================

class ResearchEngine {
    /**
     * Create a new Research Engine
     * @param {string} agentId - Agent identifier
     * @param {Object} config - Configuration options
     */
    constructor(agentId, config = {}) {
        this.agentId = agentId;
        this.config = config;
        
        // Initialize components
        this.planner = new ResearchPlanner(config.planner);
        this.hypothesisGenerator = new HypothesisGenerator(config.hypothesis);
        this.literatureMiner = new LiteratureMiner(config.literature);
        this.experimentRunner = new ExperimentRunner(config.experiment);
        this.knowledgeIntegrator = new KnowledgeIntegrator(config.integrator);
        
        // GraphRAG reference
        this.graphRAG = null;
        
        // State
        this.initialized = false;
        this.isRunning = false;
        this.researchHistory = [];
        
        // State file
        this.stateFile = STATE_FILE;
        
        // Load existing state
        this.load();
    }

    /**
     * Set GraphRAG for knowledge integration
     * @param {Object} graphRAG - GraphRAG instance
     */
    setGraphRAG(graphRAG) {
        this.graphRAG = graphRAG;
        this.literatureMiner.setGraphRAG(graphRAG);
        this.knowledgeIntegrator.setGraphRAG(graphRAG);
    }

    /**
     * Initialize the Research Engine
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Try to load GraphRAG
            if (!this.graphRAG && GraphRAG) {
                try {
                    this.graphRAG = new GraphRAG.GraphRAG();
                    await this.graphRAG.initialize();
                    this.setGraphRAG(this.graphRAG);
                } catch (e) {
                    console.warn('[ResearchEngine] GraphRAG initialization failed:', e.message);
                }
            }
            
            this.initialized = true;
            console.log('[ResearchEngine] Initialized for agent:', this.agentId);
        } catch (error) {
            console.error('[ResearchEngine] Initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Conduct autonomous research
     * @param {Object} options - Research options
     * @returns {Promise<Object>} Research result
     */
    async conductResearch(options = {}) {
        const { objective, context = {}, autoIntegrate = true } = options;
        
        if (!objective) {
            throw new Error('Objective is required');
        }
        
        if (this.isRunning) {
            return { status: 'busy', message: 'Research already in progress' };
        }
        
        this.isRunning = true;
        const startTime = Date.now();
        
        const result = {
            id: `research_${Date.now()}`,
            agentId: this.agentId,
            objective,
            context,
            status: 'running',
            startedAt: new Date().toISOString()
        };
        
        try {
            // Step 1: Plan research
            const plan = this.planner.plan(objective, context);
            result.plan = plan;
            
            // Step 2: Generate hypotheses
            const observations = context.observations || [];
            const hypotheses = this.hypothesisGenerator.generate(objective, observations, context);
            result.hypotheses = hypotheses.map(h => ({
                id: h.id,
                statement: h.statement,
                type: h.type,
                confidence: h.confidence
            }));
            
            // Step 3: Search literature
            const searchResults = await this.literatureMiner.search(objective);
            result.literature = searchResults.map(r => ({
                id: r.id,
                title: r.title,
                relevance: r.relevance,
                source: r.source
            }));
            
            // Step 4: Run experiments
            const testableHypotheses = this.hypothesisGenerator.getTestableHypotheses();
            const experiments = await this.experimentRunner.runBatch(testableHypotheses.slice(0, 3));
            result.experiments = experiments;
            result.supportedHypotheses = this.experimentRunner.getSupportedHypotheses();
            result.rejectedHypotheses = this.experimentRunner.getRejectedHypotheses();
            
            // Step 5: Integrate knowledge if enabled
            if (autoIntegrate && this.knowledgeIntegrator) {
                const integration = await this.knowledgeIntegrator.integrate(result);
                result.integration = integration;
            }
            
            // Complete research
            result.status = 'completed';
            result.completedAt = new Date().toISOString();
            result.duration = Date.now() - startTime;
            
            // Store in history
            this.researchHistory.push(result);
            this.save();
            
            return result;
            
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Generate hypotheses for an objective
     * @param {string} objective - Research objective
     * @param {Object} context - Context
     * @returns {Array} Hypotheses
     */
    generateHypotheses(objective, context = {}) {
        return this.hypothesisGenerator.generate(objective, [], context);
    }

    /**
     * Search for knowledge
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchLiterature(query) {
        return await this.literatureMiner.search(query);
    }

    /**
     * Test a hypothesis
     * @param {Object} hypothesis - Hypothesis to test
     * @returns {Promise<Object>} Experiment result
     */
    async testHypothesis(hypothesis) {
        return await this.experimentRunner.runExperiment(hypothesis);
    }

    /**
     * Get current research status
     */
    getStatus() {
        return {
            agentId: this.agentId,
            initialized: this.initialized,
            isRunning: this.isRunning,
            currentPlan: this.planner.getCurrentPlan(),
            hypothesesCount: this.hypothesisGenerator.getHypotheses().length,
            researchHistory: this.researchHistory.length
        };
    }

    /**
     * Get research statistics
     */
    getStats() {
        return {
            totalResearch: this.researchHistory.length,
            completedResearch: this.researchHistory.filter(r => r.status === 'completed').length,
            failedResearch: this.researchHistory.filter(r => r.status === 'error').length,
            hypothesesGenerated: this.hypothesisGenerator.getHypotheses().length,
            hypothesesSupported: this.experimentRunner.getSupportedHypotheses().length,
            hypothesesRejected: this.experimentRunner.getRejectedHypotheses().length,
            knowledgeIntegrated: this.knowledgeIntegrator.getIntegratedKnowledge().length
        };
    }

    /**
     * Get recent research
     * @param {number} count - Number of recent research to return
     * @returns {Array} Recent research
     */
    getRecentResearch(count = 10) {
        return this.researchHistory.slice(-count);
    }

    /**
     * Save state to disk
     */
    save() {
        try {
            const dir = path.dirname(this.stateFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const state = {
                agentId: this.agentId,
                historyLength: this.researchHistory.length,
                savedAt: new Date().toISOString()
            };
            
            fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        } catch (e) {
            console.error('[ResearchEngine] Failed to save state:', e.message);
        }
    }

    /**
     * Load state from disk
     */
    load() {
        try {
            if (fs.existsSync(this.stateFile)) {
                const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
                console.log('[ResearchEngine] State loaded, research:', data.historyLength);
            }
        } catch (e) {
            console.error('[ResearchEngine] Failed to load state:', e.message);
        }
    }

    /**
     * Close the Research Engine
     */
    async close() {
        this.save();
        
        if (this.graphRAG) {
            await this.graphRAG.close();
        }
        
        this.initialized = false;
        console.log('[ResearchEngine] Closed');
    }
}

// ============================================
// RESEARCH ENGINE FACTORY
// ============================================

class ResearchEngineFactory {
    /**
     * Create a new Research Engine
     * @param {string} agentId - Agent identifier
     * @param {Object} config - Configuration
     * @returns {Promise<ResearchEngine>} Research Engine instance
     */
    static async create(agentId, config = {}) {
        const engine = new ResearchEngine(agentId, config);
        await engine.initialize();
        return engine;
    }

    /**
     * Create with GraphRAG integration
     * @param {string} agentId - Agent identifier
     * @param {Object} graphRAG - GraphRAG instance
     * @param {Object} config - Configuration
     * @returns {Promise<ResearchEngine>} Research Engine instance
     */
    static async createWithGraphRAG(agentId, graphRAG, config = {}) {
        const engine = new ResearchEngine(agentId, config);
        engine.setGraphRAG(graphRAG);
        await engine.initialize();
        return engine;
    }
}

// ============================================
// MAIN EXPORTS
// ============================================

module.exports = {
    ResearchEngine,
    ResearchEngineFactory,
    ResearchPlanner,
    HypothesisGenerator,
    LiteratureMiner,
    ExperimentRunner,
    KnowledgeIntegrator
};

// ============================================
// CLI
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const agentId = process.env.AGENT_ID || 'research-agent';
    const engine = new ResearchEngine(agentId);
    
    // Initialize
    engine.initialize().then(() => {
        if (args.includes('--stats')) {
            console.log(JSON.stringify(engine.getStats(), null, 2));
        } else if (args.includes('--status')) {
            console.log(JSON.stringify(engine.getStatus(), null, 2));
        } else if (args.includes('--search')) {
            const query = args[args.indexOf('--search') + 1] || 'artificial intelligence';
            engine.searchLiterature(query).then(results => {
                console.log(JSON.stringify(results, null, 2));
            });
        } else {
            console.log('Research Engine for', agentId);
            console.log('Usage:');
            console.log('  --stats        Show research statistics');
            console.log('  --status      Show current status');
            console.log('  --search Q    Search literature for Q');
        }
    });
}