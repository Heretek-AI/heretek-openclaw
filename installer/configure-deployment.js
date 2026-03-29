#!/usr/bin/env node
// ==============================================================================
// Heretek OpenClaw - Interactive Deployment Configurator
// ==============================================================================
// This tool walks through the deployment configuration for first-time setup.
// It configures: backend, models, failover, embedding model, and saves to .env
// ==============================================================================

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Available model backends
const BACKENDS = {
  ollama: {
    name: 'Ollama',
    description: 'Local LLM runtime - free, privacy-focused, runs on your machine',
    baseUrl: 'http://localhost:11434',
    apiKey: 'not-required',
    requiresDocker: true,
    defaultModel: 'llama3.1'
  },
  minimax: {
    name: 'MiniMax',
    description: 'Cloud API - best reasoning capabilities',
    baseUrl: 'https://api.minimaxi.chat/v1',
    apiKey: 'MINIMAX_API_KEY',
    requiresApiKey: true,
    defaultModel: 'abab6.5s-chat'
  },
  glm: {
    name: 'Zhipu AI (GLM)',
    description: 'Cloud API - Chinese-optimized, excellent multilingual',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: 'GLM_API_KEY',
    requiresApiKey: true,
    defaultModel: 'glm-4'
  },
  qwen: {
    name: 'Qwen (Alibaba)',
    description: 'Cloud API - strong coding capabilities',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'QWEN_API_KEY',
    requiresApiKey: true,
    defaultModel: 'qwen-turbo'
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    description: 'Cloud API - long context window',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: 'KIMI_API_KEY',
    requiresApiKey: true,
    defaultModel: 'kimi-v1-preview'
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4 and GPT-4o - industry standard',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'OPENAI_API_KEY',
    requiresApiKey: true,
    defaultModel: 'gpt-4o'
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude - excellent reasoning',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: 'ANTHROPIC_API_KEY',
    requiresApiKey: true,
    defaultModel: 'claude-sonnet-4-20250514'
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Fast, low-cost, multimodal',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: 'GEMINI_API_KEY',
    requiresApiKey: true,
    defaultModel: 'gemini-2.0-flash'
  }
};

// Model recommendations per agent role
const AGENT_MODELS = {
  steward: {
    description: 'Orchestrator - needs strong reasoning and coordination',
    recommended: ['qwen3.5', 'llama3.1', 'gpt-4o', 'claude-sonnet-4-20250514']
  },
  alpha: {
    description: 'Triad Alpha - balanced reasoning and deliberation',
    recommended: ['qwen3.5', 'llama3.1', 'gpt-4o', 'glm-4']
  },
  beta: {
    description: 'Triad Beta - critical analysis',
    recommended: ['qwen3.5', 'llama3.1', 'gpt-4o', 'claude-sonnet-4-20250514']
  },
  charlie: {
    description: 'Triad Charlie - process validation',
    recommended: ['qwen3.5', 'llama3.1', 'gpt-4o', 'glm-4']
  },
  examiner: {
    description: 'Interrogator - deep questioning, logical validation',
    recommended: ['qwen3.5', 'gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.0-flash']
  },
  explorer: {
    description: 'Scout - broad capability scanning',
    recommended: ['qwen3.5', 'llama3.1', 'gpt-4o', 'gemini-2.0-flash']
  },
  sentinel: {
    description: 'Guardian - safety review, risk assessment',
    recommended: ['qwen3.5', 'gpt-4o', 'claude-sonnet-4-20250514']
  },
  coder: {
    description: 'Artisan - code implementation',
    recommended: ['qwen3.5', 'gpt-4o', 'claude-sonnet-4-20250514', 'llama3.1']
  }
};

// Embedding models
const EMBEDDING_MODELS = {
  ollama: ['nomic-embed-text', 'llama3-embedding'],
  openai: ['text-embedding-3-small', 'text-embedding-3-large'],
  minimax: ['abab-embedding'],
  glm: ['embedding-3']
};

function question(text) {
  return new Promise(resolve => rl.question(text, resolve));
}

async function selectBackend() {
  console.log('\n==============================================');
  console.log('  🦞 STEP 1: Select Model Backend');
  console.log('==============================================\n');
  console.log('Available backends:\n');

  const entries = Object.entries(BACKENDS);
  entries.forEach(([key, backend], index) => {
    console.log(`  ${index + 1}) ${backend.name}`);
    console.log(`     ${backend.description}\n`);
  });

  let choice = await question('Select backend [1-8]: ');
  let index = parseInt(choice) - 1;

  while (isNaN(index) || index < 0 || index >= entries.length) {
    choice = await question('Invalid. Select 1-8: ');
    index = parseInt(choice) - 1;
  }

  const [backendKey, backend] = entries[index];
  return { key: backendKey, ...backend };
}

