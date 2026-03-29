#!/usr/bin/env node
// reflection-engine.js - Periodic reflection on performance and growth
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const REFLECTION_TYPES = {
  capability: {
    triggers: ['skill_used', 'skill_failed', 'new_skill_discovered'],
    description: 'Reflect on capability usage and effectiveness'
  },
  confidence: {
    triggers: ['decision_made', 'prediction_made', 'belief_updated'],
    description: 'Reflect on confidence levels and accuracy'
  },
  decision: {
    triggers: ['deliberation_complete', 'vote_cast', 'consensus_reached'],
    description: 'Reflect on collective decisions and outcomes'
  },
  blind_spot: {
    triggers: ['unknown_encountered', 'capability_gap', 'unexpected_outcome'],
    description: 'Identify potential blind spots and knowledge gaps'
  }
};

class ReflectionEngine {
  constructor(agentId, stateDir) {
    this.agentId = agentId;
    this.stateDir = stateDir;
    
    // Load dependencies
    try {
      this.selfModel = require('./self-model.js');
    } catch (e) {
      this.selfModel = null;
    }
    
    try {
      this.capabilityTracker = require('./capability-tracker.js');
    } catch (e) {
      this.capabilityTracker = null;
    }
    
    try {
      this.confidenceScorer = require('./confidence-scorer.js');
    } catch (e) {
      this.confidenceScorer = null;
    }
    
    this.reflectionFile = path.join(stateDir, 'reflections.json');
    this.reflections = [];
    this.loadReflections();
  }

  loadReflections() {
    try {
      if (fs.existsSync(this.reflectionFile)) {
        this.reflections = JSON.parse(fs.readFileSync(this.reflectionFile, 'utf8'));
      }
    } catch (e) {
      this.reflections = [];
    }
  }

  saveReflections() {
    try {
      fs.writeFileSync(this.reflectionFile, JSON.stringify(this.reflections, null, 2));
    } catch (e) {
      console.error('Failed to save reflections:', e.message);
    }
  }

  // Trigger-based reflection
  triggerReflection(type, context = {}) {
    if (!REFLECTION_TYPES[type]) {
      console.error('Unknown reflection type:', type);
      return null;
    }

    let reflection = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      context,
      insights: [],
      recommendations: [],
      confidence_impact: 0
    };

    switch (type) {
      case 'capability':
        reflection = this.reflectOnCapability(context, reflection);
        break;
      case 'confidence':
        reflection = this.reflectOnConfidence(context, reflection);
        break;
      case 'decision':
        reflection = this.reflectOnDecision(context, reflection);
        break;
      case 'blind_spot':
        reflection = this.reflectOnBlindSpot(context, reflection);
        break;
    }

    this.reflections.push(reflection);
    
    // Keep only last 200 reflections
    if (this.reflections.length > 200) {
      this.reflections = this.reflections.slice(-200);
    }
    
    this.saveReflections();
    
    // Update self-model if available
    if (this.selfModel) {
      const model = new this.selfModel.SelfModel(this.agentId, this.stateDir);
      model.loadState();
      model.addReflection(type, reflection.insights.join('; '));
      model.saveState();
    }

