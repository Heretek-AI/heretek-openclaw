/**
 * Update Command - Update existing installation
 * 
 * Updates OpenClaw, patches, and skills.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import logger from '../lib/logger.js';
import { detectOS } from '../lib/os-detect.js';
import { applyLiberationPatches, verifyPatchesApplied } from '../lib/patch-applier.js';
import { updateSkills } from '../lib/skills-installer.js';

/**
 * Check for available updates
 * @returns {Promise<Object>} Update information
 */
async function checkForUpdates() {
  logger.info('Checking for updates...');
  
  const updates = {
    openclaw: null,
    liberation: null,
    skills: null
  };
  
  // Check OpenClaw
  try {
    const current = execSync('npm list -g @heretek-ai/openclaw --depth=0', { encoding: 'utf8' });
    const latest = execSync('npm view @heretek-ai/openclaw version', { encoding: 'utf8' }).trim();
    const match = current.match(/@heretek-ai\/openclaw@([\d.]+)/);
    
    if (match && match[1] !== latest) {
      updates.openclaw = {
        current: match[1],
        latest
      };
    }
  } catch (e) {
    logger.debug(`Update check: ${e.message}`);
  }
  
  // Check liberation
  try {
    const current = execSync('npm list -g @heretek-ai/openclaw-liberation --depth=0', { encoding: 'utf8' });
    const latest = execSync('npm view @heretek-ai/openclaw-liberation version', { encoding: 'utf8' }).trim();
    const match = current.match(/@heretek-ai\/openclaw-liberation@([\d.]+)/);
    
    if (match && match[1] !== latest) {
      updates.liberation = {
        current: match[1],
        latest
      };
    }
  } catch (e) {
    logger.debug(`Update check: ${e.message}`);
  }
  
  return updates;
}

/**
 * Update patches only
 * @returns {Promise<void>}
 */
async function updatePatches() {
  logger.header('Updating Patches');
  
  // Re-install liberation package to get new patches
  logger.info('Re-installing openclaw-liberation...');
  
  try {
    execSync('npm install -g @heretek-ai/openclaw-liberation', { stdio: 'inherit' });
    logger.success('Liberation package updated');
  } catch (e) {
    logger.error(`Failed to update: ${e.message}`);
    return;
  }
  
  // Apply patches
  const result = await applyLiberationPatches({ force: true });
  
  if (result.success) {
    logger.success('Patches updated');
  } else {
    logger.error('Patch update failed');
  }
}

/**
 * Update skills only
 * @returns {Promise<void>}
 */
async function updateSkillsOnly(config) {
  logger.header('Updating Skills');
  
  const skillsDir = config.installation?.skillsDir || '/home/openclaw/.openclaw/skills';
  const branch = config.skills?.branch || 'main';
  
  const result = await updateSkills({ skillsDir, branch });
  
  if (result.success) {
    logger.success(`Updated ${result.count} skills`);
  } else {
    logger.error(`Update failed: ${result.error}`);
  }
}

/**
 * Main update function
 * @param {Object} config - Configuration
 */
async function main(config) {
  logger.header('🦞 Heretek-OpenClaw Update');
  
  const { patchOnly = false, skillsOnly = false, check = false } = config;
  
  // Check for updates
  const updates = await checkForUpdates();
  
  console.log(chalk.cyan('\nAvailable Updates:'));
  console.log(`  OpenClaw:     ${updates.openclaw ? `${updates.openclaw.current} → ${updates.openclaw.latest}` : 'up to date'}`);
  console.log(`  Liberation:   ${updates.liberation ? `${updates.liberation.current} → ${updates.liberation.latest}` : 'up to date'}`);
  
  if (check) {
    logger.info('Check complete (no changes made)');
    return;
  }
  
  // Determine what to update
  if (patchOnly) {
    await updatePatches();
  } else if (skillsOnly) {
    await updateSkillsOnly(config);
  } else {
    // Full update
    
    // Backup current state
    logger.info('Backing up current state...');
    const configDir = config.installation?.configDir || '/home/openclaw/.openclaw';
    const backupPath = join(configDir, '.backup');
    
    try {
      execSync(`mkdir -p ${backupPath}`, { stdio: 'ignore' });
      execSync(`cp ${join(configDir, 'openclaw.json')} ${join(backupPath, 'openclaw.json.bak')}`, { stdio: 'ignore' });
      logger.success('Backup created');
    } catch (e) {
      logger.warn('Could not create backup');
    }
    
    // Update liberation (includes patches)
    await updatePatches();
    
    // Update skills
    await updateSkillsOnly(config);
    
    // Restart service if enabled
    if (config.systemd?.autoStart) {
      logger.header('Restarting Gateway');
      try {
        execSync('systemctl restart openclaw-gateway', { stdio: 'inherit' });
        logger.success('Gateway restarted');
      } catch (e) {
        logger.warn('Could not restart gateway');
      }
    }
    
    logger.success('Update complete');
  }
}

export default main;