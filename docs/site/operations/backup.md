# Backup Procedures

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Types](#backup-types)
3. [Automated Backup](#automated-backup)
4. [Manual Backup](#manual-backup)
5. [Restoration](#restoration)
6. [Backup Schedule](#backup-schedule)
7. [Verification](#verification)
8. [Related Documents](#related-documents)

---

## Overview

This document outlines backup and restoration procedures for Heretek OpenClaw to ensure data integrity and disaster recovery.

---

## Backup Types

| Type | Description | Frequency | Size |
|------|-------------|-----------|------|
| **Full Backup** | Complete system state | Weekly | ~5 GB |
| **Incremental** | Changes since last backup | Daily | ~500 MB |
| **Session Backup** | Agent sessions only | On-demand | ~50 MB |
| **Database Backup** | PostgreSQL dump only | Daily | ~200 MB |

---

## Automated Backup

### Production Backup Script

```bash
# Full system backup
./scripts/production-backup.sh --all

# Database only
./scripts/production-backup.sh --database

# Sessions only
./scripts/production-backup.sh --sessions

# List backups
./scripts/production-backup.sh --list

# Restore from latest
./scripts/production-backup.sh --restore latest
```

### Cron Schedule

```bash
# Edit crontab
crontab -e

# Add backup schedule
# Daily incremental at 2 AM
0 2 * * * /root/heretek/heretek-openclaw/scripts/production-backup.sh --incremental >> /var/log/openclaw-backup.log 2>&1

# Weekly full at Sunday 3 AM
0 3 * * 0 /root/heretek/heretek-openclaw/scripts/production-backup.sh --all >> /var/log/openclaw-backup.log 2>&1
```

---

## Manual Backup

### Full System Backup

```bash
# Create backup directory
mkdir -p /backups/openclaw/$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=/backups/openclaw/$(date +%Y%m%d-%H%M%S)

# Backup OpenClaw configuration
tar -czf $BACKUP_DIR/openclaw-config.tar.gz \
  ~/.openclaw/openclaw.json \
  ~/.openclaw/agents/ \
  ~/.litellm/litellm_config.yaml

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U openclaw openclaw | gzip > $BACKUP_DIR/postgres-backup.sql.gz

# Backup Redis (if needed)
docker compose exec -T redis redis-cli SAVE
cp /var/lib/docker/volumes/heretek-openclaw_redis_data/_data/dump.rdb $BACKUP_DIR/

# Create manifest
cat > $BACKUP_DIR/manifest.json << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "2.0.3",
  "components": ["config", "agents", "postgres", "redis"]
}
EOF

echo "Backup completed: $BACKUP_DIR"
```

### Database Backup

```bash
# PostgreSQL dump
docker compose exec -T postgres pg_dump -U openclaw openclaw | gzip > postgres-backup-$(date +%Y%m%d).sql.gz

# Verify backup
gunzip -c postgres-backup-$(date +%Y%m%d).sql.gz | head -20
```

### Session Backup

```bash
# Backup all agent sessions
tar -czf sessions-backup-$(date +%Y%m%d).tar.gz \
  ~/.openclaw/agents/*/session.jsonl
```

---

## Restoration

### Full System Restoration

```bash
# Stop all services
docker compose down

# Restore OpenClaw configuration
tar -xzf /backups/openclaw/<backup-date>/openclaw-config.tar.gz -C ~/

# Restore PostgreSQL
gunzip -c /backups/openclaw/<backup-date>/postgres-backup.sql.gz | \
  docker compose exec -T postgres psql -U openclaw openclaw

# Start services
docker compose up -d

# Verify restoration
openclaw gateway status
./scripts/health-check.sh
```

### Database Restoration

```bash
# Stop services that use database
docker compose stop litellm gateway

# Restore from dump
gunzip -c postgres-backup-<date>.sql.gz | \
  docker compose exec -T postgres psql -U openclaw openclaw

# Restart services
docker compose start litellm gateway
```

### Session Restoration

```bash
# Restore sessions
tar -xzf sessions-backup-<date>.tar.gz -C ~/.openclaw/agents/

# Verify sessions
ls -la ~/.openclaw/agents/*/session.jsonl
```

---

## Backup Schedule

### Recommended Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| **Incremental** | Daily | 7 days |
| **Full** | Weekly | 4 weeks |
| **Monthly Archive** | Monthly | 12 months |

### Cron Configuration

```bash
# /etc/cron.d/openclaw-backup
# Daily incremental backup
0 2 * * * root /root/heretek/heretek-openclaw/scripts/production-backup.sh --incremental

# Weekly full backup
0 3 * * 0 root /root/heretek/heretek-openclaw/scripts/production-backup.sh --all

# Monthly archive (keep for 1 year)
0 4 1 * * root /root/heretek/heretek-openclaw/scripts/production-backup.sh --archive
```

---

## Verification

### Backup Verification

```bash
# List backup contents
tar -tzf /backups/openclaw/<backup-date>/openclaw-config.tar.gz

# Test PostgreSQL backup
gunzip -c /backups/openclaw/<backup-date>/postgres-backup.sql.gz | \
  pg_restore --list

# Check backup integrity
md5sum /backups/openclaw/<backup-date>/*
```

### Restoration Testing

```bash
# Test restoration in isolated environment
docker compose -f docker-compose.test.yml up -d

# Restore backup
./scripts/production-backup.sh --restore /backups/openclaw/<backup-date>

# Verify functionality
./scripts/health-check.sh

# Cleanup
docker compose -f docker-compose.test.yml down
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Operations Overview](./overview.md) | Operations overview |
| [Monitoring Stack](./monitoring.md) | Monitoring documentation |
| [Troubleshooting](./troubleshooting.md) | Troubleshooting guide |

---

🦞 *The thought that never ends.*
