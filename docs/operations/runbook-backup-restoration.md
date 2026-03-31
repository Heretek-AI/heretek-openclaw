# Backup Restoration Procedures

## Overview

This runbook covers procedures for restoring from backups in the Heretek OpenClaw system.

## Backup Types

| Type | Location | Retention | Frequency |
|------|----------|-----------|-----------|
| Database | `/root/.openclaw/backups/database` | 30 days | Daily |
| Redis | `/root/.openclaw/backups/redis` | 7 days | Daily |
| Workspace | `/root/.openclaw/backups/workspace` | 30 days | Daily |
| Agent State | `/root/.openclaw/backups/agent-state` | 7 days | Every 6 hours |
| Config | `/root/.openclaw/backups/config` | 30 days | Daily |
| Full System | `/root/.openclaw/backups/full` | 90 days | Weekly |

## Listing Available Backups

```bash
# List all available backups
./scripts/production-backup.sh --list

# Sample output:
# Available Backups:
# ==================
#
# database (15 backups):
#   2024-01-15+02:00:00 postgresql-20240115-020000.sql.gz
#   2024-01-14+02:00:00 postgresql-20240114-020000.sql.gz
# ...
```

## Verifying Backup Integrity

```bash
# Verify specific backup
./scripts/production-backup.sh --verify /root/.openclaw/backups/database/postgresql-20240115-020000.sql.gz

# Expected output:
# Verifying backup: /root/.openclaw/backups/database/postgresql-20240115-020000.sql.gz
# Checksum verified
# Gzip integrity verified
# Backup verification complete
```

## Database Restoration

### Full Database Restore

```bash
# 1. Stop services that write to database
cd /root/heretek/heretek-openclaw
docker compose stop litellm steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 2. List available database backups
./scripts/production-backup.sh --list

# 3. Restore from latest backup
./scripts/production-backup.sh --restore latest database

# Or restore from specific backup
./scripts/production-backup.sh --restore 20240115 database

# 4. Verify restoration
docker exec heretek-postgres psql -U heretek -d heretek -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# 5. Restart services
docker compose up -d litellm
sleep 10
docker compose up -d steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 6. Verify system health
./scripts/health-check.sh
```

### Point-in-Time Recovery

```bash
# 1. Find backup closest to desired time
ls -lt /root/.openclaw/backups/database/

# 2. Restore that backup
./scripts/production-backup.sh --restore YYYYMMDD database

# 3. If WAL archiving is enabled, replay to specific time
# (Requires additional WAL configuration)
```

## Redis Restoration

```bash
# 1. Stop Redis
docker stop heretek-redis

# 2. List Redis backups
ls -la /root/.openclaw/backups/redis/

# 3. Restore latest backup
latest_redis=$(find /root/.openclaw/backups/redis -name "*.rdb.gz" | sort -r | head -1)
gunzip -c "$latest_redis" > /tmp/dump.rdb

# 4. Copy to Redis data directory
docker_volume_path=$(docker volume inspect heretek-openclaw_redis_data | grep Mountpoint | cut -d'"' -f4)
cp /tmp/dump.rdb "$docker_volume_path/"

# 5. Set permissions
docker run --rm -v "$docker_volume_path:/data" redis:7 chown redis:redis /data/dump.rdb

# 6. Start Redis
docker start heretek-redis

# 7. Verify restoration
docker exec heretek-redis redis-cli keys '*' | wc -l
```

## Workspace Restoration

```bash
# 1. Stop agents
docker compose stop steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian

# 2. List workspace backups
ls -la /root/.openclaw/backups/workspace/

# 3. Extract backup
latest_workspace=$(find /root/.openclaw/backups/workspace -name "*.tar.gz" | sort -r | head -1)
tar -xzf "$latest_workspace" -C /root/.openclaw/

# 4. Set permissions
chown -R root:root /root/.openclaw/workspace

# 5. Restart agents
docker compose up -d steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian
```

## Agent State Restoration

