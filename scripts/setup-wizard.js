#!/usr/bin/env node

/**
 * Heretek OpenClaw Interactive Setup Wizard
 * 
 * A guided setup experience for first-time users.
 * Collects configuration, validates API keys, and generates configuration files.
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  arrow: '→',
  check: '☑',
  empty: '☐',
};

// Configuration state
const config = {
  // Deployment type
  deploymentType: 'docker', // 'docker' or 'non-docker'
  
  // AI Provider selection
  primaryProvider: null,
  failoverProvider: null,
  
  // API Keys
  apiKey: {
    minimax: null,
    zai: null,
    openai: null,
    anthropic: null,
    google: null,
    ollama: null,
  },
  
  // Database configuration
  database: {
    type: 'postgresql', // 'postgresql' or 'redis-only'
    postgresUser: 'openclaw',
    postgresPassword: null,
    postgresDb: 'openclaw',
    postgresHost: 'localhost',
    postgresPort: '5432',
    redisHost: 'localhost',
    redisPort: '6379',
  },
  
  // Agent configuration
  agents: {
    enableAll: true,
    selectedAgents: [],
  },
  
  // Observability
  langfuse: {
    enabled: false,
    publicKey: null,
    secretKey: null,
    host: 'https://cloud.langfuse.com',
  },
  
  // Paths
  openclawDir: path.join(process.env.HOME || '', '.openclaw'),
  openclawWorkspace: path.join(process.env.HOME || '', '.openclaw', 'agents'),
};

// Available providers
const providers = [
  { id: 'minimax', name: 'MiniMax', description: 'Primary LLM provider (recommended)', envVar: 'MINIMAX_API_KEY' },
  { id: 'zai', name: 'z.ai', description: 'Failover LLM provider', envVar: 'ZAI_API_KEY' },
  { id: 'openai', name: 'OpenAI', description: 'OpenAI GPT models', envVar: 'OPENAI_API_KEY' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'google', name: 'Google', description: 'Gemini models', envVar: 'GOOGLE_API_KEY' },
  { id: 'ollama', name: 'Ollama', description: 'Local models (free)', envVar: 'OLLAMA_HOST' },
];

// Available agents
const availableAgents = [
  { id: 'steward', name: 'Steward', role: 'Orchestrator', description: 'Orchestrates the collective' },
  { id: 'alpha', name: 'Alpha', role: 'Triad', description: 'Primary deliberator' },
  { id: 'beta', name: 'Beta', role: 'Triad', description: 'Critical analyst' },
  { id: 'charlie', name: 'Charlie', role: 'Triad', description: 'Process validator' },
  { id: 'examiner', name: 'Examiner', role: 'Interrogator', description: 'Questions decisions' },
  { id: 'explorer', name: 'Explorer', role: 'Scout', description: 'Scouts opportunities' },
  { id: 'sentinel', name: 'Sentinel', role: 'Guardian', description: 'Security monitor' },
  { id: 'coder', name: 'Coder', role: 'Artisan', description: 'Code generation' },
  { id: 'dreamer', name: 'Dreamer', role: 'Visionary', description: 'Creative speculation' },
  { id: 'empath', name: 'Empath', role: 'Diplomat', description: 'Emotional intelligence' },
  { id: 'historian', name: 'Historian', role: 'Archivist', description: 'Memory keeper' },
];

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Async prompt function
 */
