# SPEC_predictive_reasoning.md

## Predictive Reasoning Module Specification

### Purpose
Enable the collective to anticipate future events, predict outcomes of decisions, forecast resource needs, and proactively prepare for scenarios. This is the highest level of autonomy - not just reacting to what's happening, but understanding what might happen and positioning accordingly.

### Dependencies
- Self-Modeling module (SPEC_self_modeling.md)
- Goal Arbitration (SPEC_goal_arbitration.md)
- Continuous Thought Loop (SPEC_continuous_thought_loop.md)
- Curiosity Engine (pattern detection)
- Memory System (historical data)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Predictive Reasoning Layer                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              Pattern Analyzer                        │       │
│  │  - Temporal patterns                            │       │
│  │  - Cause-effect chains                         │       │
│  │  - Historical trends                           │       │
│  └─────────────────────────────────────────────────────────┘       │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              Predictor Engine                        │       │
│  │  - Event forecasting                               │       │
│  │  - Outcome probability                             │       │
│  │  - Resource projection                             │       │
│  │  - Risk anticipation                               │       │
│  └─────────────────────────────────────────────────────────┘       │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              Scenario Modeler                       │       │
│  │  - Best case / Worst case / Likely               │       │
│  │  - Contingency planning                           │       │
│  │  - Preparation triggers                          │       │
│  └─────────────────────────────────────────────────────────┘       │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              Early Warning System                   │       │
│  │  - Anomaly alerts                                │       │
│  │  - Threshold triggers                            │       │
│  │  - Proactive signals                            │       │
│  └─────────────────────────────────────────────────────────┘       │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              Forecast Dashboard                   │       │
│  │  - Active predictions                            │       │
│  │  - Confidence levels                           │       │
│  │  - Preparation status                         │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. predictor.js

