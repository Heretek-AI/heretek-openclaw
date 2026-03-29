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
  constructor(config) {
    this.config = Object.assign({
      globalWorkspace: {
        ignitionThreshold: 0.7,
        maxWorkspaceSize: 7,
        competitionCycleMs: 5000
      },
      phiEstimator: {
        sampleIntervalMs: 10000
      },
      activeInference: {
        learningRate: 0.1
      },
      attentionSchema: {
        modelIntervalMs: 1000
      },
      intrinsicMotivation: {
        goalThreshold: 0.6
      },
      reportIntervalMs: 30000
    }, config || {});
    
    // Initialize components
    this.globalWorkspace = new GlobalWorkspace(this.config.globalWorkspace);
    this.phiEstimator = new PhiEstimator(this.config.phiEstimator);
    this.intrinsicMotivation = new IntrinsicMotivation(this.config.intrinsicMotivation);
    
    // Per-agent components
    this.activeInference = new Map();
    this.attentionSchemas = new Map();
    
    // Collective state
    this.collective = {
      agents: [],
      phi: 0,
      consciousContent: null
    };
    
    // Internal state
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
    this.interval = null;
  }
  
  /**
   * Register an agent with the consciousness module
   */
  registerAgent(agentId, agent) {
    var self = this;
    
    // Add to collective
    this.collective.agents.push({ id: agentId, agent: agent });
    
    // Register agent with global workspace
    this.globalWorkspace.registerModule(agentId, function(broadcast) {
      // Agent receives broadcast through its own attention schema
      if (agent.receiveBroadcast) {
        agent.receiveBroadcast(broadcast);
      }
    });
    
    // Create active inference for agent
    var agentInference = new ActiveInference(self.config.activeInference);
    this.activeInference.set(agentId, agentInference);
    
    // Create attention schema for agent
    var agentSchema = new AttentionSchema(agent, self.config.attentionSchema);
    this.attentionSchemas.set(agentId, agentSchema);
    
    // Register agent with phi estimator
    var capabilities = {};
    if (agent.getCapabilities) {
      capabilities = agent.getCapabilities();
    }
    this.phiEstimator.recordAgentState(agentId, {
      id: agentId,
      state: 'active',
      capabilities: capabilities
    });
    
    return this;
  }
  
  /**
   * Main consciousness loop
   */
  runConsciousnessLoop() {
    var self = this;
    
    // 1. Collect attention states
    var attentionStates = this.collectAttentionStates();
    
    // 2. Run global workspace competition
    var broadcast = this.globalWorkspace.compete();
    
    // 3. Estimate phi
    var phiMeasurement = this.phiEstimator.estimatePhi();
    this.phiHistory.push(phiMeasurement);
    
    // 4. Run active inference for each agent
    this.activeInference.forEach(function(inference, agentId) {
      inference.runInferenceCycle();
    });
    
    // 5. Update attention schemas
    this.attentionSchemas.forEach(function(schema, agentId) {
      var agentData = self.collective.agents.find(function(a) { return a.id === agentId; });
      if (agentData && agentData.agent) {
        var focus = agentData.agent.currentFocus || 'unknown';
        var intensity = agentData.agent.intensity || 0.5;
        schema.modelAttention(focus, intensity);
      }
    });
    
    // 6. Generate intrinsic goals
    var goals = this.intrinsicMotivation.generateGoals();
    
    // 7. Update state
    this.state.phi = phiMeasurement.phi;
    this.state.consciousContent = broadcast;
    this.state.driveLevels = this.intrinsicMotivation.getDriveLevels();
    
    // 8. Generate report
    var report = this.generateConsciousnessReport({
      broadcast: broadcast,
      phi: phiMeasurement,
      goals: goals
    });
    
    this.state.lastReport = report;
    this.reportHistory.push(report);
    
    return report;
  }
  
  /**
   * Collect attention states from all agents
   */
  collectAttentionStates() {
    var states = {};
    var self = this;
    
    this.collective.agents.forEach(function(agentData) {
      var agentId = agentData.id;
      var agent = agentData.agent;
      
      var focus = 'unknown';
      var intensity = 0.5;
      
      if (agent.currentFocus) {
        focus = agent.currentFocus;
      }
      if (agent.intensity) {
        intensity = agent.intensity;
      }
      
      states[agentId] = {
        focus: focus,
        intensity: intensity,
        timestamp: Date.now()
      };
    });
    
    return states;
  }
  
  /**
   * Run global workspace competition
   */
  runCompetition() {
    var winner = this.globalWorkspace.compete();
    return winner;
  }
  
  /**
   * Estimate phi
   */
  estimatePhi() {
    var measurement = this.phiEstimator.estimatePhi();
    this.phiHistory.push(measurement);
    return measurement;
  }
  
  /**
   * Run active inference for each agent
   */
  runInferenceCycle(agentId) {
    var inference = this.activeInference.get(agentId);
    if (inference) {
      return inference.runInferenceCycle();
    }
    return null;
  }
  
  /**
   * Update attention schemas for each agent
   */
  updateAttentionSchemas() {
    var self = this;
    
    this.collective.agents.forEach(function(agentData) {
      var agentId = agentData.id;
      var schema = self.attentionSchemas.get(agentId);
      
      if (schema) {
        var focus = agentData.agent.currentFocus || 'unknown';
        var intensity = agentData.agent.intensity || 0.5;
        schema.modelAttention(focus, intensity);
      }
    });
  }
  
  /**
   * Generate consciousness report
   */
  generateConsciousnessReport(data) {
    var report = {
      timestamp: Date.now(),
      phi: data.phi ? data.phi.phi : 0,
      broadcast: data.broadcast || null,
      consciousContent: data.broadcast ? {
        content: data.broadcast.content,
        winner: data.broadcast.winner,
        ignitionStrength: data.broadcast.ignitionStrength
      } : null,
      driveLevels: this.intrinsicMotivation.getDriveLevels(),
      goals: data.goals || [],
      agentCount: this.collective.agents.length,
      phiHistoryLength: this.phiHistory.length
    };
    
    return report;
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      phi: this.state.phi,
      consciousContent: this.state.consciousContent,
      driveLevels: this.state.driveLevels,
      lastReport: this.state.lastReport,
      isRunning: this.state.isRunning,
      agentCount: this.collective.agents.length
    };
  }
  
  /**
   * Start consciousness loop
   */
  start() {
    var self = this;
    
    if (this.isRunning) {
      console.log('Consciousness loop already running');
      return;
    }
    
    this.isRunning = true;
    
    this.interval = setInterval(function() {
      self.runConsciousnessLoop();
    }, this.config.reportIntervalMs);
    
    console.log('Consciousness loop started');
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
    var state = {
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
    
    var data = fs.readFileSync(filepath, 'utf8');
    var loadedState = JSON.parse(data);
    
    this.state.phi = loadedState.phi;
    this.state.consciousContent = loadedState.consciousContent;
    this.state.driveLevels = loadedState.driveLevels;
    this.state.lastReport = loadedState.lastReport;
    
    return true;
  }
}

module.exports = ConsciousnessModule;
