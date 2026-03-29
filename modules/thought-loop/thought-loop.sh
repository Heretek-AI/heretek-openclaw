#!/bin/bash
#===============================================================================
# Continuous Thought Loop - Main Orchestrator
#===============================================================================
# This script runs the continuous think loop in each agent container,
# enabling continuous autonomous thinking - the first step to achieving
# "every thinking" autonomy.
#
# Usage:
#   ./thought-loop.sh              # Run with default config
#   ./thought-loop.sh --once       # Run single cycle for testing
#   ./thought-loop.sh --daemon     # Run as background daemon
#
# Environment Variables:
#   THOUGHT_LOOP_INTERVAL     - Interval between cycles (default: 30 seconds)
#   THINK_TIME_BUDGET          - Max seconds per cycle (default: 10)
#   LOG_FILE                   - Log file path
#   AGENT_NAME                 - Name of this agent
#   BROADCAST_THOUGHTS         - Whether to broadcast thoughts to triad
#   CONFIG_PATH                - Path to config.json
#
#===============================================================================

set -euo pipefail

# Configuration with environment variable overrides
LOOP_INTERVAL="${THOUGHT_LOOP_INTERVAL:-30}"
THINK_TIME_BUDGET="${THINK_TIME_BUDGET:-10}"
LOG_FILE="${LOG_FILE:-/var/log/thought-loop.log}"
AGENT_NAME="${AGENT_NAME:-steward}"
BROADCAST_THOUGHTS="${BROADCAST_THOUGHTS:-false}"
CONFIG_PATH="${CONFIG_PATH:-./config.json}"

# Determine script directory and set paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="${STATE_FILE:-$SCRIPT_DIR/thought-state.json}"
DELTA_STATE_FILE="/tmp/delta-detector-state.json"

# Logging function
log() {
    local timestamp
    timestamp="$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"
    echo "[$timestamp] $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] $*"
}

# Error handling function
error_exit() {
    log "ERROR: $1"
    exit "${2:-1}"
}

# Load configuration
load_config() {
    if [ -f "$CONFIG_PATH" ]; then
        log "Loading config from $CONFIG_PATH"
    else
        log "Config not found at $CONFIG_PATH, using defaults"
    fi
}

# Load state from previous cycle
load_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo '{"cycle": 0, "last_thoughts": [], "active_context": {}}'
    fi
}

# Save state for next cycle
save_state() {
    local cycle="$1"
    local thoughts="$2"
    local context="$3"
    
    cat > "$STATE_FILE" <<EOF
{
    "cycle": $cycle,
    "last_thoughts": $thoughts,
    "active_context": $context,
    "last_run": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"
}
EOF
    log "State saved for cycle $cycle"
}

# Check if required tools are available
check_dependencies() {
    local missing=0
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        log "WARNING: node not found - some modules may not work"
        missing=1
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        error_exit "jq is required but not installed" 1
    fi
    
    log "Dependencies checked"
}

# Run delta detector
run_delta_detector() {
    local delta_script="$SCRIPT_DIR/delta-detector.js"
    
    if [ -f "$delta_script" ]; then
        node "$delta_script" --json 2>/dev/null || echo '[]'
    else
        log "WARNING: delta-detector.js not found"
        echo '[]'
    fi
}

# Run relevance scorer
run_relevance_scorer() {
    local scorer_script="$SCRIPT_DIR/relevance-scorer.js"
    local deltas="$1"
    local context="$2"
    
    if [ -f "$scorer_script" ]; then
        echo "$deltas" | node "$scorer_script" --deltas "$(echo "$deltas")" --context "$context" 2>/dev/null || echo '[]'
    else
        log "WARNING: relevance-scorer.js not found"
        echo '[]'
    fi
}

# Run thought generator
run_thought_generator() {
    local generator_script="$SCRIPT_DIR/thought-generator.js"
    local deltas="$1"
    
    if [ -f "$generator_script" ]; then
        echo "$deltas" | node "$generator_script" --deltas "$(echo "$deltas")" --agent "$AGENT_NAME" 2>/dev/null || echo '[]'
    else
        log "WARNING: thought-generator.js not found"
        echo '[]'
    fi
}

# Run idle thought generator
run_idle_generator() {
    local generator_script="$SCRIPT_DIR/thought-generator.js"
    
    if [ -f "$generator_script" ]; then
        node "$generator_script" --idle --agent "$AGENT_NAME" 2>/dev/null || echo '[]'
    else
        echo '[]'
    fi
}

# Run action urgency evaluator
run_action_urgency() {
    local urgency_script="$SCRIPT_DIR/action-urgency.js"
    local thoughts="$1"
    
    if [ -f "$urgency_script" ]; then
        echo "$thoughts" | node "$urgency_script" --thoughts "$(echo "$thoughts")" 2>/dev/null || echo '[]'
    else
        log "WARNING: action-urgency.js not found"
        echo '[]'
    fi
}

# Execute an action
execute_action() {
    local action_json="$1"
    local action_type
    local action_target
    
    action_type=$(echo "$action_json" | jq -r '.type' 2>/dev/null || echo "unknown")
    action_target=$(echo "$action_json" | jq -r '.target' 2>/dev/null || echo "unknown")
    
    log "Executing action: type=$action_type target=$action_target"
    
    case "$action_type" in
        "trigger_deliberation")
            log "Triggering deliberation: $action_target"
            # Call auto-deliberation-trigger if available
            if command -v trigger-deliberation &> /dev/null; then
                trigger-deliberation "$action_target" 2>/dev/null || true
            fi
            ;;
        "broadcast_thought")
            log "Broadcasting thought: $action_target"
            # Broadcast via triad-sync if available
            if [ -f "$SCRIPT_DIR/thought-broadcast.js" ]; then
                node "$SCRIPT_DIR/thought-broadcast.js" --thought "$action_target" 2>/dev/null || true
            fi
            ;;
        "update_context")
            log "Updating context: $action_target"
            # Context update is handled in main loop
            ;;
        "query")
            log "Querying: $action_target"
            ;;
        "log")
            log "Logging: $action_target"
            ;;
        *)
            log "Unknown action type: $action_type"
            ;;
    esac
}

