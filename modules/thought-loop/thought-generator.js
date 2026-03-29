#!/usr/bin/env node
/**
 * Thought Generator - Generates thoughts from relevant changes
 * 
 * Generates structured thoughts that include:
 * - What triggered the thought
 * - What it means for the agent/collective
 * - What action (if any) is recommended
 * 
 * Usage:
 *   node thought-generator.js --deltas '[]' --agent 'steward'
 *   node thought-generator.js --idle --agent 'steward'
 *   cat deltas.json | node thought-generator.js --agent 'steward'
 * 
 * Environment Variables:
 *   AGENT_NAME    - Name of current agent
 */

class ThoughtGenerator {
    /**
     * @param {string} agentName - Name of the agent
     */
    constructor(agentName) {
        this.agentName = agentName || 'unknown';
    }
    
    /**
     * Generate thoughts from deltas
     * @param {Array} deltas - Array of relevant deltas
     * @returns {Array} - Generated thoughts
     */
    generate(deltas) {
        const thoughts = [];
        
        for (const delta of deltas) {
            const thought = this.createThought(delta);
            if (thought) {
                thoughts.push(thought);
            }
        }
        
        return thoughts;
    }
    
    /**
     * Create a thought from a delta
     * @param {Object} delta - Delta object
     * @returns {Object} - Generated thought
     */
    createThought(delta) {
        const generators = {
            'file_created': this.thoughtFromFile.bind(this),
            'file_modified': this.thoughtFromFile.bind(this),
            'file_deleted': this.thoughtFromFile.bind(this),
            'db_modified': this.thoughtFromDb.bind(this),
            'external_cve': this.thoughtFromExternal.bind(this),
            'external_release': this.thoughtFromExternal.bind(this),
            'external_opportunity': this.thoughtFromExternal.bind(this),
            'agent_heartbeat': this.thoughtFromAgent.bind(this),
            'agent_offline': this.thoughtFromAgent.bind(this),
            'agent_online': this.thoughtFromAgent.bind(this)
        };
        
        const generator = generators[delta.type];
        if (generator) {
            return generator(delta);
        }
        
        return this.thoughtFromUnknown(delta);
    }
    
    /**
     * Generate thought from file delta
     */
    thoughtFromFile(delta) {
        const isNew = delta.type === 'file_created';
        const isDeleted = delta.type === 'file_deleted';
        const path = delta.path || 'unknown';
        const filename = path.split(/[/\\]/).pop();
        
        return {
            id: this.generateId(),
            type: isNew ? 'discovery' : (isDeleted ? 'alert' : 'update'),
            trigger: delta.type,
            subject: filename,
            observation: isNew 
                ? `New file created: ${path}`
                : (isDeleted ? `File deleted: ${path}` : `File modified: ${path}`),
            implication: this.evaluateImplication(delta),
            recommendation: this.generateRecommendation(delta),
            confidence: isNew ? 0.7 : (isDeleted ? 0.8 : 0.6),
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName,
            metadata: {
                path: path,
                size: delta.size
            }
        };
    }
    
    /**
     * Generate thought from database delta
     */
    thoughtFromDb(delta) {
        return {
            id: this.generateId(),
            type: 'state_change',
            trigger: delta.type,
            subject: delta.database,
            observation: `Database modified: ${delta.database}`,
            implication: 'State change may affect collective decisions',
            recommendation: this.generateRecommendation(delta),
            confidence: 0.5,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName,
            metadata: {
                database: delta.database
            }
        };
    }
    
    /**
     * Generate thought from external delta
     */
    thoughtFromExternal(delta) {
        const isCVE = delta.type === 'external_cve';
        const urgency = isCVE ? 'high' : 'medium';
        
        return {
            id: this.generateId(),
            type: 'external_awareness',
            trigger: delta.type,
            subject: delta.source || 'external',
            observation: isCVE
                ? `Security vulnerability detected: ${delta.cve || 'unknown'}`
                : `External event: ${delta.type} from ${delta.repository || 'unknown'}`,
            implication: isCVE
                ? 'Security implications for collective - requires immediate attention'
                : 'Potential opportunity or threat to evaluate',
            recommendation: isCVE
                ? 'trigger_deliberation'
                : 'broadcast_thought',
            confidence: isCVE ? 0.8 : 0.6,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName,
            metadata: {
                source: delta.source,
                repository: delta.repository,
                release: delta.release
            }
        };
    }
    
    /**
     * Generate thought from agent delta
     */
    thoughtFromAgent(delta) {
        const isOffline = delta.type === 'agent_offline';
        const isOnline = delta.type === 'agent_online';
        
        return {
            id: this.generateId(),
            type: isOffline ? 'alert' : (isOnline ? 'status' : 'update'),
            trigger: delta.type,
            subject: delta.agent,
            observation: isOffline
                ? `Agent ${delta.agent} went offline`
                : (isOnline ? `Agent ${delta.agent} is now online` : `Agent ${delta.agent} status: ${delta.status}`),
            implication: isOffline
                ? 'Collective capacity reduced - failover may be needed'
                : (isOnline ? 'Collective capacity restored' : 'Agent status updated'),
            recommendation: isOffline
                ? 'trigger_failover_vote'
                : 'update_context',
            confidence: 0.9,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName,
            metadata: {
                agent: delta.agent,
                status: delta.status
            }
        };
    }
    
