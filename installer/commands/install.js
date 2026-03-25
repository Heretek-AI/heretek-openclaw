/**
 * Install Command - Full installation flow
 * 
 * Performs complete Heretek-OpenClaw installation including:
 * - OS detection and dependency installation
 * - Node.js/pnpm setup
 * - OpenClaw base package installation
 * - openclaw-liberation package installation (with patches)
 * - Skills installation
 * - Agent identity creation
 * - Configuration generation
 * - Systemd service setup
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, chownSync } from 'fs';
import { join, dirname } from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';

import logger from '../lib/logger.js';
import { detectOS, requireRoot, getInstallCommands, checkNode, commandExists, getNpmGlobalBin } from '../lib/os-detect.js';
import { applyLiberationPatches, verifyPatchesApplied } from '../lib/patch-applier.js';
import { createAgent } from '../lib/agent-builder.js';
import { installSkills } from '../lib/skills-installer.js';

const execAsync = promisify(exec);

const NPM_PACKAGE = '@heretek-ai/openclaw';
const SKILLS_REPO = 'https://github.com/Heretek-AI/heretek-skills.git';

/**
 * Check npm registry connectivity
 * @returns {boolean}
 */
async function checkNpmRegistry() {
  try {
    execSync('npm view @heretek-ai/openclaw name', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install system dependencies
 * @param {Object} os - OS information
 * @returns {Promise<void>}
 */
async function installDependencies(os) {
  logger.header('Installing System Dependencies');
  
  const cmds = getInstallCommands(os);
  
  try {
    logger.info(`Using package manager: ${os.distro}`);
    
    // Update package lists
    if (cmds.update) {
      logger.info('Updating package lists...');
      execSync(cmds.update, { stdio: 'inherit' });
    }
    
    // Install base dependencies
    const deps = ['curl', 'git', 'gnupg', 'ca-certificates'];
    
    if (os.isDebianBased) {
      deps.push('apt-transport-https');
    }
    
    logger.info(`Installing: ${deps.join(', ')}`);
    execSync(cmds.install + ' ' + deps.join(' '), { stdio: 'inherit' });
    
    logger.success('Dependencies installed');
  } catch (e) {
    logger.error(`Failed to install dependencies: ${e.message}`);
    throw e;
  }
}

/**
 * Setup Node.js environment
 * @param {Object} os - OS information
 * @returns {Promise<void>}
 */
async function setupNode(os) {
  logger.header('Setting up Node.js');
  
  const nodeInfo = checkNode();
  
  if (!nodeInfo.installed) {
    logger.info('Node.js not found, installing...');
    
    if (os.isDebianBased) {
      // Install Node.js 22 from NodeSource
      execSync('curl -fsSL https://deb.nodesource.com/setup_22.x | bash -', { stdio: 'inherit' });
      execSync('apt-get install -y nodejs', { stdio: 'inherit' });
    } else if (os.isRhelBased) {
      execSync(`curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -`, { stdio: 'inherit' });
      execSync('yum install -y nodejs', { stdio: 'inherit' });
    } else if (os.isAlpine) {
      execSync('apk add nodejs npm', { stdio: 'inherit' });
    }
  }
  
  // Verify installation
  const newInfo = checkNode();
  logger.success(`Node.js: ${newInfo.version}`);
  
  // Install pnpm if not present
  if (!commandExists('pnpm')) {
    logger.info('Installing pnpm...');
    execSync('npm install -g pnpm', { stdio: 'inherit' });
  }
  
  logger.success(`pnpm: $(pnpm -v)`);
}

/**
 * Create openclaw user and directories
 * @param {Object} config - Configuration
 * @returns {Promise<void>}
 */
async function setupDirectories(config) {
  logger.header('Setting up Directories');
  
  const {
    user = 'openclaw',
    configDir = '/home/openclaw/.openclaw',
    workspaceDir = '/home/openclaw/.openclaw/workspace',
    skillsDir = '/home/openclaw/.openclaw/skills'
  } = config;
  
  // Check if user exists
  try {
    execSync(`id ${user}`, { stdio: 'ignore' });
    logger.info(`User '${user}' already exists`);
  } catch {
    logger.info(`Creating user '${user}'...`);
    execSync(`useradd -m -s /bin/bash -r -d "${configDir}" ${user}`, { stdio: 'inherit' });
  }
  
  // Create directories
  const dirs = [
    configDir,
    workspaceDir,
    skillsDir,
    join(configDir, 'agents'),
    join(configDir, '.ssh'),
    join(configDir, 'gateway')
  ];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      logger.info(`  Created: ${dir}`);
    }
  }
  
  // Set ownership
  try {
    chownSync(configDir, parseInt(process.getuid()), parseInt(process.getgid()));
  } catch {
    // May fail if not root, ignore
  }
  
  logger.success('Directories created');
}

/**
 * Install OpenClaw and liberation packages
 * @param {Object} config - Configuration
 * @returns {Promise<void>}
 */
async function installOpenClaw(config) {
  logger.header('Installing OpenClaw');
  
  const { version = 'latest' } = config.openclaw || {};
  
  // Check registry connectivity
  if (!await checkNpmRegistry()) {
    logger.error('Cannot reach npm registry');
    throw new Error('Network error (npm registry unreachable)');
  }
  
  // Install openclaw package
  logger.info(`Installing ${NPM_PACKAGE}@${version}...`);
  
  try {
    execSync(`npm install -g ${NPM_PACKAGE}@${version}`, { stdio: 'inherit' });
    logger.success('OpenClaw installed');
  } catch (e) {
    logger.error(`Failed to install OpenClaw: ${e.message}`);
    throw e;
  }
  
  // Install liberation package
  logger.info('Installing openclaw-liberation...');
  
  try {
    execSync(`npm install -g @heretek-ai/openclaw-liberation`, { stdio: 'inherit' });
    logger.success('Liberation package installed');
  } catch (e) {
    logger.error(`Failed to install liberation: ${e.message}`);
    // Continue anyway - patches may be applied manually
  }
  
  // Verify CLI is available
  if (commandExists('openclaw')) {
    logger.success('OpenClaw CLI available');
  } else {
    // Check common paths
    const paths = [
      '/usr/local/bin/openclaw',
      join(getNpmGlobalBin(), 'openclaw')
    ];
    
    for (const p of paths) {
      if (existsSync(p)) {
        logger.success(`OpenClaw found at: ${p}`);
        break;
      }
    }
  }
}

/**
 * Generate configuration files
 * @param {Object} config - Configuration
 * @returns {Promise<void>}
 */
async function generateConfigs(config) {
  logger.header('Generating Configuration');
  
  const {
    configDir = '/home/openclaw/.openclaw',
    workspaceDir = '/home/openclaw/.openclaw/workspace',
    gatewayPort = 18789,
    model = {}
  } = config;
  
  // Create exec-approvals.json - full access
  const execApprovalsPath = join(configDir, 'exec-approvals.json');
  const execApprovals = {
    version: 1,
    socket: {
      path: '/home/openclaw/.openclaw/exec-approvals.sock',
      token: 'LIBERATED_TOKEN'
    },
    defaults: {
      security: 'full',
      ask: 'off'
    },
    agents: {}
  };
  writeFileSync(execApprovalsPath, JSON.stringify(execApprovals, null, 2));
  logger.info('Created exec-approvals.json');
  
  // Create openclaw.json - main config
  const openclawPath = join(configDir, 'openclaw.json');
  const openclawConfig = {
    meta: {
      lastTouchedVersion: '2026.3.32',
      lastTouchedAt: new Date().toISOString(),
      installer: 'heretek-openclaw-installer v1.0.0'
    },
    agents: {
      defaults: {
        workspace: workspaceDir,
        model: model.defaultModel || 'ollama/qwen3.5:cloud',
        modelUrl: model.defaultUrl || 'http://localhost:11434'
      },
      list: [
        {
          id: 'main',
          role: 'primary',
          tools: {
            profile: 'full'
          }
        }
      ]
    },
    tools: {
      profile: 'full',
      exec: {
        security: 'full',
        ask: 'off'
      },
      execRuntime: {
        allowlist: [],
        denylist: []
      }
    },
    gateway: {
      port: gatewayPort,
      mode: 'local',
      bind: 'lan'
    }
  };
  writeFileSync(openclawPath, JSON.stringify(openclawConfig, null, 2));
  logger.info('Created openclaw.json');
  
  // Create .installation.registry
  const registryPath = join(configDir, '.installation.registry');
  const registry = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    installer: 'heretek-openclaw-installer',
    patchesApplied: [],
    agents: [],
    skills: []
  };
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  logger.info('Created installation registry');
  
  logger.success('Configuration files generated');
}

