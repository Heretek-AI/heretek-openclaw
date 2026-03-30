#!/usr/bin/env node
/**
 * Pattern Registry - ClawRecipes Pattern Library
 * 
 * This module implements the ClawRecipes pattern library for curated action recipes.
 * It provides pattern management, context-aware matching, templates, versioning,
 * and skill adaptation capabilities.
 * 
 * Components:
 * - PatternLibrary: Curated action recipe patterns
 * - PatternMatcher: Match patterns to current context
 * - PatternTemplates: Pre-built action sequences
 * - PatternVersioning: Track pattern evolution
 * - SkillAdapter: Convert patterns to executable skills
 * 
 * Integration:
 * - Evolution Engine for capability-based pattern selection
 * - Research Engine for hypothesis-driven pattern discovery
 * - Curiosity Engine for gap-based pattern recommendations
 * 
 * Usage:
 *   const PatternRegistry = require('./pattern-registry.js');
 *   const registry = new PatternRegistry();
 *   const matches = await registry.findPatterns(context);
 *   const skill = await registry.adaptToSkill(patternId);
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const PATTERNS_DIR = process.env.PATTERNS_DIR || 
    path.join(__dirname, 'patterns');
const STATE_FILE = process.env.PATTERN_STATE_FILE ||
    path.join(__dirname, 'state', 'pattern-state.json');

// ============================================
// PATTERN DEFINITION
// ============================================

/**
 * Represents a pattern definition
 */
class Pattern {
    constructor(definition) {
        this.id = definition.id || this.generateId();
        this.name = definition.name;
        this.description = definition.description;
        this.category = definition.category || 'general';
        this.tags = definition.tags || [];
        this.version = definition.version || '1.0.0';
        this.previousVersions = definition.previousVersions || [];
        
        // Pattern structure
        this.trigger = definition.trigger || {};       // When to activate
        this.context = definition.context || {};       // Context requirements
        this.actions = definition.actions || [];      // Action sequence
        this.parameters = definition.parameters || {}; // Configurable parameters
        this.output = definition.output || {};         // Expected output
        
        // Metadata
        this.author = definition.author || 'system';
        this.createdAt = definition.createdAt || new Date().toISOString();
        this.updatedAt = definition.updatedAt || new Date().toISOString();
        this.usageCount = definition.usageCount || 0;
        this.successRate = definition.successRate || 0.5;
        
        // Evolution
        this.generation = definition.generation || 0;
        this.ancestors = definition.ancestors || [];
        this.fitness = definition.fitness || 0.5;
        
        // Integration
        this.linkedSkills = definition.linkedSkills || [];
        this.linkedCapabilities = definition.linkedCapabilities || [];
    }

    generateId() {
        return `pattern_${crypto.randomBytes(6).toString('hex')}`;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            tags: this.tags,
            version: this.version,
            previousVersions: this.previousVersions,
            trigger: this.trigger,
            context: this.context,
            actions: this.actions,
            parameters: this.parameters,
            output: this.output,
            author: this.author,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            usageCount: this.usageCount,
            successRate: this.successRate,
            generation: this.generation,
            ancestors: this.ancestors,
            fitness: this.fitness,
            linkedSkills: this.linkedSkills,
            linkedCapabilities: this.linkedCapabilities
        };
    }

    static fromJSON(json) {
        return new Pattern(json);
    }

    /**
     * Create a new version of this pattern
     */
    createVersion(updates = {}) {
        const newVersion = new Pattern({
            ...this.toJSON(),
            id: undefined, // New ID for new version
            previousVersions: [...this.previousVersions, this.version],
            version: this.incrementVersion(this.version),
            generation: this.generation + 1,
            ancestors: [...this.ancestors, this.id],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...updates
        });
        return newVersion;
    }

    incrementVersion(version) {
        const [major, minor, patch] = version.split('.').map(Number);
        return `${major}.${minor + 1}.${patch}`;
    }
}

// ============================================
// PATTERN LIBRARY
// ============================================

/**
 * Manages the collection of patterns
 */
class PatternLibrary {
    constructor(config = {}) {
        this.patterns = new Map();
        this.categories = new Set();
        this.tags = new Set();
        
        this.config = {
            maxPatterns: config.maxPatterns || 100,
            autoCategorize: config.autoCategorize !== false,
            ...config
        };
    }

    /**
     * Add a pattern to the library
     */
    add(pattern) {
        const p = pattern instanceof Pattern ? pattern : new Pattern(pattern);
        this.patterns.set(p.id, p);
        
        // Update categories and tags
        this.categories.add(p.category);
        p.tags.forEach(t => this.tags.add(t));
        
        return p;
    }

    /**
     * Get a pattern by ID
     */
    get(patternId) {
        return this.patterns.get(patternId);
    }

    /**
     * Get all patterns
     */
    getAll() {
        return Array.from(this.patterns.values());
    }

    /**
     * Remove a pattern
     */
    remove(patternId) {
        return this.patterns.delete(patternId);
    }

