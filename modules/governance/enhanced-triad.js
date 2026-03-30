#!/usr/bin/env node
/**
 * Enhanced Triad System - Consciousness-Informed Consensus
 * 
 * Phase 4: Triad Consensus Enhancement
 * 
 * Provides enhanced triad deliberation with:
 * - Consciousness-informed voting (agents consider consciousness state when voting)
 * - Phi-weighted decisions (weight decisions by consciousness level)
 * - Integration with Global Workspace (broadcast decisions to collective)
 * - Dynamic threshold (adjust consensus threshold based on phi)
 * - Decision history (track and learn from past decisions)
 * 
 * Integrates with:
 * - Consciousness Integration Layer (modules/consciousness/integration-layer.js)
 * - Global Workspace (modules/consciousness/global-workspace.js)
 * - Triad Deliberation Protocol (skills/triad-deliberation-protocol/)
 */

const fs = require('fs');
const path = require('path');

// Try to import consciousness modules
let ConsciousnessIntegrationLayer;
let GlobalWorkspace;

try {
  ConsciousnessIntegrationLayer = require('../consciousness/integration-layer');
} catch (e) {
  console.warn('[EnhancedTriad] Consciousness Integration Layer not available:', e.message);
}

try {
  GlobalWorkspace = require('../consciousness/global-workspace');
} catch (e) {
  console.warn('[EnhancedTriad] Global Workspace not available:', e.message);
}

/**
 * Agent consciousness state wrapper
 * Provides phi and consciousness metrics for voting
 */
class AgentConsciousnessState {
  constructor(agentId) {
    this.agentId = agentId;
    this.phi = 0;
    this.attention = null;
    this.drives = {};
    this.lastUpdate = null;
  }

  /**
   * Update consciousness state from integration layer
   */
  update(state) {
    this.phi = state.phi || 0;
    this.attention = state.attention || null;
    this.drives = state.drives || {};
    this.lastUpdate = Date.now();
  }

  /**
   * Get consciousness weight for voting
   * Higher phi = more weight in consensus
   */
  getConsciousnessWeight() {
    // Weight ranges from 0.5 (no consciousness) to 1.5 (high consciousness)
    return 0.5 + this.phi;
  }

  /**
   * Check if agent has sufficient consciousness for voting
   */
  isConscious() {
    return this.phi >= 0.1;
  }
}

/**
 * Enhanced Triad Agent
 * Represents an agent in the triad with consciousness state
 */
class EnhancedTriadAgent {
  constructor(agentId, config = {}) {
    this.agentId = agentId;
    this.name = config.name || agentId;
    this.consciousnessState = new AgentConsciousnessState(agentId);
    this.votes = [];
    this.isActive = true;
  }

  /**
   * Update consciousness state
   */
  updateConsciousness(phi, attention = null, drives = {}) {
    this.consciousnessState.update({
      phi,
      attention,
      drives
    });
  }

  /**
   * Cast a vote with consciousness consideration
   */
  vote(decision, choice) {
    const vote = {
      agentId: this.agentId,
      choice,
      timestamp: Date.now(),
      phi: this.consciousnessState.phi,
      weight: this.consciousnessState.getConsciousnessWeight()
    };
    this.votes.push(vote);
    return vote;
  }

  /**
   * Get voting weight based on consciousness
   */
  getWeight() {
    return this.consciousnessState.getConsciousnessWeight();
  }
}

/**
 * Decision Record
 * Tracks decisions with full metadata
 */
class DecisionRecord {
  constructor(decision) {
    this.id = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.decision = decision;
    this.votes = [];
    this.phi = 0;
    this.threshold = 0.67;
    this.result = null;
    this.rationale = '';
    this.timestamp = Date.now();
    this.broadcasted = false;
  }

