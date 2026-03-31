#!/bin/bash
# ==============================================================================
# Heretek OpenClaw — Production Backup System
# ==============================================================================
# Automated backup script with rotation, verification, and restore capabilities
#
# Usage:
#   ./production-backup.sh --all              # Backup everything
#   ./production-backup.sh --database         # Backup PostgreSQL only
#   ./production-backup.sh --redis            # Backup Redis only
#   ./production-backup.sh --workspace        # Backup workspace files
#   ./production-backup.sh --agent-state      # Backup agent states
#   ./production-backup.sh --config           # Backup configuration files
#   ./production-backup.sh --restore latest   # Restore from latest backup
#   ./production-backup.sh --restore <date>   # Restore from specific date (YYYYMMDD)
#   ./production-backup.sh --verify <date>    # Verify backup integrity
#   ./production-backup.sh --list             # List available backups
#   ./production-backup.sh --cleanup          # Remove expired backups
# ==============================================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/root/.openclaw/backups}"
TEMP_DIR="${TEMP_DIR:-/tmp/openclaw-backup}"
CONFIG_FILE="${CONFIG_FILE:-/root/heretek/heretek-openclaw/docs/operations/backup-config.json}"
LOG_FILE="${LOG_FILE:-/root/.openclaw/logs/backup.log}"

# PostgreSQL settings
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_DATABASE="${PG_DATABASE:-heretek}"
PG_USER="${PG_USER:-heretek}"
PG_PASSWORD="${PG_PASSWORD:-${POSTGRES_PASSWORD:-heretek}}"

# Redis settings
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Workspace paths
WORKSPACE_DIR="${WORKSPACE_DIR:-/root/.openclaw/workspace}"
AGENTS_DIR="${AGENTS_DIR:-/root/.openclaw/agents}"
OPENCLAW_DIR="${OPENCLAW_DIR:-/root/.openclaw}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==============================================================================
# Utility Functions
# ==============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }

print_header() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw — Backup System"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=============================================="
    echo ""
}

ensure_dirs() {
    mkdir -p "$BACKUP_DIR"/{database,redis,workspace,agent-state,config,full}
    mkdir -p "$TEMP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
}

