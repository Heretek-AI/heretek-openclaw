#!/usr/bin/env node
/**
 * predictor.js - Predictive Reasoning Engine
 * 
 * Core module for anticipatory autonomy - enables the collective to:
 * - Analyze historical patterns (temporal, causal, resource, performance)
 * - Predict future events with probability estimates
 * - Model scenarios (best case, worst case, likely, contingency)
 * - Generate early warnings for high-probability events
 * - Prepare proactive actions for anticipated scenarios
 * 
 * Usage:
 *   node predictor.js analyze              - Analyze patterns from history
 *   node predictor.js predict <type> <ctx> - Predict specific event
 *   node predictor.js alerts               - Check for active alerts
 *   node predictor.js scenarios            - Generate scenario models
 *   node predictor.js prepare <type>       - Generate preparation actions
 *   node predictor.js dashboard           - Show prediction dashboard
 * 
 * Environment Variables:
 *   AGENT_ID    - Agent identifier (default: steward)
 *   STATE_DIR   - State directory (default: ./state)
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  LOOKAHEAD_HOURS: 24,
  MIN_CONFIDENCE: 0.5,
  PATTERN_WINDOW_DAYS: 7,
  HISTORY_WEIGHT: 0.7,
  TREND_WEIGHT: 0.3,
  ALERT_THRESHOLD: 0.7,
  MAX_PREDICTIONS_STORED: 100,
  MAX_ALERTS_STORED: 50
};

// Metrics tracking
const METRICS = {
  predictions_total: 0,
  predictions_triggered: 0,
  prediction_accuracy: 0,
  alerts_raised: 0,
  scenarios_generated: 0,
  preparation_actions_taken: 0
};

// ============================================================================
// PREDICTIVE REASONER CLASS
// ============================================================================

class PredictiveReasoner {
  /**
   * Create a new PredictiveReasoner instance
   * @param {string} agentId - Agent identifier
   * @param {string} stateDir - Directory for state files
   */
  constructor(agentId = 'steward', stateDir = './state') {
    this.agentId = agentId;
    this.stateDir = stateDir;
    this.predictions = [];
    this.patterns = {
      temporal: null,
      causal: null,
      resource: null,
      performance: null
    };
    this.alerts = [];
    this.scenarios = null;
    this.lastAnalysis = null;
    this.metrics = { ...METRICS };
  }

  // ==========================================================================
  // PATTERN ANALYSIS
  // ==========================================================================

  /**
   * Analyze all historical patterns from memory and other sources
   * @returns {Object} Pattern analysis results
   */
  async analyzePatterns() {
    console.error('[predictor] Analyzing historical patterns...');
    
    try {
      // Analyze different pattern types
      this.patterns = {
        temporal: await this.analyzeTemporalPatterns(),
        causal: await this.analyzeCausalPatterns(),
        resource: await this.analyzeResourcePatterns(),
        performance: await this.analyzePerformancePatterns()
      };
      
      this.lastAnalysis = Date.now();
      await this.saveState();
      
      console.error('[predictor] Pattern analysis complete');
      return this.patterns;
    } catch (error) {
      console.error('[predictor] Pattern analysis error:', error.message);
      // Return default patterns on error
      this.patterns = this.getDefaultPatterns();
      this.lastAnalysis = Date.now();
      return this.patterns;
    }
  }

  /**
   * Get default patterns when analysis fails
   * @returns {Object} Default pattern structure
   */
  getDefaultPatterns() {
    return {
      temporal: {
        daily: { detected: false, interval: null, confidence: 0 },
        weekly: { detected: false, interval: null, confidence: 0 },
        triggered: { detected: false, triggers: [], confidence: 0 }
      },
      causal: {
        causeEffect: [],
        riskFactors: [],
        successFactors: []
      },
      resource: {
        compute: { trend: 'stable', projection: 'normal', confidence: 0.5 },
        memory: { trend: 'stable', projection: 'normal', confidence: 0.5 },
        network: { trend: 'stable', projection: 'normal', confidence: 0.5 }
      },
      performance: {
        response_time: { trend: 'stable', avg_ms: 500 },
        goal_completion_rate: { trend: 'stable', rate: 0.7 },
        consensus_time: { trend: 'stable', avg_minutes: 15 }
      }
    };
  }

  /**
   * Analyze temporal/time-based patterns from history
   * @returns {Object} Temporal pattern analysis
   */
  async analyzeTemporalPatterns() {
    const patterns = {
      daily: { detected: false, interval: null, confidence: 0 },
      weekly: { detected: false, interval: null, confidence: 0 },
      triggered: { detected: false, triggers: [], confidence: 0 }
    };
    
    try {
      // Try to load from thought-loop history
      const history = await this.loadHistory('thought-loop/thought-state.json', CONFIG.PATTERN_WINDOW_DAYS);
      
      if (history && history.length > 0) {
        // Analyze deliberation timing
        const deliberationTimes = history
          .filter(e => e.type === 'deliberation' || e.timestamp)
          .map(e => new Date(e.timestamp).getTime())
          .sort((a, b) => a - b);
        
        // Check for daily pattern (24-hour cycle)
        if (deliberationTimes.length > 5) {
          const intervals = [];
          for (let i = 1; i < deliberationTimes.length; i++) {
            intervals.push(deliberationTimes[i] - deliberationTimes[i-1]);
          }
          const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
          
          // 24-hour cycle detection (20-28 hours)
          if (avgInterval > 20 * 60 * 60 * 1000 && avgInterval < 28 * 60 * 60 * 1000) {
            patterns.daily = {
              detected: true,
              interval: '24h',
              confidence: CONFIG.HISTORY_WEIGHT,
              avgIntervalHours: avgInterval / (60 * 60 * 1000)
            };
          }
          
          // Weekly cycle detection (6-8 days)
          if (avgInterval > 6 * 24 * 60 * 60 * 1000 && avgInterval < 8 * 24 * 60 * 60 * 1000) {
            patterns.weekly = {
              detected: true,
              interval: '7d',
              confidence: CONFIG.HISTORY_WEIGHT * 0.8
            };
          }
        }
        
        // Analyze trigger occurrences
        const triggers = history
          .filter(e => e.trigger || e.triggerType)
          .map(e => e.trigger || e.triggerType);
        
        if (triggers.length > 0) {
          const triggerCounts = {};
          for (const t of triggers) {
            triggerCounts[t] = (triggerCounts[t] || 0) + 1;
          }
          
          patterns.triggered = {
            detected: true,
            triggers: Object.keys(triggerCounts)
              .sort((a, b) => triggerCounts[b] - triggerCounts[a])
              .slice(0, 5),
            triggerCounts,
            confidence: Math.min(0.9, triggers.length / 10)
          };
        }
      }
    } catch (error) {
      console.error('[predictor] Temporal pattern analysis error:', error.message);
    }
    
    return patterns;
  }

  /**
   * Analyze cause-effect relationships from history
   * @returns {Object} Causal pattern analysis
   */
  async analyzeCausalPatterns() {
    const patterns = {
      causeEffect: [],
      riskFactors: [],
      successFactors: []
    };
    
    try {
      // Load goal arbitration history
      const history = await this.loadHistory('goal-arbitration/goal-state.json', CONFIG.PATTERN_WINDOW_DAYS);
      
      if (history && history.length > 0) {
        // Analyze proposal outcomes
        const proposals = history.filter(e => e.type === 'proposal' || e.status);
        const outcomes = {};
        
        for (const p of proposals) {
          const key = p.input_conditions || p.topic || 'unknown';
          if (!outcomes[key]) outcomes[key] = { success: 0, total: 0 };
          outcomes[key].total++;
          if (p.outcome === 'approved' || p.status === 'approved') {
            outcomes[key].success++;
          }
        }
        
        // Extract significant patterns
        for (const [key, data] of Object.entries(outcomes)) {
          if (data.total >= 3) {
            const rate = data.success / data.total;
            if (rate >= 0.8) {
              patterns.successFactors.push({
                condition: key,
                rate: parseFloat(rate.toFixed(2)),
                count: data.total
              });
            } else if (rate <= 0.3) {
              patterns.riskFactors.push({
                condition: key,
                rate: parseFloat(rate.toFixed(2)),
                count: data.total
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[predictor] Causal pattern analysis error:', error.message);
    }
    
    return patterns;
  }

  /**
   * Analyze resource usage patterns
   * @returns {Object} Resource pattern analysis
   */
  async analyzeResourcePatterns() {
    try {
      // Try to get resource data from self-model
      const resourceData = await this.loadHistory('self-model/capabilities.json', CONFIG.PATTERN_WINDOW_DAYS);
      
      if (resourceData && resourceData.length > 0) {
        return {
          compute: { trend: 'stable', projection: 'normal', confidence: 0.6 },
          memory: { trend: 'stable', projection: 'normal', confidence: 0.6 },
          network: { trend: 'stable', projection: 'normal', confidence: 0.6 }
        };
      }
    } catch (error) {
      // Use defaults
    }
    
    return {
      compute: { trend: 'stable', projection: 'normal', confidence: 0.5 },
      memory: { trend: 'stable', projection: 'normal', confidence: 0.5 },
      network: { trend: 'stable', projection: 'normal', confidence: 0.5 }
    };
  }

  /**
   * Analyze performance trends
   * @returns {Object} Performance pattern analysis
   */
  async analyzePerformancePatterns() {
    try {
      const history = await this.loadHistory('thought-loop/thought-state.json', CONFIG.PATTERN_WINDOW_DAYS);
      
      if (history && history.length > 5) {
        // Calculate average response times
        const responseTimes = history
          .filter(e => e.processing_time_ms || e.response_time_ms)
          .map(e => e.processing_time_ms || e.response_time_ms);
        
        if (responseTimes.length > 0) {
          const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const trend = avgResponse < 500 ? 'improving' : avgResponse > 1000 ? 'degrading' : 'stable';
          
          return {
            response_time: { trend, avg_ms: Math.round(avgResponse) },
            goal_completion_rate: { trend: 'stable', rate: 0.7 },
            consensus_time: { trend: 'stable', avg_minutes: 15 }
          };
        }
      }
    } catch (error) {
      // Use defaults
    }
    
    return {
      response_time: { trend: 'stable', avg_ms: 500 },
      goal_completion_rate: { trend: 'stable', rate: 0.7 },
      consensus_time: { trend: 'stable', avg_minutes: 15 }
    };
  }

  /**
   * Load history from a state file
   * @param {string} relativePath - Path relative to heretek-openclaw
   * @param {number} days - Number of days to look back
   * @returns {Array} Historical events
   */
  async loadHistory(relativePath, days) {
    const basePath = path.join(__dirname, '..', '..');
    const filePath = path.join(basePath, relativePath);
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      // Handle both array and object with history property
      if (Array.isArray(data)) {
        return data.filter(e => e.timestamp && e.timestamp > cutoff);
      } else if (data.history) {
        return data.history.filter(e => e.timestamp && e.timestamp > cutoff);
      }
    }
    
    return [];
  }

  // ==========================================================================
  // EVENT PREDICTION
  // ==========================================================================

  /**
   * Predict a specific event type
   * @param {string} eventType - Type of event to predict
   * @param {Object} context - Context information for prediction
   * @returns {Object} Prediction result
   */
  async predictEvent(eventType, context = {}) {
    console.error(`[predictor] Predicting event: ${eventType}`);
    
    let prediction;
    
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
    
    // Add metadata
    prediction.predictedAt = Date.now();
    prediction.context = context;
    
    // Store prediction
    this.predictions.push(prediction);
    if (this.predictions.length > CONFIG.MAX_PREDICTIONS_STORED) {
      this.predictions = this.predictions.slice(-CONFIG.MAX_PREDICTIONS_STORED);
    }
    
    // Update metrics
    this.metrics.predictions_total++;
    
    await this.saveState();
    
    return prediction;
  }

  /**
   * Predict when deliberation will be needed
   * @param {Object} context - Context including hour, triggers, etc.
   * @returns {Object} Prediction result
   */
  async predictDeliberationNeed(context = {}) {
    const pattern = this.patterns.temporal;
    
    let probability = 0.3;
    let reasoning = 'baseline_deliberation_probability';
    let triggers = [];
    
    // Check if we're approaching a regular deliberation time
    if (pattern?.triggered?.detected) {
      triggers = pattern.triggered.triggers;
      
      // Increase probability if trigger detected
      if (triggers.includes('curiosity_gap') || triggers.includes('anomaly')) {
        probability = 0.7;
        reasoning = 'trigger_detected';
      } else if (triggers.includes('goal_conflict') || triggers.includes('resource_contention')) {
        probability = 0.6;
        reasoning = 'goal_conflict_trigger';
      }
    }
    
    // Check time-of-day pattern
    const hour = context.hour !== undefined ? context.hour : new Date().getHours();
    if (pattern?.daily?.detected && hour >= 9 && hour <= 11) {
      probability = Math.min(0.9, probability + 0.2);
      reasoning = 'daily_pattern_confirmed';
    }
    
    // Check for pending goals from context
    if (context.pendingGoals && context.pendingGoals.length > 0) {
      probability = Math.min(0.9, probability + 0.15 * Math.min(context.pendingGoals.length, 3));
      reasoning = 'pending_goals_increased_need';
    }
    
    return {
      eventType: 'deliberation_needed',
      probability: parseFloat(probability.toFixed(2)),
      reasoning,
      timeframe: 'within_24h',
      confidence: pattern?.daily?.confidence || CONFIG.MIN_CONFIDENCE,
      triggers
    };
  }

  /**
   * Predict resource shortage
   * @param {Object} context - Context including resource types
   * @returns {Object} Prediction result
   */
  async predictResourceShortage(context = {}) {
    const resourcePattern = this.patterns.resource;
    
    let probability = 0.2;
    let reasoning = 'stable_resource_usage';
    let resources = ['compute', 'memory', 'network'];
    
    // Apply trend weighting
    for (const [resource, data] of Object.entries(resourcePattern)) {
      if (data.trend === 'increasing') {
        probability += CONFIG.TREND_WEIGHT * 0.2;
        resources.push(resource);
      } else if (data.trend === 'decreasing') {
        probability -= CONFIG.TREND_WEIGHT * 0.1;
      }
    }
    
    // Check context for specific resource concerns
    if (context.concernedResources) {
      resources = context.concernedResources;
      probability = Math.min(0.8, probability + 0.2);
      reasoning = 'contextual_resource_concern';
    }
    
    return {
      eventType: 'resource_shortage',
      probability: parseFloat(Math.min(0.9, probability).toFixed(2)),
      reasoning,
      timeframe: '7d',
      confidence: resourcePattern.compute?.confidence || CONFIG.MIN_CONFIDENCE,
      resources: [...new Set(resources)]
    };
  }

  /**
   * Predict consensus difficulty
   * @param {Object} context - Context including topic
   * @returns {Object} Prediction result
   */
  async predictConsensusDifficulty(context = {}) {
    const causalPattern = this.patterns.causal;
    
    let probability = 0.3;
    let reasoning = 'baseline';
    let concerns = [];
    
    // Check historical difficulty for the topic
    const riskFactors = causalPattern?.riskFactors || [];
    if (context.topic && riskFactors.some(f => f.condition === context.topic)) {
      probability = 0.7;
      concerns.push('historical_difficulty');
      reasoning = 'historical_pattern';
    } else if (riskFactors.length > 0) {
      probability = 0.5;
      concerns.push('general_risk_factors');
      reasoning = 'some_risk_factors_detected';
    }
    
    // Check number of conflicting goals
    if (context.conflictingGoals && context.conflictingGoals.length > 1) {
      probability = Math.min(0.9, probability + 0.2);
      concerns.push('goal_conflicts');
      reasoning = 'multiple_conflicting_goals';
    }
    
    return {
      eventType: 'consensus_difficulty',
      probability: parseFloat(probability.toFixed(2)),
      reasoning,
      timeframe: '24h',
      confidence: 0.5,
      concerns
    };
  }

  /**
   * Predict system anomaly
   * @param {Object} context - Context including anomaly indicators
   * @returns {Object} Prediction result
   */
  async predictAnomaly(context = {}) {
    const performance = this.patterns.performance;
    
    let probability = 0.1;
    let reasoning = 'normal_performance';
    
    // Check for degradation trend
    if (performance?.response_time?.trend === 'degrading') {
      probability = 0.6;
      reasoning = 'performance_degradation';
    } else if (performance?.response_time?.trend === 'improving') {
      probability = 0.05;
      reasoning = 'performance_improving';
    }
    
    // Context-based adjustments
    if (context.errorRate && context.errorRate > 0.1) {
      probability = Math.min(0.9, probability + 0.3);
      reasoning = 'elevated_error_rate';
    }
    
    return {
      eventType: 'system_anomaly',
      probability: parseFloat(probability.toFixed(2)),
      reasoning,
      timeframe: '24h',
      confidence: performance?.response_time?.trend ? 0.6 : 0.3
    };
  }

  /**
   * Predict goal completion
   * @param {Object} context - Context including goalId
   * @returns {Object} Prediction result
   */
  async predictGoalCompletion(context = {}) {
    const { goalId } = context;
    const performance = this.patterns.performance;
    
    let probability = performance?.goal_completion_rate?.rate || 0.7;
    let reasoning = 'historical_completion_rate';
    
    // Adjust based on goal context
    if (context.goalPriority === 'low') {
      probability = Math.min(0.9, probability + 0.1);
      reasoning = 'low_priority_goals_more_likely';
    } else if (context.goalPriority === 'high') {
      probability = Math.max(0.1, probability - 0.15);
      reasoning = 'high_priority_more_challenging';
    }
    
    // Adjust for estimated effort if provided
    if (context.estimatedEffort && context.estimatedEffort > 8) {
      probability = Math.max(0.1, probability - 0.2);
      reasoning = 'high_effort_reduces_likelihood';
    }
    
    return {
      eventType: 'goal_completion',
      probability: parseFloat(probability.toFixed(2)),
      reasoning,
      timeframe: '24h',
      confidence: parseFloat((probability * CONFIG.HISTORY_WEIGHT).toFixed(2)),
      goalId
    };
  }

  /**
   * Generic prediction for unknown event types
   * @param {string} eventType - Event type
   * @param {Object} context - Context
   * @returns {Object} Default prediction
   */
  async genericPrediction(eventType, context = {}) {
    return {
      eventType,
      probability: 0.5,
      reasoning: 'no_historical_data',
      timeframe: '24h',
      confidence: CONFIG.MIN_CONFIDENCE,
      context
    };
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  /**
   * Check current predictions for alert-worthy events
   * @returns {Array} Active alerts
   */
  async checkAlerts() {
    console.error('[predictor] Checking for alerts...');
    
    const activeAlerts = [];
    const recentPredictions = this.predictions.slice(-20);
    
    for (const prediction of recentPredictions) {
      if (prediction.probability >= CONFIG.ALERT_THRESHOLD) {
        const alert = {
          ...prediction,
          alertTime: Date.now(),
          severity: prediction.probability > 0.8 ? 'high' : 'medium'
        };
        activeAlerts.push(alert);
      }
    }
    
    this.alerts = activeAlerts.slice(0, CONFIG.MAX_ALERTS_STORED);
    
    // Update metrics
    this.metrics.alerts_raised = this.alerts.length;
    
    await this.saveState();
    
    console.error(`[predictor] Found ${activeAlerts.length} alerts`);
    return activeAlerts;
  }

  // ==========================================================================
  // SCENARIO MODELING
  // ==========================================================================

  /**
   * Generate scenario models
   * @returns {Object} All scenarios
   */
  async generateScenarios() {
    console.error('[predictor] Generating scenarios...');
    
    this.scenarios = {
      bestCase: await this.generateBestCase(),
      worstCase: await this.generateWorstCase(),
      likely: await this.generateLikely(),
      contingency: await this.generateContingency()
    };
    
    // Update metrics
    this.metrics.scenarios_generated++;
    
    await this.saveState();
    
    console.error('[predictor] Scenarios generated');
    return this.scenarios;
  }

  /**
   * Generate best case scenario
   * @returns {Object} Best case scenario
   */
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
      ],
      estimatedTimeline: '24h'
    };
  }

  /**
   * Generate worst case scenario
   * @returns {Object} Worst case scenario
   */
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
        { action: 'backup_systems_ready', priority: 'high' },
        { action: 'failure_protocols_current', priority: 'high' },
        { action: 'user_escalation_path_clear', priority: 'medium' }
      ],
      estimatedTimeline: '48h'
    };
  }

  /**
   * Generate likely scenario
   * @returns {Object} Likely scenario
   */
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
      ],
      estimatedTimeline: '24h'
    };
  }

  /**
   * Generate contingency triggers and actions
   * @returns {Object} Contingency scenario
   */
  async generateContingency() {
    return {
      scenario: 'contingency',
      probability: 0.1,
      triggers: [
        { event: 'resource_shortage', threshold: 0.7, action: 'deprioritize_goals' },
        { event: 'consensus_deadlock', threshold: 0.6, action: 'escalate_to_sentinel' },
        { event: 'system_anomaly', threshold: 0.5, action: 'run_diagnostics' },
        { event: 'user_absent', days: 7, action: 'maintain_minimal_operation' }
      ],
      actions: [
        { action: 'activate_monitoring', priority: 'high' },
        { action: 'preallocate_buffers', priority: 'medium' },
        { action: 'prepare_fallback', priority: 'low' }
      ]
    };
  }

  // ==========================================================================
  // PREPARATION
  // ==========================================================================

  /**
   * Generate preparation actions for scenarios
   * @param {string} preparationType - Type: resource, consensus, or all
   * @returns {Array} Preparation actions
   */
  async prepareForScenarios(preparationType = 'all') {
    console.error(`[predictor] Generating preparations for: ${preparationType}`);
    
    const scenarios = this.scenarios || await this.generateScenarios();
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
        preparations.push({
          action: 'preallocate_buffers',
          priority: 'medium',
          reason: 'resource_preparation'
        });
        break;
        
      case 'consensus':
        // Prepare for difficult consensus
        preparations.push({
          action: 'pre_prepare_arguments',
          priority: 'medium',
          reason: 'likely_scenario'
        });
        preparations.push({
          action: 'identify_common_ground',
          priority: 'medium',
          reason: 'consensus_facilitation'
        });
        break;
        
      case 'all':
      default:
        // Full preparation from all scenarios
        for (const scenario of Object.values(scenarios)) {
          if (scenario.preparations) {
            for (const p of scenario.preparations) {
              preparations.push({
                ...p,
                fromScenario: scenario.scenario
              });
            }
          }
          if (scenario.actions) {
            for (const a of scenario.actions) {
              preparations.push({
                ...a,
                fromScenario: scenario.scenario
              });
            }
          }
        }
    }
    
    // Update metrics
    this.metrics.preparation_actions_taken += preparations.length;
    
    await this.saveState();
    
    console.error(`[predictor] Generated ${preparations.length} preparation actions`);
    return preparations;
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  /**
   * Get prediction dashboard data
   * @returns {Object} Dashboard data
   */
  getDashboard() {
    return {
      agentId: this.agentId,
      activePredictions: this.predictions.length,
      alerts: this.alerts.length,
      highPriorityAlerts: this.alerts.filter(a => a.severity === 'high').length,
      lastAnalysis: this.lastAnalysis,
      patterns: {
        temporal: !!this.patterns.temporal,
        causal: this.patterns.causal?.causeEffect?.length || 0,
        resource: !!this.patterns.resource,
        performance: !!this.patterns.performance
      },
      metrics: this.metrics,
      systemStatus: this.determineSystemStatus()
    };
  }

  /**
   * Determine overall system status based on predictions
   * @returns {string} Status: healthy, warning, critical
   */
  determineSystemStatus() {
    const highAlerts = this.alerts.filter(a => a.severity === 'high').length;
    
    if (highAlerts > 0) return 'critical';
    if (this.alerts.length > 2) return 'warning';
    return 'healthy';
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Save current state to file
   */
  async saveState() {
    const state = {
      agentId: this.agentId,
      predictions: this.predictions.slice(-CONFIG.MAX_PREDICTIONS_STORED),
      patterns: this.patterns,
      alerts: this.alerts,
      scenarios: this.scenarios,
      lastAnalysis: this.lastAnalysis,
      metrics: this.metrics,
      savedAt: Date.now()
    };
    
    const statePath = path.join(this.stateDir, 'predictive-state.json');
    
    try {
      // Ensure directory exists
      const dir = path.dirname(statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('[predictor] Error saving state:', error.message);
    }
  }

  /**
   * Load state from file
   */
  async loadState() {
    const statePath = path.join(this.stateDir, 'predictive-state.json');
    
    try {
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        this.predictions = state.predictions || [];
        this.patterns = state.patterns || this.getDefaultPatterns();
        this.alerts = state.alerts || [];
        this.scenarios = state.scenarios || null;
        this.lastAnalysis = state.lastAnalysis || null;
        this.metrics = state.metrics || { ...METRICS };
        console.error('[predictor] State loaded successfully');
      } else {
        console.error('[predictor] No previous state found, starting fresh');
      }
    } catch (error) {
      console.error('[predictor] Error loading state:', error.message);
    }
  }
}

