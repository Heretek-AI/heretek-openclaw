#!/usr/bin/env node
// capability-tracker.js - Tracks what capabilities exist and their status
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CapabilityTracker {
  constructor(agentId, stateDir) {
    this.agentId = agentId;
    this.stateDir = stateDir;
    this.stateFile = path.join(stateDir, 'capabilities.json');
    this.capabilities = {};
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        this.capabilities = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      }
    } catch (e) {
      this.capabilities = {};
    }
  }

  saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.capabilities, null, 2));
    } catch (e) {
      console.error('Failed to save state:', e.message);
    }
  }

  // Discover capabilities from skills directory
  async discoverSkills(skillsPath = '../../heretek-skills/skills') {
    const fullPath = path.join(__dirname, skillsPath);
    const discovered = [];

    try {
      const items = fs.readdirSync(fullPath);
      for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          const skillFile = path.join(itemPath, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            const content = fs.readFileSync(skillFile, 'utf8');
            const match = content.match(/^# SKILL\.md\n([\s\S]*?)(?:\n##|$)/);
            
            discovered.push({
              id: item,
              name: item.replace(/-/g, '_'),
              description: match ? match[1].trim().split('\n')[0] : 'Unknown skill',
              type: 'skill',
              source: skillFile
            });
          }
        }
      }
    } catch (e) {
      // Skills directory not available
    }

    return discovered;
  }

  // Register a capability
  register(capability) {
    const id = capability.id || uuidv4();
    
    this.capabilities[id] = {
      id,
      name: capability.name,
      description: capability.description,
      type: capability.type || 'custom',
      confidence: capability.confidence || 0.5,
      last_used: null,
      use_count: 0,
      success_count: 0,
      fail_count: 0,
      metadata: capability.metadata || {}
    };
    
    this.saveState();
    return this.capabilities[id];
  }

  // Use a capability
  use(capabilityId, success) {
    if (this.capabilities[capabilityId]) {
      const cap = this.capabilities[capabilityId];
      cap.use_count++;
      cap.last_used = new Date().toISOString();
      
      if (success) {
        cap.success_count++;
        cap.confidence = Math.min(1, cap.confidence + 0.02);
      } else {
        cap.fail_count++;
        cap.confidence = Math.max(0.1, cap.confidence - 0.05);
      }
      
      this.saveState();
    }
    
    return this.capabilities[capabilityId];
  }

  // Check if capability exists
  has(capabilityId) {
    return !!this.capabilities[capabilityId];
  }

  // Get capability
  get(capabilityId) {
    return this.capabilities[capabilityId];
  }

  // Get all capabilities
  getAll() {
    return Object.values(this.capabilities);
  }

  // Derive capability from others
  deriveCapability(derivedId, sourceIds, config = {}) {
    let avgConfidence = 0;
    let count = 0;
    
    for (const sourceId of sourceIds) {
      if (this.capabilities[sourceId]) {
        avgConfidence += this.capabilities[sourceId].confidence;
        count++;
      }
    }
    
    if (count > 0) {
      avgConfidence /= count;
      
      this.capabilities[derivedId] = {
        id: derivedId,
        name: config.name || derivedId,
        description: config.description || `Derived from: ${sourceIds.join(', ')}`,
        type: 'derived',
        confidence: avgConfidence,
        derived_from: sourceIds,
        last_used: null,
        use_count: 0,
        success_count: 0,
        fail_count: 0
      };
      
      this.saveState();
    }
    
    return this.capabilities[derivedId];
  }

  // Evaluate capability for a task
  evaluateCapability(capabilityId, taskRequirements) {
    const cap = this.capabilities[capabilityId];
    if (!cap) return null;
    
    const score = {
      capability: cap,
      match: 0,
      confidence: cap.confidence,
      recommendation: 'unknown'
    };
    
    // Simple matching (can be enhanced)
    if (taskRequirements.required_capabilities) {
      const matches = taskRequirements.required_capabilities.filter(
        rc => rc === capabilityId || cap.name.includes(rc)
      ).length;
      
      score.match = matches / taskRequirements.required_capabilities.length;
    }
    
    // Recommendation
    if (score.match >= 0.8 && cap.confidence >= 0.7) {
      score.recommendation = 'recommended';
    } else if (score.match >= 0.5 || cap.confidence >= 0.5) {
      score.recommendation = 'consider';
    } else {
      score.recommendation = 'not_recommended';
    }
    
    return score;
  }

  // Can do - check if capability can handle task
  canDo(capabilityId, minConfidence = 0.5) {
    const cap = this.capabilities[capabilityId];
    return cap && cap.confidence >= minConfidence;
  }
}

module.exports = { CapabilityTracker };

// CLI
if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'steward';
  const stateDir = process.env.STATE_DIR || __dirname;
  
  const tracker = new CapabilityTracker(agentId, stateDir);
  
  const command = process.argv[2];
  
  switch (command) {
    case 'discover':
      tracker.discoverSkills().then(skills => {
        console.log(JSON.stringify(skills, null, 2));
      });
      break;
      
    case 'register':
      const cap = JSON.parse(process.argv[3] || '{}');
      tracker.register(cap);
      console.log('Registered:', cap.id);
      break;
      
    case 'use':
      const [capId, success] = [process.argv[3], process.argv[4] === 'true'];
      tracker.use(capId, success);
      console.log('Used:', capId);
      break;
      
    case 'list':
      console.log(JSON.stringify(tracker.getAll(), null, 2));
      break;
      
    case 'can_do':
      const checkId = process.argv[3];
      const minConf = parseFloat(process.argv[4] || '0.5');
      console.log(tracker.canDo(checkId, minConf));
      break;
      
    default:
      console.log('Commands: discover, register, use, list, can_do');
}