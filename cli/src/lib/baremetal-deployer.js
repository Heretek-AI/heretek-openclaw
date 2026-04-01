/**
 * Bare Metal Deployer
 * 
 * Handles bare metal (non-Docker) deployment for OpenClaw.
 * Installs and configures services directly on the host system.
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import log from './logger.js';

class BareMetalDeployer {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.installDir = options.installDir || '/opt/openclaw';
    this.configDir = options.configDir || '/etc/openclaw';
    this.dataDir = options.dataDir || '/var/lib/openclaw';
    this.logDir = options.logDir || '/var/log/openclaw';
    this.systemdDir = '/etc/systemd/system';
  }

  /**
   * Detect OS and package manager
   */
  async detectOS() {
    try {
      const { stdout } = await execa('cat', ['/etc/os-release']);
      const lines = stdout.split('\n');
      const osInfo = {};
      
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          osInfo[key] = value.replace(/"/g, '');
        }
      }

      let packageManager = 'apt';
      let installCommand = 'apt-get install -y';
      
      if (osInfo.ID_LIKE?.includes('rhel') || osInfo.ID === 'rhel' || osInfo.ID === 'centos' || osInfo.ID === 'fedora') {
        packageManager = 'dnf';
        installCommand = 'dnf install -y';
      } else if (osInfo.ID === 'arch' || osInfo.ID_LIKE?.includes('arch')) {
        packageManager = 'pacman';
        installCommand = 'pacman -S --noconfirm';
      }

      return {
        id: osInfo.ID,
        name: osInfo.NAME,
        version: osInfo.VERSION_ID,
        packageManager,
        installCommand,
      };
    } catch (error) {
      log.warn(`Failed to detect OS: ${error.message}`);
      return {
        id: 'unknown',
        name: 'Unknown',
        packageManager: 'apt',
        installCommand: 'apt-get install -y',
      };
    }
  }

  /**
   * Check if running as root
   */
  checkRoot() {
    return process.geteuid && process.geteuid() === 0;
  }

  /**
   * Check prerequisites
   */
  async checkPrerequisites() {
    const checks = {
      root: this.checkRoot(),
      node: false,
      nodeVersion: null,
      postgres: false,
      redis: false,
      ollama: false,
    };

    // Check Node.js
    try {
      const { stdout } = await execa('node', ['--version']);
      checks.node = true;
      checks.nodeVersion = stdout.trim();
    } catch {
      checks.node = false;
    }

    // Check PostgreSQL
    try {
      await execa('pg_isready', ['-h', 'localhost']);
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }

    // Check Redis
    try {
      const { stdout } = await execa('redis-cli', ['ping']);
      checks.redis = stdout.trim() === 'PONG';
    } catch {
      checks.redis = false;
    }

    // Check Ollama
    try {
      await execa('curl', ['-s', 'http://localhost:11434/api/tags']);
      checks.ollama = true;
    } catch {
      checks.ollama = false;
    }

    return checks;
  }

  /**
   * Install system dependencies
   */
  async installDependencies() {
    const osInfo = await this.detectOS();
    log.info(`Detected ${osInfo.name} - using ${osInfo.packageManager}`);

    const packages = [
      'nodejs',
      'npm',
      'postgresql',
      'postgresql-contrib',
      'redis-server',
      'curl',
      'wget',
      'git',
    ];

    log.info('Installing system dependencies...');
    
    try {
      // Update package lists
      await execa('apt-get', ['update'], { stdio: 'inherit' });
      
      // Install packages
      await execa('apt-get', ['install', '-y', ...packages], { stdio: 'inherit' });
      
      log.success('System dependencies installed');
      return true;
    } catch (error) {
      log.error(`Failed to install dependencies: ${error.message}`);
      return false;
    }
  }

  /**
   * Install Node.js specific version
   */
  async installNodeJS(version = '20') {
    log.info(`Installing Node.js v${version}...`);

    try {
      // Use NodeSource repository
      await execa('curl', ['-fsSL', `https://deb.nodesource.com/setup_${version}.x`, '-o', '/tmp/nodesource_setup.sh']);
      await execa('bash', ['/tmp/nodesource_setup.sh'], { stdio: 'inherit' });
      await execa('apt-get', ['install', '-y', 'nodejs'], { stdio: 'inherit' });
      
      const { stdout } = await execa('node', ['--version']);
      log.success(`Node.js ${stdout.trim()} installed`);
      return true;
    } catch (error) {
      log.error(`Failed to install Node.js: ${error.message}`);
      return false;
    }
  }

  /**
   * Install Ollama
   */
  async installOllama() {
    log.info('Installing Ollama...');

    try {
      await execa('curl', ['-fsSL', 'https://ollama.com/install.sh', '-o', '/tmp/ollama_install.sh']);
      await execa('bash', ['/tmp/ollama_install.sh'], { stdio: 'inherit' });
      
      log.success('Ollama installed');
      return true;
    } catch (error) {
      log.error(`Failed to install Ollama: ${error.message}`);
      return false;
    }
  }

  /**
   * Setup PostgreSQL database
   */
  async setupPostgres(options = {}) {
    const { 
      user = 'openclaw', 
      password = this.generatePassword(), 
      database = 'openclaw' 
    } = options;

    log.info('Setting up PostgreSQL...');

    try {
      // Start PostgreSQL service
      await execa('systemctl', ['start', 'postgresql']);
      await execa('systemctl', ['enable', 'postgresql']);

      // Create user and database
      await execa('sudo', ['-u', 'postgres', 'psql', '-c', `CREATE USER ${user} WITH PASSWORD '${password}';`]);
      await execa('sudo', ['-u', 'postgres', 'psql', '-c', `CREATE DATABASE ${database} OWNER ${user};`]);
      await execa('sudo', ['-u', 'postgres', 'psql', '-c', `GRANT ALL PRIVILEGES ON DATABASE ${database} TO ${user};`]);
      
      // Install pgvector extension
      await execa('sudo', ['-u', 'postgres', 'psql', '-d', database, '-c', 'CREATE EXTENSION IF NOT EXISTS vector;']);

      log.success(`PostgreSQL setup complete: database=${database}, user=${user}`);
      return { user, password, database, host: 'localhost', port: 5432 };
    } catch (error) {
      log.error(`Failed to setup PostgreSQL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup Redis
   */
  async setupRedis() {
    log.info('Setting up Redis...');

    try {
      // Start Redis service
      await execa('systemctl', ['start', 'redis-server']);
      await execa('systemctl', ['enable', 'redis-server']);

      // Configure Redis
      const redisConfig = `
# OpenClaw Redis Configuration
bind 127.0.0.1
port 6379
protected-mode yes
daemonize yes
pidfile /var/run/redis/redis-server.pid
logfile /var/log/redis/redis-server.log
dir /var/lib/redis
`;
      await fs.writeFile('/etc/redis/redis.conf', redisConfig);
      await execa('systemctl', ['restart', 'redis-server']);

      log.success('Redis setup complete');
      return { host: 'localhost', port: 6379 };
    } catch (error) {
      log.error(`Failed to setup Redis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create systemd service
   */
  async createSystemService(name, config) {
    const serviceContent = `[Unit]
Description=OpenClaw ${config.displayName || name}
After=network.target ${config.after || 'postgresql.service redis-server.service'}
${config.wants ? `Wants=${config.wants}` : ''}

[Service]
Type=${config.type || 'simple'}
User=${config.user || 'openclaw'}
Group=${config.group || 'openclaw'}
WorkingDirectory=${config.workingDir || this.installDir}
Environment=${config.environment || 'NODE_ENV=production'}
ExecStart=${config.execStart}
ExecReload=${config.execReload || `/bin/kill -s HUP $MAINPID`}
ExecStop=${config.execStop || '/bin/kill -s TERM $MAINPID'}
Restart=${config.restart || 'always'}
RestartSec=${config.restartSec || '10s'}
StandardOutput=append:${this.logDir}/${name}.log
StandardError=append:${this.logDir}/${name}.error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
`;

    const servicePath = path.join(this.systemdDir, `openclaw-${name}.service`);
    await fs.writeFile(servicePath, serviceContent);
    
    // Reload systemd
    await execa('systemctl', ['daemon-reload']);
    
    log.success(`Created systemd service: openclaw-${name}.service`);
    return servicePath;
  }

  /**
   * Install OpenClaw application
   */
  async installApp() {
    log.info('Installing OpenClaw application...');

    try {
      // Create directories
      await fs.ensureDir(this.installDir);
      await fs.ensureDir(this.configDir);
      await fs.ensureDir(this.dataDir);
      await fs.ensureDir(this.logDir);

      // Copy application files
      const files = [
        'package.json',
        'openclaw.json',
        'litellm_config.yaml',
        'scripts/',
        'agents/',
        'dashboard/',
      ];

      for (const file of files) {
        const src = path.join(this.rootDir, file);
        const dest = path.join(this.installDir, file);
        
        if (await fs.pathExists(src)) {
          await fs.copy(src, dest);
        }
      }

      // Install npm dependencies
      log.info('Installing npm dependencies...');
      await execa('npm', ['install', '--production'], { 
        cwd: this.installDir, 
        stdio: 'inherit' 
      });

      // Create system user
      try {
        await execa('useradd', ['-r', '-s', '/bin/false', 'openclaw']);
      } catch {
        // User might already exist
        log.debug('User openclaw may already exist');
      }

      // Set permissions
      await execa('chown', ['-R', 'openclaw:openclaw', this.installDir]);
      await execa('chown', ['-R', 'openclaw:openclaw', this.logDir]);

      log.success('OpenClaw application installed');
      return true;
    } catch (error) {
      log.error(`Failed to install application: ${error.message}`);
      return false;
    }
  }

  /**
   * Start services
   */
  async startServices(services = []) {
    const defaultServices = ['gateway', 'litellm', 'ollama'];
    const toStart = services.length > 0 ? services : defaultServices;

    log.info('Starting OpenClaw services...');

    for (const service of toStart) {
      try {
        await execa('systemctl', ['start', `openclaw-${service}`]);
        await execa('systemctl', ['enable', `openclaw-${service}`]);
        log.success(`Started openclaw-${service}`);
      } catch (error) {
        log.error(`Failed to start openclaw-${service}: ${error.message}`);
      }
    }

    return true;
  }

  /**
   * Stop services
   */
  async stopServices(services = []) {
    const defaultServices = ['gateway', 'litellm', 'ollama'];
    const toStop = services.length > 0 ? services : defaultServices;

    log.info('Stopping OpenClaw services...');

    for (const service of toStop) {
      try {
        await execa('systemctl', ['stop', `openclaw-${service}`]);
        log.success(`Stopped openclaw-${service}`);
      } catch (error) {
        log.error(`Failed to stop openclaw-${service}: ${error.message}`);
      }
    }

    return true;
  }

  /**
   * Get service status
   */
  async status() {
    const services = ['gateway', 'litellm', 'ollama', 'postgres', 'redis'];
    const results = [];

    for (const service of services) {
      try {
        const { stdout } = await execa('systemctl', ['is-active', `openclaw-${service}`]);
        results.push({
          name: service,
          active: stdout.trim() === 'active',
          status: stdout.trim(),
        });
      } catch {
        results.push({
          name: service,
          active: false,
          status: 'inactive',
        });
      }
    }

    return results;
  }

  /**
   * Generate secure password
   */
  generatePassword(length = 24) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const status = await this.status();
    const allHealthy = status.every(s => s.active);
    
    return {
      healthy: allHealthy,
      services: status,
    };
  }
}

export default BareMetalDeployer;