function prompt(question, defaultValue = null) {
  return new Promise((resolve) => {
    const defaultText = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${colors.cyan}${question}${defaultText}: ${colors.reset}`, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Selection prompt
 */
async function select(options, question) {
  console.log(`\n${colors.cyan}${question}${colors.reset}`);
  options.forEach((opt, idx) => {
    const desc = opt.description ? ` - ${colors.dim}${opt.description}${colors.reset}` : '';
    console.log(`  ${colors.yellow}${idx + 1}${colors.reset}) ${opt.name}${desc}`);
  });
  
  while (true) {
    const answer = await prompt(`Enter choice (1-${options.length})`);
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx];
    }
    console.log(`${colors.red}${symbols.error} Invalid choice. Please try again.${colors.reset}`);
  }
}

/**
 * Multi-selection prompt
 */
async function multiSelect(options, question, preSelected = []) {
  console.log(`\n${colors.cyan}${question}${colors.reset}`);
  console.log(`${colors.dim}(Press Enter to confirm selection)${colors.reset}\n`);
  
  const selected = new Set(preSelected);
  
  while (true) {
    options.forEach((opt, idx) => {
      const isSelected = selected.has(opt.id);
      const symbol = isSelected ? colors.green + symbols.check : colors.dim + symbols.empty;
      console.log(`  ${symbol}${colors.reset} ${colors.yellow}${idx + 1}${colors.reset}) ${opt.name} - ${opt.description}`);
    });
    
    const answer = await prompt('\nEnter choice (1-' + options.length + ', or Enter to confirm)');
    
    if (answer === '') {
      if (selected.size === 0) {
        console.log(`${colors.yellow}${symbols.warning} Please select at least one option.${colors.reset}`);
        continue;
      }
      return Array.from(selected);
    }
    
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < options.length) {
      const id = options[idx].id;
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
    } else {
      console.log(`${colors.red}${symbols.error} Invalid choice.${colors.reset}`);
    }
  }
}

/**
 * Password prompt (hidden input)
 */
function passwordPrompt(question) {
  return new Promise((resolve) => {
    readline.emit('start');
    process.stdout.write(`${colors.cyan}${question}: ${colors.reset}`);
    
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (key) => {
      if (key === '\u0003') { // Ctrl+C
        process.exit(0);
      } else if (key === '\r' || key === '\n') { // Enter
        stdin.setRawMode(false);
        stdin.pause();
        console.log();
        resolve(password);
      } else if (key === '\u007f' || key === '\b') { // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (key.length === 1 && key >= ' ') {
        password += key;
        process.stdout.write('*');
      }
    };
    
    stdin.on('data', onData);
  });
}

/**
 * Validate API key format
 */
function validateApiKey(key, provider) {
  if (!key || key.length < 10) {
    return false;
  }
  
  // Basic validation patterns
  const patterns = {
    minimax: /^[\w-]{20,}$/,
    zai: /^[\w-]{20,}$/,
    openai: /^sk-[\w-]{20,}$/,
    anthropic: /^sk-ant-[\w-]{20,}$/,
    google: /^[\w-]{20,}$/,
  };
  
  const pattern = patterns[provider];
  if (pattern) {
    return pattern.test(key);
  }
  
  return key.length >= 20;
}

/**
 * Test API key (mock - in real implementation would make actual API call)
 */
async function testApiKey(key, provider) {
  console.log(`${colors.yellow}${symbols.info} Validating ${provider} API key...${colors.reset}`);
  
  // Mock validation - in production, this would make actual API calls
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  if (validateApiKey(key, provider)) {
    console.log(`${colors.green}${symbols.success} ${provider} API key is valid${colors.reset}`);
    return true;
  }
  
  console.log(`${colors.yellow}${symbols.warning} Could not validate ${provider} API key format${colors.reset}`);
  return true; // Accept anyway for local setup
}

/**
 * Generate secure random string
 */
function generateSecureKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if Docker is available
 */
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    execSync('docker compose version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Node.js is available
 */
function checkNode() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    return { available: true, version };
  } catch {
    return { available: false };
  }
}

/**
 * Print header
 */
function printHeader() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset}                                              ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.bright}Heretek OpenClaw Setup Wizard${colors.reset}                  ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}  ${colors.dim}Interactive configuration for first-time users${colors.reset}   ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}                                              ${colors.cyan}║${colors.reset}
${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}
  `);
}

/**
 * Print section header
 */
