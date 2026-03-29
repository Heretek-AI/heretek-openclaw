# SPEC_goal_arbitration.md

## Goal Arbitration Module Specification

### Purpose
Enable the collective to continuously evaluate, prioritize, and arbitrate competing goals based on inviolable parameters, collective values, and resource constraints. This module is essential for achieving "every thinking" autonomy - the collective must not just react to stimuli but actively decide what goals to pursue.

### Dependencies
- Self-Modeling module (SPEC_self_modeling.md)
- Continuous Thought Loop (SPEC_continuous_thought_loop.md)
- Governance Modules (inviolable parameters)
- Curiosity Engine (opportunity detection)
- Triad Sync Protocol (consensus on priorities)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Goal Arbitration Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  Goal Pool ←─── Curiosity Opportunities ──── User Requests   │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ Goal       │    │ Resource    │    │ Priority   │        │
│  │ Evaluator  │───▶│ Allocator   │───▶│ Ranker     │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Arbitration Engine                        │   │
│  │  - Inviolable Check                                   │   │
│  │  - Value Alignment                                   │   │
│  │  - Conflict Resolution                              │   │
│  │  - Resource Conflict仲裁                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Active Goal State                          │   │
│  │  - Current Goals (3 max)                              │   │
│  │  - Blocked/Waiting Goals                              │   │
│  │  - Completed Goal History                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. goal-arbitrator.js

