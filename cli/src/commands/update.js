/**
 * Update Command
 * 
 * Check for and apply OpenClaw updates.
 */

import { Command } from 'commander';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import log from '../lib/logger.js';
import { promptConfirm } from '../lib/prompts.js';

const command = new Command('update');

command
  .description('Update OpenClaw')
  .addCommand(new Command('check')
    .description('Check for available updates')
    .option('--json', 'Output as JSON')
    .action((options) => handleUpdateCheck(options))
  )
  .addCommand(new Command('apply')
    .description('Apply available updates')
    .option('--dry-run', 'Show what would be updated without applying')
    .option('--rollback', 'Rollback to previous version')
    .option('--confirm', 'Skip confirmation prompt')
    .action((options) => handleUpdateApply(options))
  )
  .addCommand(new Command('rollback')
    .description('Rollback to previous version')
    .option('--version <version>', 'Specific version to rollback to')
    .option('--confirm', 'Skip confirmation prompt')
    .action((options) => handleUpdateRollback(options))
  )
  .addCommand(new Command('history')
    .description('Show update history')
    .action(() => handleUpdateHistory())
  );

/**
 * Handle update check
 */
async function handleUpdateCheck(options) {
  log.section('Checking for Updates');

  try {
    const currentVersion = await getCurrentVersion();
    const latestVersion = await getLatestVersion();

    const updateAvailable = compareVersions(currentVersion, latestVersion) < 0;

    if (options.json) {
      console.log(JSON.stringify({
        currentVersion,
        latestVersion,
        updateAvailable,
      }, null, 2));
      return;
    }

    console.log(`
  Current Version: ${currentVersion}
  Latest Version:  ${latestVersion}
`);

    if (updateAvailable) {
      log.success('Update available!');
      console.log(`
  To apply the update, run:
    openclaw update apply
`);
    } else {
      log.info('You are running the latest version');
    }
  } catch (error) {
    log.error(`Failed to check for updates: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle update apply
 */
async function handleUpdateApply(options) {
  log.section('Applying Updates');

  const currentVersion = await getCurrentVersion();
  const latestVersion = await getLatestVersion();

  if (compareVersions(currentVersion, latestVersion) >= 0) {
    log.info('No updates available');
    return;
  }

  console.log(`
  Current Version: ${currentVersion}
  Updating to:     ${latestVersion}
`);

  if (!options.confirm && !options.dryRun) {
    const confirmed = await promptConfirm(
      'Apply update?',
      { default: true }
    );

    if (!confirmed) {
      log.info('Update cancelled');
      return;
    }
  }

  if (options.dryRun) {
    log.info('Dry run - showing what would be updated:');
    console.log(`
  Would update from ${currentVersion} to ${latestVersion}
  
  Files that would be updated:
    - CLI binaries
    - Deployment scripts
    - Configuration templates
`);
    return;
  }

  try {
    // Create backup before update
    log.info('Creating backup before update...');
    const BackupManager = (await import('../lib/backup-manager.js')).default;
    const backupManager = new BackupManager();
    await backupManager.create({ type: 'incremental', verify: false });
    log.success('Backup created');

    // Apply update
    log.info('Applying update...');
    
    // Update npm dependencies
    await execa('npm', ['install', '--production'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    // Update version file
    await fs.writeFile(
      path.join(process.cwd(), 'VERSION'),
      `${latestVersion}\n`,
      'utf-8'
    );

    log.success(`Updated to version ${latestVersion}`);

    console.log(`
${log.symbols.info} Update complete! Restart services to apply changes:
  
  Docker:        docker compose restart
  Bare Metal:    sudo systemctl restart openclaw-gateway
  Kubernetes:    kubectl rollout restart deployment/openclaw
`);
  } catch (error) {
    log.error(`Update failed: ${error.message}`);
    log.info('You can rollback using: openclaw update rollback');
    process.exit(1);
  }
}

/**
 * Handle update rollback
 */
async function handleUpdateRollback(options) {
  log.section('Rolling Back Update');

  if (!options.confirm) {
    const confirmed = await promptConfirm(
      'Rollback to previous version? This may cause data loss.',
      { default: false }
    );

    if (!confirmed) {
      log.info('Rollback cancelled');
      return;
    }
  }

  try {
    const BackupManager = (await import('../lib/backup-manager.js')).default;
    const backupManager = new BackupManager();

    // Find latest backup
    const backups = await backupManager.list();
    
    if (backups.length === 0) {
      log.error('No backups available for rollback');
      process.exit(1);
    }

    const latestBackup = backups[0];
    log.info(`Found backup: ${latestBackup.name}`);

    // Restore from backup
    await backupManager.restore(latestBackup.name, { confirm: true });

    log.success('Rollback complete');
  } catch (error) {
    log.error(`Rollback failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle update history
 */
async function handleUpdateHistory() {
  log.section('Update History');

  try {
    const historyFile = path.join(process.cwd(), '.update-history.json');
    
    if (!await fs.pathExists(historyFile)) {
      console.log('  No update history available');
      return;
    }

    const history = await fs.readFile(historyFile, 'utf-8');
    const updates = JSON.parse(history);

    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │ Date                │ From        │ To          │ Status    │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');

    for (const update of updates.slice(-10)) {
      const date = update.date.substring(0, 19).padEnd(19);
      const from = (update.from || 'unknown').padEnd(11);
      const to = (update.to || 'unknown').padEnd(11);
      const status = (update.success ? 'Success' : 'Failed').padEnd(9);
      console.log(`  │ ${date} │ ${from} │ ${to} │ ${status} │`);
    }

    console.log('  └─────────────────────────────────────────────────────────────┘');
  } catch (error) {
    log.error(`Failed to read update history: ${error.message}`);
  }
}

/**
 * Get current version
 */
async function getCurrentVersion() {
  try {
    // Try VERSION file first
    const versionFile = path.join(process.cwd(), 'VERSION');
    if (await fs.pathExists(versionFile)) {
      const content = await fs.readFile(versionFile, 'utf-8');
      return content.trim();
    }

    // Try package.json
    const pkgFile = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(pkgFile)) {
      const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf-8'));
      return pkg.version || 'unknown';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Get latest version
 */
async function getLatestVersion() {
  try {
    // In production, this would fetch from npm or GitHub
    // For now, return current version as placeholder
    const pkgFile = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(pkgFile)) {
      const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf-8'));
      return pkg.version || '1.0.0';
    }
    return '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/**
 * Compare version strings
 */
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/[^\d.]/g, '').split('.').map(Number);
  const parts2 = v2.replace(/[^\d.]/g, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a !== b) return a - b;
  }
  
  return 0;
}

export default command;
