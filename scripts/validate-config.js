#!/usr/bin/env node
/**
 * Configuration Validator CLI
 * 
 * Validates litellm_config.yaml and openclaw.json configurations before deployment.
 * 
 * Usage:
 *   node scripts/validate-config.js [options]
 *   npm run validate:config
 * 
 * Options:
 *   --config <path>  Path to config file (default: auto-detect)
 *   --strict         Enable strict validation mode
 *   --json           Output results as JSON
 *   --quiet          Only output errors
 *   --help           Show help message
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    config: null,
    strict: false,
    json: false,
    quiet: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        options.config = args[++i];
        break;
      case '--strict':
        options.strict = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
${colors.cyan}Configuration Validator${colors.reset}
Validates litellm_config.yaml and openclaw.json configurations before deployment.

${colors.yellow}Usage:${colors.reset}
  node scripts/validate-config.js [options]
  npm run validate:config

${colors.yellow}Options:${colors.reset}
  --config <path>  Path to config file (default: auto-detect)
  --strict         Enable strict validation mode
  --json           Output results as JSON
  --quiet          Only output errors
  --help           Show help message

${colors.yellow}Examples:${colors.reset}
  node scripts/validate-config.js
  node scripts/validate-config.js --config ./openclaw.json
  node scripts/validate-config.js --strict --json
`);
}

/**
 * Parse YAML content (simple parser for basic YAML)
 */
function parseYaml(content) {
  // Simple YAML parser for basic key-value pairs and nested objects
  // For production use, consider using js-ymp package
  const result = {};
  const lines = content.split('\n');
  const stack = [result];
  const indentStack = [-1];

  for (const line of lines) {
    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    
    if (!match) continue;

    const [, , key, value] = match;
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    // Pop stack until we find parent with smaller indent
    while (indentStack[indentStack.length - 1] >= indent) {
      stack.pop();
      indentStack.pop();
    }

    const current = stack[stack.length - 1];

    if (trimmedValue === '' || trimmedValue === '|' || trimmedValue === '>') {
      // Nested object
      current[trimmedKey] = {};
      stack.push(current[trimmedKey]);
      indentStack.push(indent);
    } else if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      // Array on single line
      current[trimmedKey] = trimmedValue
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''));
    } else if (trimmedValue.startsWith('-')) {
      // Array item
      if (!Array.isArray(current[trimmedKey])) {
        current[trimmedKey] = [];
      }
      current[trimmedKey].push(trimmedValue.slice(1).trim());
    } else {
      // Simple value
      let parsedValue = trimmedValue;
      
      // Remove quotes
      if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
          (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
        parsedValue = parsedValue.slice(1, -1);
      } else if (parsedValue === 'true') {
        parsedValue = true;
      } else if (parsedValue === 'false') {
        parsedValue = false;
      } else if (/^\d+$/.test(parsedValue)) {
        parsedValue = parseInt(parsedValue, 10);
      } else if (/^\d+\.\d+$/.test(parsedValue)) {
        parsedValue = parseFloat(parsedValue);
      }

      current[trimmedKey] = parsedValue;
    }
  }

  return result;
}

/**
 * Validate YAML/JSON syntax
 */
function validateSyntax(content, filePath) {
  const errors = [];
  const extension = filePath.split('.').pop().toLowerCase();

  try {
    if (extension === 'json') {
      JSON.parse(content);
    } else if (extension === 'yaml' || extension === 'yml') {
      parseYaml(content);
    }
  } catch (error) {
    errors.push({
      type: 'syntax',
      message: `Invalid ${extension.toUpperCase()} syntax: ${error.message}`,
      line: error.line || 1,
    });
  }

  return errors;
}

/**
 * Validate required fields in openclaw.json
 */
