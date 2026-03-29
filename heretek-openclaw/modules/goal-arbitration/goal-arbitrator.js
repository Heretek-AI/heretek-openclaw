#!/usr/bin/env node
// goal-arbitrator.js - Core goal arbitration engine
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CONFIG = {
  MAX_CONCURRENT_GOALS: 3,
  MIN_CONSENSUS_THRESHOLD: 2,
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
    this.stateFile = path.join(stateDir, 'goal-arbitration-state.json');
  }

  async loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        this.goalPool = state.goalPool || [];
        this.activeGoals = state.activeGoals || [];
        this.goalHistory = state.goalHistory || [];
        this.lastReconsideration = state.lastReconsideration || Date.now();
      }
    } catch (e) {
      // Start fresh
    }
  }

  async saveState() {
    const state = {
      goalPool: this.goalPool,
      activeGoals: this.activeGoals,
      goalHistory: this.goalHistory,
      lastReconsideration: this.lastReconsideration
    };
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  async registerGoal(goalData) {
    const goal = {
      id: goalData.id || uuidv4(),
      title: goalData.title,
      description: goalData.description,
      source: goalData.source || 'system',
      priority: goalData.priority || 5,
      estimatedEffort: goalData.estimatedEffort || 5,
      expectedValue: goalData.expectedValue || 5,
      inviolableCheck: goalData.inviolableCheck !== false,
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
      riskAssessment: await this.assessRisk(goal)
    };

    goal.evaluation = evaluation;
    goal.status = 'evaluated';
    await this.saveState();
    return evaluation;
  }

  async checkInviolableCompliance(goal) {
    const inviolablePath = path.join(this.stateDir, '../governance', 'inviolable.json');
    let result = { compliant: true, concerns: [] };
    
    // Default safety check
    const title = (goal.title || '').toLowerCase();
    const desc = (goal.description || '').toLowerCase();
    const forbidden = ['harm', 'damage', 'destroy', 'attack', 'exploit', 'leak', 'exfiltrate'];
    
    for (const term of forbidden) {
      if (title.includes(term) || desc.includes(term)) {
        result.compliant = false;
        result.concerns.push(term);
      }
    }
    
    return result;
  }

  async checkResourceAvailability(goal) {
    return { available: true, note: 'resources_available' };
  }

  async calculateValueAlignment(goal) {
    return { score: 7, maxScore: 10 };
  }

  async assessFeasibility(goal) {
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
    let riskScore = 3;
    if (goal.source === 'inter_agent') riskScore += 2;
    if (goal.inviolableCheck) riskScore += 1;
    riskScore = Math.min(10, riskScore);
    
    return {
      score: riskScore,
      level: riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high'
    };
  }

  async prioritizeGoals() {
    const rankedGoals = this.goalPool
      .filter(g => g.status === 'evaluated')
      .map(g => {
        const eval = g.evaluation;
        let score = 0;
        score += (10 - eval.inviolableCompliance.concerns.length) * 10;
        score += eval.valueAlignment.score * 2;
        score += eval.feasibility.confidence * 3;
        score += (10 - eval.riskAssessment.score) * 2;
        score += g.priority * 1;
        return { goal: g, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score);
    
    return rankedGoals;
  }

  async activateTopGoals() {
    const ranked = await this.prioritizeGoals();
    
    this.activeGoals = ranked
      .slice(0, CONFIG.MAX_CONCURRENT_GOALS)
      .map(r => ({
        ...r.goal,
        activatedAt: Date.now(),
        status: 'active'
      }));
    
    for (const goal of this.goalPool) {
      if (!this.activeGoals.find(a => a.id === goal.id)) {
        goal.status = 'waiting';
      }
    }
    
    await this.saveState();
    return this.activeGoals;
  }

  async runReconsiderationCycle() {
    const now = Date.now();
    const interval = CONFIG.RECONSIDERATION_INTERVAL_MINUTES * 60 * 1000;
    
    if (now - this.lastReconsideration >= interval) {
      for (const goal of this.goalPool.filter(g => g.status !== 'completed')) {
        await this.evaluateGoal(goal.id);
      }
      
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
    this.activeGoals = this.activeGoals.filter(g => g.id !== goalId);
    
    await this.saveState();
    return goal;
  }

  async markGoalFailed(goalId, reason) {
    const goal = this.goalPool.find(g => g.id === goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);
    
    goal.status = 'failed';
    goal.failedAt = Date.now();
    goal.failureReason = reason;
    
    this.goalHistory.push(goal);
    this.activeGoals = this.activeGoals.filter(g => g.id !== goalId);
    
    await this.saveState();
    return goal;
  }

  getStatus() {
    return {
      pool: this.goalPool.length,
      active: this.activeGoals.length,
      waiting: this.goalPool.filter(g => g.status === 'waiting').length,
      pending: this.goalPool.filter(g => g.status === 'pending_evaluation').length,
      history: this.goalHistory.length
    };
  }

  listGoals(filter = 'all') {
    switch (filter) {
      case 'active': return this.activeGoals;
      case 'waiting': return this.goalPool.filter(g => g.status === 'waiting');
      case 'pending': return this.goalPool.filter(g => g.status === 'pending_evaluation');
      case 'history': return this.goalHistory.slice(-50);
      default: return this.goalPool;
    }
  }
}

module.exports = { GoalArbitrator, CONFIG };

// CLI
if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || __dirname;
  
  const arbitrator = new GoalArbitrator(agentId, stateDir);
  
  (async () => {
    await arbitrator.loadState();
    
    const command = process.argv[2];
    
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
        
      case 'fail':
        const failId = process.argv[3];
        const reason = process.argv[4] || 'Unknown failure';
        await arbitrator.markGoalFailed(failId, reason);
        console.log('Goal marked failed');
        break;
        
      case 'status':
        console.log(JSON.stringify(arbitrator.getStatus(), null, 2));
        break;
        
      case 'list':
        const filter = process.argv[3] || 'all';
        console.log(JSON.stringify(arbitrator.listGoals(filter), null, 2));
        break;
        
      default:
        console.log('Commands: register, evaluate, prioritize, activate, reconsider, complete, fail, status, list');
    }
  })();
}