#!/usr/bin/env node
// action-urgency.js - Determines urgency levels for potential actions
const fs = require('fs');
const path = require('path');

const URGENCY_THRESHOLDS = {
  log: { min: 0.0, max: 0.3 },
  monitor: { min: 0.3, max: 0.6 },
  consider: { min: 0.6, max: 0.8 },
  immediate: { min: 0.8, max: 1.0 }
};

const ACTION_MAPPING = {
  alert: 'log_alert',
  discovery: 'broadcast_thought',
  update: 'update_context',
  state_change: 'trigger_deliberation',
  external_awareness: 'update_context',
  reflection: 'log_alert'
};

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return { urgency_threshold: 0.6 };
  }
}

function calculateUrgency(thought) {
  const config = loadConfig();
  
  // Base urgency from confidence
  let urgency = thought.confidence * 0.4;
  
  // Priority contribution
  urgency += (thought.priority || 0.5) * 0.3;
  
  // Type-based urgency adjustment
  const typeUrgency = {
    alert: 0.9,
    state_change: 0.7,
    discovery: 0.6,
    external_awareness: 0.5,
    update: 0.4,
    reflection: 0.3
  };
  
  urgency += (typeUrgency[thought.type] || 0.5) * 0.3;
  
  return Math.min(1, Math.round(urgency * 100) / 100);
}

function getUrgencyLevel(urgency) {
  if (urgency < 0.3) return 'log';
  if (urgency < 0.6) return 'monitor';
  if (urgency < 0.8) return 'consider';
  return 'immediate';
}

function determineAction(thought, urgency) {
  const type = thought.type;
  const actionType = ACTION_MAPPING[type] || 'log_alert';
  
  const action = {
    type: actionType,
    urgency,
    level: getUrgencyLevel(urgency),
    thought_id: thought.id,
    message: thought.observation
  };
  
  switch (actionType) {
    case 'trigger_deliberation':
      action.target = 'steward';
      action.reason = 'State change requires collective decision';
      break;
    case 'broadcast_thought':
      action.target = 'all';
      action.reason = 'Relevant discovery for collective awareness';
      break;
    case 'update_context':
      action.target = thought.agent;
      action.reason = 'Update internal context for next cycle';
      break;
    case 'log_alert':
      action.level = urgency >= 0.8 ? 'critical' : 'info';
      action.reason = 'Log for monitoring and review';
      break;
  }
  
  return action;
}

function evaluateThoughts(thoughts, agentId) {
  const actions = thoughts.map(thought => {
    const urgency = calculateUrgency(thought);
    return determineAction(thought, urgency);
  });
  
  return {
    timestamp: new Date().toISOString(),
    agent: agentId,
    total_thoughts: thoughts.length,
    actions: actions.sort((a, b) => b.urgency - a.urgency)
  };
}

// CLI
const command = process.argv[2];
const agentId = process.argv[3] || 'steward';
const stateDir = process.argv[4] || __dirname;

if (command === 'evaluate') {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    try {
      const thoughts = JSON.parse(input);
      const evaluation = evaluateThoughts(thoughts, agentId);
      console.log(JSON.stringify(evaluation, null, 2));
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });
} else {
  console.log('Usage: cat thoughts.json | node action-urgency.js evaluate <agent_id>');
}