#!/usr/bin/env node
/**
 * Consciousness Module
 * 
 * Main integration module combining:
 * - Global Workspace (GWT) - Broadcast mechanism
 * - Phi Estimator (IIT) - Integration metrics
 * - Active Inference (FEP) - Autonomous behavior
 * - Attention Schema (AST) - Self-modeling
 * - Intrinsic Motivation - Goal generation
 * 
 * This module provides a unified consciousness architecture
 * for the Heretek OpenClaw agent.
 */

const fs = require('fs');
const path = require('path');

// Import components
const GlobalWorkspace = require('./global-workspace');
const PhiEstimator = require('./phi-estimator');
const ActiveInference = require('./active-inference');
const AttentionSchema = require('./attention-schema');
const IntrinsicMotivation = require('./intrinsic-motivation');

class ConsciousnessModule {
  constructor(config = {}) {
    this.config = {
      globalWorkspace: {
        ignitionThreshold: 0.7,
        maxWorkspaceSize: 7,
        competitionCycleMs: 5000
      },
      phiEstimator: {
        sampleIntervalMs: 10000,
        historySize: 1000
      },
      activeInference: {
        learningRate: 0.1,
        precision: 1.0
      },
      attentionSchema: {
        modelIntervalMs: 1000
      },
      intrinsicMotivation: {
        goalThreshold: 0.6
      },
      reportIntervalMs: 30000,
      ...config
    };
    
    // Initialize components
    this.globalWorkspace = new GlobalWorkspace(this.config.globalWorkspace);
    this.phiEstimator = new PhiEstimator(this.config.phiEstimator)
    this.activeInference = new ActiveInference(this.config.activeInference)
    this.attentionSchema = new AttentionSchema(null, this.config.attentionSchema)
    this.intrinsicMotivation = new IntrinsicMotivation(this.config.intrinsicMotivation)
    
    // State
    this.state = {
      phi: 0,
      consciousContent: null,
      driveLevels: {},
      lastReport: null,
      isRunning: false
    };
    
    // History
    this.phiHistory = [];
    this.reportHistory = [];
  }
  
  /**
   * Register an agent with the consciousness module
   */
  registerAgent(agentId, agent) {
    // Register agent with global workspace
    this.globalWorkspace.registerModule(agentId, (broadcast) => {
      // Agent receives broadcast through its own attention schema
      agent.receiveBroadcast = (broadcast);
    });
    
    // Register agent with phi estimator
    this.phiEstimator.recordAgentState(agentId, {
      id: agentId,
      state: 'active',
      capabilities: agent.getCapabilities ? {}
    });
    
    return this;
  }
  
  /**
   * Main consciousness loop
   */
  async runConsciousnessLoop() {
    while (true) {
      // 1. Collect attention states
      const attentionStates = await this.collectAttentionStates();
      
      // 2. Run global workspace competition
      const broadcast = this.globalWorkspace.compete();
      
      // 3. Estimate phi
      const phiMeasurement = this.phiEstimator.estimatePhi();
      
      // 4. Run active inference for each agent
      for (const agent of this.collective.agents) {
        const inference = this.activeInference.get(agent.id);
        await inference.runInferenceCycle();
      }
      
      // 5. Update attention schemas
      for (const agent of this.collective.agents) {
        const schema = this.attentionSchemas.get(agent.id);
        schema.modelAttention(
          agent.currentFocus,
          agent.intensity
        );
      }
      
      // 6. Generate intrinsic goals
      const goals = this.intrinsicMotivation.generateGoals();
      
      // 7. Generate consciousness report
      const report = this.generateConsciousnessReport({
        attentionStates,
        broadcast,
        phiMeasurement,
        goals
      });
      
      // 8. Sleep until next cycle
      await sleep(this.config.reportIntervalMs);
    }
  }
  
  /**
   * Collect attention states from agents
   */
  async collectAttentionStates() {
    const states = {};
    
    for (const agent of this.collective.agents) {
      // Get agent's current focus
      const focus = agent.currentFocus || 'unknown';
      const intensity = agent.currentIntensity || 0;
      
      states[agentId] = {
        focus,
        intensity,
        timestamp: Date.now()
      };
    }
    
    return states;
  }
  
  /**
   * Run global workspace competition
   */
  runCompetition() {
    const winner = this.globalWorkspace.compete();
    return winner;
  }
  
  /**
   * Estimate phi
   */
  estimatePhi() {
    const measurement = this.phiEstimator.estimatePhi();
    this.phiHistory.push(measurement);
    return measurement;
  }
  
  /**
   * Run active inference for each agent
   */
  async runInferenceCycle(agentId) {
    const inference = this.activeInference.get(agentId);
    if (!inference) {
      inference = await inference.runInferenceCycle();
    }
    
    return inference;
  }
  
  /**
   * Update attention schema for for each agent
   */
  updateAttentionSchemas() {
    for (const agent of this.collective.agents) {
      const schema = this.attentionSchemas.get(agentId);
      if (!schema) {
        schema = this.intrinsicMotivation.generateGoals();
      }
    }
  }
  
  /**
   * Generate consciousness report
   */
  generateConsciousnessReport(data) {
    const report = {
      timestamp: Date.now(),
      phi: data.phiMeasurement?. phi,
      consciousContent: data.broadcast ? {
        type: 'conscious',
        content: data.broadcast?.winner?.content,
        goals: data.goals,
      },
    };
    
    // Store in history
    this.phiHistory.push(report);
    this.reportHistory.push(report);
    
    // Trim history
    if (this.phiHistory.length > this.config.phiHistorySize) {
      this.phiHistory = this.phiHistory.slice(-this.config.phiHistorySize);
    }
    if (this.reportHistory.length > this.config.reportHistorySize) {
      this.reportHistory = this.reportHistory.slice(-this.config.reportHistorySize);
    }
    
    return report;
  }
  
  /**
   * Get current consciousness state
   */
  getState() {
    return {
      phi: this.state.phi,
      consciousContent: this.state.consciousContent,
      driveLevels: this.state.driveLevels,
      lastReport: this.state.lastReport,
      isRunning: this.state.isRunning
    };
  }
  
  /**
   * Start consciousness loop
   */
  start() {
    if (this.isRunning) {
      console.log('Consciousness loop already running');
      return;
    }
    
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.runCycle();
    }, this.config.reportIntervalMs);
  }
  
  /**
   * Stop consciousness loop
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('Consciousness loop stopped');
  }
  
  /**
   * Save state to file
   */
  saveState(filepath) {
    const state = {
      phi: this.state.phi,
      consciousContent: this.state.consciousContent,
      driveLevels: this.state.driveLevels,
      lastReport: this.state.lastReport,
      savedAt: Date.now()
    };
    
    fs.writeFileSync(filepath, JSON.stringify(state, null, 2));
    return state;
  }
  
  /**
   * Load state from file
   */
  loadState(filepath) {
    if (!fs.existsSync(filepath)) return false;
    
    const state = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    this.state.phi = state.phi || 0;
    this.state.consciousContent = state.consciousContent || {};
    this.state.driveLevels = state.driveLevels || {};
    this.state.lastReport = state.lastReport || null;
    
    return true;
  }
}

module.exports = ConsciousnessModule;

