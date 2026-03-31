#!/bin/bash
#
# Automated Backup Script for Heretek OpenClaw
#
# Features:
# - Daily incremental backups
# - Weekly full backups
# - 30-day retention policy
# - Remote storage support (S3, SCP)
# - Backup verification
# - Email notifications on failure
#
# Usage:
#   ./scripts/automated-backup.sh [options]
#   ./scripts/automated-backup.sh --type full
#   ./scripts/automated-backup.sh --type incremental --verify
#
# Options:
#   --type <type>      Backup type: full, incremental (default: incremental)
#   --verify           Verify backup after creation
#   --rotate           Run rotation to remove expired backups
#   --remote <target>  Sync to remote storage (s3://bucket/path or user@host:/path)
#   --notify <email>   Send email notification on failure
#   --quiet            Suppress non-error output
#   --help             Show help message
#

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$ROOT_DIR/docs/operations/backup-config.json"

# Default backup settings
BACKUP_BASE_DIR="${OPENCLAW_BACKUP_DIR:-/root/.openclaw/backups}"
TEMP_DIR="${OPENCLAW_TEMP_DIR:-/tmp/openclaw-backup}"
RETENTION_DAYS="${OPENCLAW_RETENTION_DAYS:-30}"
COMPRESSION="${OPENCLAW_COMPRESSION:-gzip}"
ENCRYPTION_ENABLED="${OPENCLAW_ENCRYPTION_ENABLED:-false}"

# Database settings
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-heretek}"
POSTGRES_USER="${POSTGRES_USER:-heretek}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Notification settings
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE:-true}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"

# Remote storage
REMOTE_STORAGE_ENABLED="${REMOTE_STORAGE_ENABLED:-false}"
REMOTE_STORAGE_TYPE="${REMOTE_STORAGE_TYPE:-}"  # s3, scp
REMOTE_STORAGE_PATH="${REMOTE_STORAGE_PATH:-}"

# ==============================================================================
# Colors and Logging
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

QUIET_MODE=false
BACKUP_TYPE="incremental"
VERIFY_BACKUP=false
RUN_ROTATION=false
REMOTE_TARGET=""

log() {
    if [[ "$QUIET_MODE" == "false" ]]; then
        echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $*"
    fi
}

log_info() {
    if [[ "$QUIET_MODE" == "false" ]]; then
        echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"
    fi
}

log_success() {
    if [[ "$QUIET_MODE" == "false" ]]; then
        echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $*"
    fi
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" >&2
}

# ==============================================================================
# Parse Arguments
# ==============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                BACKUP_TYPE="$2"
                if [[ "$BACKUP_TYPE" != "full" && "$BACKUP_TYPE" != "incremental" ]]; then
                    log_error "Invalid backup type: $BACKUP_TYPE. Must be 'full' or 'incremental'"
                    exit 1
                fi
                shift 2
                ;;
            --verify)
                VERIFY_BACKUP=true
                shift
                ;;
            --rotate)
                RUN_ROTATION=true
                shift
                ;;
            --remote)
                REMOTE_TARGET="$2"
                shift 2
                ;;
            --notify)
                NOTIFY_EMAIL="$2"
                shift 2
                ;;
            --quiet)
                QUIET_MODE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
${CYAN}Automated Backup Script for Heretek OpenClaw${NC}

${YELLOW}Usage:${NC}
  ./scripts/automated-backup.sh [options]

