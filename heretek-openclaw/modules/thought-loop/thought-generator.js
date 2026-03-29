#!/usr/bin/env node
// thought-generator.js - Generates structured thoughts based on context
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const THOUGHT_TEMPLATES = {
  discovery: {
    observation: 'New information discovered in {source}',
    implication: 'This may indicate {possibility}',
    recommendation: 'Consider investigating further or updating knowledge',
    confidence: 0.6
  },
  update: {
    observation: 'State change detected in {subject}',
    implication: 'This affects {affected}',
    recommendation: 'Update internal models and propagate changes',
    confidence: 0.8
  },
  alert: {
    observation: 'Alert condition met: {condition}',
    implication: 'Immediate attention required for {impact}',
    recommendation: 'Trigger appropriate response protocol',
    confidence: 0.9
  },
  state_change: {
    observation: 'Agent state transition: {from} → {to}',
    implication: 'This may affect collective {aspect}',
    recommendation: 'Monitor and prepare fallback if needed',
    confidence: 0.7
  },
  external_awareness: {
    observation: 'External event detected: {event}',
    implication: 'This could affect {targets}',
    recommendation: 'Assess impact and potentially adjust strategy',
    confidence: 0.5
  },
  reflection: {
    observation: 'Self-reflection on current state: {topic}',
    implication: 'Current approach is {assessment}',
    recommendation: 'Consider {suggestion}',
    confidence: 0.6
  }
};

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function generateThought(delta, agentId) {
  const template = THOUGHT_TEMPLATES[delta.type] || THOUGHT_TEMPLATES.update;
  
  const thought = {
    id: uuidv4(),
    type: delta.type,
    timestamp: new Date().toISOString(),
    agent: agentId,
    observation: fillTemplate(template.observation, delta),
    implication: fillTemplate(template.implication, delta),
    recommendation: fillTemplate(template.recommendation, delta),
    confidence: template.confidence,
    source_delta: delta.type,
    priority: delta.relevance || 0.5
  };
  
  return thought;
}

function fillTemplate(template, delta) {
  let result = template;
  
  const replacements = {
    '{source}': delta.relative || delta.path || 'unknown',
    '{possibility}': 'potential opportunity or risk',
    '{subject}': delta.relative || 'system',
    '{affected}': 'collective operations',
    '{condition}': delta.state || delta.type,
    '{impact}': 'system stability',
    '{from}': 'unknown',
    '{to}': delta.state || 'changed',
    '{aspect}': 'coordination',
    '{event}': delta.latest || 'external change',
    '{targets}': 'planning and operations',
    '{topic}': 'current goals and capabilities',
    '{assessment}': 'appropriate for current situation',
    '{suggestion}': 'continue current approach with monitoring'
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(key, value);
  }
  
  return result;
}

function generateIdleThought(agentId) {
  const idleTopics = [
    'current goal progress',
    'pending deliberations',
    'system health metrics',
    'capability gaps',
    'external opportunities'
  ];
  
  const topic = idleTopics[Math.floor(Math.random() * idleTopics.length)];
  
  return {
    id: uuidv4(),
    type: 'reflection',
    timestamp: new Date().toISOString(),
    agent: agentId,
    observation: `Self-reflection on ${topic}`,
    implication: `Assessment of ${topic} suggests {assessment}`,
    recommendation: `Continue monitoring ${topic} and prepare for changes`,
    confidence: 0.5,
    source_delta: 'idle_thinking',
    priority: 0.3
  };
}

function generateThoughts(deltas, agentId) {
  const config = loadConfig();
  const maxThoughts = config.max_thoughts_per_cycle || 10;
  
  const thoughts = deltas.slice(0, maxThoughts).map(delta => generateThought(delta, agentId));
  return thoughts;
}

function generateIdleThoughts(agentId, count = 3) {
  const thoughts = [];
  for (let i = 0; i < count; i++) {
    thoughts.push(generateIdleThought(agentId));
  }
  return thoughts;
}

// CLI
const command = process.argv[2];
const agentId = process.argv[3] || 'steward';
const stateDir = process.argv[4] || __dirname;

if (command === 'generate') {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    try {
      const deltas = JSON.parse(input);
      const thoughts = generateThoughts(deltas, agentId);
      console.log(JSON.stringify(thoughts, null, 2));
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });
} else if (command === 'idle') {
  try {
    const thoughts = generateIdleThoughts(agentId);
    console.log(JSON.stringify(thoughts, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
} else {
  console.log('Usage: cat deltas.json | node thought-generator.js generate <agent_id>');
  console.log('       node thought-generator.js idle <agent_id>');
}