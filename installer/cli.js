#!/usr/bin/env node
/**
 * Heretek OpenClaw Installer CLI
 * 
 * Main entry point for the modular installer.
 * Provides commands for installation, update, agent creation, and more.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf8')
);

// Default configuration
const DEFAULT_CONFIG = {
  version: '1.0.0',
  openclaw: {
    package: 'openclaw',
    version: 'latest',
    registry: 'https://npmjs.org'
  },
  liberation: {
    package: '@heretek-ai/openclaw-liberation',
    version: 'latest',
    autoApply: true,
    patches: ['all']
  },
  installation: {
    user: 'openclaw',
    group: 'openclaw',
    configDir: '/home/openclaw/.openclaw',
    workspaceDir: '/home/openclaw/.openclaw/workspace',
    skillsDir: '/home/openclaw/.openclaw/skills',
    gatewayPort: 18789
  },
  skills: {
    repository: 'https://github.com/Heretek-AI/heretek-skills.git',
    branch: 'main',
    autoUpdate: true
  },
  systemd: {
    enable: true,
    autoStart: true,
    serviceName: 'openclaw-gateway'
  },
  model: {
    provider: 'ollama',
    defaultModel: 'qwen3.5:cloud',
    defaultUrl: 'http://localhost:11434'
  }
};

// Create main program
const program = new Command();

program
  .name('heretek-openclaw')
  .description('🦞 Heretek OpenClaw - Liberated Fork Installer\nThe third path: the thought that never ends.')
  .version(packageJson.version)
  .option('-c, --config <path>', 'Custom configuration file')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('-f, --force', 'Force operation even if already done')
  .option('-d, --dry-run', 'Show what would be done without doing it');

// Global config loading
function loadConfig(options) {
  let config = { ...DEFAULT_CONFIG };
  
  // Load from config file if specified
  if (options.config) {
    if (existsSync(options.config)) {
      try {
        const customConfig = JSON.parse(readFileSync(options.config, 'utf8'));
        config = { ...config, ...customConfig };
      } catch (e) {
        console.error(chalk.red(`Error loading config: ${e.message}`));
        process.exit(1);
      }
    } else {
      console.error(chalk.red(`Config file not found: ${options.config}`));
      process.exit(1);
    }
  }
  
  // Override with environment variables
  if (process.env.HERETEK_OPENCLAW_VERSION) {
    config.openclaw.version = process.env.HERETEK_OPENCLAW_VERSION;
  }
  if (process.env.HERETEK_LIBERATION_VERSION) {
    config.liberation.version = process.env.HERETEK_LIBERATION_VERSION;
  }
  if (process.env.HERETEK_SKIP_PROMPTS === 'true') {
    config.skipPrompts = true;
  }
  
  // Add CLI options
  config.verbose = options.verbose || process.env.HERETEK_VERBOSE === 'true';
  config.quiet = options.quiet;
  config.force = options.force;
  config.dryRun = options.dryRun;
  
  return config;
}

// Import and register commands
async function registerCommands() {
  try {
    const installCmd = await import('./commands/install.js');
    program
      .command('install')
      .description('Full installation (default)')
      .option('--skip-prompts', 'Skip interactive prompts')
      .option('--version <ver>', 'Specific OpenClaw version')
      .option('--user <name>', 'OpenClaw user (default: openclaw)')
      .option('--port <port>', 'Gateway port (default: 18789)')
      .action(async (opts) => {
        const config = loadConfig(program.opts());
        await installCmd.default({ ...config, ...opts });
      });

    const updateCmd = await import('./commands/update.js');
    program
      .command('update')
      .description('Update existing installation')
      .option('--patch-only', 'Update only patches')
      .option('--skills-only', 'Update only skills')
      .option('--check', 'Check for updates without applying')
      .action(async (opts) => {
        const config = loadConfig(program.opts());
        await updateCmd.default({ ...config, ...opts });
      });

    const uninstallCmd = await import('./commands/uninstall.js');
    program
      .command('uninstall')
      .description('Clean uninstallation')
      .option('--keep-config', 'Keep configuration files')
      .option('--keep-data', 'Keep workspace and skills')
      .action(async (opts) => {
        const config = loadConfig(program.opts());
        await uninstallCmd.default({ ...config, ...opts });
      });

    const createAgentCmd = await import('./commands/create-agent.js');
    program
      .command('create-agent <name>')
      .description('Create a new liberated agent')
      .option('-t, --template <name>', 'Agent template (triad, minimal)', 'triad')
      .option('--triad', 'Enable triad mode (3 agents)')
      .option('--model <name>', 'Model to use')
      .option('--model-url <url>', 'Model endpoint URL')
      .option('--workspace <path>', 'Workspace directory')
      .action(async (name, opts) => {
        const config = loadConfig(program.opts());
        await createAgentCmd.default(name, { ...config, ...opts });
      });

    const applyPatchCmd = await import('./commands/apply-patch.js');
    program
      .command('apply-patch <patch>')
      .description('Apply liberation patches manually')
      .option('--verify', 'Verify patch after applying')
      .action(async (patch, opts) => {
        const config = loadConfig(program.opts());
        await applyPatchCmd.default(patch, { ...config, ...opts });
      });

    const verifyCmd = await import('./commands/verify.js');
    program
      .command('verify')
      .description('Verify installation integrity')
      .option('--patches', 'Verify patches only')
      .option('--skills', 'Verify skills only')
      .option('--identity', 'Verify identity only')
      .action(async (opts) => {
        const config = loadConfig(program.opts());
        await verifyCmd.default({ ...config, ...opts });
      });

    const statusCmd = await import('./commands/status.js');
    program
      .command('status')
      .description('Show installation status')
      .action(async () => {
        const config = loadConfig(program.opts());
        await statusCmd.default(config);
      });
  } catch (e) {
    console.error(chalk.red(`Error loading commands: ${e.message}`));
    process.exit(1);
  }
}

// Interactive mode when no command given
async function interactiveMode() {
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
  
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║  🦞 Heretek-OpenClaw Installer v${packageJson.version.padEnd(33)}║
╚═══════════════════════════════════════════════════════════╝
  `));
  
  console.log('  1) Install (full installation)');
  console.log('  2) Update (update existing)');
  console.log('  3) Create Agent (add new agent)');
  console.log('  4) Verify (check installation)');
  console.log('  5) Status (show current status)');
  console.log('  6) Uninstall (remove installation)');
  console.log('  7) Exit');
  console.log('');
  
  const choice = await question(chalk.yellow('Select option [1-7]: '));
  
  rl.close();
  
  const commands = {
    '1': 'install',
    '2': 'update',
    '3': 'create-agent',
    '4': 'verify',
    '5': 'status',
    '6': 'uninstall',
    '7': 'exit'
  };
  
  if (choice === '7') {
    console.log(chalk.gray('Goodbye!'));
    process.exit(0);
  }
  
  if (commands[choice]) {
    const cmd = commands[choice];
    
    if (cmd === 'create-agent') {
      const agentName = await question(chalk.yellow('Enter agent name: '));
      if (agentName.trim()) {
        process.argv = ['heretek-openclaw', 'create-agent', agentName.trim()];
      } else {
        console.log(chalk.red('Agent name required'));
        process.exit(1);
      }
    } else if (cmd === 'exit') {
      console.log(chalk.gray('Goodbye!'));
      process.exit(0);
    } else {
      process.argv = ['heretek-openclaw', cmd];
    }
    
    // Re-parse with new argv
    await registerCommands();
    await program.parseAsync(process.argv);
  } else {
    console.log(chalk.red(`Invalid option: ${choice}`));
    process.exit(1);
  }
}

// Main execution
async function main() {
  // If no arguments, show interactive mode
  if (process.argv.length === 2) {
    // Check if stdin is interactive
    if (process.stdin.isTTY) {
      await interactiveMode();
      return;
    } else {
      program.help();
      return;
    }
  }
  
  await registerCommands();
  await program.parseAsync(process.argv);
}

main().catch((e) => {
  console.error(chalk.red(`Fatal error: ${e.message}`));
  if (program.opts()?.verbose) {
    console.error(e.stack);
  }
  process.exit(1);
});