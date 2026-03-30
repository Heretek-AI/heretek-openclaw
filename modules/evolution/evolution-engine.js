#!/usr/bin/env node
/**
 * Evolution Engine - EvoClaw Self-Evolution Implementation
 * 
 * This module implements evolutionary self-improvement for the OpenClaw collective,
 * enabling agents to evolve their capabilities through natural selection-like processes.
 * 
 * Components:
 * - PopulationManager: Manage agent capability populations
 * - FitnessEvaluator: Evaluate capability effectiveness  
 * - SelectionEngine: Select best performers for reproduction
 * - GeneticOperators: Mutation and crossover for capability evolution
 * - EvolutionController: Orchestrate evolution cycles
 * 
 * Usage:
 *   const EvolutionEngine = require('./evolution-engine.js');
 *   const engine = new EvolutionEngine('my-agent');
 *   await engine.evolve();
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const STATE_FILE = process.env.EVOLUTION_STATE_FILE || 
    path.join(__dirname, 'state', 'evolution-state.json');

// ============================================
// CAPABILITY ENCODING
// ============================================

/**
 * Encode a capability as a genome string for genetic operations
 * Format: type|param1:param2:param3|weight|crossover_point
 */
class CapabilityGenome {
    constructor(capability) {
        this.capability = capability;
        this.genome = this.encode(capability);
    }

    encode(cap) {
        return [
            cap.type || 'generic',
            [
                cap.parameters?.complexity || 0.5,
                cap.parameters?.adaptability || 0.5,
                cap.parameters?.reliability || 0.7,
                cap.parameters?.efficiency || 0.5
            ].join(':'),
            cap.weight || 1.0,
            cap.generation || 0
        ].join('|');
    }

    static decode(genome) {
        const [type, params, weight, gen] = genome.split('|');
        const [complexity, adaptability, reliability, efficiency] = params.split(':').map(Number);
        return {
            type,
            parameters: { complexity, adaptability, reliability, efficiency },
            weight: parseFloat(weight) || 1.0,
            generation: parseInt(gen) || 0
        };
    }

    getGenes() {
        return this.genome.split('|');
    }
}

// ============================================
// POPULATION MANAGER
// ============================================

/**
 * Manages the population of capability individuals
 */
class PopulationManager {
    constructor(config = {}) {
        this.minSize = config.minSize || 10;
        this.maxSize = config.maxSize || 100;
        this.eliteCount = config.eliteCount || 2;
        this.diversityThreshold = config.diversityThreshold || 0.3;
        this.population = [];
        this.generation = 0;
    }

    initialize(capabilities = []) {
        if (capabilities.length > 0) {
            this.population = capabilities.map(cap => ({
                id: cap.id || this.generateId(),
                genome: new CapabilityGenome(cap),
                fitness: cap.fitness || 0.5,
                age: 0,
                ancestors: []
            }));
        } else {
            this.population = this.createInitialPopulation();
        }
        return this.population;
    }

    createInitialPopulation() {
        const population = [];
        const types = ['reasoning', 'execution', 'communication', 'learning', 'planning'];
        
        for (let i = 0; i < this.minSize; i++) {
            const type = types[i % types.length];
            population.push({
                id: this.generateId(),
                genome: new CapabilityGenome({
                    type,
                    parameters: {
                        complexity: Math.random(),
                        adaptability: Math.random(),
                        reliability: 0.5 + Math.random() * 0.3,
                        efficiency: Math.random()
                    },
                    weight: 1.0,
                    generation: 0
                }),
                fitness: 0.5,
                age: 0,
                ancestors: []
            });
        }
        return population;
    }

    add(individual) {
        individual.id = individual.id || this.generateId();
        individual.age = 0;
        this.population.push(individual);
        
        // Enforce max size
        if (this.population.length > this.maxSize) {
            this.population.sort((a, b) => a.fitness - b.fitness);
            this.population = this.population.slice(0, this.maxSize);
        }
        return individual;
    }

    remove(individualId) {
        const idx = this.population.findIndex(i => i.id === individualId);
        if (idx !== -1) {
            this.population.splice(idx, 1);
            return true;
        }
        return false;
    }

