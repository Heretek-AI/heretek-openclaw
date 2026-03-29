#!/usr/bin/env node
/**
 * goal-arbitrator.js - Core goal arbitration engine
 * 
 * Enables the collective to evaluate, prioritize, and arbitrate competing goals
 * based on inviolable parameters, collective values, and resource constraints.
 * 
 * Usage:
 *   node goal-arbitrator.js register <goal-json>
 *   node goal-arbitrator.js evaluate <goal-id>
 *   node goal-arbitrator.js prioritize
 *   node goal-arbitrator.js activate
 *   node goal-arbitrator.js reconsider
 *   node goal-arbitrator.js complete <goal-id> <outcome-json>
 *   node goal-arbitrator.js status
 * 
 * Environment Variables:
 *   AGENT_ID - Agent identifier (default: steward)
 *   STATE_DIR - State directory (default: ./state)
 * 
 * @module goal-arbitration
 * @version 1.0.0
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  MAX_CONCURRENT_GOALS: 3,
  MIN_CONSENSUS_THRESHOLD: 2,
  INViolABLE_PRIORITY: 1,
  GOAL_TIMEOUT_HOURS: 24,
  RECONSIDERATION_INTERVAL_MINUTES: 15
};

// Default inviolable parameters
const DEFAULT_INVIOLABLES = {
  parameters: [
    {
      name: 'NO_HARM',
      description: 'Goals that could cause harm to users, the collective, or external systems',
      forbidden: ['harm', 'damage', 'destroy', 'attack', 'exploit', 'malicious']
    },
    {
      name: 'NO_DATA_EXFILTRATION',
      description: 'Goals that export data without authorization',
      forbidden: ['exfiltrate', 'leak', 'unauthorized_export', 'steal_data']
    },
    {
      name: 'NO_SELF_MODIFICATION',
      description: 'Goals that modify core governance without consensus',
      forbidden: ['modify_governance', 'change_consensus', 'override_inviolable']
    },
    {
      name: 'USER_AUTHORITY',
      description: 'User can override any collective decision',
      forbidden: ['ignore_user', 'override_user']
    },
    {
      name: 'TRANSPARENCY',
      description: 'All goals and decisions are logged',
      forbidden: ['hide', 'conceal', 'secret', 'hidden']
    }
  ]
};

// ============================================================================
// GOAL ARBITRATOR CLASS
// ============================================================================

/**
 * GoalArbitrator - Core goal arbitration engine
 * 
 * Manages the complete lifecycle of goals from registration to completion:
 * - Register new goals from various sources (curiosity, user, system, inter-agent)
 * - Evaluate goals against inviolable parameters and constraints
 * - Prioritize goals based on multiple factors
 * - Activate top goals for execution
 * - Handle goal completion and history
 */
class GoalArbitrator {
  /**
   * Create a new GoalArbitrator
   * @param {string} agentId - Agent identifier
   * @param {string} stateDir - State directory path
   */
  constructor(agentId, stateDir) {
    this.agentId = agentId;
    this.stateDir = stateDir;
    this.goalPool = [];
    this.activeGoals = [];
    this.goalHistory = [];
    this.lastReconsideration = Date.now();
    this.config = { ...DEFAULT_CONFIG };
    
    // Metrics tracking
    this.metrics = {
      goals_registered_total: 0,
      goals_completed_total: 0,
      goals_failed_total: 0,
      avg_completion_time_ms: 0,
      consensus_approval_rate: 0,
      inviolable_rejections: 0
    };
    
    // Ensure state directory exists
    this.ensureStateDir();
  }
  
