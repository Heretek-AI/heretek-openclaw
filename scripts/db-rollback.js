#!/usr/bin/env node
/**
 * Database Rollback Script
 *
 * Provides safe database rollback capabilities with confirmation prompts
 * and dry-run support.
 *
 * Usage:
 *   node scripts/db-rollback.js [options]
 *   node scripts/db-rollback.js --target 5    # Rollback to version 5
 *   node scripts/db-rollback.js --all         # Rollback all migrations
 *   node scripts/db-rollback.js --dry-run     # Preview rollback without executing
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT_DIR, 'migrations');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || '5432',
  database: process.env.POSTGRES_DB || 'heretek',
  user: process.env.POSTGRES_USER || 'heretek',
  password: process.env.POSTGRES_PASSWORD || '',
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: null,
    all: false,
    dryRun: false,
    force: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target':
        options.target = parseInt(args[++i], 10);
        break;
      case '--all':
        options.all = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
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
${colors.cyan}Database Rollback Script${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/db-rollback.js [options]

${colors.yellow}Options:${colors.reset}
  --target <ver>   Rollback to specific version (keeps this version)
  --all            Rollback all migrations
  --dry-run        Preview rollback without executing
  --force, -f      Skip confirmation prompt
  --verbose, -v    Show detailed output
  --help, -h       Show help message

${colors.yellow}Examples:${colors.reset}
  node scripts/db-rollback.js --target 5
  node scripts/db-rollback.js --all --dry-run
  node scripts/db-rollback.js --target 3 --force

${colors.yellow}Environment Variables:${colors.reset}
  POSTGRES_HOST     Database host (default: localhost)
  POSTGRES_PORT     Database port (default: 5432)
  POSTGRES_DB       Database name (default: heretek)
  POSTGRES_USER     Database user (default: heretek)
  POSTGRES_PASSWORD Database password

${colors.yellow}Warnings:${colors.reset}
  - Rollback operations are destructive and cannot be undone
  - Always backup your database before rolling back
  - Test rollbacks in a development environment first
`);
}

/**
 * Execute SQL query
 */
async function executeSQL(sql, options = {}) {
  const { dryRun = false } = options;
  
  if (dryRun) {
    console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would execute: ${sql.substring(0, 100)}...`);
    return { success: true, rows: [] };
  }

  try {
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };
    
    const cmd = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -t -c "${sql.replace(/"/g, '\\"')}"`;
    
    const result = execSync(cmd, { 
      encoding: 'utf-8', 
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return { success: true, rows: result.trim().split('\n').filter(r => r.trim()) };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stderr: error.stderr?.toString()
    };
  }
}

/**
 * Execute SQL file
 */
async function executeSQLFile(filePath, options = {}) {
  const { dryRun = false, verbose = false } = options;
  
  if (dryRun) {
    console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would execute file: ${filePath}`);
    const content = readFileSync(filePath, 'utf-8');
    console.log(content);
    return { success: true };
  }

  try {
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };
    
    const cmd = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${filePath}`;
    
    const result = execSync(cmd, { 
      encoding: 'utf-8', 
      env,
    });
    
    if (verbose) {
      console.log(result);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stderr: error.stderr?.toString()
    };
  }
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(options) {
  const sql = 'SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC;';
  const result = await executeSQL(sql, options);
  
  if (!result.success) {
    if (result.error?.includes('relation "schema_migrations" does not exist')) {
      return [];
    }
    throw new Error(`Failed to get applied migrations: ${result.error}`);
  }
  
  return result.rows.map((row) => {
    const parts = row.split('|').map(p => p.trim());
    return {
      version: parseInt(parts[0], 10),
      name: parts[1],
      appliedAt: parts[2],
    };
  }).filter(m => m.version);
}

/**
 * Get migrations from files
 */
function getMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const migrations = [];
  
  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (match) {
      const version = parseInt(match[1], 10);
      const name = match[2].replace(/_/g, ' ');
      const filePath = join(MIGRATIONS_DIR, file);
      const content = readFileSync(filePath, 'utf-8');
      
      const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);
      
      migrations.push({
        version,
        name,
        file,
        filePath,
        down: downMatch ? downMatch[1].trim() : '',
      });
    }
  }

  return migrations;
}

/**
 * Remove migration record
 */
async function removeMigrationRecord(version, options) {
  const sql = `DELETE FROM schema_migrations WHERE version = ${version};`;
  return executeSQL(sql, options);
}

/**
 * Prompt for confirmation
 */
async function promptConfirmation(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message}${colors.reset} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Rollback to target version
 */