async function configureApiKey(backend) {
  if (!backend.requiresApiKey) {
    return null;
  }

  console.log('\n==============================================');
  console.log('  🦞 STEP 2: Configure API Key');
  console.log('==============================================\n');

  console.log(`Backend: ${backend.name}`);
  console.log(`API Key env var: ${backend.apiKey}`);
  console.log(`Get your key from: ${getKeyUrl(backend.key)}\n`);

  const apiKey = await question(`Enter ${backend.apiKey}: `);

  if (!apiKey || apiKey.trim() === '') {
    console.log('\n⚠️  API key required for this backend. Configuration skipped.');
    return null;
  }

  return apiKey.trim();
}

function getKeyUrl(backendKey) {
  const urls = {
    minimax: 'https://platform.minimaxi.ai',
    glm: 'https://open.bigmodel.cn',
    qwen: 'https://dashscope.console.aliyun.com',
    kimi: 'https://platform.moonshot.cn',
    openai: 'https://platform.openai.com',
    anthropic: 'https://console.anthropic.com',
    gemini: 'https://aistudio.google.com/app/apikey'
  };
  return urls[backendKey] || 'provider portal';
}

async function configureAgentModels(backend) {
  console.log('\n==============================================');
  console.log('  🦞 STEP 3: Configure Agent Models');
  console.log('==============================================\n');
  console.log(`Backend: ${backend.name}`);
  console.log(`Default model: ${backend.defaultModel}\n`);
  console.log('Each triad member can use a different model for specialization.');
  console.log('Default recommendations are shown - press Enter to accept.\n');

  const configs = {};

  for (const [agentId, agent] of Object.entries(AGENT_MODELS)) {
    console.log(`${agentId.toUpperCase()} (${agent.description})`);
    console.log(`  Recommended: ${agent.recommended.join(', ')}`);

    const choice = await question(`  Model [${backend.defaultModel}]: `);
    configs[agentId] = choice.trim() || backend.defaultModel;
    console.log('');
  }

  return configs;
}

async function configureFailover(backend) {
  console.log('\n==============================================');
  console.log('  🦞 STEP 4: Configure Failover');
  console.log('==============================================\n');

  const enableFailover = await question('Enable failover model? (recommended) [Y/n]: ');
  const enabled = !enableFailover.trim() || enableFailover.toLowerCase() === 'y';

  if (!enabled) {
    return { enabled: false };
  }

  console.log('\nFailover configuration:');
  console.log('  - If primary model fails, failover to next available');
  console.log('  - Maintains service continuity during outages\n');

  const failovers = {};

  if (backend.key === 'ollama') {
    // For Ollama, add backup local models
    const choice = await question('Failover model [mistral]: ');
    failovers.primary = choice.trim() || 'mistral';

    const choice2 = await question('Secondary failover [phi4]: ');
    failovers.secondary = choice2.trim() || 'phi4';
  } else {
    // For cloud backends, could add another cloud provider
    console.log('Note: Cloud failover requires additional API keys.');
    console.log('Add failover models manually in litellm_config.yaml after installation.\n');
  }

  return { enabled, ...failovers };
}

async function configureEmbedding(backend) {
  console.log('\n==============================================');
  console.log('  🦞 STEP 5: Configure Embedding Model');
  console.log('==============================================\n');
  console.log('Embedding model for RAG and vector similarity.\n');

  const embeddingOptions = EMBEDDING_MODELS[backend.key] || [];

  if (embeddingOptions.length === 0) {
    console.log(`No ${backend.name}-specific embeddings available.`);
    console.log('Using default: nomic-embed-text (via Ollama) or text-embedding-3-small\n');

    return 'nomic-embed-text';
  }

  console.log(`Options for ${backend.name}:`);
  embeddingOptions.forEach((model, index) => {
    console.log(`  ${index + 1}) ${model}`);
  });

  const choice = await question('Select embedding model [1]: ');
  const index = parseInt(choice) - 1;

  if (isNaN(index) || !embeddingOptions[index]) {
    return embeddingOptions[0];
  }

  return embeddingOptions[index];
}

