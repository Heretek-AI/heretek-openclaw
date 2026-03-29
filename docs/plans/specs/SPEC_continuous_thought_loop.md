# Module Specification: Continuous Thought Loop

## Overview

The **Continuous Thought Loop** is the foundation of "every thinking" autonomy. It runs in every agent's container, continuously processing information even when no external triggers occur.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Continuous Thought Loop                       │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Delta   │───▶│Relevance │───▶│ Thought  │───▶│  Action   │ │
│  │Detector  │    │ Scoring  │    │Generator │    │  Urgency  │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       ▲               │                                    │    │
│       │               ▼                                    ▼    │
│       │        ┌──────────┐                         ┌──────────┐ │
│       └────────│ Memory  │◀────────────────────────│ Triad   │ │
│                │ Context │                         │ Sync    │ │
│                └──────────┘                         └──────────┘ │
│                    ▲                                       │     │
│                    │                                       │     │
│                    └───────────────────────────────────────┘     │
│                              Every 30 seconds                   │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
heretek-skills/skills/continuous-thought-loop/
├── SKILL.md                      # Skill specification
├── thought-loop.sh               # Main orchestrator (Bash)
├── lib/
│   ├── delta-detector.js         # Detect state changes
│   ├── relevance-scorer.js       # Score changes by importance
│   ├── thought-generator.js       # Generate thoughts from changes
│   ├── action-urgency.js         # Determine if action needed
│   ├── memory-context.js         # Active context management
│   └── thought-broadcast.js      # Share thoughts via triad-sync
├── config/
│   └── loop-config.json          # Configuration
└── tests/
    ├── test-delta.sh             # Delta detection tests
    ├── test-relevance.sh          # Relevance scoring tests
    ├── test-thought-gen.sh       # Thought generation tests
    └── test-loop.sh              # Integration tests
```

## Implementation Details

### 1. Main Orchestrator: `thought-loop.sh`

```bash
#!/bin/bash
# Continuous Thought Loop - Main Orchestrator
# Runs every 30 seconds in each agent container

set -euo pipefail

# Configuration
LOOP_INTERVAL="${THOUGHT_LOOP_INTERVAL:-30}"
THINK_TIME_BUDGET="${THINK_TIME_BUDGET:-10}"  # seconds per cycle
LOG_FILE="${LOG_FILE:-/var/log/thought-loop.log}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/lib"
STATE_FILE="/tmp/thought-loop-state.json"

log() {
    echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

# Load state from previous cycle
load_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo '{"cycle": 0, "last_thoughts": [], "active_context": {}}'
    fi
}

# Save state for next cycle
save_state() {
    local cycle="$1"
    local thoughts="$2"
    local context="$3"
    
    cat > "$STATE_FILE" <<EOF
{
    "cycle": $cycle,
    "last_thoughts": $thoughts,
    "active_context": $context,
    "last_run": "$(date -Iseconds)"
}
EOF
}