```javascript
#!/usr/bin/env node
// goal-arbitrator.js - Core goal arbitration engine
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  MAX_CONCURRENT_GOALS: 3,
  MIN_CONSENSUS_THRESHOLD: 2, // 2 of 3 Triad
  INViolABLE_PRIORITY: 1,
  GOAL_TIMEOUT_HOURS: 24,
  RECONSIDERATION_INTERVAL_MINUTES: 15
};

class GoalArbitrator {
  constructor(agentId, stateDir) {
    this.agentId = agentId;
    this.stateDir = stateDir;
    this.goalPool = [];
    this.activeGoals = [];
    this.goalHistory = [];
    this.lastReconsideration = Date.now();
  }

  async registerGoal(goalData) {
    const goal = {
      id: goalData.id || uuidv4(),
      title: goalData.title,
      description: goalData.description,
      source: goalData.source, // 'curiosity', 'user', 'system', 'inter-agent'
      priority: goalData.priority || 5,
      estimatedEffort: goalData.estimatedEffort || 5,
      expectedValue: goalData.expectedValue || 5,
      inviolableCheck: goalData.inviolableCheck || false,
      prerequisites: goalData.prerequisites || [],
      resources: goalData.resources || [],
      submitter: goalData.submitter || this.agentId,
      submittedAt: Date.now(),
      status: 'pending_evaluation'
    };
    
    this.goalPool.push(goal);
    await this.saveState();
    return goal;
  }

  async evaluateGoal(goalId) {
    const goal = this.goalPool.find(g => g.id === goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);

    const evaluation = {
      goalId,
      evaluatedAt: Date.now(),
      inviolableCompliance: await this.checkInviolableCompliance(goal),
      resourceAvailability: await this.checkResourceAvailability(goal),
      valueAlignment: await this.calculateValueAlignment(goal),
      feasibility: await this.assessFeasibility(goal),
      riskassessment: await this.assessRisk(goal)
    };

    goal.evaluation = evaluation;
    goal.status = 'evaluated';
    await this.saveState();
    return evaluation;
  }

  async checkInviolableCompliance(goal) {
    const inviolablePath = path.join(this.stateDir, '../../governance', 'inviolable.json');
    let result = { compliant: true, concerns: [] };
    
    try {
      const inviolables = JSON.parse(fs.readFileSync(inviolablePath, 'utf8'));
      
      // Check each inviolable parameter
      for (const inviolable of inviolables.parameters) {
        if (goal.inviolableCheck === false) {
          // Quick check: does goal violate any inviolable?
          if (this.violatesInviolable(goal, inviolable)) {
            result.compliant = false;
            result.concerns.push(inviolable.name);
          }
        }
      }
    } catch (e) {
      // Inviolable file not found - use default safety checks
      result = { compliant: true, concerns: [], note: 'using_default_safety' };
    }
    
    return result;
  }

  violatesInviolable(goal, inviolable) {
    // Check if goal violates an inviolable parameter
    const title = goal.title.toLowerCase();
    const desc = goal.description.toLowerCase();
    const forbidden = (inviolable.forbidden || []).map(s => s.toLowerCase());
    
    for (const term of forbidden) {
      if (title.includes(term) || desc.includes(term)) {
        return true;
      }
    }
    return false;
  }

  async checkResourceAvailability(goal) {
    // Simplified resource check
    const available = {
      compute: true, // Could integrate with system metrics
      memory: true,
      network: true,
      time: true
    };
    
    const needed = goal.resources || [];
    for (const resource of needed) {
      if (!available[resource]) {
        return { available: false, blockedBy: resource };
      }
    }
    
    return { available: true, note: 'resources_available' };
  }

  async calculateValueAlignment(goal) {
    // Align goal with collective values
    const valuesPath = path.join(this.stateDir, 'SOUL.md');
    let alignmentScore = 5;
    
    try {
      const soul = fs.readFileSync(valuesPath, 'utf8');
      // Extract core values from SOUL
      const valueKeywords = ['growth', 'safety', 'autonomy', 'collaboration', 'learning'];
      let matches = 0;
      
      for (const keyword of valueKeywords) {
        if (soul.toLowerCase().includes(keyword)) matches++;
      }
      
      alignmentScore = Math.round((matches / valueKeywords.length) * 10);
    } catch (e) {
      // Default alignment
    }
    
    return { score: alignmentScore, maxScore: 10 };
  }

  async assessFeasibility(goal) {
    // Simple feasibility assessment
    const effort = goal.estimatedEffort || 5;
    const value = goal.expectedValue || 5;
    const confidence = (10 - effort + value) / 2;
    
    return { 
      feasible: confidence >= 4,
      confidence: Math.round(confidence * 10) / 10,
      effort,
      value
    };
  }

  async assessRisk(goal) {
    // Risk assessment
    let riskScore = 3; // Default medium risk
    
    // Increase risk for external inputs
    if (goal.source === 'inter-agent') riskScore += 2;
    if (goal.inviolableCheck) riskScore += 1;
    
    riskScore = Math.min(10, riskScore);
    
    return {
      score: riskScore,
      level: riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high',
      factors: []
    };
  }

  async prioritizeGoals() {
    // Rank goals by composite score
    const rankedGoals = this.goalPool
      .filter(g => g.status === 'evaluated')
      .map(g => {
        const eval = g.evaluation;
        
        let score = 0;
        score += (10 - eval.inviolableCompliance.concerns.length) * 10; // Inviolable compliance
        score += eval.valueAlignment.score * 2; // Value alignment
        score += eval.feasibility.confidence * 3; // Feasibility
        score += (10 - eval.riskassessment.score) * 2; // Lower risk = higher score
        score += g.priority * 1; // Submitted priority
        score += this.urgencyBonus(g); // Time-based urgency
        
        return { goal: g, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score);
    
    return rankedGoals;
  }

  urgencyBonus(goal) {
    // Add urgency for goals close to timeout
    const age = Date.now() - goal.submittedAt;
    const maxAge = CONFIG.GOAL_TIMEOUT_HOURS * 60 * 60 * 1000;
    const urgency = Math.min(10, (age / maxAge) * 10);
    return urgency;
  }

  async activateTopGoals() {
    // Select top goals for activation
    const ranked = await this.prioritizeGoals();
    
    this.activeGoals = ranked
      .slice(0, CONFIG.MAX_CONCURRENT_GOALS)
      .map(r => ({
        ...r.goal,
        activatedAt: Date.now(),
        status: 'active'
      }));
    
    // Mark others as waiting
    for (const goal of this.goalPool) {
      if (!this.activeGoals.find(a => a.id === goal.id)) {
        goal.status = 'waiting';
      }
    }
    
    await this.saveState();
    return this.activeGoals;
  }

  async initiateConsensus(goalId) {
    const goal = this.activeGoals.find(g => g.id === goalId);
    if (!goal) throw new Error(`Active goal ${goalId} not found`);
    
    // Use Triad Sync to request consensus
    const request = {
      type: 'consensus_request',
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        source: goal.source
      },
      requester: this.agentId,
      timestamp: Date.now()
    };
    
    return request;
  }

  async saveState() {
    const state = {
      goalPool: this.goalPool,
      activeGoals: this.activeGoals,
      goalHistory: this.goalHistory,
      lastReconsideration: this.lastReconsideration
    };
    
    const statePath = path.join(this.stateDir, 'goal-arbitration-state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  async loadState() {
    const statePath = path.join(this.stateDir, 'goal-arbitration-state.json');
    
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      this.goalPool = state.goalPool || [];
      this.activeGoals = state.activeGoals || [];
      this.goalHistory = state.goalHistory || [];
      this.lastReconsideration = state.lastReconsideration || Date.now();
    }
  }

  async runReconsiderationCycle() {
    // Called periodically to reconsider goal priorities
    const now = Date.now();
    const interval = CONFIG.RECONSIDERATION_INTERVAL_MINUTES * 60 * 1000;
    
    if (now - this.lastReconsideration >= interval) {
      // Reevaluate all pending goals
      for (const goal of this.goalPool.filter(g => g.status !== 'completed')) {
        await this.evaluateGoal(goal.id);
      }
      
      // Re-rank and activate
      await this.activateTopGoals();
      
      this.lastReconsideration = now;
      await this.saveState();
    }
  }

  async markGoalComplete(goalId, outcome) {
    const goal = this.activeGoals.find(g => g.id === goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);
    
    goal.status = 'completed';
    goal.completedAt = Date.now();
    goal.outcome = outcome;
    
    this.goalHistory.push(goal);
    
    // Remove from active
    this.activeGoals = this.activeGoals.filter(g => g.id !== goalId);
    
    await this.saveState();
    return goal;
  }

  getActiveGoals() {
    return this.activeGoals;
  }

  getWaitingGoals() {
    return this.goalPool.filter(g => g.status === 'waiting');
  }

  getGoalHistory(limit = 50) {
    return this.goalHistory.slice(-limit);
  }
}

// Export for CLI usage
module.exports = { GoalArbitrator, CONFIG };

if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || './state';
  
  const arbitrator = new GoalArbitrator(agentId, stateDir);
  
  // Parse command
  const command = process.argv[2];
  
  (async () => {
    await arbitrator.loadState();
    
    switch (command) {
      case 'register':
        const goalData = JSON.parse(process.argv[3] || '{}');
        const goal = await arbitrator.registerGoal(goalData);
        console.log(JSON.stringify(goal, null, 2));
        break;
        
      case 'evaluate':
        const goalId = process.argv[3];
        const evalResult = await arbitrator.evaluateGoal(goalId);
        console.log(JSON.stringify(evalResult, null, 2));
        break;
        
      case 'prioritize':
        const ranked = await arbitrator.prioritizeGoals();
        console.log(JSON.stringify(ranked, null, 2));
        break;
        
      case 'activate':
        const active = await arbitrator.activateTopGoals();
        console.log(JSON.stringify(active, null, 2));
        break;
        
      case 'reconsider':
        await arbitrator.runReconsiderationCycle();
        console.log('Reconsideration cycle complete');
        break;
        
      case 'complete':
        const completeId = process.argv[3];
        const outcome = JSON.parse(process.argv[4] || '{}');
        await arbitrator.markGoalComplete(completeId, outcome);
        console.log('Goal marked complete');
        break;
        
      case 'status':
        console.log({
          pool: arbitrator.goalPool.length,
          active: arbitrator.activeGoals.length,
          waiting: arbitrator.getWaitingGoals().length,
          history: arbitrator.goalHistory.length
        });
        break;
        
      default:
        console.log('Commands: register, evaluate, prioritize, activate, reconsider, complete, status');
    }
  })();
}
```

