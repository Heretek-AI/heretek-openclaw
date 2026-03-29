#!/usr/bin/env node
/**
 * Capability Tracker - Tracks what the agent can do
 * 
 * This module manages the agent's capabilities including skills, tools,
 * and derived capabilities. It tracks their status and confidence levels.
 * 
 * Manages:
 * - Available capabilities (skills, tools)
 * - Active capabilities (currently usable)
 * - Learning capabilities (being developed)
 * - Capability dependencies
 * - Confidence per capability
 * 
 * Usage:
 *   const CapabilityTracker = require('./capability-tracker.js');
 *   const tracker = new CapabilityTracker('my-agent');
 *   tracker.registerSkill('code-generation');
 *   console.log(tracker.canDo('code-generation'));
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SKILLS_DIR = process.env.SKILLS_DIR || 
    path.join(__dirname, '../../skills');
const CAPABILITY_FILE = process.env.CAPABILITY_FILE || 
    path.join(__dirname, 'capabilities.json');

class CapabilityTracker {
    /**
     * Create a new capability tracker
     * @param {string} agentName - Name of the agent
     */
    constructor(agentName) {
        this.agentName = agentName || process.env.AGENT_NAME || 'unknown';
        this.capabilities = this.loadCapabilities();
    }

    /**
     * Load capabilities from file
     * @returns {Object} Capabilities data
     */
    loadCapabilities() {
        try {
            if (fs.existsSync(CAPABILITY_FILE)) {
                const data = fs.readFileSync(CAPABILITY_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[CapabilityTracker] Failed to load capabilities:', e.message);
        }
        
        return this.initialize();
    }

    /**
     * Initialize default capabilities
     * @returns {Object} Default capability structure
     */
    initialize() {
        return {
            agent: this.agentName,
            initialized: new Date().toISOString(),
            updated: new Date().toISOString(),
            skills: [],           // Available skills
            tools: [],            // Available tools
            apis: [],             // Available API endpoints
            capabilities: {},    // Derived capabilities
            confidence: {},       // Confidence per capability
            dependencies: {}     // What capabilities depend on others
        };
    }

    /**
     * Save capabilities to file
     */
    save() {
        this.capabilities.updated = new Date().toISOString();
        try {
            const dir = path.dirname(CAPABILITY_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CAPABILITY_FILE, JSON.stringify(this.capabilities, null, 2));
        } catch (e) {
            console.error('[CapabilityTracker] Failed to save capabilities:', e.message);
        }
    }

    // === Discovery ===

    /**
     * Discover available skills from skills directory
     * @returns {Array} Discovered skill names
     */
    discoverSkills() {
        try {
            if (!fs.existsSync(SKILLS_DIR)) {
                console.log('[CapabilityTracker] Skills directory not found:', SKILLS_DIR);
                return [];
            }
            
            const files = fs.readdirSync(SKILLS_DIR);
            const skills = files.filter(f => {
                try {
                    return fs.statSync(path.join(SKILLS_DIR, f)).isDirectory();
                } catch (e) {
                    return false;
                }
            });
            
            for (const skill of skills) {
                if (!this.capabilities.skills.includes(skill)) {
                    this.capabilities.skills.push(skill);
                    // Initialize confidence for new skills
                    if (this.capabilities.confidence[skill] === undefined) {
                        this.capabilities.confidence[skill] = 0.5;
                    }
                }
            }
            
            console.log(`[CapabilityTracker] Discovered ${skills.length} skills`);
            this.save();
            return skills;
        } catch (e) {
            console.error('[CapabilityTracker] Failed to discover skills:', e.message);
            return [];
        }
    }

    /**
     * Discover available tools
     * @returns {Array} Discovered tool names
     */
    discoverTools() {
        // Placeholder - would scan for available tools
        const defaultTools = ['read', 'write', 'execute', 'search'];
        for (const tool of defaultTools) {
            if (!this.capabilities.tools.includes(tool)) {
                this.capabilities.tools.push(tool);
                if (this.capabilities.confidence[tool] === undefined) {
                    this.capabilities.confidence[tool] = 0.7;
                }
            }
        }
        this.save();
        return this.capabilities.tools;
    }

    // === Registration ===

    /**
     * Register a new skill
     * @param {string} skill - Skill name
     * @param {number} initialConfidence - Initial confidence level
     */
    registerSkill(skill, initialConfidence = 0.5) {
        if (!this.capabilities.skills.includes(skill)) {
            this.capabilities.skills.push(skill);
            this.capabilities.confidence[skill] = initialConfidence;
            this.save();
            console.log(`[CapabilityTracker] Registered skill: ${skill}`);
        }
    }

    /**
     * Register a new tool
     * @param {string} tool - Tool name
     * @param {number} initialConfidence - Initial confidence level
     */
    registerTool(tool, initialConfidence = 0.7) {
        if (!this.capabilities.tools.includes(tool)) {
            this.capabilities.tools.push(tool);
            this.capabilities.confidence[tool] = initialConfidence;
            this.save();
            console.log(`[CapabilityTracker] Registered tool: ${tool}`);
        }
    }

    /**
     * Register an API endpoint
     * @param {string} api - API name
     */
    registerApi(api) {
        if (!this.capabilities.apis.includes(api)) {
            this.capabilities.apis.push(api);
            this.save();
        }
    }

    // === Usage ===

    /**
     * Check if a capability is available
     * @param {string} capability - Capability name
     * @returns {boolean} True if capability exists
     */
    canDo(capability) {
        return this.capabilities.capabilities[capability] !== undefined ||
               this.capabilities.skills.includes(capability) ||
               this.capabilities.tools.includes(capability);
    }

    /**
     * Use a capability (increases confidence)
     * @param {string} capability - Capability name
     * @returns {boolean} True if used successfully
     */
    use(capability) {
        if (!this.canDo(capability)) {
            return false;
        }
        
        // Update confidence based on usage
        const current = this.capabilities.confidence[capability] || 0.5;
        this.capabilities.confidence[capability] = Math.min(1, current + 0.05);
        this.save();
        return true;
    }

    /**
     * Register a failure (decreases confidence)
     * @param {string} capability - Capability name
     */
    fail(capability) {
        if (!this.canDo(capability)) {
            return;
        }
        
        // Reduce confidence on failure
        const current = this.capabilities.confidence[capability] || 0.5;
        this.capabilities.confidence[capability] = Math.max(0.1, current - 0.1);
        this.save();
    }

    // === Derivation ===

    /**
     * Derive a new capability from existing ones
     * @param {string} name - Derived capability name
     * @param {Array} requires - Required skills/tools
     * @param {Object} provides - What this enables
     */
    deriveCapability(name, requires, provides) {
        this.capabilities.capabilities[name] = {
            requires,  // Skills/tools needed
            provides, // What this enables
            confidence: 0.5
        };
        
        this.capabilities.dependencies[name] = requires;
        this.save();
    }

    /**
     * Evaluate capability confidence based on requirements
     * @param {string} name - Capability name
     * @returns {number} Confidence level (0-1)
     */
    evaluateCapability(name) {
        const cap = this.capabilities.capabilities[name];
        if (!cap) return 0;
        
        // Check if all requirements are met
        let requirementConfidence = 1.0;
        for (const req of cap.requires) {
            if (!this.canDo(req)) {
                requirementConfidence = 0;
                break;
            }
            requirementConfidence *= (this.capabilities.confidence[req] || 0.5);
        }
        
        // Update capability confidence
        cap.confidence = requirementConfidence;
        this.capabilities.confidence[name] = requirementConfidence;
        this.save();
        
        return requirementConfidence;
    }

    // === Query ===

    /**
     * Get all capabilities
     * @returns {Object} All capability data
     */
    getAll() {
        return {
            skills: this.capabilities.skills,
            tools: this.capabilities.tools,
            apis: this.capabilities.apis,
            capabilities: this.capabilities.capabilities,
            confidence: this.capabilities.confidence
        };
    }

    /**
     * Get capabilities filtered by confidence
     * @param {number} minConfidence - Minimum confidence threshold
     * @returns {Array} Capabilities with confidence >= threshold
     */
    getByConfidence(minConfidence = 0) {
        return Object.entries(this.capabilities.confidence)
            .filter(([_, conf]) => conf >= minConfidence)
            .map(([name, conf]) => ({ name, confidence: conf }));
    }

    /**
     * Get low confidence capabilities (needs attention)
     * @param {number} threshold - Threshold for low confidence
     * @returns {Array} Low confidence capabilities
     */
    getLowConfidence(threshold = 0.3) {
        return Object.entries(this.capabilities.confidence)
            .filter(([_, conf]) => conf < threshold)
            .map(([name, conf]) => ({ name, confidence: conf }));
    }

    /**
     * Get capability summary
     * @returns {Object} Summary data
     */
    getSummary() {
        return {
            skills_count: this.capabilities.skills.length,
            tools_count: this.capabilities.tools.length,
            apis_count: this.capabilities.apis.length,
            derived_count: Object.keys(this.capabilities.capabilities).length,
            high_confidence: this.getByConfidence(0.7).length,
            low_confidence: this.getLowConfidence().length
        };
    }
}

// Main
if (require.main === module) {
    const args = process.argv.slice(2);
    const tracker = new CapabilityTracker(process.env.AGENT_NAME);
    
    // Discover available skills
    tracker.discoverSkills();
    tracker.discoverTools();
    
    // Output
    if (args.includes('--json')) {
        console.log(JSON.stringify(tracker.getAll(), null, 2));
    } else if (args.includes('--summary')) {
        console.log(JSON.stringify(tracker.getSummary(), null, 2));
    } else if (args.includes('--low-confidence')) {
        console.log('Low confidence capabilities:');
        console.log(JSON.stringify(tracker.getLowConfidence(), null, 2));
    } else {
        const all = tracker.getAll();
        console.log(`Capabilities for ${tracker.agentName}:`);
        console.log(`  Skills: ${all.skills.length}`);
        console.log(`  Tools: ${all.tools.length}`);
        console.log(`  APIs: ${all.apis.length}`);
        console.log(`  Derived: ${Object.keys(all.capabilities).length}`);
    }
}

module.exports = CapabilityTracker;