main() {
    log "=== Starting Thought Loop Cycle ==="
    
    # Load previous state
    local state=$(load_state)
    local cycle=$(echo "$state" | jq -r '.cycle')
    local active_context=$(echo "$state" | jq '.active_context')
    
    # 1. Detect deltas (what changed?)
    log "Detecting deltas..."
    local deltas=$("$LIB_DIR/delta-detector.js" --json 2>/dev/null || echo '[]')
    local delta_count=$(echo "$deltas" | jq 'length')
    log "Found $delta_count deltas"
    
    # 2. Score relevance of each delta
    log "Scoring relevance..."
    local relevant=0
    if [ "$delta_count" -gt 0 ]; then
        relevant=$("$LIB_DIR/relevance-scorer.js" --deltas "$deltas" --context "$active_context" 2>/dev/null | jq 'length')
    fi
    log "$relevant changes are relevant"
    
    # 3. Generate thoughts from relevant changes
    local thoughts='[]'
    if [ "$relevant" -gt 0 ]; then
        log "Generating thoughts..."
        thoughts=$("$LIB_DIR/thought-generator.js" --deltas "$deltas" --agent "$AGENT_NAME" 2>/dev/null || echo '[]')
    fi
    
    # 4. Reflect on goals (idle thinking)
    log "Idle reflection..."
    local goal_thoughts=$("$LIB_DIR/thought-generator.js" --idle --agent "$AGENT_NAME" 2>/dev/null || echo '[]')
    
    # 5. Merge thoughts
    local all_thoughts=$(echo "$thoughts $goal_thoughts" | jq -s 'flatten')
    local thought_count=$(echo "$all_thoughts" | jq 'length')
    log "Generated $thought_count thoughts"
    
    # 6. Evaluate action urgency
    local actions='[]'
    if [ "$thought_count" -gt 0 ]; then
        log "Evaluating action urgency..."
        actions=$("$LIB_DIR/action-urgency.js" --thoughts "$all_thoughts" 2>/dev/null || echo '[]')
    fi
    
    # 7. Execute urgent actions (if any)
    local action_count=$(echo "$actions" | jq 'length')
    if [ "$action_count" -gt 0 ]; then
        log "Executing $action_count action(s)..."
        for action in $(echo "$actions" | jq -r '.[] | @base64'); do
            local action_json=$(echo "$action" | base64 -d)
            local action_type=$(echo "$action_json" | jq -r '.type')
            local action_target=$(echo "$action_json" | jq -r '.target')
            
            case "$action_type" in
                "trigger_deliberation")
                    log "Triggering deliberation: $action_target"
                    # Call auto-deliberation-trigger
                    ;;
                "broadcast_thought")
                    log "Broadcasting thought: $action_target"
                    "$LIB_DIR/thought-broadcast.js" --thought "$action_target"
                    ;;
                "update_context")
                    log "Updating context: $action_target"
                    active_context=$(echo "$action_json" | jq '.context')
                    ;;
                *)
                    log "Unknown action type: $action_type"
                    ;;
            esac
        done
    fi
    
    # 8. Update context for next cycle
    local new_context=$(echo "$active_context" | jq --argjson thoughts "$all_thoughts" '. + {recent_thoughts: $thoughts}')
    
    # 9. Save state
    save_state $((cycle + 1)) "$all_thoughts" "$new_context"
    
    # 10. Broadcast state to triad (optional)
    if [ "${BROADCAST_THOUGHTS:-false}" = "true" ]; then
        "$LIB_DIR/thought-broadcast.js" --cycle "$cycle" --thoughts "$all_thoughts"
    fi
    
    log "=== Cycle $cycle complete ==="
    log "Thoughts: $thought_count, Actions: $action_count"
}

# Run loop
while true; do
    main
    sleep "$LOOP_INTERVAL"