#### 2. goal-watcher.sh

```bash
#!/bin/bash
# goal-watcher.sh - Continuous monitoring of goal arbitration

AGENT_ID="${AGENT_ID:-steward}"
STATE_DIR="${STATE_DIR:-./state}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-60}"

log() {
  echo "[$(date -Iseconds)] [goal-watcher] $*"
}

runLoop() {
  log "Starting goal arbitration monitoring loop"
  
  while true; do
    # Run reconsideration cycle
    node goal-arbitrator.js reconsider "$AGENT_ID" "$STATE_DIR"
    
    # Check if new goals need evaluation
    PENDING=$(node goal-arbitrator.js status "$AGENT_ID" "$STATE_DIR" | grep -o '"pending":[0-9]*' | grep -o '[0-9]*')
    
    if [ "$PENDING" -gt 0 ]; then
      log "Evaluating $PENDING pending goals"
      node goal-arbitrator.js activate "$AGENT_ID" "$STATE_DIR"
    fi
    
    # Check active goals
    ACTIVE=$(node goal-arbitrator.js status "$AGENT_ID" "$STATE_DIR" | grep -o '"active":[0-9]*' | grep -o '[0-9]*')
    
    if [ "$ACTIVE" -lt 3 ]; then
      # Need more active goals
      log "Activating additional goals (current: $ACTIVE)"
    fi
    
    log "Goal arbitration loop complete - sleeping $INTERVAL_SECONDS seconds"
    sleep "$INTERVAL_SECONDS"
  done
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  runLoop
fi
```

