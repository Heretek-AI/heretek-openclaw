/**
 * Logs Command
 * 
 * View and follow logs from OpenClaw services.
 */

import { Command } from 'commander';
import { execa } from 'execa';
import log from '../lib/logger.js';
import DeploymentManager from '../lib/deployment-manager.js';

const command = new Command('logs');

command
  .description('View logs from OpenClaw services')
  .argument('[service]', 'Service name (gateway, litellm, postgres, redis, ollama, etc.)')
  .option('-t, --type <type>', 'Deployment type (auto-detect if not specified)')
  .option('-f, --follow', 'Follow log output (tail -f mode)')
  .option('-n, --tail <lines>', 'Number of lines to show', '100')
  .option('--since <time>', 'Show logs since timestamp (e.g., 2024-01-01T00:00:00)')
  .option('--until <time>', 'Show logs until timestamp')
  .option('--timestamps', 'Show timestamps in logs')
  .option('--level <level>', 'Filter by log level (error, warn, info, debug)')
  .option('--grep <pattern>', 'Filter logs by pattern')
  .option('--json', 'Output as JSON (if supported)')
  .action(async (service, options) => {
    await handleLogs(service, options);
  });

/**
 * Handle logs command
 */
async function handleLogs(service, options) {
  const manager = new DeploymentManager({
    rootDir: process.cwd(),
    deploymentType: options.type,
  });

  try {
    // Determine deployment type and get logs
    const deployer = manager.deployer;

    if (deployer.logs) {
      // Use deployer's logs method
      await deployer.logs({
        services: service ? [service] : [],
        follow: options.follow,
        tail: options.tail,
        timestamps: options.timestamps,
      });
    } else {
      // Fallback to direct log viewing
      await viewLogsDirect(service, options);
    }
  } catch (error) {
    log.error(`Failed to view logs: ${error.message}`);
    process.exit(1);
  }
}

/**
 * View logs directly from files or system
 */
async function viewLogsDirect(service, options) {
  const logDir = '/var/log/openclaw';
  const fs = await import('fs-extra');

  // Check if log directory exists
  if (await fs.pathExists(logDir)) {
    const logFile = service 
      ? `${logDir}/${service}.log`
      : `${logDir}/openclaw.log`;

    if (await fs.pathExists(logFile)) {
      if (options.follow) {
        // Follow mode using tail -f
        const args = ['-f', logFile];
        if (options.tail !== 'all') {
          args.unshift('-n', options.tail);
        }
        await execa('tail', args, { stdio: 'inherit' });
      } else {
        // Read file directly
        const content = await fs.readFile(logFile, 'utf-8');
        console.log(content);
      }
      return;
    }
  }

  // Try journalctl for systemd services
  if (service) {
    try {
      const args = ['--no-pager'];
      
      if (options.follow) {
        args.push('-f');
      }
      
      if (options.tail && options.tail !== 'all') {
        args.push('-n', options.tail);
      }
      
      if (options.since) {
        args.push('--since', options.since);
      }

      args.push('-u', `openclaw-${service}`);

      await execa('journalctl', args, { stdio: 'inherit' });
      return;
    } catch {
      // journalctl not available
    }
  }

  log.error(`No logs found for service: ${service}`);
  console.log(`
Available log sources:
  - Docker: openclaw logs --type docker
  - Systemd: Check /var/log/openclaw/
  - Kubernetes: openclaw logs --type kubernetes
`);
}

/**
 * Filter logs by level
 */
function filterByLevel(content, level) {
  if (!level) return content;

  const levelPatterns = {
    error: /ERROR|error|Error|\[E\]/i,
    warn: /WARN|warn|Warn|WARNING|warning|\[W\]/i,
    info: /INFO|info|Info|\[I\]/i,
    debug: /DEBUG|debug|Debug|\[D\]/i,
  };

  const pattern = levelPatterns[level];
  if (!pattern) return content;

  return content.split('\n')
    .filter(line => pattern.test(line))
    .join('\n');
}

/**
 * Grep logs by pattern
 */
function grepLogs(content, pattern) {
  if (!pattern) return content;

  const regex = new RegExp(pattern, 'i');
  return content.split('\n')
    .filter(line => regex.test(line))
    .join('\n');
}

export default command;