function validateOpenClawRequiredFields(config) {
  const errors = [];
  const requiredFields = [
    'version',
    'collective',
    'models',
    'agents',
  ];

  for (const field of requiredFields) {
    if (!(field in config)) {
      errors.push({
        type: 'required_field',
        message: `Missing required field: ${field}`,
      });
    }
  }

  // Validate collective fields
  if (config.collective) {
    const collectiveFields = ['name', 'description', 'version'];
    for (const field of collectiveFields) {
      if (!(field in config.collective)) {
        errors.push({
          type: 'required_field',
          message: `Missing required collective field: ${field}`,
        });
      }
    }
  }

  // Validate model routing
  if (config.model_routing) {
    if (!config.model_routing.default) {
      errors.push({
        type: 'required_field',
        message: 'Missing model_routing.default field',
      });
    }
  }

  return errors;
}

/**
 * Validate API key format (non-empty check)
 */
function validateApiKeys(config, content) {
  const errors = [];
  
  // Check for API key references in the config
  const apiKeyPatterns = [
    /api[_-]?key["']?\s*[:=]\s*["']?["']/i,  // Empty API key
    /api[_-]?key["']?\s*[:=]\s*["']?\s*["']/i,
  ];

  for (const pattern of apiKeyPatterns) {
    if (pattern.test(content)) {
      errors.push({
        type: 'api_key',
        message: 'Empty API key detected. API keys must be non-empty values.',
      });
    }
  }

  // Check for placeholder API keys
  const placeholders = [
    'YOUR_API_KEY',
    'INSERT_API_KEY',
    'REPLACE_WITH_KEY',
    'xxx',
    'CHANGEME',
  ];

  for (const placeholder of placeholders) {
    if (content.includes(placeholder)) {
      errors.push({
        type: 'api_key',
        message: `Placeholder API key detected: ${placeholder}`,
      });
    }
  }

  return errors;
}

/**
 * Validate model names
 */
function validateModelNames(config) {
  const errors = [];
  const validModelPatterns = [
    /^(ollama|openai|anthropic|google|azure|aws|groq|together|deepseek|gemini)\/.+$/i,
    /^agent\/.+$/i,
    /^[a-z0-9_-]+\/[a-z0-9_-]+$/i,
  ];

  const validateModelName = (modelName, context) => {
    const isValid = validModelPatterns.some((pattern) => pattern.test(modelName));
    if (!isValid) {
      errors.push({
        type: 'model_name',
        message: `Invalid model name format: ${modelName} (${context})`,
      });
    }
  };

  // Validate models in models.providers
  if (config.models?.providers) {
    for (const [providerName, providerConfig] of Object.entries(config.models.providers)) {
      if (providerConfig.models && Array.isArray(providerConfig.models)) {
        for (const model of providerConfig.models) {
          if (model.id) validateModelName(model.id, `provider ${providerName}`);
          if (model.name) validateModelName(model.name, `provider ${providerName}`);
        }
      }
    }
  }

  // Validate agent models
  if (config.agents && Array.isArray(config.agents)) {
    for (const agent of config.agents) {
      if (agent.model) validateModelName(agent.model, `agent ${agent.id || agent.name}`);
    }
  }

  // Validate model_routing aliases
  if (config.model_routing?.aliases) {
    for (const [alias, model] of Object.entries(config.model_routing.aliases)) {
      validateModelName(model, `alias ${alias}`);
    }
  }

  return errors;
}

/**
 * Validate port conflict detection
 */
function validatePortConflicts(config) {
  const errors = [];
  const usedPorts = new Map();

  // Collect all ports from agents
  if (config.agents && Array.isArray(config.agents)) {
    for (const agent of config.agents) {
      if (agent.port) {
        const port = parseInt(agent.port, 10);
        
        // Check for valid port range
        if (port < 1 || port > 65535) {
          errors.push({
            type: 'port_conflict',
            message: `Invalid port number ${port} for agent ${agent.id || agent.name}. Port must be between 1 and 65535.`,
          });
          continue;
        }

        // Check for conflicts
        if (usedPorts.has(port)) {
          errors.push({
            type: 'port_conflict',
            message: `Port conflict detected: port ${port} is used by both ${usedPorts.get(port)} and ${agent.id || agent.name}`,
          });
        } else {
          usedPorts.set(port, agent.id || agent.name);
        }
      }
    }
  }

  return errors;
}

