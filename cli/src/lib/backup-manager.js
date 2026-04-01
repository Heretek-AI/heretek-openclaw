/**
 * Backup Manager
 * 
 * Manages OpenClaw backups including creation, restoration, listing,
 * and scheduling.
 */

import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import log from './logger.js';

class BackupManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.backupDir = options.backupDir || path.join(process.env.HOME || '', '.openclaw', 'backups');
    this.tempDir = options.tempDir || '/tmp/openclaw-backup';
    this.retentionDays = options.retentionDays || 30;
    
    // Database settings
    this.postgresHost = options.postgresHost || 'localhost';
    this.postgresPort = options.postgresPort || 5432;
    this.postgresUser = options.postgresUser || 'openclaw';
    this.postgresDb = options.postgresDb || 'openclaw';
    this.redisHost = options.redisHost || 'localhost';
    this.redisPort = options.redisPort || 6379;
  }

  /**
   * Initialize backup directories
   */
  async init() {
    log.info('Initializing backup directories...');

    await fs.ensureDir(this.backupDir);
    await fs.ensureDir(path.join(this.backupDir, 'postgresql'));
    await fs.ensureDir(path.join(this.backupDir, 'redis'));
    await fs.ensureDir(path.join(this.backupDir, 'workspace'));
    await fs.ensureDir(path.join(this.backupDir, 'agent-state'));
    await fs.ensureDir(path.join(this.backupDir, 'config'));
    await fs.ensureDir(this.tempDir);

    log.success('Backup directories initialized');
  }

  /**
   * Generate backup name
   */
  generateBackupName(type = 'incremental') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const dayOfWeek = new Date().getDay();
    
    // Full backup on Sunday (0), incremental otherwise
    const backupType = type === 'auto' 
      ? (dayOfWeek === 0 ? 'full' : 'incremental')
      : type;

    return `openclaw_${backupType}_${timestamp}`;
  }

  /**
   * Create backup
   */
  async create(options = {}) {
    const { 
      type = 'incremental', 
      verify = false,
      compress = true,
    } = options;

    log.section('Creating Backup');

    await this.init();

    const backupName = this.generateBackupName(type);
    log.info(`Creating ${type} backup: ${backupName}`);

    const results = {
      name: backupName,
      type,
      timestamp: new Date().toISOString(),
      components: {},
      errors: [],
    };

    // Backup PostgreSQL
    try {
      results.components.postgresql = await this.backupPostgres(backupName, compress);
    } catch (error) {
      results.errors.push({ component: 'postgresql', error: error.message });
    }

    // Backup Redis
    try {
      results.components.redis = await this.backupRedis(backupName);
    } catch (error) {
      results.errors.push({ component: 'redis', error: error.message });
    }

    // Backup workspace
    try {
      results.components.workspace = await this.backupWorkspace(backupName, compress);
    } catch (error) {
      results.errors.push({ component: 'workspace', error: error.message });
    }

    // Backup agent state
    try {
      results.components.agentState = await this.backupAgentState(backupName, compress);
    } catch (error) {
      results.errors.push({ component: 'agent-state', error: error.message });
    }

    // Backup configuration
    try {
      results.components.config = await this.backupConfig(backupName, compress);
    } catch (error) {
      results.errors.push({ component: 'config', error: error.message });
    }

    // Generate checksums
    await this.generateChecksums(backupName);

    // Verify if requested
    if (verify) {
      results.verification = await this.verify(backupName);
    }

    results.success = results.errors.length === 0;
    
    if (results.success) {
      log.success(`Backup created: ${backupName}`);
    } else {
      log.warn(`Backup completed with ${results.errors.length} error(s)`);
    }

    return results;
  }

  /**
   * Backup PostgreSQL database
   */
  async backupPostgres(backupName, compress = true) {
    log.info('Backing up PostgreSQL...');

    const outputFile = path.join(this.backupDir, 'postgresql', `${backupName}_postgresql.sql`);
    
    try {
      // Use pg_dump for backup
      const password = process.env.POSTGRES_PASSWORD || '';
      const env = { ...process.env, PGPASSWORD: password };

      await execa('pg_dump', [
        '-h', this.postgresHost,
        '-p', this.postgresPort.toString(),
        '-U', this.postgresUser,
        '-d', this.postgresDb,
        '-F', 'c', // Custom format
        '-f', `${outputFile}.dump`,
      ], { env });

      if (compress) {
        await execa('gzip', ['-f', `${outputFile}.dump`]);
      }

      // Also create SQL text backup
      await execa('pg_dump', [
        '-h', this.postgresHost,
        '-p', this.postgresPort.toString(),
        '-U', this.postgresUser,
        '-d', this.postgresDb,
        '-f', outputFile,
      ], { env });

      if (compress) {
        await execa('gzip', ['-f', outputFile]);
      }

      log.success('PostgreSQL backup created');
      return {
        success: true,
        files: [
          `${outputFile}.dump.gz`,
          `${outputFile}.gz`,
        ],
      };
    } catch (error) {
      log.warn(`PostgreSQL backup skipped: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Backup Redis database
   */
  async backupRedis(backupName) {
    log.info('Backing up Redis...');

    const outputFile = path.join(this.backupDir, 'redis', `${backupName}_redis.rdb`);

    try {
      // Trigger BGSAVE
      await execa('redis-cli', [
        '-h', this.redisHost,
        '-p', this.redisPort.toString(),
        'BGSAVE',
      ]);

      log.info('Waiting for Redis BGSAVE to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Try to copy RDB file
      const rdbPaths = ['/var/lib/redis/dump.rdb', '/var/lib/redis/6379/dump.rdb'];
      
      for (const rdbPath of rdbPaths) {
        if (await fs.pathExists(rdbPath)) {
          await fs.copy(rdbPath, outputFile);
          log.success('Redis backup created');
          return { success: true, files: [outputFile] };
        }
      }

      // Fallback: Use --rdb option
      await execa('redis-cli', [
        '-h', this.redisHost,
        '-p', this.redisPort.toString(),
        '--rdb', outputFile,
      ]);

      log.success('Redis backup created');
      return { success: true, files: [outputFile] };
    } catch (error) {
      log.warn(`Redis backup skipped: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Backup workspace
   */
  async backupWorkspace(backupName, compress = true) {
    log.info('Backing up workspace...');

    const outputFile = path.join(this.backupDir, 'workspace', `${backupName}_workspace.tar.gz`);
    
    const excludePatterns = [
      'node_modules',
      '.git',
      '*.log',
      '*.tmp',
      '.next',
      'dist',
      'build',
    ];

    const tarArgs = ['-cf', outputFile];
    
    for (const pattern of excludePatterns) {
      tarArgs.push('--exclude', pattern);
    }

    tarArgs.push('-C', this.rootDir, '.');

    try {
      await execa('tar', tarArgs);
      log.success('Workspace backup created');
      return { success: true, files: [outputFile] };
    } catch (error) {
      log.warn(`Workspace backup skipped: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Backup agent state
   */
  async backupAgentState(backupName, compress = true) {
    log.info('Backing up agent state...');

    const outputFile = path.join(this.backupDir, 'agent-state', `${backupName}_agent-state.tar.gz`);
    const homeDir = process.env.HOME || '';
    
    const statePaths = [
      path.join(homeDir, '.openclaw', 'agents'),
      path.join(homeDir, '.openclaw', 'cron'),
    ].filter(p => p && !p.includes('undefined'));

    if (statePaths.length === 0) {
      log.info('No agent state paths found');
      return { success: true, files: [], skipped: true };
    }

    try {
      await execa('tar', ['-czf', outputFile, ...statePaths]);
      log.success('Agent state backup created');
      return { success: true, files: [outputFile] };
    } catch (error) {
      log.warn(`Agent state backup skipped: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Backup configuration
   */
  async backupConfig(backupName, compress = true) {
    log.info('Backing up configuration...');

    const outputFile = path.join(this.backupDir, 'config', `${backupName}_config.tar.gz`);
    
    const configFiles = [
      path.join(this.rootDir, 'openclaw.json'),
      path.join(this.rootDir, '.env'),
      path.join(this.rootDir, 'litellm_config.yaml'),
      path.join(process.env.HOME || '', '.openclaw', 'openclaw.json'),
    ].filter(f => f && !f.includes('undefined'));

    const existingFiles = [];
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        existingFiles.push(file);
      }
    }

    if (existingFiles.length === 0) {
      log.info('No configuration files found');
      return { success: true, files: [], skipped: true };
    }

    try {
      await execa('tar', ['-czf', outputFile, ...existingFiles]);
      log.success('Configuration backup created');
      return { success: true, files: [outputFile] };
    } catch (error) {
      log.warn(`Configuration backup skipped: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate checksums for backup
   */
  async generateChecksums(backupName) {
    log.info('Generating checksums...');

    const checksumFile = path.join(this.backupDir, `${backupName}_checksums.sha256`);
    
    try {
      const { stdout } = await execa('find', [
        this.backupDir,
        '-maxdepth', '2',
        '-name', `${backupName}*`,
        '-type', 'f',
        '-exec', 'sha256sum', '{}', ';',
      ]);

      await fs.writeFile(checksumFile, stdout);
      log.success('Checksums generated');
      return checksumFile;
    } catch (error) {
      log.warn(`Checksum generation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify backup
   */
  async verify(backupName) {
    log.info(`Verifying backup: ${backupName}`);

    const results = {
      valid: true,
      checks: [],
    };

    // Check PostgreSQL backup
    const pgDump = path.join(this.backupDir, 'postgresql', `${backupName}_postgresql.sql.gz`);
    if (await fs.pathExists(pgDump)) {
      try {
        await execa('gzip', ['-t', pgDump]);
        results.checks.push({ name: 'postgresql', valid: true });
      } catch (error) {
        results.checks.push({ name: 'postgresql', valid: false, error: error.message });
        results.valid = false;
      }
    }

    // Check workspace backup
    const workspaceTar = path.join(this.backupDir, 'workspace', `${backupName}_workspace.tar.gz`);
    if (await fs.pathExists(workspaceTar)) {
      try {
        await execa('tar', ['-tzf', workspaceTar]);
        results.checks.push({ name: 'workspace', valid: true });
      } catch (error) {
        results.checks.push({ name: 'workspace', valid: false, error: error.message });
        results.valid = false;
      }
    }

    // Verify checksums
    const checksumFile = path.join(this.backupDir, `${backupName}_checksums.sha256`);
    if (await fs.pathExists(checksumFile)) {
      try {
        await execa('sha256sum', ['-c', path.basename(checksumFile)], {
          cwd: path.dirname(checksumFile),
        });
        results.checks.push({ name: 'checksums', valid: true });
      } catch (error) {
        results.checks.push({ name: 'checksums', valid: false, error: error.message });
        results.valid = false;
      }
    }

    if (results.valid) {
      log.success('Backup verification passed');
    } else {
      log.warn('Backup verification failed');
    }

    return results;
  }

  /**
   * List backups
   */
  async list() {
    log.info('Listing backups...');

    try {
      const files = await fs.readdir(this.backupDir);
      
      const backups = [];
      const backupGroups = {};

      for (const file of files) {
        if (file.startsWith('openclaw_') && !file.endsWith('.sha256')) {
          const stat = await fs.stat(path.join(this.backupDir, file));
          const type = file.includes('full') ? 'full' : 'incremental';
          const date = file.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1];

          if (!backupGroups[date]) {
            backupGroups[date] = { name: file, type, date, size: stat.size, components: [] };
          }
          backupGroups[date].components.push(file);
        }
      }

      for (const [date, backup] of Object.entries(backupGroups)) {
        backups.push(backup);
      }

      return backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      log.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restore(backupName, options = {}) {
    const { components = ['all'], confirm = false } = options;

    log.section('Restoring Backup');
    log.info(`Restoring from: ${backupName}`);

    if (!confirm) {
      log.warn('This will overwrite existing data. Use --confirm to proceed.');
      return { success: false, error: 'Confirmation required' };
    }

    // Stop services before restore
    log.info('Stopping services...');
    try {
      await execa('systemctl', ['stop', 'openclaw-gateway']);
    } catch {
      log.debug('Gateway service not running');
    }

    const results = {
      name: backupName,
      timestamp: new Date().toISOString(),
      components: {},
      errors: [],
    };

    // Restore PostgreSQL
    if (components.includes('all') || components.includes('postgresql')) {
      try {
        results.components.postgresql = await this.restorePostgres(backupName);
      } catch (error) {
        results.errors.push({ component: 'postgresql', error: error.message });
      }
    }

    // Restore Redis
    if (components.includes('all') || components.includes('redis')) {
      try {
        results.components.redis = await this.restoreRedis(backupName);
      } catch (error) {
        results.errors.push({ component: 'redis', error: error.message });
      }
    }

    // Restore workspace
    if (components.includes('all') || components.includes('workspace')) {
      try {
        results.components.workspace = await this.restoreWorkspace(backupName);
      } catch (error) {
        results.errors.push({ component: 'workspace', error: error.message });
      }
    }

    // Restore configuration
    if (components.includes('all') || components.includes('config')) {
      try {
        results.components.config = await this.restoreConfig(backupName);
      } catch (error) {
        results.errors.push({ component: 'config', error: error.message });
      }
    }

    // Start services after restore
    log.info('Starting services...');
    try {
      await execa('systemctl', ['start', 'openclaw-gateway']);
    } catch {
      log.debug('Could not start gateway service');
    }

    results.success = results.errors.length === 0;
    
    if (results.success) {
      log.success(`Backup restored: ${backupName}`);
    } else {
      log.warn(`Restore completed with ${results.errors.length} error(s)`);
    }

    return results;
  }

  /**
   * Restore PostgreSQL
   */
  async restorePostgres(backupName) {
    log.info('Restoring PostgreSQL...');

    const dumpFile = path.join(this.backupDir, 'postgresql', `${backupName}_postgresql.sql.gz`);
    
    if (!await fs.pathExists(dumpFile)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      const password = process.env.POSTGRES_PASSWORD || '';
      const env = { ...process.env, PGPASSWORD: password };

      // Decompress and restore
      const gunzip = execa('gunzip', ['-c', dumpFile]);
      const psql = execa('psql', [
        '-h', this.postgresHost,
        '-p', this.postgresPort.toString(),
        '-U', this.postgresUser,
        '-d', this.postgresDb,
      ], { env });

      gunzip.stdout.pipe(psql.stdin);
      await psql;

      log.success('PostgreSQL restored');
      return { success: true };
    } catch (error) {
      log.error(`PostgreSQL restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore Redis
   */
  async restoreRedis(backupName) {
    log.info('Restoring Redis...');

    const rdbFile = path.join(this.backupDir, 'redis', `${backupName}_redis.rdb`);
    
    if (!await fs.pathExists(rdbFile)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      // Stop Redis
      await execa('systemctl', ['stop', 'redis-server']);

      // Copy RDB file
      const redisDir = '/var/lib/redis';
      await fs.copy(rdbFile, path.join(redisDir, 'dump.rdb'));
      await execa('chown', ['redis:redis', path.join(redisDir, 'dump.rdb')]);

      // Start Redis
      await execa('systemctl', ['start', 'redis-server']);

      log.success('Redis restored');
      return { success: true };
    } catch (error) {
      log.error(`Redis restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore workspace
   */
  async restoreWorkspace(backupName) {
    log.info('Restoring workspace...');

    const tarFile = path.join(this.backupDir, 'workspace', `${backupName}_workspace.tar.gz`);
    
    if (!await fs.pathExists(tarFile)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      await execa('tar', ['-xzf', tarFile, '-C', this.rootDir]);
      log.success('Workspace restored');
      return { success: true };
    } catch (error) {
      log.error(`Workspace restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore configuration
   */
  async restoreConfig(backupName) {
    log.info('Restoring configuration...');

    const tarFile = path.join(this.backupDir, 'config', `${backupName}_config.tar.gz`);
    
    if (!await fs.pathExists(tarFile)) {
      return { success: false, error: 'Backup file not found' };
    }

    try {
      await execa('tar', ['-xzf', tarFile, '-C', this.rootDir]);
      log.success('Configuration restored');
      return { success: true };
    } catch (error) {
      log.error(`Configuration restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete backup
   */
  async delete(backupName) {
    log.info(`Deleting backup: ${backupName}`);

    try {
      const files = await fs.readdir(this.backupDir, { recursive: true });
      
      for (const file of files) {
        if (file.includes(backupName)) {
          const fullPath = path.join(this.backupDir, file);
          await fs.remove(fullPath);
        }
      }

      log.success(`Backup deleted: ${backupName}`);
      return true;
    } catch (error) {
      log.error(`Failed to delete backup: ${error.message}`);
      return false;
    }
  }

  /**
   * Rotate old backups
   */
  async rotate() {
    log.info(`Rotating backups older than ${this.retentionDays} days...`);

    try {
      let deleted = 0;

      const files = await fs.readdir(this.backupDir, { recursive: true });
      
      for (const file of files) {
        const fullPath = path.join(this.backupDir, file);
        const stat = await fs.stat(fullPath);
        
        const age = Date.now() - stat.mtimeMs;
        const ageDays = age / (1000 * 60 * 60 * 24);

        if (ageDays > this.retentionDays) {
          await fs.remove(fullPath);
          deleted++;
        }
      }

      log.success(`Rotation complete: ${deleted} file(s) deleted`);
      return deleted;
    } catch (error) {
      log.error(`Rotation failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get backup schedule
   */
  getSchedule() {
    return {
      full: 'Sunday at 2:00 AM',
      incremental: 'Daily at 2:00 AM',
      retention: `${this.retentionDays} days`,
    };
  }
}

export default BackupManager;
