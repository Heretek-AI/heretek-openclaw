#!/bin/bash
# ==============================================================================
# Heretek OpenClaw — Cron Schedule Installer
# ==============================================================================
# Installs automated backup and health check schedules into system crontab
#
# Usage:
#   ./cron-schedule.sh install    # Install cron schedules
#   ./cron-schedule.sh remove     # Remove cron schedules
#   ./cron-schedule.sh list       # Show current schedules
#   ./cron-schedule.sh test       # Test backup scripts
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/../../scripts/production-backup.sh"
HEALTH_SCRIPT="$SCRIPT_DIR/../../scripts/health-check.sh"
LOG_DIR="/root/.openclaw/logs"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

ensure_log_dir() {
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
}

install_cron() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw — Cron Schedule Installer"
    echo "=============================================="
    echo ""
    
    # Ensure log directory exists
    ensure_log_dir
    log_info "Log directory created: $LOG_DIR"
    
    # Get current crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")
    
    # Check if already installed
    if echo "$current_crontab" | grep -q "Heretek OpenClaw"; then
        log_warn "Heretek OpenClaw cron schedules already installed"
        echo ""
        echo "Current schedules:"
        echo "$current_crontab" | grep "Heretek OpenClaw" -A 1
        echo ""
        read -p "Do you want to reinstall? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        
        # Remove existing entries
        echo "$current_crontab" | grep -v "Heretek OpenClaw" | grep -v "production-backup\|health-check" | crontab -
        log_info "Removed existing schedules"
    fi
    
    # Create new cron entries
    new_crontab="$current_crontab"
    
    # Add backup schedules
    new_crontab="$new_crontab
# ==============================================================================
# Heretek OpenClaw — Automated Schedules
# ==============================================================================

# Database backup - Daily at 2 AM
0 2 * * * $BACKUP_SCRIPT --database >> $LOG_DIR/backup-cron.log 2>&1

# Redis backup - Daily at 3 AM
0 3 * * * $BACKUP_SCRIPT --redis >> $LOG_DIR/backup-cron.log 2>&1

# Workspace backup - Daily at 4 AM
0 4 * * * $BACKUP_SCRIPT --workspace >> $LOG_DIR/backup-cron.log 2>&1

# Agent state backup - Every 6 hours
0 */6 * * * $BACKUP_SCRIPT --agent-state >> $LOG_DIR/backup-cron.log 2>&1

# Full system backup - Weekly on Sunday at 5 AM
0 5 * * 0 $BACKUP_SCRIPT --full >> $LOG_DIR/backup-cron.log 2>&1

# Backup cleanup - Daily at 6 AM
0 6 * * * $BACKUP_SCRIPT --cleanup >> $LOG_DIR/backup-cron.log 2>&1

# Health check - Every 5 minutes
*/5 * * * * $HEALTH_SCRIPT >> $LOG_DIR/health-cron.log 2>&1
# ==============================================================================
"
    
    # Install new crontab
    echo "$new_crontab" | crontab -
    
    log_info "Cron schedules installed successfully!"
    echo ""
    echo "Installed schedules:"
    echo "  - Database backup: Daily at 2:00 AM"
    echo "  - Redis backup: Daily at 3:00 AM"
    echo "  - Workspace backup: Daily at 4:00 AM"
    echo "  - Agent state backup: Every 6 hours"
    echo "  - Full system backup: Weekly (Sunday 5:00 AM)"
    echo "  - Backup cleanup: Daily at 6:00 AM"
    echo "  - Health check: Every 5 minutes"
    echo ""
    echo "View logs:"
    echo "  tail -f $LOG_DIR/backup-cron.log"
    echo "  tail -f $LOG_DIR/health-cron.log"
    echo ""
    
    # Verify installation
    echo "Verifying installation..."
    crontab -l | grep "Heretek OpenClaw" | head -3
    echo "  ..."
    echo ""
    log_info "Installation complete!"
}

remove_cron() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw — Cron Schedule Remover"
    echo "=============================================="
    echo ""
    
    # Get current crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")
    
    # Check if installed
    if ! echo "$current_crontab" | grep -q "Heretek OpenClaw"; then
        log_warn "No Heretek OpenClaw cron schedules found"
        exit 0
    fi
    
    # Remove Heretek entries
    echo "$current_crontab" | grep -v "Heretek OpenClaw" | grep -v "production-backup\|health-check" | crontab -
    
    log_info "Cron schedules removed successfully!"
    echo ""
    echo "Remaining schedules:"
    crontab -l | head -10
    echo ""
}

list_cron() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw — Current Cron Schedules"
    echo "=============================================="
    echo ""
    
    current_crontab=$(crontab -l 2>/dev/null || echo "No crontab installed")
    
    echo "Current crontab:"
    echo "$current_crontab"
    echo ""
    
    echo "Heretek OpenClaw schedules:"
    echo "$current_crontab" | grep -E "Heretek|production-backup|health-check" || echo "  None found"
    echo ""
}

test_scripts() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw — Script Test"
    echo "=============================================="
    echo ""
    
    ensure_log_dir
    
    # Test backup script
    log_info "Testing backup script..."
    if [ -x "$BACKUP_SCRIPT" ]; then
        echo "  Backup script: Executable ✓"
        "$BACKUP_SCRIPT" --help > /dev/null 2>&1 && echo "  Backup script: Help works ✓" || echo "  Backup script: Help failed ✗"
    else
        log_error "Backup script not found or not executable: $BACKUP_SCRIPT"
    fi
    
    # Test health script
    log_info "Testing health check script..."
    if [ -x "$HEALTH_SCRIPT" ]; then
        echo "  Health script: Executable ✓"
        "$HEALTH_SCRIPT" --help > /dev/null 2>&1 && echo "  Health script: Help works ✓" || echo "  Health script: Help failed ✗"
    else
        log_error "Health script not found or not executable: $HEALTH_SCRIPT"
    fi
    
    echo ""
    log_info "Test complete!"
}

# Main
case "${1:-}" in
    install)
        install_cron
        ;;
    remove)
        remove_cron
        ;;
    list)
        list_cron
        ;;
    test)
        test_scripts
        ;;
    *)
        echo "Usage: $0 {install|remove|list|test}"
        echo ""
        echo "Commands:"
        echo "  install  - Install automated backup and health check schedules"
        echo "  remove   - Remove Heretek OpenClaw cron schedules"
        echo "  list     - Show current cron schedules"
        echo "  test     - Test backup and health check scripts"
        ;;
esac