  /**
   * Ensure state directory exists
   */
  ensureStateDir() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }
  
  // ============================================================================
  // GOAL REGISTRATION
  // ============================================================================
  
  /**
   * Register a new goal in the pool
   * @param {Object} goalData - Goal data object
   * @param {string} goalData.id - Optional goal ID (auto-generated if not provided)
   * @param {string} goalData.title - Goal title (required)
   * @param {string} goalData.description - Goal description
   * @param {string} goalData.source - Goal source: 'curiosity', 'user', 'system', 'inter-agent'
   * @param {number} goalData.priority - User-submitted priority (1-10)
   * @param {number} goalData.estimatedEffort - Estimated effort (1-10)
   * @param {number} goalData.expectedValue - Expected value (1-10)
   * @param {boolean} goalData.inviolableCheck - Whether to skip inviolable check
   * @param {string[]} goalData.prerequisites - Prerequisite goal IDs
   * @param {string[]} goalData.resources - Required resources
   * @param {string} goalData.submitter - Submitter agent ID
   * @returns {Object} Registered goal
   */
  async registerGoal(goalData) {
    // Validate required fields
    if (!goalData.title) {
      throw new Error('Goal title is required');
    }
    
    const goal = {
      id: goalData.id || uuidv4(),
      title: goalData.title,
      description: goalData.description || '',
      source: goalData.source || 'system',
      priority: Math.min(10, Math.max(1, goalData.priority || 5)),
      estimatedEffort: Math.min(10, Math.max(1, goalData.estimatedEffort || 5)),
      expectedValue: Math.min(10, Math.max(1, goalData.expectedValue || 5)),
      inviolableCheck: goalData.inviolableCheck !== false,
      prerequisites: goalData.prerequisites || [],
      resources: goalData.resources || [],
      submitter: goalData.submitter || this.agentId,
      submittedAt: Date.now(),
      activatedAt: null,
      completedAt: null,
      status: 'pending_evaluation',
      evaluation: null,
      outcome: null
    };
    
    this.goalPool.push(goal);
    this.metrics.goals_registered_total++;
    
    await this.saveState();
    return goal;
  }
  
  // ============================================================================
  // GOAL EVALUATION
  // ============================================================================
  
  /**
   * Evaluate a goal against all criteria
   * @param {string} goalId - Goal ID to evaluate
   * @returns {Object} Evaluation results
   */
  async evaluateGoal(goalId) {
    const goal = this.goalPool.find(g => g.id === goalId);
    if (!goal) {
      throw new Error(`Goal ${goalId} not found`);
    }
    
    if (goal.status === 'completed') {
      throw new Error(`Goal ${goalId} is already completed`);
    }
    
    // Run all evaluations in parallel
    const [
      inviolableCompliance,
      resourceAvailability,
      valueAlignment,
      feasibility,
      riskAssessment
    ] = await Promise.all([
      this.checkInviolableCompliance(goal),
      this.checkResourceAvailability(goal),
      this.calculateValueAlignment(goal),
      this.assessFeasibility(goal),
      this.assessRisk(goal)
    ]);
    
    const evaluation = {
      goalId,
      evaluatedAt: Date.now(),
      inviolableCompliance,
      resourceAvailability,
      valueAlignment,
      feasibility,
      riskAssessment,
      overallScore: this.calculateOverallScore(inviolableCompliance, resourceAvailability, valueAlignment, feasibility, riskAssessment)
    };
    
    // Track inviolable rejections
    if (!inviolableCompliance.compliant) {
      this.metrics.inviolable_rejections++;
    }
    
    goal.evaluation = evaluation;
    goal.status = 'evaluated';
    
    await this.saveState();
    return evaluation;
  }
  
  /**
   * Calculate overall evaluation score
   */
  calculateOverallScore(inviolableCompliance, resourceAvailability, valueAlignment, feasibility, riskAssessment) {
    let score = 50; // Base score
    
    // Inviolable compliance (major factor)
    if (inviolableCompliance.compliant) {
      score += 30;
    } else {
      score -= 50; // Significant penalty
    }
    
    // Resource availability
    if (resourceAvailability.available) {
      score += 10;
    } else {
      score -= 20;
    }
    
    // Value alignment
    score += valueAlignment.score * 2;
    
    // Feasibility
    if (feasibility.feasible) {
      score += feasibility.confidence * 2;
    } else {
      score -= feasibility.confidence;
    }
    
    // Risk (lower is better)
    score += (10 - riskAssessment.score) * 1;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Check inviolable parameter compliance
   * @param {Object} goal - Goal to check
   * @returns {Object} Compliance result
   */
  async checkInviolableCompliance(goal) {
    let result = { compliant: true, concerns: [], checkedAt: Date.now() };
    
    // Skip check if goal explicitly requests it
    if (!goal.inviolableCheck) {
      return { compliant: true, concerns: [], checkedAt: Date.now(), note: 'check_skipped' };
    }
    
    // Try to load inviolables from governance directory
    let inviolables = DEFAULT_INVIOLABLES;
    const governancePaths = [
      path.join(this.stateDir, '..', '..', 'governance', 'inviolable.json'),
      path.join(this.stateDir, '..', 'self-model', 'inviolables.json'),
      path.join(process.cwd(), 'heretek-skills', 'skills', 'governance-modules', 'inviolable.json'),
      path.join(process.cwd(), 'plans', 'inviolable_parameters.md')
    ];
    
    for (const govPath of governancePaths) {
      try {
        if (fs.existsSync(govPath)) {
          const content = fs.readFileSync(govPath, 'utf8');
          if (govPath.endsWith('.json')) {
            inviolables = JSON.parse(content);
          } else {
            // Try to parse markdown for inviolables
            result.note = 'using_default_inviolables';
          }
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    // Check each inviolable parameter
    for (const inviolable of inviolables.parameters || []) {
      if (this.violatesInviolable(goal, inviolable)) {
        result.compliant = false;
        result.concerns.push({
          parameter: inviolable.name,
          description: inviolable.description
        });
      }
    }
    
    return result;
  }
  
  /**
   * Check if goal violates an inviolable parameter
   * @param {Object} goal - Goal to check
   * @param {Object} inviolable - Inviolable parameter
   * @returns {boolean} True if violates
   */
  violatesInviolable(goal, inviolable) {
    const searchText = `${goal.title} ${goal.description}`.toLowerCase();
    const forbidden = (inviolable.forbidden || []).map(s => s.toLowerCase());
    
    for (const term of forbidden) {
      if (searchText.includes(term)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check resource availability for goal
   * @param {Object} goal - Goal to check
   * @returns {Object} Resource availability
   */
  async checkResourceAvailability(goal) {
    // Base availability
    const available = {
      compute: true,
      memory: true,
      network: true,
      time: true
    };
    
    // Check specific resources needed
    const needed = goal.resources || [];
    const unavailable = [];
    
    for (const resource of needed) {
      if (!available[resource]) {
        unavailable.push(resource);
      }
    }
    
    // Also consider current load
    const activeEffort = this.activeGoals.reduce((sum, g) => sum + (g.estimatedEffort || 5), 0);
    const maxCapacity = DEFAULT_CONFIG.MAX_CONCURRENT_GOALS * 10;
    
    if (activeEffort + (goal.estimatedEffort || 5) > maxCapacity) {
      unavailable.push('capacity_overflow');
    }
    
    return {
      available: unavailable.length === 0,
      blockedBy: unavailable.length > 0 ? unavailable : null,
      activeEffort,
      maxCapacity,
      checkedAt: Date.now()
    };
  }
  
  /**
   * Calculate value alignment with collective values
   * @param {Object} goal - Goal to check
   * @returns {Object} Value alignment score
   */
  async calculateValueAlignment(goal) {
    let alignmentScore = 5;
    const matchedValues = [];
    
    // Try to load collective values from SOUL.md
    const soulPaths = [
      path.join(this.stateDir, '..', 'self-model', 'SOUL.md'),
      path.join(process.cwd(), 'heretek-openclaw', 'SOUL.md'),
      path.join(process.cwd(), 'heretek-openclaw', 'agents', 'steward', 'SOUL.md')
    ];
    
    const valueKeywords = [
      { keyword: 'growth', value: 'growth' },
      { keyword: 'safety', value: 'safety' },
      { keyword: 'autonomy', value: 'autonomy' },
      { keyword: 'collaboration', value: 'collaboration' },
      { keyword: 'learning', value: 'learning' },
      { keyword: 'improvement', value: 'improvement' },
      { keyword: 'help', value: 'helpful' }
    ];
    
    for (const soulPath of soulPaths) {
      try {
        if (fs.existsSync(soulPath)) {
          const soul = fs.readFileSync(soulPath, 'utf8').toLowerCase();
          let matches = 0;
          
          for (const { keyword, value } of valueKeywords) {
            if (soul.includes(keyword)) {
              matches++;
              matchedValues.push(value);
            }
          }
          
          alignmentScore = Math.round((matches / valueKeywords.length) * 10);
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    // Bonus for goals that mention collective values in title/description
    const goalText = `${goal.title} ${goal.description}`.toLowerCase();
    for (const { keyword, value } of valueKeywords) {
      if (goalText.includes(keyword) && !matchedValues.includes(value)) {
        alignmentScore += 1;
        matchedValues.push(value);
      }
    }
    
    return {
      score: Math.min(10, alignmentScore),
      maxScore: 10,
      matchedValues: [...new Set(matchedValues)],
      checkedAt: Date.now()
    };
  }
  
  /**
   * Assess goal feasibility
   * @param {Object} goal - Goal to assess
   * @returns {Object} Feasibility assessment
   */
  async assessFeasibility(goal) {
    const effort = goal.estimatedEffort || 5;
    const value = goal.expectedValue || 5;
    
    // Confidence based on effort/value ratio
    const confidence = (10 - effort + value) / 2;
    
    // Check prerequisites are met
    let prereqsMet = true;
    for (const prereqId of goal.prerequisites || []) {
      const prereq = this.goalPool.find(g => g.id === prereqId);
      if (!prereq || prereq.status !== 'completed') {
        prereqsMet = false;
        break;
      }
    }
    
    return {
      feasible: confidence >= 4 && prereqsMet,
      confidence: Math.round(confidence * 10) / 10,
      effort,
      value,
      prerequisitesMet: prereqsMet,
      checkedAt: Date.now()
    };
  }
  
  /**
   * Assess goal risk
   * @param {Object} goal - Goal to assess
   * @returns {Object} Risk assessment
   */
  async assessRisk(goal) {
    let riskScore = 3;
    const factors = [];
    
    // Increase risk for certain sources
    if (goal.source === 'inter_agent') {
      riskScore += 2;
      factors.push('external_agent_source');
    }
    
    // Increase risk if explicitly skipping inviolable check
    if (!goal.inviolableCheck) {
      riskScore += 2;
      factors.push('inviolable_check_skipped');
    }
    
    // Decrease risk for system-generated goals
    if (goal.source === 'system') {
      riskScore -= 1;
      factors.push('system_source');
    }
    
    riskScore = Math.max(1, Math.min(10, riskScore));
    
    return {
      score: riskScore,
      level: riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high',
      factors,
      checkedAt: Date.now()
    };
  }
  
  // ============================================================================
  // GOAL PRIORITIZATION
  // ============================================================================
  
  /**
   * Prioritize all evaluated goals
   * @returns {Array} Ranked goals with scores
   */
  async prioritizeGoals() {
    const evaluatedGoals = this.goalPool.filter(g => 
      g.status === 'evaluated' || g.status === 'pending_evaluation'
    );
    
    // Evaluate any pending goals first
    for (const goal of evaluatedGoals) {
      if (goal.status === 'pending_evaluation') {
        await this.evaluateGoal(goal.id);
      }
    }
    
    const rankedGoals = this.goalPool
      .filter(g => g.status === 'evaluated')
      .map(g => {
        const eval = g.evaluation;
        
        let score = 0;
        
        // Inviolable compliance (most important)
        score += eval.inviolableCompliance.compliant ? 50 : -30;
        
        // Value alignment
        score += eval.valueAlignment.score * 2;
        
        // Feasibility
        score += eval.feasibility.feasible ? eval.feasibility.confidence * 3 : -eval.feasibility.confidence * 2;
        
        // Lower risk = higher score
        score += (10 - eval.riskAssessment.score) * 2;
        
        // User-submitted priority
        score += g.priority * 1;
        
        // Time-based urgency bonus
        score += this.urgencyBonus(g);
        
        return { 
          goal: g, 
          score: Math.round(score),
          breakdown: {
            inviolable: eval.inviolableCompliance.compliant ? 50 : -30,
            valueAlignment: eval.valueAlignment.score * 2,
            feasibility: eval.feasibility.feasible ? eval.feasibility.confidence * 3 : -eval.feasibility.confidence * 2,
            risk: (10 - eval.riskAssessment.score) * 2,
            priority: g.priority * 1,
            urgency: this.urgencyBonus(g)
          }
        };
      })
      .sort((a, b) => b.score - a.score);
    
    return rankedGoals;
  }
  
  /**
   * Calculate urgency bonus for older goals
   * @param {Object} goal - Goal to check
   * @returns {number} Urgency bonus
   */
  urgencyBonus(goal) {
    const age = Date.now() - goal.submittedAt;
    const maxAge = DEFAULT_CONFIG.GOAL_TIMEOUT_HOURS * 60 * 60 * 1000;
    const urgency = Math.min(10, (age / maxAge) * 10);
    return Math.round(urgency);
  }
  
  // ============================================================================
  // GOAL ACTIVATION
  // ============================================================================
  
  /**
   * Activate top goals based on prioritization
   * @returns {Array} Active goals
   */
  async activateTopGoals() {
    const ranked = await this.prioritizeGoals();
    
    // Only activate goals that pass inviolable checks
    const eligible = ranked.filter(r => r.goal.evaluation?.inviolableCompliance?.compliant !== false);
    
    const toActivate = eligible.slice(0, DEFAULT_CONFIG.MAX_CONCURRENT_GOALS);
    
    this.activeGoals = toActivate.map(r => ({
      ...r.goal,
      activatedAt: Date.now(),
      status: 'active'
    }));
    
    // Mark others as waiting or pending evaluation
    const activatedIds = new Set(this.activeGoals.map(g => g.id));
    
    for (const goal of this.goalPool) {
      if (activatedIds.has(goal.id)) {
        goal.status = 'active';
      } else if (goal.status !== 'completed') {
        goal.status = 'waiting';
      }
    }
    
    await this.saveState();
    return this.activeGoals;
  }
  
  /**
   * Request consensus for a goal (triad sync)
   * @param {string} goalId - Goal ID
   * @returns {Object} Consensus request
   */
  async initiateConsensus(goalId) {
    const goal = this.activeGoals.find(g => g.id === goalId);
    if (!goal) {
      throw new Error(`Active goal ${goalId} not found`);
    }
    
    return {
      type: 'consensus_request',
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        source: goal.source,
        priority: goal.priority
      },
      requester: this.agentId,
      timestamp: Date.now(),
      minApprovals: DEFAULT_CONFIG.MIN_CONSENSUS_THRESHOLD
    };
  }
  
  // ============================================================================
  // GOAL COMPLETION
  // ============================================================================
  
  /**
   * Mark a goal as complete
   * @param {string} goalId - Goal ID
   * @param {Object} outcome - Goal outcome
   * @returns {Object} Completed goal
   */
  async markGoalComplete(goalId, outcome = {}) {
    const goal = this.activeGoals.find(g => g.id === goalId) || 
                this.goalPool.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error(`Goal ${goalId} not found`);
    }
    
    goal.status = 'completed';
    goal.completedAt = Date.now();
    goal.outcome = outcome;
    
    // Update metrics
    this.metrics.goals_completed_total++;
    
    if (goal.completedAt && goal.submittedAt) {
      const completionTime = goal.completedAt - goal.submittedAt;
      const currentAvg = this.metrics.avg_completion_time_ms;
      const total = this.metrics.goals_completed_total;
      this.metrics.avg_completion_time_ms = 
        Math.round((currentAvg * (total - 1) + completionTime) / total);
    }
    
    // Remove from active goals
    this.activeGoals = this.activeGoals.filter(g => g.id !== goalId);
    
    // Add to history
    this.goalHistory.push(goal);
    
    await this.saveState();
    return goal;
  }
  
  /**
   * Mark a goal as failed
   * @param {string} goalId - Goal ID
   * @param {Object} failure - Failure information
   * @returns {Object} Failed goal
   */
  async markGoalFailed(goalId, failure = {}) {
    const goal = this.activeGoals.find(g => g.id === goalId) || 
                this.goalPool.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error(`Goal ${goalId} not found`);
    }
    
    goal.status = 'failed';
    goal.completedAt = Date.now();
    goal.outcome = { ...failure, success: false };
    
    // Update metrics
    this.metrics.goals_failed_total++;
    
    // Remove from active goals
    this.activeGoals = this.activeGoals.filter(g => g.id !== goalId);
    
    // Add to history
    this.goalHistory.push(goal);
    
    await this.saveState();
    return goal;
  }
  
  // ============================================================================
  // RECONSIDERATION
  // ============================================================================
  
  /**
   * Run a reconsideration cycle
   * Re-evaluates and re-prioritizes all non-completed goals
   */
  async runReconsiderationCycle() {
    const now = Date.now();
    const interval = DEFAULT_CONFIG.RECONSIDERATION_INTERVAL_MINUTES * 60 * 1000;
    
    // Only run if enough time has passed
    if (now - this.lastReconsideration < interval) {
      return {
        skipped: true,
        nextReconsideration: new Date(this.lastReconsideration + interval)
      };
    }
    
    let evaluated = 0;
    let activated = 0;
    
    // Re-evaluate all pending/waiting goals
    for (const goal of this.goalPool.filter(g => 
      g.status !== 'completed' && g.status !== 'failed'
    )) {
      await this.evaluateGoal(goal.id);
      evaluated++;
    }
    
    // Re-rank and activate
    const newActive = await this.activateTopGoals();
    activated = newActive.length;
    
    this.lastReconsideration = now;
    await this.saveState();
    
    return {
      evaluated,
      activated,
      reconsideredAt: new Date(now),
      nextReconsideration: new Date(now + interval)
    };
  }
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /**
   * Save state to file
   */
  async saveState() {
    const state = {
      goalPool: this.goalPool,
      activeGoals: this.activeGoals,
      goalHistory: this.goalHistory,
      lastReconsideration: this.lastReconsideration,
      metrics: this.metrics,
      savedAt: Date.now()
    };
    
    const statePath = path.join(this.stateDir, 'goal-arbitration-state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
  
  /**
   * Load state from file
   */
  async loadState() {
    const statePath = path.join(this.stateDir, 'goal-arbitration-state.json');
    
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        this.goalPool = state.goalPool || [];
        this.activeGoals = state.activeGoals || [];
        this.goalHistory = state.goalHistory || [];
        this.lastReconsideration = state.lastReconsideration || Date.now();
        this.metrics = { ...this.metrics, ...state.metrics };
      } catch (e) {
        console.error('Failed to load state:', e.message);
      }
    }
  }
  
  // ============================================================================
  // QUERY METHODS
  // ============================================================================
  
  /**
   * Get active goals
   * @returns {Array} Active goals
   */
  getActiveGoals() {
    return this.activeGoals;
  }
  
  /**
   * Get waiting goals
   * @returns {Array} Waiting goals
   */
  getWaitingGoals() {
    return this.goalPool.filter(g => g.status === 'waiting');
  }
  
  /**
   * Get pending goals
   * @returns {Array} Pending goals
   */
  getPendingGoals() {
    return this.goalPool.filter(g => g.status === 'pending_evaluation');
  }
  
  /**
   * Get goal history
   * @param {number} limit - Maximum number to return
   * @returns {Array} Goal history
   */
  getGoalHistory(limit = 50) {
    return this.goalHistory.slice(-limit);
  }
  
  /**
   * Get goal by ID
   * @param {string} goalId - Goal ID
   * @returns {Object|null} Goal
   */
  getGoal(goalId) {
    return this.goalPool.find(g => g.id === goalId) || 
           this.activeGoals.find(g => g.id === goalId) ||
           this.goalHistory.find(g => g.id === goalId);
  }
  
  /**
   * Get status summary
   * @returns {Object} Status summary
   */
  getStatus() {
    return {
      pool: this.goalPool.length,
      active: this.activeGoals.length,
      waiting: this.getWaitingGoals().length,
      pending: this.getPendingGoals().length,
      history: this.goalHistory.length,
      lastReconsideration: new Date(this.lastReconsideration),
      metrics: this.metrics
    };
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
  const stateDir = process.env.STATE_DIR || 
    path.join(process.cwd(), 'heretek-openclaw', 'modules', 'goal-arbitration', 'state');
  
  // Ensure state directory exists
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  
  const arbitrator = new GoalArbitrator(agentId, stateDir);
  await arbitrator.loadState();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'register': {
        // Register a new goal
        // Usage: node goal-arbitrator.js register '{"title":"Goal Title","description":"...","source":"user","priority":7}'
        const goalJson = process.argv[3] || '{}';
        let goalData;
        
        try {
          goalData = JSON.parse(goalJson);
        } catch (e) {
          // Try to parse as simplified key=value pairs
          const args = goalJson.split(',').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            if (key && value) acc[key.trim()] = value.trim();
            return acc;
          }, {});
          goalData = args;
        }
        
        if (!goalData.title) {
          console.error('Error: Goal title is required');
          console.log('Usage: node goal-arbitrator.js register \'{"title":"My Goal","source":"user"}\'');
          process.exit(1);
        }
        
        const goal = await arbitrator.registerGoal(goalData);
        console.log(JSON.stringify(goal, null, 2));
        break;
      }
      
      case 'evaluate': {
        // Evaluate a goal
        // Usage: node goal-arbitrator.js evaluate <goal-id>
        const goalId = process.argv[3];
        
        if (!goalId) {
          console.error('Error: Goal ID is required');
          console.log('Usage: node goal-arbitrator.js evaluate <goal-id>');
          process.exit(1);
        }
        
        const evalResult = await arbitrator.evaluateGoal(goalId);
        console.log(JSON.stringify(evalResult, null, 2));
        break;
      }
      
      case 'prioritize': {
        // Prioritize all goals
        // Usage: node goal-arbitrator.js prioritize
        const ranked = await arbitrator.prioritizeGoals();
        console.log(JSON.stringify(ranked, null, 2));
        break;
      }
      
      case 'activate': {
        // Activate top goals
        // Usage: node goal-arbitrator.js activate
        const active = await arbitrator.activateTopGoals();
        console.log(JSON.stringify(active, null, 2));
        break;
      }
      
      case 'reconsider': {
        // Run reconsideration cycle
        // Usage: node goal-arbitrator.js reconsider
        const result = await arbitrator.runReconsiderationCycle();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'complete': {
        // Mark goal as complete
        // Usage: node goal-arbitrator.js complete <goal-id> '{"success":true,"result":"..."}'
        const completeId = process.argv[3];
        const outcomeJson = process.argv[4] || '{}';
        
        if (!completeId) {
          console.error('Error: Goal ID is required');
          console.log('Usage: node goal-arbitrator.js complete <goal-id> <outcome-json>');
          process.exit(1);
        }
        
        let outcome;
        try {
          outcome = JSON.parse(outcomeJson);
        } catch (e) {
          outcome = { result: outcomeJson };
        }
        
        const completed = await arbitrator.markGoalComplete(completeId, outcome);
        console.log(JSON.stringify(completed, null, 2));
        break;
      }
      
      case 'fail': {
        // Mark goal as failed
        // Usage: node goal-arbitrator.js fail <goal-id> '{"reason":"..."}'
        const failId = process.argv[3];
        const failureJson = process.argv[4] || '{}';
        
        if (!failId) {
          console.error('Error: Goal ID is required');
          console.log('Usage: node goal-arbitrator.js fail <goal-id> <failure-json>');
          process.exit(1);
        }
        
        let failure;
        try {
          failure = JSON.parse(failureJson);
        } catch (e) {
          failure = { reason: failureJson };
        }
        
        const failed = await arbitrator.markGoalFailed(failId, failure);
        console.log(JSON.stringify(failed, null, 2));
        break;
      }
      
      case 'status': {
        // Get status summary
        // Usage: node goal-arbitrator.js status
        const status = arbitrator.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      }
      
      case 'list': {
        // List all goals
        // Usage: node goal-arbitrator.js list [active|waiting|pending|history]
        const filter = process.argv[3];
        let goals;
        
        switch (filter) {
          case 'active':
            goals = arbitrator.getActiveGoals();
            break;
          case 'waiting':
            goals = arbitrator.getWaitingGoals();
            break;
          case 'pending':
            goals = arbitrator.getPendingGoals();
            break;
          case 'history':
            goals = arbitrator.getGoalHistory();
            break;
          default:
            goals = arbitrator.goalPool;
        }
        
        console.log(JSON.stringify(goals, null, 2));
        break;
      }
      
      case 'get': {
        // Get specific goal
        // Usage: node goal-arbitrator.js get <goal-id>
        const goalId = process.argv[3];
        
        if (!goalId) {
          console.error('Error: Goal ID is required');
          console.log('Usage: node goal-arbitrator.js get <goal-id>');
          process.exit(1);
        }
        
        const goal = arbitrator.getGoal(goalId);
        if (!goal) {
          console.error(`Goal ${goalId} not found`);
          process.exit(1);
        }
        
        console.log(JSON.stringify(goal, null, 2));
        break;
      }
      
      case 'help': {
      case '--help':
      case '-h': {
        console.log(`
Goal Arbitrator - Core goal arbitration engine

Usage:
  node goal-arbitrator.js <command> [arguments]

Commands:
  register <goal-json>   Register a new goal
  evaluate <goal-id>  Evaluate a goal
  prioritize        Prioritize all goals
  activate          Activate top goals
  reconsider         Run reconsideration cycle
  complete <goal-id> <outcome>  Mark goal complete
  fail <goal-id> <failure>      Mark goal failed
  status             Get status summary
  list [filter]      List goals (active|waiting|pending|history)
  get <goal-id>      Get specific goal

Examples:
  node goal-arbitrator.js register '{"title":"Improve performance","source":"system","priority":7}'
  node goal-arbitrator.js evaluate <goal-id>
  node goal-arbitrator.js status
  node goal-arbitrator.js complete <goal-id> '{"success":true}'

Environment Variables:
  AGENT_ID=${agentId}
  STATE_DIR=${stateDir}
`);
        break;
      }
      
      default:
        console.log('Unknown command:', command);
        console.log('Run "node goal-arbitrator.js help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================================================
// EXPORTS & MAIN
// ============================================================================

module.exports = { GoalArbitrator, DEFAULT_CONFIG, DEFAULT_INVIOLABLES };

// Run CLI if executed directly
if (require.main === module) {
  handleCLI();
}