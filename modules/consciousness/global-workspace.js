#!/usr/bin/env node
/**
 * Global Workspace Module
 * 
 * Implements Global Workspace Theory (GWT) by Bernard Baars.
 * Provides a central broadcast mechanism where specialized modules
 * compete for attention and winners are broadcast collective-wide.
 * 
 * Key concepts:
 * - Competition: Modules bid for workspace access
 * - Ignition: Threshold for content to become "conscious"
 * - Broadcast: Winners distributed to all modules
 */

const fs = require('fs');
const path = require('path');

class GlobalWorkspace {
  constructor(config = {}) {
    this.config = {
      ignitionThreshold: config.ignitionThreshold || 0.7,
      maxWorkspaceSize: config.maxWorkspaceSize || 7,
      competitionCycleMs: config.competitionCycleMs || 1000,
      broadcastHistorySize: config.broadcastHistorySize || 1000,
      ...config
    };
    
    // Current workspace contents (limited capacity)
    this.workspace = new Map();
    
    // Modules competing for access
    this.competitors = [];
    
    // History of broadcasts
    this.broadcastHistory = [];
    
    // Registered modules
    this.modules = new Map();
    
    // State
    this.isRunning = false;
    this.lastCompetition = null;
  }
  
  /**
   * Register a module that can compete for workspace access
   */
  registerModule(moduleId, callback) {
    this.modules.set(moduleId, {
      id: moduleId,
      callback,
      registered: Date.now()
    });
    return this;
  }
  
  /**
   * Submit content for competition
   * @param {string} moduleId - ID of the submitting module
   * @param {object} content - Content to compete with
   * @param {number} priority - Priority score (0-1)
   * @param {object} metadata - Additional metadata
   */
  submit(moduleId, content, priority = 0.5, metadata = {}) {
    const submission = {
      moduleId,
      content,
      priority: Math.min(1, Math.max(0, priority)),
      metadata,
      timestamp: Date.now(),
      id: `${moduleId}-${Date.now()}`
    };
    
    this.competitors.push(submission);
    return submission.id;
  }
  
  /**
   * Run competition cycle
   * Selects highest priority content above threshold for broadcast
   */
  compete() {
    if (this.competitors.length === 0) {
      return null;
    }
    
    // Sort by priority (descending)
    const sorted = [...this.competitors].sort((a, b) => b.priority - a.priority);
    
    // Find winner above ignition threshold
    const winner = sorted.find(c => c.priority >= this.config.ignitionThreshold);
    
    if (winner) {
      // Broadcast to all modules
      this.broadcast(winner);
    }
    
    // Clear competitors for next cycle
    this.competitors = [];
    this.lastCompetition = {
      timestamp: Date.now(),
      winner: winner || null,
      totalCompetitors: sorted.length
    };
    
    return winner;
  }
  
  /**
   * Broadcast winner to all registered modules
   */
  broadcast(winner) {
    // Add to workspace
    this.workspace.set(winner.moduleId, {
      content: winner.content,
      priority: winner.priority,
      broadcastAt: Date.now(),
      metadata: winner.metadata
    });
    
    // Enforce workspace size limit
    if (this.workspace.size > this.config.maxWorkspaceSize) {
      // Remove oldest entries
      const entries = [...this.workspace.entries()]
        .sort((a, b) => a[1].broadcastAt - b[1].broadcastAt);
      
      for (let i = 0; i < entries.length - this.config.maxWorkspaceSize; i++) {
        this.workspace.delete(entries[i][0]);
      }
    }
    
    // Record in history
    this.broadcastHistory.push({
      ...winner,
      broadcastAt: Date.now()
    });
    
    // Trim history
    if (this.broadcastHistory.length > this.config.broadcastHistorySize) {
      this.broadcastHistory = this.broadcastHistory.slice(-this.config.broadcastHistorySize);
    }
    
    // Notify all registered modules
    for (const [moduleId, module] of this.modules) {
      try {
        module.callback({
          type: 'broadcast',
          winner,
          workspace: this.getWorkspaceContents()
        });
      } catch (error) {
        console.error(`Error notifying module ${moduleId}:`, error.message);
      }
    }
    
    return true;
  }
  
  /**
   * Get current workspace contents
   */
  getWorkspaceContents() {
    const contents = {};
    for (const [moduleId, data] of this.workspace) {
      contents[moduleId] = data;
    }
    return contents;
  }
  
  /**
   * Get broadcast history
   */
  getHistory(limit = 100) {
    return this.broadcastHistory.slice(-limit);
  }
  
  /**
   * Get workspace statistics
   */
  getStats() {
    return {
      workspaceSize: this.workspace.size,
      maxWorkspaceSize: this.config.maxWorkspaceSize,
      competitorsPending: this.competitors.length,
      totalBroadcasts: this.broadcastHistory.length,
      lastCompetition: this.lastCompetition,
      ignitionThreshold: this.config.ignitionThreshold,
      registeredModules: this.modules.size
    };
  }
  
  /**
   * Start automatic competition cycles
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.interval = setInterval(() => {
      this.compete();
    }, this.config.competitionCycleMs);
    
    console.log(`Global Workspace started with ${this.config.competitionCycleMs}ms cycle`);
  }
  
  /**
   * Stop automatic competition
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('Global Workspace stopped');
  }
  
  /**
   * Save state to file
   */
  saveState(filepath) {
    const state = {
      workspace: this.getWorkspaceContents(),
      broadcastHistory: this.broadcastHistory.slice(-100),
      lastCompetition: this.lastCompetition,
      config: this.config,
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
    
    // Restore workspace
    this.workspace.clear();
    for (const [moduleId, data] of Object.entries(state.workspace || {})) {
      this.workspace.set(moduleId, data);
    }
    
    // Restore history
    this.broadcastHistory = state.broadcastHistory || [];
    this.lastCompetition = state.lastCompetition;
    
    return true;
  }
}

// Export
module.exports = GlobalWorkspace;

// CLI interface
if (require.main === module) {
  const gw = new GlobalWorkspace({
    ignitionThreshold: 0.7,
    maxWorkspaceSize: 7
  });
  
  // Demo: Register some modules
  gw.registerModule('steward', (msg) => console.log('Steward received:', msg.type));
  gw.registerModule('alpha', (msg) => console.log('Alpha received:', msg.type));
  gw.registerModule('dreamer', (msg) => console.log('Dreamer received:', msg.type));
  
  // Demo: Submit some content
  console.log('Submitting content...');
  gw.submit('steward', { thought: 'Need to coordinate agents' }, 0.8);
  gw.submit('alpha', { thought: 'Deliberating on task priority' }, 0.6);
  gw.submit('dreamer', { thought: 'Background synthesis of ideas' }, 0.75);
  
  // Run competition
  console.log('\nRunning competition...');
  const winner = gw.compete();
  console.log('Winner:', winner?.moduleId, 'Priority:', winner?.priority);
  
  // Show stats
  console.log('\nStats:', gw.getStats());
}
