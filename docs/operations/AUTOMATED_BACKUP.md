# Automated Backup System

## Overview

The Heretek OpenClaw Automated Backup System provides scheduled, reliable backups of all critical system data including PostgreSQL databases, Redis data, workspace files, agent state, and configuration files.

## Features

- **Daily incremental backups** - Efficient backups that only capture changes
- **Weekly full backups** - Complete system backup every Sunday
- **30-day retention policy** - Automatic cleanup of old backups
- **Backup verification** - SHA256 checksums and integrity checks
- **Remote storage support** - Sync to S3 or SCP targets
- **Email notifications** - Alert on backup failures
- **Systemd integration** - Reliable scheduling via systemd timers

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Automated Backup System                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │    Redis     │  │   Workspace  │       │
│  │   Backup     │  │   Backup     │  │   Backup     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │  Agent State    │                         │
│                  │    Backup       │                         │
│                  └────────┬────────┘                         │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │  Configuration  │                         │
│                  │    Backup       │                         │
│                  └────────┬────────┘                         │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐                │
│         │                 │                 │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │ Verification│  │  Rotation   │  │ Remote Sync │          │
│  │  (SHA256)   │  │  (30-day)   │  │  (S3/SCP)   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### 1. Copy systemd units

```bash
# Copy timer and service units to systemd directory
sudo cp systemd/openclaw-backup.timer /etc/systemd/system/
sudo cp systemd/openclaw-backup.service /etc/systemd/system/
```

### 2. Configure environment variables

Create `/etc/openclaw/backup.env`:

```bash
sudo mkdir -p /etc/openclaw
sudo tee /etc/openclaw/backup.env << 'EOF'
# Backup configuration
OPENCLAW_BACKUP_DIR=/root/.openclaw/backups
OPENCLAW_RETENTION_DAYS=30

# Database configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=heretek
POSTGRES_USER=heretek
POSTGRES_PASSWORD=your_secure_password

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Notification configuration
NOTIFY_EMAIL=admin@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your_smtp_password

# Remote storage (optional)
REMOTE_STORAGE_ENABLED=true
REMOTE_STORAGE_TYPE=s3
REMOTE_STORAGE_PATH=s3://your-bucket/backups
EOF

# Secure the file
sudo chmod 600 /etc/openclaw/backup.env
```

### 3. Enable and start the timer

```bash
# Reload systemd to recognize new units
sudo systemctl daemon-reload

# Enable the backup timer
sudo systemctl enable openclaw-backup.timer

# Start the timer
sudo systemctl start openclaw-backup.timer

# Verify timer status
sudo systemctl list-timers openclaw-backup.timer
```

## Usage

### Manual Backup

Run a backup manually:

```bash
# Incremental backup (default)
./scripts/automated-backup.sh

# Full backup with verification
./scripts/automated-backup.sh --type full --verify

# Backup with rotation
./scripts/automated-backup.sh --type incremental --rotate

# Backup with remote sync
./scripts/automated-backup.sh --type full --remote s3://mybucket/backups
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Backup type: `full` or `incremental` (default: incremental) |
| `--verify` | Verify backup integrity after creation |
| `--rotate` | Run rotation to remove expired backups |
| `--remote <target>` | Sync to remote storage (S3 or SCP) |
| `--notify <email>` | Send email notification on failure |
| `--quiet` | Suppress non-error output |
| `--help` | Show help message |

### Remote Storage Examples

```bash
# Sync to AWS S3
./scripts/automated-backup.sh --remote s3://my-bucket/openclaw-backups

