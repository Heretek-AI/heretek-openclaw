#!/usr/bin/env node

/**
 * Agent Model Configuration CLI
 * 
 * Interactive command-line tool for managing per-agent model configurations.
 * Supports listing, setting, validating, and resetting agent model configurations.
 * 
 * Usage:
 *   node scripts/configure-agent-model.js list                    # List all agents and their models
 *   node scripts/configure-agent-model.js set --agent=coder       # Set models for an agent
 *   node scripts/configure-agent-model.js validate                # Validate all configurations
 *   node scripts/configure-agent-model.js reset --agent=coder     # Reset agent to defaults
 *   node scripts/configure-agent-model.js models                  # List available models
 *   node scripts/configure-agent-model.js usage --agent=coder     # Show usage statistics
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const readline = require('readline');

// Import the configuration module
const { AgentModelConfig, createAgentModelConfig, KNOWN_AGENTS } = require('../agents/lib/agent-model-config');

// CLI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`)
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value || true;
    } else if (arg.startsWith('-')) {
      const shortKey = arg.slice(1);
      options[shortKey] = true;
    } else {
      options._ = options._ || [];
      options._.push(arg);
    }
  }

  return { command, options };
}

/**
 * Create readline interface for interactive prompts
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * List all agents and their current model configurations
 */