done
```

### 2. Delta Detector: `delta-detector.js`

```javascript
#!/usr/bin/env node
/**
 * Delta Detector - Detects what changed since last cycle
 * 
 * Checks:
 * - File system changes (workspace files)
 * - Database changes (consensus ledger, curiosity metrics)
 * - External changes (upstream, GitHub, CVE feeds)
 * - Agent state changes (heartbeat status)
 * - Memory updates (new entries)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_DIR = process.env.WORKSPACE_ROOT || '/workspace';
const CURIOUSITY_DIR = process.env.CURIOSITY_DIR || '/workspace/.curiosity';
const LAST_STATE_FILE = '/tmp/delta-detector-state.json';

class DeltaDetector {
    constructor() {
        this.lastState = this.loadLastState();
        this.currentState = {};
    }
    
    loadLastState() {
        try {
            if (fs.existsSync(LAST_STATE_FILE)) {
                return JSON.parse(fs.readFileSync(LAST_STATE_FILE, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load last state:', e.message);
        }
        return {
            timestamp: null,
            files: {},
            db_hashes: {},
            external: {}
        };
    }
    
    saveState() {
        fs.writeFileSync(LAST_STATE_FILE, JSON.stringify(this.currentState, null, 2));
    }
    
    async detect() {
        const deltas = [];
        
        // 1. Detect file system changes
        const fileDeltas = this.detectFileChanges();
        deltas.push(...fileDeltas);
        
        // 2. Detect database changes
        const dbDeltas = await this.detectDbChanges();
        deltas.push(...dbDeltas);
        
        // 3. Detect external changes
        const externalDeltas = await this.detectExternalChanges();
        deltas.push(...externalDeltas);
        
        // 4. Detect agent state changes
        const agentDeltas = await this.detectAgentChanges();
        deltas.push(...agentDeltas);
        
        // Save current state
        this.currentState.timestamp = new Date().toISOString();
        this.saveState();
        
        return deltas;
    }
    
    detectFileChanges() {
        const deltas = [];
        const importantDirs = ['', '/memory', '/skills', '/.curiosity'];
        
        for (const dir of importantDirs) {
            const dirPath = path.join(STATE_DIR, dir);
            if (!fs.existsSync(dirPath)) continue;
            
            try {
                const files = execSync(`find "${dirPath}" -type f -name "*.md" -o -name "*.json" 2>/dev/null`, 
                    { encoding: 'utf8' }).split('\n').filter(Boolean);
                
                for (const file of files) {
                    try {
                        const stat = fs.statSync(file);
                        const content = fs.readFileSync(file, 'utf8');
                        const hash = this.hash(content);
                        const lastHash = this.lastState.files?.[file]?.hash;
                        
                        if (!lastHash) {
                            deltas.push({
                                type: 'file_created',
                                path: file,
                                timestamp: stat.mtime.toISOString()
                            });
                        } else if (lastHash !== hash) {
                            deltas.push({
                                type: 'file_modified',
                                path: file,
                                timestamp: stat.mtime.toISOString()
                            });
                        }
                        
                        this.currentState.files = this.currentState.files || {};
                        this.currentState.files[file] = { hash, mtime: stat.mtime };
                    } catch (e) {
                        // Skip inaccessible files
                    }
                }
            } catch (e) {
                // Directory not accessible
            }
        }
        
        return deltas;
    }
    
    async detectDbChanges() {
        const deltas = [];
        const dbFiles = ['curiosity_metrics.db', 'consensus_ledger.db', 'anomalies.db'];
        
        for (const db of dbFiles) {
            const dbPath = path.join(CURIOSITY_DIR, db);
            if (!fs.existsSync(dbPath)) continue;
            
            try {
                const stat = fs.statSync(dbPath);
                const hash = this.hash(fs.readFileSync(dbPath));
                const lastHash = this.lastState.db_hashes?.[db];
                
                if (lastHash !== hash) {
                    // Check what changed in the DB
                    deltas.push({
                        type: 'db_modified',
                        database: db,
                        timestamp: stat.mtime.toISOString()
                    });
                }
                
                this.currentState.db_hashes = this.currentState.db_hashes || {};
                this.currentState.db_hashes[db] = hash;
            } catch (e) {
                // Skip inaccessible databases
            }
        }
        
        return deltas;
    }
    
    async detectExternalChanges() {
        const deltas = [];
        
        // Check for new GitHub releases (simplified - real implementation would call API)
        // This would integrate with opportunity-scanner
        try {
            const lastCheck = this.lastState.external?.last_check || '1970-01-01';
            const now = new Date().toISOString();
            
            // Placeholder - real implementation would check APIs
            this.currentState.external = { last_check: now };
        } catch (e) {
            // External check failed
        }
        
        return deltas;
    }
    
    async detectAgentChanges() {
        const deltas = [];
        
        // Check agent heartbeats via triad-sync
        try {
            const response = execSync('curl -s http://localhost:8765/agents 2>/dev/null || echo "{}"', 
                { encoding: 'utf8' });
            const agents = JSON.parse(response);
            
            for (const [agent, state] of Object.entries(agents)) {
                const lastHeartbeat = this.lastState.agents?.[agent]?.last_heartbeat;
                const currentHeartbeat = state.last_heartbeat;
                
                if (lastHeartbeat !== currentHeartbeat) {
                    deltas.push({
                        type: 'agent_heartbeat',
                        agent: agent,
                        status: state.status,
                        timestamp: currentHeartbeat
                    });
                }
            }
            
            this.currentState.agents = agents;
        } catch (e) {
            // Agent check failed - triad-sync not available
        }
        
        return deltas;
    }
    
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const detector = new DeltaDetector();
    
    if (args.includes('--json') || args.includes('-j')) {
        const deltas = await detector.detect();
        console.log(JSON.stringify(deltas));
    } else {
        const deltas = await detector.detect();
        console.log(`Detected ${deltas.length} deltas`);
        for (const delta of deltas) {
            console.log(`  - ${delta.type}: ${delta.path || delta.database || delta.agent || delta.timestamp}`);
        }
    }
}

main().catch(console.error);
```

### 3. Relevance Scorer: `relevance-scorer.js`

```javascript
#!/usr/bin/env node
/**
 * Relevance Scorer - Scores deltas by importance to the agent
 * 
 * Scoring factors:
 * - Agent relevance (does this affect me?)
 * - Urgency (does this need immediate attention?)
 * - Novelty (have I seen this before?)
 * - Impact (how broadly does this affect the collective?)
 */

