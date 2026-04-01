/**
 * Docker Deployer
 * 
 * Handles Docker Compose deployment for OpenClaw.
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import log from './logger.js';

class DockerDeployer {
  constructor(options = {}) {
    this.composeFile = options.composeFile || 'docker-compose.yml';
    this.projectName = options.projectName || 'openclaw';
    this.rootDir = options.rootDir || process.cwd();
  }

  /**
   * Check if Docker is available
   */
  async checkDocker() {
    try {
      await execa('docker', ['--version']);
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        error: 'Docker is not installed or not in PATH' 
      };
    }
  }

  /**
   * Check if Docker Compose is available
   */
  async checkDockerCompose() {
    try {
      // Try new compose command first
      await execa('docker', ['compose', 'version']);
      return { available: true, command: 'docker compose' };
    } catch {
      try {
        // Fallback to docker-compose
        await execa('docker-compose', ['--version']);
        return { available: true, command: 'docker-compose' };
      } catch (error) {
        return { 
          available: false, 
          error: 'Docker Compose is not installed' 
        };
      }
    }
  }

  /**
   * Validate Docker Compose file
   */
  async validateComposeFile() {
    const composePath = path.join(this.rootDir, this.composeFile);
    
    if (!await fs.pathExists(composePath)) {
      return { 
        valid: false, 
        error: `Compose file not found: ${composePath}` 
      };
    }

    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        return { valid: false, error: composeCmd.error };
      }

      await execa(composeCmd.command, ['-f', composePath, 'config'], {
        cwd: this.rootDir,
      });

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Compose file validation failed: ${error.message}` 
      };
    }
  }

  /**
   * Pull latest images
   */
  async pull() {
    log.info('Pulling latest Docker images...');
    
    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      await execa(composeCmd.command, ['-f', this.composeFile, 'pull'], {
        cwd: this.rootDir,
        stdio: 'inherit',
      });

      log.success('Docker images pulled successfully');
      return true;
    } catch (error) {
      log.error(`Failed to pull images: ${error.message}`);
      return false;
    }
  }

  /**
   * Start deployment
   */
  async up(options = {}) {
    const { detach = true, build = false, forceRecreate = false } = options;

    log.info('Starting Docker Compose deployment...');

    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const args = ['-f', this.composeFile, 'up'];
      
      if (detach) args.push('-d');
      if (build) args.push('--build');
      if (forceRecreate) args.push('--force-recreate');

      await execa(composeCmd.command, args, {
        cwd: this.rootDir,
        stdio: 'inherit',
      });

      log.success('Docker Compose deployment started');
      return true;
    } catch (error) {
      log.error(`Failed to start deployment: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop deployment
   */
  async down(options = {}) {
    const { removeVolumes = false, removeOrphans = false } = options;

    log.info('Stopping Docker Compose deployment...');

    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const args = ['-f', this.composeFile, 'down'];
      
      if (removeVolumes) args.push('-v');
      if (removeOrphans) args.push('--remove-orphans');

      await execa(composeCmd.command, args, {
        cwd: this.rootDir,
        stdio: 'inherit',
      });

      log.success('Docker Compose deployment stopped');
      return true;
    } catch (error) {
      log.error(`Failed to stop deployment: ${error.message}`);
      return false;
    }
  }

  /**
   * Restart services
   */
  async restart(services = []) {
    log.info('Restarting services...');

    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const args = ['-f', this.composeFile, 'restart'];
      if (services.length > 0) {
        args.push(...services);
      }

      await execa(composeCmd.command, args, {
        cwd: this.rootDir,
        stdio: 'inherit',
      });

      log.success('Services restarted');
      return true;
    } catch (error) {
      log.error(`Failed to restart services: ${error.message}`);
      return false;
    }
  }

  /**
   * Get service status
   */
  async status() {
    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const { stdout } = await execa(composeCmd.command, ['-f', this.composeFile, 'ps'], {
        cwd: this.rootDir,
      });

      return {
        running: true,
        output: stdout,
      };
    } catch (error) {
      return {
        running: false,
        error: error.message,
      };
    }
  }

  /**
   * View logs
   */
  async logs(options = {}) {
    const { services = [], follow = false, tail = 'all', timestamps = false } = options;

    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const args = ['-f', this.composeFile, 'logs'];
      
      if (follow) args.push('-f');
      if (tail !== 'all') args.push('--tail', tail.toString());
      if (timestamps) args.push('-t');
      
      if (services.length > 0) {
        args.push(...services);
      }

      const subprocess = execa(composeCmd.command, args, {
        cwd: this.rootDir,
        stdio: 'inherit',
      });

      return subprocess;
    } catch (error) {
      log.error(`Failed to view logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute command in container
   */
  async exec(service, command, options = {}) {
    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const args = ['-f', this.composeFile, 'exec'];
      
      if (options.workdir) args.push('-w', options.workdir);
      if (options.user) args.push('-u', options.user);
      if (options.env) {
        for (const [key, value] of Object.entries(options.env)) {
          args.push('-e', `${key}=${value}`);
        }
      }

      args.push(service, ...command);

      const { stdout } = await execa(composeCmd.command, args, {
        cwd: this.rootDir,
      });

      return stdout;
    } catch (error) {
      log.error(`Failed to execute command in ${service}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run database migration
   */
  async migrate() {
    log.info('Running database migrations...');
    return this.exec('gateway', ['npm', 'run', 'migrate']);
  }

  /**
   * Health check
   */
  async healthCheck() {
    const status = await this.status();
    
    if (!status.running) {
      return { healthy: false, error: status.error };
    }

    // Parse ps output to check container health
    const lines = status.output.split('\n').filter(l => l.trim());
    const unhealthy = lines.some(line => 
      line.includes('unhealthy') || line.includes('exited') || line.includes('dead')
    );

    return {
      healthy: !unhealthy,
      details: status.output,
    };
  }

  /**
   * Get container info
   */
  async info() {
    try {
      const composeCmd = await this.checkDockerCompose();
      if (!composeCmd.available) {
        throw new Error(composeCmd.error);
      }

      const { stdout } = await execa(composeCmd.command, [
        '-f', this.composeFile, 'ps', '--format', 'json'
      ], {
        cwd: this.rootDir,
      });

      const containers = stdout.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      
      return {
        containers,
        count: containers.length,
      };
    } catch (error) {
      return {
        containers: [],
        count: 0,
        error: error.message,
      };
    }
  }
}

export default DockerDeployer;