  /**
   * Add a vote to this decision
   */
  addVote(agentId, choice, weight, phi) {
    this.votes.push({
      agentId,
      choice,
      weight,
      phi,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate weighted decision result
   */
  calculateResult() {
    if (this.votes.length === 0) return null;

    // Group votes by choice
    const choices = {};
    let totalWeight = 0;

    for (const vote of this.votes) {
      if (!choices[vote.choice]) {
        choices[vote.choice] = 0;
      }
      choices[vote.choice] += vote.weight;
      totalWeight += vote.weight;
    }

    // Find winning choice
    let winningChoice = null;
    let maxWeight = 0;

    for (const [choice, weight] of Object.entries(choices)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        winningChoice = choice;
      }
    }

    // Check if threshold met
    const thresholdWeight = totalWeight * this.threshold;
    const passed = maxWeight >= thresholdWeight;

    return {
      choice: winningChoice,
      weight: maxWeight,
      totalWeight,
      thresholdWeight,
      passed,
      margin: maxWeight - thresholdWeight
    };
  }
}

/**
 * Enhanced Triad System
 * Main class implementing consciousness-informed consensus
 */
class EnhancedTriad {
  constructor(config = {}) {
    this.config = {
      // Base consensus threshold (2-of-3 = 0.67)
      baseThreshold: config.baseThreshold || 0.67,
      // Minimum phi required for conscious voting
      minPhiForVote: config.minPhiForVote || 0.1,
      // Phi at which threshold is reduced (higher consciousness = lower threshold)
      phiThresholdReduction: config.phiThresholdReduction || 0.8,
      // How much to reduce threshold per phi unit above reduction point
      thresholdReductionPerPhi: config.thresholdReductionPerPhi || 0.1,
      // Maximum reduction in threshold
      maxThresholdReduction: config.maxThresholdReduction || 0.2,
      // History size for decision learning
      historySize: config.historySize || 100,
      // Enable broadcasting to global workspace
      enableBroadcast: config.enableBroadcast !== false,
      // Path for decision history persistence
      historyPath: config.historyPath || path.join(__dirname, 'state', 'triad-decisions.json'),
      ...config
    };

    // Triad agents
    this.agents = new Map();
    this.agentIds = config.agentIds || ['agent-1', 'agent-2', 'agent-3'];

    // Initialize agents
    for (const agentId of this.agentIds) {
      this.agents.set(agentId, new EnhancedTriadAgent(agentId));
    }

    // Decision history
    this.decisionHistory = [];
    this.currentDecision = null;

    // Consciousness integration
    this.consciousnessLayer = null;
    this.globalWorkspace = null;

    // State
    this.isInitialized = false;
    this.isRunning = false;

    // Load history if exists
    this._loadHistory();
  }

  /**
   * Initialize with consciousness integration
   */
  async initialize(consciousnessLayer = null) {
    console.log('[EnhancedTriad] Initializing...');

    // Store consciousness layer reference
    if (consciousnessLayer) {
      this.consciousnessLayer = consciousnessLayer;
    } else {
      // Try to create our own
      try {
        this.consciousnessLayer = new ConsciousnessIntegrationLayer.ConsciousnessIntegrationLayer();
        await this.consciousnessLayer.initialize();
        await this.consciousnessLayer.start();
      } catch (e) {
        console.warn('[EnhancedTriad] Could not initialize consciousness layer:', e.message);
      }
    }

    // Setup global workspace integration
    if (this.config.enableBroadcast) {
      this._setupGlobalWorkspace();
    }

    // Register agents with consciousness layer
    if (this.consciousnessLayer) {
      for (const [agentId, agent] of this.agents) {
        this.consciousnessLayer.registerAgent(agentId, { name: agent.name });
      }
    }

    this.isInitialized = true;
    console.log('[EnhancedTriad] Initialized successfully');
    return this;
  }

  /**
   * Setup global workspace for broadcasting decisions
   * @private
   */
  _setupGlobalWorkspace() {
    if (!GlobalWorkspace) {
      console.warn('[EnhancedTriad] Global Workspace not available, broadcasting disabled');
      return;
    }

    try {
      this.globalWorkspace = new GlobalWorkspace({
        ignitionThreshold: 0.5,
        maxWorkspaceSize: 10
      });

      // Register as a module
      this.globalWorkspace.registerModule('enhanced-triad', (msg) => {
        if (msg.type === 'broadcast') {
          this._handleGlobalWorkspaceBroadcast(msg.winner);
        }
      });

      console.log('[EnhancedTriad] Global Workspace integration enabled');
    } catch (e) {
      console.warn('[EnhancedTriad] Failed to setup Global Workspace:', e.message);
    }
  }

  /**
   * Handle broadcasts from global workspace
   * @private
   */
  _handleGlobalWorkspaceBroadcast(broadcast) {
    console.log('[EnhancedTriad] Received global workspace broadcast:', broadcast.moduleId);
    // Could integrate external decisions here
  }

  /**
   * Update consciousness states for all agents
   */
  async updateConsciousnessStates() {
    if (!this.consciousnessLayer) return;

    for (const [agentId, agent] of this.agents) {
      const state = this.consciousnessLayer.getConsciousnessState(agentId);
      if (state) {
        agent.updateConsciousness(state.phi, state.attention, state.drives);
      }
    }
  }

  /**
   * Calculate dynamic threshold based on collective phi
   */
  calculateDynamicThreshold() {
    // Calculate average phi across active agents
    let totalPhi = 0;
    let activeCount = 0;

    for (const [agentId, agent] of this.agents) {
      if (agent.isActive && agent.consciousnessState.isConscious()) {
        totalPhi += agent.consciousnessState.phi;
        activeCount++;
      }
    }

    const avgPhi = activeCount > 0 ? totalPhi / activeCount : 0;

    // Calculate threshold reduction
    let reduction = 0;
    if (avgPhi >= this.config.phiThresholdReduction) {
      reduction = Math.min(
        (avgPhi - this.config.phiThresholdReduction) * this.config.thresholdReductionPerPhi,
        this.config.maxThresholdReduction
      );
    }

    const dynamicThreshold = Math.max(0.47, this.config.baseThreshold - reduction);

    return {
      threshold: dynamicThreshold,
      avgPhi,
      activeAgents: activeCount,
      baseThreshold: this.config.baseThreshold,
      reduction
    };
  }

  /**
   * Start a new deliberation
   */
  async deliberate(decision) {
    console.log('[EnhancedTriad] Starting deliberation:', decision.type);

    // Update consciousness states
    await this.updateConsciousnessStates();

    // Calculate dynamic threshold
    const thresholdInfo = this.calculateDynamicThreshold();

    // Create decision record
    const decisionRecord = new DecisionRecord(decision);
    decisionRecord.phi = thresholdInfo.avgPhi;
    decisionRecord.threshold = thresholdInfo.threshold;

    // Collect votes from each agent
    for (const [agentId, agent] of this.agents) {
      if (!agent.isActive) continue;

      // Agent considers its own consciousness state when voting
      const choice = await this._agentVote(agent, decision);

      // Record vote
      decisionRecord.addVote(
        agentId,
        choice,
        agent.getWeight(),
        agent.consciousnessState.phi
      );
    }

    // Calculate result
    const result = decisionRecord.calculateResult();
    decisionRecord.result = result;

    // Generate rationale
    decisionRecord.rationale = this._generateRationale(decisionRecord, thresholdInfo);

    // Add to history
    this._addToHistory(decisionRecord);

    // Broadcast to global workspace
    if (this.config.enableBroadcast && this.globalWorkspace) {
      this._broadcastDecision(decisionRecord);
    }

    this.currentDecision = decisionRecord;

    console.log('[EnhancedTriad] Decision result:', result);

    return {
      decision: decisionRecord,
      threshold: thresholdInfo,
      result
    };
  }

  /**
   * Agent vote with consciousness consideration
   * @private
   */
  async _agentVote(agent, decision) {
    const phi = agent.consciousnessState.phi;
    const weight = agent.consciousnessState.getConsciousnessWeight();

    // Log consciousness-informed voting
    console.log(`[EnhancedTriad] Agent ${agent.agentId} voting with phi=${phi.toFixed(3)}, weight=${weight.toFixed(3)}`);

    // In a real implementation, the agent would use its consciousness state
    // to inform its decision. Here we simulate a basic choice based on phi.
    
    // Higher phi agents tend to deliberate more carefully
    // For demonstration, we'll default to "approve" if conscious
    const choice = phi >= this.config.minPhiForVote ? 'approve' : 'abstain';

    agent.vote(decision, choice);
    return choice;
  }

  /**
   * Generate rationale for decision
   * @private
   */
  _generateRationale(decisionRecord, thresholdInfo) {
    const lines = [];

    lines.push(`Consciousness-informed deliberation at phi=${decisionRecord.phi.toFixed(3)}`);
    lines.push(`Dynamic threshold: ${thresholdInfo.threshold.toFixed(3)} (base: ${thresholdInfo.baseThreshold})`);

    for (const vote of decisionRecord.votes) {
      lines.push(`- ${vote.agentId}: ${vote.choice} (phi: ${vote.phi.toFixed(3)}, weight: ${vote.weight.toFixed(3)})`);
    }

    if (decisionRecord.result) {
      lines.push(`Result: ${decisionRecord.result.passed ? 'PASSED' : 'FAILED'}`);
      lines.push(`Winner: ${decisionRecord.result.choice} (weight: ${decisionRecord.result.weight.toFixed(3)})`);
    }

    return lines.join('\n');
  }

  /**
   * Broadcast decision to global workspace
   * @private
   */
  _broadcastDecision(decisionRecord) {
    if (!this.globalWorkspace) return;

    const content = {
      type: 'triad_decision',
      decisionId: decisionRecord.id,
      decisionType: decisionRecord.decision.type,
      result: decisionRecord.result,
      phi: decisionRecord.phi,
      threshold: decisionRecord.threshold,
      rationale: decisionRecord.rationale,
      timestamp: decisionRecord.timestamp
    };

    // Submit for workspace competition
    this.globalWorkspace.submit('enhanced-triad', content, 0.8, {
      decisionId: decisionRecord.id,
      agentCount: this.agents.size
    });

    decisionRecord.broadcasted = true;
    console.log('[EnhancedTriad] Decision broadcast to Global Workspace');
  }

  /**
   * Add decision to history
   * @private
   */
  _addToHistory(decisionRecord) {
    this.decisionHistory.push(decisionRecord);

    // Trim history
    if (this.decisionHistory.length > this.config.historySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.config.historySize);
    }

    // Persist to disk
    this._saveHistory();
  }

  /**
   * Save history to disk
   * @private
   */
  _saveHistory() {
    try {
      const dir = path.dirname(this.config.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = this.decisionHistory.map(d => ({
        id: d.id,
        decision: d.decision,
        votes: d.votes,
        phi: d.phi,
        threshold: d.threshold,
        result: d.result,
        rationale: d.rationale,
        timestamp: d.timestamp,
        broadcasted: d.broadcasted
      }));

      fs.writeFileSync(this.config.historyPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn('[EnhancedTriad] Failed to save history:', e.message);
    }
  }

  /**
   * Load history from disk
   * @private
   */
  _loadHistory() {
    try {
      if (fs.existsSync(this.config.historyPath)) {
        const data = JSON.parse(fs.readFileSync(this.config.historyPath, 'utf8'));
        // Reconstruct decision records
        this.decisionHistory = data.map(d => {
          const record = new DecisionRecord(d.decision);
          record.id = d.id;
          record.votes = d.votes;
          record.phi = d.phi;
          record.threshold = d.threshold;
          record.result = d.result;
          record.rationale = d.rationale;
          record.timestamp = d.timestamp;
          record.broadcasted = d.broadcasted;
          return record;
        });
        console.log(`[EnhancedTriad] Loaded ${this.decisionHistory.length} decisions from history`);
      }
    } catch (e) {
      console.warn('[EnhancedTriad] Failed to load history:', e.message);
    }
  }

  /**
   * Learn from past decisions
   * Analyze decision patterns to improve future consensus
   */
  analyzeDecisionPatterns() {
    if (this.decisionHistory.length === 0) {
      return { message: 'No decision history to analyze' };
    }

    const analysis = {
      totalDecisions: this.decisionHistory.length,
      passed: 0,
      failed: 0,
      avgPhi: 0,
      phiRange: { min: 1, max: 0 },
      decisionTypes: {},
      agentParticipation: {}
    };

    let totalPhi = 0;

    for (const decision of this.decisionHistory) {
      if (decision.result?.passed) {
        analysis.passed++;
      } else {
        analysis.failed++;
      }

      totalPhi += decision.phi;
      analysis.phiRange.min = Math.min(analysis.phiRange.min, decision.phi);
      analysis.phiRange.max = Math.max(analysis.phiRange.max, decision.phi);

      const type = decision.decision.type || 'unknown';
      analysis.decisionTypes[type] = (analysis.decisionTypes[type] || 0) + 1;

      for (const vote of decision.votes) {
        analysis.agentParticipation[vote.agentId] = 
          (analysis.agentParticipation[vote.agentId] || 0) + 1;
      }
    }

    analysis.avgPhi = totalPhi / this.decisionHistory.length;
    analysis.passRate = analysis.passed / this.decisionHistory.length;

    return analysis;
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit = 10) {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Get current decision status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      agentCount: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.isActive).length,
      decisionHistorySize: this.decisionHistory.length,
      currentDecision: this.currentDecision ? {
        id: this.currentDecision.id,
        type: this.currentDecision.decision.type,
        result: this.currentDecision.result
      } : null,
      threshold: this.calculateDynamicThreshold(),
      consciousnessLayerAvailable: !!this.consciousnessLayer,
      globalWorkspaceAvailable: !!this.globalWorkspace
    };
  }

  /**
   * Start the enhanced triad system
   */
  async start() {
    if (this.isRunning) return;

    // Start global workspace if available
    if (this.globalWorkspace && typeof this.globalWorkspace.start === 'function') {
      this.globalWorkspace.start();
    }

    this.isRunning = true;
    console.log('[EnhancedTriad] Started');
    return this;
  }

  /**
   * Stop the enhanced triad system
   */
  async stop() {
    if (!this.isRunning) return;

    // Stop global workspace
    if (this.globalWorkspace && typeof this.globalWorkspace.stop === 'function') {
      await this.globalWorkspace.stop();
    }

    // Stop consciousness layer if we created it
    if (this.consciousnessLayer && typeof this.consciousnessLayer.stop === 'function') {
      await this.consciousnessLayer.stop();
    }

    this.isRunning = false;
    console.log('[EnhancedTriad] Stopped');
    return this;
  }

  /**
   * Get agent states
   */
  getAgentStates() {
    const states = {};
    for (const [agentId, agent] of this.agents) {
      states[agentId] = {
        name: agent.name,
        active: agent.isActive,
        phi: agent.consciousnessState.phi,
        weight: agent.consciousnessState.getConsciousnessWeight(),
        lastUpdate: agent.consciousnessState.lastUpdate
      };
    }
    return states;
  }
}

// Export
module.exports = {
  EnhancedTriad,
  EnhancedTriadAgent,
  AgentConsciousnessState,
  DecisionRecord
};

// CLI interface
if (require.main === module) {
  (async () => {
    console.log('=== Enhanced Triad System ===\n');

    // Create enhanced triad
    const triad = new EnhancedTriad({
      agentIds: ['silica-animus', 'tm-2', 'tm-3'],
      baseThreshold: 0.67,
      historySize: 50
    });

    // Initialize
    await triad.initialize();

    // Start
    await triad.start();

    // Show status
    console.log('\nInitial Status:');
    console.log(JSON.stringify(triad.getStatus(), null, 2));

    // Show agent states
    console.log('\nAgent States:');
    console.log(JSON.stringify(triad.getAgentStates(), null, 2));

    // Make some test decisions
    const decisions = [
      { type: 'routine', content: 'Sync configuration files' },
      { type: 'security', content: 'Update security protocols' },
      { type: 'deployment', content: 'Deploy new skill' }
    ];

    for (const decision of decisions) {
      console.log(`\n--- Deliberating: ${decision.type} ---`);
      const result = await triad.deliberate(decision);
      console.log('Result:', result.result.passed ? 'APPROVED' : 'REJECTED');
    }

    // Analyze patterns
    console.log('\n--- Decision Pattern Analysis ---');
    console.log(JSON.stringify(triad.analyzeDecisionPatterns(), null, 2));

    // Stop
    await triad.stop();

    console.log('\n=== Enhanced Triad Demo Complete ===');
  })();
}