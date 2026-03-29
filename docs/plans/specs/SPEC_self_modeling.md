# Module Specification: Self-Modeling

## Overview

The **Self-Modeling** module gives each agent awareness of its own capabilities, limitations, and cognitive state. This enables meta-cognition: thinking about thinking.

## Purpose

Without self-modeling, agents:
- Don't know what they know
- Can't assess their own confidence
- Can't identify their blind spots
- Can't reflect on their reasoning

With self-modeling, agents can:
- Track what capabilities they have
- Evaluate their confidence in reasoning
- Recognize when they're uncertain
- Reflect on their cognitive processes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Self-Model Engine                            │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Capability   │    │  Confidence  │    │  Reflection  │      │
│  │ Tracker      │    │  Scorer      │    │   Engine     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │              │
│         └───────────────────┼───────────────────┘              │
│                             │                                    │
│                    ┌─────────▼─────────┐                        │
│                    │   Self-Model DB   │                        │
│                    │  (JSON file)      │                        │
│                    └───────────────────┘                        │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐              │
│         │                   │                   │              │
│  ┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐       │
│  │   What I    │    │  What I'm   │    │   What I    │       │
│  │   Know      │    │  Working On │    │  Can Do     │       │
│  └─────────────┘    └─────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
heretek-skills/skills/self-modeling/
├── SKILL.md                           # Skill specification
├── self-model.sh                      # Main orchestrator
├── lib/
│   ├── self-model.js                  # Core self-model class
│   ├── capability-tracker.js           # Track what agent can do
│   ├── confidence-scorer.js            # Assess reasoning confidence
│   ├── reflection-engine.js            # Periodic self-assessment
│   ├── blind-spot-detector.js         # Identify unknown unknowns
│   └── cognitive-state.js             # Current thinking state
├── templates/
│   └── self-model-schema.json          # Self-model data schema
└── tests/
    ├── test-capability.js              # Capability tracking tests
    ├── test-confidence.js              # Confidence scoring tests
    └── test-reflection.js              # Reflection tests
