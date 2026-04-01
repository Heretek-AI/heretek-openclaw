/**
 * Init Command
 * 
 * Initialize deployment configuration with interactive setup wizard.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import log from '../lib/logger.js';
import ConfigManager from '../lib/config-manager.js';
import { promptSelect, promptConfirm, promptText, promptPassword, promptSequence } from '../lib/prompts.js';

const command = new Command('init');

command
  .description('Initialize deployment configuration')
  .option('-t, --type <type>', 'Deployment type (docker, bare-metal, kubernetes, aws, gcp, azure)')
  .option('-o, --output <path>', 'Output directory for configuration')
  .option('-n, --non-interactive', 'Non-interactive mode (use defaults)')
  .option('--skip-validation', 'Skip configuration validation')
  .action(async (options) => {
    await handleInit(options);
  });

/**
 * Handle init command
 */
async function handleInit(options) {
  log.section('OpenClaw Initialization');

  const configManager = new ConfigManager({
    rootDir: options.output || process.cwd(),
  });

  // Non-interactive mode
  if (options.nonInteractive) {
    return await initNonInteractive(configManager, options);
  }

  // Interactive mode
  return await initInteractive(configManager, options);
}

/**
 * Interactive initialization
 */
async function initInteractive(configManager, options) {
  log.info('Starting interactive setup wizard...\n');

  const config = {
    version: '2.0.0',
    collective: {
      name: 'OpenClaw Collective',
      description: 'Self-improving autonomous agent collective',
      version: '2.0.0',
    },
    models: {
      providers: {},
    },
    agents: [],
    model_routing: {
      default: '',
      aliases: {
        failover: '',
      },
    },
    deployment: {
      type: options.type || 'docker',
    },
  };

  // Step 1: Welcome
  console.log(`
${log.symbols.info} Welcome to Heretek OpenClaw!
  This wizard will guide you through the setup process.
`);

  // Step 2: Deployment type selection
  log.subheader('Step 1: Deployment Type');
  
  const deploymentType = await promptSelect(
    'Select deployment type:',
    [
      { name: 'Docker (Recommended for local development)', value: 'docker' },
      { name: 'Bare Metal (Direct installation)', value: 'bare-metal' },
      { name: 'Kubernetes (Production)', value: 'kubernetes' },
      { name: 'AWS Cloud', value: 'aws' },
      { name: 'GCP Cloud', value: 'gcp' },
      { name: 'Azure Cloud', value: 'azure' },
    ]
  );

  config.deployment.type = deploymentType;
  log.success(`Deployment type: ${deploymentType}`);

  // Step 3: AI Provider selection
  log.subheader('Step 2: AI Provider Configuration');

  const primaryProvider = await promptSelect(
    'Select primary AI provider:',
    [
      { name: 'MiniMax (Recommended)', value: 'minimax' },
      { name: 'z.ai', value: 'zai' },
      { name: 'OpenAI', value: 'openai' },
      { name: 'Anthropic', value: 'anthropic' },
      { name: 'Google', value: 'google' },
      { name: 'Ollama (Local/Free)', value: 'ollama' },
    ]
  );

  log.success(`Primary provider: ${primaryProvider}`);

  // Set default model based on provider
  const defaultModels = {
    minimax: 'minimax/minimax-abab6.5s',
    zai: 'zai/glm-5-1',
    openai: 'openai/gpt-4o',
    anthropic: 'anthropic/claude-sonnet-4-20250514',
    google: 'google/gemini-2.5-pro',
    ollama: 'ollama/llama2',
  };

  config.model_routing.default = defaultModels[primaryProvider];
  config.model_routing.aliases.failover = defaultModels[primaryProvider];

  // Step 4: API Keys
  log.subheader('Step 3: API Key Configuration');

  const apiKey = await promptPassword(
    `${primaryProvider.toUpperCase()} API Key:`,
    { mask: '*' }
  );

  // Store in environment variable reference
  const envVarMap = {
    minimax: 'MINIMAX_API_KEY',
    zai: 'ZAI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  const envVar = envVarMap[primaryProvider];
  if (envVar) {
    configManager.setEnv(envVar, apiKey);
    log.success(`API key configured for ${primaryProvider}`);
  }

  // Step 5: Agent selection
  log.subheader('Step 4: Agent Configuration');

  const enableAllAgents = await promptConfirm(
    'Enable all agents? (recommended for full functionality)',
    { default: true }
  );

  const availableAgents = [
    { id: 'steward', name: 'Steward', role: 'Orchestrator' },
    { id: 'alpha', name: 'Alpha', role: 'Triad' },
    { id: 'beta', name: 'Beta', role: 'Triad' },
    { id: 'charlie', name: 'Charlie', role: 'Triad' },
    { id: 'examiner', name: 'Examiner', role: 'Interrogator' },
    { id: 'explorer', name: 'Explorer', role: 'Scout' },
    { id: 'historian', name: 'Historian', role: 'Archivist' },
  ];

  if (enableAllAgents) {
    config.agents = availableAgents.map((agent, index) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      model: 'agent/' + agent.id,
      port: 18790 + index,
    }));
    log.success(`All ${config.agents.length} agents enabled`);
  } else {
    const selectedAgents = await promptSelect(
      'Select agents to enable:',
      [
        { name: 'Steward only (minimal)', value: ['steward'] },
        { name: 'Core triad (Steward, Alpha, Beta)', value: ['steward', 'alpha', 'beta'] },
        { name: 'Full collective', value: availableAgents.map(a => a.id) },
      ]
    );

    config.agents = selectedAgents.map((id, index) => {
      const agent = availableAgents.find(a => a.id === id);
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        model: 'agent/' + agent.id,
        port: 18790 + index,
      };
    });
    log.success(`${config.agents.length} agents enabled`);
  }

  // Step 6: Observability
  log.subheader('Step 5: Observability');

  const enableLangfuse = await promptConfirm(
    'Enable Langfuse observability?',
    { default: false }
  );

  if (enableLangfuse) {
    config.observability = {
      langfuse: {
        enabled: true,
        host: 'http://localhost:3000',
      },
    };
    log.success('Langfuse observability enabled');
  }

  // Step 7: Review and confirm
  log.subheader('Step 6: Review Configuration');

  console.log(`
Configuration Summary:
  Deployment Type: ${config.deployment.type}
  Primary Provider: ${primaryProvider}
  Default Model: ${config.model_routing.default}
  Agents: ${config.agents.length}
  Observability: ${enableLangfuse ? 'Enabled' : 'Disabled'}
`);

  const confirm = await promptConfirm('Proceed with this configuration?', { default: true });

  if (!confirm) {
    log.warn('Setup cancelled');
    return;
  }

  // Step 8: Write configuration
  log.subheader('Writing Configuration');

  // Initialize directories
  await configManager.initConfigDir();

  // Save openclaw.json
  await configManager.save(config);

  // Generate .env file
  await configManager.saveEnv();

  log.success('Configuration files written');

  // Step 9: Next steps
  log.subheader('Setup Complete!');

  printNextSteps(config.deployment.type);
}

