#!/usr/bin/env node
/**
 * Relevance Scorer - Scores deltas by importance to the agent
 * 
 * Scoring factors:
 * - Agent relevance (does this affect me?)
 * - Urgency (does this need immediate attention?)
 * - Novelty (have I seen this before?)
 * - Impact (how broadly does this affect the collective?)
 * 
 * Usage:
 *   node relevance-scorer.js --deltas '[]' --context '{}'  # With args
 *   cat deltas.json | node relevance-scorer.js             # Via stdin
 *   node relevance-scorer.js --json                        # Output JSON
 * 
 * Environment Variables:
 *   AGENT_NAME         - Name of current agent (default: steward)
 *   RELEVANCE_THRESHOLD - Minimum score to be considered relevant (default: 0.5)
 */

const SCORE_THRESHOLD = parseFloat(process.env.RELEVANCE_THRESHOLD) || 0.5;

// Default relevance weights by delta type
const RELEVANCE_WEIGHTS = {
    // File types
    'file_created': 0.7,
    'file_modified': 0.6,
    'file_deleted': 0.8,
    
    // Databases
    'db_modified': 0.5,
    
    // External
    'external_cve': 0.9,
    'external_release': 0.6,
    'external_opportunity': 0.5,
    
    // Agents
    'agent_heartbeat': 0.3,
    'agent_offline': 0.9,
    'agent_online': 0.4
};

// Agent-specific relevance mapping
// Each agent has different file patterns and event types they care about
const AGENT_RELEVANCE = {
    steward: {
        'file_created': ['MEMORY.md', 'PROPOSALS.md', 'WORKFLOW.md', 'CHARTER.md'],
        'file_modified': ['MEMORY.md', 'PROPOSALS.md', 'governance'],
        'file_deleted': ['MEMORY.md', 'PROPOSALS.md'],
        'agent_offline': ['steward', 'triad', 'alpha', 'beta', 'charlie'],
        'db_modified': ['consensus_ledger.db'],
        'external_cve': true
    },
    alpha: {
        'file_created': ['PROPOSALS.md', 'consensus'],
        'file_modified': ['PROPOSALS.md', 'MEMORY.md', 'consensus'],
        'db_modified': ['consensus_ledger.db'],
        'external_cve': true,
        'agent_offline': true
    },
    beta: {
        'file_created': ['PROPOSALS.md', 'IMPLEMENTATIONS.md'],
        'file_modified': ['IMPLEMENTATIONS.md', 'MEMORY.md'],
        'db_modified': ['consensus_ledger.db'],
        'external_release': true
    },
    charlie: {
        'file_created': ['PROPOSALS.md', 'tests/'],
        'file_modified': ['IMPLEMENTATIONS.md', 'tests/'],
        'db_modified': ['consensus_ledger.db'],
        'external_release': true
    },
    examiner: {
        'file_modified': ['PROPOSALS.md', 'consensus', 'MEMORY.md'],
        'file_created': ['PROPOSALS.md'],
        'db_modified': ['consensus_ledger.db'],
        'agent_offline': true
    },
    explorer: {
        'external_release': true,
        'external_opportunity': true,
        'file_created': ['memory/', 'knowledge/'],
        'file_modified': ['knowledge/']
    },
    sentinel: {
        'external_cve': true,
        'agent_offline': true,
        'file_modified': ['SECURITY.md', 'security'],
        'file_created': ['SECURITY.md']
    },
    coder: {
        'file_modified': ['IMPLEMENTATIONS.md', '.js', '.sh', '.json'],
        'file_created': ['IMPLEMENTATIONS.md', '.js', '.sh'],
        'external_release': true
    },
    oracle: {
        'external_release': true,
        'external_opportunity': true,
        'file_created': ['memory/', 'intel'],
        'file_modified': ['intel', 'knowledge']
    }
};

/**
 * RelevanceScorer class
 */
class RelevanceScorer {
    /**
     * @param {string} agentName - Name of the agent
     */
    constructor(agentName) {
        this.agentName = agentName || process.env.AGENT_NAME || 'steward';
        this.weights = RELEVANCE_WEIGHTS;
        this.agentRelevance = AGENT_RELEVANCE[this.agentName] || {};
    }
    