# Main thought loop cycle
main() {
    log "=== Starting Thought Loop Cycle ==="
    log "Agent: $AGENT_NAME, Interval: ${LOOP_INTERVAL}s"
    
    # Load previous state
    local state
    state=$(load_state)
    local cycle
    cycle=$(echo "$state" | jq -r '.cycle // 0')
    local active_context
    active_context=$(echo "$state" | jq '.active_context // {}')
    
    log "Loaded state from cycle $cycle"
    
    # 1. Detect deltas (what changed?)
    log "Detecting deltas..."
    local deltas
    deltas=$(run_delta_detector)
    local delta_count
    delta_count=$(echo "$deltas" | jq 'length')
    log "Found $delta_count deltas"
    
    # 2. Score relevance of each delta
    log "Scoring relevance..."
    local relevant='[]'
    if [ "$delta_count" -gt 0 ]; then
        relevant=$(echo "$deltas" | jq -s '
            .[0] as $deltas | 
            .[1] as $context |
            [$deltas[] | .relevance_score = (
                if .type == "file_created" then 0.7
                elif .type == "file_modified" then 0.6
                elif .type == "file_deleted" then 0.8
                elif .type == "db_modified" then 0.5
                elif .type == "external_cve" then 0.9
                elif .type == "external_release" then 0.6
                elif .type == "agent_offline" then 0.9
                elif .type == "agent_heartbeat" then 0.3
                else 0.3 end
            )] | 
            [.[] | select(.relevance_score >= 0.5)]
        ' "$deltas" "$active_context" 2>/dev/null) || relevant='[]'
    fi
    local relevant_count
    relevant_count=$(echo "$relevant" | jq 'length')
    log "$relevant_count changes are relevant"
    
    # 3. Generate thoughts from relevant changes
    local thoughts='[]'
    if [ "$relevant_count" -gt 0 ]; then
        log "Generating thoughts from deltas..."
        thoughts=$(run_thought_generator "$relevant")
    fi
    
    # 4. Reflect on goals (idle thinking)
    log "Idle reflection..."
    local goal_thoughts
    goal_thoughts=$(run_idle_generator)
    
    # 5. Merge thoughts
    local all_thoughts
    all_thoughts=$(echo "$thoughts $goal_thoughts" | jq -s 'flatten' 2>/dev/null || echo "$thoughts")
    local thought_count
    thought_count=$(echo "$all_thoughts" | jq 'length')
    log "Generated $thought_count thoughts"
    
    # 6. Evaluate action urgency
    local actions='[]'
    if [ "$thought_count" -gt 0 ]; then
        log "Evaluating action urgency..."
        actions=$(run_action_urgency "$all_thoughts")
    fi
    
    # 7. Execute urgent actions (if any)
    local action_count
    action_count=$(echo "$actions" | jq 'length')
    if [ "$action_count" -gt 0 ]; then
        log "Executing $action_count action(s)..."
        
        # Process each action
        while IFS= read -r action; do
            if [ -n "$action" ]; then
                execute_action "$action"
            fi
        done < <(echo "$actions" | jq -r '.[] | @json')
    fi
    
    # 8. Update context for next cycle
    local new_context
    new_context=$(echo "$active_context" | jq --argjson thoughts "$all_thoughts" '
        . + {
            recent_thoughts: ($thoughts | map(.id)),
            last_update: "'"$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')"'"
        }
    ' 2>/dev/null || echo "$active_context")
    
    # 9. Save state
    save_state $((cycle + 1)) "$all_thoughts" "$new_context"
    
    # 10. Broadcast state to triad (optional)
    if [ "${BROADCAST_THOUGHTS}" = "true" ]; then
        log "Broadcasting thoughts to triad..."
        if [ -f "$SCRIPT_DIR/thought-broadcast.js" ]; then
            node "$SCRIPT_DIR/thought-broadcast.js" --cycle "$cycle" --thoughts "$all_thoughts" 2>/dev/null || true
        fi
    fi
    
    log "=== Cycle $cycle complete ==="
    log "Thoughts: $thought_count, Actions: $action_count"
}

# Run in continuous loop
run_loop() {
    log "Starting Continuous Thought Loop..."
    log "Agent: $AGENT_NAME"
    log "Interval: ${LOOP_INTERVAL}s"
    
    while true; do
        main
        log "Sleeping for ${LOOP_INTERVAL}s..."
        sleep "$LOOP_INTERVAL"
    done
}

# Run single cycle for testing
run_once() {
    main
}

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --once      Run a single cycle (for testing)"
    echo "  --daemon    Run as continuous daemon (default)"
    echo "  --help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  THOUGHT_LOOP_INTERVAL  Interval between cycles (default: 30)"
    echo "  THINK_TIME_BUDGET      Max seconds per cycle (default: 10)"
    echo "  LOG_FILE               Log file path"
    echo "  AGENT_NAME             Name of this agent"
    echo "  BROADCAST_THOUGHTS     Whether to broadcast thoughts (default: false)"
}

# Parse command line arguments
case "${1:-}" in
    --once)
        log "Running single cycle..."
        check_dependencies
        run_once
        ;;
    --help|-h|--usage)
        usage
        exit 0
        ;;
    *)
        check_dependencies
        load_config
        run_loop
        ;;
esac