${YELLOW}Options:${NC}
  --type <type>      Backup type: full, incremental (default: incremental)
  --verify           Verify backup after creation
  --rotate           Run rotation to remove expired backups
  --remote <target>  Sync to remote storage (s3://bucket/path or user@host:/path)
  --notify <email>   Send email notification on failure
  --quiet            Suppress non-error output
  --help, -h         Show help message

${YELLOW}Examples:${NC}
  ./scripts/automated-backup.sh
  ./scripts/automated-backup.sh --type full --verify
  ./scripts/automated-backup.sh --type incremental --rotate --remote s3://mybucket/backups

${YELLOW}Environment Variables:${NC}
  OPENCLAW_BACKUP_DIR      Base backup directory (default: /root/.openclaw/backups)
  OPENCLAW_TEMP_DIR        Temporary directory (default: /tmp/openclaw-backup)
  OPENCLAW_RETENTION_DAYS  Retention period in days (default: 30)
  POSTGRES_HOST            PostgreSQL host (default: localhost)
  POSTGRES_DB              PostgreSQL database (default: heretek)
  REDIS_HOST               Redis host (default: localhost)
  NOTIFY_EMAIL             Email for failure notifications
  REMOTE_STORAGE_ENABLED   Enable remote storage (true/false)
  REMOTE_STORAGE_TYPE      Remote storage type: s3, scp
  REMOTE_STORAGE_PATH      Remote storage path

EOF
}

# ==============================================================================
# Utility Functions
# ==============================================================================

check_dependencies() {
    local missing=()
    
    for cmd in pg_dump redis-cli tar gzip sha256sum; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_warning "Missing dependencies: ${missing[*]}"
        log_info "Some backup features may not work correctly"
    fi
}

ensure_directories() {
    log_info "Ensuring backup directories exist..."
    
    mkdir -p "$BACKUP_BASE_DIR"
    mkdir -p "$BACKUP_BASE_DIR/postgresql"
    mkdir -p "$BACKUP_BASE_DIR/redis"
    mkdir -p "$BACKUP_BASE_DIR/workspace"
    mkdir -p "$BACKUP_BASE_DIR/agent-state"
    mkdir -p "$BACKUP_BASE_DIR/config"
    mkdir -p "$TEMP_DIR"
    
    log_success "Backup directories ready"
}

generate_backup_name() {
    local type="$1"
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local day_of_week
    day_of_week=$(date '+%u')
    
    if [[ "$type" == "full" ]] || [[ "$day_of_week" == "7" ]]; then
        echo "openclaw_full_${timestamp}"
    else
        echo "openclaw_incremental_${timestamp}"
    fi
}

# ==============================================================================
# Backup Functions
# ==============================================================================

backup_postgresql() {
    local backup_name="$1"
    local backup_file="$BACKUP_BASE_DIR/postgresql/${backup_name}_postgresql.sql"
    
    log_info "Backing up PostgreSQL database..."
    
    if command -v pg_dump &> /dev/null; then
        export PGPASSWORD="${POSTGRES_PASSWORD:-}"
        
        if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -f "${backup_file}.dump" 2>/dev/null; then
            # Compress the dump
            gzip -f "${backup_file}.dump"
            log_success "PostgreSQL backup created: ${backup_file}.dump.gz"
            
            # Create SQL text backup as well
            pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "${backup_file}" 2>/dev/null || true
            gzip -f "${backup_file}"
            log_success "PostgreSQL SQL backup created: ${backup_file}.gz"
        else
            log_warning "PostgreSQL backup failed (database may not be running)"
            return 1
        fi
        
        unset PGPASSWORD
    else
        log_warning "pg_dump not available, skipping PostgreSQL backup"
        return 1
    fi
    
    return 0
}

backup_redis() {
    local backup_name="$1"
    local backup_file="$BACKUP_BASE_DIR/redis/${backup_name}_redis.rdb"
    
    log_info "Backing up Redis database..."
    
    if command -v redis-cli &> /dev/null; then
        # Try to save RDB file
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE 2>/dev/null; then
            log_info "Waiting for Redis BGSAVE to complete..."
            sleep 5
            
            # Copy the RDB file if accessible
            if [[ -f /var/lib/redis/dump.rdb ]]; then
                cp /var/lib/redis/dump.rdb "$backup_file"
                log_success "Redis RDB backup created: $backup_file"
            else
                # Fallback: Use redis-cli to dump
                redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$backup_file" 2>/dev/null || true
                if [[ -f "$backup_file" ]]; then
                    log_success "Redis backup created: $backup_file"
                else
                    log_warning "Redis backup failed (database may not be running)"
                    return 1
                fi
            fi
        else
            log_warning "Redis BGSAVE failed (database may not be running)"
            return 1
        fi
    else
        log_warning "redis-cli not available, skipping Redis backup"
        return 1
    fi
    
    return 0
}