const SCORE_THRESHOLD = 0.5;

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
const AGENT_RELEVANCE = {
    steward: {
        'file_created': ['MEMORY.md', 'PROPOSALS.md', 'WORKFLOW.md'],
        'file_modified': ['MEMORY.md', 'PROPOSALS.md'],
        'agent_offline': ['steward', 'triad'],
        'db_modified': ['consensus_ledger.db']
    },
    alpha: {
        'file_created': ['PROPOSALS.md', 'consensus'],
        'file_modified': ['PROPOSALS.md', 'MEMORY.md'],
        'db_modified': ['consensus_ledger.db'],
        'external_cve': true
    },
    examiner: {
        'file_modified': ['PROPOSALS.md', 'consensus'],
        'db_modified': ['consensus_ledger.db']
    },
    explorer: {
        'external_release': true,
        'external_opportunity': true,
        'file_created': ['memory/']
    },
    sentinel: {
        'external_cve': true,
        'agent_offline': true,
        'file_modified': ['SECURITY.md']
    },
    coder: {
        'file_modified': ['IMPLEMENTATIONS.md', '.js', '.sh'],
        'file_created': ['IMPLEMENTATIONS.md']
    }
};

class RelevanceScorer {
    constructor(agentName) {
        this.agentName = agentName || process.env.AGENT_NAME || 'steward';
        this.weights = RELEVANCE_WEIGHTS;
        this.agentRelevance = AGENT_RELEVANCE[this.agentName] || {};
    }
    
    score(deltas, context) {
        const scored = deltas.map(delta => {
            const score = this.calculateScore(delta, context);
            return { ...delta, relevance_score: score };
        });
        
        // Filter to only relevant deltas
        return scored.filter(d => d.relevance_score >= SCORE_THRESHOLD);
    }
    
    calculateScore(delta, context) {
        let score = 0;
        
        // 1. Base type score
        const baseScore = this.weights[delta.type] || 0.3;
        score += baseScore * 0.4;
        
        // 2. Agent relevance
        const agentRelevance = this.checkAgentRelevance(delta);
        score += agentRelevance * 0.4;
        
        // 3. Context urgency
        const contextUrgency = this.checkContextUrgency(delta, context);
        score += contextUrgency * 0.2;
        
        return Math.min(1.0, score);
    }
    
    checkAgentRelevance(delta) {
        const rules = this.agentRelevance[delta.type];
        
        if (rules === true) return 1.0;
        if (!rules) return 0.3;
        
        if (Array.isArray(rules)) {
            for (const rule of rules) {
                if (delta.path?.includes(rule) || 
                    delta.database?.includes(rule) ||
                    delta.agent?.includes(rule)) {
                    return 1.0;
                }
            }
        }
        
        return 0.2;
    }
    
