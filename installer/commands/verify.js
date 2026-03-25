/**
 * Verify Command - Verify installation integrity
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import logger from '../lib/logger.js';
import { checkNode, commandExists, getNpmGlobalBin } from '../lib/os-detect.js';
import { verifyPatchesApplied, getPatchStatus } from '../lib/patch-applier.js';
import { getSkillsStatus } from '../lib/skills-installer.js';

/**
 * Verify patches
 */
async function verifyPatches() {
  logger.header('Verifying Patches');
  
  const status = await getPatchStatus();
  
  console.log(`  Liberation installed: ${status.liberationInstalled ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`  Patches available: ${status.patchesAvailable}`);
  
  if (status.patches.length > 0) {
    console.log('\n  Patches:');
    for (const patch of status.patches) {
      console.log(`    - ${patch.name} (${patch.date})`);
    }
  }
  
  // Try verification
  const result = await verifyPatchesApplied();
  console.log(`\n  Verification: ${result.verified ? chalk.green('Passed') : chalk.yellow('Cannot verify')}`);
  
  return result.verified;
}

/**
 * Verify skills
 */
function verifySkills(config) {
  logger.header('Verifying Skills');
  
  const skillsDir = config.installation?.skillsDir || '/home/openclaw/.openclaw/skills';
  const status = getSkillsStatus(skillsDir);
  
  console.log(`  Installed: ${status.installed ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`  Skills count: ${status.count}`);
  
  if (status.installed && status.branch) {
    console.log(`  Branch: ${status.branch}`);
    console.log(`  Commit: ${status.commit || 'unknown'}`);
  }
  
  if (status.skills.length > 0) {
    console.log('\n  Installed skills:');
    for (const skill of status.skills) {
      console.log(`    - ${skill.name}`);
    }
  }
  
  return status.installed;
}

/**
 * Verify identity
 */
function verifyIdentity(config) {
  logger.header('Verifying Identity');
  
  const workspaceDir = config.installation?.workspaceDir || '/home/openclaw/.openclaw/workspace';
  const identityFiles = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'USER.md', 'MEMORY.md', 'BLUEPRINT.md'];
  
  let found = 0;
  
  for (const file of identityFiles) {
    const path = join(workspaceDir, file);
    if (existsSync(path)) {
      found++;
    }
  }
  
  console.log(`  Identity files: ${found}/${identityFiles.length}`);
  
  if (found > 0) {
    for (const file of identityFiles) {
      const path = join(workspaceDir, file);
      const exists = existsSync(path);
      console.log(`    ${file}: ${exists ? chalk.green('✓') : chalk.red('✗')}`);
    }
  }
  
  return found > 0;
}

/**
 * Verify configuration
 */
function verifyConfig(config) {
  logger.header('Verifying Configuration');
  
  const configDir = config.installation?.configDir || '/home/openclaw/.openclaw';
  const requiredFiles = ['openclaw.json', 'exec-approvals.json'];
  
  let allPresent = true;
  
  for (const file of requiredFiles) {
    const path = join(configDir, file);
    const exists = existsSync(path);
    console.log(`  ${file}: ${exists ? chalk.green('✓') : chalk.red('✗')}`);
    if (!exists) allPresent = false;
  }
  
  // Check OpenClaw CLI
  const cliPaths = [
    '/usr/local/bin/openclaw',
    join(getNpmGlobalBin(), 'openclaw')
  ];
  
  let cliFound = false;
  for (const p of cliPaths) {
    if (existsSync(p)) {
      cliFound = true;
      console.log(`  CLI: ${chalk.green(p)}`);
      break;
    }
  }
  
  if (!cliFound) {
    console.log(`  CLI: ${chalk.red('Not found')}`);
    allPresent = false;
  }
  
  // Check systemd service
  const servicePath = '/etc/systemd/system/openclaw-gateway.service';
  console.log(`  Systemd service: ${existsSync(servicePath) ? chalk.green('✓') : chalk.yellow('Not configured')}`);
  
  return allPresent;
}

/**
 * Main verify function
 * @param {Object} config - Configuration
 */
async function main(config) {
  logger.header('🦞 Heretek-OpenClaw Verification');
  
  const { patches = false, skills = false, identity = false } = config;
  
  // If no specific checks, verify all
  const verifyAll = !patches && !skills && !identity;
  
  const results = {};
  
  // Verify each component
  if (verifyAll || patches) {
    results.patches = await verifyPatches();
    console.log('');
  }
  
  if (verifyAll || skills) {
    results.skills = verifySkills(config);
    console.log('');
  }
  
  if (verifyAll || identity) {
    results.identity = verifyIdentity(config);
    console.log('');
  }
  
  // Always verify config
  results.config = verifyConfig(config);
  
  // Summary
  logger.header('Verification Summary');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log(chalk.green('\n✓ All checks passed!'));
  } else {
    console.log(chalk.yellow('\n⚠ Some checks failed or could not be verified'));
  }
}

export default main;