    /**
     * Find patterns by category
     */
    getByCategory(category) {
        return this.getAll().filter(p => p.category === category);
    }

    /**
     * Find patterns by tag
     */
    getByTag(tag) {
        return this.getAll().filter(p => p.tags.includes(tag));
    }

    /**
     * Find patterns by name (fuzzy search)
     */
    searchByName(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(p => 
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get patterns by capability
     */
    getByCapability(capability) {
        return this.getAll().filter(p => 
            p.linkedCapabilities.includes(capability)
        );
    }

    /**
     * Get patterns sorted by fitness
     */
    getTopPatterns(count = 10) {
        return [...this.getAll()]
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, count);
    }

    /**
     * Get patterns sorted by success rate
     */
    getMostSuccessful(count = 10) {
        return [...this.getAll()]
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, count);
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.categories);
    }

    /**
     * Get all tags
     */
    getTags() {
        return Array.from(this.tags);
    }

    /**
     * Export library to JSON
     */
    toJSON() {
        return {
            patterns: this.getAll().map(p => p.toJSON()),
            categories: this.getCategories(),
            tags: this.getTags(),
            stats: this.getStats()
        };
    }

    /**
     * Get library statistics
     */
    getStats() {
        return {
            totalPatterns: this.patterns.size,
            categories: this.categories.size,
            tags: this.tags.size,
            avgFitness: this.calculateAverageFitness(),
            avgSuccessRate: this.calculateAverageSuccessRate()
        };
    }

    calculateAverageFitness() {
        const patterns = this.getAll();
        if (patterns.length === 0) return 0;
        return patterns.reduce((sum, p) => sum + p.fitness, 0) / patterns.length;
    }

    calculateAverageSuccessRate() {
        const patterns = this.getAll();
        if (patterns.length === 0) return 0;
        return patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;
    }

    /**
     * Import patterns from JSON
     */
    static fromJSON(data) {
        const library = new PatternLibrary();
        if (data.patterns) {
            data.patterns.forEach(p => library.add(Pattern.fromJSON(p)));
        }
        return library;
    }
}

// ============================================
// PATTERN MATCHER
// ============================================

/**
 * Matches patterns to current context
 */
class PatternMatcher {
    constructor(config = {}) {
        this.config = {
            minMatchScore: config.minMatchScore || 0.3,
            maxResults: config.maxResults || 10,
            useWeightedMatching: config.useWeightedMatching !== false,
            ...config
        };
        
        this.weights = {
            trigger: config.triggerWeight || 0.35,
            context: config.contextWeight || 0.30,
            tags: config.tagsWeight || 0.20,
            capabilities: config.capabilitiesWeight || 0.15
        };
    }

    /**
     * Find patterns matching the given context
     * @param {Object} context - Current context
     * @param {Array} patterns - Patterns to match against
     * @returns {Array} Matching patterns with scores
     */
    findMatches(context, patterns = []) {
        const matches = patterns.map(pattern => {
            const score = this.calculateMatchScore(pattern, context);
            return {
                pattern,
                score,
                reasons: this.getMatchReasons(pattern, context)
            };
        });
        
        // Filter by minimum score
        const filtered = matches.filter(m => 
            m.score >= this.config.minMatchScore
        );
        
        // Sort by score
        filtered.sort((a, b) => b.score - a.score);
        
        // Limit results
        return filtered.slice(0, this.config.maxResults);
    }

    /**
     * Calculate match score for a pattern
     */
    calculateMatchScore(pattern, context) {
        if (this.config.useWeightedMatching) {
            return this.calculateWeightedScore(pattern, context);
        }
        return this.calculateSimpleScore(pattern, context);
    }

    /**
     * Calculate weighted match score
     */
    calculateWeightedScore(pattern, context) {
        const scores = {
            trigger: this.matchTrigger(pattern.trigger, context),
            context: this.matchContext(pattern.context, context),
            tags: this.matchTags(pattern, context),
            capabilities: this.matchCapabilities(pattern, context)
        };
        
        return Object.keys(scores).reduce((sum, key) => 
            sum + scores[key] * this.weights[key], 0
        );
    }

    /**
     * Calculate simple match score
     */
    calculateSimpleScore(pattern, context) {
        let matches = 0;
        let total = 0;
        
        // Check trigger match
        if (this.matchTrigger(pattern.trigger, context) > 0) {
            matches++;
        }
        total++;
        
        // Check context match
        if (this.matchContext(pattern.context, context) > 0) {
            matches++;
        }
        total++;
        
        // Check tags
        if (this.matchTags(pattern, context) > 0) {
            matches++;
        }
        total++;
        
        // Check capabilities
        if (this.matchCapabilities(pattern, context) > 0) {
            matches++;
        }
        total++;
        
        return total > 0 ? matches / total : 0;
    }

