/**
 * Stop Command
 * 
 * Stop OpenClaw deployment gracefully.
 */

import { Command } from 'commander';
import log from '../lib/logger.js';
import DeploymentManager from '../lib/deployment-manager.js';
import { promptConfirm } from '../lib/prompts.js';

const command = new Command('stop');

command
  .description('Stop OpenClaw deployment')
  .option('-t, --type <type>', 'Deployment type (auto-detect if not specified)')
  .option('-f, --force', 'Force stop (kill containers/processes)')
  .option('--volumes', 'Remove volumes (Docker only)')
  .option('--backup', 'Create backup before stopping')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    await handleStop(options);
  });

/**
 * Handle stop command
 */
async function handleStop(options) {
  log.section('Stopping OpenClaw');

  // Confirm stop
  if (!options.yes) {
    const confirmed = await promptConfirm(
      'Are you sure you want to stop OpenClaw? This will stop all services.',
      { default: false }
    );

    if (!confirmed) {
      log.info('Stop cancelled');
      return;
    }
  }

  // Create backup if requested
  if (options.backup) {
    log.info('Creating backup before stopping...');
    try {
      const BackupManager = (await import('../lib/backup-manager.js')).default;
      const backupManager = new BackupManager();
      await backupManager.create({ type: 'incremental' });
      log.success('Backup created');
    } catch (error) {
      log.warn(`Backup failed: ${error.message}`);
      // Continue with stop even if backup fails
    }
  }

  const manager = new DeploymentManager({
    rootDir: process.cwd(),
    deploymentType: options.type,
  });

  try {
    log.info('Stopping services...');

    const success = await manager.stop({
      removeVolumes: options.volumes,
    });

    if (success) {
      log.success('OpenClaw stopped successfully');
      
      // Show post-stop message
      printPostStopMessage(options);
    } else {
      log.error('Failed to stop OpenClaw');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Failed to stop: ${error.message}`);
    log.debug(error.stack);
    process.exit(1);
  }
}

/**
 * Print post-stop message
 */
function printPostStopMessage(options) {
  console.log(`
${log.symbols.info} OpenClaw has been stopped.

To start again:
  ${options.type === 'docker' ? 'docker compose up -d' : 'openclaw deploy'}

${options.volumes ? `
Note: Volumes were removed. Data may need to be restored from backup.` : `
Data is preserved. To remove data as well, use --volumes flag.`}
`);
}

export default command;
