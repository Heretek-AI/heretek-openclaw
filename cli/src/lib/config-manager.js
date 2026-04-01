/**
 * Configuration Manager
 * 
 * Manages OpenClaw configuration files including openclaw.json, .env,
 * and deployment-specific configurations.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import dotenv from 'dotenv';
import log from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default paths
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '';
const DEFAULT_OPENCLAW_DIR = path.join(HOME_DIR, '.openclaw');
const DEFAULT_WORKSPACE_DIR = path.join(DEFAULT_OPENCLAW_DIR, 'workspace');
const DEFAULT_AGENTS_DIR = path.join(DEFAULT_OPENCLAW_DIR, 'agents');

// Configuration schema
const configSchema = {
  version: { type: 'string', required: true },
  collective: {
    type: 'object',
    required: true,
    properties: {
      name: { type: 'string', required: true },
      description: { type: 'string', required: true },
      version: { type: 'string', required: true },
    },
  },
  models: { type: 'object', required: true },
  agents: { type: 'array', required: true },
  model_routing: { type: 'object', required: false },
};

class ConfigManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.openclawDir = options.openclawDir || DEFAULT_OPENCLAW_DIR;
    this.configPath = options.configPath || path.join(this.rootDir, 'openclaw.json');
    this.envPath = options.envPath || path.join(this.rootDir, '.env');
    this.config = null;
    this.env = {};
  }

  /**
   * Load configuration from openclaw.json
   */
  async load() {
    try {
      if (!await fs.pathExists(this.configPath)) {
        log.warn(`Configuration file not found: ${this.configPath}`);
        return null;
      }

      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      log.debug(`Loaded configuration from ${this.configPath}`);
      return this.config;
    } catch (error) {
      log.error(`Failed to load configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save configuration to openclaw.json
   */
  async save(config = null) {
    try {
      const configToSave = config || this.config;
      if (!configToSave) {
        throw new Error('No configuration to save');
      }

      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2), 'utf-8');
      log.success(`Configuration saved to ${this.configPath}`);
      return configToSave;
    } catch (error) {
      log.error(`Failed to save configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load environment variables from .env file
   */
  async loadEnv() {
    try {
      if (!await fs.pathExists(this.envPath)) {
        log.debug(`Environment file not found: ${this.envPath}`);
        return {};
      }

      const content = await fs.readFile(this.envPath, 'utf-8');
      this.env = dotenv.parse(content);
      
      // Merge with process.env
      Object.entries(this.env).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });

      log.debug(`Loaded environment from ${this.envPath}`);
      return this.env;
    } catch (error) {
      log.error(`Failed to load environment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save environment variables to .env file
   */
  async saveEnv(env = null) {
    try {
      const envToSave = env || this.env;
      
      // Generate .env content
      let content = '# Heretek OpenClaw Environment Configuration\n';
      content += `# Generated on ${new Date().toISOString()}\n\n`;

      // Group environment variables by category
      const categories = {
        'LiteLLM Gateway': ['LITELLM_MASTER_KEY', 'LITELLM_SALT_KEY', 'LITELLM_HOST'],
        'AI Provider API Keys': ['MINIMAX_API_KEY', 'ZAI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'OLLAMA_HOST'],
        'Database': ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DATABASE_URL', 'REDIS_URL'],
        'OpenClaw': ['OPENCLAW_DIR', 'OPENCLAW_WORKSPACE', 'DEPLOYMENT_TYPE'],
        'Observability': ['LANGFUSE_ENABLED', 'LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY', 'LANGFUSE_HOST'],
      };

      for (const [category, keys] of Object.entries(categories)) {
        content += `# =============================================================================\n`;
        content += `# ${category}\n`;
        content += `# =============================================================================\n`;
        
        for (const key of keys) {
          if (envToSave[key] !== undefined) {
            content += `${key}=${envToSave[key]}\n`;
          } else if (process.env[key]) {
            content += `${key}=${process.env[key]}\n`;
          }
        }
        content += '\n';
      }

      await fs.writeFile(this.envPath, content, 'utf-8');
      log.success(`Environment saved to ${this.envPath}`);
      return envToSave;
    } catch (error) {
      log.error(`Failed to save environment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate configuration against schema
   */
  validate(config = null) {
    const configToValidate = config || this.config;
    const errors = [];
    const warnings = [];

    if (!configToValidate) {
      errors.push('No configuration to validate');
      return { valid: false, errors, warnings };
    }

    // Check required top-level fields
    for (const [field, schema] of Object.entries(configSchema)) {
      if (schema.required && !(field in configToValidate)) {
        errors.push(`Missing required field: ${field}`);
      } else if (field in configToValidate) {
        const value = configToValidate[field];
        
        // Type checking
        if (schema.type === 'string' && typeof value !== 'string') {
          errors.push(`Field '${field}' must be a string`);
        } else if (schema.type === 'object' && (typeof value !== 'object' || value === null)) {
          errors.push(`Field '${field}' must be an object`);
        } else if (schema.type === 'array' && !Array.isArray(value)) {
          errors.push(`Field '${field}' must be an array`);
        }

        // Nested property validation
        if (schema.type === 'object' && schema.properties && typeof value === 'object') {
          for (const [prop, propSchema] of Object.entries(schema.properties)) {
            if (propSchema.required && !(prop in value)) {
              errors.push(`Missing required property '${field}.${prop}'`);
            }
          }
        }
      }
    }

    // Validate agents array
    if (Array.isArray(configToValidate.agents)) {
      const agentIds = new Set();
      for (const agent of configToValidate.agents) {
        if (!agent.id) {
          errors.push('Agent missing required "id" field');
        } else if (agentIds.has(agent.id)) {
          errors.push(`Duplicate agent ID: ${agent.id}`);
        } else {
          agentIds.add(agent.id);
        }

        if (!agent.model) {
          warnings.push(`Agent '${agent.id}' missing model assignment`);
        }
      }
    }

    // Validate model routing
    if (configToValidate.model_routing) {
      if (!configToValidate.model_routing.default) {
        warnings.push('model_routing.default not set');
      }
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings };
  }

  /**
   * Get a specific configuration value
   */
  get(key, defaultValue = undefined) {
    if (!this.config) {
      return defaultValue;
    }

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[k];
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a specific configuration value
   */
  set(key, value) {
    if (!this.config) {
      this.config = {};
    }

    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
    return this.config;
  }

  /**
   * Get environment variable
   */
  getEnv(key, defaultValue = undefined) {
    return this.env[key] || process.env[key] || defaultValue;
  }

  /**
   * Set environment variable
   */
  setEnv(key, value) {
    this.env[key] = value;
    process.env[key] = value;
  }

  /**
   * Create default configuration
   */
  createDefault() {
    return {
      version: '2.0.0',
      collective: {
        name: 'OpenClaw Collective',
        description: 'Self-improving autonomous agent collective',
        version: '2.0.0',
      },
      models: {
        providers: {
          ollama: {
            type: 'ollama',
            models: [
              { id: 'ollama/llama2', name: 'Llama 2' },
              { id: 'ollama/nomic-embed-text-v2-moe', name: 'Nomic Embed' },
            ],
          },
        },
      },
      agents: [
        {
          id: 'steward',
          name: 'Steward',
          role: 'Orchestrator',
          model: 'agent/steward',
          port: 18790,
        },
      ],
      model_routing: {
        default: 'ollama/llama2',
        aliases: {
          failover: 'ollama/llama2',
        },
      },
    };
  }

  /**
   * Initialize configuration directory
   */
  async initConfigDir() {
    try {
      await fs.ensureDir(this.openclawDir);
      await fs.ensureDir(DEFAULT_WORKSPACE_DIR);
      await fs.ensureDir(DEFAULT_AGENTS_DIR);
      
      log.success(`Initialized OpenClaw directory: ${this.openclawDir}`);
      return this.openclawDir;
    } catch (error) {
      log.error(`Failed to initialize config directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get configuration paths
   */
  getPaths() {
    return {
      rootDir: this.rootDir,
      openclawDir: this.openclawDir,
      workspaceDir: DEFAULT_WORKSPACE_DIR,
      agentsDir: DEFAULT_AGENTS_DIR,
      configPath: this.configPath,
      envPath: this.envPath,
    };
  }
}

export default ConfigManager;
