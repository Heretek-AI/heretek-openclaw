#!/bin/bash
#===============================================================================
# goal-watcher.sh - Continuous monitoring script for goal reconsideration
# 
# Enables continuous goal arbitration monitoring:
# - Periodically runs reconsideration cycles
# - Evaluates pending goals
# - Activates top goals when needed
# - Monitors active goal health
#
# Usage:
#   ./goal-watcher.sh [start|stop|status|once]
#
# Environment Variables:
#   AGENT_ID          - Agent identifier (default: steward)
#   STATE_DIR         - State directory (default: ./state)
#   WATCH_INTERVAL    - Check interval in seconds (default: 60)
#   RECONSIDER_INTERVAL - Reconsideration interval in seconds (default: 900 = 15 min)
#   MAX_ACTIVE_GOALS - Maximum active goals (default: 3)
#   LOG_FILE          - Log file path (optional)
#
#===============================================================================

set -euo pipefail

# Configuration defaults
AGENT_ID="${AGENT_ID:-steward}"
STATE_DIR="${STATE_DIR:-./state}"
WATCH_INTERVAL="${WATCH_INTERVAL:-60}"
RECONSIDER_INTERVAL="${RECONSIDER_INTERVAL:-900}"
MAX_ACTIVE_GOALS="${MAX_ACTIVE_GOALS:-3}"
LOG_FILE="${LOG_FILE:-}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARBITRATOR="${SCRIPT_DIR}/goal-arbitrator.js"

# PID file for daemon mode
PID_FILE="/tmp/goal-watcher-${AGENT_ID}.pid"

#===============================================================================
# LOGGING
#===============================================================================

log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp="$(date -Iseconds)"
  
  if [[ -n "$LOG_FILE" ]]; then
    echo "[${timestamp}] [${level}] [goal-watcher:${AGENT_ID}] ${message}" >> "$LOG_FILE"
  fi
  
  case "$level" in
    ERROR) echo "[${timestamp}] [${level}] [goal-watcher:${AGENT_ID}] ${message}" >&2 ;;
    INFO)  echo "[${timestamp}] [${level}] [goal-watcher:${AGENT_ID}] ${message}" ;;
    DEBUG) [[ "${DEBUG:-0}" == "1" ]] && echo "[${timestamp}] [${level}] [goal-watcher:${AGENT_ID}] ${message}" || true ;;
  esac
}

#===============================================================================
# CHECK DEPENDENCIES
#===============================================================================

check_dependencies() {
  # Check Node.js is available
  if ! command -v node &> /dev/null; then
    log ERROR "Node.js not found - required for goal-arbitrator.js"
    exit 1
  fi
  
  # Check goal-arbitrator.js exists
  if [[ ! -f "$ARBITRATOR" ]]; then
    log ERROR "goal-arbitrator.js not found at: ${ARBITRATOR}"
    exit 1
  fi
  
  # Check state directory exists or can be created
  if [[ ! -d "$STATE_DIR" ]]; then
    if mkdir -p "$STATE_DIR" 2>/dev/null; then
      log INFO "Created state directory: ${STATE_DIR}"
    else
      log ERROR "Cannot create state directory: ${STATE_DIR}"
      exit 1
    fi
  fi
  
  log DEBUG "Dependencies checked"
}

#===============================================================================
# STATUS CHECKS
#===============================================================================

get_status() {
  local status_json
  status_json=$(
    AGENT_ID="$AGENT_ID" STATE_DIR="$STATE_DIR" node "$ARBITRATOR" status 2>/dev/null
  ) || echo '{}'
  echo "$status_json"
}

get_pool_count() {
  echo "$(get_status)" | grep -o '"pool":[0-9]*' | grep -o '[0-9]*' || echo "0"
}

get_active_count() {
  echo "$(get_status)" | grep -o '"active":[0-9]*' | grep -o '[0-9]*' || echo "0"
}

get_waiting_count() {
  echo "$(get_status)" | grep -o '"waiting":[0-9]*' | grep -o '[0-9]*' || echo "0"
}

get_pending_count() {
  echo "$(get_status)" | grep -o '"pending":[0-9]*' | grep -o '[0-9]*' || echo "0"
}

#===============================================================================
# ARBITRATION OPERATIONS
#===============================================================================