async function rollbackToTarget(targetVersion, options) {
  console.log(`${colors.cyan}=== Rolling Back to Version ${targetVersion} ===${colors.reset}\n`);
  
  const applied = await getAppliedMigrations(options);
  const migrations = getMigrations();
  
  // Find migrations to rollback (versions higher than target)
  const toRollback = applied.filter((m) => m.version > targetVersion);
  
  if (toRollback.length === 0) {
    console.log(`${colors.yellow}No migrations to rollback (already at or below target version)${colors.reset}`);
    return { success: true, rolledBack: 0 };
  }
  
  console.log(`${colors.yellow}Warning:${colors.reset} This will rollback ${toRollback.length} migration(s):`);
  for (const m of toRollback) {
    console.log(`  - ${colors.red}${m.version}${colors.reset} - ${m.name}`);
  }
  console.log('');
  
  // Confirm unless forced
  if (!options.force && !options.dryRun) {
    const confirmed = await promptConfirmation('Are you sure you want to proceed?');
    if (!confirmed) {
      console.log(`${colors.yellow}Rollback cancelled${colors.reset}`);
      return { success: false, cancelled: true };
    }
  }
  
  let rolledBack = 0;
  
  for (const migration of toRollback) {
    const fileMigration = migrations.find((m) => m.version === migration.version);
    
    if (!fileMigration) {
      console.log(`${colors.red}✗ Migration file not found for version ${migration.version}${colors.reset}`);
      continue;
    }
    
    if (!fileMigration.down) {
      console.log(`${colors.red}✗ No rollback SQL available for version ${migration.version}${colors.reset}`);
      continue;
    }
    
    console.log(`${colors.blue}Rolling back:${colors.reset} ${migration.version} - ${migration.name}`);
    
    if (options.dryRun) {
      console.log(`  ${colors.yellow}[DRY-RUN] Would execute rollback SQL${colors.reset}`);
      rolledBack++;
      continue;
    }
    
    const result = await executeSQLFile(fileMigration.filePath, { verbose: options.verbose });
    
    if (!result.success) {
      console.log(`${colors.red}✗ Rollback failed:${colors.reset} ${result.error}`);
      return { success: false, rolledBack, error: result.error };
    }
    
    await removeMigrationRecord(migration.version, options);
    console.log(`${colors.green}✓ Rolled back${colors.reset}\n`);
    rolledBack++;
  }
  
  console.log(`${colors.green}✓ Successfully rolled back ${rolledBack} migration(s)${colors.reset}`);
  return { success: true, rolledBack };
}

/**
 * Rollback all migrations
 */
async function rollbackAll(options) {
  console.log(`${colors.cyan}=== Rolling Back All Migrations ===${colors.reset}\n`);
  
  const applied = await getAppliedMigrations(options);
  
  if (applied.length === 0) {
    console.log(`${colors.yellow}No migrations to rollback${colors.reset}`);
    return { success: true, rolledBack: 0 };
  }
  
  console.log(`${colors.red}Warning:${colors.reset} This will rollback ALL ${applied.length} migration(s):`);
  for (const m of applied) {
    console.log(`  - ${colors.red}${m.version}${colors.reset} - ${m.name}`);
  }
  console.log('');
  
  // Confirm unless forced
  if (!options.force && !options.dryRun) {
    const confirmed = await promptConfirmation('Are you sure you want to rollback ALL migrations? This cannot be undone.');
    if (!confirmed) {
      console.log(`${colors.yellow}Rollback cancelled${colors.reset}`);
      return { success: false, cancelled: true };
    }
  }
  
  const migrations = getMigrations();
  let rolledBack = 0;
  
  // Rollback in reverse order (newest first)
  for (const migration of applied) {
    const fileMigration = migrations.find((m) => m.version === migration.version);
    
    if (!fileMigration) {
      console.log(`${colors.yellow}⚠ Migration file not found for version ${migration.version}, removing record only${colors.reset}`);
      await removeMigrationRecord(migration.version, options);
      rolledBack++;
      continue;
    }
    
    if (!fileMigration.down) {
      console.log(`${colors.yellow}⚠ No rollback SQL for version ${migration.version}, removing record only${colors.reset}`);
      await removeMigrationRecord(migration.version, options);
      rolledBack++;
      continue;
    }
    
    console.log(`${colors.blue}Rolling back:${colors.reset} ${migration.version} - ${migration.name}`);
    
    if (options.dryRun) {
      console.log(`  ${colors.yellow}[DRY-RUN] Would execute rollback SQL${colors.reset}`);
      rolledBack++;
      continue;
    }
    
    const result = await executeSQLFile(fileMigration.filePath, { verbose: options.verbose });
    
    if (!result.success) {
      console.log(`${colors.red}✗ Rollback failed:${colors.reset} ${result.error}`);
      return { success: false, rolledBack, error: result.error };
    }
    
    await removeMigrationRecord(migration.version, options);
    console.log(`${colors.green}✓ Rolled back${colors.reset}\n`);
    rolledBack++;
  }
  
  console.log(`${colors.green}✓ Successfully rolled back all ${rolledBack} migration(s)${colors.reset}`);
  return { success: true, rolledBack };
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log(`${colors.gray}Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}${colors.reset}\n`);
  
  // Validate options
  if (options.target === null && !options.all) {
    console.log(`${colors.red}Error:${colors.reset} Must specify --target <version> or --all`);
    showHelp();
    process.exit(1);
  }
  
  let result;
  
  if (options.all) {
    result = await rollbackAll(options);
  } else if (options.target !== null) {
    result = await rollbackToTarget(options.target, options);
  }
  
  if (result && result.success) {
    console.log(`\n${colors.green}✓ Rollback completed successfully${colors.reset}`);
    console.log(`${colors.yellow}Remember to restore your data if needed.${colors.reset}`);
  } else if (result && !result.cancelled) {
    console.log(`\n${colors.red}✗ Rollback completed with errors${colors.reset}`);
  }
  
  process.exit(result && result.success ? 0 : 1);
}

// Run main function
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset} ${error.message}`);
  process.exit(1);
});
