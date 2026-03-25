/**
 * Create Agent Command - Create a new liberated agent
 */

import logger from '../lib/logger.js';
import { createAgent, generateTriadIdentity } from '../lib/agent-builder.js';

/**
 * Main create-agent function
 * @param {string} name - Agent name
 * @param {Object} config - Configuration
 */
async function main(name, config) {
  logger.header(`Creating Agent: ${name}`);
  
  const {
    template = 'triad',
    triad = false,
    model,
    modelUrl,
    workspace
  } = config;
  
  const workspaceDir = workspace || config.installation?.workspaceDir || '/home/openclaw/.openclaw/workspace';
  
  try {
    if (triad) {
      // Create triad (3 agents)
      logger.info('Creating triad agents...');
      
      const agents = await generateTriadIdentity(name, {
        workspaceDir,
        model,
        modelUrl,
        triad: true
      });
      
      console.log(`
${logger.success(`Created ${agents.length} triad agents:`)}
${agents.map(a => `  - ${a.name}`).join('\n')}
      `);
    } else {
      // Create single agent
      const result = await createAgent(name, {
        template,
        workspaceDir,
        model,
        modelUrl,
        triad: false
      });
      
      console.log(`
${logger.success('Agent created successfully')}
  Name:      ${result.name}
  Workspace: ${result.workspace}
  Files:     ${result.files.join(', ')}
      `);
    }
  } catch (e) {
    logger.error(`Failed to create agent: ${e.message}`);
    process.exit(1);
  }
}

export default main;