```javascript
#!/usr/bin/env node
// predictor.js - Predictive reasoning engine
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  LOOKAHEAD_HOURS: 24,
  MIN_CONFIDENCE: 0.5,
  PATTERN_WINDOW_DAYS: 7,
  HISTORY_WEIGHT: 0.7,
  TREND_WEIGHT: 0.3,
  ALERT_THRESHOLD: 0.7
};

class PredictiveReasoner {
  constructor(agentId, stateDir) {
    this.agentId = agentId;
    this.stateDir = stateDir;
    this.predictions = [];
    this.patterns = [];
    this.alerts = [];
    this.lastAnalysis = null;
  }

  async analyzePatterns() {
    // Analyze historical patterns from memory
    const memoryPath = path.join(this.stateDir, '../memory');
    const patterns = {
      temporal: await this.analyzeTemporalPatterns(memoryPath),
      causal: await this.analyzeCausalPatterns(memoryPath),
      resource: await this.analyzeResourcePatterns(memoryPath),
      performance: await this.analyzePerformancePatterns(memoryPath)
    };
    
    this.patterns = patterns;
    this.lastAnalysis = Date.now();
    await this.saveState();
    
    return patterns;
  }

  async analyzeTemporalPatterns(memoryPath) {
    // Look for time-based patterns
    const patterns = {
      daily: { detected: false, interval: null, confidence: 0 },
      weekly: { detected: false, interval: null, confidence: 0 },
      triggered: { detected: false, triggers: [], confidence: 0 }
    };
    
    try {
      const history = await this.loadHistory(memoryPath, CONFIG.PATTERN_WINDOW_DAYS);
      
      // Analyze deliberation timing
      const deliberationTimes = history
        .filter(e => e.type === 'deliberation')
        .map(e => new Date(e.timestamp));
      
      // Check for daily pattern
      if (deliberationTimes.length > 5) {
        const intervals = [];
        for (let i = 1; i < deliberationTimes.length; i++) {
          intervals.push(deliberationTimes[i] - deliberationTimes[i-1]);
        }
        const avgInterval = intervals.reduce((a,b) => a + b) / intervals.length;
        
        // 24-hour cycle detection
        if (avgInterval > 20 * 60 * 60 * 1000 && avgInterval < 28 * 60 * 60 * 1000) {
          patterns.daily = { 
            detected: true, 
            interval: '24h', 
            confidence: CONFIG.HISTORY_WEIGHT 
          };
        }
      }
      
      // Analyze trigger occurrences
      const triggers = history
        .filter(e => e.trigger)
        .map(e => e.trigger);
      
      if (triggers.length > 0) {
        const triggerCounts = {};
        for (const t of triggers) {
          triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        }
        
        patterns.triggered = {
          detected: true,
          triggers: Object.keys(triggerCounts).sort((a,b) => triggerCounts[b] - triggerCounts[a]).slice(0, 3),
          confidence: Math.min(0.9, triggerCounts.length / 10)
        };
      }
    } catch (e) {
      // Memory not available
    }
    
    return patterns;
  }

  async analyzeCausalPatterns(memoryPath) {
    // Look for cause-effect relationships
    const patterns = {
      causeEffect: [],
      riskFactors: [],
      successFactors: []
    };
    
    try {
      const history = await this.loadHistory(memoryPath, CONFIG.PATTERN_WINDOW_DAYS);
      
      // Analyzeproposal outcomes
      const proposals = history.filter(e => e.type === 'proposal');
      const outcomes = {};
      
      for (const p of proposals) {
        const key = p.input_conditions || 'unknown';
        if (!outcomes[key]) outcomes[key] = { success: 0, total: 0 };
        outcomes[key].total++;
        if (p.outcome === 'approved') outcomes[key].success++;
      }
      
      // Extract significant patterns
      for (const [key, data] of Object.entries(outcomes)) {
        if (data.total >= 3) {
          const rate = data.success / data.total;
          if (rate >= 0.8) {
            patterns.successFactors.push({ condition: key, rate, count: data.total });
          } else if (rate <= 0.3) {
            patterns.riskFactors.push({ condition: key, rate, count: data.total });
          }
        }
      }
    } catch (e) {
      // Memory not available
    }
    
    return patterns;
  }

  async analyzeResourcePatterns(memoryPath) {
    // Analyze resource usage patterns
    return {
      compute: { trend: 'stable', projection: 'normal', confidence: 0.6 },
      memory: { trend: 'stable', projection: 'normal', confidence: 0.6 },
      network: { trend: 'stable', projection: 'normal', confidence: 0.6 }
    };
  }

  async analyzePerformancePatterns(memoryPath) {
    // Analyze performance trends
    return {
      response_time: { trend: 'improving', avg_ms: 500 },
      goal_completion_rate: { trend: 'stable', rate: 0.8 },
      consensus_time: { trend: 'decreasing', avg_minutes: 15 }
    };
  }

  async loadHistory(memoryPath, days) {
    const history = [];
    
    try {
      const memoryFile = path.join(memoryPath, 'deliberation-history.json');
      if (fs.existsSync(memoryFile)) {
        const data = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        history.push(...data.filter(e => e.timestamp > cutoff));
      }
    } catch (e) {
      // Return empty history
    }
    
    return history;
  }

  async predictEvent(eventType, context = {}) {
    // Generate prediction for specific event type
    let prediction = {
      eventType,
      predictedAt: Date.now(),
      context,
      predictions: []
    };
    
    switch (eventType) {
      case 'deliberation_needed':
        prediction = await this.predictDeliberationNeed(context);
        break;
      case 'resource_shortage':
        prediction = await this.predictResourceShortage(context);
        break;
      case 'consensus_difficulty':
        prediction = await this.predictConsensusDifficulty(context);
        break;
      case 'system_anomaly':
        prediction = await this.predictAnomaly(context);
        break;
      case 'goal_completion':
        prediction = await this.predictGoalCompletion(context);
        break;
      default:
        prediction = await this.genericPrediction(eventType, context);
    }
    
    this.predictions.push(prediction);
    await this.saveState();
    
    return prediction;
  }

  async predictDeliberationNeed(context) {
    const pattern = this.patterns.temporal;
    
    // Check if we're approaching a regular deliberation time
    let probability = 0.3;
    let reasoning = 'baseline_deliberation_probability';
    
    if (pattern?.triggered?.detected) {
      const triggers = pattern.triggered.triggers;
      
      // Increase probability if trigger detected
      if (triggers.includes('curiosity_gap') || triggers.includes('anomaly')) {
        probability = 0.7;
        reasoning = 'trigger_detected';
      }
    }
    
    // Check time-of-day pattern
    const hour = new Date().getHours();
    if (pattern?.daily?.detected && hour >= 9 && hour <= 11) {
      probability = Math.min(0.9, probability + 0.2);
      reasoning = 'daily_pattern_confirmed';
    }
    
    return {
      eventType: 'deliberation_needed',
      probability,
      reasoning,
      timeframe: 'within_24h',
      confidence: pattern?.daily?.confidence || 0.5,
      triggers: pattern?.triggered?.triggers || []
    };
  }

  async predictResourceShortage(context) {
    const resourcePattern = this.patterns.resource;
    
    // Simple resource prediction
    const prediction = {
      eventType: 'resource_shortage',
      probability: 0.2,
      reasoning: 'stable_resource_usage',
      timeframe: '7d',
      confidence: CONFIG.MIN_CONFIDENCE,
      resources: ['compute', 'memory', 'network']
    };
    
    // Apply trend weighting
    if (resourcePattern.compute.trend === 'increasing') {
      prediction.probability += CONFIG.TREND_WEIGHT * 0.3;
      prediction.resources = ['memory', 'compute'];
    }
    
    return prediction;
  }

  async predictConsensusDifficulty(context) {
    const causalPattern = this.patterns.causal;
    
    let probability = 0.3;
    let concerns = [];
    
    // Check historical difficulty
    const riskFactors = causalPattern.riskFactors || [];
    if (riskFactors.some(f => f.condition === context?.topic)) {
      probability = 0.7;
      concerns.push('historical_difficulty');
    }
    
    return {
      eventType: 'consensus_difficulty',
      probability,
      reasoning: concerns.length ? 'historical_pattern' : 'baseline',
      timeframe: '24h',
      confidence: 0.5,
      concerns
    };
  }

  async predictAnomaly(context) {
    // Anomaly prediction based on historical data
    const performance = this.patterns.performance;
    
    let probability = 0.1;
    
    // Check for degradation trend
    if (performance.response_time.trend === 'degrading') {
      probability = 0.6;
    }
    
    return {
      eventType: 'system_anomaly',
      probability,
      reasoning: 'performance_degradation',
      timeframe: '24h',
      confidence: 0.4
    };
  }

  async predictGoalCompletion(context) {
    const { goalId } = context;
    
    // Simple prediction based on past performance
    const performance = this.patterns.performance;
    const completionRate = performance.goal_completion_rate?.rate || 0.7;
    
    return {
      eventType: 'goal_completion',
      probability: completionRate,
      reasoning: 'historical_completion_rate',
      timeframe: '24h',
      confidence: completionRate * HISTORY_WEIGHT,
      goalId
    };
  }

  async genericPrediction(eventType, context) {
    return {
      eventType,
      probability: 0.5,
      reasoning: 'no_historical_data',
      timeframe: '24h',
      confidence: CONFIG.MIN_CONFIDENCE
    };
  }

  async checkAlerts() {
    // Check current predictions for alert-worthy events
    const activeAlerts = [];
    
    for (const prediction of this.predictions.slice(-10)) {
      if (prediction.probability >= CONFIG.ALERT_THRESHOLD) {
        activeAlerts.push({
          ...prediction,
          alertTime: Date.now(),
          severity: prediction.probability > 0.8 ? 'high' : 'medium'
        });
      }
    }
    
    this.alerts = activeAlerts;
    await this.saveState();
    
    return activeAlerts;
  }

  async generateScenarios() {
    // Generate scenario models
    const scenarios = {
      bestCase: await this.generateBestCase(),
      worstCase: await this.generateWorstCase(),
      likely: await this.generateLikely(),
      contingency: await this.generateContingency()
    };
    
    return scenarios;
  }

  async generateBestCase() {
    return {
      scenario: 'best_case',
      probability: 0.2,
      features: [
        'all_goals_completed',
        'strong_consensus',
        'user_satisfaction_high',
        'growth_metrics_exceeded'
      ],
      requirements: [
        'no_external_disruption',
        'stable_resources',
        'user_engagement_positive'
      ]
    };
  }

  async generateWorstCase() {
    return {
      scenario: 'worst_case',
      probability: 0.1,
      features: [
        'system_failure',
        'consensus_deadlock',
        'user_override',
        'resource_depletion'
      ],
      triggers: [
        'external_attack',
        'infrastructure_failure',
        'unresolvable_disagreement'
      ],
      preparations: [
        'backup_systems_ready',
        'failure_protocols_current',
        'user_escalation_path_clear'
      ]
    };
  }

  async generateLikely() {
    return {
      scenario: 'likely',
      probability: 0.6,
      features: [
        'partial_goal_completion',
        'standard_consensus_time',
        'normal_resource_usage'
      ],
      conditions: [
        'no_major_disruptions',
        'stable_resource_availability'
      ]
    };
  }

  async generateContingency() {
    return {
      scenario: 'contingency',
      probability: 0.1,
      triggers: [
        { event: 'resource_shortage', threshold: 0.7, action: 'deprioritize_goals' },
        { event: 'consensus_deadlock', threshold: 0.6, action: 'escalate_to_sentinel' },
        { event: 'system_anomaly', threshold: 0.5, action: 'run_diagnostics' },
        { event: 'user_absent', days: 7, action: 'maintain_minimal_operation' }
      ]
    };
  }

  async prepareForScenarios(preparationType) {
    const scenarios = await this.generateScenarios();
    const preparations = [];
    
    switch (preparationType) {
      case 'resource':
        // Prepare for resource shortage
        if (scenarios.worstCase.triggers?.includes('resource_depletion')) {
          preparations.push({
            action: 'reduce_resource_allocation',
            priority: 'high',
            reason: 'worst_case_preparation'
          });
        }
        break;
        
      case 'consensus':
        // Prepare for difficult consensus
        preparations.push({
          action: 'pre_prepare_arguments',
          priority: 'medium',
          reason: 'likely_scenario'
        });
        break;
        
      case 'all':
      default:
        // Full preparation
        for (const scenario of Object.values(scenarios)) {
          if (scenario.preparations) {
            preparations.push(...scenario.preparations.map(p => ({
              ...p,
              fromScenario: scenario.scenario
            })));
          }
        }
    }
    
    return preparations;
  }

  async saveState() {
    const state = {
      predictions: this.predictions.slice(-100),
      patterns: this.patterns,
      alerts: this.alerts,
      lastAnalysis: this.lastAnalysis
    };
    
    const statePath = path.join(this.stateDir, 'predictive-state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  async loadState() {
    const statePath = path.join(this.stateDir, 'predictive-state.json');
    
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      this.predictions = state.predictions || [];
      this.patterns = state.patterns || {};
      this.alerts = state.alerts || [];
      this.lastAnalysis = state.lastAnalysis || null;
    }
  }

  getDashboard() {
    return {
      activePredictions: this.predictions.length,
      alerts: this.alerts.length,
      lastAnalysis: this.lastAnalysis,
      patterns: {
        temporal: !!this.patterns.temporal,
        causal: this.patterns.causal?.causeEffect?.length || 0,
        performance: !!this.patterns.performance
      }
    };
  }
}

// Export
module.exports = { PredictiveReasoner, CONFIG };

if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || './state';
  
  const predictor = new PredictiveReasoner(agentId, stateDir);
  
  const command = process.argv[2];
  
  (async () => {
    await predictor.loadState();
    
    switch (command) {
      case 'analyze':
        const patterns = await predictor.analyzePatterns();
        console.log(JSON.stringify(patterns, null, 2));
        break;
        
      case 'predict':
        const eventType = process.argv[3];
        const context = JSON.parse(process.argv[4] || '{}');
        const prediction = await predictor.predictEvent(eventType, context);
        console.log(JSON.stringify(prediction, null, 2));
        break;
        
      case 'alerts':
        const alerts = await predictor.checkAlerts();
        console.log(JSON.stringify(alerts, null, 2));
        break;
        
      case 'scenarios':
        const scenarios = await predictor.generateScenarios();
        console.log(JSON.stringify(scenarios, null, 2));
        break;
        
      case 'prepare':
        const prep = await predictor.prepareForScenarios(process.argv[3] || 'all');
        console.log(JSON.stringify(prep, null, 2));
        break;
        
      case 'dashboard':
        console.log(predictor.getDashboard());
        break;
        
      default:
        console.log('Commands: analyze, predict, alerts, scenarios, prepare, dashboard');
    }
  })();
}
```

