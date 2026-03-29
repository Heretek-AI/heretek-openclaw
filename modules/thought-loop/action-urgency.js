#!/usr/bin/env node
/**
 * Action Urgency - Determines which thoughts require action
 * 
 * Urgency thresholds:
 * - 0.0-0.3: Log only
 * - 0.3-0.6: Monitor
 * - 0.6-0.8: Consider action
 * - 0.8-1.0: Immediate action
 * 
 * Usage:
 *   node action-urgency.js --thoughts '[]'  # With args
 *   cat thoughts.json | node action-urgency.js  # Via stdin
 *   node action-urgency.js --json         # Output JSON
 * 
 * Environment Variables:
 *   URGENCY_THRESHOLD - Minimum urgency to trigger action (default: 0.6)
 */

const URGENCY_THRESHOLD = parseFloat(process.env.URGENCY_THRESHOLD) || 0.6;

// Action mapping - maps recommendations to executable actions
const ACTION_MAPPING = {
    'trigger_deliberation': {
        threshold: 0.7,
        action_type: 'trigger_deliberation',
        target: 'auto-deliberation-trigger',
        description: 'Trigger deliberation process'
    },
    'broadcast_thought': {
        threshold: 0.5,
        action_type: 'broadcast_thought',
        target: 'triad-sync',
        description: 'Broadcast thought to other agents'
    },
    'trigger_failover_vote': {
        threshold: 0.9,
        action_type: 'trigger_deliberation',
        target: 'failover-vote',
        description: 'Initiate failover vote'
    },
    'update_context': {
        threshold: 0.4,
        action_type: 'update_context',
        target: 'memory-context',
        description: 'Update active context'
    },
    'evaluate_update': {
        threshold: 0.6,
        action_type: 'trigger_deliberation',
        target: 'curiosity-engine',
        description: 'Evaluate external update'
    },
    'check_consensus': {
        threshold: 0.5,
        action_type: 'query',
        target: 'consensus-ledger',
        description: 'Check consensus state'
    },
    'review_active_proposals': {
        threshold: 0.4,
        action_type: 'query',
        target: 'proposals',
        description: 'Review active proposals'
    },
    'check_pending_actions': {
        threshold: 0.3,
        action_type: 'query',
        target: 'pending-actions',
        description: 'Check pending actions'
    },
    'log_for_review': {
        threshold: 0.0,
        action_type: 'log',
        target: 'memory',
        description: 'Log for later review'
    }
};

/**
 * ActionUrgencyEvaluator class
 */
class ActionUrgencyEvaluator {
    constructor() {
        this.threshold = URGENCY_THRESHOLD;
    }
    
    /**
     * Evaluate thoughts and return actions that need to be taken
     * @param {Array} thoughts - Array of thought objects
     * @returns {Array} - Actions requiring attention
     */
    evaluate(thoughts) {
        const actions = [];
        
        for (const thought of thoughts) {
            const urgency = this.calculateUrgency(thought);
            
            if (urgency >= this.threshold) {
                const action = this.mapToAction(thought, urgency);
                if (action) {
                    actions.push(action);
                }
            }
        }
        
        return actions;
    }
    
    /**
     * Calculate urgency score for a thought
     * @param {Object} thought - Thought object
     * @returns {number} - Urgency score (0-1)
     */
    calculateUrgency(thought) {
        let urgency = 0;
        
        // 1. Base urgency from confidence (30% weight)
        const confidence = thought.confidence || 0.5;
        urgency += confidence * 0.3;
        
        // 2. Type-specific urgency (40% weight)
        const typeUrgency = {
            'alert': 0.9,
            'security': 0.9,
            'state_change': 0.7,
            'discovery': 0.5,
            'external_awareness': 0.6,
            'update': 0.4,
            'status': 0.3,
            'reflection': 0.2,
            'unknown': 0.1
        };
        
        urgency += (typeUrgency[thought.type] || 0.3) * 0.4;
        
        // 3. Recommendation factor (20% weight)
        if (thought.recommendation === 'trigger_deliberation') {
            urgency += 0.2;
        } else if (thought.recommendation === 'trigger_failover_vote') {
            urgency += 0.3; // Failover is always urgent
        } else if (thought.recommendation === 'broadcast_thought') {
            urgency += 0.1;
        }
        
        // 4. Time-based urgency (10% weight)
        // Recent thoughts are more urgent
        const thoughtTime = new Date(thought.timestamp).getTime();
        const now = Date.now();
        const ageMs = now - thoughtTime;
        const ageMinutes = ageMs / (1000 * 60);
        
        if (ageMinutes < 1) {
            urgency += 0.1; // Less than 1 minute old
        } else if (ageMinutes < 5) {
            urgency += 0.05; // Less than 5 minutes old
        } else if (ageMinutes > 30) {
            urgency -= 0.1; // Older than 30 minutes - less urgent
        }
        
        return Math.min(1.0, Math.max(0.0, urgency));
    }
    
    /**
     * Map a thought to an action
     * @param {Object} thought - Thought object
     * @param {number} urgency - Calculated urgency
     * @returns {Object|null} - Action object or null
     */
    mapToAction(thought, urgency) {
        const recommendation = thought.recommendation || 'log_for_review';
        const actionSpec = ACTION_MAPPING[recommendation];
        
        if (!actionSpec) {
            // Default action
            return {
                type: 'log',
                target: 'memory',
                thought_id: thought.id,
                urgency: urgency,
                metadata: {
                    subject: thought.subject,
                    observation: thought.observation,
                    agent: thought.agent
                }
            };
        }
        
        // Check if urgency meets threshold for this action type
        if (urgency < actionSpec.threshold) {
            return null;
        }
        
        return {
            type: actionSpec.action_type,
            target: actionSpec.target,
            thought_id: thought.id,
            urgency: urgency,
            description: actionSpec.description,
            metadata: {
                subject: thought.subject,
                observation: thought.observation,
                agent: thought.agent,
                thought_type: thought.type,
                recommendation: thought.recommendation,
                timestamp: thought.timestamp
            }
        };
    }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let thoughts = [];
    let outputJson = false;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--thoughts' && args[i + 1]) {
            try {
                thoughts = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON
            }
        } else if (args[i] === '--json' || args[i] === '-j') {
            outputJson = true;
        } else if (args[i] === '--threshold' && args[i + 1]) {
            process.env.URGENCY_THRESHOLD = args[i + 1];
            i++;
        }
    }
    
    // If no thoughts provided via args, try stdin
    if (thoughts.length === 0) {
        try {
            const stdin = require('fs').readFileSync(0, 'utf8');
            if (stdin.trim()) {
                thoughts = JSON.parse(stdin);
            }
        } catch (e) {
            // No stdin input
        }
    }
    
    return { thoughts, outputJson };
}

/**
 * Main function
 */
async function main() {
    const { thoughts, outputJson } = parseArgs();
    const evaluator = new ActionUrgencyEvaluator();
    
    if (!thoughts || thoughts.length === 0) {
        if (outputJson) {
            console.log(JSON.stringify([]));
        } else {
            console.error('No thoughts provided');
            process.exit(1);
        }
        return;
    }
    
    const actions = evaluator.evaluate(thoughts);
    
    if (outputJson) {
        console.log(JSON.stringify(actions));
    } else {
        console.error(`Found ${actions.length} action(s) requiring urgency >= ${URGENCY_THRESHOLD}`);
        for (const action of actions) {
            console.error(`  - [${action.type}] ${action.description || action.target} (urgency: ${action.urgency.toFixed(2)})`);
        }
    }
}

// Run if called directly
main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
