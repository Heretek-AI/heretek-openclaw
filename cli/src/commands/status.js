/**
 * Status Command
 * 
 * Check deployment status and display service health.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import log from '../lib/logger.js';
import DeploymentManager from '../lib/deployment-manager.js';
import HealthChecker from '../lib/health-checker.js';

const command = new Command('status');

command
  .description('Check deployment status')
  .option('-t, --type <type>', 'Deployment type (auto-detect if not specified)')
  .option('--services', 'Show service status only')
  .option('--agents', 'Show agent status only')
  .option('--resources', 'Show resource usage')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await handleStatus(options);
  });

/**
 * Handle status command
 */
async function handleStatus(options) {
  const manager = new DeploymentManager({
    rootDir: process.cwd(),
    deploymentType: options.type,
  });

  try {
    // Get deployment status
    const status = await manager.status();
    const health = await manager.healthCheck();

    if (options.json) {
      console.log(JSON.stringify({ status, health }, null, 2));
      return;
    }

    // Print status based on options
    if (options.services) {
      printServiceStatus(status);
    } else if (options.agents) {
      printAgentStatus(status);
    } else if (options.resources) {
      printResourceStatus(status);
    } else {
      printFullStatus(status, health);
    }
  } catch (error) {
    log.error(`Failed to get status: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Print full status
 */
function printFullStatus(status, health) {
  log.section('OpenClaw Status');

  // Overall status
  const overallHealthy = health?.healthy || false;
  const statusLine = overallHealthy 
    ? chalk.green('● HEALTHY') 
    : chalk.red('● UNHEALTHY');
  
  console.log(`\n  Status: ${statusLine}`);
  console.log(`  Last Check: ${health?.timestamp || new Date().toISOString()}`);

  // Service status
  printServiceStatus(status);

  // Health check summary
  if (health?.checks) {
    console.log('\n');
    log.subheader('Health Checks');
    
    for (const [service, check] of Object.entries(health.checks)) {
      const symbol = check.healthy ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${symbol} ${service.toUpperCase()}`);
      
      if (!check.healthy && check.error) {
        console.log(`     Error: ${check.error}`);
      }
    }
  }
}

/**
 * Print service status
 */
function printServiceStatus(status) {
  log.subheader('Services');

  const services = [];

  // Docker containers
  if (status.containers) {
    for (const container of status.containers) {
      services.push({
        name: container.Names?.replace('openclaw-', '') || container.name,
        status: container.State || container.status,
        healthy: container.State?.includes('running') || container.status?.includes('running'),
      });
    }
  }

  // Kubernetes pods
  if (status.pods) {
    for (const pod of status.pods) {
      services.push({
        name: pod.name.replace('openclaw-', ''),
        status: pod.status,
        healthy: pod.ready,
      });
    }
  }

  // Systemd services
  if (Array.isArray(status) && status.length > 0) {
    for (const service of status) {
      services.push({
        name: service.name,
        status: service.status,
        healthy: service.active,
      });
    }
  }

  // Print service table
  if (services.length === 0) {
    console.log('  No services found');
    return;
  }

  console.log('  ┌─────────────────┬─────────────────┬──────────┐');
  console.log('  │ Service         │ Status          │ Health   │');
  console.log('  ├─────────────────┼─────────────────┼──────────┤');

  for (const service of services) {
    const name = service.name.padEnd(15);
    const statusText = (service.status || 'unknown').substring(0, 15).padEnd(15);
    const health = service.healthy 
      ? chalk.green('Healthy'.padEnd(8)) 
      : chalk.red('Unhealthy'.padEnd(8));
    
    console.log(`  │ ${name} │ ${statusText} │ ${health} │`);
  }

  console.log('  └─────────────────┴─────────────────┴──────────┘');
}

/**
 * Print agent status
 */
function printAgentStatus(status) {
  log.subheader('Agents');

  const agents = [];

  // From health checks
  if (status.checks?.agents?.agents) {
    for (const agent of status.checks.agents.agents) {
      agents.push({
        name: agent.agent_name || agent,
        status: 'active',
      });
    }
  }

  if (agents.length === 0) {
    console.log('  No agents registered');
    return;
  }

  console.log('  ┌─────────────────┬─────────────────┐');
  console.log('  │ Agent           │ Status          │');
  console.log('  ├─────────────────┼─────────────────┤');

  for (const agent of agents) {
    const name = agent.name.padEnd(15);
    const statusText = chalk.green(agent.status.padEnd(15));
    console.log(`  │ ${name} │ ${statusText} │`);
  }

  console.log('  └─────────────────┴─────────────────┘');
}

/**
 * Print resource status
 */
function printResourceStatus(status) {
  log.subheader('Resource Usage');

  // Docker stats
  if (status.containers) {
    console.log('\n  Container Resources:');
    console.log('  ┌─────────────────┬───────────────┬───────────────┐');
    console.log('  │ Container       │ CPU           │ Memory        │');
    console.log('  ├─────────────────┼───────────────┼───────────────┤');

    for (const container of status.containers) {
      // Note: Actual CPU/Memory would require docker stats
      console.log(`  │ ${(container.Names || 'unknown').padEnd(15)} │ N/A           │ N/A           │`);
    }

    console.log('  └─────────────────┴───────────────┴───────────────┘');
  }

  // Kubernetes resources
  if (status.pods) {
    console.log('\n  Pod Resources:');
    console.log('  ┌─────────────────┬───────────────┬───────────────┐');
    console.log('  │ Pod             │ CPU           │ Memory        │');
    console.log('  ├─────────────────┼───────────────┼───────────────┤');

    for (const pod of status.pods) {
      console.log(`  │ ${pod.name.substring(0, 15).padEnd(15)} │ N/A           │ N/A           │`);
    }

    console.log('  └─────────────────┴───────────────┴───────────────┘');
  }

  console.log('\n  Note: Real-time resource usage requires running containers/pods');
}

export default command;