    getElite() {
        return [...this.population]
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, this.eliteCount);
    }

    getAverageFitness() {
        if (this.population.length === 0) return 0;
        return this.population.reduce((sum, i) => sum + i.fitness, 0) / this.population.length;
    }

    getDiversity() {
        if (this.population.length < 2) return 0;
        const genomes = this.population.map(i => i.genome.genome);
        const unique = new Set(genomes);
        return unique.size / genomes.length;
    }

    agePopulation() {
        this.population.forEach(i => i.age++);
        this.generation++;
    }

    generateId() {
        return `cap_${crypto.randomBytes(8).toString('hex')}`;
    }

    toJSON() {
        return {
            population: this.population.map(i => ({
                id: i.id,
                genome: i.genome.genome,
                fitness: i.fitness,
                age: i.age,
                ancestors: i.ancestors
            })),
            generation: this.generation,
            stats: {
                size: this.population.length,
                avgFitness: this.getAverageFitness(),
                diversity: this.getDiversity(),
                elite: this.getElite().map(e => e.id)
            }
        };
    }

    static fromJSON(data) {
        const pm = new PopulationManager();
        pm.generation = data.generation || 0;
        pm.population = data.population.map(i => ({
            id: i.id,
            genome: new CapabilityGenome(CapabilityGenome.decode(i.genome)),
            fitness: i.fitness,
            age: i.age,
            ancestors: i.ancestors || []
        }));
        return pm;
    }
}

// ============================================
// FITNESS EVALUATOR
// ============================================

/**
 * Evaluates capability effectiveness based on various metrics
 */
class FitnessEvaluator {
    constructor(config = {}) {
        this.weights = {
            taskSuccess: config.taskSuccessWeight || 0.35,
            efficiency: config.efficiencyWeight || 0.20,
            reliability: config.reliabilityWeight || 0.25,
            adaptability: config.adaptabilityWeight || 0.10,
            novelty: config.noveltyWeight || 0.10
        };
    }

    /**
     * Evaluate a capability's fitness based on performance data
     * @param {Object} capability - Capability to evaluate
     * @param {Object} performanceData - Performance metrics
     * @returns {number} Fitness score (0-1)
     */
    evaluate(capability, performanceData = {}) {
        const scores = {
            taskSuccess: this.evaluateTaskSuccess(performanceData),
            efficiency: this.evaluateEfficiency(performanceData),
            reliability: this.evaluateReliability(capability),
            adaptability: this.evaluateAdaptability(capability),
            novelty: this.evaluateNovelty(capability, performanceData)
        };

        const fitness = Object.keys(scores).reduce((sum, key) => 
            sum + scores[key] * this.weights[key], 0);

        return Math.max(0, Math.min(1, fitness));
    }

    evaluateTaskSuccess(data) {
        if (data.tasksCompleted === undefined || data.tasksTotal === undefined) {
            return 0.7; // Default for unknown
        }
        return data.tasksTotal > 0 ? data.tasksCompleted / data.tasksTotal : 0.5;
    }

    evaluateEfficiency(data) {
        if (data.avgDuration === undefined || data.idealDuration === undefined) {
            return 0.5;
        }
        const ratio = data.idealDuration / Math.max(data.avgDuration, 0.001);
        return Math.min(1, ratio);
    }

    evaluateReliability(capability) {
        // Reliability based on genome parameters
        return capability.parameters?.reliability || 0.5;
    }

    evaluateAdaptability(capability) {
        // Adaptability based on genome parameters
        return capability.parameters?.adaptability || 0.5;
    }

    evaluateNovelty(capability, data) {
        // Novelty based on whether this is a new approach
        if (data.isNovel === undefined) return 0.5;
        return data.isNovel ? 0.8 : 0.3;
    }

    /**
     * Compare two capabilities and determine if one dominates
     */
    dominates(capA, capB) {
        const fitA = this.evaluate(capA.capability || capA, capA.performance || {});
        const fitB = this.evaluate(capB.capability || capB, capB.performance || {});
        return fitA > fitB;
    }
}

// ============================================
// SELECTION ENGINE
// ============================================

/**
 * Selects individuals for reproduction using various selection strategies
 */
