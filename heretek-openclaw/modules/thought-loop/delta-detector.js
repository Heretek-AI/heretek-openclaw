#!/usr/bin/env node
// delta-detector.js - Detects meaningful changes from baseline
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = {
  fileExtensions: ['.md', '.json', '.js', '.sh', '.yaml', '.yml', '.txt'],
  checkGit: true,
  checkDatabases: true,
  checkExternal: true,
  dbPaths: [
    '../../heretek-skills/skills/curiosity-engine/data/curiosity_metrics.db',
    '../../heretek-skills/skills/governance-modules/consensus_ledger.db',
    './memory/anomalies.db'
  ],
  externalCheckUrls: [
    'https://api.github.com/repos/Heretek-AI/heretek-openclaw/releases'
  ]
};

function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
  } catch (e) {
    return null;
  }
}

function scanWorkspace(workspacePath) {
  const deltas = [];
  
  function walkDir(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            walkDir(fullPath, path.join(basePath, item));
          }
        } else {
          const ext = path.extname(item);
          if (CONFIG.fileExtensions.includes(ext)) {
            deltas.push({
              type: 'file_change',
              path: fullPath,
              relative: path.join(basePath, item),
              size: stat.size,
              modified: stat.mtime.toISOString(),
              hash: getFileHash(fullPath)
            });
          }
        }
      }
    } catch (e) {
      // Directory doesn't exist
    }
  }
  
  walkDir(workspacePath);
  return deltas;
}

function checkDatabases() {
  const deltas = [];
  
  for (const dbPath of CONFIG.dbPaths) {
    try {
      const fullPath = path.join(__dirname, dbPath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        deltas.push({
          type: 'db_change',
          path: fullPath,
          size: stat.size,
          modified: stat.mtime.toISOString()
        });
      }
    } catch (e) {
      // Database path not available
    }
  }
  
  return deltas;
}

async function checkExternal() {
  const deltas = [];
  
  for (const url of CONFIG.externalCheckUrls) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        deltas.push({
          type: 'external_change',
          source: 'github_releases',
          latest: data[0].tag_name,
          url
        });
      }
    } catch (e) {
      // External check failed
    }
  }
  
  return deltas;
}

async function checkAgentState(agentId) {
  const deltas = [];
  
  // Check via triad-sync HTTP API
  const syncUrl = process.env.TRIAD_SYNC_URL || 'http://localhost:4001';
  
  try {
    const response = await fetch(`${syncUrl}/health`, { timeout: 3000 });
    const health = await response.json();
    
    if (health.agents) {
      for (const [agent, status] of Object.entries(health.agents)) {
        if (status.state === 'degraded' || status.state === 'failed') {
          deltas.push({
            type: 'agent_state_change',
            agent,
            state: status.state,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (e) {
    // Sync server not available
  }
  
  return deltas;
}

async function detectDeltas(agentId, stateDir) {
  const allDeltas = [];
  
  // Load baseline
  const stateFile = path.join(stateDir, 'thought-state.json');
  let baseline = { file_hashes: {}, db_states: {}, agent_states: {} };
  
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    baseline = state.baseline || baseline;
  } catch (e) {
    // No baseline yet
  }
  
  // Scan workspace
  const workspacePath = path.join(__dirname, '../../agents', agentId);
  const fileDeltas = scanWorkspace(workspacePath);
  
  for (const delta of fileDeltas) {
    const prevHash = baseline.file_hashes[delta.relative];
    if (!prevHash || prevHash !== delta.hash) {
      allDeltas.push({ ...delta, changed: !prevHash });
    }
  }
  
  // Check databases
  const dbDeltas = checkDatabases();
  allDeltas.push(...dbDeltas);
  
  // Check external
  if (CONFIG.checkExternal) {
    const externalDeltas = await checkExternal();
    allDeltas.push(...externalDeltas);
  }
  
  // Check agent state
  const agentDeltas = await checkAgentState(agentId);
  allDeltas.push(...agentDeltas);
  
  return allDeltas;
}

// CLI
const command = process.argv[2];
const agentId = process.argv[3] || 'steward';
const stateDir = process.argv[4] || __dirname;

if (command === 'detect') {
  detectDeltas(agentId, stateDir).then(deltas => {
    console.log(JSON.stringify(deltas, null, 2));
  }).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
} else {
  console.log('Usage: node delta-detector.js detect <agent_id> <state_dir>');
}