async function listAgents(config) {
  log.header('Agent Model Configurations');
  
  await config.loadAll();
  const configs = config.getAllConfigs(false);
  
  const agents = Object.keys(configs).sort();
  
  console.log('┌─────────────────┬──────────────────────┬──────────────────────┬─────────────┐');
  console.log('│ Agent           │ Primary Model        │ Fallback Model       │ Role        │');
  console.log('├─────────────────┼──────────────────────┼──────────────────────┼─────────────┤');
  
  for (const agentId of agents) {
    const agentConfig = configs[agentId];
    const primary = agentConfig.model_config?.primary?.model || 'N/A';
    const fallback = agentConfig.model_config?.fallback?.model || 'N/A';
    const role = agentConfig.agent_role || 'unknown';
    
    // Truncate long model names
    const displayAgent = agentId.padEnd(15).slice(0, 15);
    const displayPrimary = primary.length > 20 ? primary.slice(0, 17) + '...' : primary.padEnd(20);
    const displayFallback = fallback.length > 20 ? fallback.slice(0, 17) + '...' : fallback.padEnd(20);
    const displayRole = (role || 'unknown').padEnd(11).slice(0, 11);
    
    console.log(`│ ${displayAgent} │ ${displayPrimary} │ ${displayFallback} │ ${displayRole} │`);
  }
  
  console.log('└─────────────────┴──────────────────────┴──────────────────────┴─────────────┘');
  console.log(`\nTotal agents: ${agents.length}`);
  
  // Show validation status
  const validation = config.validateAll();
  if (validation.errors.length > 0 || validation.warnings.length > 0) {
    log.warn(`Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
    if (validation.errors.length > 0) {
      validation.errors.forEach(e => log.error(e));
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => log.warn(w));
    }
  } else {
    log.success('All configurations valid');
  }
}

/**
 * List available models from LiteLLM config
 */
async function listModels(config) {
  log.header('Available Models');
  
  const litellmConfig = config.litellmConfig;
  
  if (!litellmConfig?.model_list) {
    log.error('No models found in litellm_config.yaml');
    return;
  }
  
  const models = litellmConfig.model_list;
  
  console.log('┌─────────────────────────────────┬──────────────┬──────────────────────────────────────┐');
  console.log('│ Model Name                      │ Max Tokens   │ Description                          │');
  console.log('├─────────────────────────────────┼──────────────┼──────────────────────────────────────┤');
  
  for (const model of models) {
    const name = model.model_name || 'N/A';
    const maxTokens = model.model_info?.max_tokens?.toString() || 'N/A';
    const description = model.model_info?.description || 'N/A';
    
    const displayName = name.length > 31 ? name.slice(0, 28) + '...' : name.padEnd(31);
    const displayTokens = maxTokens.padEnd(12);
    const displayDesc = description.length > 38 ? description.slice(0, 35) + '...' : description.padEnd(38);
    
    console.log(`│ ${displayName} │ ${displayTokens} │ ${displayDesc} │`);
  }
  
  console.log('└─────────────────────────────────┴──────────────┴──────────────────────────────────────┘');
  console.log(`\nTotal models: ${models.length}`);
}

/**
 * Interactive wizard to set models for an agent
 */
async function setAgentModels(config, options) {
  const rl = createInterface();
  
  try {
    await config.loadAll();
    
    let agentId = options.agent;
    
    if (!agentId) {
      // Interactive agent selection
      log.header('Select Agent');
      const configs = config.getAllConfigs(false);
      const agents = Object.keys(configs).sort();
      
      agents.forEach((agent, index) => {
        console.log(`  ${index + 1}. ${agent} (${configs[agent].agent_role || 'unknown'})`);
      });
      
      const selection = await prompt(rl, 'Enter agent number or name: ');
      
      const numSelection = parseInt(selection, 10);
      if (numSelection > 0 && numSelection <= agents.length) {
        agentId = agents[numSelection - 1];
      } else {
        agentId = selection.trim();
      }
    }
    
    if (!agentId) {
      log.error('No agent specified');
      return;
    }
    
    // Load or create agent config
    const agentConfig = await config.load(agentId);
    
    log.header(`Configure Models for: ${agentId}`);
    console.log(`Current role: ${agentConfig.agent_role || 'unknown'}`);
    console.log(`Current primary: ${agentConfig.model_config?.primary?.model || 'N/A'}`);
    console.log(`Current fallback: ${agentConfig.model_config?.fallback?.model || 'N/A'}`);
    console.log();
    
    // Get available models
    const litellmConfig = config.litellmConfig;
    const availableModels = litellmConfig?.model_list?.map(m => m.model_name) || [];
    
    if (availableModels.length === 0) {
      log.error('No models available in litellm_config.yaml');
      return;
    }
    
    // Select primary model
    let primaryModel = options.primary;
    if (!primaryModel) {
      console.log('Available models:');
      availableModels.forEach((model, index) => {
        console.log(`  ${index + 1}. ${model}`);
      });
      
      const selection = await prompt(rl, 'Select primary model (number or name): ');
      const numSelection = parseInt(selection, 10);
      
      if (numSelection > 0 && numSelection <= availableModels.length) {
        primaryModel = availableModels[numSelection - 1];
      } else {
        primaryModel = selection.trim();
      }
    }
    
    if (!primaryModel) {
      log.error('No primary model specified');
      rl.close();
      return;
    }
    
    // Select fallback model
    let fallbackModel = options.fallback;
    if (!fallbackModel) {
      const skipFallback = await prompt(rl, 'Set fallback model? (y/n) [y]: ');
      
      if (skipFallback.toLowerCase() !== 'n') {
        console.log('Available models:');
        availableModels.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model}`);
        });
        
        const selection = await prompt(rl, 'Select fallback model (number or name): ');
        const numSelection = parseInt(selection, 10);
        
        if (numSelection > 0 && numSelection <= availableModels.length) {
          fallbackModel = availableModels[numSelection - 1];
        } else {
          fallbackModel = selection.trim();
        }
      }
    }
    
    // Set max tokens
    let maxTokens = options.max_tokens;
    if (!maxTokens) {
      maxTokens = await prompt(rl, 'Max tokens [8192]: ');
      maxTokens = parseInt(maxTokens, 10) || 8192;
    }
    
    // Set temperature
    let temperature = options.temperature;
    if (!temperature) {
      temperature = await prompt(rl, 'Temperature [0.7]: ');
      temperature = parseFloat(temperature) || 0.7;
    }
    
    // Confirm changes
    console.log();
    log.header('Configuration Summary');
    console.log(`Agent: ${agentId}`);
    console.log(`Primary Model: ${primaryModel}`);
    console.log(`Fallback Model: ${fallbackModel || 'None'}`);
    console.log(`Max Tokens: ${maxTokens}`);
    console.log(`Temperature: ${temperature}`);
    
    const confirm = await prompt(rl, 'Save this configuration? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      log.info('Configuration cancelled');
      rl.close();
      return;
    }
    
    // Build new configuration
    const newConfig = {
      agent_name: agentId,
      agent_role: agentConfig.agent_role || 'unknown',
      agent_description: agentConfig.agent_description || `Configuration for ${agentId}`,
      model_config: {
        primary: {
          model: primaryModel,
          max_tokens: maxTokens,
          temperature: temperature,
          top_p: 0.9
        }
      }
    };
    
    if (fallbackModel) {
      newConfig.model_config.fallback = {
        model: fallbackModel,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 0.9
      };
    }
    
    // Add rate limits and budget
    newConfig.rate_limits = agentConfig.rate_limits || {
      requests_per_minute: 60,
      tokens_per_minute: 50000,
      tokens_per_day: 500000,
      burst_limit: 10
    };
    
    newConfig.budget = agentConfig.budget || {
      daily_limit_usd: 10.00,
      monthly_limit_usd: 200.00,
      alert_threshold: 0.8,
      hard_stop_threshold: 1.0
    };
    
    // Save configuration
    const configPath = path.join(config.configDir, `${agentId}-models.yaml`);
    const yamlContent = yaml.dump(newConfig, { 
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });
    
    fs.writeFileSync(configPath, yamlContent, 'utf8');
    
    log.success(`Configuration saved to ${configPath}`);
    console.log();
    console.log('To apply changes, restart the LiteLLM container or reload the configuration.');
    
  } finally {
    rl.close();
  }
}