    checkContextUrgency(delta, context) {
        // If there's active deliberation, everything is more relevant
        if (context?.active_deliberation) {
            return 0.8;
        }
        
        // Critical types always urgent
        if (delta.type === 'agent_offline') return 1.0;
        if (delta.type === 'external_cve') return 1.0;
        
        return 0.3;
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    
    let deltas = [];
    let context = {};
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--deltas' && args[i + 1]) {
            try {
                deltas = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON
            }
        } else if (args[i] === '--context' && args[i + 1]) {
            try {
                context = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON
            }
        }
    }
    
    // If no deltas provided via args, try stdin
    if (deltas.length === 0) {
        try {
            const input = require('fs').readFileSync(0, 'utf8');
            deltas = JSON.parse(input);
        } catch (e) {
            console.error('No deltas provided');
            process.exit(1);
        }
    }
    
    const scorer = new RelevanceScorer(process.env.AGENT_NAME);
    const relevant = scorer.score(deltas, context);
    
    if (args.includes('--json') || args.includes('-j')) {
        console.log(JSON.stringify(relevant));
    } else {
        console.log(`Found ${relevant.length} relevant changes out of ${deltas.length}`);
        for (const r of relevant) {
            console.log(`  - ${r.type} (score: ${r.relevance_score.toFixed(2)})`);
        }
    }
}

main().catch(console.error);
```

### 4. Thought Generator: `thought-generator.js`

```javascript
#!/usr/bin/env node
/**
 * Thought Generator - Generates thoughts from relevant changes
 * 
 * Generates structured thoughts that include:
 * - What triggered the thought
 * - What it means for the agent/collective
 * - What action (if any) is recommended
 */

class ThoughtGenerator {
    constructor(agentName) {
        this.agentName = agentName || 'unknown';
    }
    
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
    
    createThought(delta) {
        const generators = {
            'file_created': this.thoughtFromFile,
            'file_modified': this.thoughtFromFile,
            'db_modified': this.thoughtFromDb,
            'external_cve': this.thoughtFromExternal,
            'external_release': this.thoughtFromExternal,
            'agent_heartbeat': this.thoughtFromAgent,
            'agent_offline': this.thoughtFromAgent
        };
        
        const generator = generators[delta.type] || this.thoughtFromUnknown;
        return generator.call(this, delta);
    }
    
