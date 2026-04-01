/**
 * Agents Command
 * 
 * Manage OpenClaw agents including list, start, stop, and configure.
 */

import { Command } from 'commander';
import axios from 'axios';
import log from '../lib/logger.js';
import { promptSelect, promptConfirm } from '../lib/prompts.js';

const command = new Command('agents');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:18789';

command
  .description('Manage agents')
  .addCommand(new Command('list')
    .description('List all agents')
    .option('--json', 'Output as JSON')
    .action((options) => handleAgentsList(options))
  )
  .addCommand(new Command('start')
    .description('Start an agent')
    .argument('<agent>', 'Agent ID to start')
    .option('--model <model>', 'Model to assign')
    .action((agent, options) => handleAgentsStart(agent, options))
  )
  .addCommand(new Command('stop')
    .description('Stop an agent')
    .argument('<agent>', 'Agent ID to stop')
    .action((agent) => handleAgentsStop(agent))
  )
  .addCommand(new Command('status')
    .description('Show agent status')
    .argument('[agent]', 'Specific agent ID (optional)')
    .option('--json', 'Output as JSON')
    .action((agent, options) => handleAgentsStatus(agent, options))
  )
  .addCommand(new Command('configure')
    .description('Configure agent model')
    .argument('<agent>', 'Agent ID to configure')
    .option('--model <model>', 'Model to assign')
    .option('--primary <model>', 'Primary model')
    .option('--failover <model>', 'Failover model')
    .action((agent, options) => handleAgentsConfigure(agent, options))
  )
  .addCommand(new Command('models')
    .description('List available models')
    .option('--json', 'Output as JSON')
    .action((options) => handleAgentsModels(options))
  );

/**
 * Handle agents list
 */
async function handleAgentsList(options) {
  log.section('Registered Agents');

  try {
    const response = await axios.get(`${GATEWAY_URL}/v1/agents`, {
      timeout: 5000,
    });

    const agents = response.data?.agents || [];

    if (options.json) {
      console.log(JSON.stringify(agents, null, 2));
      return;
    }

    if (agents.length === 0) {
      console.log('  No agents registered');
      return;
    }

    console.log('  ┌─────────────────┬─────────────────┬─────────────────┐');
    console.log('  │ Agent           │ Role            │ Status          │');
    console.log('  ├─────────────────┼─────────────────┼─────────────────┤');

    for (const agent of agents) {
      const name = (agent.agent_name || agent.name || 'unknown').substring(0, 15).padEnd(15);
      const role = (agent.role || 'unknown').substring(0, 15).padEnd(15);
      const status = (agent.status || 'active').substring(0, 15).padEnd(15);
      console.log(`  │ ${name} │ ${role} │ ${status} │`);
    }

    console.log('  └─────────────────┴─────────────────┴─────────────────┘');
    console.log(`\n  Total: ${agents.length} agent(s)`);
  } catch (error) {
    log.error(`Failed to list agents: ${error.message}`);
    console.log('\n  Make sure the Gateway is running and accessible.');
  }
}

/**
 * Handle agents start
 */
async function handleAgentsStart(agent, options) {
  log.section(`Starting Agent: ${agent}`);

  try {
    const payload = {
      agent_id: agent,
      model: options.model,
    };

    await axios.post(`${GATEWAY_URL}/api/v1/agents/${agent}/start`, payload, {
      timeout: 10000,
    });

    log.success(`Agent ${agent} started`);

    if (options.model) {
      log.info(`Model assigned: ${options.model}`);
    }
  } catch (error) {
    log.error(`Failed to start agent: ${error.message}`);
    console.log(`
  To start an agent manually:
    cd agents/${agent}
    npm start
`);
  }
}

/**
 * Handle agents stop
 */