class SelectionEngine {
    constructor(config = {}) {
        this.tournamentSize = config.tournamentSize || 3;
        this.tournamentProbability = config.tournamentProbability || 0.9;
        this.elitismRate = config.elitismRate || 0.1;
    }

    /**
     * Select parents for reproduction using tournament selection
     * @param {Array} population - Population to select from
     * @param {number} count - Number of parents to select
     * @returns {Array} Selected individuals
     */
    selectParents(population, count = 2) {
        const parents = [];
        for (let i = 0; i < count; i++) {
            parents.push(this.tournamentSelect(population));
        }
        return parents;
    }

    tournamentSelect(population) {
        if (population.length === 0) return null;
        if (population.length === 1) return population[0];

        // Create tournament pool
        const tournament = [];
        const poolSize = Math.min(this.tournamentSize, population.length);
        
        for (let i = 0; i < poolSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            tournament.push(population[idx]);
        }

        // Sort by fitness
        tournament.sort((a, b) => b.fitness - a.fitness);

        // Probabilistic selection - higher fitness = higher chance
        for (let i = 0; i < tournament.length; i++) {
            const prob = this.tournamentProbability * Math.pow(1 - this.tournamentProbability, i);
            if (Math.random() < prob || i === tournament.length - 1) {
                return tournament[i];
            }
        }
        return tournament[0];
    }

    /**
     * Select survivors for next generation using elitism + tournament
     * @param {Array} population - Current population
     * @param {Array} offspring - New individuals
     * @param {number} targetSize - Target population size
     * @returns {Array} Survivors for next generation
     */
    selectSurvivors(population, offspring, targetSize) {
        const combined = [...population, ...offspring];
        
        // Keep elites
        const eliteCount = Math.ceil(targetSize * this.elitismRate);
        const elites = [...population]
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, eliteCount);

        // Fill rest with tournament selection
        const survivors = [...elites];
        while (survivors.length < targetSize && combined.length > 0) {
            const selected = this.tournamentSelect(combined.filter(i => !survivors.includes(i)));
            if (selected) {
                survivors.push(selected);
            } else {
                break;
            }
        }

        return survivors;
    }
}

// ============================================
// GENETIC OPERATORS
// ============================================

/**
 * Genetic operators for capability evolution
 */
class GeneticOperators {
    constructor(config = {}) {
        this.mutationRate = config.mutationRate || 0.15;
        this.mutationStrength = config.mutationStrength || 0.2;
        this.crossoverPoints = config.crossoverPoints || 2;
    }

    /**
     * Apply mutation to a capability genome
     * @param {Object} individual - Individual to mutate
     * @returns {Object} Mutated individual
     */
    mutate(individual) {
        const genome = CapabilityGenome.decode(individual.genome.genome);
        const mutated = { ...genome };
        
        // Mutate parameters
        mutated.parameters = { ...genome.parameters };
        const paramKeys = Object.keys(mutated.parameters);
        
        for (const key of paramKeys) {
            if (Math.random() < this.mutationRate) {
                const delta = (Math.random() - 0.5) * 2 * this.mutationStrength;
                mutated.parameters[key] = Math.max(0, Math.min(1, mutated.parameters[key] + delta));
            }
        }

        // Mutate weight
        if (Math.random() < this.mutationRate * 0.5) {
            const delta = (Math.random() - 0.5) * 0.5;
            mutated.weight = Math.max(0.1, mutated.weight + delta);
        }

        mutated.generation = (genome.generation || 0) + 1;

        const newIndividual = {
            id: `mut_${crypto.randomBytes(6).toString('hex')}`,
            genome: new CapabilityGenome(mutated),
            fitness: individual.fitness, // Inherit fitness initially
            age: 0,
            ancestors: [...(individual.ancestors || []), individual.id]
        };

        return newIndividual;
    }

    /**
     * Apply crossover between two individuals
     * @param {Object} parentA - First parent
     * @param {Object} parentB - Second parent
     * @returns {Object} Offspring individual
     */
    crossover(parentA, parentB) {
        const genomeA = CapabilityGenome.decode(parentA.genome.genome);
        const genomeB = CapabilityGenome.decode(parentB.genome.genome);

        // Single-point crossover on genome
        const offspring = {
            type: Math.random() < 0.5 ? genomeA.type : genomeB.type,
            parameters: {},
            weight: (genomeA.weight + genomeB.weight) / 2,
            generation: Math.max(genomeA.generation || 0, genomeB.generation || 0) + 1
        };

        // Crossover parameters
        const paramKeys = Object.keys(genomeA.parameters);
        for (const key of paramKeys) {
            offspring.parameters[key] = Math.random() < 0.5 
                ? genomeA.parameters[key] 
                : genomeB.parameters[key];
        }

        // Blend parameters for smoother crossover
        if (Math.random() < 0.3) {
            const alpha = Math.random();
            for (const key of paramKeys) {
                offspring.parameters[key] = alpha * genomeA.parameters[key] + 
                    (1 - alpha) * genomeB.parameters[key];
            }
        }

        const newIndividual = {
            id: `cross_${crypto.randomBytes(6).toString('hex')}`,
            genome: new CapabilityGenome(offspring),
            fitness: Math.max(parentA.fitness, parentB.fitness), // Inherit better fitness
            age: 0,
            ancestors: [parentA.id, parentB.id]
        };

        return newIndividual;
    }

    /**
     * Generate new capability through random initialization
     * @param {Object} targetCapabilities - Capabilities to evolve towards
     * @returns {Object} New capability
     */
    generateNew(targetCapabilities = []) {
        const type = targetCapabilities.length > 0 
            ? targetCapabilities[Math.floor(Math.random() * targetCapabilities.length)].type
            : 'generic';

        const base = targetCapabilities.length > 0 
            ? targetCapabilities[Math.floor(Math.random() * targetCapabilities.length)]
            : null;

        const capability = {
            type,
            parameters: {
                complexity: base?.parameters?.complexity + (Math.random() - 0.5) * 0.3 || Math.random(),
                adaptability: base?.parameters?.adaptability + (Math.random() - 0.5) * 0.3 || Math.random(),
                reliability: base?.parameters?.reliability + (Math.random() - 0.5) * 0.3 || 0.7,
                efficiency: base?.parameters?.efficiency + (Math.random() - 0.5) * 0.3 || Math.random()
            },
            weight: base?.weight + (Math.random() - 0.5) * 0.3 || 1.0,
            generation: 0
        };

        // Clamp values
        Object.keys(capability.parameters).forEach(key => {
            capability.parameters[key] = Math.max(0, Math.min(1, capability.parameters[key]));
        });
        capability.weight = Math.max(0.1, Math.min(3, capability.weight));

        return {
            id: `new_${crypto.randomBytes(6).toString('hex')}`,
            genome: new CapabilityGenome(capability),
            fitness: 0.5,
            age: 0,
            ancestors: []
        };
    }
}

// ============================================
// EVOLUTION CONTROLLER
// ============================================

/**
 * Orchestrates the evolution cycle
 */
class EvolutionController {
    constructor(agentId, config = {}) {
        this.agentId = agentId;
        this.populationManager = new PopulationManager(config.population || {});
        this.fitnessEvaluator = new FitnessEvaluator(config.fitness || {});
        this.selectionEngine = new SelectionEngine(config.selection || {});
        this.geneticOperators = new GeneticOperators(config.genetics || {});
        
        this.state = this.loadState();
        this.config = config;
        
        this.evolutionHistory = [];
        this.isRunning = false;
        this.cycleCount = 0;
    }