```

## Implementation Details

### 1. Core Self-Model: `self-model.js`

```javascript
#!/usr/bin/env node
/**
 * Self-Model - Core class for agent self-awareness
 * 
 * Maintains:
 * - capabilities: What the agent can do
 * - knowledge: What the agent knows
 * - workingOn: Current active tasks
 * - confidence: Reasoning confidence levels
 * - cognitiveState: Current thinking state
 * - blindSpots: Known unknown unknowns
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = process.env.SELF_MODEL_FILE || '/workspace/self-model.json';

class SelfModel {
    constructor(agentName) {
        this.agentName = agentName || process.env.AGENT_NAME || 'unknown';
        this.model = this.load();
    }
    
    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load self-model:', e.message);
        }
        
        // Initialize default model
        return this.initialize();
    }
    
    initialize() {
        return {
            agent: this.agentName,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            capabilities: {
                available: [],
                active: [],
                learning: [],
                deprecated: []
            },
            knowledge: {
                domains: [],
                facts: {},
                context: {}
            },
            workingOn: {
                tasks: [],
                decisions_pending: [],
                reflections: []
            },
            confidence: {
                overall: 0.5,
                by_domain: {},
                recent_trend: []
            },
            cognitiveState: {
                status: 'idle', // idle, thinking, deliberating, acting
                focus: null,
                depth: 0,
                last_thought: null
            },
            blindSpots: {
                identified: [],
                suspected: [],
                ignored: []
            },
            metrics: {
                thoughts_generated: 0,
                actions_taken: 0,
                decisions_made: 0,
                reflections_completed: 0,
                confidence_changes: 0
            }
        };
    }
    
    save() {
        this.model.updated = new Date().toISOString();
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.model, null, 2));
        } catch (e) {
            console.error('Failed to save self-model:', e.message);
        }
    }
    
    // === Capabilities ===
    
    registerCapability(capability) {
        if (!this.model.capabilities.available.includes(capability)) {
            this.model.capabilities.available.push(capability);
            this.model.capabilities.active.push(capability);
        }
    }
    
    getCapabilities() {
        return {
            available: this.model.capabilities.available,
            active: this.model.capabilities.active,
            learning: this.model.capabilities.learning
        };
    }
    
    useCapability(capability) {
        if (this.model.capabilities.active.includes(capability)) {
            // Already active
            return true;
        }
        if (this.model.capabilities.available.includes(capability)) {
            this.model.capabilities.active.push(capability);
            return true;
        }
        return false;
    }
    
    // === Knowledge ===
    
    learn(domain, fact, confidence = 0.7) {
        if (!this.model.knowledge.domains.includes(domain)) {
            this.model.knowledge.domains.push(domain);
            this.model.knowledge.domains[domain] = {};
            this.model.knowledge.by_domain = this.model.knowledge.by_domain || {};
            this.model.knowledge.by_domain[domain] = 0;
        }
        
        this.model.knowledge.facts[`${domain}:${fact.id}`] = {
            ...fact,
            learned_at: new Date().toISOString(),
            confidence
        };
        
        this.model.knowledge.by_domain[domain] += 1;
    }
    
    know(domain, factId) {
        return !!this.model.knowledge.facts[`${domain}:${factId}`];
    }
    
    getKnowledge(domain) {
        const facts = {};
        for (const [key, fact] of Object.entries(this.model.knowledge.facts)) {
            if (key.startsWith(`${domain}:`)) {
                facts[key] = fact;
            }
        }
        return facts;
    }
    
    // === Working On ===
    
    startTask(task) {
        this.model.workingOn.tasks.push({
            id: task.id || `task_${Date.now()}`,
            description: task.description,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            progress: 0
        });
        
        this.updateCognitiveState('thinking', task.description);
    }
    
    completeTask(taskId) {
        const task = this.model.workingOn.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.completed_at = new Date().toISOString();
            task.progress = 100;
        }
    }
    
    getWorkingOn() {
        return this.model.workingOn.tasks.filter(t => t.status === 'in_progress');
    }
    
    // === Confidence ===
    
    updateConfidence(domain, delta) {
        const current = this.model.confidence.by_domain[domain] || 0.5;
        const newConfidence = Math.max(0, Math.min(1, current + delta));
        
        this.model.confidence.by_domain[domain] = newConfidence;
        
        // Update overall confidence
        const domains = Object.keys(this.model.confidence.by_domain);
        if (domains.length > 0) {
            const avg = domains.reduce((sum, d) => sum + this.model.confidence.by_domain[d], 0) / domains.length;
            this.model.confidence.overall = avg;
        }
        
        // Track trend
        this.model.confidence.recent_trend.push({
            timestamp: new Date().toISOString(),
            domain,
            delta,
            new_confidence: newConfidence
        });
        
        // Keep only last 20 entries
        if (this.model.confidence.recent_trend.length > 20) {
            this.model.confidence.recent_trend = this.model.confidence.recent_trend.slice(-20);
        }
        
        if (delta !== 0) {
            this.model.metrics.confidence_changes++;
        }
    }
    
    getConfidence(domain = null) {
        if (domain) {
            return this.model.confidence.by_domain[domain] || 0.5;
        }
        return {
            overall: this.model.confidence.overall,
            by_domain: this.model.confidence.by_domain,
            trend: this.model.confidence.recent_trend
        };
    }
    
    // === Cognitive State ===
    
    updateCognitiveState(status, focus = null, depth = null) {
        const previous = { ...this.model.cognitiveState };
        
        this.model.cognitiveState.status = status;
        if (focus !== null) this.model.cognitiveState.focus = focus;
        if (depth !== null) this.model.cognitiveState.depth = depth;
        
        this.model.cognitiveState.last_thought = new Date().toISOString();
        
        return previous;
    }
    
    getCognitiveState() {
        return this.model.cognitiveState;
    }
    
    // === Reflections ===
    
    addReflection(reflection) {
        this.model.workingOn.reflections.push({
            id: reflection.id || `ref_${Date.now()}`,
            type: reflection.type, // 'capability', 'confidence', 'blind_spot', 'general'
            content: reflection.content,
            insights: reflection.insights || [],
            confidence_before: reflection.confidence_before,
            confidence_after: reflection.confidence_after,
            timestamp: new Date().toISOString()
        });
        
        this.model.metrics.reflections_completed++;
        
        // Keep only last 50 reflections
        if (this.model.workingOn.reflections.length > 50) {
            this.model.workingOn.reflections = this.model.workingOn.reflections.slice(-50);
        }
    }
    
    getRecentReflections(count = 10) {
        return this.model.workingOn.reflections.slice(-count);
    }
    
    // === Blind Spots ===
    
    identifyBlindSpot(spot) {
        if (!this.model.blindSpots.identified.find(s => s.id === spot.id)) {
            this.model.blindSpots.identified.push(spot);
        }
    }
    
    suspectBlindSpot(spot) {
        if (!this.model.blindSpots.suspected.find(s => s.id === spot.id)) {
            this.model.blindSpots.suspected.push(spot);
        }
    }
    
    getBlindSpots() {
        return {
            identified: this.model.blindSpots.identified,
            suspected: this.model.blindSpots.suspected
        };
    }
    
    // === Metrics ===
    
    incrementThoughtCount() {
        this.model.metrics.thoughts_generated++;
    }
    
    incrementActionCount() {
        this.model.metrics.actions_taken++;
    }
    
    incrementDecisionCount() {
        this.model.metrics.decisions_made++;
    }
    
    getMetrics() {
        return this.model.metrics;
    }
    
    // === Export ===
    
    toJSON() {
        return this.model;
    }
    
    summary() {
        return {
            agent: this.agentName,
            status: this.model.cognitiveState.status,
            confidence: this.model.confidence.overall.toFixed(2),
            capabilities: this.model.capabilities.active.length,
            working_on: this.getWorkingOn().length,
            recent_reflections: this.model.workingOn.reflections.length,
            blind_spots: this.model.blindSpots.identified.length
        };
    }
}

module.exports = SelfModel;

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    const agentName = process.env.AGENT_NAME || 'default';
    const model = new SelfModel(agentName);
    
    if (args.includes('--json') || args.includes('-j')) {
        console.log(JSON.stringify(model.toJSON(), null, 2));
    } else if (args.includes('--summary') || args.includes('-s')) {
        console.log(JSON.stringify(model.summary(), null, 2));
    } else {
        console.log(`Self-Model for ${agentName}:`);
        console.log(JSON.stringify(model.summary(), null, 2));
    }
}
```

### 2. Capability Tracker: `capability-tracker.js`

```javascript
#!/usr/bin/env node
/**
 * Capability Tracker - Tracks what the agent can do
 * 
 * Manages:
 * - Available capabilities (skills, tools)
 * - Active capabilities (currently usable)
 * - Learning capabilities (being developed)
 * - Capability dependencies
 * - Confidence per capability
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILLS_DIR = process.env.SKILLS_DIR || '/openclaw/skills';
const CAPABILITY_FILE = process.env.CAPABILITY_FILE || '/workspace/capabilities.json';

class CapabilityTracker {
    constructor(agentName) {
        this.agentName = agentName;
        this.capabilities = this.loadCapabilities();
    }
    
    loadCapabilities() {
        try {
            if (fs.existsSync(CAPABILITY_FILE)) {
                return JSON.parse(fs.readFileSync(CAPABILITY_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load capabilities:', e.message);
        }
        
        return this.initialize();
    }
    
    initialize() {
        return {
            agent: this.agentName,
            initialized: new Date().toISOString(),
            skills: [],           // Available skills
            tools: [],            // Available tools
            apis: [],             // Available API endpoints
            capabilities: {},     // Derived capabilities
            confidence: {},       // Confidence per capability
            dependencies: {}     // What capabilities depend on others
        };
    }
    
    save() {
        try {
            fs.writeFileSync(CAPABILITY_FILE, JSON.stringify(this.capabilities, null, 2));
        } catch (e) {
            console.error('Failed to save capabilities:', e.message);
        }
    }
    
    // === Discovery ===
    
    discoverSkills() {
        // Scan skills directory
        try {
            const files = fs.readdirSync(SKILLS_DIR);
            const skills = files.filter(f => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory());
            
            for (const skill of skills) {
                if (!this.capabilities.skills.includes(skill)) {
                    this.capabilities.skills.push(skill);
                }
            }
            
            console.log(`Discovered ${skills.length} skills`);
        } catch (e) {
            console.error('Failed to discover skills:', e.message);
        }
    }
    
    // === Registration ===
    
    registerSkill(skill) {
        if (!this.capabilities.skills.includes(skill)) {
            this.capabilities.skills.push(skill);
            this.capabilities.confidence[skill] = 0.5;
            this.save();
        }
    }
    
    registerTool(tool) {
        if (!this.capabilities.tools.includes(tool)) {
            this.capabilities.tools.push(tool);
        }
    }
    
    // === Usage ===
    
    canDo(capability) {
        return this.capabilities.capabilities[capability] !== undefined ||
               this.capabilities.skills.includes(capability) ||
               this.capabilities.tools.includes(capability);
    }
    
    use(capability) {
        // Update confidence based on usage
        const current = this.capabilities.confidence[capability] || 0.5;
        this.capabilities.confidence[capability] = Math.min(1, current + 0.05);
        this.save();
    }
    
    fail(capability) {
        // Reduce confidence on failure
        const current = this.capabilities.confidence[capability] || 0.5;
        this.capabilities.confidence[capability] = Math.max(0.1, current - 0.1);
        this.save();
    }
    
    // === Derivation ===
    
    deriveCapability(name, requires, provides) {
        this.capabilities.capabilities[name] = {
            requires,  // Skills/tools needed
            provides, // What this enables
            confidence: 0.5
        };
        
        this.capabilities.dependencies[name] = requires;
    }
    
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
        
        return requirementConfidence;
    }
    
    // === Query ===
    
    getAll() {
        return {
            skills: this.capabilities.skills,
            tools: this.capabilities.tools,
            apis: this.capabilities.apis,
            capabilities: this.capabilities.capabilities,
            confidence: this.capabilities.confidence
        };
    }
    
    getByConfidence(minConfidence = 0) {
        return Object.entries(this.capabilities.confidence)
            .filter(([_, conf]) => conf >= minConfidence)
            .map(([name, conf]) => ({ name, confidence: conf }));
    }
}

// Main
if (require.main === module) {
    const tracker = new CapabilityTracker(process.env.AGENT_NAME);
    
    // Discover available skills
    tracker.discoverSkills();
    
    // Output
    const args = process.argv.slice(2);
    if (args.includes('--json')) {
        console.log(JSON.stringify(tracker.getAll(), null, 2));
    } else {
        const all = tracker.getAll();
        console.log(`Capabilities for ${tracker.agentName}:`);
        console.log(`  Skills: ${all.skills.length}`);
        console.log(`  Tools: ${all.tools.length}`);
        console.log(`  Derived: ${Object.keys(all.capabilities).length}`);
    }
}

module.exports = CapabilityTracker;
```

### 3. Confidence Scorer: `confidence-scorer.js`

```javascript
#!/usr/bin/env node
/**
 * Confidence Scorer - Evaluates reasoning confidence
 * 
 * Factors that affect confidence:
 * - Evidence quality (sources, citations)
 * - Consistency with known facts
 * - Source reliability
 * - Time since last validation
 * - Number of supporting sources
 */