/**
 * Validate all agent configurations
 */
async function validateConfigs(config) {
  log.header('Validating Agent Configurations');
  
  await config.loadAll();
  const result = config.validateAll();
  
  console.log(`Configurations validated: ${result.configCount}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log();
  
  if (result.errors.length > 0) {
    log.error('Errors:');
    result.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  if (result.warnings.length > 0) {
    log.warn('Warnings:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
  
  if (result.errors.length === 0 && result.warnings.length === 0) {
    log.success('All configurations are valid!');
  }
  
  // Check API keys
  log.header('API Key Status');
  
  const allConfigs = config.getAllConfigs(false);
  const checkedKeys = new Set();
  
  for (const [agentId, agentConfig] of Object.entries(allConfigs)) {
    const primaryKey = agentConfig.model_config?.primary?.api_key_env;
    const fallbackKey = agentConfig.model_config?.fallback?.api_key_env;
    
    if (primaryKey && !checkedKeys.has(primaryKey)) {
      checkedKeys.add(primaryKey);
      const keyName = primaryKey.replace(/^os\.environ\//, '');
      const hasKey = !!process.env[keyName];
      
      if (hasKey) {
        console.log(`${colors.green}✓${colors.reset} ${keyName}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} ${keyName} ${colors.dim}(not set)${colors.reset}`);
      }
    }
    
    if (fallbackKey && !checkedKeys.has(fallbackKey)) {
      checkedKeys.add(fallbackKey);
      const keyName = fallbackKey.replace(/^os\.environ\//, '');
      const hasKey = !!process.env[keyName];
      
      if (hasKey) {
        console.log(`${colors.green}✓${colors.reset} ${keyName}`);
      } else {
        console.log(`${colors.red}✗${colors.reset} ${keyName} ${colors.dim}(not set)${colors.reset}`);
      }
    }
  }
  
  return result.valid;
}

/**
 * Reset an agent's configuration to defaults
 */
async function resetAgent(config, options) {
  const agentId = options.agent;
  
  if (!agentId) {
    log.error('Please specify an agent with --agent=<name>');
    return;
  }
  
  const configPath = path.join(config.configDir, `${agentId}-models.yaml`);
  
  if (!fs.existsSync(configPath)) {
    log.warn(`No configuration found for agent '${agentId}'`);
    return;
  }
  
  const rl = createInterface();
  
  try {
    const confirm = await prompt(rl, `Reset configuration for '${agentId}' to defaults? (y/n): `);
    
    if (confirm.toLowerCase() !== 'y') {
      log.info('Reset cancelled');
      return;
    }
    
    fs.unlinkSync(configPath);
    log.success(`Configuration reset for agent '${agentId}'`);
    console.log('The agent will use default model settings on next load.');
    
  } finally {
    rl.close();
  }
}

/**
 * Show usage statistics for an agent
 */
async function showUsage(config, options) {
  const agentId = options.agent;
  
  if (!agentId) {
    log.error('Please specify an agent with --agent=<name>');
    return;
  }
  
  await config.load(agentId);
  const agentConfig = config.getConfig(agentId);
  
  log.header(`Usage Configuration: ${agentId}`);
  
  console.log('Rate Limits:');
  console.log(`  Requests per minute: ${agentConfig.rate_limits?.requests_per_minute || 'N/A'}`);
  console.log(`  Tokens per minute: ${agentConfig.rate_limits?.tokens_per_minute || 'N/A'}`);
  console.log(`  Tokens per day: ${agentConfig.rate_limits?.tokens_per_day || 'N/A'}`);
  console.log(`  Burst limit: ${agentConfig.rate_limits?.burst_limit || 'N/A'}`);
  console.log();
  
  console.log('Budget:');
  console.log(`  Daily limit: $${agentConfig.budget?.daily_limit_usd || 'N/A'}`);
  console.log(`  Monthly limit: $${agentConfig.budget?.monthly_limit_usd || 'N/A'}`);
  console.log(`  Alert threshold: ${(agentConfig.budget?.alert_threshold || 0) * 100}%`);
  console.log(`  Hard stop threshold: ${(agentConfig.budget?.hard_stop_threshold || 0) * 100}%`);
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colors.bright}Agent Model Configuration CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node scripts/configure-agent-model.js <command> [options]

${colors.cyan}Commands:${colors.reset}
  list                    List all agents and their model configurations
  models                  List available models from LiteLLM config
  set                     Interactive wizard to set agent models
  validate                Validate all agent configurations
  reset                   Reset an agent's configuration to defaults
  usage                   Show usage/budget configuration for an agent
  help                    Show this help message

${colors.cyan}Options:${colors.reset}
  --agent=<name>          Specify agent name
  --primary=<model>       Set primary model (for set command)
  --fallback=<model>      Set fallback model (for set command)
  --max_tokens=<n>        Set max tokens (for set command)
  --temperature=<f>       Set temperature (for set command)
  -h, --help              Show this help message

${colors.cyan}Examples:${colors.reset}
  # List all agent configurations
  node scripts/configure-agent-model.js list

  # List available models
  node scripts/configure-agent-model.js models

  # Interactive configuration wizard for coder agent
  node scripts/configure-agent-model.js set --agent=coder

  # Set models non-interactively
  node scripts/configure-agent-model.js set --agent=coder --primary=anthropic/claude-3-5-sonnet --fallback=openai/gpt-4o

  # Validate all configurations
  node scripts/configure-agent-model.js validate

  # Reset coder agent to defaults
  node scripts/configure-agent-model.js reset --agent=coder

  # Show usage configuration
  node scripts/configure-agent-model.js usage --agent=coder
`);
}

