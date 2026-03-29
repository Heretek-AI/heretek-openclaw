#!/usr/bin/env node
/**
 * Reflection Engine - Periodic self-assessment
 * 
 * This module enables meta-cognition by periodically reflecting on the
 * agent's performance, capabilities, confidence, and blind spots.
 * Essential for "every thinking" autonomy.
 * 
 * Types of reflection:
 * - Capability reflection: What can I do? What can't I do?
 * - Confidence reflection: How confident am I? Why?
 * - Decision reflection: Did my decisions work out?
 * - Blind spot reflection: What might I be missing?
 * 
 * Usage:
 *   const ReflectionEngine = require('./reflection-engine.js');
 *   const engine = new ReflectionEngine('my-agent');
 *   engine.reflect().then(reflections => console.log(reflections));
 */

const SelfModel = require('./self-model.js');
const CapabilityTracker = require('./capability-tracker.js');
const ConfidenceScorer = require('./confidence-scorer.js');
const path = require('path');

// Configuration file path
const CONFIG_FILE = process.env.SELF_MODEL_CONFIG || 
    path.join(__dirname, 'config.json');

class ReflectionEngine {
    /**
     * Create a new reflection engine
     * @param {string} agentName - Name of the agent
     */
    constructor(agentName) {
        this.agentName = agentName || process.env.AGENT_NAME || 'unknown';
        this.selfModel = new SelfModel(agentName);
        this.capabilityTracker = new CapabilityTracker(agentName);
        this.confidenceScorer = new ConfidenceScorer();
        
        this.config = this.loadConfig();
        this.lastReflection = null;
    }

