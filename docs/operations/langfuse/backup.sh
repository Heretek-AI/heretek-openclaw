#!/bin/bash
# ==============================================================================
# Langfuse Backup Script for Heretek OpenClaw
# ==============================================================================
# This script creates automated backups of the Langfuse PostgreSQL database
# and manages backup retention.
#
# Usage:
#   ./backup.sh [--restore <backup-file>] [--list] [--help]
#
# Cron Example (daily at 2 AM):
#   0 2 * * * /root/heretek/heretek-openclaw/docs/operations/langfuse/backup.sh
# ==============================================================================

set -e

# Configuration
BACKUP_DIR="${LANGFUSE_BACKUP_DIR:-~/langfuse/backups}"
RETENTION_DAYS="${LANGFUSE_BACKUP_RETENTION_DAYS:-7}"
POSTGRES_CONTAINER="heretek-langfuse-db"
POSTGRES_USER="langfuse"
POSTGRES_DB="langfuse"
PROJECT_DIR="${PROJECT_DIR:-/root/heretek/heretek-openclaw}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ==============================================================================
# Backup Functions
# ==============================================================================

create_backup() {
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="${BACKUP_DIR}/langfuse-${timestamp}.sql"
    
    log_info "Creating Langfuse backup..."
    log_info "Backup directory: ${BACKUP_DIR}"
    
    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    
    # Create backup using docker compose exec
    cd "${PROJECT_DIR}"
    docker compose exec -T "${POSTGRES_CONTAINER}" \
        pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "${backup_file}"
    
    # Verify backup was created
    if [ -f "${backup_file}" ]; then
        local size=$(du -h "${backup_file}" | cut -f1)
        log_info "Backup created successfully: ${backup_file} (${size})"
        
        # Compress backup
        log_info "Compressing backup..."
        gzip "${backup_file}"
        log_info "Compressed backup: ${backup_file}.gz"
    else
        log_error "Backup failed - file not created"
        exit 1
    fi
}

# ==============================================================================
# Maintenance Functions
# ==============================================================================

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    local count=$(find "${BACKUP_DIR}" -name "langfuse-*.sql*" -mtime +${RETENTION_DAYS} | wc -l)
    
    if [ "${count}" -gt 0 ]; then
        find "${BACKUP_DIR}" -name "langfuse-*.sql*" -mtime +${RETENTION_DAYS} -delete
        log_info "Deleted ${count} old backup(s)"
    else
        log_info "No old backups to clean up"
    fi
}

list_backups() {
    log_info "Listing available backups..."
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        log_warn "Backup directory does not exist: ${BACKUP_DIR}"
        return
    fi
    
    echo ""
    echo "Available Backups:"
    echo "=================="
    ls -lh "${BACKUP_DIR}"/langfuse-*.sql* 2>/dev/null | awk '{print $9, $5}' | sort -r
    echo ""
    
    local total_size=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
    echo "Total backup size: ${total_size}"
}

# ==============================================================================
# Restore Functions
# ==============================================================================

restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file not found: ${backup_file}"
        exit 1
    fi
    
    log_warn "This will restore Langfuse from backup: ${backup_file}"
    log_warn "All current data will be overwritten!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "${confirm}" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Starting restore..."
    
    # Decompress if needed
    if [[ "${backup_file}" == *.gz ]]; then
        log_info "Decompressing backup..."
        gunzip -k "${backup_file}"
        backup_file="${backup_file%.gz}"
    fi
    
    # Restore database
    cd "${PROJECT_DIR}"
    docker compose exec -T "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" < "${backup_file}"
    
    log_info "Restore completed successfully"
    log_warn "Please restart Langfuse for changes to take effect:"
    echo "  docker compose restart langfuse"
}

# ==============================================================================
# Health Check
# ==============================================================================

health_check() {
    log_info "Running Langfuse health check..."
    
    cd "${PROJECT_DIR}"
    
    # Check PostgreSQL container
    if docker compose ps "${POSTGRES_CONTAINER}" | grep -q "Up"; then
        log_info "PostgreSQL container: Running"
    else
        log_error "PostgreSQL container: Not running"
        return 1
    fi
    
    # Check Langfuse container
    if docker compose ps heretek-langfuse | grep -q "Up"; then
        log_info "Langfuse container: Running"
    else
        log_error "Langfuse container: Not running"
        return 1
    fi
    
    # Test database connection
    if docker compose exec -T "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" -c "SELECT 1;" > /dev/null 2>&1; then
        log_info "Database connection: OK"
    else
        log_error "Database connection: Failed"
        return 1
    fi
    
    # Test Langfuse API
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        log_info "Langfuse API: OK"
    else
        log_warn "Langfuse API: Not responding (may still be starting)"
    fi
    
    log_info "Health check completed"
}

# ==============================================================================
# Main Script
# ==============================================================================

show_help() {
    cat << EOF
Langfuse Backup Script for Heretek OpenClaw

Usage: $0 [OPTIONS]

Options:
    (no args)     Create a new backup and clean up old backups
    --list        List all available backups
    --restore     Restore from a specific backup file
    --health      Run health check
    --help        Show this help message

Examples:
    $0                      # Create backup
    $0 --list               # List backups
    $0 --restore file.sql   # Restore from backup
    $0 --health             # Health check

Cron Job (daily at 2 AM):
    0 2 * * * ${PWD}/$0

Environment Variables:
    LANGFUSE_BACKUP_DIR           Backup directory (default: ~/langfuse/backups)
    LANGFUSE_BACKUP_RETENTION_DAYS  Retention period (default: 7 days)
    PROJECT_DIR                   Project directory (default: current dir)

EOF
}

# Parse arguments
case "${1:-}" in
    --list)
        list_backups
        ;;
    --restore)
        if [ -z "${2:-}" ]; then
            log_error "Please specify backup file to restore"
            exit 1
        fi
        restore_backup "$2"
        ;;
    --health)
        health_check
        ;;
    --help|-h)
        show_help
        ;;
    "")
        create_backup
        cleanup_old_backups
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