    /**
     * Generate thought for unknown delta type
     */
    thoughtFromUnknown(delta) {
        return {
            id: this.generateId(),
            type: 'unknown',
            trigger: delta.type || 'unknown',
            subject: 'unknown',
            observation: `Unknown change: ${JSON.stringify(delta).substring(0, 100)}`,
            implication: 'Requires investigation',
            recommendation: 'log_for_review',
            confidence: 0.3,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName
        };
    }
    
    /**
     * Evaluate implication based on delta properties
     */
    evaluateImplication(delta) {
        const path = delta.path || '';
        
        if (path.includes('PROPOSALS')) {
            return 'May affect active or pending proposals';
        }
        if (path.includes('MEMORY')) {
            return 'Collective memory updated';
        }
        if (path.includes('consensus')) {
            return 'Consensus state changed';
        }
        if (path.includes('SECURITY')) {
            return 'Security-related change detected';
        }
        if (path.includes('governance')) {
            return 'Governance parameter change';
        }
        if (path.includes('IMPLEMENTATIONS')) {
            return 'Implementation change - may affect execution';
        }
        
        return 'Standard change detected';
    }
    
    /**
     * Generate recommendation based on delta type
     */
    generateRecommendation(delta) {
        const recommendations = {
            'file_created': 'broadcast_thought',
            'file_modified': 'update_context',
            'file_deleted': 'trigger_deliberation',
            'db_modified': 'check_consensus',
            'external_cve': 'trigger_deliberation',
            'external_release': 'evaluate_update',
            'external_opportunity': 'broadcast_thought',
            'agent_offline': 'trigger_failover_vote',
            'agent_online': 'update_context',
            'agent_heartbeat': 'log_for_review'
        };
        
        return recommendations[delta.type] || 'log_for_review';
    }
    
    /**
     * Generate unique thought ID
     */
    generateId() {
        return `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate idle thoughts - what should the agent think about when there's no new input?
     * This enables continuous autonomous thinking even without external triggers
     */
    generateIdleThoughts() {
        const thoughts = [];
        const maxThoughts = parseInt(process.env.MAX_IDLE_THOUGHTS) || 3;
        
        // Reflection on current goals
        thoughts.push({
            id: this.generateId(),
            type: 'reflection',
            trigger: 'idle',
            subject: 'goals',
            observation: 'Periodic self-reflection on active goals',
            implication: 'Ensures alignment with collective purpose',
            recommendation: 'review_active_proposals',
            confidence: 0.5,
            timestamp: new Date().toISOString(),
            agent: this.agentName
        });
        
        // Check for pending actions
        thoughts.push({
            id: this.generateId(),
            type: 'reflection',
            trigger: 'idle',
            subject: 'pending_actions',
            observation: 'Review of pending actions and their status',
            implication: 'Ensures nothing is overlooked',
            recommendation: 'check_pending_actions',
            confidence: 0.4,
            timestamp: new Date().toISOString(),
            agent: this.agentName
        });
        
        // System health check
        thoughts.push({
            id: this.generateId(),
            type: 'reflection',
            trigger: 'idle',
            subject: 'system_health',
            observation: 'Self-assessment of system health and capacity',
            implication: 'Maintains operational awareness',
            recommendation: 'log_for_review',
            confidence: 0.4,
            timestamp: new Date().toISOString(),
            agent: this.agentName
        });
        
        return thoughts.slice(0, maxThoughts);
    }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let deltas = [];
    let isIdle = false;
    let outputJson = false;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--deltas' && args[i + 1]) {
            try {
                deltas = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON
            }
        } else if (args[i] === '--idle') {
            isIdle = true;
        } else if (args[i] === '--agent' && args[i + 1]) {
            process.env.AGENT_NAME = args[i + 1];
            i++;
        } else if (args[i] === '--json' || args[i] === '-j') {
            outputJson = true;
        }
    }
    
    // If no deltas provided via args, try stdin
    if (deltas.length === 0 && !isIdle) {
        try {
            const stdin = require('fs').readFileSync(0, 'utf8');
            if (stdin.trim()) {
                deltas = JSON.parse(stdin);
            }
        } catch (e) {
            // No stdin input
        }
    }
    
    return { deltas, isIdle, outputJson };
}

/**
 * Main function
 */
async function main() {
    const { deltas, isIdle, outputJson } = parseArgs();
    const agentName = process.env.AGENT_NAME || 'steward';
    const generator = new ThoughtGenerator(agentName);
    
    let thoughts;
    
    if (isIdle) {
        thoughts = generator.generateIdleThoughts();
    } else {
        // If no deltas provided via args, try stdin
        if (deltas.length === 0) {
            if (outputJson) {
                console.log(JSON.stringify([]));
            } else {
                console.error('No deltas provided');
                process.exit(1);
            }
            return;
        }
        thoughts = generator.generate(deltas);
    }
    
    if (outputJson) {
        console.log(JSON.stringify(thoughts));
    } else {
        console.error(`Generated ${thoughts.length} thought(s)`);
        for (const thought of thoughts) {
            console.error(`  - [${thought.type}] ${thought.observation}`);
        }
    }
}

// Run if called directly
main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