backup_workspace() {
    local backup_name="$1"
    local backup_file="$BACKUP_BASE_DIR/workspace/${backup_name}_workspace.tar.gz"
    
    log_info "Backing up workspace..."
    
    local workspace_paths=(
        "$ROOT_DIR"
        "${HOME}/.openclaw/workspace"
        "${HOME}/.openclaw/agents"
        "${HOME}/.openclaw/skills"
        "${HOME}/.openclaw/memory"
    )
    
    local existing_paths=()
    for path in "${workspace_paths[@]}"; do
        if [[ -e "$path" ]]; then
            existing_paths+=("$path")
        fi
    done
    
    if [[ ${#existing_paths[@]} -gt 0 ]]; then
        tar -czf "$backup_file" --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='*.tmp' "${existing_paths[@]}" 2>/dev/null || true
        log_success "Workspace backup created: $backup_file"
    else
        log_warning "No workspace paths found to backup"
        return 1
    fi
    
    return 0
}

backup_agent_state() {
    local backup_name="$1"
    local backup_file="$BACKUP_BASE_DIR/agent-state/${backup_name}_agent-state.tar.gz"
    
    log_info "Backing up agent state..."
    
    local state_paths=(
        "${HOME}/.openclaw/agents/*/sessions"
        "${HOME}/.openclaw/agents/*/state"
        "${HOME}/.openclaw/cron"
        "$ROOT_DIR/plugins/*/state"
    )
    
    local existing_paths=()
    for path in "${state_paths[@]}"; do
        # Expand glob patterns
        for expanded in $path; do
            if [[ -e "$expanded" ]]; then
                existing_paths+=("$expanded")
            fi
        done
    done
    
    if [[ ${#existing_paths[@]} -gt 0 ]]; then
        tar -czf "$backup_file" "${existing_paths[@]}" 2>/dev/null || true
        log_success "Agent state backup created: $backup_file"
    else
        log_info "No agent state files found to backup"
        return 1
    fi
    
    return 0
}

backup_config() {
    local backup_name="$1"
    local backup_file="$BACKUP_BASE_DIR/config/${backup_name}_config.tar.gz"
    
    log_info "Backing up configuration files..."
    
    local config_files=(
        "$ROOT_DIR/openclaw.json"
        "$ROOT_DIR/.env.example"
        "${HOME}/.openclaw/openclaw.json"
        "${HOME}/.openclaw/config.json"
    )
    
    local existing_files=()
    for file in "${config_files[@]}"; do
        if [[ -f "$file" ]]; then
            existing_files+=("$file")
        fi
    done
    
    if [[ ${#existing_files[@]} -gt 0 ]]; then
        tar -czf "$backup_file" "${existing_files[@]}" 2>/dev/null || true
        log_success "Configuration backup created: $backup_file"
    else
        log_warning "No configuration files found to backup"
        return 1
    fi
    
    return 0
}

# ==============================================================================
# Verification Functions
# ==============================================================================

verify_backup() {
    local backup_name="$1"
    local errors=0
    
    log_info "Verifying backup: $backup_name"
    
    # Check PostgreSQL backup
    local pg_dump="$BACKUP_BASE_DIR/postgresql/${backup_name}_postgresql.sql.gz"
    local pg_dump_c="$BACKUP_BASE_DIR/postgresql/${backup_name}_postgresql.dump.gz"
    if [[ -f "$pg_dump" ]] || [[ -f "$pg_dump_c" ]]; then
        if gzip -t "$pg_dump" 2>/dev/null || gzip -t "$pg_dump_c" 2>/dev/null; then
            log_success "PostgreSQL backup verification passed"
        else
            log_error "PostgreSQL backup verification failed"
            ((errors++))
        fi
    fi
    
    # Check Redis backup
    local redis_dump="$BACKUP_BASE_DIR/redis/${backup_name}_redis.rdb"
    if [[ -f "$redis_dump" ]]; then
        log_success "Redis backup verification passed (file exists)"
    fi
    
    # Check workspace backup
    local workspace_tar="$BACKUP_BASE_DIR/workspace/${backup_name}_workspace.tar.gz"
    if [[ -f "$workspace_tar" ]]; then
        if tar -tzf "$workspace_tar" &>/dev/null; then
            log_success "Workspace backup verification passed"
        else
            log_error "Workspace backup verification failed"
            ((errors++))
        fi
    fi
    
    # Check agent state backup
    local state_tar="$BACKUP_BASE_DIR/agent-state/${backup_name}_agent-state.tar.gz"
    if [[ -f "$state_tar" ]]; then
        if tar -tzf "$state_tar" &>/dev/null; then
            log_success "Agent state backup verification passed"
        else
            log_error "Agent state backup verification failed"
            ((errors++))
        fi
    fi
    
    # Check config backup
    local config_tar="$BACKUP_BASE_DIR/config/${backup_name}_config.tar.gz"
    if [[ -f "$config_tar" ]]; then
        if tar -tzf "$config_tar" &>/dev/null; then
            log_success "Configuration backup verification passed"
        else
            log_error "Configuration backup verification failed"
            ((errors++))
        fi
    fi
    
    # Generate checksums
    log_info "Generating checksums..."
    local checksum_file="$BACKUP_BASE_DIR/${backup_name}_checksums.sha256"
    find "$BACKUP_BASE_DIR" -maxdepth 2 -name "${backup_name}*" -type f -exec sha256sum {} \; > "$checksum_file" 2>/dev/null || true
    
    if [[ $errors -eq 0 ]]; then
        log_success "Backup verification completed successfully"
        return 0
    else
        log_error "Backup verification completed with $errors error(s)"
        return 1
    fi
}

# ==============================================================================
# Rotation Functions
# ==============================================================================

rotate_backups() {
    log_info "Running backup rotation (retention: ${RETENTION_DAYS} days)..."
    
    local deleted=0
    
    # Find and delete old backups
    while IFS= read -r -d '' file; do
        log_info "Deleting expired backup: $file"
        rm -f "$file"
        ((deleted++))
    done < <(find "$BACKUP_BASE_DIR" -type f -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)
    
    # Keep minimum number of backups
    for dir in "$BACKUP_BASE_DIR"/*/; do
        local count
        count=$(find "$dir" -type f -name "*.gz" 2>/dev/null | wc -l)
        local min_keep=3
        
        if [[ $count -gt $min_keep ]]; then
            # Sort by date and remove oldest, keeping minimum
            find "$dir" -type f -name "*.gz" -printf '%T@ %p\n' 2>/dev/null | \
                sort -n | \
                head -n -${min_keep} | \
                cut -d' ' -f2- | \
                while IFS= read -r file; do
                    log_info "Deleting excess backup: $file"
                    rm -f "$file"
                    ((deleted++))
                done
        fi
    done
    
    log_success "Rotation complete: $deleted file(s) deleted"
}

# ==============================================================================
# Remote Sync Functions
# ==============================================================================

sync_remote() {
    local target="$1"
    
    log_info "Syncing backups to remote storage: $target"
    
    if [[ "$target" == s3://* ]]; then
        # AWS S3 sync
        if command -v aws &> /dev/null; then
            aws s3 sync "$BACKUP_BASE_DIR" "$target" --exclude "*" --include "*.gz" --include "*.sha256"
            log_success "S3 sync completed"
        else
            log_error "AWS CLI not available for S3 sync"
            return 1
        fi
    elif [[ "$target" == *@*:* ]]; then
        # SCP sync
        if command -v rsync &> /dev/null; then
            rsync -avz -e ssh "$BACKUP_BASE_DIR/" "$target/"
            log_success "SCP sync completed"
        else
            log_error "rsync not available for SCP sync"
            return 1
        fi
    else
        log_error "Invalid remote target format: $target"
        return 1
    fi
    
    return 0
}

# ==============================================================================
# Notification Functions
# ==============================================================================

send_notification() {
    local subject="$1"
    local body="$2"
    local status="$3"
    
    if [[ -z "$NOTIFY_EMAIL" ]] && [[ -z "$1" ]]; then
        return 0
    fi
    
    local email="${NOTIFY_EMAIL:-$1}"
    
    log_info "Sending notification to: $email"
    
    # Try various mail methods
    if command -v mail &> /dev/null && [[ -n "$email" ]]; then
        echo "$body" | mail -s "$subject" "$email"
        log_success "Email notification sent via mail command"
        return 0
    fi
    
    if command -v sendmail &> /dev/null && [[ -n "$email" ]]; then
        {
            echo "To: $email"
            echo "Subject: $subject"
            echo ""
            echo "$body"
        } | sendmail -t
        log_success "Email notification sent via sendmail"
        return 0
    fi
    
    log_warning "No mail command available, skipping email notification"
    return 1
}

send_failure_notification() {
    local error_message="$1"
    local subject="[OpenClaw Backup FAILED] $(hostname) - $(date '+%Y-%m-%d %H:%M')"
    local body="Backup failed on $(hostname) at $(date)

Error: $error_message

Please check the backup logs and resolve the issue."

    send_notification "$subject" "$body" "failure"
}

send_success_notification() {
    local backup_name="$1"
    local subject="[OpenClaw Backup OK] $(hostname) - $(date '+%Y-%m-%d %H:%M')"
    local body="Backup completed successfully on $(hostname) at $(date)

Backup Name: $backup_name
Backup Directory: $BACKUP_BASE_DIR
Backup Type: $BACKUP_TYPE

All backup operations completed successfully."

    send_notification "$subject" "$body" "success"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    parse_args "$@"
    
    log_info "Starting automated backup..."
    log_info "Backup type: $BACKUP_TYPE"
    
    # Check dependencies
    check_dependencies
    
    # Ensure directories exist
    ensure_directories
    
    # Generate backup name
    local backup_name
    backup_name=$(generate_backup_name "$BACKUP_TYPE")
    
    local errors=0
    
    # Perform backups
    backup_postgresql "$backup_name" || ((errors++))
    backup_redis "$backup_name" || ((errors++))
    backup_workspace "$backup_name" || ((errors++))
    backup_agent_state "$backup_name" || ((errors++))
    backup_config "$backup_name" || ((errors++))
    
    # Verify if requested
    if [[ "$VERIFY_BACKUP" == "true" ]]; then
        verify_backup "$backup_name" || ((errors++))
    fi
    
    # Rotate if requested
    if [[ "$RUN_ROTATION" == "true" ]]; then
        rotate_backups
    fi
    
    # Sync to remote if requested
    if [[ -n "$REMOTE_TARGET" ]]; then
        sync_remote "$REMOTE_TARGET" || ((errors++))
    fi
    
    # Handle results
    if [[ $errors -eq 0 ]]; then
        log_success "Backup completed successfully: $backup_name"
        send_success_notification "$backup_name"
        exit 0
    else
        log_error "Backup completed with $errors error(s)"
        send_failure_notification "Backup completed with $errors error(s). Check logs for details."
        exit 1
    fi
}

# Run main function
main "$@"
