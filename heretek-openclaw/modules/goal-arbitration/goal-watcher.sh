#!/bin/bash
# goal-watcher.sh - Continuous monitoring of goal arbitration

AGENT_ID="${AGENT_ID:-steward}"
STATE_DIR="${STATE_DIR:-$(dirname "$0")}"
WATCH_INTERVAL="${WATCH_INTERVAL:-60}"
RECONSIDER_INTERVAL="${RECONSIDER_INTERVAL:-900}"
MAX_ACTIVE_GOALS="${MAX_ACTIVE_GOALS:-3}"
PID_FILE="${STATE_DIR}/goal-watcher.pid"
LOG_FILE="${STATE_DIR}/goal-arbitration.log"

log() {
  echo "[$(date -Iseconds)] [goal-watcher] $*" | tee -a "$LOG_FILE"
}

check_daemon() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

start_daemon() {
  if check_daemon; then
    log "Goal watcher already running (PID: $PID)"
    return 1
  fi
  
  log "Starting goal watcher daemon..."
  
  while true; do
    # Run reconsideration cycle
    node "$STATE_DIR/goal-arbitrator.js" reconsider "$AGENT_ID" "$STATE_DIR" 2>/dev/null
    
    # Check pending goals
    STATUS=$(node "$STATE_DIR/goal-arbitrator.js" status "$AGENT_ID" "$STATE_DIR" 2>/dev/null || echo '{}')
    PENDING=$(echo "$STATUS" | jq -r '.pending // 0')
    ACTIVE=$(echo "$STATUS" | jq -r '.active // 0')
    
    if [ "$PENDING" -gt 0 ]; then
      log "Evaluating $PENDING pending goals..."
      node "$STATE_DIR/goal-arbitrator.js" activate "$AGENT_ID" "$STATE_DIR" 2>/dev/null
    fi
    
    if [ "$ACTIVE" -lt "$MAX_ACTIVE_GOALS" ]; then
      log "Activating additional goals (current: $ACTIVE, max: $MAX_ACTIVE_GOALS)"
      node "$STATE_DIR/goal-arbitrator.js" activate "$AGENT_ID" "$STATE_DIR" 2>/dev/null
    fi
    
    # Check waiting goals for timeout
    WAITING=$(node "$STATE_DIR/goal-arbitrator.js" list waiting "$AGENT_ID" "$STATE_DIR" 2>/dev/null || echo '[]')
    WAITING_COUNT=$(echo "$WAITING" | jq 'length // 0')
    
    if [ "$WAITING_COUNT" -gt 0 ]; then
      log "$WAITING_COUNT goals waiting in queue"
    fi
    
    log "Watcher cycle complete - sleeping $WATCH_INTERVAL seconds"
    sleep "$WATCH_INTERVAL"
  done &
  
  echo $! > "$PID_FILE"
  log "Goal watcher started (PID: $(cat $PID_FILE))"
}

stop_daemon() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      kill "$PID"
      log "Goal watcher stopped"
    fi
    rm -f "$PID_FILE"
  else
    log "Goal watcher not running"
  fi
}

status_daemon() {
  if check_daemon; then
    PID=$(cat "$PID_FILE")
    log "Goal watcher running (PID: $PID)"
    
    STATUS=$(node "$STATE_DIR/goal-arbitrator.js" status "$AGENT_ID" "$STATE_DIR" 2>/dev/null || echo '{}')
    log "Goal status: $STATUS"
  else
    log "Goal watcher not running"
  fi
}

case "${1:-status}" in
  start)
    start_daemon
    ;;
  stop)
    stop_daemon
    ;;
  status)
    status_daemon
    ;;
  restart)
    stop_daemon
    sleep 2
    start_daemon
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    ;;
esac