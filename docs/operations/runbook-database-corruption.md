# Database Corruption Handling

## Overview

This runbook covers detection, diagnosis, and recovery procedures for PostgreSQL database corruption in the Heretek OpenClaw system.

## Types of Corruption

1. **Data Corruption**: Invalid data in tables
2. **Index Corruption**: Corrupted database indexes
3. **WAL Corruption**: Write-ahead log corruption
4. **Tablespace Corruption**: Physical file corruption
5. **Schema Corruption**: Invalid schema definitions

## Detection

### Symptoms
- Queries returning errors or incorrect data
- Agents failing to persist state
- Vector similarity searches failing
- Connection errors
- Checksum verification failures

### Automated Detection

```bash
# Check database integrity
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT * FROM pg_stat_database WHERE datname='heretek';"

# Check for corrupted tables
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public';"

# Check pgvector extension health
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"
```

### Manual Integrity Check

```bash
# Run VACUUM ANALYZE to detect issues
docker exec heretek-postgres psql -U heretek -d heretek -c "VACUUM ANALYZE;"

# Check for bloated tables
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT relname, n_dead_tup, n_live_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;"
```

## Diagnosis

### Step 1: Assess Corruption Scope

```bash
# Check which tables are affected
docker exec heretek-postgres psql -U heretek -d heretek << 'EOF'
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

### Step 2: Check Error Logs

```bash
# PostgreSQL logs
docker logs heretek-postgres --tail 500 | grep -i error

# Agent logs for database errors
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
    echo "=== $agent ==="
    docker logs heretek-$agent --tail 100 | grep -i "database\|postgres\|sql" | tail -20
done
```

### Step 3: Verify Backups Available

```bash
# List available backups
./scripts/production-backup.sh --list

# Verify latest backup integrity
latest_backup=$(find /root/.openclaw/backups/database -name "*.sql.gz" -type f | sort -r | head -1)
./scripts/production-backup.sh --verify "$latest_backup"
```

## Recovery Procedures

### Level 1: Minor Corruption (Table-Level)

```bash
# 1. Identify corrupted table
corrupted_table="affected_table_name"

# 2. Attempt table repair
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "VACUUM FULL $corrupted_table;"

# 3. Reindex if needed
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "REINDEX TABLE $corrupted_table;"

# 4. Verify repair
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT COUNT(*) FROM $corrupted_table;"
```

### Level 2: Index Corruption

```bash
# 1. Reindex entire database
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "REINDEX DATABASE heretek;"

# 2. Verify indexes
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public';"

# 3. Run VACUUM ANALYZE
docker exec heretek-postgres psql -U heretek -d heretek -c "VACUUM ANALYZE;"
```

### Level 3: Schema Corruption

```bash
# 1. Export current schema
docker exec heretek-postgres pg_dump -U heretek -d heretek --schema-only > /tmp/schema-backup.sql

# 2. Check schema for issues
cat /tmp/schema-backup.sql | grep -i error

# 3. If pgvector corrupted, reinstall extension
docker exec heretek-postgres psql -U heretek -d heretek << 'EOF'
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION vector;
EOF

# 4. Verify extension
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"
```

### Level 4: Full Database Restore

**WARNING**: This procedure will restore the database to backup state. Any data since the backup will be lost.

```bash
# 1. Stop all agents to prevent writes
cd /root/heretek/heretek-openclaw
docker compose stop steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 2. Stop LiteLLM to prevent API writes
docker stop heretek-litellm

# 3. Verify backup to restore
./scripts/production-backup.sh --list
./scripts/production-backup.sh --verify /path/to/backup.sql.gz

# 4. Perform restore
./scripts/production-backup.sh --restore latest

# 5. Verify restore
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# 6. Restart services
docker compose up -d litellm
sleep 10
docker compose up -d steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 7. Verify system health
./scripts/health-check.sh
```

### Level 5: Catastrophic Failure (New Database)

**WARNING**: Last resort procedure. All data will be lost.

```bash
# 1. Stop all services
cd /root/heretek/heretek-openclaw
docker compose down

# 2. Remove corrupted database volume
docker volume rm heretek-openclaw_postgres_data

# 3. Recreate database
docker compose up -d postgres

# 4. Wait for initialization
sleep 30

# 5. Verify pgvector extension
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname='vector';"

# 6. Restart all services
docker compose up -d

# 7. Verify health
./scripts/health-check.sh
```

## Post-Recovery Verification

### Checklist

- [ ] Database accepts connections
- [ ] All tables accessible
- [ ] pgvector extension working
- [ ] Vector operations functional
- [ ] Agents can read/write data
- [ ] No errors in logs
- [ ] Backup system working

### Verification Commands

```bash
# Test database connectivity
docker exec heretek-postgres psql -U heretek -d heretek -c "SELECT 1;"

# Test pgvector
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector as distance;"

# Test agent connectivity
for agent in steward alpha beta charlie; do
    echo "Testing $agent..."
    docker exec heretek-$agent curl -sf http://postgres:5432 || echo "FAILED"
done

# Run full health check
./scripts/health-check.sh
```

## Prevention

### Regular Maintenance

```bash
# Add to crontab for weekly maintenance
# 0 3 * * 0 docker exec heretek-postgres psql -U heretek -d heretek -c "VACUUM ANALYZE;"
```

### Monitoring

```bash
# Monitor database size
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT pg_size_pretty(pg_database_size('heretek'));"

# Monitor connections
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Monitor replication lag (if applicable)
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT client_addr, state, sent_lsn, write_lsn FROM pg_stat_replication;"
```

### Backup Verification

```bash
# Weekly backup verification
# 0 4 * * 0 /root/heretek/heretek-openclaw/scripts/production-backup.sh --verify $(find /root/.openclaw/backups/database -name "*.sql.gz" | sort -r | head -1)
```

## Escalation

If corruption cannot be resolved:

1. **Preserve Evidence**
   ```bash
   # Save current database state for analysis
   docker exec heretek-postgres pg_dump -U heretek -d heretek > /tmp/corrupted-dump.sql
   docker logs heretek-postgres > /tmp/postgres-logs.txt
   ```

2. **Document**
   - Time of corruption detection
   - Symptoms observed
   - Recovery attempts made
   - Error messages

3. **Contact Database Administrator** or engineering team with preserved evidence