/**
 * Non-interactive initialization
 */
async function initNonInteractive(configManager, options) {
  log.info('Running non-interactive initialization...');

  const config = configManager.createDefault();
  config.deployment = {
    type: options.type || 'docker',
  };

  // Initialize directories
  await configManager.initConfigDir();

  // Save configuration
  await configManager.save(config);

  // Validate if not skipped
  if (!options.skipValidation) {
    const validation = configManager.validate(config);
    if (!validation.valid) {
      log.error('Configuration validation failed:');
      validation.errors.forEach(e => log.error(`  - ${e}`));
      throw new Error('Configuration validation failed');
    }
    log.success('Configuration validated');
  }

  log.success('Non-interactive initialization complete');
}

/**
 * Print next steps
 */
function printNextSteps(deploymentType) {
  const steps = {
    docker: [
      'Start Docker services: docker compose up -d',
      'Verify services: docker compose ps',
      'Install Gateway: curl -fsSL https://openclaw.ai/install.sh | bash',
      'Initialize Gateway: openclaw onboard --install-daemon',
    ],
    'bare-metal': [
      'Run system setup: sudo ./scripts/install/ubuntu-deps.sh',
      'Install application: npm install --production',
      'Start services: sudo systemctl start openclaw-gateway',
    ],
    kubernetes: [
      'Apply manifests: kubectl apply -f deploy/k8s/',
      'Or use Helm: helm install openclaw ./charts/openclaw',
    ],
  };

  console.log(`
${log.symbols.info} Next Steps:
`);

  const typeSteps = steps[deploymentType] || steps.docker;
  typeSteps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });

  console.log(`
  Documentation:
    - Local Deployment: docs/deployment/LOCAL_DEPLOYMENT.md
    - Setup Wizard: docs/deployment/SETUP_WIZARD.md
    - Configuration: docs/CONFIGURATION.md
`);
}

export default command;