async function handleAgentsStop(agent) {
  log.section(`Stopping Agent: ${agent}`);

  try {
    await axios.post(`${GATEWAY_URL}/api/v1/agents/${agent}/stop`, {}, {
      timeout: 5000,
    });

    log.success(`Agent ${agent} stopped`);
  } catch (error) {
    log.error(`Failed to stop agent: ${error.message}`);
    log.info('You can stop the agent manually by killing its process');
  }
}

/**
 * Handle agents status
 */
async function handleAgentsStatus(agent, options) {
  if (agent) {
    await handleAgentStatusSingle(agent, options);
  } else {
    await handleAgentsList(options);
  }
}

/**
 * Handle single agent status
 */
async function handleAgentStatusSingle(agent, options) {
  log.section(`Agent Status: ${agent}`);

  try {
    const response = await axios.get(`${GATEWAY_URL}/api/v1/agents/${agent}`, {
      timeout: 5000,
    });

    const agentData = response.data;

    if (options.json) {
      console.log(JSON.stringify(agentData, null, 2));
      return;
    }

    console.log(`
  ID:        ${agentData.id || agent}
  Name:      ${agentData.name || 'unknown'}
  Role:      ${agentData.role || 'unknown'}
  Status:    ${agentData.status || 'unknown'}
  Model:     ${agentData.model || 'not assigned'}
  Port:      ${agentData.port || 'N/A'}
  
  Last Active: ${agentData.lastActive || 'never'}
  Memory:      ${agentData.memory || 'N/A'}
`);
  } catch (error) {
    log.error(`Failed to get agent status: ${error.message}`);
  }
}

/**
 * Handle agents configure
 */
async function handleAgentsConfigure(agent, options) {
  log.section(`Configuring Agent: ${agent}`);

  if (!options.model && !options.primary && !options.failover) {
    // Interactive mode
    const models = await getAvailableModels();
    
    const selectedModel = await promptSelect(
      'Select model for this agent:',
      models.map(m => ({ name: m, value: m }))
    );

    options.model = selectedModel;
  }

  try {
    const payload = {
      model: options.model,
      primary: options.primary,
      failover: options.failover,
    };

    await axios.put(`${GATEWAY_URL}/api/v1/agents/${agent}/model`, payload, {
      timeout: 5000,
    });

    log.success(`Agent ${agent} configured`);

    if (options.model) log.info(`Model: ${options.model}`);
    if (options.primary) log.info(`Primary: ${options.primary}`);
    if (options.failover) log.info(`Failover: ${options.failover}`);
  } catch (error) {
    log.error(`Failed to configure agent: ${error.message}`);
  }
}

/**
 * Handle agents models
 */
async function handleAgentsModels(options) {
  log.section('Available Models');

  try {
    const models = await getAvailableModels();

    if (options.json) {
      console.log(JSON.stringify(models, null, 2));
      return;
    }

    if (models.length === 0) {
      console.log('  No models available');
      return;
    }

    // Group by provider
    const grouped = {};
    for (const model of models) {
      const [provider] = model.split('/');
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(model);
    }

    for (const [provider, providerModels] of Object.entries(grouped)) {
      console.log(`\n  ${provider.toUpperCase()}:`);
      providerModels.forEach(m => console.log(`    - ${m}`));
    }
  } catch (error) {
    log.error(`Failed to list models: ${error.message}`);
  }
}

/**
 * Get available models from LiteLLM
 */
async function getAvailableModels() {
  try {
    const response = await axios.get(`${process.env.LITELLM_URL || 'http://localhost:4000'}/v1/models`, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${process.env.LITELLM_MASTER_KEY || 'heretek-master-key-change-me'}`,
      },
    });

    return response.data?.data?.map(m => m.id) || [];
  } catch {
    // Return default models
    return [
      'ollama/llama2',
      'openai/gpt-4o',
      'anthropic/claude-sonnet-4-20250514',
      'google/gemini-2.5-pro',
      'minimax/minimax-abab6.5s',
      'zai/glm-5-1',
    ];
  }
}

export default command;
