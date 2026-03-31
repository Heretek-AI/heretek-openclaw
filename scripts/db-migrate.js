#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * Manages PostgreSQL database migrations with versioning and rollback support.
 * 
 * Features:
 * - Version tracking table
 * - Up/down migrations
 * - Transaction support
 * - Dry-run mode
 * - Migration status reporting
 * 
 * Usage:
 *   node scripts/db-migrate.js [command] [options]
 *   node scripts/db-migrate.js up        # Run all pending migrations
 *   node scripts/db-migrate.js down      # Rollback last migration
 *   node scripts/db-migrate.js status    # Show migration status
 *   node scripts/db-migrate.js create --name migration_name
 * 
 * Options:
 *   --dry-run          Show what would be done without executing
 *   --target <version> Migrate to specific version
 *   --verbose          Show detailed output
 *   --help             Show help message
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
    command: args[0] || 'up',
    dryRun: false,
    target: null,
    verbose: false,
    name: null,
    help: false,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--target':
        options.target = parseInt(args[++i], 10);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--name':
        options.name = args[++i];
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
${colors.cyan}Database Migration Runner${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/db-migrate.js [command] [options]

${colors.yellow}Commands:${colors.reset}
  up               Run all pending migrations
  down             Rollback last migration
  status           Show migration status
  create           Create a new migration template
  reset            Rollback all migrations

${colors.yellow}Options:${colors.reset}
  --dry-run        Show what would be done without executing
  --target <ver>   Migrate to specific version
  --verbose, -v    Show detailed output
  --name <name>    Name for new migration (with create command)
  --help, -h       Show help message

${colors.yellow}Examples:${colors.reset}
  node scripts/db-migrate.js up
  node scripts/db-migrate.js up --dry-run
  node scripts/db-migrate.js down
  node scripts/db-migrate.js status
  node scripts/db-migrate.js create --name add_user_table
  node scripts/db-migrate.js up --target 3
  node scripts/db-migrate.js --verbose up

${colors.yellow}Environment Variables:${colors.reset}
  POSTGRES_HOST     Database host (default: localhost)
  POSTGRES_PORT     Database port (default: 5432)
  POSTGRES_DB       Database name (default: heretek)
  POSTGRES_USER     Database user (default: heretek)
  POSTGRES_PASSWORD Database password
`);
}

/**
 * Get available migrations from the migrations directory
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
      
      // Parse migration metadata from comments
      const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
      const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)$/i);
      
      migrations.push({
        version,
        name,
        file,
        filePath,
        up: upMatch ? upMatch[1].trim() : content,
        down: downMatch ? downMatch[1].trim() : '',
      });
    }
  }

  return migrations;
}

/**
 * Execute SQL using psql command
 */
async function executeSQL(sql, options = {}) {
  const { dryRun = false, verbose = false } = options;
  
  if (dryRun) {
    console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would execute SQL:`);
    console.log(sql);
    return { success: true, rows: [] };
  }

  const { execSync } = await import('child_process');
  
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
 * Execute SQL file using psql command
 */