run_reconsideration() {
  log INFO "Running reconsideration cycle"
  
  local result
  result=$(
    AGENT_ID="$AGENT_ID" STATE_DIR="$STATE_DIR" node "$ARBITRATOR" reconsider 2>&1
  ) || {
    log ERROR "Reconsideration failed: ${result}"
    return 1
  }
  
  log DEBUG "Reconsideration result: ${result}"
  echo "$result"
}

evaluate_pending() {
  local pending
  pending=$(get_pending_count)
  
  if [[ "$pending" -gt 0 ]]; then
    log INFO "Evaluating ${pending} pending goals"
    
    # Get pending goals and evaluate each
    local goals_json
    goals_json=$(
      AGENT_ID="$AGENT_ID" STATE_DIR="$STATE_DIR" node "$ARBITRATOR" list pending 2>/dev/null
    ) || echo '[]'
    
    # Extract goal IDs (simple approach)
    local goal_ids
    goal_ids=$(echo "$goals_json" | grep -o '"id":"[^"]*"' | head -5 | cut -d'"' -f4) || true
    
    for goal_id in $goal_ids; do
      if [[ -n "$goal_id" ]]; then
        log DEBUG "Evaluating goal: ${goal_id}"
        AGENT_ID="$AGENT_ID" STATE_DIR="$STATE_DIR" node "$ARBITRATOR" evaluate "$goal_id" 2>/dev/null || true
      fi
    done
  fi
}

activate_goals() {
  local active
  active=$(get_active_count)
  
  if [[ "$active" -lt "$MAX_ACTIVE_GOALS" ]]; then
    log INFO "Activating additional goals (current: ${active}, max: ${MAX_ACTIVE_GOALS})"
    
    local result
    result=$(
      AGENT_ID="$AGENT_ID" STATE_DIR="$STATE_DIR" node "$ARBITRATOR" activate 2>&1
    ) || {
      log ERROR "Activation failed: ${result}"
      return 1
    }
    
    log DEBUG "Activation result: ${result}"
  fi
}

check_timed_out_goals() {
  # Check for goals that have been waiting too long
  local waiting
  waiting=$(get_waiting_count)
  
  if [[ "$waiting" -gt 0 ]]; then
    log DEBUG "Checking ${waiting} waiting goals for timeout"
    
    # Get waiting goals
    local goals_json
    goals_json=$(
      AGENT_ID="$AGENT_ID" STATE_DIR="$STATE_DIR" node "$ARBITRATOR" list waiting 2>/dev/null
    ) || echo '[]'
    
    # Log waiting goals count (actual timeout handling done by arbitrator)
    if [[ "$waiting" -ge 3 ]]; then
      log WARN "Many goals waiting (${waiting}) - may need prioritization"
    fi
  fi
}

#===============================================================================
# MAIN LOOP
#===============================================================================

run_loop() {
  log INFO "Starting goal watcher loop (interval: ${WATCH_INTERVAL}s, reconsider: ${RECONSIDER_INTERVAL}s)"
  
  local last_reconsideration=0
  local loop_count=0
  
  while true; do
    loop_count=$((loop_count + 1))
    
    # Check if we should run reconsideration
    local now
    now=$(date +%s)
    local time_since_reconsider=$((now - last_reconsideration))
    
    log DEBUG "Loop ${loop_count}: time since last reconsider: ${time_since_reconsider}s"
    
    # Run reconsideration if enough time has passed
    if [[ $time_since_reconsider -ge $RECONSIDER_INTERVAL ]]; then
      run_reconsideration
      last_reconsideration=$(date +%s)
    fi
    
    # Evaluate any pending goals
    evaluate_pending
    
    # Activate goals if needed
    activate_goals
    
    # Check for timed out goals
    check_timed_out_goals
    
    # Get current status for logging
    local pool active waiting pending
    pool=$(get_pool_count)
    active=$(get_active_count)
    waiting=$(get_waiting_count)
    pending=$(get_pending_count)
    
    log INFO "Status - pool: ${pool}, active: ${active}, waiting: ${waiting}, pending: ${pending}"
    
    # Sleep until next check
    log DEBUG "Sleeping ${WATCH_INTERVAL} seconds"
    sleep "$WATCH_INTERVAL"
  done
}

#===============================================================================
# DAEMON CONTROL
#===============================================================================

