#!/bin/bash
# thought-loop.sh - Continuous Thought Loop for heretek-openclaw
# Enables continuous autonomous thinking - the core of "every thinking" autonomy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$SCRIPT_DIR"

# Configuration
AGENT_NAME="${AGENT_NAME:-steward}"
STATE_DIR="${STATE_DIR:-$MODULE_DIR}"
CONFIG_FILE="$MODULE_DIR/config.json"
THOUGHT_STATE="$MODULE_DIR/thought-state.json"
LOG_FILE="$MODULE_DIR/thought-loop.log"

# Load configuration values
LOOP_INTERVAL="$(jq -r '.loop_interval // 30' "$CONFIG_FILE")"
THINK_BUDGET="$(jq -r '.think_time_budget_ms // 5000' "$CONFIG_FILE")"
MAX_THOUGHTS="$(jq -r '.max_thoughts_per_cycle // 10' "$CONFIG_FILE")"
RELEVANCE_THRESHOLD="$(jq -r '.relevance_threshold // 0.5' "$CONFIG_FILE")"
URGENCY_THRESHOLD="$(jq -r '.urgency_threshold // 0.6' "$CONFIG_FILE")"

log() {
  echo "[$(date -Iseconds)] [thought-loop] $*" | tee -a "$LOG_FILE"
}

run_cycle() {
  local cycle_start=$(date +%s%3N)
  
  log "=== Starting thought cycle for $AGENT_NAME ==="
  
  # Step 1: Delta Detection
  log "Step 1: Detecting deltas..."
  local deltas=$(node "$MODULE_DIR/delta-detector.js" detect "$AGENT_NAME" "$STATE_DIR" 2>/dev/null || echo '[]')
  local delta_count=$(echo "$deltas" | jq 'length // 0')
  log "Detected $delta_count deltas"
  
  # Step 2: Relevance Scoring
  log "Step 2: Scoring relevance..."
  local relevant_thoughts=$(echo "$deltas" | node "$MODULE_DIR/relevance-scorer.js" score "$AGENT_NAME" "$STATE_DIR" 2>/dev/null || echo '[]')
  local relevant_count=$(echo "$relevant_thoughts" | jq 'length // 0')
  log "Found $relevant_count relevant thoughts (threshold: $RELEVANCE_THRESHOLD)"
  
  # Step 3: Thought Generation
  log "Step 3: Generating thoughts..."
  local thoughts=$(echo "$relevant_thoughts" | head -n "$MAX_THOUGHTS" | node "$MODULE_DIR/thought-generator.js" generate "$AGENT_NAME" "$STATE_DIR" 2>/dev/null || echo '[]')
  local thought_count=$(echo "$thoughts" | jq 'length // 0')
  log "Generated $thought_count thoughts"
  
  # Step 4: Action Urgency Evaluation
  log "Step 4: Evaluating action urgency..."
  local actions=$(echo "$thoughts" | node "$MODULE_DIR/action-urgency.js" evaluate "$AGENT_NAME" "$STATE_DIR" 2>/dev/null || echo '[]')
  local urgent_count=$(echo "$actions" | jq '[.actions[] | select(.urgency >= '"$URGENCY_THRESHOLD"")] | length')
  log "Found $urgent_count urgent actions (threshold: $URGENCY_THRESHOLD)"
  
  # Update state
  local cycle_end=$(date +%s%3N)
  local cycle_duration=$((cycle_end - cycle_start))
  
  # Update thought state
  local current_count=$(jq '.cycle_count // 0' "$THOUGHT_STATE")
  jq --argjson count $((current_count + 1)) \
     --argjson duration "$cycle_duration" \
     '.cycle_count = $count | .last_cycle = (now | todateiso8601) | .performance.total_thoughts += $count' \
     "$THOUGHT_STATE" > "${THOUGHT_STATE}.tmp" && mv "${THOUGHT_STATE}.tmp" "$THOUGHT_STATE"
  
  log "=== Cycle complete in ${cycle_duration}ms ==="
  
  # Execute urgent actions
  if [ "$urgent_count" -gt 0 ]; then
    execute_actions "$actions"
  fi
}

execute_actions() {
  local actions_json="$1"
  local action_count=$(echo "$actions_json" | jq '.actions | length')
  
  for i in $(seq 0 $((action_count - 1))); do
    local action=$(echo "$actions_json" | jq -r ".actions[$i]")
    local urgency=$(echo "$action" | jq -r '.urgency')
    local type=$(echo "$action" | jq -r '.type')
    
    if (( $(echo "$urgency >= $URGENCY_THRESHOLD" | bc -l) )); then
      log "Executing action: $type (urgency: $urgency)"
      
      case "$type" in
        trigger_deliberation)
          log "Would trigger deliberation protocol"
          ;;
        broadcast_thought)
          log "Would broadcast thought to collective"
          ;;
        update_context)
          log "Would update context for next cycle"
          ;;
        log_alert)
          local alert_msg=$(echo "$action" | jq -r '.message')
          log "ALERT: $alert_msg"
          jq '.performance.alerts_raised += 1' "$THOUGHT_STATE" > "${THOUGHT_STATE}.tmp" && mv "${THOUGHT_STATE}.tmp" "$THOUGHT_STATE"
          ;;
        *)
          log "Unknown action type: $type"
          ;;
      esac
      
      jq '.performance.actions_triggered += 1' "$THOUGHT_STATE" > "${THOUGHT_STATE}.tmp" && mv "${THOUGHT_STATE}.tmp" "$THOUGHT_STATE"
    fi
  done
}

idle_think() {
  # Generate idle thoughts when no deltas detected
  log "Idle thinking: reflecting on goals and system state..."
  
  local idle_thoughts=$(echo '[]' | node "$MODULE_DIR/thought-generator.js" idle "$AGENT_NAME" "$STATE_DIR" 2>/dev/null || echo '[]')
  local thought_count=$(echo "$idle_thoughts" | jq 'length // 0')
  
  if [ "$thought_count" -gt 0 ]; then
    log "Generated $thought_count idle thoughts"
    echo "$idle_thoughts" | node "$MODULE_DIR/action-urgency.js" evaluate "$AGENT_NAME" "$STATE_DIR" 2>/dev/null
  fi
}

daemon_mode() {
  log "Starting continuous thought loop (interval: ${LOOP_INTERVAL}s)"
  
  while true; do
    run_cycle
    sleep "$LOOP_INTERVAL"
  done
}

# Parse arguments
case "${1:-daemon}" in
  --once|-o)
    log "Running single thought cycle"
    run_cycle
    ;;
  --daemon|-d|daemon)
    daemon_mode
    ;;
  --idle|-i)
    idle_think
    ;;
  --help|-h|help)
    echo "Usage: $0 [command]"
    echo "Commands:"
    echo "  --once, -o    Run single cycle"
    echo "  --daemon, -d  Run continuous loop (default)"
    echo "  --idle, -i    Generate idle thoughts"
    echo "  --help, -h    Show this help"
    exit 0
    ;;
  *)
    log "Unknown option: $1, starting daemon mode"
    daemon_mode
    ;;
esac