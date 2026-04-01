/**
 * Deploy Command
 * 
 * Deploy OpenClaw using the configured deployment type.
 */

import { Command } from 'commander';
import log from '../lib/logger.js';
import DeploymentManager, { DeploymentType } from '../lib/deployment-manager.js';
import { promptSelect, promptConfirm } from '../lib/prompts.js';

const command = new Command('deploy');

command
  .description('Deploy OpenClaw')
  .argument('[type]', 'Deployment type (docker, bare-metal, kubernetes, aws, gcp, azure)')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--build', 'Build images before deployment (Docker)')
  .option('--force-recreate', 'Force recreate containers (Docker)')
  .option('--pull', 'Pull latest images before deployment (Docker)')
  .option('--method <method>', 'Deployment method (helm, kustomize) for Kubernetes')
  .option('--auto-approve', 'Auto-approve Terraform changes (Cloud)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (type, options) => {
    await handleDeploy(type, options);
  });

/**
 * Handle deploy command
 */
async function handleDeploy(type, options) {
  log.section('Deploying OpenClaw');

  // Determine deployment type
  let deploymentType = type;
  
  if (!deploymentType) {
    // Try to read from config
    deploymentType = await detectDeploymentType(options.config);
    
    if (!deploymentType) {
      // Interactive selection
      deploymentType = await promptSelect(
        'Select deployment type:',
        [
          { name: 'Docker Compose', value: DeploymentType.DOCKER },
          { name: 'Bare Metal', value: DeploymentType.BARE_METAL },
          { name: 'Kubernetes', value: DeploymentType.KUBERNETES },
          { name: 'AWS', value: DeploymentType.AWS },
          { name: 'GCP', value: DeploymentType.GCP },
          { name: 'Azure', value: DeploymentType.AZURE },
        ]
      );
    }
  }

  // Validate deployment type
  if (!Object.values(DeploymentType).includes(deploymentType)) {
    log.error(`Unknown deployment type: ${deploymentType}`);
    printUsage();
    process.exit(1);
  }

  // Confirm deployment
  if (!options.yes) {
    const confirmed = await promptConfirm(
      `Deploy to ${deploymentType}? This may take several minutes.`,
      { default: true }
    );

    if (!confirmed) {
      log.info('Deployment cancelled');
      return;
    }
  }

  // Create deployment manager
  const manager = new DeploymentManager({
    rootDir: process.cwd(),
    deploymentType,
    configPath: options.config,
  });

  // Build deploy options
  const deployOptions = {
    build: options.build,
    forceRecreate: options.forceRecreate,
    pull: options.pull,
    method: options.method,
    autoApprove: options.autoApprove,
  };

  // Execute deployment
  try {
    const success = await manager.deploy(deployOptions);

    if (success) {
      log.success(`Deployment to ${deploymentType} completed successfully!`);
      
      // Show status
      await showPostDeployStatus(manager);
    } else {
      log.error('Deployment failed');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Deployment failed: ${error.message}`);
    log.debug(error.stack);
    process.exit(1);
  }
}

/**
 * Detect deployment type from config or environment
 */
async function detectDeploymentType(configPath) {
  // Check for docker-compose.yml
  const fs = await import('fs-extra');
  
  if (await fs.pathExists('docker-compose.yml')) {
    return DeploymentType.DOCKER;
  }

  // Check for kubernetes manifests
  if (await fs.pathExists('charts/openclaw') || await fs.pathExists('deploy/k8s')) {
    return DeploymentType.KUBERNETES;
  }

  // Check for terraform configs
  if (await fs.pathExists('terraform/aws')) {
    return DeploymentType.AWS;
  }
  if (await fs.pathExists('terraform/gcp')) {
    return DeploymentType.GCP;
  }
  if (await fs.pathExists('terraform/azure')) {
    return DeploymentType.AZURE;
  }

  // Check config file
  if (configPath && await fs.pathExists(configPath)) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      if (config.deployment?.type) {
        return config.deployment.type;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Show post-deployment status
 */
async function showPostDeployStatus(manager) {
  log.subheader('Deployment Status');

  try {
    const status = await manager.status();
    const health = await manager.healthCheck();

    if (health.healthy) {
      log.success('All services are healthy');
    } else {
      log.warn('Some services may not be healthy yet');
    }

    // Print status details based on deployment type
    if (status.containers) {
      console.log('\nContainers:');
      status.containers.forEach(c => {
        const statusSymbol = c.State?.includes('running') ? '✓' : '⚠';
        console.log(`  ${statusSymbol} ${c.Names}`);
      });
    }

    if (status.pods) {
      console.log('\nPods:');
      status.pods.forEach(p => {
        const statusSymbol = p.ready ? '✓' : '⚠';
        console.log(`  ${statusSymbol} ${p.name} (${p.status})`);
      });
    }
  } catch (error) {
    log.debug(`Could not retrieve status: ${error.message}`);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Usage: openclaw deploy [type] [options]

Deployment Types:
  docker        Deploy using Docker Compose
  bare-metal    Deploy directly on host system
  kubernetes    Deploy to Kubernetes cluster
  aws           Deploy to AWS using Terraform
  gcp           Deploy to GCP using Terraform
  azure         Deploy to Azure using Terraform

Examples:
  openclaw deploy docker
  openclaw deploy kubernetes --method helm
  openclaw deploy aws --auto-approve
  openclaw deploy --build --force-recreate
`);
}

export default command;
