#!/bin/bash
# =============================================================================
# early-warning-monitor.sh - Continuous Monitoring for Predictive Alerts
# =============================================================================
# 
# This script runs continuously to monitor predictions and generate alerts.
# It analyzes patterns, checks for high-probability events, and can trigger
# automated responses when thresholds are exceeded.
#
# Usage:
#   ./early-warning-monitor.sh          # Run with defaults
#   ./early-warning-monitor.sh start    # Start monitoring in background
#   ./early-warning-monitor.sh stop     # Stop running monitor
#   ./early-warning-monitor.sh status   # Check monitor status
#   ./early-warning-monitor.sh once     # Run single analysis cycle
#
# Environment Variables:
#   AGENT_ID              - Agent identifier (default: steward)
#   STATE_DIR             - State directory (default: ./state)
#   INTERVAL_SECONDS      - Check interval in seconds (default: 300)
#   LOG_FILE              - Log file path (default: ./logs/early-warning.log)
#   ALERT_THRESHOLD       - Probability threshold for alerts (default: 0.7)
#   ENABLE_NOTIFICATIONS  - Enable system notifications (default: false)
#
# =============================================================================

set -euo pipefail

# Configuration
AGENT_ID="${AGENT_ID:-steward}"
STATE_DIR="${STATE_DIR:-./state}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"
LOG_DIR="${LOG_DIR:-./logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/early-warning.log}"
ALERT_THRESHOLD="${ALERT_THRESHOLD:-0.7}"
ENABLE_NOTIFICATIONS="${ENABLE_NOTIFICATIONS:-false}"
PREDICTOR_SCRIPT="${PREDICTOR_SCRIPT:-./predictor.js}"
PID_FILE="${PID_FILE:-/tmp/early-warning-monitor.pid}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date -Iseconds)
    
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Log to stderr with colors
    case "$level" in
        ERROR)
            echo -e "${RED}[$timestamp] [EARLY-WARNING] ERROR: $message${NC}" >&2
            ;;
        WARN|WARNING)
            echo -e "${YELLOW}[$timestamp] [EARLY-WARNING] WARN: $message${NC}" >&2
            ;;
        INFO)
            echo "[$timestamp] [EARLY-WARNING] INFO: $message" >&2
            ;;
        DEBUG)
            if [[ "${DEBUG:-false}" == "true" ]]; then
                echo -e "${BLUE}[$timestamp] [EARLY-WARNING] DEBUG: $message${NC}" >&2
            fi
            ;;
    esac
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

check_dependencies() {
    local missing=()
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi
    
    # Check for predictor script
    if [[ ! -f "$PREDICTOR_SCRIPT" ]]; then
        # Try relative to script location
        local script_dir
        script_dir=$(dirname "$0")
        if [[ -f "$script_dir/predictor.js" ]]; then
            PREDICTOR_SCRIPT="$script_dir/predictor.js"
        else
            missing+=("predictor.js")
        fi
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log ERROR "Missing dependencies: ${missing[*]}"
        return 1
    fi
    
    return 0
}

