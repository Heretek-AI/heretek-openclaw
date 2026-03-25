/**
 * Status Command - Show installation status
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import logger from '../lib/logger.js';
import { checkNode, getNpmGlobalBin } from '../lib/os-detect.js';
import { getPatchStatus } from '../lib/patch-applier.js';
import { getSkillsStatus } from '../lib/skills-installer.js';

/**
 * Get systemd service status
 */
function getServiceStatus() {
  try {
    const output = execSync('systemctl is-active openclaw-gateway', { encoding: 'utf8' }).trim();
    return output === 'active';
  } catch {
    return false;
  }
}

/**
 * Main status function
 * @param {Object} config - Configuration
 */
async function main(config) {
  const configDir = config.installation?.configDir || '/home/openclaw/.openclaw';
  const workspaceDir = config.installation?.workspaceDir || '/home/openclaw/.openclaw/workspace';
  const skillsDir = config.installation?.skillsDir || '/home/openclaw/.openclaw/skills';
  
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  🦞 Heretek-OpenClaw Status                              ║
╚═══════════════════════════════════════════════════════════╝
  `));
  
  // Check Node.js
  const nodeInfo = checkNode();
  console.log(`\nNode.js: ${nodeInfo.installed ? chalk.green(nodeInfo.version) : chalk.red('Not installed')}`);
  
  // Check npm packages
  console.log(chalk.cyan('\n━━━ NPM Packages ━━━'));
  
  const packages = ['@heretek-ai/openclaw', '@heretek-ai/openclaw-liberation'];
  for (const pkg of packages) {
    try {
      execSync(`npm list -g ${pkg} --depth=0`, { stdio: 'ignore' });
      console.log(`  ${pkg}: ${chalk.green('installed')}`);
    } catch {
      console.log(`  ${pkg}: ${chalk.red('not installed')}`);
    }
  }
  
  // Check patches
  console.log(chalk.cyan('\n━━━ Liberation Patches ━━━'));
  const patchStatus = await getPatchStatus();
  console.log(`  Status: ${patchStatus.liberationInstalled ? chalk.green('Installed') : chalk.red('Not found')}`);
  console.log(`  Available patches: ${patchStatus.patchesAvailable}`);
  
  if (patchStatus.patches.length > 0) {
    console.log('\n  Recent patches:');
    for (const patch of patchStatus.patches.slice(0, 5)) {
      console.log(`    - ${patch.name} (${patch.category})`);
    }
  }
  
  // Check skills
  console.log(chalk.cyan('\n━━━ Skills ━━━'));
  const skillsStatus = getSkillsStatus(skillsDir);
  
  if (skillsStatus.installed) {
    console.log(`  Status: ${chalk.green('Installed')}`);
    console.log(`  Count: ${skillsStatus.count}`);
    if (skillsStatus.branch) {
      console.log(`  Branch: ${skillsStatus.branch}`);
    }
  } else {
    console.log(`  Status: ${chalk.yellow('Not installed')}`);
  }
  
  // Check configuration
  console.log(chalk.cyan('\n━━━ Configuration ━━━'));
  
  const openclawJson = join(configDir, 'openclaw.json');
  if (existsSync(openclawJson)) {
    try {
      const configData = JSON.parse(readFileSync(openclawJson, 'utf8'));
      const meta = configData.meta || {};
      
      console.log(`  Config: ${chalk.green('Present')}`);
      console.log(`  Version: ${meta.lastTouchedVersion || 'unknown'}`);
      console.log(`  Gateway Port: ${configData.gateway?.port || 18789}`);
      
      // Agent count
      const agentList = configData.agents?.list || [];
      console.log(`  Agents: ${agentList.length}`);
    } catch (e) {
      console.log(`  Config: ${chalk.yellow('Parse error')}`);
    }
  } else {
    console.log(`  Config: ${chalk.red('Missing')}`);
  }
  
  // Check identity files
  console.log(chalk.cyan('\n━━━ Identity Files ━━━'));
  
  const identityFiles = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'USER.md', 'MEMORY.md', 'BLUEPRINT.md'];
  let identityCount = 0;
  
  for (const file of identityFiles) {
    if (existsSync(join(workspaceDir, file))) {
      identityCount++;
    }
  }
  
  console.log(`  Present: ${identityCount}/${identityFiles.length}`);
  
  // Check systemd service
  console.log(chalk.cyan('\n━━━ Service ━━━'));
  
  const servicePath = '/etc/systemd/system/openclaw-gateway.service';
  if (existsSync(servicePath)) {
    const isActive = getServiceStatus();
    console.log(`  Service: ${chalk.green('Installed')}`);
    console.log(`  Status: ${isActive ? chalk.green('Active') : chalk.red('Inactive')}`);
    
    if (isActive) {
      console.log(`\n  View logs: ${chalk.gray('journalctl -u openclaw-gateway -f')}`);
    }
  } else {
    console.log(`  Service: ${chalk.yellow('Not configured')}`);
  }
  
  // Summary
  console.log(chalk.cyan('\n━━━ Directories ━━━'));
  console.log(`  Config: ${configDir}`);
  console.log(`  Workspace: ${workspaceDir}`);
  console.log(`  Skills: ${skillsDir}`);
  
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
}

export default main;