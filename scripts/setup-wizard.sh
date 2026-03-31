#!/bin/bash

# =============================================================================
# Heretek OpenClaw Setup Wizard - Shell Wrapper
# =============================================================================
# This script provides a shell wrapper for the Node.js setup wizard.
# It handles prerequisites checking and provides fallback options.
#
# Usage: ./scripts/setup-wizard.sh
# =============================================================================

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Symbols
SUCCESS="✓"
ERROR="✗"
WARNING="⚠"
INFO="ℹ"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║  Heretek OpenClaw Setup Wizard                           ║"
echo "║  Interactive configuration for first-time users          ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}${SUCCESS} Node.js found: ${NODE_VERSION}${NC}"
        return 0
    else
        echo -e "${RED}${ERROR} Node.js is not installed${NC}"
        return 1
    fi
}

# Function to check Node.js version
check_node_version() {
    local version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$version" -ge 18 ]; then
        echo -e "${GREEN}${SUCCESS} Node.js version is compatible (18+)${NC}"
        return 0
    else
        echo -e "${YELLOW}${WARNING} Node.js version may be too old. Please upgrade to 18+${NC}"
        return 1
    fi
}

# Function to check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}${SUCCESS} npm found: ${NPM_VERSION}${NC}"
        return 0
    else
        echo -e "${RED}${ERROR} npm is not installed${NC}"
        return 1
    fi
}

# Function to check if Docker is installed
check_docker() {
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        echo -e "${GREEN}${SUCCESS} Docker found: ${DOCKER_VERSION}${NC}"
        return 0
    else
        echo -e "${YELLOW}${WARNING} Docker not found - will configure non-Docker mode${NC}"
        return 1
    fi
}

# Function to check if Docker Compose is installed
check_docker_compose() {
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
        echo -e "${GREEN}${SUCCESS} Docker Compose found${NC}"
        return 0
    else
        echo -e "${YELLOW}${WARNING} Docker Compose not found${NC}"
        return 1
    fi
}

# Function to install Node.js dependencies
install_dependencies() {
    echo -e "\n${CYAN}${INFO} Installing required dependencies...${NC}"
    
    if [ -f "$ROOT_DIR/package.json" ]; then
        cd "$ROOT_DIR"
        npm install --ignore-scripts
        echo -e "${GREEN}${SUCCESS} Dependencies installed${NC}"
    else
        echo -e "${RED}${ERROR} package.json not found${NC}"
        return 1
    fi
}

# Function to run the Node.js setup wizard
run_wizard() {
    echo -e "\n${CYAN}${INFO} Starting interactive setup wizard...${NC}\n"
    
    cd "$ROOT_DIR"
    node scripts/setup-wizard.js
    
    return $?
}

# Function to show manual setup instructions
show_manual_setup() {
    echo -e "\n${YELLOW}${WARNING} Interactive wizard unavailable. Manual setup instructions:${NC}\n"
    
    echo -e "${CYAN}Manual Setup Steps:${NC}"
    echo ""
    echo "  1. Copy environment template:"
    echo "     ${YELLOW}cp .env.example .env${NC}"
    echo ""
    echo "  2. Edit .env with your API keys and configuration"
    echo ""
    echo "  3. Install OpenClaw Gateway:"
    echo "     ${YELLOW}curl -fsSL https://openclaw.ai/install.sh | bash${NC}"
    echo ""
    echo "  4. Initialize Gateway:"
    echo "     ${YELLOW}openclaw onboard --install-daemon${NC}"
    echo ""
    echo "  5. Copy configuration:"
    echo "     ${YELLOW}cp openclaw.json ~/.openclaw/openclaw.json${NC}"
    echo ""
    echo "  6. Create agent workspaces:"
    echo "     ${YELLOW}./agents/deploy-agent.sh <agent> <role>${NC}"
    echo ""
    echo "For detailed instructions, see:"
    echo "  ${YELLOW}docs/deployment/LOCAL_DEPLOYMENT.md${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${CYAN}${INFO} Checking prerequisites...${NC}\n"
    
    local prerequisites_ok=true
    
    # Check Node.js
    if ! check_node; then
        echo -e "\n${RED}${ERROR} Node.js is required for the setup wizard.${NC}"
        echo -e "${CYAN}Please install Node.js 18+ from https://nodejs.org/${NC}"
        echo ""
        show_manual_setup
        exit 1
    fi
    
    # Check Node.js version
    check_node_version
    
    # Check npm
    if ! check_npm; then
        echo -e "\n${RED}${ERROR} npm is required for installing dependencies.${NC}"
        prerequisites_ok=false
    fi
    
    # Check Docker (optional)
    check_docker
    check_docker_compose
    
    echo ""
    
    # Install dependencies if needed
    if [ ! -d "$ROOT_DIR/node_modules" ]; then
        install_dependencies
    fi
    
    # Run the wizard
    if ! run_wizard; then
        echo -e "\n${RED}${ERROR} Setup wizard failed to run${NC}"
        show_manual_setup
        exit 1
    fi
    
    echo -e "\n${GREEN}${SUCCESS} Setup wizard completed successfully!${NC}\n"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Heretek OpenClaw Setup Wizard"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --check        Only check prerequisites, don't run wizard"
        echo "  --manual       Show manual setup instructions"
        echo ""
        echo "The wizard will guide you through:"
        echo "  - Deployment type selection (Docker/Non-Docker)"
        echo "  - AI Provider selection and API key configuration"
        echo "  - Database setup (PostgreSQL, Redis)"
        echo "  - Agent configuration"
        echo "  - Configuration file generation"
        echo ""
        exit 0
        ;;
    --check)
        echo -e "${CYAN}${INFO} Checking prerequisites only...${NC}\n"
        check_node
        check_node_version
        check_npm
        check_docker
        check_docker_compose
        exit 0
        ;;
    --manual)
        show_manual_setup
        exit 0
        ;;
    *)
        main
        ;;
esac