    loadState() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                const state = JSON.parse(data);
                this.populationManager = PopulationManager.fromJSON(state.population || {});
                this.cycleCount = state.cycleCount || 0;
                this.evolutionHistory = state.history || [];
                return state;
            }
        } catch (e) {
            console.error('[EvolutionController] Failed to load state:', e.message);
        }
        return this.initializeState();
    }

    initializeState() {
        return {
            agentId: this.agentId,
            cycleCount: 0,
            generation: 0,
            population: { population: [], generation: 0 },
            history: []
        };
    }

    saveState() {
        try {
            const dir = path.dirname(STATE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const state = {
                agentId: this.agentId,
                cycleCount: this.cycleCount,
                generation: this.populationManager.generation,
                population: this.populationManager.toJSON(),
                history: this.evolutionHistory.slice(-100), // Keep last 100 entries
                lastUpdated: new Date().toISOString()
            };
            
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        } catch (e) {
            console.error('[EvolutionController] Failed to save state:', e.message);
        }
    }

    /**
     * Initialize the evolution system with capabilities
     * @param {Array} initialCapabilities - Initial capabilities to evolve
     */
    initialize(initialCapabilities = []) {
        if (initialCapabilities.length === 0) {
            // Create default capabilities
            initialCapabilities = [
                { type: 'reasoning', parameters: { complexity: 0.6, adaptability: 0.5, reliability: 0.7, efficiency: 0.5 }, weight: 1.0 },
                { type: 'execution', parameters: { complexity: 0.5, adaptability: 0.6, reliability: 0.8, efficiency: 0.6 }, weight: 1.0 },
                { type: 'communication', parameters: { complexity: 0.4, adaptability: 0.7, reliability: 0.9, efficiency: 0.4 }, weight: 1.0 },
                { type: 'learning', parameters: { complexity: 0.7, adaptability: 0.8, reliability: 0.6, efficiency: 0.5 }, weight: 1.0 },
                { type: 'planning', parameters: { complexity: 0.6, adaptability: 0.5, reliability: 0.7, efficiency: 0.5 }, weight: 1.0 }
            ];
        }
        
        this.populationManager.initialize(initialCapabilities);
        this.saveState();
    }

    /**
     * Run one evolution cycle
     * @param {Object} performanceData - Performance data for fitness evaluation
     * @param {Object} targetCapabilities - Target capabilities to evolve towards
     * @returns {Object} Evolution result
     */
    async evolve(performanceData = {}, targetCapabilities = []) {
        if (this.isRunning) {
            return { status: 'busy', message: 'Evolution cycle already in progress' };
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            // 1. Evaluate fitness of current population
            this.populationManager.population.forEach(individual => {
                const capability = CapabilityGenome.decode(individual.genome.genome);
                individual.fitness = this.fitnessEvaluator.evaluate(capability, performanceData);
            });

            // 2. Select parents
            const elite = this.populationManager.getElite();
            const parents = this.selectionEngine.selectParents(
                this.populationManager.population,
                Math.ceil(this.populationManager.population.length / 2)
            );

            // 3. Create offspring through crossover and mutation
            const offspring = [];
            
            // Crossover
            for (let i = 0; i < parents.length - 1; i += 2) {
                offspring.push(this.geneticOperators.crossover(parents[i], parents[i + 1]));
            }

            // Mutation
            const mutants = parents.map(p => this.geneticOperators.mutate(p));
            offspring.push(...mutants);

            // New generation if needed
            if (Math.random() < 0.1 || targetCapabilities.length > 0) {
                offspring.push(this.geneticOperators.generateNew(targetCapabilities));
            }

            // 4. Evaluate offspring fitness
            offspring.forEach(individual => {
                const capability = CapabilityGenome.decode(individual.genome.genome);
                individual.fitness = this.fitnessEvaluator.evaluate(capability, performanceData);
            });

            // 5. Select survivors
            const targetSize = this.populationManager.population.length;
            const survivors = this.selectionEngine.selectSurvivors(
                this.populationManager.population,
                offspring,
                targetSize
            );

            // Preserve elites
            const finalPopulation = [...elite, ...survivors.filter(s => !elite.find(e => e.id === s.id))];
            
            // 6. Age and update population
            this.populationManager.population = finalPopulation;
            this.populationManager.agePopulation();

            // 7. Record history
            const result = {
                cycle: this.cycleCount,
                generation: this.populationManager.generation,
                populationSize: this.populationManager.population.length,
                avgFitness: this.populationManager.getAverageFitness(),
                bestFitness: elite.length > 0 ? elite[0].fitness : 0,
                diversity: this.populationManager.getDiversity(),
                duration: Date.now() - startTime,
                newCapabilities: offspring.length
            };

            this.evolutionHistory.push(result);
            this.cycleCount++;
            this.saveState();

            return {
                status: 'success',
                ...result
            };

        } catch (error) {
            console.error('[EvolutionController] Evolution failed:', error);
            return {
                status: 'error',
                message: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get best capabilities from current population
     * @param {number} count - Number of top capabilities to return
     * @returns {Array} Top capabilities
     */
    getTopCapabilities(count = 5) {
        return [...this.populationManager.population]
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, count)
            .map(ind => ({
                id: ind.id,
                capability: CapabilityGenome.decode(ind.genome.genome),
                fitness: ind.fitness,
                age: ind.age
            }));
    }

    /**
     * Get evolution statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            cycleCount: this.cycleCount,
            generation: this.populationManager.generation,
            populationSize: this.populationManager.population.length,
            avgFitness: this.populationManager.getAverageFitness(),
            bestFitness: this.populationManager.getElite()[0]?.fitness || 0,
            diversity: this.populationManager.getDiversity(),
            history: this.evolutionHistory.slice(-10)
        };
    }

    /**
     * Export current population
     * @returns {Object} Population data
     */
    exportPopulation() {
        return this.populationManager.toJSON();
    }

    /**
     * Import external capabilities into population
     * @param {Array} capabilities - Capabilities to add
     */
    importCapabilities(capabilities) {
        capabilities.forEach(cap => {
            const individual = {
                id: `imp_${crypto.randomBytes(4).toString('hex')}`,
                genome: new CapabilityGenome(cap),
                fitness: this.fitnessEvaluator.evaluate(cap, {}),
                age: 0,
                ancestors: ['external']
            };
            this.populationManager.add(individual);
        });
        this.saveState();
    }
}

// ============================================
// EVOLUTION ENGINE (Main Export)
// ============================================

class EvolutionEngine {
    /**
     * Create a new Evolution Engine
     * @param {string} agentId - Agent identifier
     * @param {Object} config - Configuration options
     */
    constructor(agentId, config = {}) {
        this.agentId = agentId;
        this.controller = new EvolutionController(agentId, config);
        this.selfModel = null;
    }

    /**
     * Set self-model reference for integration
     * @param {Object} selfModel - Self-model instance
     */
    setSelfModel(selfModel) {
        this.selfModel = selfModel;
    }

    /**
     * Initialize with capabilities from self-model
     * @param {Object} selfModel - Self-model instance
     */
    initializeFromSelfModel(selfModel) {
        this.selfModel = selfModel;
        
        const capabilities = selfModel.getCapabilities();
        const initialCaps = capabilities.available.map((type, idx) => ({
            type,
            parameters: {
                complexity: 0.5 + Math.random() * 0.3,
                adaptability: 0.5 + Math.random() * 0.3,
                reliability: 0.7 + Math.random() * 0.2,
                efficiency: 0.5 + Math.random() * 0.3
            },
            weight: 1.0
        }));
        
        this.controller.initialize(initialCaps);
    }

    /**
     * Run evolution cycle
     * @param {Object} options - Evolution options
     * @returns {Object} Evolution result
     */
    async evolve(options = {}) {
        const performanceData = options.performanceData || this.collectPerformanceData();
        const targetCapabilities = options.targetCapabilities || this.getTargetCapabilities();
        
        return await this.controller.evolve(performanceData, targetCapabilities);
    }

    /**
     * Collect performance data from self-model
     * @returns {Object} Performance data
     */
    collectPerformanceData() {
        if (!this.selfModel) {
            return { tasksTotal: 10, tasksCompleted: 7, avgDuration: 5, idealDuration: 4 };
        }
        
        const metrics = this.selfModel.getMetrics();
        const confidence = this.selfModel.getConfidence();
        
        return {
            tasksTotal: metrics.thoughts_generated + metrics.actions_taken,
            tasksCompleted: metrics.thoughts_generated,
            avgDuration: 5,
            idealDuration: 4,
            overallConfidence: confidence.overall
        };
    }

    /**
     * Get target capabilities from curiosity engine integration
     * @returns {Array} Target capabilities
     */
    getTargetCapabilities() {
        // This would integrate with gap detection to prioritize capabilities
        const targets = [
            { type: 'self-improvement', parameters: { complexity: 0.8, adaptability: 0.9, reliability: 0.7, efficiency: 0.6 }, weight: 1.5 },
            { type: 'autonomy', parameters: { complexity: 0.7, adaptability: 0.8, reliability: 0.8, efficiency: 0.7 }, weight: 1.3 },
            { type: 'collaboration', parameters: { complexity: 0.6, adaptability: 0.7, reliability: 0.9, efficiency: 0.5 }, weight: 1.0 }
        ];
        return targets;
    }

    /**
     * Get evolved capabilities to apply to self-model
     * @returns {Object} Capabilities to apply
     */
    getEvolvedCapabilities() {
        const top = this.controller.getTopCapabilities(3);
        return {
            recommended: top,
            stats: this.controller.getStats()
        };
    }

    /**
     * Get complete stats
     * @returns {Object} Engine statistics
     */
    getStats() {
        return this.controller.getStats();
    }

    /**
     * Run continuous evolution
     * @param {number} cycles - Number of cycles to run
     * @param {number} interval - Interval between cycles in ms
     */
    async runContinuous(cycles = 10, interval = 60000) {
        const results = [];
        for (let i = 0; i < cycles; i++) {
            console.log(`[EvolutionEngine] Cycle ${i + 1}/${cycles}`);
            const result = await this.evolve();
            results.push(result);
            
            if (i < cycles - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        return results;
    }
}

// ============================================
// INTEGRATION WITH CURIOSITY ENGINE
// ============================================

/**
 * Integration bridge with curiosity-engine gap detection
 */
class CuriosityIntegration {
    constructor(evolutionEngine) {
        this.engine = evolutionEngine;
    }

    /**
     * Process gaps from gap-detector and evolve capabilities to fill them
     * @param {Array} gaps - Detected gaps
     * @returns {Object} Evolution result
     */
    async evolveForGaps(gaps) {
        const targetCapabilities = gaps.map(gap => ({
            type: gap.skill || gap.gap_type || 'generic',
            parameters: {
                complexity: gap.priority > 0.7 ? 0.8 : 0.5,
                adaptability: gap.priority > 0.5 ? 0.7 : 0.4,
                reliability: 0.7,
                efficiency: 0.5
            },
            weight: gap.priority || 1.0
        }));

        return await this.engine.evolve({
            targetCapabilities,
            performanceData: {
                gapsAddressed: gaps.length,
                priorityAverage: gaps.reduce((sum, g) => sum + (g.priority || 0), 0) / gaps.length
            }
        });
    }

    /**
     * Get capability recommendations based on gaps
     * @param {Array} gaps - Detected gaps
     * @returns {Array} Recommended capabilities
     */
    getGapRecommendations(gaps) {
        const evolved = this.engine.getEvolvedCapabilities();
        
        return gaps.map(gap => {
            const match = evolved.recommended.find(c => 
                c.capability.type === (gap.skill || gap.gap_type)
            );
            return {
                gap: gap.gap_name || gap.gap_type,
                capability: match?.capability || null,
                fitness: match?.fitness || 0,
                recommendation: match ? 'evolved' : 'import_needed'
            };
        });
    }
}

// ============================================
// MAIN EXPORTS
// ============================================

module.exports = {
    EvolutionEngine,
    PopulationManager,
    FitnessEvaluator,
    SelectionEngine,
    GeneticOperators,
    EvolutionController,
    CapabilityGenome,
    CuriosityIntegration
};

// ============================================
// CLI
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const agentId = process.env.AGENT_ID || 'default-evolution-agent';
    const engine = new EvolutionEngine(agentId);
    
    // Initialize with random capabilities
    engine.controller.initialize();
    
    if (args.includes('--stats')) {
        console.log(JSON.stringify(engine.getStats(), null, 2));
    } else if (args.includes('--evolve') || args.includes('-e')) {
        (async () => {
            const result = await engine.evolve();
            console.log(JSON.stringify(result, null, 2));
        })();
    } else if (args.includes('--top')) {
        console.log(JSON.stringify(engine.getEvolvedCapabilities(), null, 2));
    } else if (args.includes('--population')) {
        console.log(JSON.stringify(engine.controller.exportPopulation(), null, 2));
    } else {
        console.log('Evolution Engine for', agentId);
        console.log('Usage:');
        console.log('  --stats      Show evolution statistics');
        console.log('  --evolve     Run one evolution cycle');
        console.log('  --top        Show top evolved capabilities');
        console.log('  --population Export current population');
    }
}