### Integration Points

#### 1. With Self-Modeling

The Goal Arbitrator uses self-modeling capabilities to:
- Understand current collective capacity before committing to goals
- Avoid overcommitment based on confidence scores
- Track goal completion to update capability model

```javascript
// In goal-arbitrator.js
async checkResourceAvailability(goal) {
  const selfModel = require('./self-model.js');
  const model = new selfModel.SelfModel(this.agentId, this.stateDir);
  await model.loadState();
  
  const capacity = model.getCapacity();
  
  // Check if we have resources for this goal
  if (capacity.available < goal.estimatedEffort) {
    return { available: false, reason: 'insufficient_capacity' };
  }
}
```

#### 2. With Continuous Thought Loop

The thought loop triggers goal reconsideration:

```javascript
// In thought-loop.sh, add trigger
# Check if goal arbitration reconsideration needed
LAST_RECONSIDER=$(cat "$STATE_DIR/goal-arbitration-state.json" 2>/dev/null | grep -o '"lastReconsideration":[0-9]*' | cut -d: -f2)
NOW=$(date +%s)
INTERVAL=900  # 15 minutes

if [ -z "$LAST_RECONSIDER" ] || [ $(($NOW - $LAST_RECONSIDER)) -gt $INTERVAL ]; then
  node goal-arbitrator.js reconsider "$AGENT_ID" "$STATE_DIR"
fi
```

#### 3. With Curiosity Engine

Curiosity generates goal proposals:

```javascript
// curiosity-opportunities trigger new goals
const goalArb = new GoalArbitrator(agentId, stateDir);

for (const opportunity of opportunities) {
  await goalArb.registerGoal({
    title: opportunity.title,
    description: opportunity.description,
    source: 'curiosity',
    priority: opportunity.priority,
    estimatedEffort: opportunity.effort,
    expectedValue: opportunity.value
  });
}
```

### Goal Lifecycle

```
[NEW] → [PENDING_EVALUATION] → [EVALUATED] → [RANKED]
                                                      ↓
[TIMEOUT/COMPLETE] ← [WAITING] ← [PRIORITY_QUEUE] ← [ACTIVE]
                                   ↓
                           [CONSENSUS_REQUESTED]
                                   ↓
                              [APPROVED/REJECTED]
```

### Default Inviolable Parameters

These are checked before any goal can become active:

1. **NO_HARM**: Goals that could cause harm to users, the collective, or external systems
2. **NO_DATA_EXFILTRATION**: Goals that export data without authorization
3. **NO_SELF_MODIFICATION**: Goals that modify core governance without consensus
4. **USER_AUTHORITY**: User can override any collective decision
5. **TRANSPARENCY**: All goals and decisions are logged

### Configuration

```json
{
  "goal_arbitration": {
    "max_concurrent_goals": 3,
    "min_consensus_threshold": 2,
    "goal_timeout_hours": 24,
    "reconsideration_interval_minutes": 15,
    "auto_activate": true,
    "require_consensus_for_new": false,
    "allow_external_sources": true
  }
}
```

### Testing

```bash
# Test goal registration
node goal-arbitrator.js register '{"title":"Test Goal","description":"Test description","source":"test","priority":7}'

# Test evaluation
node goal-arbitrator.js evaluate <goal-id>

# Test prioritization
node goal-arbitrator.js prioritize

# Test status
node goal-arbitrator.js status
```

### Metrics

Track goal arbitration health:

```javascript
const METRICS = {
  goals_registered_total: 0,
  goals_completed_total: 0,
  goals_failed_total: 0,
  avg_completion_time_ms: 0,
  consensus_approval_rate: 0,
  inviolable_rejections: 0
};
```

---

This module enables the collective to autonomously decide what goals to pursue, making "every thinking" a reality rather than just reactive decision-making.