    /**
     * Match pattern triggers
     */
    matchTrigger(trigger, context) {
        if (!trigger || Object.keys(trigger).length === 0) {
            return 0.5; // Default score for no trigger
        }
        
        let matches = 0;
        let total = 0;
        
        // Check event type
        if (trigger.event) {
            total++;
            if (context.event === trigger.event || 
                (Array.isArray(trigger.event) && trigger.event.includes(context.event))) {
                matches++;
            }
        }
        
        // Check conditions
        if (trigger.conditions) {
            total++;
            if (this.checkConditions(trigger.conditions, context)) {
                matches++;
            }
        }
        
        return total > 0 ? matches / total : 0;
    }

    /**
     * Match pattern context requirements
     */
    matchContext(patternContext, context) {
        if (!patternContext || Object.keys(patternContext).length === 0) {
            return 0.5;
        }
        
        let matches = 0;
        let total = 0;
        
        // Check required capabilities
        if (patternContext.requiredCapabilities) {
            total++;
            const hasCapabilities = patternContext.requiredCapabilities.every(
                cap => context.capabilities?.includes(cap)
            );
            if (hasCapabilities) matches++;
        }
        
        // Check required state
        if (patternContext.requiredState) {
            total++;
            if (this.checkConditions(patternContext.requiredState, context)) {
                matches++;
            }
        }
        
        // Check environment
        if (patternContext.environment) {
            total++;
            if (this.checkConditions(patternContext.environment, context)) {
                matches++;
            }
        }
        
        return total > 0 ? matches / total : 0;
    }

    /**
     * Match tags with context
     */
    matchTags(pattern, context) {
        if (!pattern.tags || pattern.tags.length === 0) {
            return 0.3;
        }
        
        const contextTags = context.tags || [];
        const matchingTags = pattern.tags.filter(t => contextTags.includes(t));
        
        return matchingTags.length / pattern.tags.length;
    }

    /**
     * Match capabilities
     */
    matchCapabilities(pattern, context) {
        if (!pattern.linkedCapabilities || pattern.linkedCapabilities.length === 0) {
            return 0.3;
        }
        
        const contextCapabilities = context.capabilities || [];
        const matchingCaps = pattern.linkedCapabilities.filter(
            cap => contextCapabilities.includes(cap)
        );
        
        return matchingCaps.length / pattern.linkedCapabilities.length;
    }

    /**
     * Check conditions against context
     */
    checkConditions(conditions, context) {
        for (const [key, expected] of Object.entries(conditions)) {
            const actual = context[key];
            
            if (expected === undefined) continue;
            
            if (typeof expected === 'object') {
                // Handle comparison operators
                if (expected.$gte !== undefined && actual < expected.$gte) return false;
                if (expected.$lte !== undefined && actual > expected.$lte) return false;
                if (expected.$gt !== undefined && actual <= expected.$gt) return false;
                if (expected.$lt !== undefined && actual >= expected.$lt) return false;
                if (expected.$in && !expected.$in.includes(actual)) return false;
                if (expected.$nin && expected.$nin.includes(actual)) return false;
            } else {
                if (actual !== expected) return false;
            }
        }
        return true;
    }

    /**
     * Get reasons for match
     */
    getMatchReasons(pattern, context) {
        const reasons = [];
        
        if (pattern.trigger?.event) {
            if (context.event === pattern.trigger.event) {
                reasons.push('Event matches trigger');
            }
        }
        
        if (pattern.tags) {
            const contextTags = context.tags || [];
            const matching = pattern.tags.filter(t => contextTags.includes(t));
            if (matching.length > 0) {
                reasons.push(`Matching tags: ${matching.join(', ')}`);
            }
        }
        
        if (pattern.linkedCapabilities) {
            const contextCaps = context.capabilities || [];
            const matching = pattern.linkedCapabilities.filter(c => contextCaps.includes(c));
            if (matching.length > 0) {
                reasons.push(`Matching capabilities: ${matching.join(', ')}`);
            }
        }
        
        return reasons;
    }
}

// ============================================
// PATTERN TEMPLATES
// ============================================

/**
 * Pre-built action sequence templates
 */
class PatternTemplates {
    constructor() {
        this.templates = this.initializeTemplates();
    }