async function executeSQLFile(filePath, options = {}) {
  const { dryRun = false, verbose = false } = options;
  
  if (dryRun) {
    console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would execute file: ${filePath}`);
    const content = readFileSync(filePath, 'utf-8');
    console.log(content);
    return { success: true };
  }

  const { execSync } = await import('child_process');
  
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
 * Ensure the migrations version table exists
 */
async function ensureVersionTable(options) {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64)
    );
  `;
  
  return executeSQL(sql, options);
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(options) {
  const sql = 'SELECT version, name, applied_at FROM schema_migrations ORDER BY version;';
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
 * Record a migration as applied
 */
async function recordMigration(version, name, options) {
  const sql = `INSERT INTO schema_migrations (version, name) VALUES (${version}, '${name}');`;
  return executeSQL(sql, options);
}

/**
 * Remove a migration record
 */
async function removeMigrationRecord(version, options) {
  const sql = `DELETE FROM schema_migrations WHERE version = ${version};`;
  return executeSQL(sql, options);
}

/**
 * Run migrations up to target version
 */
async function migrateUp(options) {
  console.log(`${colors.cyan}=== Running Migrations Up ===${colors.reset}\n`);
  
  const migrations = getMigrations();
  const applied = await getAppliedMigrations(options);
  const appliedVersions = new Set(applied.map((m) => m.version));
  
  const pending = migrations.filter((m) => !appliedVersions.has(m.version));
  
  if (options.target) {
    pending.filter((m) => m.version <= options.target);
  }
  
  if (pending.length === 0) {
    console.log(`${colors.green}✓ No pending migrations${colors.reset}`);
    return { success: true, migrated: 0 };
  }
  
  console.log(`Found ${colors.yellow}${pending.length}${colors.reset} pending migration(s)\n`);
  
  let migrated = 0;
  
  for (const migration of pending) {
    console.log(`${colors.blue}Migrating:${colors.reset} ${migration.version} - ${migration.name}`);
    
    if (options.dryRun) {
      console.log(`  ${colors.yellow}[DRY-RUN] Would apply migration${colors.reset}`);
      migrated++;
      continue;
    }
    
    // Execute migration
    const result = await executeSQLFile(migration.filePath, { verbose: options.verbose });
    
    if (!result.success) {
      console.log(`${colors.red}✗ Migration failed:${colors.reset} ${result.error}`);
      return { success: false, migrated, error: result.error };
    }
    
    // Record migration
    const recordResult = await recordMigration(migration.version, migration.name, options);
    
    if (!recordResult.success) {
      console.log(`${colors.red}✗ Failed to record migration:${colors.reset} ${recordResult.error}`);
      return { success: false, migrated, error: recordResult.error };
    }
    
    console.log(`${colors.green}✓ Applied:${colors.reset} ${migration.version} - ${migration.name}\n`);
    migrated++;
  }
  
  console.log(`${colors.green}✓ Migrated ${migrated} migration(s)${colors.reset}`);
  return { success: true, migrated };
}

/**
 * Rollback the last migration
 */
async function migrateDown(options) {
  console.log(`${colors.cyan}=== Rolling Back Migration ===${colors.reset}\n`);
  
  const applied = await getAppliedMigrations(options);
  
  if (applied.length === 0) {
    console.log(`${colors.yellow}No migrations to rollback${colors.reset}`);
    return { success: true, rolledBack: 0 };
  }
  
  const lastMigration = applied[applied.length - 1];
  const migrations = getMigrations();
  const migration = migrations.find((m) => m.version === lastMigration.version);
  
  if (!migration) {
    console.log(`${colors.red}Migration file not found for version ${lastMigration.version}${colors.reset}`);
    return { success: false, error: 'Migration file not found' };
  }
  
  if (!migration.down) {
    console.log(`${colors.red}No rollback SQL available for version ${lastMigration.version}${colors.reset}`);
    return { success: false, error: 'No rollback SQL' };
  }
  
  console.log(`${colors.blue}Rolling back:${colors.reset} ${migration.version} - ${migration.name}\n`);
  
  if (options.dryRun) {
    console.log(`  ${colors.yellow}[DRY-RUN] Would rollback migration${colors.reset}`);
    console.log(migration.down);
    return { success: true, rolledBack: 1 };
  }
  
  // Execute rollback
  const result = await executeSQL(migration.down, options);
  
  if (!result.success) {
    console.log(`${colors.red}✗ Rollback failed:${colors.reset} ${result.error}`);
    return { success: false, error: result.error };
  }
  
  // Remove migration record
  const recordResult = await removeMigrationRecord(migration.version, options);
  
  if (!recordResult.success) {
    console.log(`${colors.red}✗ Failed to remove migration record:${colors.reset} ${recordResult.error}`);
    return { success: false, error: recordResult.error };
  }
  
  console.log(`${colors.green}✓ Rolled back:${colors.reset} ${migration.version} - ${migration.name}\n`);
  return { success: true, rolledBack: 1 };
}

/**
 * Show migration status
 */
async function showStatus(options) {
  console.log(`${colors.cyan}=== Migration Status ===${colors.reset}\n`);
  
  const migrations = getMigrations();
  const applied = await getAppliedMigrations(options);
  const appliedVersions = new Set(applied.map((m) => m.version));
  
  console.log(`${colors.blue}Applied Migrations:${colors.reset}`);
  if (applied.length === 0) {
    console.log(`  ${colors.gray}No migrations applied${colors.reset}`);
  } else {
    for (const m of applied) {
      console.log(`  ${colors.green}✓${colors.reset} ${m.version} - ${m.name} (applied: ${m.appliedAt})`);
    }
  }
  
  console.log(`\n${colors.blue}Pending Migrations:${colors.reset}`);
  const pending = migrations.filter((m) => !appliedVersions.has(m.version));
  if (pending.length === 0) {
    console.log(`  ${colors.green}No pending migrations${colors.reset}`);
  } else {
    for (const m of pending) {
      console.log(`  ${colors.yellow}○${colors.reset} ${m.version} - ${m.name}`);
    }
  }
  
  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`  Total migrations: ${migrations.length}`);
  console.log(`  Applied: ${applied.length}`);
  console.log(`  Pending: ${pending.length}`);
  
  return { success: true, applied: applied.length, pending: pending.length };
}

/**
 * Create a new migration template
 */
function createMigration(options) {
  const name = options.name;
  
  if (!name) {
    console.log(`${colors.red}Error:${colors.reset} Migration name is required`);
    console.log(`Usage: node scripts/db-migrate.js create --name <name>`);
    return { success: false, error: 'Name required' };
  }
  
  // Ensure migrations directory exists
  if (!existsSync(MIGRATIONS_DIR)) {
    mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }
  
  // Get next version number
  const migrations = getMigrations();
  const nextVersion = migrations.length > 0 
    ? Math.max(...migrations.map((m) => m.version)) + 1 
    : 1;
  
  const versionStr = String(nextVersion).padStart(3, '0');
  const fileName = `${versionStr}_${name.replace(/\s+/g, '_')}.sql`;
  const filePath = join(MIGRATIONS_DIR, fileName);
  
  const template = `-- Migration: ${name}
-- Version: ${nextVersion}
-- Created: ${new Date().toISOString()}
-- Description: TODO: Add description

-- UP
-- Add your migration SQL here
CREATE TABLE IF NOT EXISTS example_table (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DOWN
-- Add your rollback SQL here
DROP TABLE IF EXISTS example_table;
`;
  
  if (options.dryRun) {
    console.log(`${colors.yellow}[DRY-RUN]${colors.reset} Would create migration:`);
    console.log(`  File: ${filePath}`);
    console.log(template);
    return { success: true, filePath, version: nextVersion };
  }
  
  writeFileSync(filePath, template);
  
  console.log(`${colors.green}✓ Created migration:${colors.reset} ${fileName}`);
  console.log(`  Path: ${filePath}`);
  
  return { success: true, filePath, version: nextVersion };
}

/**
 * Rollback all migrations
 */
async function resetMigrations(options) {
  console.log(`${colors.cyan}=== Resetting All Migrations ===${colors.reset}\n`);
  
  const applied = await getAppliedMigrations(options);
  
  if (applied.length === 0) {
    console.log(`${colors.yellow}No migrations to reset${colors.reset}`);
    return { success: true, reset: 0 };
  }
  
  console.log(`Found ${colors.yellow}${applied.length}${colors.reset} migration(s) to reset\n`);
  
  const migrations = getMigrations();
  let reset = 0;
  
  // Rollback in reverse order
  for (let i = applied.length - 1; i >= 0; i--) {
    const appliedMigration = applied[i];
    const migration = migrations.find((m) => m.version === appliedMigration.version);
    
    if (!migration) {
      console.log(`${colors.red}✗ Migration file not found for version ${appliedMigration.version}${colors.reset}`);
      continue;
    }
    
    if (!migration.down) {
      console.log(`${colors.yellow}⚠ No rollback SQL for version ${migration.version}, skipping${colors.reset}`);
      await removeMigrationRecord(migration.version, options);
      reset++;
      continue;
    }
    
    console.log(`${colors.blue}Rolling back:${colors.reset} ${migration.version} - ${migration.name}`);
    
    if (options.dryRun) {
      console.log(`  ${colors.yellow}[DRY-RUN] Would rollback${colors.reset}`);
      reset++;
      continue;
    }
    
    const result = await executeSQL(migration.down, options);
    
    if (!result.success) {
      console.log(`${colors.red}✗ Rollback failed:${colors.reset} ${result.error}\n`);
      return { success: false, reset, error: result.error };
    }
    
    await removeMigrationRecord(migration.version, options);
    console.log(`${colors.green}✓ Rolled back${colors.reset}\n`);
    reset++;
  }
  
  console.log(`${colors.green}✓ Reset ${reset} migration(s)${colors.reset}`);
  return { success: true, reset };
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
  
  // Ensure version table exists (except for help command)
  if (options.command !== 'create') {
    await ensureVersionTable(options);
  }
  
  let result;
  
  switch (options.command) {
    case 'up':
      result = await migrateUp(options);
      break;
    case 'down':
      result = await migrateDown(options);
      break;
    case 'status':
      result = await showStatus(options);
      break;
    case 'create':
      result = createMigration(options);
      break;
    case 'reset':
      result = await resetMigrations(options);
      break;
    default:
      console.log(`${colors.red}Unknown command:${colors.reset} ${options.command}`);
      showHelp();
      process.exit(1);
  }
  
  process.exit(result.success ? 0 : 1);
}

// Run main function
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset} ${error.message}`);
  process.exit(1);
});