#### 2. early-warning-monitor.sh

```bash
#!/bin/bash
# early-warning-monitor.sh - Continuous monitoring for predictive alerts

AGENT_ID="${AGENT_ID:-steward}"
STATE_DIR="${STATE_DIR:-./state}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"

log() {
  echo "[$(date -Iseconds)] [early-warning] $*"
}

runLoop() {
  log "Starting early warning monitoring loop"
  
  # Initial analysis
  node predictor.js analyze "$AGENT_ID" "$STATE_DIR"
  
  while true; do
    # Check for high-probability predictions
    node predictor.js alerts "$AGENT_ID" "$STATE_DIR"
    
    ALERTS=$(node predictor.js alerts "$AGENT_ID" "$STATE_DIR" 2>/dev/null)
    ALERT_COUNT=$(echo "$ALERTS" | grep -o '"severity":"high"' | wc -l)
    
    if [ "$ALERT_COUNT" -gt 0 ]; then
      log "HIGH ALERT: $ALERT_COUNT critical predictions detected"
      # Could trigger emergency protocols here
    fi
    
    # Generate scenarios periodically
    if [ $(($(date +%s) % 3600)) -lt 60 ]; then
      log "Hourly scenario generation"
      node predictor.js scenarios "$AGENT_ID" "$STATE_DIR"
    fi
    
    log "Early warning check complete - sleeping $INTERVAL_SECONDS seconds"
    sleep "$INTERVAL_SECONDS"
  done
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  runLoop
fi
```