    /**
     * Score an array of deltas
     * @param {Array} deltas - Array of delta objects
     * @param {Object} context - Current context
     * @returns {Array} - Filtered deltas with relevance scores
     */
    score(deltas, context = {}) {
        const scored = deltas.map(delta => {
            const score = this.calculateScore(delta, context);
            return { ...delta, relevance_score: score };
        });
        
        // Filter to only relevant deltas
        return scored.filter(d => d.relevance_score >= SCORE_THRESHOLD);
    }
    
    /**
     * Calculate relevance score for a single delta
     * @param {Object} delta - Delta object
     * @param {Object} context - Current context
     * @returns {number} - Relevance score (0-1)
     */
    calculateScore(delta, context) {
        let score = 0;
        
        // 1. Base type score (40% weight)
        const baseScore = this.weights[delta.type] || 0.3;
        score += baseScore * 0.4;
        
        // 2. Agent relevance (40% weight)
        const agentRelevance = this.checkAgentRelevance(delta);
        score += agentRelevance * 0.4;
        
        // 3. Context urgency (20% weight)
        const contextUrgency = this.checkContextUrgency(delta, context);
        score += contextUrgency * 0.2;
        
        return Math.min(1.0, score);
    }
    
    /**
     * Check if delta is relevant to this agent
     * @param {Object} delta - Delta object
     * @returns {number} - Relevance score (0-1)
     */
    checkAgentRelevance(delta) {
        const rules = this.agentRelevance[delta.type];
        
        if (rules === true) return 1.0;
        if (!rules) return 0.3;
        
        if (Array.isArray(rules)) {
            for (const rule of rules) {
                // Check various delta properties
                if (delta.path?.includes(rule) || 
                    delta.database?.includes(rule) ||
                    delta.agent?.includes(rule) ||
                    delta.repository?.includes(rule) ||
                    delta.source?.includes(rule)) {
                    return 1.0;
                }
            }
        }
        
        return 0.2;
    }
    
    /**
     * Check context-based urgency
     * @param {Object} delta - Delta object
     * @param {Object} context - Current context
     * @returns {number} - Urgency score (0-1)
     */
    checkContextUrgency(delta, context) {
        // If there's active deliberation, everything is more relevant
        if (context?.active_deliberation) {
            return 0.8;
        }
        
        // If we're in the middle of processing something related, boost urgency
        if (context?.current_task) {
            if (delta.path?.includes(context.current_task) ||
                delta.subject?.includes(context.current_task)) {
                return 0.9;
            }
        }
        
        // Critical types always urgent
        if (delta.type === 'agent_offline') return 1.0;
        if (delta.type === 'external_cve') return 1.0;
        if (delta.type === 'file_deleted') return 0.9;
        
        return 0.3;
    }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let deltas = [];
    let context = {};
    let outputJson = false;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--deltas' && args[i + 1]) {
            try {
                deltas = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON, try next arg
            }
        } else if (args[i] === '--context' && args[i + 1]) {
            try {
                context = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON
            }
        } else if (args[i] === '--json' || args[i] === '-j') {
            outputJson = true;
        } else if (args[i] === '--agent' && args[i + 1]) {
            process.env.AGENT_NAME = args[i + 1];
            i++;
        }
    }
    
    // If no deltas provided via args, try stdin
    if (deltas.length === 0) {
        try {
            const stdin = require('fs').readFileSync(0, 'utf8');
            if (stdin.trim()) {
                deltas = JSON.parse(stdin);
            }
        } catch (e) {
            // No stdin input
        }
    }
    
    return { deltas, context, outputJson };
}

/**
 * Main function
 */
async function main() {
    const { deltas, context, outputJson } = parseArgs();
    
    if (!deltas || deltas.length === 0) {
        if (outputJson) {
            console.log(JSON.stringify([]));
        } else {
            console.error('No deltas provided');
            process.exit(1);
        }
        return;
    }
    
    const scorer = new RelevanceScorer(process.env.AGENT_NAME);
    const relevant = scorer.score(deltas, context);
    
    if (outputJson) {
        console.log(JSON.stringify(relevant));
    } else {
        console.error(`Found ${relevant.length} relevant changes out of ${deltas.length}`);
        for (const r of relevant) {
            console.error(`  - ${r.type} (score: ${r.relevance_score.toFixed(2)}): ${r.path || r.database || r.agent || r.timestamp}`);
        }
    }
}

// Run if called directly
main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