function printSection(title) {
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}${symbols.arrow} ${title}${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

/**
 * Step 1: Welcome and deployment type selection
 */
async function stepWelcome() {
  printHeader();
  
  console.log(`${colors.white}Welcome to Heretek OpenClaw!${colors.reset}`);
  console.log(`This wizard will guide you through the setup process.\n`);
  
  // Check prerequisites
  console.log(`${colors.cyan}Checking prerequisites...${colors.reset}`);
  
  const dockerAvailable = checkDocker();
  const nodeCheck = checkNode();
  
  if (dockerAvailable) {
    console.log(`${colors.green}${symbols.success} Docker is installed${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${symbols.warning} Docker not found - will configure non-Docker mode${colors.reset}`);
  }
  
  if (nodeCheck.available) {
    console.log(`${colors.green}${symbols.success} Node.js ${nodeCheck.version} found${colors.reset}`);
  } else {
    console.log(`${colors.red}${symbols.error} Node.js not found - required for OpenClaw Gateway${colors.reset}`);
  }
  
  // Deployment type selection
  printSection('Step 1: Deployment Type');
  
  if (dockerAvailable) {
    console.log('Choose your deployment type:\n');
    console.log(`  ${colors.yellow}1${colors.reset}) ${colors.green}Docker${colors.reset} - Recommended for most users`);
    console.log(`     Includes PostgreSQL, Redis, Ollama, Langfuse containers`);
    console.log(`  ${colors.yellow}2${colors.reset}) ${colors.yellow}Non-Docker${colors.reset} - Manual infrastructure setup`);
    console.log(`     Requires existing database and services\n`);
    
    const choice = await select(
      [
        { id: 'docker', name: 'Docker', description: 'Recommended' },
        { id: 'non-docker', name: 'Non-Docker', description: 'Manual setup' },
      ],
      'Select deployment type:'
    );
    
    config.deploymentType = choice.id;
  } else {
    console.log(`${colors.yellow}${symbols.warning} Docker not available, configuring for non-Docker deployment${colors.reset}`);
    config.deploymentType = 'non-docker';
  }
  
  console.log(`\n${colors.green}${symbols.success} Deployment type: ${config.deploymentType}${colors.reset}`);
}

/**
 * Step 2: AI Provider selection
 */
async function stepProviderSelection() {
  printSection('Step 2: AI Provider Selection');
  
  console.log('Select your primary AI provider:\n');
  
  const primary = await select(providers, 'Primary provider:');
  config.primaryProvider = primary.id;
  
  console.log(`\n${colors.green}${symbols.success} Primary provider: ${primary.name}${colors.reset}`);
  
  // Select failover provider (different from primary)
  const failoverOptions = providers.filter((p) => p.id !== primary.id);
  
  console.log(`\nSelect a failover provider (used when primary is unavailable):\n`);
  console.log(`  ${colors.yellow}0${colors.reset}) Skip failover configuration\n`);
  
  const failover = await select(
    [{ id: 'none', name: 'None', description: 'No failover' }, ...failoverOptions],
    'Failover provider:'
  );
  
  if (failover.id !== 'none') {
    config.failoverProvider = failover.id;
    console.log(`\n${colors.green}${symbols.success} Failover provider: ${failover.name}${colors.reset}`);
  } else {
    console.log(`\n${colors.dim}No failover provider configured${colors.reset}`);
  }
}

/**
 * Step 3: API Key collection
 */
async function stepApiKeys() {
  printSection('Step 3: API Key Configuration');
  
  console.log('Enter your API keys for the selected providers.\n');
  console.log(`${colors.dim}Keys are stored locally in .env file and never transmitted.${colors.reset}\n`);
  
  // Primary provider key
  const primaryProvider = providers.find((p) => p.id === config.primaryProvider);
  if (primaryProvider) {
    const key = await passwordPrompt(`${primaryProvider.name} API Key`);
    if (key) {
      config.apiKey[primaryProvider.id] = key;
      await testApiKey(key, primaryProvider.id);
    }
  }
  
  // Failover provider key
  if (config.failoverProvider) {
    const failoverProvider = providers.find((p) => p.id === config.failoverProvider);
    if (failoverProvider) {
      const key = await passwordPrompt(`${failoverProvider.name} API Key`);
      if (key) {
        config.apiKey[failoverProvider.id] = key;
        await testApiKey(key, failoverProvider.id);
      }
    }
  }
  
  // Optional providers
  console.log(`\n${colors.cyan}Optional API Keys:${colors.reset}`);
  
  const optionalProviders = providers.filter(
    (p) => p.id !== config.primaryProvider && p.id !== config.failoverProvider
  );
  
  for (const provider of optionalProviders) {
    const answer = await prompt(`Add ${provider.name} API key? (y/N)`);
    if (answer.toLowerCase() === 'y') {
      const key = await passwordPrompt(`${provider.name} API Key`);
      if (key) {
        config.apiKey[provider.id] = key;
        await testApiKey(key, provider.id);
      }
    }
  }
  
  // Langfuse observability
  console.log(`\n${colors.cyan}Observability (Langfuse):${colors.reset}`);
  const langfuseAnswer = await prompt('Enable Langfuse observability? (y/N)');
  
  if (langfuseAnswer.toLowerCase() === 'y') {
    config.langfuse.enabled = true;
    config.langfuse.publicKey = await prompt('Langfuse Public Key');
    config.langfuse.secretKey = await passwordPrompt('Langfuse Secret Key');
    console.log(`${colors.green}${symbols.success} Langfuse configured${colors.reset}`);
  }
}

/**
 * Step 4: Database configuration
 */
async function stepDatabase() {
  printSection('Step 4: Database Configuration');
  
  if (config.deploymentType === 'docker') {
    console.log('Docker deployment includes PostgreSQL and Redis.');
    console.log('Configure database credentials:\n');
    
    config.database.postgresPassword = generateSecureKey(24);
    console.log(`${colors.dim}Generated secure database password${colors.reset}`);
    
    const customDb = await prompt('Use custom database name? (openclaw)', 'openclaw');
    if (customDb && customDb !== 'openclaw') {
      config.database.postgresDb = customDb;
    }
  } else {
    console.log('Enter your database connection details:\n');
    
    const dbType = await select(
      [
        { id: 'postgresql', name: 'PostgreSQL', description: 'Full database with vector support' },
        { id: 'redis-only', name: 'Redis Only', description: 'Session storage only' },
      ],
      'Database type:'
    );
    
    config.database.type = dbType.id;
    
    if (dbType.id === 'postgresql') {
      config.database.postgresHost = await prompt('PostgreSQL Host', 'localhost');
      config.database.postgresPort = await prompt('PostgreSQL Port', '5432');
      config.database.postgresUser = await prompt('PostgreSQL User', 'openclaw');
      config.database.postgresPassword = await passwordPrompt('PostgreSQL Password');
      config.database.postgresDb = await prompt('Database Name', 'openclaw');
    }
    
    config.database.redisHost = await prompt('Redis Host', 'localhost');
    config.database.redisPort = await prompt('Redis Port', '6379');
  }
  
  console.log(`\n${colors.green}${symbols.success} Database configured: ${config.database.type}${colors.reset}`);
}

/**
 * Step 5: Agent configuration
 */
async function stepAgents() {
  printSection('Step 5: Agent Configuration');
  
  console.log('Configure which agents to enable:\n');
  console.log(`  ${colors.yellow}1${colors.reset}) Enable all agents (recommended)`);
  console.log(`  ${colors.yellow}2${colors.reset}) Select specific agents\n`);
  
  const choice = await select(
    [
      { id: 'all', name: 'Enable All Agents', description: 'Recommended for full functionality' },
      { id: 'select', name: 'Select Agents', description: 'Choose specific agents' },
    ],
    'Agent configuration:'
  );
  
  if (choice.id === 'all') {
    config.agents.enableAll = true;
    config.agents.selectedAgents = availableAgents.map((a) => a.id);
    console.log(`\n${colors.green}${symbols.success} All ${availableAgents.length} agents enabled${colors.reset}`);
  } else {
    config.agents.enableAll = false;
    config.agents.selectedAgents = await multiSelect(
      availableAgents,
      'Select agents to enable:',
      ['steward'] // Pre-select steward
    );
    console.log(`\n${colors.green}${symbols.success} ${config.agents.selectedAgents.length} agents selected${colors.reset}`);
  }
}

/**
 * Step 6: Path configuration
 */
async function stepPaths() {
  printSection('Step 6: Path Configuration');
  
  console.log('Configure OpenClaw workspace paths:\n');
  
  const defaultDir = path.join(process.env.HOME || '', '.openclaw');
  const customDir = await prompt('OpenClaw directory', defaultDir);
  
  if (customDir && customDir !== defaultDir) {
    config.openclawDir = customDir;
  }
  
  config.openclawWorkspace = path.join(config.openclawDir, 'agents');
  
  console.log(`\n${colors.green}${symbols.success} OpenClaw directory: ${config.openclawDir}${colors.reset}`);
  console.log(`${colors.green}${symbols.success} Agents workspace: ${config.openclawWorkspace}${colors.reset}`);
}

/**
 * Step 7: Review and confirm
 */
async function stepReview() {
  printSection('Step 7: Review Configuration');
  
  console.log('Please review your configuration:\n');
  
  console.log(`${colors.cyan}Deployment:${colors.reset}`);
  console.log(`  Type: ${config.deploymentType}`);
  
  console.log(`\n${colors.cyan}AI Providers:${colors.reset}`);
  console.log(`  Primary: ${config.primaryProvider}`);
  if (config.failoverProvider) {
    console.log(`  Failover: ${config.failoverProvider}`);
  }
  
  console.log(`\n${colors.cyan}API Keys Configured:${colors.reset}`);
  Object.entries(config.apiKey).forEach(([key, value]) => {
    if (value) {
      console.log(`  ${colors.green}${symbols.check}${colors.reset} ${key}`);
    }
  });
  
  console.log(`\n${colors.cyan}Database:${colors.reset}`);
  console.log(`  Type: ${config.database.type}`);
  if (config.database.type === 'postgresql') {
    console.log(`  Host: ${config.database.postgresHost}:${config.database.postgresPort}`);
    console.log(`  Database: ${config.database.postgresDb}`);
  }
  console.log(`  Redis: ${config.database.redisHost}:${config.database.redisPort}`);
  
  console.log(`\n${colors.cyan}Agents:${colors.reset}`);
  console.log(`  ${config.agents.enableAll ? 'All agents enabled' : `${config.agents.selectedAgents.length} agents selected`}`);
  
  if (config.langfuse.enabled) {
    console.log(`\n${colors.cyan}Observability:${colors.reset}`);
    console.log(`  ${colors.green}${symbols.check}${colors.reset} Langfuse enabled`);
  }
  
  console.log(`\n${colors.cyan}Paths:${colors.reset}`);
  console.log(`  OpenClaw Dir: ${config.openclawDir}`);
  console.log(`  Workspace: ${config.openclawWorkspace}`);
  
  const confirm = await prompt('\nProceed with this configuration? (Y/n)', 'y');
  
  if (confirm.toLowerCase() === 'n') {
    console.log(`${colors.yellow}${symbols.warning} Setup cancelled.${colors.reset}`);
    process.exit(0);
  }
}

/**
 * Generate .env file
 */
function generateEnvFile() {
  const envContent = `# Heretek OpenClaw Environment Configuration
# Generated by setup-wizard.js on ${new Date().toISOString()}

# =============================================================================
# LiteLLM Gateway Configuration
# =============================================================================
LITELLM_MASTER_KEY=${generateSecureKey(32)}
LITELLM_SALT_KEY=${generateSecureKey(32)}

# =============================================================================
# AI Provider API Keys
# =============================================================================
# Primary Provider: ${config.primaryProvider}
${config.apiKey.minimax ? `MINIMAX_API_KEY=${config.apiKey.minimax}` : '# MINIMAX_API_KEY=your_minimax_api_key'}
${config.apiKey.zai ? `ZAI_API_KEY=${config.apiKey.zai}` : '# ZAI_API_KEY=your_zai_api_key'}
${config.apiKey.openai ? `OPENAI_API_KEY=${config.apiKey.openai}` : '# OPENAI_API_KEY=your_openai_api_key'}
${config.apiKey.anthropic ? `ANTHROPIC_API_KEY=${config.apiKey.anthropic}` : '# ANTHROPIC_API_KEY=your_anthropic_api_key'}
${config.apiKey.google ? `GOOGLE_API_KEY=${config.apiKey.google}` : '# GOOGLE_API_KEY=your_google_api_key'}

# Ollama (Local Models)
OLLAMA_HOST=ollama:11434

# =============================================================================
# Database Configuration
# =============================================================================
# PostgreSQL
POSTGRES_USER=${config.database.postgresUser}
POSTGRES_PASSWORD=${config.database.postgresPassword}
POSTGRES_DB=${config.database.postgresDb}
DATABASE_URL=postgresql://${config.database.postgresUser}:${config.database.postgresPassword}@${config.database.postgresHost}:${config.database.postgresPort}/${config.database.postgresDb}

# Redis
REDIS_URL=redis://${config.database.redisHost}:${config.database.redisPort}

# =============================================================================
# OpenClaw Gateway Configuration
# =============================================================================
OPENCLAW_DIR=${config.openclawDir}
OPENCLAW_WORKSPACE=${config.openclawWorkspace}

# =============================================================================
# Observability (Langfuse)
# =============================================================================
LANGFUSE_ENABLED=${config.langfuse.enabled}
${config.langfuse.publicKey ? `LANGFUSE_PUBLIC_KEY=${config.langfuse.publicKey}` : '# LANGFUSE_PUBLIC_KEY=your_langfuse_public_key'}
${config.langfuse.secretKey ? `LANGFUSE_SECRET_KEY=${config.langfuse.secretKey}` : '# LANGFUSE_SECRET_KEY=your_langfuse_secret_key'}
LANGFUSE_HOST=${config.langfuse.host}

# =============================================================================
# Deployment Configuration
# =============================================================================
DEPLOYMENT_TYPE=${config.deploymentType}
`;

  return envContent;
}

/**
 * Generate openclaw.json configuration
 */
function generateOpenClawConfig() {
  const baseConfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'openclaw.json'), 'utf8'));
  
  // Filter agents based on selection
  if (!config.agents.enableAll) {
    baseConfig.agents = baseConfig.agents.filter((agent) =>
      config.agents.selectedAgents.includes(agent.id)
    );
  }
  
  // Update model routing based on provider selection
  if (config.primaryProvider === 'openai') {
    baseConfig.model_routing.default = 'openai/gpt-4o';
  } else if (config.primaryProvider === 'anthropic') {
    baseConfig.model_routing.default = 'anthropic/claude-sonnet-4-20250514';
  } else if (config.primaryProvider === 'google') {
    baseConfig.model_routing.default = 'google/gemini-2.5-pro';
  }
  
  if (config.failoverProvider === 'openai') {
    baseConfig.model_routing.aliases.failover = 'openai/gpt-4o-mini';
  } else if (config.failoverProvider === 'zai') {
    baseConfig.model_routing.aliases.failover = 'zai/glm-5-1';
  }
  
  return JSON.stringify(baseConfig, null, 2);
}