cleanup_temp() {
    rm -rf "$TEMP_DIR"/*
}

# ==============================================================================
# Backup Functions
# ==============================================================================

backup_postgresql() {
    local date_stamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/database/postgresql-${date_stamp}.sql.gz"
    
    log_info "Starting PostgreSQL backup..."
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_warn "pg_dump not found, attempting Docker-based backup"
        backup_postgresql_docker "$backup_file"
        return $?
    fi
    
    # Perform backup
    PGPASSWORD="$PG_PASSWORD" pg_dump \
        -h "$PG_HOST" \
        -p "$PG_PORT" \
        -U "$PG_USER" \
        -d "$PG_DATABASE" \
        --verbose \
        2>> "$LOG_FILE" | gzip > "$backup_file"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "PostgreSQL backup complete: $backup_file ($size)"
        
        # Generate checksum
        sha256sum "$backup_file" > "${backup_file}.sha256"
        log_info "Checksum generated: ${backup_file}.sha256"
        
        return 0
    else
        log_error "PostgreSQL backup failed"
        return 1
    fi
}

backup_postgresql_docker() {
    local backup_file="$1"
    
    log_info "Attempting Docker-based PostgreSQL backup..."
    
    # Try to find the postgres container
    local container=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)
    
    if [ -z "$container" ]; then
        log_error "No PostgreSQL container found"
        return 1
    fi
    
    docker exec "$container" pg_dump \
        -U "$PG_USER" \
        -d "$PG_DATABASE" \
        --verbose \
        2>> "$LOG_FILE" | gzip > "$backup_file"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "PostgreSQL Docker backup complete: $backup_file ($size)"
        sha256sum "$backup_file" > "${backup_file}.sha256"
        return 0
    else
        log_error "PostgreSQL Docker backup failed"
        return 1
    fi
}

backup_redis() {
    local date_stamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/redis/redis-${date_stamp}.rdb"
    
    log_info "Starting Redis backup..."
    
    # Check if redis-cli is available
    if command -v redis-cli &> /dev/null; then
        # Try BGSAVE command
        if [ -n "$REDIS_PASSWORD" ]; then
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE 2>/dev/null || true
        else
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE 2>/dev/null || true
        fi
        
        log_info "Waiting for Redis BGSAVE to complete..."
        sleep 5
        
        # Find and copy the RDB file
        local rdb_path=$(redis-cli CONFIG GET dir 2>/dev/null | tail -1)
        local rdb_file="${rdb_path}/dump.rdb"
        
        if [ -f "$rdb_file" ]; then
            cp "$rdb_file" "$backup_file"
            gzip "$backup_file"
            backup_file="${backup_file}.gz"
            
            if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
                local size=$(du -h "$backup_file" | cut -f1)
                log_success "Redis backup complete: $backup_file ($size)"
                sha256sum "$backup_file" > "${backup_file}.sha256"
                return 0
            fi
        fi
    fi
    
    # Fallback: Try Docker-based backup
    log_info "Attempting Docker-based Redis backup..."
    local container=$(docker ps --filter "name=redis" --format "{{.Names}}" | head -1)
    
    if [ -n "$container" ]; then
        docker cp "$container:/data/dump.rdb" "$backup_file" 2>/dev/null && \
        gzip "$backup_file" && \
        backup_file="${backup_file}.gz"
        
        if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
            local size=$(du -h "$backup_file" | cut -f1)
            log_success "Redis Docker backup complete: $backup_file ($size)"
            sha256sum "$backup_file" > "${backup_file}.sha256"
            return 0
        fi
    fi
    
    log_warn "Redis backup skipped - no Redis instance found or accessible"
    return 0
}

backup_workspace() {
    local date_stamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/workspace/workspace-${date_stamp}.tar.gz"
    
    log_info "Starting workspace backup..."
    
    if [ ! -d "$WORKSPACE_DIR" ]; then
        log_warn "Workspace directory not found: $WORKSPACE_DIR"
        return 0
    fi
    
    tar -czf "$backup_file" \
        --exclude='*.log' \
        --exclude='*.tmp' \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        -C "$(dirname "$WORKSPACE_DIR")" \
        "$(basename "$WORKSPACE_DIR")" \
        2>> "$LOG_FILE"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Workspace backup complete: $backup_file ($size)"
        sha256sum "$backup_file" > "${backup_file}.sha256"
        return 0
    else
        log_error "Workspace backup failed"
        return 1
    fi
}

backup_agent_state() {
    local date_stamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/agent-state/agent-state-${date_stamp}.tar.gz"
    
    log_info "Starting agent state backup..."
    
    # Create temp directory for agent state
    local state_temp="$TEMP_DIR/agent-state"
    mkdir -p "$state_temp"
    
    # Copy agent sessions and state
    if [ -d "$AGENTS_DIR" ]; then
        for agent_dir in "$AGENTS_DIR"/*/; do
            if [ -d "$agent_dir" ]; then
                local agent_name=$(basename "$agent_dir")
                mkdir -p "$state_temp/$agent_name"
                
                # Copy sessions
                if [ -d "$agent_dir/sessions" ]; then
                    cp -r "$agent_dir/sessions" "$state_temp/$agent_name/" 2>/dev/null || true
                fi
                
                # Copy state files
                if [ -d "$agent_dir/state" ]; then
                    cp -r "$agent_dir/state" "$state_temp/$agent_name/" 2>/dev/null || true
                fi
            fi
        done
    fi
    
    # Copy cron state
    if [ -d "$OPENCLAW_DIR/cron" ]; then
        cp -r "$OPENCLAW_DIR/cron" "$state_temp/" 2>/dev/null || true
    fi
    
    # Create archive
    tar -czf "$backup_file" -C "$TEMP_DIR" "agent-state" 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Agent state backup complete: $backup_file ($size)"
        sha256sum "$backup_file" > "${backup_file}.sha256"
        return 0
    else
        log_error "Agent state backup failed"
        return 1
    fi
}

