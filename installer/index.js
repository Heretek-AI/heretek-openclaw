/**
 * Installer module exports
 */

export { default as install } from './commands/install.js';
export { default as update } from './commands/update.js';
export { default as uninstall } from './commands/uninstall.js';
export { default as createAgent } from './commands/create-agent.js';
export { default as applyPatch } from './commands/apply-patch.js';
export { default as verify } from './commands/verify.js';
export { default as status } from './commands/status.js';

// Library modules
export * from './lib/logger.js';
export * from './lib/os-detect.js';
export * from './lib/patch-applier.js';
export * from './lib/agent-builder.js';
export * from './lib/skills-installer.js';

// Default configuration
export const DEFAULT_CONFIG = {
  version: '1.0.0',
  openclaw: {
    package: 'openclaw',
    version: '2026.3.23-2',
    registry: 'https://npmjs.org'
  },
  liberation: {
    package: '@heretek-ai/openclaw-liberation',
    version: '2026.3.23-2',
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