# Database Migration Guide

## Overview

The Heretek OpenClaw database migration system provides safe, versioned schema changes with full rollback capabilities. This guide covers migration creation, execution, and troubleshooting.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Database Migration System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  db-migrate │  │  db-rollback│  │  Migrations │              │
│  │    .js      │  │    .js      │  │   Directory │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                     │
│                 ┌────────▼────────┐                            │
│                 │  schema_migrations  │                        │
│                 │    (version table)  │                        │
│                 └────────┬────────┘                            │
│                          │                                     │
│                 ┌────────▼────────┐                            │
│                 │   PostgreSQL    │                            │
│                 │    Database     │                            │
│                 └─────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- PostgreSQL 15+ with pgvector extension
- Node.js 20+
- `psql` command-line tool installed
- Database credentials configured

## Quick Start

### 1. Configure Database Connection

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=heretek
export POSTGRES_USER=heretek
export POSTGRES_PASSWORD=your_secure_password
```

### 2. Run All Migrations

```bash
node scripts/db-migrate.js up
```

### 3. Check Status

```bash
node scripts/db-migrate.js status
```

## Migration Commands

### Up - Apply Pending Migrations

Apply all pending migrations:

```bash
node scripts/db-migrate.js up
```

Apply with verbose output:

```bash
node scripts/db-migrate.js up --verbose
```

Preview without executing (dry-run):

```bash
node scripts/db-migrate.js up --dry-run
```

Apply up to specific version:

```bash
node scripts/db-migrate.js up --target 3
```

### Down - Rollback Last Migration

Rollback the most recent migration:

```bash
node scripts/db-migrate.js down
```

Preview rollback:

```bash
node scripts/db-migrate.js down --dry-run
```

### Status - Show Migration Status

View applied and pending migrations:

```bash
node scripts/db-migrate.js status
```

### Create - Generate New Migration

Create a new migration template:

```bash
node scripts/db-migrate.js create --name add_user_preferences
```

This generates a file like `migrations/003_add_user_preferences.sql`.

### Reset - Rollback All Migrations

Rollback all migrations (destructive!):

```bash
node scripts/db-migrate.js reset
```

With confirmation skip:

```bash
node scripts/db-migrate.js reset --force
```

## Rollback Commands

### Rollback to Specific Version

```bash
node scripts/db-rollback.js --target 1
```

This rolls back all migrations after version 1.

### Rollback All Migrations

```bash
node scripts/db-rollback.js --all
```

### Rollback with Dry-Run

```bash
node scripts/db-rollback.js --target 2 --dry-run
```

### Force Rollback (Skip Confirmation)

```bash
node scripts/db-rollback.js --all --force
```

## Creating Migrations

### Migration File Format

Each migration file must follow this structure:

```sql
-- Migration: Description of migration
-- Version: 3
-- Created: 2026-03-31
-- Description: What this migration does

-- UP
-- Your migration SQL here
CREATE TABLE new_table (...);

-- DOWN
-- Your rollback SQL here
DROP TABLE new_table;
```

### Example: Adding a Column

```sql
-- Migration: Add Email Column
-- Version: 3
-- Created: 2026-03-31
-- Description: Adds email column to agents table

-- UP
ALTER TABLE agents ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_agents_email ON agents(email);

-- DOWN
DROP INDEX idx_agents_email;
ALTER TABLE agents DROP COLUMN email;
```

### Example: Creating a Table with Transaction

```sql
-- Migration: Create Settings Table
-- Version: 4
-- Created: 2026-03-31
-- Description: Creates settings table for user preferences

-- UP
BEGIN;

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;

-- DOWN
BEGIN;

DROP TABLE settings;

COMMIT;
```

## Version Tracking

Migrations are tracked in the `schema_migrations` table:

```sql
SELECT version, name, applied_at FROM schema_migrations ORDER BY version;
```

| version | name | applied_at |
|---------|------|------------|
| 1 | initial_schema | 2026-03-31 10:00:00+00 |
| 2 | add_agent_state | 2026-03-31 10:01:00+00 |

## Best Practices

### 1. Always Test Migrations

Test migrations in development before production:

```bash
# Test in development
export POSTGRES_DB=heretek_dev
node scripts/db-migrate.js up --dry-run

# Then apply
node scripts/db-migrate.js up
```

### 2. Backup Before Migrating

```bash
pg_dump -h localhost -U heretek heretek > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Write Reversible Migrations

Every UP migration must have a corresponding DOWN:

```sql
-- GOOD: Reversible
-- UP
CREATE TABLE users (...);

-- DOWN
DROP TABLE users;

-- BAD: No rollback
-- UP
CREATE TABLE users (...);

-- DOWN
-- (empty)
```

### 4. Use Transactions

Wrap related changes in transactions:

```sql
-- UP
BEGIN;

CREATE TABLE table1 (...);
CREATE TABLE table2 (...);
ALTER TABLE table1 ADD CONSTRAINT fk_table2 ...;

COMMIT;

-- DOWN
BEGIN;

DROP TABLE table2;
DROP TABLE table1;

COMMIT;
```

### 5. Never Modify Old Migrations

Once a migration is applied, never modify it. Create a new migration for changes:

```
✗ Don't: Edit 001_initial_schema.sql
✓ Do: Create 003_fix_initial_schema.sql
```

### 6. Use Descriptive Names

```
✗ Bad: 003_add_column.sql
✓ Good: 003_add_agent_email_column.sql
```

## Troubleshooting

### Migration Fails Mid-Execution

If a migration fails:

1. Check the error message
2. Fix the SQL issue
3. The failed migration is not recorded, so re-run after fixing

```bash
# Check current status
node scripts/db-migrate.js status

# Re-run after fixing
node scripts/db-migrate.js up
```

### Rollback Fails

If rollback fails:

1. Check if the DOWN SQL is correct
2. Check for dependent objects
3. Manually execute rollback SQL if needed

```bash
# Manual rollback
PGPASSWORD=xxx psql -h localhost -U heretek -d heretek -c "DROP TABLE problematic_table;"

# Remove migration record
PGPASSWORD=xxx psql -h localhost -U heretek -d heretek -c "DELETE FROM schema_migrations WHERE version = 5;"
```

### Schema Migrations Table Missing

If the version table doesn't exist:

```bash
# Create manually
PGPASSWORD=xxx psql -h localhost -U heretek -d heretek << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);
EOF
```

### pgvector Extension Not Available

If you get errors about the `vector` type:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Database Migrations
  run: |
    npm run db:migrate
  env:
    POSTGRES_HOST: ${{ secrets.DB_HOST }}
    POSTGRES_DB: ${{ secrets.DB_NAME }}
    POSTGRES_USER: ${{ secrets.DB_USER }}
    POSTGRES_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

### Pre-Deployment Check

```bash
# Add to package.json scripts
{
  "scripts": {
    "db:migrate": "node scripts/db-migrate.js up",
    "db:status": "node scripts/db-migrate.js status",
    "db:rollback": "node scripts/db-rollback.js --target"
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `heretek` | Database name |
| `POSTGRES_USER` | `heretek` | Database user |
| `POSTGRES_PASSWORD` | - | Database password |

## Related Documentation

- [Migrations README](../../migrations/README.md) - Migration directory documentation
- [Backup Restoration](./runbook-backup-restoration.md) - Database backup and restore procedures
- [Monitoring Operations](./MONITORING_STACK.md) - Database monitoring setup