    /**
     * Initialize default templates
     */
    initializeTemplates() {
        return {
            // Research templates
            research: {
                basic: {
                    name: 'Basic Research',
                    description: 'Simple research workflow',
                    actions: [
                        { type: 'search', params: { query: '{{query}}' } },
                        { type: 'extract', params: {} },
                        { type: 'synthesize', params: {} }
                    ]
                },
                comprehensive: {
                    name: 'Comprehensive Research',
                    description: 'In-depth research with hypothesis testing',
                    actions: [
                        { type: 'plan', params: { objective: '{{objective}}' } },
                        { type: 'generate_hypotheses', params: {} },
                        { type: 'search', params: {} },
                        { type: 'experiment', params: {} },
                        { type: 'integrate', params: {} }
                    ]
                }
            },
            
            // Evolution templates
            evolution: {
                adapt: {
                    name: 'Capability Adaptation',
                    description: 'Adapt existing capabilities to new context',
                    actions: [
                        { type: 'analyze', params: { focus: 'gap' } },
                        { type: 'mutate', params: { parameters: '{{parameters}}' } },
                        { type: 'evaluate', params: {} },
                        { type: 'apply', params: {} }
                    ]
                },
                create: {
                    name: 'New Capability Creation',
                    description: 'Create new capability from scratch',
                    actions: [
                        { type: 'identify', params: { target: '{{target}}' } },
                        { type: 'design', params: {} },
                        { type: 'implement', params: {} },
                        { type: 'test', params: {} },
                        { type: 'refine', params: {} }
                    ]
                }
            },
            
            // Execution templates
            execution: {
                sequential: {
                    name: 'Sequential Execution',
                    description: 'Execute actions in sequence',
                    actions: '{{actions}}'
                },
                parallel: {
                    name: 'Parallel Execution',
                    description: 'Execute independent actions simultaneously',
                    actions: '{{actions}}',
                    parallel: true
                },
                conditional: {
                    name: 'Conditional Execution',
                    description: 'Execute based on condition',
                    actions: [
                        { type: 'check', params: { condition: '{{condition}}' } },
                        { type: 'branch', params: {} }
                    ]
                }
            },
            
            // Communication templates
            communication: {
                request: {
                    name: 'Information Request',
                    description: 'Request information from another agent',
                    actions: [
                        { type: 'format_request', params: {} },
                        { type: 'send', params: { target: '{{target}}' } },
                        { type: 'wait', params: {} },
                        { type: 'process_response', params: {} }
                    ]
                },
                broadcast: {
                    name: 'Broadcast Message',
                    description: 'Broadcast message to multiple agents',
                    actions: [
                        { type: 'format_message', params: {} },
                        { type: 'broadcast', params: { targets: '{{targets}}' } },
                        { type: 'collect_responses', params: {} }
                    ]
                }
            },
            
            // Analysis templates
            analysis: {
                root_cause: {
                    name: 'Root Cause Analysis',
                    description: 'Find root cause of an issue',
                    actions: [
                        { type: 'gather_evidence', params: {} },
                        { type: 'identify_factors', params: {} },
                        { type: 'analyze_relationships', params: {} },
                        { type: 'determine_root_cause', params: {} },
                        { type: 'recommend_solution', params: {} }
                    ]
                },
                comparative: {
                    name: 'Comparative Analysis',
                    description: 'Compare multiple options',
                    actions: [
                        { type: 'define_criteria', params: {} },
                        { type: 'evaluate_options', params: { options: '{{options}}' } },
                        { type: 'rank', params: {} },
                        { type: 'recommend', params: {} }
                    ]
                }
            }
        };
    }

    /**
     * Get template by category and name
     */
    getTemplate(category, name) {
        const categoryTemplates = this.templates[category];
        if (!categoryTemplates) return null;
        return categoryTemplates[name] || null;
    }

    /**
     * Get all templates in a category
     */
    getCategoryTemplates(category) {
        return this.templates[category] || {};
    }

    /**
     * Get all categories
     */
    getCategories() {
        return Object.keys(this.templates);
    }

    /**
     * Create a pattern from template
     */
    createFromTemplate(category, name, overrides = {}) {
        const template = this.getTemplate(category, name);
        if (!template) {
            throw new Error(`Template not found: ${category}.${name}`);
        }
        
        return new Pattern({
            name: overrides.name || template.name,
            description: overrides.description || template.description,
            category: overrides.category || category,
            tags: overrides.tags || [category, name],
            actions: overrides.actions || template.actions,
            parameters: { ...template.parameters, ...overrides.parameters },
            trigger: overrides.trigger || {},
            context: overrides.context || {},
            ...overrides
        });
    }

    /**
     * Add custom template
     */
    addTemplate(category, name, template) {
        if (!this.templates[category]) {
            this.templates[category] = {};
        }
        this.templates[category][name] = template;
    }
}

// ============================================
// PATTERN VERSIONING
// ============================================

/**
 * Tracks pattern evolution and versioning
 */
class PatternVersioning {
    constructor(config = {}) {
        this.config = {
            maxVersionsPerPattern: config.maxVersionsPerPattern || 10,
            trackHistory: config.trackHistory !== false,
            autoVersion: config.autoVersion !== false,
            ...config
        };
        
        this.versionHistory = new Map();
    }

    /**
     * Create a new version of a pattern
     */
    createVersion(pattern, updates = {}) {
        const newVersion = pattern.createVersion(updates);
        
        // Track history
        if (this.config.trackHistory) {
            if (!this.versionHistory.has(pattern.id)) {
                this.versionHistory.set(pattern.id, []);
            }
            
            const history = this.versionHistory.get(pattern.id);
            history.push({
                version: pattern.version,
                timestamp: new Date().toISOString(),
                changes: updates.changelog || 'Updated'
            });
            
            // Trim history if needed
            if (history.length > this.config.maxVersionsPerPattern) {
                this.versionHistory.set(pattern.id, history.slice(-this.config.maxVersionsPerPattern));
            }
        }
        
        return newVersion;
    }