### Integration with Self-Modeling

The predictive reasoner uses the self-model to improve accuracy:

```javascript
// In predictor.js
async predictGoalCompletion(context) {
  const { goalId } = context;
  
  // Get goal from Goal Arbitrator
  const goalArb = require('./goal-arbitrator.js');
  const arb = new goalArb.GoalArbitrator(this.agentId, this.stateDir);
  await arb.loadState();
  
  const goal = arb.activeGoals.find(g => g.id === goalId);
  if (!goal) return { eventType: 'goal_completion', probability: 0 };
  
  // Get self-model capability data
  const selfModel = require('./self-model.js');
  const model = new selfModel.SelfModel(this.agentId, this.stateDir);
  await model.loadState();
  
  const capability = model.getCapability('goal_completion');
  
  // Adjust probability based on historical performance
  let probability = capability?.successRate || 0.7;
  
  // Adjust for goal difficulty
  const difficulty = goal.estimatedEffort;
  probability *= (10 - difficulty) / 10;
  
  return {
    eventType: 'goal_completion',
    probability: Math.max(0, Math.min(1, probability)),
    reasoning: 'capability_adjusted',
    goalId
  };
}
```

### Prediction Types

| Event Type | Typical Probability | Alert Threshold | Response |
|------------|---------------------|----------------|----------|
| deliberation_needed | 0.3-0.7 | 0.7 | initiate_deliberation |
| resource_shortage | 0.2-0.5 | 0.5 | reduce_allocation |
| consensus_difficulty | 0.3-0.6 | 0.6 | pre_prepare |
| system_anomaly | 0.1-0.4 | 0.5 | run_diagnostics |
| goal_completion | varies | 0.3 | adjust_goals |

### Dashboard

```bash
# Get prediction dashboard
node predictor.js dashboard
```

Output:
```json
{
  "activePredictions": 5,
  "alerts": 2,
  "lastAnalysis": 1700000000000,
  "patterns": {
    "temporal": true,
    "causal": 3,
    "performance": true
  }
}
```

### Metrics

```javascript
const METRICS = {
  predictions_total: 0,
  predictions_triggered: 0,
  prediction_accuracy: 0,
  alerts_raised: 0,
  scenarios_generated: 0,
  preparation_actions_taken: 0
};
```

### Testing

```bash
# Test pattern analysis
node predictor.js analyze

# Test specific prediction
node predictor.js predict deliberation_needed '{"hour":10}'

# Test scenario generation
node predictor.js scenarios

# Test preparation
node predictor.js prepare all

# Test alerts
node predictor.js alerts
```

---

This module enables the collective to anticipate and prepare for the future, completing the journey from reactive to proactive autonomy. Combined with Continuous Thought Loop, Self-Modeling, Goal Arbitration, and Predictive Reasoning, the collective achieves "every thinking" - continuous, self-aware, goal-directed autonomy.