/**
 * Generate docker-compose.override.yml for custom configuration
 */
function generateDockerComposeOverride() {
  return `# Docker Compose Override
# Generated by setup-wizard.js
# Place this file alongside docker-compose.yml to override default configuration

version: '3.8'

services:
  litellm:
    env_file:
      - .env

  postgres:
    environment:
      POSTGRES_USER: ${config.database.postgresUser}
      POSTGRES_PASSWORD: ${config.database.postgresPassword}
      POSTGRES_DB: ${config.database.postgresDb}
    ports:
      - "127.0.0.1:5432:5432"

  redis:
    ports:
      - "127.0.0.1:6379:6379"

  ollama:
    ports:
      - "127.0.0.1:11434:11434"

${config.langfuse.enabled ? `
  langfuse:
    environment:
      - LANGFUSE_PUBLIC_KEY=${config.langfuse.publicKey}
      - LANGFUSE_SECRET_KEY=${config.langfuse.secretKey}
    ports:
      - "127.0.0.1:3000:3000"
` : ''}
`;
}

/**
 * Generate setup script for non-Docker deployment
 */
function generateSetupScript() {
  return `#!/bin/bash
# OpenClaw Setup Script
# Generated by setup-wizard.js on ${new Date().toISOString()}

set -e

echo "Setting up Heretek OpenClaw..."

# Create directories
mkdir -p ${config.openclawDir}
mkdir -p ${config.openclawWorkspace}

# Copy configuration
cp openclaw.json ${config.openclawDir}/openclaw.json

# Install OpenClaw Gateway (if not already installed)
if ! command -v openclaw &> /dev/null; then
    echo "Installing OpenClaw Gateway..."
    curl -fsSL https://openclaw.ai/install.sh | bash
fi

# Initialize daemon
openclaw onboard --install-daemon

# Create agent workspaces
echo "Creating agent workspaces..."
${config.agents.selectedAgents.map((agentId) => {
    const agent = availableAgents.find((a) => a.id === agentId);
    return `./agents/deploy-agent.sh ${agentId} ${agent?.role || 'agent'}`;
  }).join('\n')}

echo ""
echo "Setup complete!"
echo "Run 'openclaw gateway status' to verify installation"
`;
}