/**
 * Validate environment variable references
 */
function validateEnvReferences(config, content) {
  const errors = [];
  const warnings = [];

  // Find all environment variable references
  const envPattern = /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/gi;
  const matches = content.matchAll(envPattern);
  
  const envVars = new Set();
  for (const match of matches) {
    const envVar = match[1] || match[2];
    if (envVar) {
      envVars.add(envVar);
    }
  }

  // Check for potentially missing environment variables
  const commonEnvVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'REDIS_URL',
    'API_KEY',
    'SECRET_KEY',
  ];

  for (const envVar of envVars) {
    // Check if the environment variable looks incomplete
    if (envVar.length < 3) {
      warnings.push({
        type: 'env_reference',
        message: `Short environment variable name: $${envVar}. Consider using a more descriptive name.`,
      });
    }

    // Check for common patterns that might indicate a template
    if (envVar.includes('TODO') || envVar.includes('REPLACE') || envVar.includes('XXX')) {
      errors.push({
        type: 'env_reference',
        message: `Placeholder environment variable detected: ${envVar}`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate LiteLLM config structure
 */
function validateLiteLLMConfig(config) {
  const errors = [];

  // Check for general settings
  if (config.general_settings) {
    const settings = config.general_settings;
    
    if (settings.router_general && typeof settings.router_general === 'object') {
      const routerSettings = settings.router_general;
      
      // Validate router settings
      if (routerSettings.num_retries && routerSettings.num_retries < 0) {
        errors.push({
          type: 'litellm_config',
          message: 'Invalid num_retries: must be non-negative',
        });
      }
    }
  }

  // Check for model list
  if (config.model_list && Array.isArray(config.model_list)) {
    for (let i = 0; i < config.model_list.length; i++) {
      const model = config.model_list[i];
      
      if (!model.model_name) {
        errors.push({
          type: 'litellm_config',
          message: `model_list[${i}]: Missing required field 'model_name'`,
        });
      }
      
      if (!model.litellm_params) {
        errors.push({
          type: 'litellm_config',
          message: `model_list[${i}]: Missing required field 'litellm_params'`,
        });
      } else if (!model.litellm_params.model) {
        errors.push({
          type: 'litellm_config',
          message: `model_list[${i}]: Missing required field 'litellm_params.model'`,
        });
      }
    }
  }

  return errors;
}

/**
 * Main validation function
 */
function validateConfig(filePath, options) {
  const results = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Check if file exists
  if (!existsSync(filePath)) {
    results.valid = false;
    results.errors.push({
      type: 'file',
      message: `File not found: ${filePath}`,
    });
    return results;
  }

  // Read file content
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    results.valid = false;
    results.errors.push({
      type: 'file',
      message: `Failed to read file: ${error.message}`,
    });
    return results;
  }

  results.info.push(`Validating: ${filePath}`);

  // Validate syntax
  const syntaxErrors = validateSyntax(content, filePath);
  results.errors.push(...syntaxErrors);

  if (syntaxErrors.length > 0) {
    results.valid = false;
    return results;
  }

  // Parse config based on file type
  const extension = filePath.split('.').pop().toLowerCase();
  let config;
  try {
    if (extension === 'json') {
      config = JSON.parse(content);
    } else if (extension === 'yaml' || extension === 'yml') {
      config = parseYaml(content);
    }
  } catch (error) {
    // Already caught in syntax validation
    return results;
  }

  // File-specific validations
  const fileName = filePath.split('/').pop().toLowerCase();

  if (fileName.includes('openclaw')) {
    // Validate openclaw.json specific rules
    results.errors.push(...validateOpenClawRequiredFields(config));
    results.errors.push(...validateApiKeys(config, content));
    results.errors.push(...validateModelNames(config));
    results.errors.push(...validatePortConflicts(config));
    
    const envResult = validateEnvReferences(config, content);
    results.errors.push(...envResult.errors);
    results.warnings.push(...envResult.warnings);
  } else if (fileName.includes('litellm')) {
    // Validate LiteLLM config specific rules
    results.errors.push(...validateLiteLLMConfig(config));
    results.errors.push(...validateApiKeys(config, content));
    
    const envResult = validateEnvReferences(config, content);
    results.errors.push(...envResult.errors);
    results.warnings.push(...envResult.warnings);
  }

  // Strict mode validations
  if (options.strict) {
    // Additional strict validations can be added here
    if (!config.version && !config.collective?.version) {
      results.warnings.push({
        type: 'strict',
        message: 'No version field found. Consider adding version tracking.',
      });
    }
  }

  results.valid = results.errors.length === 0;
  return results;
}

/**
 * Format validation results for output
 */
function formatResults(results, options) {
  if (options.json) {
    return JSON.stringify(results, null, 2);
  }

  const lines = [];
  const { valid, errors, warnings, info, file } = results;

  if (!options.quiet) {
    lines.push(`${colors.cyan}=== Configuration Validation ===${colors.reset}`);
    lines.push(`${colors.blue}File:${colors.reset} ${file}`);
    lines.push('');
  }

  if (valid) {
    lines.push(`${colors.green}✓ Validation passed${colors.reset}`);
  } else {
    lines.push(`${colors.red}✗ Validation failed${colors.reset}`);
  }
  lines.push('');

  // Info messages
  if (info.length > 0 && !options.quiet) {
    for (const item of info) {
      lines.push(`${colors.blue}ℹ${colors.reset} ${item}`);
    }
    lines.push('');
  }

  // Errors
  if (errors.length > 0) {
    lines.push(`${colors.red}Errors (${errors.length}):${colors.reset}`);
    for (const error of errors) {
      lines.push(`  ${colors.red}✗${colors.reset} [${error.type}] ${error.message}`);
    }
    lines.push('');
  }

  // Warnings
  if (warnings.length > 0) {
    lines.push(`${colors.yellow}Warnings (${warnings.length}):${colors.reset}`);
    for (const warning of warnings) {
      lines.push(`  ${colors.yellow}⚠${colors.reset} [${warning.type}] ${warning.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Find default config files
 */
function findDefaultConfigFiles() {
  const defaultFiles = [
    join(ROOT_DIR, 'openclaw.json'),
    join(ROOT_DIR, 'litellm_config.yaml'),
    join(ROOT_DIR, 'litellm_config.yml'),
    join(ROOT_DIR, 'config', 'litellm_config.yaml'),
    join(ROOT_DIR, 'config', 'litellm_config.yml'),
  ];

  return defaultFiles.filter((file) => existsSync(file));
}

/**
 * Main entry point
 */
function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  let configFiles = [];

  if (options.config) {
    configFiles = [options.config];
  } else {
    configFiles = findDefaultConfigFiles();
  }

  if (configFiles.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} No configuration files found.`);
    console.error('Use --config <path> to specify a configuration file.');
    process.exit(1);
  }

  let allValid = true;
  const allResults = [];

  for (const configFile of configFiles) {
    const results = validateConfig(configFile, options);
    allResults.push(results);
    
    if (!results.valid) {
      allValid = false;
    }

    console.log(formatResults(results, options));
  }

  // Summary
  if (!options.json && configFiles.length > 1) {
    console.log(`${colors.cyan}=== Summary ===${colors.reset}`);
    console.log(`Files validated: ${configFiles.length}`);
    console.log(`Passed: ${allResults.filter((r) => r.valid).length}`);
    console.log(`Failed: ${allResults.filter((r) => !r.valid).length}`);
    console.log('');
  }

  process.exit(allValid ? 0 : 1);
}

// Run main function
main();