    thoughtFromFile(delta) {
        const isNew = delta.type === 'file_created';
        const path = delta.path || 'unknown';
        const filename = path.split('/').pop();
        
        return {
            id: this.generateId(),
            type: isNew ? 'discovery' : 'update',
            trigger: delta.type,
            subject: filename,
            observation: isNew 
                ? `New file created: ${path}`
                : `File modified: ${path}`,
            implication: this.evaluateImplication(delta),
            recommendation: this.generateRecommendation(delta),
            confidence: isNew ? 0.7 : 0.6,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName
        };
    }
    
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
            agent: this.agentName
        };
    }
    
    thoughtFromExternal(delta) {
        const urgency = delta.type === 'external_cve' ? 'high' : 'medium';
        
        return {
            id: this.generateId(),
            type: 'external_awareness',
            trigger: delta.type,
            subject: delta.source || 'external',
            observation: `External event detected: ${delta.type}`,
            implication: urgency === 'high' 
                ? 'Security implications for collective'
                : 'Potential opportunity or threat',
            recommendation: urgency === 'high'
                ? 'trigger_deliberation'
                : 'broadcast_thought',
            confidence: 0.6,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName
        };
    }
    
    thoughtFromAgent(delta) {
        const isOffline = delta.type === 'agent_offline';
        
        return {
            id: this.generateId(),
            type: isOffline ? 'alert' : 'status',
            trigger: delta.type,
            subject: delta.agent,
            observation: isOffline
                ? `Agent ${delta.agent} went offline`
                : `Agent ${delta.agent} is now ${delta.status}`,
            implication: isOffline
                ? 'Collective capacity reduced'
                : 'Collective capacity restored',
            recommendation: isOffline
                ? 'trigger_failover_vote'
                : 'update_context',
            confidence: 0.9,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName
        };
    }
    
    thoughtFromUnknown(delta) {
        return {
            id: this.generateId(),
            type: 'unknown',
            trigger: delta.type,
            subject: 'unknown',
            observation: `Unknown change: ${JSON.stringify(delta)}`,
            implication: 'Requires investigation',
            recommendation: 'log_for_review',
            confidence: 0.3,
            timestamp: delta.timestamp || new Date().toISOString(),
            agent: this.agentName
        };
    }
    
    evaluateImplication(delta) {
        // Evaluate based on file path, type, and agent role
        if (delta.path?.includes('PROPOSALS')) {
            return 'May affect active or pending proposals';
        }
        if (delta.path?.includes('MEMORY')) {
            return 'Collective memory updated';
        }
        if (delta.path?.includes('consensus')) {
            return 'Consensus state changed';
        }
        return 'Standard change detected';
    }
    
    generateRecommendation(delta) {
        const recommendations = {
            'file_created': 'broadcast_thought',
            'file_modified': 'update_context',
            'db_modified': 'check_consensus',
            'external_cve': 'trigger_deliberation',
            'external_release': 'evaluate_update',
            'agent_offline': 'trigger_failover_vote',
            'agent_online': 'update_context'
        };
        
        return recommendations[delta.type] || 'log_for_review';
    }
    
    generateId() {
        return `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Idle thinking - what should the agent think about when there's no new input?
    generateIdleThoughts() {
        const thoughts = [];
        
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
        
        return thoughts;
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const generator = new ThoughtGenerator(process.env.AGENT_NAME);
    
    let deltas = [];
    let isIdle = false;
    
    // Parse arguments
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
        }
    }
    
    let thoughts;
    if (isIdle) {
        thoughts = generator.generateIdleThoughts();
    } else {
        // If no deltas provided via args, try stdin
        if (deltas.length === 0) {
            try {
                const input = require('fs').readFileSync(0, 'utf8');
                deltas = JSON.parse(input);
            } catch (e) {
                console.error('No deltas provided');
                process.exit(1);
            }
        }
        thoughts = generator.generate(deltas);
    }
    
    if (args.includes('--json') || args.includes('-j')) {
        console.log(JSON.stringify(thoughts));
    } else {
        console.log(`Generated ${thoughts.length} thought(s)`);
        for (const thought of thoughts) {
            console.log(`  - [${thought.type}] ${thought.observation}`);
        }
    }
}

main().catch(console.error);
```

### 5. Action Urgency Evaluator: `action-urgency.js`

```javascript
#!/usr/bin/env node
/**
 * Action Urgency - Determines which thoughts require action
 * 
 * Urgency thresholds:
 * - 0.0-0.3: Log only
 * - 0.3-0.6: Monitor
 * - 0.6-0.8: Consider action
 * - 0.8-1.0: Immediate action
 */

const URGENCY_THRESHOLD = 0.6;

const ACTION_MAPPING = {
    'trigger_deliberation': {
        threshold: 0.7,
        action_type: 'trigger_deliberation',
        target: 'auto-deliberation-trigger'
    },
    'broadcast_thought': {
        threshold: 0.5,
        action_type: 'broadcast_thought',
        target: 'triad-sync'
    },
    'trigger_failover_vote': {
        threshold: 0.9,
        action_type: 'trigger_deliberation',
        target: 'failover-vote'
    },
    'update_context': {
        threshold: 0.4,
        action_type: 'update_context',
        target: 'memory-context'
    },
    'evaluate_update': {
        threshold: 0.6,
        action_type: 'trigger_deliberation',
        target: 'curiosity-engine'
    },
    'check_consensus': {
        threshold: 0.5,
        action_type: 'query',
        target: 'consensus-ledger'
    },
    'log_for_review': {
        threshold: 0.0,
        action_type: 'log',
        target: 'memory'
    }
};

class ActionUrgencyEvaluator {
    constructor() {
        this.threshold = URGENCY_THRESHOLD;
    }
    
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
    
    calculateUrgency(thought) {
        let urgency = 0;
        
        // Base urgency from confidence
        urgency += thought.confidence * 0.3;
        
        // Type-specific urgency
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
        
        urgency += typeUrgency[thought.type] || 0.3;
        
        // Recommendation factor
        if (thought.recommendation === 'trigger_deliberation') {
            urgency += 0.2;
        }
        
        return Math.min(1.0, urgency);
    }
    
    mapToAction(thought, urgency) {
        const recommendation = thought.recommendation || 'log_for_review';
        const actionSpec = ACTION_MAPPING[recommendation];
        
        if (!actionSpec) return null;
        
        // Check if urgency meets threshold for this action type
        if (urgency < actionSpec.threshold) return null;
        
        return {
            type: actionSpec.action_type,
            target: actionSpec.target,
            thought_id: thought.id,
            urgency: urgency,
            metadata: {
                subject: thought.subject,
                observation: thought.observation,
                agent: thought.agent
            }
        };
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const evaluator = new ActionUrgencyEvaluator();
    
    let thoughts = [];
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--thoughts' && args[i + 1]) {
            try {
                thoughts = JSON.parse(args[i + 1]);
                i++;
            } catch (e) {
                // Invalid JSON
            }
        }
    }
    
    // If no thoughts provided via args, try stdin
    if (thoughts.length === 0) {
        try {
            const input = require('fs').readFileSync(0, 'utf8');
            thoughts = JSON.parse(input);
        } catch (e) {
            console.error('No thoughts provided');
            process.exit(1);
        }
    }
    
    const actions = evaluator.evaluate(thoughts);
    
    if (args.includes('--json') || args.includes('-j')) {
        console.log(JSON.stringify(actions));
    } else {
        console.log(`Found ${actions.length} action(s) requiring urgency >= ${URGENCY_THRESHOLD}`);
        for (const action of actions) {
            console.log(`  - [${action.type}] ${action.metadata.subject} (urgency: ${action.urgency.toFixed(2)})`);
        }
    }
}

main().catch(console.error);
```

## Integration Points

### With Triad Sync Protocol

The thought loop integrates with `triad-sync-protocol` to:
1. Share thoughts with other agents via broadcast
2. Query collective state for context
3. Submit votes on triggered deliberations

### With Curiosity Engine

The thought loop enhances `curiosity-engine` by:
1. Providing continuous input to gap detection
2. Enabling proactive opportunity scanning
3. Triggering auto-deliberation on relevant changes

### With Governance Modules

The thought loop respects `governance-modules` by:
1. Not triggering actions that violate inviolable parameters
2. Escalating to deliberation for controversial thoughts
3. Checking quorum before collective actions

---

## Configuration

```json
{
    "loop_interval": 30,
    "think_time_budget": 10,
    "broadcast_thoughts": false,
    "relevance_threshold": 0.5,
    "urgency_threshold": 0.6,
    "enabled_for_agents": [
        "steward",
        "alpha",
        "beta",
        "charlie",
        "examiner",
        "explorer",
        "sentinel",
        "coder"
    ]
}
```

---

## Testing Strategy

### Unit Tests
- Delta detector: Test file, DB, external, agent detection
- Relevance scorer: Test scoring for each delta type
- Thought generator: Test thought creation for each trigger
- Action urgency: Test urgency calculation and mapping

### Integration Tests
- Full cycle: deltas → relevance → thought → action
- Idle thinking: periodic reflection
- Cross-agent: thought broadcasting via triad-sync

### Performance Tests
- Loop execution time < think_time_budget
- Memory usage stable over multiple cycles
- No resource leaks in long-running loops