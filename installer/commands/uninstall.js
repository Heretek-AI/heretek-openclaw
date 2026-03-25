/**
 * Uninstall Command - Clean removal of installation
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import logger from '../lib/logger.js';

/**
 * Stop and disable systemd service
 */
function stopService() {
  const serviceName = 'openclaw-gateway';
  
  try {
    execSync(`systemctl stop ${serviceName}`, { stdio: 'ignore' });
    execSync(`systemctl disable ${serviceName}`, { stdio: 'ignore' });
    logger.success('Service stopped and disabled');
  } catch (e) {
    logger.debug(`Service stop: ${e.message}`);
  }
  
  // Remove service file
  const servicePath = `/etc/systemd/system/${serviceName}.service`;
  if (existsSync(servicePath)) {
    try {
      rmSync(servicePath);
      execSync('systemctl daemon-reload', { stdio: 'ignore' });
      logger.info('Service file removed');
    } catch (e) {
      logger.debug(`Service file removal: ${e.message}`);
    }
  }
}

/**
 * Remove npm packages
 */
function removePackages() {
  const packages = ['@heretek-ai/openclaw', '@heretek-ai/openclaw-liberation'];
  
  for (const pkg of packages) {
    try {
      execSync(`npm uninstall -g ${pkg}`, { stdio: 'ignore' });
      logger.info(`Removed ${pkg}`);
    } catch (e) {
      logger.debug(`Uninstall ${pkg}: ${e.message}`);
    }
  }
}

/**
 * Remove openclaw user
 */
function removeUser() {
  try {
    execSync('userdel openclaw', { stdio: 'ignore' });
    logger.info('User removed');
  } catch (e) {
    logger.debug(`User removal: ${e.message}`);
  }
}

/**
 * Main uninstall function
 * @param {Object} config - Configuration
 */
async function main(config) {
  logger.header('🦞 Heretek-OpenClaw Uninstall');
  
  const { keepConfig = false, keepData = false } = config;
  
  // Show what will be removed
  const configDir = config.installation?.configDir || '/home/openclaw/.openclaw';
  
  console.log(chalk.yellow('\nThe following will be removed:'));
  console.log(`  - OpenClaw packages (npm)`);
  console.log(`  - Systemd service: openclaw-gateway`);
  if (!keepConfig) {
    console.log(`  - Configuration: ${configDir}`);
  }
  if (!keepData) {
    console.log(`  - Workspace and Skills`);
  }
  console.log(`  - User: openclaw (if no other processes)`);
  console.log('');
  
  // Confirm (unless --force is used)
  if (!config.force) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question(chalk.yellow('Continue? [y/N]: '), resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.gray('Aborted'));
      process.exit(0);
    }
  }
  
  // Stop service
  stopService();
  
  // Remove packages
  removePackages();
  
  // Remove configuration and data
  if (existsSync(configDir)) {
    if (!keepConfig && !keepData) {
      logger.info(`Removing ${configDir}...`);
      try {
        rmSync(configDir, { recursive: true, force: true });
        logger.success('Configuration removed');
      } catch (e) {
        logger.error(`Failed to remove config: ${e.message}`);
      }
    } else if (keepData) {
      logger.info('Keeping configuration and data (as requested)');
    } else {
      logger.info('Keeping data (as requested)');
    }
  }
  
  // Remove user (only if no other processes owned by openclaw)
  if (!keepConfig && !keepData) {
    removeUser();
  }
  
  logger.success('Uninstall complete');
  console.log(chalk.cyan('\nThank you for trying Heretek-OpenClaw!'));
}

export default main;