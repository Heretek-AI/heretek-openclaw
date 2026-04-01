#!/usr/bin/env node

/**
 * Heretek OpenClaw CLI - Main Entry Point
 * 
 * Unified command-line interface for OpenClaw deployment and management.
 * 
 * Usage:
 *   openclaw <command> [options]
 * 
 * Commands:
 *   init       Initialize deployment configuration
 *   deploy     Deploy OpenClaw
 *   status     Check deployment status
 *   logs       View logs
 *   stop       Stop deployment
 *   backup     Manage backups
 *   config     Manage configuration
 *   update     Update OpenClaw
 *   agents     Manage agents
 *   health     Run health checks
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Get CLI version from package.json
const pkg = require('../package.json');

// Import Commander
import { program } from 'commander';

// Configure program
program
  .name('openclaw')
  .description('Heretek OpenClaw - Unified Deployment CLI')
  .version(pkg.version, '-v, --version', 'Display CLI version')
  .helpOption('-h, --help', 'Display help for command')
  .addHelpText('before', `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  Heretek OpenClaw CLI v${pkg.version}
║  Unified deployment and management tool                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);

// Register commands
const commands = [
  { name: 'init', description: 'Initialize deployment configuration', file: '../src/commands/init.js' },
  { name: 'deploy', description: 'Deploy OpenClaw', file: '../src/commands/deploy.js' },
  { name: 'status', description: 'Check deployment status', file: '../src/commands/status.js' },
  { name: 'logs', description: 'View logs', file: '../src/commands/logs.js' },
  { name: 'stop', description: 'Stop deployment', file: '../src/commands/stop.js' },
  { name: 'backup', description: 'Manage backups', file: '../src/commands/backup.js' },
  { name: 'config', description: 'Manage configuration', file: '../src/commands/config.js' },
  { name: 'update', description: 'Update OpenClaw', file: '../src/commands/update.js' },
  { name: 'agents', description: 'Manage agents', file: '../src/commands/agents.js' },
  { name: 'health', description: 'Run health checks', file: '../src/commands/health.js' },
];

// Add commands to program
commands.forEach(({ name, description, file }) => {
  try {
    const commandModule = require(file);
    if (commandModule.default) {
      program.addCommand(commandModule.default);
    }
  } catch (error) {
    console.error(`Failed to load command '${name}': ${error.message}`);
  }
});

// Handle unknown commands
program.on('command:*', () => {
  console.error(`Error: Unknown command '${program.args.join(' ')}'`);
  console.error('Run "openclaw --help" to see available commands.');
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