backup_config() {
    local date_stamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/config/config-${date_stamp}.tar.gz"
    
    log_info "Starting configuration backup..."
    
    # Create temp directory for config
    local config_temp="$TEMP_DIR/config"
    mkdir -p "$config_temp"
    
    # Copy configuration files
    local config_files=(
        "/root/.openclaw/openclaw.json"
        "/root/.openclaw/config.json"
        "/root/heretek/heretek-openclaw/openclaw.json"
        "/root/heretek/heretek-openclaw/docs/operations/backup-config.json"
        "/root/heretek/heretek-openclaw/docs/operations/monitoring-config.json"
    )
    
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            cp "$file" "$config_temp/" 2>/dev/null || true
        fi
    done
    
    # Create archive
    tar -czf "$backup_file" -C "$TEMP_DIR" "config" 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Configuration backup complete: $backup_file ($size)"
        sha256sum "$backup_file" > "${backup_file}.sha256"
        return 0
    else
        log_error "Configuration backup failed"
        return 1
    fi
}

backup_full() {
    local date_stamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/full/full-backup-${date_stamp}.tar.gz"
    
    log_info "Starting full system backup..."
    
    # Run all individual backups first
    backup_postgresql || true
    backup_redis || true
    backup_workspace || true
    backup_agent_state || true
    backup_config || true
    
    # Create comprehensive archive
    tar -czf "$backup_file" \
        -C "$BACKUP_DIR" \
        database redis workspace agent-state config \
        2>> "$LOG_FILE"
    
    if [ $? -eq 0 ] && [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Full system backup complete: $backup_file ($size)"
        sha256sum "$backup_file" > "${backup_file}.sha256"
        return 0
    else
        log_error "Full system backup failed"
        return 1
    fi
}

# ==============================================================================
# Rotation Functions
# ==============================================================================

rotate_backups() {
    local backup_type="$1"
    local retention_days="$2"
    local min_backups="$3"
    
    log_info "Rotating $backup_type backups (retention: $retention_days days, min: $min_backups)"
    
    local backup_path="$BACKUP_DIR/$backup_type"
    
    if [ ! -d "$backup_path" ]; then
        return 0
    fi
    
    # Count current backups
    local count=$(find "$backup_path" -name "*.gz" -o -name "*.sql" | wc -l)
    
    if [ "$count" -le "$min_backups" ]; then
        log_info "Keeping $count backups (minimum: $min_backups)"
        return 0
    fi
    
    # Remove expired backups
    local deleted=0
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            rm -f "$file" "${file}.sha256"
            log_info "Deleted expired backup: $file"
            ((deleted++))
        fi
    done < <(find "$backup_path" -type f \( -name "*.gz" -o -name "*.sql" -o -name "*.rdb" \) -mtime +"$retention_days" 2>/dev/null)
    
    log_info "Rotation complete: $deleted files deleted"
}

cleanup_all_expired() {
    log_info "Cleaning up all expired backups..."
    
    rotate_backups "database" 30 7
    rotate_backups "redis" 7 3
    rotate_backups "workspace" 30 7
    rotate_backups "agent-state" 7 4
    rotate_backups "full" 90 4
    
    log_success "Cleanup complete"
}

# ==============================================================================
# Restore Functions
# ==============================================================================

list_backups() {
    echo ""
    echo "Available Backups:"
    echo "=================="
    echo ""
    
    for type in database redis workspace agent-state config full; do
        local backup_path="$BACKUP_DIR/$type"
        if [ -d "$backup_path" ]; then
            local count=$(find "$backup_path" -name "*.gz" -o -name "*.sql" | wc -l)
            if [ "$count" -gt 0 ]; then
                echo "$type ($count backups):"
                find "$backup_path" -type f \( -name "*.gz" -o -name "*.sql" -o -name "*.rdb" \) \
                    -printf "  %T+ %f\n" | sort -r | head -10
                echo ""
            fi
        fi
    done
}

restore_postgresql() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Starting PostgreSQL restore from: $backup_file"
    
    # Verify checksum if available
    if [ -f "${backup_file}.sha256" ]; then
        log_info "Verifying checksum..."
        if ! sha256sum -c "${backup_file}.sha256" > /dev/null 2>&1; then
            log_error "Checksum verification failed!"
            return 1
        fi
        log_success "Checksum verified"
    fi
    
    # Restore
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | PGPASSWORD="$PG_PASSWORD" psql \
            -h "$PG_HOST" \
            -p "$PG_PORT" \
            -U "$PG_USER" \
            -d "$PG_DATABASE" \
            > /dev/null 2>&1
    else
        PGPASSWORD="$PG_PASSWORD" psql \
            -h "$PG_HOST" \
            -p "$PG_PORT" \
            -U "$PG_USER" \
            -d "$PG_DATABASE" \
            < "$backup_file" \
            > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        log_success "PostgreSQL restore complete"
        return 0
    else
        log_error "PostgreSQL restore failed"
        return 1
    fi
}