class ConfidenceScorer {
    constructor() {
        this.weights = {
            evidence_quality: 0.3,
            consistency: 0.25,
            source_reliability: 0.2,
            recency: 0.15,
            source_count: 0.1
        };
    }
    
    /**
     * Score reasoning confidence
     * @param {Object} context - Reasoning context
     * @returns {number} Confidence score 0-1
     */
    score(context) {
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
    
    scoreConsistency(consistency) {
        if (!consistency) return 0.3;
        
        // Consistent with known facts?
        if (consistency.isConsistent === true) return 0.9;
        if (consistency.isConsistent === false) return 0.1;
        
        return 0.5; // Unknown
    }
    
    scoreSourceReliability(sources) {
        if (!sources || sources.length === 0) return 0.2;
        
        let totalReliability = 0;
        for (const source of sources) {
            totalReliability += source.reliability || 0.5;
        }
        
        return Math.min(1, totalReliability / sources.length);
    }
    
    scoreRecency(timestamp) {
        if (!timestamp) return 0.3;
        
        const age = Date.now() - new Date(timestamp).getTime();
        const hoursOld = age / (1000 * 60 * 60);
        
        if (hoursOld < 1) return 1.0;
        if (hoursOld < 24) return 0.8;
        if (hoursOld < 168) return 0.6; // 1 week
        if (hoursOld < 720) return 0.4; // 1 month
        
        return 0.2;
    }
    
    scoreSourceCount(count) {
        if (!count || count === 0) return 0.1;
        if (count >= 5) return 1.0;
        if (count >= 3) return 0.8;
        if (count >= 2) return 0.6;
        
        return 0.4;
    }
    
    /**
     * Explain confidence score
     */
    explain(context) {
        const score = this.score(context);
        
        return {
            score,
            factors: {
                evidence_quality: {
                    score: this.scoreEvidence(context.evidence),
                    weight: this.weights.evidence_quality,
                    contribution: this.scoreEvidence(context.evidence) * this.weights.evidence_quality
                },
                consistency: {
                    score: this.scoreConsistency(context.consistency),
                    weight: this.weights.consistency,
                    contribution: this.scoreConsistency(context.consistency) * this.weights.consistency
                },
                source_reliability: {
                    score: this.scoreSourceReliability(context.sources),
                    weight: this.weights.source_reliability,
                    contribution: this.scoreSourceReliability(context.sources) * this.weights.source_reliability
                },
                recency: {
                    score: this.scoreRecency(context.timestamp),
                    weight: this.weights.recency,
                    contribution: this.scoreRecency(context.timestamp) * this.weights.recency
                },
                source_count: {
                    score: this.scoreSourceCount(context.sourceCount),
                    weight: this.weights.source_count,
                    contribution: this.scoreSourceCount(context.sourceCount) * this.weights.source_count
                }
            }
        };
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
        // No input
    }
    
    // Parse args
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--context' && args[i + 1]) {
            try {
                context = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {}
        }
    }
    