    return reflection;
  }

  reflectOnCapability(context, reflection) {
    const { capability_id, success, outcome } = context;
    
    if (this.capabilityTracker) {
      const tracker = new this.capabilityTracker.CapabilityTracker(this.agentId, this.stateDir);
      
      if (capability_id) {
        tracker.use(capability_id, success !== false);
        
        const cap = tracker.get(capability_id);
        if (cap) {
          if (success) {
            reflection.insights.push(`Capability '${cap.name}' performed well (confidence: ${cap.confidence})`);
            reflection.confidence_impact = 0.05;
          } else {
            reflection.insights.push(`Capability '${cap.name}' needs improvement (confidence: ${cap.confidence})`);
            reflection.recommendations.push(`Practice or improve '${cap.name}' capability`);
            reflection.confidence_impact = -0.1;
          }
        }
      }
    }
    
    return reflection;
  }

  reflectOnConfidence(context, reflection) {
    const { claim, evidence, actual_outcome, predicted } = context;
    
    if (this.confidenceScorer) {
      const scorer = new this.confidenceScorer.ConfidenceScorer();
      const evaluation = scorer.evaluate(claim, evidence || []);
      
      reflection.insights.push(`Claim confidence was ${(evaluation.confidence * 100).toFixed(0)}%`);
      
      if (actual_outcome !== undefined) {
        const wasCorrect = actual_outcome === predicted;
        if (wasCorrect) {
          reflection.insights.push('Prediction was accurate, confidence appropriately calibrated');
          reflection.confidence_impact = 0.02;
        } else {
          reflection.insights.push('Prediction was inaccurate, may need to recalibrate');
          reflection.recommendations.push('Review confidence scoring for this domain');
          reflection.confidence_impact = -0.05;
        }
      }
    }
    
    return reflection;
  }

  reflectOnDecision(context, reflection) {
    const { proposal_id, vote, outcome, consensus_reached } = context;
    
    reflection.insights.push(`Decision process: ${consensus_reached ? 'consensus reached' : 'no consensus'}`);
    
    if (outcome === 'approved') {
      reflection.insights.push('Proposal was approved - collective decision effective');
      reflection.confidence_impact = 0.03;
    } else if (outcome === 'rejected') {
      reflection.insights.push('Proposal was rejected - governance working correctly');
      reflection.confidence_impact = 0.01;
    }
    
    if (vote) {
      const votes = Object.values(vote).filter(v => v === 'yes').length;
      reflection.insights.push(`Vote: ${votes}/3 approved`);
    }
    
    return reflection;
  }

  reflectOnBlindSpot(context, reflection) {
    const { unknown_area, attempted_action, failed_reason } = context;
    
    reflection.insights.push(`Encountered unknown: ${unknown_area || 'unfamiliar situation'}`);
    
    if (failed_reason) {
      reflection.insights.push(`Failed due to: ${failed_reason}`);
      reflection.recommendations.push(`Research or develop capability for: ${unknown_area}`);
    }
    
    if (this.selfModel) {
      const model = new this.selfModel.SelfModel(this.agentId, this.stateDir);
      model.loadState();
      model.addBlindSpot(unknown_area, failed_reason || 'Unknown encountered');
      model.saveState();
      reflection.confidence_impact = -0.1;
    }
    
    return reflection;
  }

  // Quick reflection (for frequent calls)
  quickReflect(topic) {
    const quickThoughts = [
      'Current approach seems appropriate',
      'Monitoring for changes in conditions',
      'Maintaining focus on primary objectives',
      'Assessing resource availability'
    ];
    
    const insight = quickThoughts[Math.floor(Math.random() * quickThoughts.length)];
    
    const reflection = {
      id: uuidv4(),
      type: 'quick',
      timestamp: new Date().toISOString(),
      topic,
      insights: [insight],
      recommendations: [],
      confidence_impact: 0
    };
    
    this.reflections.push(reflection);
    if (this.reflections.length > 100) {
      this.reflections = this.reflections.slice(-100);
    }
    this.saveReflections();
    
    return reflection;
  }

  // Get recent reflections
  getRecent(count = 10) {
    return this.reflections.slice(-count);
  }

  // Get reflections by type
  getByType(type, count = 10) {
    return this.reflections.filter(r => r.type === type).slice(-count);
  }
}

module.exports = { ReflectionEngine, REFLECTION_TYPES };

// CLI
if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || __dirname;
  
  const engine = new ReflectionEngine(agentId, stateDir);
  
  const command = process.argv[2];
  
  switch (command) {
    case 'trigger':
      const type = process.argv[3];
      const contextStr = process.argv[4] || '{}';
      const context = JSON.parse(contextStr);
      const reflection = engine.triggerReflection(type, context);
      console.log(JSON.stringify(reflection, null, 2));
      break;
      
    case 'quick':
      const topic = process.argv[3] || 'general';
      const quickRef = engine.quickReflect(topic);
      console.log(JSON.stringify(quickRef, null, 2));
      break;
      
    case 'recent':
      const count = parseInt(process.argv[3] || '10');
      console.log(JSON.stringify(engine.getRecent(count), null, 2));
      break;
      
    case 'type':
      const refType = process.argv[3];
      const typeCount = parseInt(process.argv[4] || '10');
      console.log(JSON.stringify(engine.getByType(refType, typeCount), null, 2));
      break;
      
    default:
      console.log('Commands: trigger, quick, recent, type');
  }
}