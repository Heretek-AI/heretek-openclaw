/**
 * Config Command
 * 
 * Manage OpenClaw configuration including view, edit, validate, and reset.
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import log from '../lib/logger.js';
import ConfigManager from '../lib/config-manager.js';
import { promptConfirm, promptEditor } from '../lib/prompts.js';

const command = new Command('config');

command
  .description('Manage configuration')
  .addCommand(new Command('show')
    .description('Show current configuration')
    .option('--json', 'Output as JSON')
    .option('--path <path>', 'Show specific config path (e.g., models.providers)')
    .action((options) => handleConfigShow(options))
  )
  .addCommand(new Command('edit')
    .description('Edit configuration')
    .option('--path <path>', 'Edit specific config path')
    .action((options) => handleConfigEdit(options))
  )
  .addCommand(new Command('validate')
    .description('Validate configuration')
    .option('--strict', 'Enable strict validation')
    .action((options) => handleConfigValidate(options))
  )
  .addCommand(new Command('reset')
    .description('Reset configuration to defaults')
    .option('--confirm', 'Skip confirmation prompt')
    .action((options) => handleConfigReset(options))
  )
  .addCommand(new Command('get')
    .description('Get a specific configuration value')
    .argument('<path>', 'Configuration path (e.g., model_routing.default)')
    .action((path) => handleConfigGet(path))
  )
  .addCommand(new Command('set')
    .description('Set a configuration value')
    .argument('<path>', 'Configuration path (e.g., model_routing.default)')
    .argument('<value>', 'Value to set')
    .action((path, value) => handleConfigSet(path, value))
  );

/**
 * Handle config show
 */
async function handleConfigShow(options) {
  const configManager = new ConfigManager();

  try {
    await configManager.load();

    if (options.json) {
      if (options.path) {
        const value = configManager.get(options.path);
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(JSON.stringify(configManager.config, null, 2));
      }
      return;
    }

    log.section('OpenClaw Configuration');

    if (options.path) {
      const value = configManager.get(options.path);
      console.log(`\n  ${options.path}: ${JSON.stringify(value, null, 2)}`);
    } else {
      printConfigSummary(configManager.config);
    }
  } catch (error) {
    log.error(`Failed to show configuration: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Print configuration summary
 */
function printConfigSummary(config) {
  console.log(`
  Version: ${config.version || 'unknown'}
  Collective: ${config.collective?.name || 'unknown'}
  
  Models:
    Providers: ${Object.keys(config.models?.providers || {}).join(', ') || 'none'}
  
  Model Routing:
    Default: ${config.model_routing?.default || 'not set'}
    Failover: ${config.model_routing?.aliases?.failover || 'not set'}
  
  Agents: ${config.agents?.length || 0}
`);

  if (config.agents?.length > 0) {
    console.log('  Agent List:');
    config.agents.forEach(agent => {
      console.log(`    - ${agent.id} (${agent.role}): ${agent.model}`);
    });
  }
}

/**
 * Handle config edit
 */
async function handleConfigEdit(options) {
  const configManager = new ConfigManager();

  try {
    await configManager.load();

    log.info('Opening configuration editor...');
    console.log('  Edit the configuration and save to apply changes.\n');

    // In a real implementation, this would open the system editor
    // For now, we'll show the config file path
    console.log(`  Configuration file: ${configManager.configPath}`);
    console.log('\n  To edit manually:');
    console.log(`    nano ${configManager.configPath}`);
    console.log('    # or');
    console.log(`    code ${configManager.configPath}`);
  } catch (error) {
    log.error(`Failed to edit configuration: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle config validate
 */
async function handleConfigValidate(options) {
  const configManager = new ConfigManager();

  try {
    await configManager.load();

    log.section('Validating Configuration');

    const result = configManager.validate();

    if (result.valid) {
      log.success('Configuration is valid');
    } else {
      log.error('Configuration validation failed:');
      result.errors.forEach(e => log.error(`  ✗ ${e}`));
      
      if (result.warnings.length > 0) {
        log.warn('Warnings:');
        result.warnings.forEach(w => log.warn(`  ⚠ ${w}`));
      }
      
      process.exit(1);
    }
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle config reset
 */
async function handleConfigReset(options) {
  const configManager = new ConfigManager();

  if (!options.confirm) {
    const confirmed = await promptConfirm(
      'Reset configuration to defaults? This will overwrite current settings.',
      { default: false }
    );

    if (!confirmed) {
      log.info('Reset cancelled');
      return;
    }
  }

  try {
    log.section('Resetting Configuration');

    const defaultConfig = configManager.createDefault();
    await configManager.save(defaultConfig);

    log.success('Configuration reset to defaults');
  } catch (error) {
    log.error(`Reset failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle config get
 */
async function handleConfigGet(path) {
  const configManager = new ConfigManager();

  try {
    await configManager.load();

    const value = configManager.get(path);

    if (value === undefined) {
      log.warn(`Configuration path not found: ${path}`);
    } else {
      console.log(typeof value === 'object' 
        ? JSON.stringify(value, null, 2) 
        : value);
    }
  } catch (error) {
    log.error(`Failed to get configuration: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle config set
 */
async function handleConfigSet(path, value) {
  const configManager = new ConfigManager();

  try {
    await configManager.load();

    // Parse value type
    let parsedValue;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    configManager.set(path, parsedValue);
    await configManager.save();

    log.success(`Set ${path} = ${JSON.stringify(parsedValue)}`);
  } catch (error) {
    log.error(`Failed to set configuration: ${error.message}`);
    process.exit(1);
  }
}

export default command;