```bash
# 1. Stop specific agent
docker stop heretek-<agent-name>

# 2. List agent state backups
ls -la /root/.openclaw/backups/agent-state/

# 3. Extract agent state
latest_state=$(find /root/.openclaw/backups/agent-state -name "*.tar.gz" | sort -r | head -1)
tar -xzf "$latest_state" -C /tmp/agent-restore/

# 4. Copy state to agent volume
agent_volume_path=$(docker volume inspect heretek-openclaw_agent_memory_<agent-name> | grep Mountpoint | cut -d'"' -f4)
cp -r /tmp/agent-restore/agent-state/<agent-name>/* "$agent_volume_path/"

# 5. Set permissions
chown -R root:root "$agent_volume_path"

# 6. Restart agent
docker start heretek-<agent-name>
```

## Full System Restoration

```bash
# WARNING: This restores the entire system to backup state
# All data since backup will be lost

# 1. Stop all services
cd /root/heretek/heretek-openclaw
docker compose down

# 2. List full system backups
ls -la /root/.openclaw/backups/full/

# 3. Extract full backup
latest_full=$(find /root/.openclaw/backups/full -name "*.tar.gz" | sort -r | head -1)
tar -xzf "$latest_full" -C /root/.openclaw/backups/

# 4. Restore individual components
./scripts/production-backup.sh --restore latest database
./scripts/production-backup.sh --restore latest redis
./scripts/production-backup.sh --restore latest workspace
./scripts/production-backup.sh --restore latest agent-state
./scripts/production-backup.sh --restore latest config

# 5. Start all services
docker compose up -d

# 6. Verify health
./scripts/health-check.sh --watch
```

## Configuration Restoration

```bash
# 1. List config backups
ls -la /root/.openclaw/backups/config/

# 2. Extract config
latest_config=$(find /root/.openclaw/backups/config -name "*.tar.gz" | sort -r | head -1)
tar -xzf "$latest_config" -C /tmp/config-restore/

# 3. Review config files
ls -la /tmp/config-restore/config/

# 4. Restore specific config files
cp /tmp/config-restore/config/openclaw.json /root/.openclaw/
cp /tmp/config-restore/config/config.json /root/.openclaw/

# 5. Restart affected services
docker compose restart litellm
```

## Restoration Testing (Monthly)

```bash
# 1. Create test environment
docker compose -f docker-compose.test.yml up -d postgres

# 2. Restore database to test environment
PGPASSWORD=heretek pg_restore -h localhost -p 5433 -U heretek -d heretek \
  /root/.openclaw/backups/database/postgresql-latest.sql.gz

# 3. Verify test restoration
psql -h localhost -p 5433 -U heretek -d heretek -c "SELECT COUNT(*) FROM information_schema.tables;"

# 4. Document results
echo "Restoration test completed: $(date)" >> /root/.openclaw/logs/restoration-tests.log

# 5. Cleanup test environment
docker compose -f docker-compose.test.yml down
```

## Troubleshooting

### Restore Fails - Checksum Mismatch

```bash
# Backup is corrupted, try older backup
second_latest=$(find /root/.openclaw/backups/database -name "*.sql.gz" | sort -r | sed -n '2p')
./scripts/production-backup.sh --verify "$second_latest"
./scripts/production-backup.sh --restore "$second_latest" database
```

### Restore Fails - Disk Space

```bash
# Check disk space
df -h

# Clean up old backups if needed
./scripts/production-backup.sh --cleanup

# Or expand disk/storage
```

### Restore Fails - Connection Issues

```bash
# Ensure database is accessible
docker exec heretek-postgres pg_isready -U heretek

# Check database is accepting connections
docker exec heretek-postgres psql -U heretek -d heretek -c "SELECT 1;"
```

### Partial Restore Needed

```bash
# Restore specific table only
docker exec -i heretek-postgres psql -U heretek -d heretek << 'EOF'
-- Restore specific table from SQL dump
.table_name data here
EOF
```

## Post-Restoration Checklist

- [ ] All services running
- [ ] Database accessible
- [ ] Redis accessible
- [ ] Agents can connect to database
- [ ] Agents can connect to Redis
- [ ] Vector operations working
- [ ] A2A protocol functional
- [ ] Dashboard showing correct data
- [ ] Backups running successfully
- [ ] Monitoring alerts cleared

## Escalation

If restoration fails:

1. **Document the failure**
   - Backup file used
   - Error messages
   - Steps attempted

2. **Preserve current state**
   ```bash
   docker logs heretek-postgres > /tmp/restore-logs.txt
   ```

3. **Contact engineering team** with documentation