    if (args.includes('--explain')) {
        console.log(JSON.stringify(scorer.explain(context), null, 2));
    } else {
        console.log(scorer.score(context).toFixed(2));
    }
}

module.exports = ConfidenceScorer;
```

### 4. Reflection Engine: `reflection-engine.js`

```javascript
#!/usr/bin/env node
/**
 * Reflection Engine - Periodic self-assessment
 * 
 * Types of reflection:
 * - Capability reflection: What can I do? What can't I do?
 * - Confidence reflection: How confident am I? Why?
 * - Decision reflection: Did my decisions work out?
 * - Blind spot reflection: What might I be missing?
 */

const SelfModel = require('./self-model.js');
const CapabilityTracker = require('./capability-tracker.js');
const ConfidenceScorer = require('./confidence-scorer.js');

class ReflectionEngine {
    constructor(agentName) {
        this.agentName = agentName;
        this.selfModel = new SelfModel(agentName);
        this.capabilityTracker = new CapabilityTracker(agentName);
        this.confidenceScorer = new ConfidenceScorer();
        
        this.lastReflection = null;
    }
    
    /**
     * Run periodic reflection
     */
    async reflect() {
        const reflections = [];
        
        // 1. Capability reflection
        const capabilityReflection = await this.reflectOnCapabilities();
        if (capabilityReflection) reflections.push(capabilityReflection);
        
        // 2. Confidence reflection
        const confidenceReflection = await this.reflectOnConfidence();
        if (confidenceReflection) reflections.push(confidenceReflection);
        
        // 3. Decision reflection
        const decisionReflection = await this.reflectOnDecisions();
        if (decisionReflection) reflections.push(decisionReflection);
        
        // 4. Blind spot reflection
        const blindSpotReflection = await this.reflectOnBlindSpots();
        if (blindSpotReflection) reflections.push(blindSpotReflection);
        
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
     * Reflect on capabilities
     */
    async reflectOnCapabilities() {
        const capabilities = this.capabilityTracker.getAll();
        const workingOn = this.selfModel.getWorkingOn();
        
        // What can I do?
        const availableCount = capabilities.skills.length + capabilities.tools.length;
        const activeCount = capabilities.capabilities ? Object.keys(capabilities.capabilities).length : 0;
        
        // What am I working on?
        const inProgress = workingOn.length;
        
        // Identify capability gaps
        const gaps = [];
        if (inProgress === 0) {
            gaps.push('No active tasks - am I idle?');
        }
        if (availableCount < 5) {
            gaps.push('Limited capabilities - should I learn more skills?');
        }
        
        return {
            type: 'capability',
            content: `Active capabilities: ${activeCount}, Available: ${availableCount}, Working on: ${inProgress}`,
            insights: gaps,
            confidence_before: this.selfModel.getConfidence('capabilities'),
            confidence_after: Math.min(1, (availableCount / 10) + (inProgress > 0 ? 0.3 : 0))
        };
    }
    
    /**
     * Reflect on confidence
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
        
        return {
            type: 'confidence',
            content: `Overall confidence: ${(confidence.overall * 100).toFixed(0)}%, Trend: ${trendDirection}`,
            insights,
            confidence_before: confidence.overall,
            confidence_after: confidence.overall
        };
    }
    
    /**
     * Reflect on recent decisions
     */
    async reflectOnDecisions() {
        // This would query decision history
        // For now, placeholder
        
        return {
            type: 'decision',
            content: 'Decision reflection requires decision history',
            insights: [],
            confidence_before: 0.5,
            confidence_after: 0.5
        };
    }
    
    /**
     * Reflect on blind spots
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
        
        // General blind spot check
        insights.push('What questions am I not asking?');
        insights.push('What would challenge my current thinking?');
        
        return {
            type: 'blind_spot',
            content: `Identified blind spots: ${blindSpots.identified.length}, Suspected: ${blindSpots.suspected.length}`,
            insights,
            confidence_before: 0.5,
            confidence_after: 0.5
        };
    }
    
    /**
     * Triggered reflection (not periodic)
     */
    async reflectOn(event) {
        const reflection = {
            type: 'triggered',
            trigger: event.type,
            content: event.description,
            insights: [],
            confidence_before: this.selfModel.getConfidence('general'),
            confidence_after: this.selfModel.getConfidence('general')
        };
        
        this.selfModel.addReflection(reflection);
        return reflection;
    }
}

// Main
if (require.main === module) {
    const args = process.argv.slice(2);
    const engine = new ReflectionEngine(process.env.AGENT_NAME);
    
    if (args.includes('--reflect')) {
        // Run reflection
        engine.reflect().then(reflections => {
            console.log(`Generated ${reflections.length} reflection(s)`);
            if (args.includes('--json')) {
                console.log(JSON.stringify(reflections, null, 2));
            } else {
                for (const r of reflections) {
                    console.log(`  - [${r.type}] ${r.content}`);
                }
            }
        });
    } else if (args.includes('--trigger') && args[1]) {
        // Triggered reflection
        engine.reflectOn({
            type: 'external',
            description: args.slice(2).join(' ') || 'Manual trigger'
        }).then(reflection => {
            console.log('Triggered reflection:', JSON.stringify(reflection, null, 2));
        });
    }
}

module.exports = ReflectionEngine;
```

## Integration

### With Continuous Thought Loop

The self-model provides context for thought generation:
- What capabilities does the agent have? → What thoughts can it generate?
- How confident is it? → How certain are its thoughts?
- What is it working on? → What should it think about next?

### With Governance Modules

Self-model respects inviolable parameters:
- Cannot modify consensus threshold confidence
- Cannot override safety confidence below threshold

### With Curiosity Engine

Self-model integrates with gap detection:
- Identifies capability gaps → learns new skills
- Tracks learning progress → celebrates growth

## Configuration

```json
{
    "reflection_interval": 3600,
    "confidence_threshold": 0.3,
    "track_capabilities": true,
    "track_knowledge": true,
    "track_blind_spots": true
}
```

## Testing

- Capability discovery and tracking
- Confidence scoring accuracy
- Reflection generation quality
- Self-model persistence