    /**
     * Get version history for a pattern
     */
    getHistory(patternId) {
        return this.versionHistory.get(patternId) || [];
    }

    /**
     * Compare two versions
     */
    compareVersions(patternId, version1, version2) {
        // This would compare the actual pattern versions
        return {
            patternId,
            version1,
            version2,
            changes: 'Implementation would compare actual versions'
        };
    }

    /**
     * Rollback to previous version
     */
    rollback(pattern, targetVersion) {
        const history = this.getHistory(pattern.id);
        const target = history.find(h => h.version === targetVersion);
        
        if (!target) {
            throw new Error(`Version ${targetVersion} not found in history`);
        }
        
        // In production, this would restore from stored versions
        return {
            pattern,
            rolledBackTo: targetVersion,
            currentVersion: pattern.version
        };
    }
}

// ============================================
// SKILL ADAPTER
// ============================================

/**
 * Converts patterns to executable skills
 */
class SkillAdapter {
    constructor(config = {}) {
        this.config = {
            outputFormat: config.outputFormat || 'shell', // shell, javascript, json
            includeValidation: config.includeValidation !== false,
            ...config
        };
    }

    /**
     * Adapt a pattern to an executable skill
     * @param {Pattern} pattern - Pattern to adapt
     * @param {Object} options - Adaptation options
     * @returns {Object} Executable skill
     */
    adapt(pattern, options = {}) {
        switch (options.format || this.config.outputFormat) {
            case 'shell':
                return this.adaptToShell(pattern, options);
            case 'javascript':
                return this.adaptToJavaScript(pattern, options);
            case 'json':
                return this.adaptToJSON(pattern, options);
            default:
                return this.adaptToShell(pattern, options);
        }
    }

    /**
     * Adapt to shell script
     */
    adaptToShell(pattern, options = {}) {
        const script = `#!/usr/bin/env bash
# ${pattern.name}
# Generated from pattern: ${pattern.id}
# Version: ${pattern.version}

set -e

# Configuration
${this.generateConfig(pattern.parameters)}

# Main execution
${this.generateMainActions(pattern.actions)}

echo "Completed: ${pattern.name}"
`;
        
        return {
            id: `skill_${pattern.id}`,
            name: pattern.name,
            description: pattern.description,
            type: 'shell',
            script,
            metadata: {
                patternId: pattern.id,
                version: pattern.version,
                createdAt: new Date().toISOString()
            }
        };
    }

    /**
     * Adapt to JavaScript
     */
    adaptToJavaScript(pattern, options = {}) {
        const script = `/**
 * ${pattern.name}
 * Generated from pattern: ${pattern.id}
 */

module.exports = {
    name: '${pattern.name}',
    description: '${pattern.description}',
    
    async execute(context = {}) {
        ${this.generateJSActions(pattern.actions)}
        
        return { success: true, pattern: '${pattern.id}' };
    }
};
`;
        
        return {
            id: `skill_${pattern.id}`,
            name: pattern.name,
            description: pattern.description,
            type: 'javascript',
            script,
            metadata: {
                patternId: pattern.id,
                version: pattern.version,
                createdAt: new Date().toISOString()
            }
        };
    }

    /**
     * Adapt to JSON format
     */
    adaptToJSON(pattern, options = {}) {
        return {
            id: `skill_${pattern.id}`,
            name: pattern.name,
            description: pattern.description,
            type: 'json',
            script: JSON.stringify(pattern.toJSON(), null, 2),
            metadata: {
                patternId: pattern.id,
                version: pattern.version,
                createdAt: new Date().toISOString()
            }
        };
    }

    /**
     * Generate configuration section
     */
    generateConfig(parameters) {
        if (!parameters || Object.keys(parameters).length === 0) {
            return '# No configuration needed';
        }
        
        let config = '';
        for (const [key, value] of Object.entries(parameters)) {
            config += `${key.toUpperCase()}="${value}"\n`;
        }
        return config;
    }

    /**
     * Generate main action section
     */
    generateMainActions(actions) {
        if (!actions || actions.length === 0) {
            return '# No actions defined';
        }
        
        return actions.map(action => {
            switch (action.type) {
                case 'search':
                    return `# Search: ${action.params?.query || ''}\necho "Searching..."`;
                case 'extract':
                    return '# Extract information';
                case 'synthesize':
                    return '# Synthesize results';
                case 'analyze':
                    return `# Analyze: ${action.params?.focus || 'default'}`;
                case 'mutate':
                    return '# Apply mutation';
                case 'evaluate':
                    return '# Evaluate results';
                case 'apply':
                    return '# Apply changes';
                case 'plan':
                    return `# Plan: ${action.params?.objective || ''}`;
                case 'generate_hypotheses':
                    return '# Generate hypotheses';
                case 'experiment':
                    return '# Run experiments';
                case 'integrate':
                    return '# Integrate knowledge';
                case 'send':
                    return `# Send to: ${action.params?.target || ''}`;
                case 'broadcast':
                    return '# Broadcast message';
                default:
                    return `# Action: ${action.type}`;
            }
        }).join('\n\n');
    }

