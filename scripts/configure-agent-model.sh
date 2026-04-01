#!/bin/bash

# ==============================================================================
# Agent Model Configuration CLI Wrapper
# ==============================================================================
# This script provides a convenient wrapper for the configure-agent-model.js
# CLI tool with additional shell-based functionality.
#
# Usage:
#   ./scripts/configure-agent-model.sh [command] [options]
#
# Commands:
#   list       - List all agents and their model configurations
#   models     - List available models
#   set        - Set models for an agent (interactive or non-interactive)
#   validate   - Validate all configurations
#   reset      - Reset an agent's configuration to defaults
#   usage      - Show usage statistics for an agent
#   help       - Show help message
# ==============================================================================

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Node command
NODE_CMD="node"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Check if js-yaml is installed
check_dependencies() {
    if ! node -e "require('js-yaml')" 2>/dev/null; then
        echo -e "${YELLOW}Warning: js-yaml module not found. Installing...${NC}"
        cd "$PROJECT_ROOT" && npm install js-yaml
    fi
}

# Show help
show_help() {
    cat << EOF
${CYAN}Agent Model Configuration CLI${NC}

${GREEN}Usage:${NC}
  $0 [command] [options]

${GREEN}Commands:${NC}
  list                    List all agents and their model configurations
  models                  List available models from LiteLLM config
  set                     Set models for an agent
  validate                Validate all agent configurations
  reset                   Reset an agent's configuration to defaults
  usage                   Show usage/budget configuration
  env-check               Check environment variables for API keys
  help                    Show this help message

${GREEN}Options:${NC}
  --agent=<name>          Specify agent name
  --primary=<model>       Set primary model
  --fallback=<model>      Set fallback model
  --max-tokens=<n>        Set max tokens
  --temperature=<f>       Set temperature
  -h, --help              Show help

${GREEN}Examples:${NC}
  # List all configurations
  $0 list

  # Interactive configuration
  $0 set --agent=coder

  # Non-interactive configuration
  $0 set --agent=coder --primary=anthropic/claude-3-5-sonnet --fallback=openai/gpt-4o

  # Validate configurations
  $0 validate

  # Check API keys
  $0 env-check
EOF
}

# Check environment variables for API keys
check_env() {
    echo -e "${CYAN}Environment Variable Check${NC}"
    echo ""
    
    # Common API key variables
    API_KEYS=(
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "GOOGLE_API_KEY"
        "AZURE_API_KEY"
        "MINIMAX_API_KEY"
        "ZAI_API_KEY"
        "XAI_API_KEY"
    )
    
    for key in "${API_KEYS[@]}"; do
        if [ -n "${!key}" ]; then
            # Mask the key value for security
            value="${!key}"
            masked="${value:0:4}...${value: -4}"
            echo -e "${GREEN}✓${NC} $key = $masked"
        else
            echo -e "${RED}✗${NC} $key ${YELLOW}(not set)${NC}"
        fi
    done
}

# Main function
main() {
    local command="${1:-help}"
    shift || true
    
    # Check dependencies
    check_dependencies
    
    case "$command" in
        list|models|set|validate|reset|usage|help)
            # Pass through to Node.js CLI
            exec "$NODE_CMD" "$SCRIPT_DIR/configure-agent-model.js" "$command" "$@"
            ;;
        env-check)
            check_env
            ;;
        -h|--help|help)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