get_state_dir() {
    local state_dir="$STATE_DIR"
    
    # Make state_dir absolute if relative
    if [[ ! "$state_dir" = /* ]]; then
        # Resolve relative to the script directory
        local script_dir
        script_dir=$(dirname "$0")
        state_dir=$(cd "$script_dir" && pwd)/$state_dir
    fi
    
    echo "$state_dir"
}

# =============================================================================
# PREDICTION FUNCTIONS
# =============================================================================

run_analysis() {
    local state_dir
    state_dir=$(get_state_dir)
    
    log INFO "Running pattern analysis..."
    
    local result
    if result=$(AGENT_ID="$AGENT_ID" STATE_DIR="$state_dir" node "$PREDICTOR_SCRIPT" analyze 2>&1); then
        log INFO "Pattern analysis complete"
        echo "$result"
        return 0
    else
        log WARN "Pattern analysis returned non-zero: $result"
        return 1
    fi
}

check_alerts() {
    local state_dir
    state_dir=$(get_state_dir)
    
    log DEBUG "Checking for alerts..."
    
    local result
    result=$(AGENT_ID="$AGENT_ID" STATE_DIR="$state_dir" node "$PREDICTOR_SCRIPT" alerts 2>/dev/null)
    
    echo "$result"
}

generate_scenarios() {
    local state_dir
    state_dir=$(get_state_dir)
    
    log INFO "Generating scenarios..."
    
    local result
    result=$(AGENT_ID="$AGENT_ID" STATE_DIR="$state_dir" node "$PREDICTOR_SCRIPT" scenarios 2>/dev/null)
    
    echo "$result"
}

get_dashboard() {
    local state_dir
    state_dir=$(get_state_dir)
    
    local result
    result=$(AGENT_ID="$AGENT_ID" STATE_DIR="$state_dir" node "$PREDICTOR_SCRIPT" dashboard 2>/dev/null)
    
    echo "$result"
}

# =============================================================================
# ALERT PROCESSING
# =============================================================================

process_alerts() {
    local alerts_json="$1"
    
    # Count alerts by severity
    local high_count
    local medium_count
    
    high_count=$(echo "$alerts_json" | grep -o '"severity":"high"' | wc -l || echo "0")
    medium_count=$(echo "$alerts_json" | grep -o '"severity":"medium"' | wc -l || echo "0")
    
    # Parse high severity alerts
    if [[ "$high_count" -gt 0 ]]; then
        log ERROR "HIGH ALERT: $high_count critical predictions detected!"
        
        # Extract event types
        local event_types
        event_types=$(echo "$alerts_json" | grep -o '"eventType":"[^"]*"' | head -5 || true)
        
        if [[ -n "$event_types" ]]; then
            log ERROR "Critical event types: $event_types"
        fi
        
        # Trigger notification if enabled
        if [[ "$ENABLE_NOTIFICATIONS" == "true" ]]; then
            send_notification "HIGH ALERT: $high_count critical predictions" "$event_types"
        fi
        
        return 2
    fi
    
    if [[ "$medium_count" -gt 0 ]]; then
        log WARN "MEDIUM ALERT: $medium_count moderate predictions detected"
        return 1
    fi
    
    log INFO "No alerts - system appears healthy"
    return 0
}

send_notification() {
    local title="$1"
    local body="$2"
    
    # Try different notification methods
    if command -v notify-send &> /dev/null; then
        notify-send "$title" "$body" 2>/dev/null || true
    elif command -v osascript &> /dev/null; then
        osascript -e "display notification \"$body\" with title \"$title\"" 2>/dev/null || true
    elif command -v powershell &> /dev/null; then
        # Windows notification
        powershell -Command "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null" 2>/dev/null || true
    fi
}

# =============================================================================
# MONITORING LOOP
# =============================================================================

run_monitoring_loop() {
    log INFO "Starting early warning monitoring loop"
    log INFO "Agent: $AGENT_ID"
    log INFO "State directory: $(get_state_dir)"
    log INFO "Check interval: ${INTERVAL_SECONDS}s"
    log INFO "Alert threshold: $ALERT_THRESHOLD"
    
    local counter=0
    local last_scenario_gen=0
    
    # Initial analysis
    run_analysis
    
    while true; do
        ((counter++))
        
        log DEBUG "Starting check cycle $counter"
        
        # Check for alerts
        local alerts
        alerts=$(check_alerts)
        
        if [[ -n "$alerts" ]] && [[ "$alerts" != "[]" ]]; then
            process_alerts "$alerts"
        else
            log DEBUG "No alerts found in this cycle"
        fi
        
        # Generate scenarios hourly (every ~12 cycles at 300s interval)
        local current_minute
        current_minute=$(date +%M)
        
        if [[ "$current_minute" == "00" ]] || [[ "$current_minute" == "30" ]]; then
            if [[ $((counter - last_scenario_gen)) -ge 2 ]]; then
                log INFO "Hourly scenario generation triggered"
                generate_scenarios
                last_scenario_gen=$counter
            fi
        fi
        
        # Log periodic status
        if [[ $((counter % 12)) -eq 0 ]]; then
            log INFO "Periodic status check (cycle $counter)"
            local dashboard
            dashboard=$(get_dashboard)
            if [[ -n "$dashboard" ]]; then
                local status
                status=$(echo "$dashboard" | grep -o '"systemStatus":"[^"]*"' || echo '"systemStatus":"unknown"')
                log INFO "System status: $status"
            fi
        fi
        
        log DEBUG "Check cycle $counter complete - sleeping ${INTERVAL_SECONDS}s"
        sleep "$INTERVAL_SECONDS"
    done
}

# =============================================================================
# DAEMON FUNCTIONS
# =============================================================================

start_daemon() {
    # Check if already running
    if [[ -f "$PID_FILE" ]]; then
        local old_pid
        old_pid=$(cat "$PID_FILE")
        
        if kill -0 "$old_pid" 2>/dev/null; then
            log ERROR "Monitor already running with PID $old_pid"
            exit 1
        else
            log WARN "Stale PID file found, cleaning up"
            rm -f "$PID_FILE"
        fi
    fi
    
    # Start the monitor in background
    log INFO "Starting early warning monitor..."
    
    nohup "$0" run >> "$LOG_FILE" 2>&1 &
    
    local new_pid=$!
    echo "$new_pid" > "$PID_FILE"
    
    sleep 1
    
    if kill -0 "$new_pid" 2>/dev/null; then
        log INFO "Monitor started with PID $new_pid"
        echo "Early warning monitor started (PID: $new_pid)"
    else
        log ERROR "Failed to start monitor"
        exit 1
    fi
}

stop_daemon() {
    if [[ ! -f "$PID_FILE" ]]; then
        log ERROR "No PID file found - monitor not running?"
        exit 1
    fi
    
    local pid
    pid=$(cat "$PID_FILE")
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log WARN "Process $pid not running"
        rm -f "$PID_FILE"
        exit 0
    fi
    
    log INFO "Stopping monitor (PID: $pid)..."
    kill "$pid"
    
    # Wait for process to exit
    local count=0
    while kill -0 "$pid" 2>/dev/null && [[ $count -lt 30 ]]; do
        sleep 1
        ((count++))
    done
    
    if kill -0 "$pid" 2>/dev/null; then
        log ERROR "Failed to stop monitor gracefully, forcing..."
        kill -9 "$pid" 2>/dev/null || true
    fi
    
    rm -f "$PID_FILE"
    log INFO "Monitor stopped"
    echo "Early warning monitor stopped"
}

check_status() {
    if [[ ! -f "$PID_FILE" ]]; then
        echo "Status: Not running"
        exit 0
    fi
    
    local pid
    pid=$(cat "$PID_FILE")
    
    if kill -0 "$pid" 2>/dev/null; then
        echo "Status: Running (PID: $pid)"
        
        # Show dashboard
        local dashboard
        dashboard=$(get_dashboard)
        if [[ -n "$dashboard" ]]; then
            echo ""
            echo "Dashboard:"
            echo "$dashboard" | head -20
        fi
    else
        echo "Status: Not running (stale PID: $pid)"
        rm -f "$PID_FILE"
    fi
}

# =============================================================================
# SINGLE RUN MODE
# =============================================================================

run_once() {
    log INFO "Running single analysis cycle..."
    
    # Run analysis
    run_analysis
    
    # Check alerts
    local alerts
    alerts=$(check_alerts)
    
    if [[ -n "$alerts" ]] && [[ "$alerts" != "[]" ]]; then
        echo ""
        echo "=== Alerts ==="
        echo "$alerts"
        process_alerts "$alerts"
    fi
    
    # Generate scenarios
    echo ""
    echo "=== Scenarios ==="
    generate_scenarios
    
    # Show dashboard
    echo ""
    echo "=== Dashboard ==="
    get_dashboard
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local command="${1:-run}"
    
    # Check dependencies first
    check_dependencies || exit 1
    
    case "$command" in
        start)
            start_daemon
            ;;
        stop)
            stop_daemon
            ;;
        status)
            check_status
            ;;
        once|run)
            if [[ "$command" == "run" ]] && [[ "${2:-run}" != "run" ]]; then
                # If called as daemon, run the loop
                run_monitoring_loop
            else
                run_once
            fi
            ;;
        help|--help|-h)
            echo "Early Warning Monitor"
            echo "===================="
            echo ""
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  start   - Start monitoring in background"
            echo "  stop    - Stop running monitor"
            echo "  status  - Check monitor status"
            echo "  once    - Run single analysis cycle"
            echo "  run     - Run monitoring loop (internal)"
            echo "  help    - Show this help"
            echo ""
            echo "Environment Variables:"
            echo "  AGENT_ID              - Agent identifier (default: steward)"
            echo "  STATE_DIR             - State directory (default: ./state)"
            echo "  INTERVAL_SECONDS      - Check interval (default: 300)"
            echo "  LOG_FILE              - Log file path"
            echo "  ALERT_THRESHOLD       - Alert threshold (default: 0.7)"
            echo "  ENABLE_NOTIFICATIONS - Enable notifications (default: false)"
            ;;
        *)
            log ERROR "Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