# Sync via SCP
./scripts/automated-backup.sh --remote user@backup-server:/backups/openclaw
```

## Backup Schedule

The systemd timer is configured with the following schedule:

| Backup Type | Schedule | Description |
|-------------|----------|-------------|
| Incremental | Daily at 2:00 AM | Captures changes since last backup |
| Full | Sunday at 3:00 AM | Complete system backup |

### Timer Configuration

The timer includes:
- `Persistent=true` - Runs missed backups after system reboot
- `RandomizedDelaySec=1800` - Random delay up to 30 minutes to prevent thundering herd
- `OnBootSec=5min` - Runs 5 minutes after boot if a scheduled run was missed

## Backup Structure

Backups are organized as follows:

```
/root/.openclaw/backups/
├── postgresql/
│   ├── openclaw_incremental_20260331_020000_postgresql.sql.gz
│   └── openclaw_incremental_20260331_020000_postgresql.dump.gz
├── redis/
│   └── openclaw_incremental_20260331_020000_redis.rdb
├── workspace/
│   └── openclaw_incremental_20260331_020000_workspace.tar.gz
├── agent-state/
│   └── openclaw_incremental_20260331_020000_agent-state.tar.gz
├── config/
│   └── openclaw_incremental_20260331_020000_config.tar.gz
└── openclaw_incremental_20260331_020000_checksums.sha256
```

## Verification

Backups are verified using:
1. **Gzip integrity check** - Validates compressed files
2. **Tar archive test** - Ensures tar files are not corrupted
3. **SHA256 checksums** - Creates checksums for all backup files

```bash
# Verify a specific backup
./scripts/automated-backup.sh --verify

# Manually verify checksums
cd /root/.openclaw/backups
sha256sum -c openclaw_incremental_20260331_020000_checksums.sha256
```

## Rotation

The rotation system maintains:
- **30-day retention** - Backups older than 30 days are deleted
- **Minimum 3 backups** - Always keeps at least 3 recent backups per category

Rotation runs automatically:
- Weekly after full backups
- Manually with `--rotate` flag

## Monitoring

### Check Timer Status

```bash
# List all timers
systemctl list-timers

# Check backup timer status
systemctl status openclaw-backup.timer

# View timer details
systemctl cat openclaw-backup.timer
```

### View Logs

```bash
# View recent backup logs
journalctl -u openclaw-backup.service -n 50

# Follow backup logs in real-time
journalctl -u openclaw-backup.service -f

# View logs for specific date
journalctl -u openclaw-backup.service --since "2026-03-31 00:00:00" --until "2026-03-31 23:59:59"
```

### Check Backup Health

```bash
# List all backups
ls -lah /root/.openclaw/backups/*/

# Check disk usage
du -sh /root/.openclaw/backups/

# Verify latest backup checksums
cd /root/.openclaw/backups
latest=$(ls -t *.sha256 | head -1)
sha256sum -c "$latest"
```

## Troubleshooting

### Backup Fails

1. **Check logs**: `journalctl -u openclaw-backup.service -n 100`
2. **Verify database connectivity**: `pg_isready -h localhost -p 5432`
3. **Check disk space**: `df -h /root/.openclaw/backups`
4. **Test manual backup**: `./scripts/automated-backup.sh --quiet`

### Timer Not Running

1. **Check timer status**: `systemctl status openclaw-backup.timer`
2. **Verify timer is enabled**: `systemctl is-enabled openclaw-backup.timer`
3. **Reload systemd**: `systemctl daemon-reload`
4. **Restart timer**: `systemctl restart openclaw-backup.timer`

### Remote Sync Fails

1. **Verify credentials**: Test S3/SCP access manually
2. **Check network connectivity**: `ping backup-server` or `aws s3 ls`
3. **Verify permissions**: Ensure write access to remote location

## Recovery

For backup restoration procedures, see [`runbook-backup-restoration.md`](./runbook-backup-restoration.md).

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_BACKUP_DIR` | `/root/.openclaw/backups` | Base backup directory |
| `OPENCLAW_TEMP_DIR` | `/tmp/openclaw-backup` | Temporary directory |
| `OPENCLAW_RETENTION_DAYS` | `30` | Backup retention period |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `heretek` | PostgreSQL database |
| `POSTGRES_USER` | `heretek` | PostgreSQL user |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `NOTIFY_EMAIL` | - | Email for failure notifications |
| `REMOTE_STORAGE_TYPE` | - | Remote storage type: `s3`, `scp` |
| `REMOTE_STORAGE_PATH` | - | Remote storage path |

## Related Documentation

- [Backup Configuration](./backup-config.json) - JSON configuration file
- [Backup Restoration Runbook](./runbook-backup-restoration.md) - Recovery procedures
- [Monitoring Operations](./MONITORING_STACK.md) - System monitoring setup
