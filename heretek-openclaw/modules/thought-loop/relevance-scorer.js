#!/usr/bin/env node
// relevance-scorer.js - Evaluates which thoughts are relevant to collective goals
const fs = require('fs');
const path = require('path');

const AGENT_RELEVANCE = {
  steward: ['governance', 'coordination', 'deliberation', 'health', 'growth'],
  alpha: ['security', 'consensus', 'decision_making', 'strategy'],
  beta: ['analysis', 'evaluation', 'proposal_review', 'reasoning'],
  charlie: ['implementation', 'execution', 'action', 'coordination'],
  examiner: ['questioning', 'analysis', 'verification', 'audit'],
  explorer: ['discovery', 'research', 'opportunity', 'external'],
  sentinel: ['safety', 'security', 'risk', 'protection', 'monitoring'],
  coder: ['code', 'implementation', 'technical', 'creation'],
  oracle: ['prediction', 'forecasting', 'analysis', 'insight']
};

const TYPE_WEIGHTS = {
  discovery: 0.4,
  update: 0.3,
  alert: 0.8,
  state_change: 0.5,
  external_awareness: 0.4,
  reflection: 0.3
};

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return { relevance_threshold: 0.5 };
  }
}

function calculateRelevance(delta, agentId) {
  const config = loadConfig();
  const threshold = config.relevance_threshold || 0.5;
  
  // Determine delta type
  let type = 'update';
  let baseWeight = TYPE_WEIGHTS.update;
  
  if (delta.type === 'file_change') {
    if (delta.relative.includes('MEMORY') || delta.relative.includes('memory')) {
      type = 'reflection';
      baseWeight = TYPE_WEIGHTS.reflection;
    } else if (delta.relative.includes('HEARTBEAT') || delta.relative.includes('heartbeat')) {
      type = 'state_change';
      baseWeight = TYPE_WEIGHTS.state_change;
    }
  } else if (delta.type === 'db_change') {
    type = 'discovery';
    baseWeight = TYPE_WEIGHTS.discovery;
  } else if (delta.type === 'external_change') {
    type = 'external_awareness';
    baseWeight = TYPE_WEIGHTS.external_awareness;
  } else if (delta.type === 'agent_state_change') {
    type = 'alert';
    baseWeight = TYPE_WEIGHTS.alert;
  }
  
  // Agent-specific relevance
  const agentKeywords = AGENT_RELEVANCE[agentId] || [];
  let agentRelevance = 0.3;
  
  const deltaStr = JSON.stringify(delta).toLowerCase();
  for (const keyword of agentKeywords) {
    if (deltaStr.includes(keyword)) {
      agentRelevance += 0.15;
    }
  }
  agentRelevance = Math.min(1, agentRelevance);
  
  // Context urgency (simulated)
  const contextUrgency = 0.5;
  
  // Calculate final score
  const score = (baseWeight * 0.4) + (agentRelevance * 0.4) + (contextUrgency * 0.2);
  
  return {
    ...delta,
    relevance: Math.round(score * 100) / 100,
    type,
    threshold,
    relevant: score >= threshold
  };
}

function scoreDeltas(deltas, agentId) {
  const scored = deltas.map(delta => calculateRelevance(delta, agentId));
  return scored.filter(d => d.relevant).sort((a, b) => b.relevance - a.relevance);
}

// CLI
const command = process.argv[2];
const agentId = process.argv[3] || 'steward';
const stateDir = process.argv[4] || __dirname;

if (command === 'score') {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    try {
      const deltas = JSON.parse(input);
      const scored = scoreDeltas(deltas, agentId);
      console.log(JSON.stringify(scored, null, 2));
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });
} else {
  console.log('Usage: cat deltas.json | node relevance-scorer.js score <agent_id>');
}