    /**
     * Load configuration
     * @returns {Object} Configuration object
     */
    loadConfig() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[ReflectionEngine] Failed to load config:', e.message);
        }
        
        return {
            reflection_interval: 3600,
            confidence_threshold: 0.3,
            track_capabilities: true,
            track_knowledge: true,
            track_blind_spots: true
        };
    }

    /**
     * Run periodic reflection - generates multiple types of reflections
     * @returns {Promise<Array>} Array of reflection objects
     */
    async reflect() {
        const reflections = [];
        
        // 1. Capability reflection
        if (this.config.track_capabilities) {
            const capabilityReflection = await this.reflectOnCapabilities();
            if (capabilityReflection) reflections.push(capabilityReflection);
        }
        
        // 2. Confidence reflection
        if (this.config.track_knowledge) {
            const confidenceReflection = await this.reflectOnConfidence();
            if (confidenceReflection) reflections.push(confidenceReflection);
        }
        
        // 3. Decision reflection
        const decisionReflection = await this.reflectOnDecisions();
        if (decisionReflection) reflections.push(decisionReflection);
        
        // 4. Blind spot reflection
        if (this.config.track_blind_spots) {
            const blindSpotReflection = await this.reflectOnBlindSpots();
            if (blindSpotReflection) reflections.push(blindSpotReflection);
        }
        
        // Save reflections to self-model
        for (const reflection of reflections) {
            this.selfModel.addReflection(reflection);
        }
        
        this.lastReflection = {
            timestamp: new Date().toISOString(),
            count: reflections.length
        };
        
        return reflections;
    }

    /**
     * Reflect on capabilities - analyze what can and cannot do
     * @returns {Promise<Object>} Capability reflection
     */
    async reflectOnCapabilities() {
        const capabilities = this.capabilityTracker.getAll();
        const workingOn = this.selfModel.getWorkingOn();
        
        // What can I do?
        const availableCount = capabilities.skills.length + capabilities.tools.length;
        const activeCount = capabilities.capabilities ? 
            Object.keys(capabilities.capabilities).length : 0;
        
        // What am I working on?
        const inProgress = workingOn.length;
        
        // Identify capability gaps
        const insights = [];
        if (inProgress === 0) {
            insights.push('No active tasks - am I idle?');
        }
        if (availableCount < 5) {
            insights.push('Limited capabilities - should I learn more skills?');
        }
        
        // Check for low confidence capabilities
        const lowConf = this.capabilityTracker.getLowConfidence(0.3);
        if (lowConf.length > 0) {
            insights.push(`${lowConf.length} capabilities have low confidence`);
        }
        
        const confidenceBefore = this.selfModel.getConfidence('capabilities');
        const confidenceAfter = Math.min(1, (availableCount / 10) + (inProgress > 0 ? 0.3 : 0));
        
        return {
            id: `ref_cap_${Date.now()}`,
            type: 'capability',
            content: `Active capabilities: ${activeCount}, Available: ${availableCount}, Working on: ${inProgress}`,
            insights,
            confidence_before: confidenceBefore,
            confidence_after: confidenceAfter,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reflect on confidence - analyze confidence levels and trends
     * @returns {Promise<Object>} Confidence reflection
     */
    async reflectOnConfidence() {
        const confidence = this.selfModel.getConfidence();
        
        // Analyze trends
        const trend = confidence.trend || [];
        const recentTrend = trend.slice(-5);
        
        let trendDirection = 'stable';
        if (recentTrend.length >= 2) {
            const first = recentTrend[0].new_confidence;
            const last = recentTrend[recentTrend.length - 1].new_confidence;
            if (last > first + 0.1) trendDirection = 'improving';
            if (last < first - 0.1) trendDirection = 'declining';
        }
        
        const insights = [];
        if (confidence.overall < 0.4) {
            insights.push('Overall confidence is low - need more evidence');
        }
        if (trendDirection === 'declining') {
            insights.push('Confidence has been declining - analyze why');
        }
        
        // Check domains below threshold
        const threshold = this.config.confidence_threshold || 0.3;
        const lowDomains = Object.entries(confidence.by_domain)
            .filter(([_, conf]) => conf < threshold)
            .map(([domain, _]) => domain);
        
        if (lowDomains.length > 0) {
            insights.push(`Low confidence domains: ${lowDomains.join(', ')}`);
        }
        
        return {
            id: `ref_conf_${Date.now()}`,
            type: 'confidence',
            content: `Overall confidence: ${(confidence.overall * 100).toFixed(0)}%, Trend: ${trendDirection}`,
            insights,
            confidence_before: confidence.overall,
            confidence_after: confidence.overall,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reflect on recent decisions
     * @returns {Promise<Object>} Decision reflection
     */
    async reflectOnDecisions() {
        // Get pending decisions
        const pending = this.selfModel.model.workingOn.decisions_pending || [];
        const metrics = this.selfModel.getMetrics();
        
        const insights = [];
        if (pending.length > 0) {
            insights.push(`${pending.length} decisions pending`);
        }
        
        // Analyze decision patterns
        if (metrics.decisions_made > 0) {
            insights.push(`Made ${metrics.decisions_made} decisions total`);
        }
        
        return {
            id: `ref_dec_${Date.now()}`,
            type: 'decision',
            content: `Decisions: ${metrics.decisions_made} made, ${pending.length} pending`,
            insights,
            confidence_before: 0.5,
            confidence_after: 0.5,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reflect on blind spots - identify what might be missing
     * @returns {Promise<Object>} Blind spot reflection
     */
    async reflectOnBlindSpots() {
        const blindSpots = this.selfModel.getBlindSpots();
        
        const insights = [];
        
        // Check for suspected blind spots
        for (const spot of blindSpots.suspected) {
            if (!blindSpots.identified.find(s => s.id === spot.id)) {
                insights.push(`Might be missing: ${spot.description}`);
            }
        }
        
        // General blind spot check - Socratic questions
        insights.push('What questions am I not asking?');
        insights.push('What would challenge my current thinking?');
        
        // Check cognitive state for potential blind spots
        const state = this.selfModel.getCognitiveState();
        if (state.status === 'deliberating') {
            insights.push('Currently deliberating - what alternatives am I missing?');
        }
        
        return {
            id: `ref_bs_${Date.now()}`,
            type: 'blind_spot',
            content: `Identified blind spots: ${blindSpots.identified.length}, Suspected: ${blindSpots.suspected.length}`,
            insights,
            confidence_before: 0.5,
            confidence_after: 0.5,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Triggered reflection - called on specific events
     * @param {Object} event - Event that triggered reflection
     * @returns {Promise<Object>} Triggered reflection
     */
    async reflectOn(event) {
        const confidenceBefore = this.selfModel.getConfidence('general');
        
        // Analyze event and generate insights
        const insights = [];
        let content = '';
        
        switch (event.type) {
            case 'success':
                content = `Success: ${event.description}`;
                insights.push('What worked well?');
                this.selfModel.updateConfidence(event.domain || 'general', 0.1);
                break;
                
            case 'failure':
                content = `Failure: ${event.description}`;
                insights.push('What went wrong?');
                insights.push('What can I learn from this?');
                this.selfModel.updateConfidence(event.domain || 'general', -0.15);
                break;
                
            case 'uncertainty':
                content = `Uncertainty: ${event.description}`;
                insights.push('What information am I missing?');
                break;
                
            case 'learning':
                content = `Learning: ${event.description}`;
                insights.push('How does this change my understanding?');
                this.selfModel.updateConfidence(event.domain || 'general', 0.05);
                break;
                
            default:
                content = `Event: ${event.description}`;
        }
        
        const reflection = {
            id: `ref_trig_${Date.now()}`,
            type: 'triggered',
            trigger: event.type,
            content,
            insights,
            confidence_before: confidenceBefore,
            confidence_after: this.selfModel.getConfidence('general'),
            timestamp: new Date().toISOString()
        };
        
        this.selfModel.addReflection(reflection);
        return reflection;
    }

    /**
     * Quick reflection - lightweight version for frequent calls
     * @returns {Object} Quick reflection
     */
    quickReflect() {
        const state = this.selfModel.getCognitiveState();
        const confidence = this.selfModel.getConfidence();
        const workingOn = this.selfModel.getWorkingOn();
        
        return {
            status: state.status,
            confidence: confidence.overall.toFixed(2),
            working_on: workingOn.length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get last reflection info
     * @returns {Object} Last reflection timestamp and count
     */
    getLastReflection() {
        return this.lastReflection;
    }
}

// Need fs for config loading
const fs = require('fs');

// Main
if (require.main === module) {
    const args = process.argv.slice(2);
    const engine = new ReflectionEngine(process.env.AGENT_NAME);
    
    if (args.includes('--reflect') || args.includes('-r')) {
        // Run full reflection
        engine.reflect().then(reflections => {
            console.log(`Generated ${reflections.length} reflection(s):`);
            if (args.includes('--json') || args.includes('-j')) {
                console.log(JSON.stringify(reflections, null, 2));
            } else {
                for (const r of reflections) {
                    console.log(`  - [${r.type}] ${r.content}`);
                    if (r.insights && r.insights.length > 0) {
                        for (const insight of r.insights) {
                            console.log(`      > ${insight}`);
                        }
                    }
                }
            }
        }).catch(err => {
            console.error('Reflection error:', err.message);
            process.exit(1);
        });
    } else if (args.includes('--trigger') && args[1]) {
        // Triggered reflection
        const eventType = args[1];
        const description = args.slice(2).join(' ') || 'Manual trigger';
        engine.reflectOn({
            type: eventType,
            description
        }).then(reflection => {
            console.log('Triggered reflection:');
            console.log(JSON.stringify(reflection, null, 2));
        });
    } else if (args.includes('--quick') || args.includes('-q')) {
        // Quick reflection
        console.log(JSON.stringify(engine.quickReflect(), null, 2));
    } else {
        // Default: show summary
        console.log(`Reflection Engine for ${engine.agentName}:`);
        console.log(`  Config: reflection_interval=${engine.config.reflection_interval}s`);
        const last = engine.getLastReflection();
        if (last) {
            console.log(`  Last reflection: ${last.count} reflections at ${last.timestamp}`);
        } else {
            console.log('  No reflections yet');
        }
    }
}

module.exports = ReflectionEngine;