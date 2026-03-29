#!/bin/bash
# early-warning-monitor.sh - Continuous monitoring for predictive alerts

AGENT_ID="${AGENT_ID:-steward}"
STATE_DIR="${STATE_DIR:-$(dirname "$0")}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"
PID_FILE="${STATE_DIR}/early-warning.pid"
LOG_FILE="${STATE_DIR}/early-warning.log"

log() {
  echo "[$(date -Iseconds)] [early-warning] $*" | tee -a "$LOG_FILE"
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
    log "Early warning monitor already running"
    return 1
  fi
  
  log "Starting early warning monitor daemon..."
  
  # Initial analysis
  node "$STATE_DIR/predictor.js" analyze "$AGENT_ID" "$STATE_DIR" 2>/dev/null
  
  while true; do
    # Check for alerts
    ALERTS=$(node "$STATE_DIR/predictor.js" alerts "$AGENT_ID" "$STATE_DIR" 2>/dev/null || echo '[]')
    ALERT_COUNT=$(echo "$ALERTS" | jq 'length // 0')
    
    if [ "$ALERT_COUNT" -gt 0 ]; then
      HIGH_COUNT=$(echo "$ALERTS" | jq '[.[] | select(.severity == "high")] | length')
      
      if [ "$HIGH_COUNT" -gt 0 ]; then
        log "HIGH ALERT: $HIGH_COUNT critical predictions detected"
        # Log alert details
        echo "$ALERTS" | jq '.[] | select(.severity == "high")' 2>/dev/null | while read alert; do
          log "ALERT: $(echo "$alert" | jq -r '.eventType'): $(echo "$alert" | jq -r '.reasoning') (prob: $(echo "$alert" | jq -r '.probability'))"
        done
      else
        log "Medium alert: $ALERT_COUNT predictions above threshold"
      fi
    fi
    
    # Periodic scenario generation (every hour)
    CURRENT_HOUR=$(date +%H)
    if [ "$CURRENT_HOUR" = "00" ]; then
      log "Hourly scenario generation..."
      node "$STATE_DIR/predictor.js" scenarios "$AGENT_ID" "$STATE_DIR" 2>/dev/null
    fi
    
    # Periodic pattern reanalysis (every 6 hours)
    LAST_ANALYSIS_FILE="$STATE_DIR/last-pattern-analysis.txt"
    if [ -f "$LAST_ANALYSIS_FILE" ]; then
      LAST_ANALYSIS=$(cat "$LAST_ANALYSIS_FILE")
      NOW=$(date +%s)
      DIFF=$((NOW - LAST_ANALYSIS))
      
      if [ "$DIFF" -gt 21600 ]; then
        log "Reanalyzing patterns (6+ hours since last analysis)"
        node "$STATE_DIR/predictor.js" analyze "$AGENT_ID" "$STATE_DIR" 2>/dev/null
        date +%s > "$LAST_ANALYSIS_FILE"
      fi
    else
      date +%s > "$LAST_ANALYSIS_FILE"
    fi
    
    log "Early warning check complete - sleeping $INTERVAL_SECONDS seconds"
    sleep "$INTERVAL_SECONDS"
  done &
  
  echo $! > "$PID_FILE"
  log "Early warning monitor started (PID: $(cat $PID_FILE))"
}

stop_daemon() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      kill "$PID"
      log "Early warning monitor stopped"
    fi
    rm -f "$PID_FILE"
  else
    log "Early warning monitor not running"
  fi
}

status_daemon() {
  if check_daemon; then
    PID=$(cat "$PID_FILE")
    log "Early warning monitor running (PID: $PID)"
    
    DASHBOARD=$(node "$STATE_DIR/predictor.js" dashboard "$AGENT_ID" "$STATE_DIR" 2>/dev/null || echo '{}')
    log "Predictor dashboard: $DASHBOARD"
  else
    log "Early warning monitor not running"
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