restore_latest() {
    local backup_type="$1"
    
    log_info "Finding latest $backup_type backup..."
    
    local latest=$(find "$BACKUP_DIR/$backup_type" -type f \( -name "*.gz" -o -name "*.sql" -o -name "*.rdb" \) \
        -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    
    if [ -z "$latest" ]; then
        log_error "No backups found for type: $backup_type"
        return 1
    fi
    
    log_info "Latest backup: $latest"
    
    case "$backup_type" in
        database)
            restore_postgresql "$latest"
            ;;
        *)
            log_warn "Restore not implemented for type: $backup_type"
            return 1
            ;;
    esac
}

# ==============================================================================
# Verification Functions
# ==============================================================================

verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_info "Verifying backup: $backup_file"
    
    # Check file exists and has content
    if [ ! -s "$backup_file" ]; then
        log_error "Backup file is empty"
        return 1
    fi
    
    # Verify checksum if available
    if [ -f "${backup_file}.sha256" ]; then
        log_info "Verifying checksum..."
        if sha256sum -c "${backup_file}.sha256" > /dev/null 2>&1; then
            log_success "Checksum verified"
        else
            log_error "Checksum verification failed!"
            return 1
        fi
    else
        log_warn "No checksum file found"
    fi
    
    # Test archive integrity
    if [[ "$backup_file" == *.tar.gz ]]; then
        log_info "Testing archive integrity..."
        if tar -tzf "$backup_file" > /dev/null 2>&1; then
            log_success "Archive integrity verified"
        else
            log_error "Archive integrity check failed!"
            return 1
        fi
    elif [[ "$backup_file" == *.gz ]]; then
        log_info "Testing gzip integrity..."
        if gzip -t "$backup_file" 2>/dev/null; then
            log_success "Gzip integrity verified"
        else
            log_error "Gzip integrity check failed!"
            return 1
        fi
    fi
    
    log_success "Backup verification complete: $backup_file"
    return 0
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    print_header
    ensure_dirs
    
    case "${1:-}" in
        --all)
            log_info "Running full backup suite..."
            backup_postgresql || true
            backup_redis || true
            backup_workspace || true
            backup_agent_state || true
            backup_config || true
            cleanup_all_expired
            log_success "All backups complete"
            ;;
        --database)
            backup_postgresql
            ;;
        --redis)
            backup_redis
            ;;
        --workspace)
            backup_workspace
            ;;
        --agent-state)
            backup_agent_state
            ;;
        --config)
            backup_config
            ;;
        --full)
            backup_full
            cleanup_all_expired
            ;;
        --restore)
            if [ "$2" = "latest" ]; then
                restore_latest "${3:-database}"
            else
                log_warn "Specific date restore not implemented yet"
                list_backups
            fi
            ;;
        --verify)
            if [ -n "$2" ]; then
                verify_backup "$2"
            else
                log_error "Please specify backup file to verify"
            fi
            ;;
        --list)
            list_backups
            ;;
        --cleanup)
            cleanup_all_expired
            ;;
        --help|-h)
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  --all           Backup everything"
            echo "  --database      Backup PostgreSQL only"
            echo "  --redis         Backup Redis only"
            echo "  --workspace     Backup workspace files"
            echo "  --agent-state   Backup agent states"
            echo "  --config        Backup configuration files"
            echo "  --full          Full system backup with cleanup"
            echo "  --restore       Restore from backup"
            echo "  --verify        Verify backup integrity"
            echo "  --list          List available backups"
            echo "  --cleanup       Remove expired backups"
            echo "  --help          Show this help"
            ;;
        *)
            log_error "Invalid option: ${1:-}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

main "$@"