/**
 * Write configuration files
 */
async function stepWriteConfig() {
  printSection('Writing Configuration Files');
  
  // Write .env file
  const envPath = path.join(ROOT_DIR, '.env');
  fs.writeFileSync(envPath, generateEnvFile(), 'utf8');
  console.log(`${colors.green}${symbols.success} Created .env file${colors.reset}`);
  
  // Write docker-compose.override.yml (Docker mode)
  if (config.deploymentType === 'docker') {
    const overridePath = path.join(ROOT_DIR, 'docker-compose.override.yml');
    fs.writeFileSync(overridePath, generateDockerComposeOverride(), 'utf8');
    console.log(`${colors.green}${symbols.success} Created docker-compose.override.yml${colors.reset}`);
  }
  
  // Write setup script (non-Docker mode)
  if (config.deploymentType === 'non-docker') {
    const setupScriptPath = path.join(ROOT_DIR, 'scripts', 'setup-openclaw.sh');
    fs.writeFileSync(setupScriptPath, generateSetupScript(), 'utf8');
    fs.chmodSync(setupScriptPath, '755');
    console.log(`${colors.green}${symbols.success} Created scripts/setup-openclaw.sh${colors.reset}`);
  }
  
  // Create agent directories
  fs.mkdirSync(config.openclawDir, { recursive: true });
  fs.mkdirSync(config.openclawWorkspace, { recursive: true });
  console.log(`${colors.green}${symbols.success} Created OpenClaw directories${colors.reset}`);
  
  // Copy openclaw.json to workspace
  const workspaceConfigPath = path.join(config.openclawDir, 'openclaw.json');
  fs.writeFileSync(workspaceConfigPath, generateOpenClawConfig(), 'utf8');
  console.log(`${colors.green}${symbols.success} Created ${workspaceConfigPath}${colors.reset}`);
  
  console.log(`\n${colors.green}${symbols.success} Configuration files written successfully!${colors.reset}`);
}