/**
 * Main entry point
 */
async function main() {
  const { command, options } = parseArgs();
  
  // Create configuration instance
  const config = createAgentModelConfig({
    configDir: path.join(__dirname, '../config/agents'),
    litellmConfigPath: path.join(__dirname, '../litellm_config.yaml')
  });
  
  switch (command) {
    case 'list':
      await listAgents(config);
      break;
      
    case 'models':
      await listModels(config);
      break;
      
    case 'set':
      if (options.primary && options.fallback && options.agent) {
        // Non-interactive mode
        await config.loadAll();
        const agentConfig = await config.load(options.agent);
        
        const newConfig = {
          agent_name: options.agent,
          agent_role: agentConfig.agent_role || 'unknown',
          model_config: {
            primary: {
              model: options.primary,
              max_tokens: parseInt(options.max_tokens, 10) || 8192,
              temperature: parseFloat(options.temperature) || 0.7,
              top_p: 0.9
            },
            fallback: {
              model: options.fallback,
              max_tokens: parseInt(options.max_tokens, 10) || 8192,
              temperature: parseFloat(options.temperature) || 0.7,
              top_p: 0.9
            }
          },
          rate_limits: agentConfig.rate_limits || DEFAULT_CONFIG.rate_limits,
          budget: agentConfig.budget || DEFAULT_CONFIG.budget
        };
        
        const configPath = path.join(config.configDir, `${options.agent}-models.yaml`);
        fs.writeFileSync(configPath, yaml.dump(newConfig, { lineWidth: -1, noRefs: true }), 'utf8');
        log.success(`Configuration saved to ${configPath}`);
      } else {
        await setAgentModels(config, options);
      }
      break;
      
    case 'validate':
      await validateConfigs(config);
      break;
      
    case 'reset':
      await resetAgent(config, options);
      break;
      
    case 'usage':
      await showUsage(config, options);
      break;
      
    case 'help':
    case '-h':
    case '--help':
      showHelp();
      break;
      
    default:
      if (!command) {
        showHelp();
      } else {
        log.error(`Unknown command: ${command}`);
        console.log('Use "help" to see available commands');
        process.exit(1);
      }
  }
}

// Run main function
main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