// ============================================================================
// CLI HANDLER
// ============================================================================

/**
 * Handle CLI commands
 */
async function handleCLI() {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || path.join(__dirname, 'state');
  
  const predictor = new PredictiveReasoner(agentId, stateDir);
  
  // Load previous state
  await predictor.loadState();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  try {
    switch (command) {
      case 'analyze':
        // Analyze patterns
        const patterns = await predictor.analyzePatterns();
        console.log(JSON.stringify(patterns, null, 2));
        break;
        
      case 'predict':
        // Predict specific event
        if (args.length < 1) {
          console.error('Usage: predict <eventType> [contextJSON]');
          console.error('Event types: deliberation_needed, resource_shortage, consensus_difficulty, system_anomaly, goal_completion');
          process.exit(1);
        }
        const eventType = args[0];
        const context = args[1] ? JSON.parse(args[1]) : {};
        const prediction = await predictor.predictEvent(eventType, context);
        console.log(JSON.stringify(prediction, null, 2));
        break;
        
      case 'alerts':
        // Check alerts
        const alerts = await predictor.checkAlerts();
        console.log(JSON.stringify(alerts, null, 2));
        break;
        
      case 'scenarios':
        // Generate scenarios
        const scenarios = await predictor.generateScenarios();
        console.log(JSON.stringify(scenarios, null, 2));
        break;
        
      case 'prepare':
        // Generate preparations
        const prepType = args[0] || 'all';
        const preparations = await predictor.prepareForScenarios(prepType);
        console.log(JSON.stringify(preparations, null, 2));
        break;
        
      case 'dashboard':
        // Show dashboard
        console.log(JSON.stringify(predictor.getDashboard(), null, 2));
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        if (command) {
          console.error(`Unknown command: ${command}`);
        }
        showHelp();
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Show CLI help
 */
function showHelp() {
  console.log(`
Predictive Reasoning Engine
===========================

Usage: node predictor.js <command> [options]

Commands:
  analyze                    Analyze historical patterns
  predict <type> [context]   Predict specific event type
  alerts                     Check for active alerts
  scenarios                  Generate scenario models
  prepare [type]             Generate preparation actions
  dashboard                  Show prediction dashboard
  help                       Show this help message

Event Types for predict:
  deliberation_needed        Predict when deliberation will be needed
  resource_shortage          Predict potential resource shortages
  consensus_difficulty       Predict consensus challenges
  system_anomaly             Predict system anomalies
  goal_completion            Predict goal completion likelihood

Preparation Types:
  resource                   Prepare for resource issues
  consensus                  Prepare for consensus challenges
  all                         Full preparation (default)

Examples:
  node predictor.js analyze
  node predictor.js predict deliberation_needed '{"hour":10}'
  node predictor.js predict goal_completion '{"goalId":"goal-123"}'
  node predictor.js alerts
  node predictor.js scenarios
  node predictor.js prepare all
  node predictor.js dashboard

Environment Variables:
  AGENT_ID      Agent identifier (default: steward)
  STATE_DIR     State directory (default: ./state)
`);
}

// ============================================================================
// EXPORTS AND MAIN
// ============================================================================

module.exports = { PredictiveReasoner, CONFIG, METRICS };

// Run CLI if called directly
if (require.main === module) {
  handleCLI();
}
