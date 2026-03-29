#!/usr/bin/env node
// self-model.js - Core self-modeling engine for collective awareness
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_STATE = {
  capabilities: {},
  knowledge: {},
  working_tasks: [],
  confidence_levels: {
    self_assessment: 0.7,
    capability_awareness: 0.8,
    decision_confidence: 0.6,
    prediction_confidence: 0.5
  },
  cognitive_state: {
    current_focus: null,
    attention_level: 0.8,
    processing_load: 0.3
  },
  suspected_blind_spots: [],
  metrics: {
    total_reflections: 0,
    capability_updates: 0,
    knowledge_updates: 0,
    blind_spots_identified: 0
  }
};

class SelfModel {
  constructor(agentId, stateDir) {
    this.agentId = agentId;
    this.stateDir = stateDir;
    this.state = { ...DEFAULT_STATE };
    this.stateFile = path.join(stateDir, 'self-model-state.json');
  }

  async loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load state:', e.message);
    }
  }

  async saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (e) {
      console.error('Failed to save state:', e.message);
    }
  }

  // Capability Management
  registerCapability(capability) {
    if (!this.state.capabilities[capability.id]) {
      this.state.capabilities[capability.id] = {
        name: capability.name,
        description: capability.description,
        confidence: capability.confidence || 0.5,
        last_used: null,
        success_count: 0,
        fail_count: 0,
        metadata: capability.metadata || {}
      };
      this.state.metrics.capability_updates++;
    }
    return this.state.capabilities[capability.id];
  }

  useCapability(capabilityId, success) {
    if (this.state.capabilities[capabilityId]) {
      const cap = this.state.capabilities[capabilityId];
      cap.last_used = new Date().toISOString();
      if (success) {
        cap.success_count++;
        cap.confidence = Math.min(1, cap.confidence + 0.05);
      } else {
        cap.fail_count++;
        cap.confidence = Math.max(0.1, cap.confidence - 0.1);
      }
      this.state.metrics.capability_updates++;
    }
    return this.state.capabilities[capabilityId];
  }

  getCapability(capabilityId) {
    return this.state.capabilities[capabilityId];
  }

  getAllCapabilities() {
    return Object.entries(this.state.capabilities).map(([id, cap]) => ({
      id,
      ...cap
    }));
  }

  // Knowledge Management
  learnFact(key, fact, source = 'inference', confidence = 0.5) {
    this.state.knowledge[key] = {
      fact,
      confidence,
      source,
      learned_at: new Date().toISOString()
    };
    this.state.metrics.knowledge_updates++;
    return this.state.knowledge[key];
  }

  getKnowledge(key) {
    return this.state.knowledge[key];
  }

  updateConfidence(key, newConfidence) {
    if (this.state.knowledge[key]) {
      this.state.knowledge[key].confidence = Math.max(0, Math.min(1, newConfidence));
      this.state.metrics.knowledge_updates++;
    }
    return this.state.knowledge[key];
  }

  // Task Management
  addTask(task) {
    this.state.working_tasks.push({
      id: uuidv4(),
      ...task,
      added_at: new Date().toISOString(),
      status: 'active'
    });
    return this.state.working_tasks[this.state.working_tasks.length - 1];
  }

  completeTask(taskId, outcome = {}) {
    const task = this.state.working_tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.completed_at = new Date().toISOString();
      task.outcome = outcome;
    }
    return task;
  }

  // Cognitive State
  updateFocus(focus) {
    this.state.cognitive_state.current_focus = focus;
  }

  updateAttention(level) {
    this.state.cognitive_state.attention_level = Math.max(0, Math.min(1, level));
  }

  updateProcessingLoad(load) {
    this.state.cognitive_state.processing_load = Math.max(0, Math.min(1, load));
  }

  // Blind Spot Detection
  addBlindSpot(area, description) {
    this.state.suspected_blind_spots.push({
      area,
      description,
      detected_at: new Date().toISOString()
    });
    this.state.metrics.blind_spots_identified++;
  }

  // Confidence Updates
  updateSelfAssessment(confidence) {
    this.state.confidence_levels.self_assessment = Math.max(0, Math.min(1, confidence));
  }

  updateCapabilityAwareness(confidence) {
    this.state.confidence_levels.capability_awareness = Math.max(0, Math.min(1, confidence));
  }

  // Reflection
  addReflection(type, content) {
    const reflection = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date().toISOString()
    };
    
    if (!this.state.reflections) this.state.reflections = [];
    this.state.reflections.push(reflection);
    this.state.metrics.total_reflections++;
    
    // Keep only last 100 reflections
    if (this.state.reflections.length > 100) {
      this.state.reflections = this.state.reflections.slice(-100);
    }
    
    return reflection;
  }

  // Getters
  getDashboard() {
    return {
      agent: this.agentId,
      capabilities: Object.keys(this.state.capabilities).length,
      knowledge_facts: Object.keys(this.state.knowledge).length,
      active_tasks: this.state.working_tasks.filter(t => t.status === 'active').length,
      confidence: this.state.confidence_levels,
      cognitive: this.state.cognitive_state,
      blind_spots: this.state.suspected_blind_spots.length,
      metrics: this.state.metrics
    };
  }

  getCapacity() {
    return {
      available: 1 - this.state.cognitive_state.processing_load,
      attention: this.state.cognitive_state.attention_level,
      tasks: this.state.working_tasks.filter(t => t.status === 'active').length
    };
  }
}

module.exports = { SelfModel, DEFAULT_STATE };

// CLI
if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || __dirname;
  
  const model = new SelfModel(agentId, stateDir);
  
  (async () => {
    await model.loadState();
    
    const command = process.argv[2];
    
    switch (command) {
      case 'register':
        const cap = JSON.parse(process.argv[3] || '{}');
        model.registerCapability(cap);
        await model.saveState();
        console.log('Capability registered');
        break;
        
      case 'use':
        const [capId, success] = [process.argv[3], process.argv[4] === 'true'];
        model.useCapability(capId, success);
        await model.saveState();
        console.log('Capability usage recorded');
        break;
        
      case 'learn':
        const [key, fact, source, conf] = [process.argv[3], process.argv[4], process.argv[5] || 'inference', parseFloat(process.argv[6] || '0.5')];
        model.learnFact(key, fact, source, conf);
        await model.saveState();
        console.log('Knowledge updated');
        break;
        
      case 'dashboard':
        console.log(JSON.stringify(model.getDashboard(), null, 2));
        break;
        
      case 'capacity':
        console.log(JSON.stringify(model.getCapacity(), null, 2));
        break;
        
      default:
        console.log('Commands: register, use, learn, dashboard, capacity');
    }
  })();
}