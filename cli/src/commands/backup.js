/**
 * Backup Command
 * 
 * Manage OpenClaw backups including create, list, restore, and delete.
 */

import { Command } from 'commander';
import log from '../lib/logger.js';
import BackupManager from '../lib/backup-manager.js';
import { promptConfirm } from '../lib/prompts.js';

const command = new Command('backup');

command
  .description('Manage backups')
  .addCommand(new Command('create')
    .description('Create a new backup')
    .option('-t, --type <type>', 'Backup type: full, incremental', 'incremental')
    .option('--verify', 'Verify backup after creation')
    .option('--compress', 'Compress backup files', true)
    .action((options) => handleBackupCreate(options))
  )
  .addCommand(new Command('list')
    .description('List available backups')
    .option('--json', 'Output as JSON')
    .action((options) => handleBackupList(options))
  )
  .addCommand(new Command('restore')
    .description('Restore from a backup')
    .argument('<name>', 'Backup name to restore')
    .option('--components <list>', 'Components to restore (all, postgresql, redis, workspace, config)', 'all')
    .option('--confirm', 'Skip confirmation prompt')
    .action((name, options) => handleBackupRestore(name, options))
  )
  .addCommand(new Command('delete')
    .description('Delete a backup')
    .argument('<name>', 'Backup name to delete')
    .option('--confirm', 'Skip confirmation prompt')
    .action((name, options) => handleBackupDelete(name, options))
  )
  .addCommand(new Command('verify')
    .description('Verify a backup')
    .argument('<name>', 'Backup name to verify')
    .action((name) => handleBackupVerify(name))
  )
  .addCommand(new Command('rotate')
    .description('Rotate old backups based on retention policy')
    .option('--days <days>', 'Retention period in days', '30')
    .action((options) => handleBackupRotate(options))
  );

/**
 * Handle backup create
 */
async function handleBackupCreate(options) {
  log.section('Creating Backup');

  const backupManager = new BackupManager();

  try {
    const result = await backupManager.create({
      type: options.type,
      verify: options.verify,
      compress: options.compress,
    });

    if (result.success) {
      log.success(`Backup created: ${result.name}`);
    } else {
      log.warn(`Backup completed with errors:`);
      result.errors.forEach(e => log.warn(`  - ${e.component}: ${e.error}`));
    }
  } catch (error) {
    log.error(`Backup failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle backup list
 */
async function handleBackupList(options) {
  const backupManager = new BackupManager();

  try {
    const backups = await backupManager.list();

    if (options.json) {
      console.log(JSON.stringify(backups, null, 2));
      return;
    }

    log.section('Available Backups');

    if (backups.length === 0) {
      console.log('  No backups found');
      return;
    }

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │ Name                          │ Type         │ Size         │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');

    for (const backup of backups) {
      const name = backup.name.substring(0, 29).padEnd(29);
      const type = backup.type.padEnd(12);
      const size = formatSize(backup.size).padEnd(12);
      console.log(`  │ ${name} │ ${type} │ ${size} │`);
    }

    console.log('  └─────────────────────────────────────────────────────────────┘');
    console.log(`\n  Total: ${backups.length} backup(s)`);
  } catch (error) {
    log.error(`Failed to list backups: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle backup restore
 */
async function handleBackupRestore(name, options) {
  log.section('Restoring Backup');

  if (!options.confirm) {
    const confirmed = await promptConfirm(
      `Restore from backup "${name}"? This will overwrite existing data.`,
      { default: false }
    );

    if (!confirmed) {
      log.info('Restore cancelled');
      return;
    }
  }

  const backupManager = new BackupManager();

  try {
    const components = options.components === 'all' 
      ? ['all'] 
      : options.components.split(',');

    const result = await backupManager.restore(name, {
      components,
      confirm: true,
    });

    if (result.success) {
      log.success(`Backup restored: ${name}`);
    } else {
      log.warn(`Restore completed with errors:`);
      result.errors.forEach(e => log.warn(`  - ${e.component}: ${e.error}`));
    }
  } catch (error) {
    log.error(`Restore failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle backup delete
 */
async function handleBackupDelete(name, options) {
  log.section('Deleting Backup');

  if (!options.confirm) {
    const confirmed = await promptConfirm(
      `Delete backup "${name}"? This action cannot be undone.`,
      { default: false }
    );

    if (!confirmed) {
      log.info('Delete cancelled');
      return;
    }
  }

  const backupManager = new BackupManager();

  try {
    const success = await backupManager.delete(name);

    if (success) {
      log.success(`Backup deleted: ${name}`);
    } else {
      log.error('Failed to delete backup');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Delete failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle backup verify
 */
async function handleBackupVerify(name) {
  log.section('Verifying Backup');

  const backupManager = new BackupManager();

  try {
    const result = await backupManager.verify(name);

    if (result.valid) {
      log.success(`Backup verification passed: ${name}`);
      
      result.checks.forEach(check => {
        if (check.valid) {
          log.success(`  ✓ ${check.name}`);
        }
      });
    } else {
      log.error(`Backup verification failed: ${name}`);
      
      result.checks.forEach(check => {
        if (!check.valid) {
          log.error(`  ✗ ${check.name}: ${check.error}`);
        }
      });
    }
  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle backup rotate
 */
async function handleBackupRotate(options) {
  log.section('Rotating Backups');

  const backupManager = new BackupManager({
    retentionDays: parseInt(options.days, 10),
  });

  try {
    const deleted = await backupManager.rotate();
    log.success(`Rotation complete: ${deleted} backup(s) deleted`);
  } catch (error) {
    log.error(`Rotation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default command;