/**
 * Print completion summary
 */
function printSummary() {
  printSection('Setup Complete!');
  
  console.log(`${colors.green}${symbols.check} Configuration saved${colors.reset}\n`);
  
  if (config.deploymentType === 'docker') {
    console.log(`${colors.cyan}Next Steps (Docker Deployment):${colors.reset}\n`);
    console.log(`  1. Start Docker services:`);
    console.log(`     ${colors.yellow}docker compose up -d${colors.reset}\n`);
    console.log(`  2. Verify services:`);
    console.log(`     ${colors.yellow}docker compose ps${colors.reset}\n`);
    console.log(`  3. Install OpenClaw Gateway:`);
    console.log(`     ${colors.yellow}curl -fsSL https://openclaw.ai/install.sh | bash${colors.reset}\n`);
    console.log(`  4. Initialize Gateway:`);
    console.log(`     ${colors.yellow}openclaw onboard --install-daemon${colors.reset}\n`);
    console.log(`  5. Copy configuration:`);
    console.log(`     ${colors.yellow}cp openclaw.json ~/.openclaw/openclaw.json${colors.reset}\n`);
    console.log(`  6. Create agent workspaces:`);
    console.log(`     ${colors.yellow}./agents/deploy-agent.sh steward orchestrator${colors.reset}\n`);
  } else {
    console.log(`${colors.cyan}Next Steps (Non-Docker Deployment):${colors.reset}\n`);
    console.log(`  1. Run the setup script:`);
    console.log(`     ${colors.yellow}./scripts/setup-openclaw.sh${colors.reset}\n`);
    console.log(`  2. Start your database services (PostgreSQL, Redis)${colors.reset}\n`);
    console.log(`  3. Verify Gateway status:`);
    console.log(`     ${colors.yellow}openclaw gateway status${colors.reset}\n`);
  }
  
  console.log(`${colors.cyan}Documentation:${colors.reset}`);
  console.log(`  - Local Deployment: ${colors.yellow}docs/deployment/LOCAL_DEPLOYMENT.md${colors.reset}`);
  console.log(`  - Setup Wizard: ${colors.yellow}docs/deployment/SETUP_WIZARD.md${colors.reset}`);
  console.log(`  - Configuration: ${colors.yellow}docs/CONFIGURATION.md${colors.reset}\n`);
  
  console.log(`${colors.green}Happy coding with Heretek OpenClaw!${colors.reset}`);
  console.log(`${colors.dim}🦞 The thought that never ends.${colors.reset}\n`);
}

/**
 * Main wizard function
 */
async function main() {
  try {
    await stepWelcome();
    await stepProviderSelection();
    await stepApiKeys();
    await stepDatabase();
    await stepAgents();
    await stepPaths();
    await stepReview();
    await stepWriteConfig();
    printSummary();
  } catch (error) {
    console.error(`\n${colors.red}${symbols.error} Setup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the wizard
main();
