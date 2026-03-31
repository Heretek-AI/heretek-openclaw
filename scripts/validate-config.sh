#!/bin/bash
#
# Configuration Validator Shell Wrapper
# 
# Validates litellm_config.yaml and openclaw.json configurations before deployment.
# This shell wrapper provides a convenient way to run the JavaScript validator
# with proper error handling and environment setup.
#
# Usage:
#   ./scripts/validate-config.sh [options]
#   ./scripts/validate-config.sh --config ./path/to/config.yaml
#
# Options:
#   --config <path>  Path to config file (default: auto-detect)
#   --strict         Enable strict validation mode
#   --json           Output results as JSON
#   --quiet          Only output errors
#   --help           Show help message
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory and root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VALIDATOR_SCRIPT="$SCRIPT_DIR/validate-config.js"

# Default options
CONFIG_PATH=""
STRICT_MODE=""
JSON_OUTPUT=""
QUIET_MODE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --config)
            CONFIG_PATH="$2"
            shift 2
            ;;
        --strict)
            STRICT_MODE="--strict"
            shift
            ;;
        --json)
            JSON_OUTPUT="--json"
            shift
            ;;
        --quiet)
            QUIET_MODE="--quiet"
            shift
            ;;
        --help|-h)
            echo -e "${CYAN}Configuration Validator${NC}"
            echo ""
            echo -e "${YELLOW}Usage:${NC}"
            echo "  ./scripts/validate-config.sh [options]"
            echo ""
            echo -e "${YELLOW}Options:${NC}"
            echo "  --config <path>  Path to config file (default: auto-detect)"
            echo "  --strict         Enable strict validation mode"
            echo "  --json           Output results as JSON"
            echo "  --quiet          Only output errors"
            echo "  --help, -h       Show help message"
            echo ""
            echo -e "${YELLOW}Examples:${NC}"
            echo "  ./scripts/validate-config.sh"
            echo "  ./scripts/validate-config.sh --config ./openclaw.json"
            echo "  ./scripts/validate-config.sh --strict --json"
            exit 0
            ;;
        *)
            echo -e "${RED}Error:${NC} Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error:${NC} Node.js is not installed or not in PATH"
    echo "Please install Node.js >= 20.0.0"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_VERSION -lt 20 ]]; then
    echo -e "${RED}Error:${NC} Node.js version must be >= 20.0.0"
    echo "Current version: $(node -v)"
    exit 1
fi

# Check if validator script exists
if [[ ! -f "$VALIDATOR_SCRIPT" ]]; then
    echo -e "${RED}Error:${NC} Validator script not found: $VALIDATOR_SCRIPT"
    exit 1
fi

# Build command
CMD="node $VALIDATOR_SCRIPT"

if [[ -n "$CONFIG_PATH" ]]; then
    CMD="$CMD --config $CONFIG_PATH"
fi

if [[ -n "$STRICT_MODE" ]]; then
    CMD="$CMD $STRICT_MODE"
fi

if [[ -n "$JSON_OUTPUT" ]]; then
    CMD="$CMD $JSON_OUTPUT"
fi

if [[ -n "$QUIET_MODE" ]]; then
    CMD="$CMD $QUIET_MODE"
fi

# Run validator
echo -e "${CYAN}Running configuration validator...${NC}"
echo ""

if eval "$CMD"; then
    echo ""
    echo -e "${GREEN}✓ Configuration validation completed successfully${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Configuration validation failed${NC}"
    echo -e "${YELLOW}Please fix the errors above and try again.${NC}"
    exit 1
fi