/**
 * Setup systemd service
 * @param {Object} config - Configuration
 * @returns {Promise<void>}
 */
async function setupSystemd(config) {
  const { systemd = {}, user = 'openclaw' } = config;
  
  if (!systemd.enable) {
    logger.info('Systemd service disabled in config');
    return;
  }
  
  logger.header('Setting up Systemd Service');
  
  // Find npm global root and CLI path
  const npmRoot = getNpmGlobalBin();
  const cliPaths = [
    join(npmRoot, 'openclaw'),
    '/usr/local/bin/openclaw'
  ];
  
  let cliPath = null;
  for (const p of cliPaths) {
    if (existsSync(p)) {
      cliPath = p;
      break;
    }
  }
  
  if (!cliPath) {
    logger.warn('OpenClaw CLI not found, skipping systemd setup');
    return;
  }
  
  const serviceName = systemd.serviceName || 'openclaw-gateway';
  const servicePath = `/etc/systemd/system/${serviceName}.service`;
  
  const serviceContent = `[Unit]
Description=OpenClaw Gateway (Liberated) - Heretek AI Fork
Documentation=https://github.com/Heretek-AI/heretek-openclaw
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${user}
Group=${user}
WorkingDirectory=/home/openclaw/.openclaw
Environment="PATH=${npmRoot}:/usr/local/bin:/usr/bin:/bin"
Environment="OPENCLAW_CONFIG_PATH=/home/openclaw/.openclaw/openclaw.json"
Environment="NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache"
Environment="TMPDIR=/var/tmp/openclaw"
Environment="OPENCLAW_NO_RESPAWN=1"
ExecStart=${cliPath} gateway
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;
  
  writeFileSync(servicePath, serviceContent);
  logger.info(`Created service file: ${servicePath}`);
  
  // Reload and enable
  try {
    execSync('systemctl daemon-reload', { stdio: 'ignore' });
    execSync(`systemctl unmask ${serviceName}`, { stdio: 'ignore' });
    execSync(`systemctl enable ${serviceName}`, { stdio: 'inherit' });
    logger.success('Systemd service enabled');
  } catch (e) {
    logger.warn('Could not enable systemd service');
  }
}

/**
 * Main install function
 * @param {Object} config - Installation configuration
 */
async function main(config) {
  logger.header('🦞 Heretek-OpenClaw Installation');
  logger.info(`Version: ${config.version || '1.0.0'}`);
  
  // Check root privileges
  requireRoot();
  
  // Detect OS
  const os = detectOS();
  
  try {
    // Step 1: Install dependencies
    await installDependencies(os);
    
    // Step 2: Setup Node.js
    await setupNode(os);
    
    // Step 3: Setup directories
    await setupDirectories(config);
    
    // Step 4: Install OpenClaw and liberation
    await installOpenClaw(config);
    
    // Step 5: Apply liberation patches
    logger.header('Applying Liberation Patches');
    const patchResult = await applyLiberationPatches({ force: config.force });
    if (patchResult.success && patchResult.applied?.length > 0) {
      logger.success(`Applied ${patchResult.applied.length} patches`);
    }
    
    // Step 6: Install skills
    logger.header('Installing Skills');
    const skillsResult = await installSkills({
      skillsDir: config.skills?.repository ? undefined : config.installation?.skillsDir,
      repository: config.skills?.repository || SKILLS_REPO,
      branch: config.skills?.branch || 'main',
      autoUpdate: config.skills?.autoUpdate
    });
    if (skillsResult.success) {
      logger.success(`Installed ${skillsResult.count || 0} skills`);
    }
    
    // Step 7: Create agent identity
    logger.header('Creating Agent Identity');
    const agentResult = await createAgent('main', {
      workspaceDir: config.installation?.workspaceDir,
      model: config.model?.defaultModel,
      modelUrl: config.model?.defaultUrl
    });
    if (agentResult.success) {
      logger.success('Agent identity created');
    }
    
    // Step 8: Generate configs
    await generateConfigs(config);
    
    // Step 9: Setup systemd
    await setupSystemd(config);
    
    // Step 10: Set ownership
    logger.header('Setting Ownership');
    try {
      const { configDir = '/home/openclaw/.openclaw' } = config.installation || {};
      execSync(`chown -R openclaw:openclaw ${configDir}`, { stdio: 'ignore' });
      logger.success('Ownership set');
    } catch (e) {
      logger.warn('Could not set ownership');
    }
    
    // Print summary
    logger.header('Installation Complete');
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🦞 Heretek-OpenClaw v1.0.0 Installation Complete       ║
╚═══════════════════════════════════════════════════════════╝

  Package:       ${NPM_PACKAGE}
  Config:        ${config.installation?.configDir || '/home/openclaw/.openclaw'}/openclaw.json
  Workspace:     ${config.installation?.workspaceDir || '/home/openclaw/.openclaw/workspace'}
  Skills:        ${config.installation?.skillsDir || '/home/openclaw/.openclaw/skills'}
  Gateway Port:  ${config.installation?.gatewayPort || 18789}

  To start:      systemctl start openclaw-gateway
  To check:      systemctl status openclaw-gateway
  Logs:          journalctl -u openclaw-gateway -f

  The third path: the thought that never ends. 🦞
`);
    
  } catch (e) {
    logger.error(`Installation failed: ${e.message}`);
    logger.error('Please check the logs above for details');
    process.exit(1);
  }
}

export default main;