function generateEnvFile(config) {
  const { backend, apiKey, agentModels, failover, embedding } = config;

  console.log('\n==============================================');
  console.log('  🦞 Generating .env configuration');
  console.log('==============================================\n');

  const lines = [
    '# Heretek OpenClaw - Deployment Configuration',
    '# Generated by configure-deployment.js',
    '',
    '# ========== LITELELLM ==========',
    `LITELLM_MASTER_KEY=${generateMasterKey()}`,
    `LITELLM_SALT_KEY=${generateSaltKey()}`,
    '',
    '# ========== BACKEND ==========',
    `MODEL_PROVIDER=${backend.key}`,
    `MODEL_NAME=${agentModels.steward}`,
    `MODEL_API_BASE=${backend.baseUrl}`,
    backend.requiresApiKey ? `${backend.apiKey}=${apiKey}` : null,
    '',
    '# ========== AGENT MODELS =========='
  ];

  // Add each agent's model
  for (const [agentId, model] of Object.entries(agentModels)) {
    lines.push(`AGENT_${agentId.toUpperCase()}_MODEL=${model}`);
  }

  lines.push('', '# ========== FAILOVER ==========');

  if (failover.enabled) {
    lines.push('FAILOVER_ENABLED=true');
    if (failover.primary) lines.push(`FAILOVER_MODEL_1=${failover.primary}`);
    if (failover.secondary) lines.push(`FAILOVER_MODEL_2=${failover.secondary}`);
  } else {
    lines.push('FAILOVER_ENABLED=false');
  }

  lines.push('', '# ========== EMBEDDING ==========');
  lines.push(`EMBEDDING_MODEL=${embedding}`);

  lines.push('', '# ========== DATABASE ==========');
  lines.push('POSTGRES_PASSWORD=heretek');

  // Filter out null lines
  return lines.filter(line => line !== null).join('\n');
}

function generateMasterKey() {
  // Generate a secure master key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let key = 'hk_';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function generateSaltKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_';
  for (let i = 0; i < 24; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

async function saveConfiguration(config) {
  // Generate and save .env file
  const envContent = generateEnvFile(config);
  const envPath = path.join(process.cwd(), '.env');

  // Check if .env exists
  if (fs.existsSync(envPath)) {
    const backupPath = path.join(process.cwd(), '.env.backup');
    fs.copyFileSync(envPath, backupPath);
    console.log(`Existing .env backed up to .env.backup`);
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`Configuration saved to .env`);

  // Also update litellm_config.yaml
  await updateLitellmConfig(config);

  return envPath;
}

async function updateLitellmConfig(config) {
  const { backend, agentModels, apiKey, embedding } = config;

  console.log('\nUpdating litellm_config.yaml...');


  const configPath = path.join(process.cwd(), 'litellm_config.yaml');
  if (!fs.existsSync(configPath)) {
    console.log('  litellm_config.yaml not found - will use default');
    return;
  }

  // Read and update the config
  let content = fs.readFileSync(configPath, 'utf8');

  // Update default model
  content = content.replace(/default_model: .*/, `default_model: ${agentModels.steward}`);

  // Add model entry if backend is cloud-based
  if (backend.key !== 'ollama') {
    const modelEntry = `
  - model_name: ${agentModels.steward}
    litellm_params:
      model: ${backend.key}/${agentModels.steward}
      api_key: os.environ/${backend.apiKey}
      api_base: ${backend.baseUrl}
      num_retries: 2
`;
    // Insert after model_list:
    content = content.replace('model_list:', `model_list:${modelEntry}`);
  }

  fs.writeFileSync(configPath, content);
  console.log('  litellm_config.yaml updated');
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🦞 Heretek OpenClaw - Deployment Configurator');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('This wizard will configure:');
  console.log('  1) Model backend (Ollama, MiniMax, OpenAI, etc.)');
  console.log('  2) Individual models per agent');
  console.log('  3) Failover configuration');
  console.log('  4) Embedding model');
  console.log('');
  console.log('Press Ctrl+C to cancel at any time.');
  console.log('');

  const confirm = await question('Begin configuration? [Y/n]: ');
  if (confirm.toLowerCase() !== 'y' && confirm.trim() !== '') {
    console.log('Configuration cancelled.');
    rl.close();
    return;
  }

  // Step 1: Select backend
  const backend = await selectBackend();

  // Step 2: Configure API key (if needed)
  const apiKey = await configureApiKey(backend);

  // Step 3: Configure agent models
  const agentModels = await configureAgentModels(backend);

  // Step 4: Configure failover
  const failover = await configureFailover(backend);

  // Step 5: Configure embedding
  const embedding = await configureEmbedding(backend);

  // Assemble configuration
  const config = {
    backend,
    apiKey,
    agentModels,
    failover,
    embedding,
    configuredAt: new Date().toISOString()
  };

  // Save configuration
  const envPath = await saveConfiguration(config);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ Configuration Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Config saved to: ${envPath}`);
  console.log('\nNext steps:');
  console.log('  1) Edit .env to add API keys if needed');
  console.log('  2) Run: docker compose up -d');
  console.log('  3) Access UI: http://localhost:4000');
  console.log('\nAgent model assignments:');

  for (const [agentId, model] of Object.entries(agentModels)) {
    console.log(`  ${agentId}: ${model}`);
  }

  console.log('\n🦞 The thought that never ends.\n');

  rl.close();
}

// Run interactively if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Configuration error:', err.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = { BACKENDS, AGENT_MODELS, EMBEDDING_MODELS };