    /**
     * Generate JavaScript actions
     */
    generateJSActions(actions) {
        if (!actions || actions.length === 0) {
            return '// No actions defined';
        }
        
        return actions.map(action => {
            return `// ${action.type}`;
        }).join('\n');
    }

    /**
     * Validate adapted skill
     */
    validate(skill) {
        const errors = [];
        
        if (!skill.id) errors.push('Missing skill ID');
        if (!skill.name) errors.push('Missing skill name');
        if (!skill.script) errors.push('Missing script content');
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// ============================================
// PATTERN REGISTRY (Main Class)
// ============================================

/**
 * Main Pattern Registry class
 */
class PatternRegistry {
    /**
     * Create a new Pattern Registry
     * @param {Object} config - Configuration
     */
    constructor(config = {}) {
        this.config = config;
        
        // Initialize components
        this.library = new PatternLibrary(config.library);
        this.matcher = new PatternMatcher(config.matcher);
        this.templates = new PatternTemplates();
        this.versioning = new PatternVersioning(config.versioning);
        this.skillAdapter = new SkillAdapter(config.adapter);
        
        // State
        this.stateFile = STATE_FILE;
        this.patternsDir = PATTERNS_DIR;
        
        // Load patterns
        this.load();
    }

    /**
     * Load patterns from storage
     */
    load() {
        // Load from state file
        try {
            if (fs.existsSync(this.stateFile)) {
                const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
                if (data.patterns) {
                    data.patterns.forEach(p => {
                        this.library.add(Pattern.fromJSON(p));
                    });
                }
                console.log('[PatternRegistry] Loaded', this.library.getStats().totalPatterns, 'patterns');
            }
        } catch (e) {
            console.warn('[PatternRegistry] Failed to load state:', e.message);
        }
        
        // Load patterns from directory
        this.loadPatternsFromDirectory();
        
        // Load default patterns if empty
        if (this.library.getAll().length === 0) {
            this.loadDefaultPatterns();
        }
    }

    /**
     * Load patterns from patterns directory
     */
    loadPatternsFromDirectory() {
        try {
            if (!fs.existsSync(this.patternsDir)) {
                fs.mkdirSync(this.patternsDir, { recursive: true });
                return;
            }
            
            const files = fs.readdirSync(this.patternsDir).filter(f => f.endsWith('.json'));
            
            for (const file of files) {
                try {
                    const filePath = path.join(this.patternsDir, file);
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    
                    if (Array.isArray(data)) {
                        data.forEach(p => this.library.add(Pattern.fromJSON(p)));
                    } else if (data.id) {
                        this.library.add(Pattern.fromJSON(data));
                    }
                } catch (e) {
                    console.warn('[PatternRegistry] Failed to load', file, ':', e.message);
                }
            }
        } catch (e) {
            console.warn('[PatternRegistry] Failed to load patterns directory:', e.message);
        }
    }

    /**
     * Load default patterns
     */
    loadDefaultPatterns() {
        const defaults = [
            // Research patterns
            {
                name: 'Basic Research',
                description: 'Perform basic research on a topic',
                category: 'research',
                tags: ['research', 'basic', 'search'],
                trigger: { event: 'research_request' },
                context: { requiredCapabilities: ['search', 'knowledge'] },
                actions: [
                    { type: 'search', params: { query: '{{query}}' } },
                    { type: 'extract', params: {} },
                    { type: 'synthesize', params: {} }
                ],
                linkedCapabilities: ['research', 'knowledge_retrieval']
            },
            {
                name: 'Gap Analysis',
                description: 'Analyze capability gaps and recommend solutions',
                category: 'analysis',
                tags: ['analysis', 'gap', 'capability'],
                trigger: { event: 'gap_analysis_request' },
                context: { requiredCapabilities: ['analysis'] },
                actions: [
                    { type: 'identify_gaps', params: {} },
                    { type: 'analyze_impact', params: {} },
                    { type: 'recommend', params: {} }
                ],
                linkedCapabilities: ['capability_analysis']
            },
            {
                name: 'Capability Evolution',
                description: 'Evolve capabilities based on performance data',
                category: 'evolution',
                tags: ['evolution', 'capability', 'adaptation'],
                trigger: { event: 'evolution_request' },
                context: { requiredCapabilities: ['evolution'] },
                actions: [
                    { type: 'analyze', params: { focus: 'performance' } },
                    { type: 'mutate', params: {} },
                    { type: 'evaluate', params: {} },
                    { type: 'apply', params: {} }
                ],
                linkedCapabilities: ['self_improvement', 'adaptation']
            },
            {
                name: 'Multi-Agent Coordination',
                description: 'Coordinate action across multiple agents',
                category: 'coordination',
                tags: ['coordination', 'multi-agent', 'communication'],
                trigger: { event: 'coordination_request' },
                context: { requiredCapabilities: ['communication'] },
                actions: [
                    { type: 'broadcast', params: {} },
                    { type: 'collect', params: {} },
                    { type: 'aggregate', params: {} },
                    { type: 'respond', params: {} }
                ],
                linkedCapabilities: ['collaboration', 'communication']
            },
            {
                name: 'Root Cause Analysis',
                description: 'Find root cause of issues',
                category: 'analysis',
                tags: ['analysis', 'debugging', 'root-cause'],
                trigger: { event: 'issue_detected' },
                context: { requiredCapabilities: ['analysis'] },
                actions: [
                    { type: 'gather_evidence', params: {} },
                    { type: 'identify_factors', params: {} },
                    { type: 'analyze_relationships', params: {} },
                    { type: 'determine_root_cause', params: {} }
                ],
                linkedCapabilities: ['diagnosis', 'reasoning']
            },
            {
                name: 'Opportunity Detection',
                description: 'Detect opportunities for improvement',
                category: 'detection',
                tags: ['opportunity', 'detection', 'scanning'],
                trigger: { event: 'scan_request' },
                context: { requiredCapabilities: ['scanning'] },
                actions: [
                    { type: 'scan', params: {} },
                    { type: 'evaluate', params: {} },
                    { type: 'prioritize', params: {} },
                    { type: 'report', params: {} }
                ],
                linkedCapabilities: ['opportunity_detection', 'scanning']
            },
            {
                name: 'Knowledge Integration',
                description: 'Integrate new knowledge into memory',
                category: 'knowledge',
                tags: ['knowledge', 'integration', 'memory'],
                trigger: { event: 'knowledge_discovered' },
                context: { requiredCapabilities: ['memory'] },
                actions: [
                    { type: 'validate', params: {} },
                    { type: 'structure', params: {} },
                    { type: 'integrate', params: {} },
                    { type: 'index', params: {} }
                ],
                linkedCapabilities: ['knowledge_management', 'memory']
            },
            {
                name: 'Self-Model Update',
                description: 'Update self-model based on experiences',
                category: 'self_model',
                tags: ['self_model', 'reflection', 'update'],
                trigger: { event: 'reflection_trigger' },
                context: { requiredCapabilities: ['reflection'] },
                actions: [
                    { type: 'collect_experiences', params: {} },
                    { type: 'analyze_performance', params: {} },
                    { type: 'update_model', params: {} },
                    { type: 'validate', params: {} }
                ],
                linkedCapabilities: ['self_modeling', 'reflection']
            }
        ];
        
        defaults.forEach(p => this.library.add(new Pattern(p)));
        this.save();
        
        console.log('[PatternRegistry] Loaded', defaults.length, 'default patterns');
    }

    /**
     * Save patterns to storage
     */
    save() {
        try {
            const dir = path.dirname(this.stateFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const state = {
                patterns: this.library.getAll().map(p => p.toJSON()),
                savedAt: new Date().toISOString()
            };
            
            fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        } catch (e) {
            console.error('[PatternRegistry] Failed to save state:', e.message);
        }
    }

    /**
     * Add a new pattern
     * @param {Object} patternDefinition - Pattern definition
     * @returns {Pattern} Added pattern
     */
    addPattern(patternDefinition) {
        const pattern = new Pattern(patternDefinition);
        this.library.add(pattern);
        this.save();
        return pattern;
    }

    /**
     * Get a pattern by ID
     * @param {string} patternId - Pattern ID
     * @returns {Pattern} Found pattern
     */
    getPattern(patternId) {
        return this.library.get(patternId);
    }

    /**
     * Find patterns matching context
     * @param {Object} context - Current context
     * @param {Object} options - Search options
     * @returns {Array} Matching patterns
     */
    async findPatterns(context, options = {}) {
        const patterns = options.patterns || this.library.getAll();
        return this.matcher.findMatches(context, patterns);
    }

    /**
     * Get patterns by category
     * @param {string} category - Category name
     * @returns {Array} Patterns in category
     */
    getByCategory(category) {
        return this.library.getByCategory(category);
    }

    /**
     * Get patterns by capability
     * @param {string} capability - Capability name
     * @returns {Array} Matching patterns
     */
    getByCapability(capability) {
        return this.library.getByCapability(capability);
    }

    /**
     * Search patterns
     * @param {string} query - Search query
     * @returns {Array} Matching patterns
     */
    search(query) {
        return this.library.searchByName(query);
    }

    /**
     * Create pattern from template
     * @param {string} category - Template category
     * @param {string} name - Template name
     * @param {Object} overrides - Pattern overrides
     * @returns {Pattern} Created pattern
     */
    createFromTemplate(category, name, overrides = {}) {
        const pattern = this.templates.createFromTemplate(category, name, overrides);
        this.library.add(pattern);
        this.save();
        return pattern;
    }

    /**
     * Adapt pattern to executable skill
     * @param {string} patternId - Pattern ID
     * @param {Object} options - Adaptation options
     * @returns {Object} Executable skill
     */
    async adaptToSkill(patternId, options = {}) {
        const pattern = this.library.get(patternId);
        if (!pattern) {
            throw new Error(`Pattern not found: ${patternId}`);
        }
        
        // Increment usage count
        pattern.usageCount++;
        this.save();
        
        return this.skillAdapter.adapt(pattern, options);
    }

    /**
     * Update pattern with new version
     * @param {string} patternId - Pattern ID
     * @param {Object} updates - Updates to apply
     * @returns {Pattern} New version
     */
    updatePattern(patternId, updates = {}) {
        const pattern = this.library.get(patternId);
        if (!pattern) {
            throw new Error(`Pattern not found: ${patternId}`);
        }
        
        const newVersion = this.versioning.createVersion(pattern, updates);
        this.library.add(newVersion);
        this.save();
        
        return newVersion;
    }

    /**
     * Record pattern success
     * @param {string} patternId - Pattern ID
     * @param {boolean} success - Whether pattern succeeded
     */
    recordResult(patternId, success) {
        const pattern = this.library.get(patternId);
        if (!pattern) return;
        
        // Update success rate
        const total = pattern.usageCount || 1;
        const currentSuccess = pattern.successRate * total;
        pattern.successRate = (currentSuccess + (success ? 1 : 0)) / (total + 1);
        
        // Update fitness based on success
        pattern.fitness = pattern.fitness * 0.9 + (success ? 0.1 : 0);
        
        this.save();
    }

    /**
     * Get all patterns
     * @returns {Array} All patterns
     */
    getAllPatterns() {
        return this.library.getAll();
    }

    /**
     * Get pattern statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.library.getStats(),
            templates: this.templates.getCategories().length,
            versioning: this.versioning.config.trackHistory
        };
    }

    /**
     * Get available categories
     * @returns {Array} Categories
     */
    getCategories() {
        return this.library.getCategories();
    }

    /**
     * Get available templates
     * @returns {Object} Templates
     */
    getTemplates() {
        return this.templates;
    }

    /**
     * Export library
     * @returns {Object} Exported data
     */
    export() {
        return this.library.toJSON();
    }

    /**
     * Import patterns
     * @param {Array} patterns - Patterns to import
     */
    import(patterns) {
        patterns.forEach(p => {
            const pattern = p instanceof Pattern ? p : Pattern.fromJSON(p);
            this.library.add(pattern);
        });
        this.save();
    }
}

// ============================================
// PATTERN REGISTRY FACTORY
// ============================================

class PatternRegistryFactory {
    /**
     * Create a new Pattern Registry
     * @param {Object} config - Configuration
     * @returns {Promise<PatternRegistry>} Registry instance
     */
    static async create(config = {}) {
        return new PatternRegistry(config);
    }

    /**
     * Create with default patterns
     * @param {Object} config - Configuration
     * @returns {Promise<PatternRegistry>} Registry instance
     */
    static async createWithDefaults(config = {}) {
        const registry = new PatternRegistry(config);
        return registry;
    }
}

// ============================================
// MAIN EXPORTS
// ============================================

module.exports = {
    PatternRegistry,
    PatternRegistryFactory,
    Pattern,
    PatternLibrary,
    PatternMatcher,
    PatternTemplates,
    PatternVersioning,
    SkillAdapter
};

// ============================================
// CLI
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const registry = new PatternRegistry();
    
    if (args.includes('--stats')) {
        console.log(JSON.stringify(registry.getStats(), null, 2));
    } else if (args.includes('--list')) {
        console.log(JSON.stringify(registry.getAllPatterns().map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            fitness: p.fitness
        })), null, 2));
    } else if (args.includes('--categories')) {
        console.log(JSON.stringify(registry.getCategories(), null, 2));
    } else if (args.includes('--templates')) {
        console.log(JSON.stringify(registry.getTemplates().templates, null, 2));
    } else if (args.includes('--search')) {
        const query = args[args.indexOf('--search') + 1] || '';
        console.log(JSON.stringify(registry.search(query).map(p => p.toJSON()), null, 2));
    } else if (args.includes('--match')) {
        const context = {
            event: args[args.indexOf('--match') + 1] || 'research_request',
            capabilities: args[args.indexOf('--caps') + 1]?.split(',') || [],
            tags: args[args.indexOf('--tags') + 1]?.split(',') || []
        };
        registry.findPatterns(context).then(matches => {
            console.log(JSON.stringify(matches, null, 2));
        });
    } else {
        console.log('Pattern Registry - ClawRecipes Pattern Library');
        console.log('Usage:');
        console.log('  --stats         Show statistics');
        console.log('  --list          List all patterns');
        console.log('  --categories    List categories');
        console.log('  --templates     Show templates');
        console.log('  --search Q      Search patterns');
        console.log('  --match E       Match patterns to event');
    }
}
