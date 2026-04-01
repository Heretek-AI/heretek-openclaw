/**
 * OpenClaw CLI Configuration
 * 
 * This file contains configuration options for the OpenClaw CLI tool.
 */

export default {
  /**
   * CLI settings
   */
  cli: {
    name: 'openclaw',
    version: '1.0.0',
    description: 'Heretek OpenClaw - Unified Deployment CLI',
  },

  /**
   * Default paths
   */
  paths: {
    // OpenClaw installation directory
    openclawDir: '~/.openclaw',
    
    // Workspace directory for agents
    workspaceDir: '~/.openclaw/workspace',
    
    // Agents directory
    agentsDir: '~/.openclaw/agents',
    
    // Backups directory
    backupsDir: '~/.openclaw/backups',
    
    // Logs directory
    logsDir: '~/.openclaw/logs',
    
    // Cache directory
    cacheDir: '~/.openclaw/cache',
  },

  /**
   * Default deployment settings
   */
  deployment: {
    // Default deployment type
    defaultType: 'docker',
    
    // Docker settings
    docker: {
      composeFile: 'docker-compose.yml',
      projectName: 'openclaw',
    },
    
    // Kubernetes settings
    kubernetes: {
      namespace: 'openclaw',
      releaseName: 'openclaw',
      chartDir: './charts/openclaw',
    },
    
    // Cloud settings
    cloud: {
      terraformDir: './terraform',
      autoApprove: false,
    },
  },

  /**
   * Health check settings
   */
  health: {
    // Default timeout for health checks (ms)
    timeout: 5000,
    
    // Watch interval (seconds)
    watchInterval: 30,
    
    // Service endpoints
    endpoints: {
      gateway: 'http://localhost:18789',
      litellm: 'http://localhost:4000',
      postgres: 'localhost:5432',
      redis: 'localhost:6379',
      ollama: 'http://localhost:11434',
      langfuse: 'http://localhost:3000',
    },
  },

  /**
   * Backup settings
   */
  backup: {
    // Default backup directory
    directory: '~/.openclaw/backups',
    
    // Retention period (days)
    retentionDays: 30,
    
    // Compression enabled
    compress: true,
    
    // Backup schedule
    schedule: {
      full: '0 2 * * 0', // Sunday at 2 AM
      incremental: '0 2 * * 1-6', // Mon-Sat at 2 AM
    },
  },

  /**
   * Logging settings
   */
  logging: {
    // Default log level
    level: 'info',
    
    // Show timestamps
    timestamps: true,
    
    // Color output
    colors: true,
  },

  /**
   * Update settings
   */
  update: {
    // Check for updates on startup
    checkOnStartup: false,
    
    // Auto-update (not recommended for production)
    autoUpdate: false,
    
    // Update channel
    channel: 'stable',
  },

  /**
   * Feature flags
   */
  features: {
    // Enable interactive prompts
    interactive: true,
    
    // Enable telemetry (future)
    telemetry: false,
    
    // Enable experimental features
    experimental: false,
  },
};