start_daemon() {
  if [[ -f "$PID_FILE" ]]; then
    local old_pid
    old_pid=$(cat "$PID_FILE")
    
    if kill -0 "$old_pid" 2>/dev/null; then
      log ERROR "Goal watcher already running with PID: ${old_pid}"
      exit 1
    else
      log INFO "Cleaning up stale PID file"
      rm -f "$PID_FILE"
    fi
  fi
  
  log INFO "Starting goal watcher daemon"
  
  # Start in background
  (
    run_loop >> "${LOG_FILE:-/dev/null}" 2>&1
  ) &
  
  local new_pid=$!
  echo "$new_pid" > "$PID_FILE"
  
  log INFO "Goal watcher started with PID: ${new_pid}"
  echo "$new_pid"
}

stop_daemon() {
  if [[ ! -f "$PID_FILE" ]]; then
    log ERROR "PID file not found - goal watcher may not be running"
    return 1
  fi
  
  local pid
  pid=$(cat "$PID_FILE")
  
  if ! kill -0 "$pid" 2>/dev/null; then
    log ERROR "Process ${pid} not running"
    rm -f "$PID_FILE"
    return 1
  fi
  
  log INFO "Stopping goal watcher (PID: ${pid})"
  kill "$pid"
  
  # Wait for process to stop
  local attempts=0
  while kill -0 "$pid" 2>/dev/null && [[ $attempts -lt 30 ]]; do
    sleep 1
    attempts=$((attempts + 1))
  done
  
  if kill -0 "$pid" 2>/dev/null; then
    log ERROR "Failed to stop goal watcher gracefully, forcing"
    kill -9 "$pid" 2>/dev/null || true
  fi
  
  rm -f "$PID_FILE"
  log INFO "Goal watcher stopped"
}

show_status() {
  local status
  status=$(get_status)
  
  if [[ -z "$status" || "$status" == '{}' ]]; then
    echo "Goal watcher: not initialized or no goals"
    return
  fi
  
  echo "Goal Arbitration Status:"
  echo "$status" | node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    console.log('  Pool:', data.pool || 0, 'goals');
    console.log('  Active:', data.active || 0, 'goals');
    console.log('  Waiting:', data.waiting || 0, 'goals');
    console.log('  Pending:', data.pending || 0, 'goals');
    console.log('  History:', data.history || 0, 'goals');
    if (data.lastReconsideration) {
      console.log('  Last Reconsider:', new Date(data.lastReconsideration).toISOString());
    }
    if (data.metrics) {
      console.log('  Metrics:');
      console.log('    Registered:', data.metrics.goals_registered_total || 0);
      console.log('    Completed:', data.metrics.goals_completed_total || 0);
      console.log('    Failed:', data.metrics.goals_failed_total || 0);
      if (data.metrics.avg_completion_time_ms) {
        console.log('    Avg Time:', Math.round(data.metrics.avg_completion_time_ms/1000/60), 'minutes');
      }
    }
  "
}

#===============================================================================
# MAIN
#===============================================================================

main() {
  local command="${1:-start}"
  
  # Check dependencies first
  check_dependencies
  
  case "$command" in
    start)
      start_daemon
      ;;
    stop)
      stop_daemon
      ;;
    status)
      show_status
      ;;
    once)
      log INFO "Running single evaluation cycle"
      evaluate_pending
      activate_goals
      check_timed_out_goals
      show_status
      ;;
    help|--help|-h)
      echo "Goal Watcher - Continuous goal arbitration monitoring"
      echo ""
      echo "Usage:"
      echo "  $0 [command]"
      echo ""
      echo "Commands:"
      echo "  start   - Start the watcher daemon"
      echo "  stop    - Stop the watcher daemon"
      echo "  status  - Show current status"
      echo "  once    - Run a single evaluation cycle"
      echo "  help    - Show this help"
      echo ""
      echo "Environment Variables:"
      echo "  AGENT_ID=${AGENT_ID}"
      echo "  STATE_DIR=${STATE_DIR}"
      echo "  WATCH_INTERVAL=${WATCH_INTERVAL}"
      echo "  RECONSIDER_INTERVAL=${RECONSIDER_INTERVAL}"
      echo "  MAX_ACTIVE_GOALS=${MAX_ACTIVE_GOALS}"
      echo "  LOG_FILE=${LOG_FILE:-<none>}"
      ;;
    *)
      log ERROR "Unknown command: ${command}"
      echo "Run '$0 help' for usage"
      exit 1
      ;;
  esac
}

# Run main if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi