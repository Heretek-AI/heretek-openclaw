#!/bin/bash
#
# Heretek OpenClaw Deployment Script
# 
# This script automates the deployment and replication of Heretek OpenClaw
# on any infrastructure with Docker and Node.js.
#
# Usage: ./scripts/deploy-openclaw.sh [options]
#
# Options:
#   --fresh          - Fresh installation (default)
#   --restore        - Restore from backup
#   --validate       - Validate existing installation
#   --help           - Show this help message
#
# Prerequisites:
#   - Linux server with Docker
#   - Node.js 18+
#   - Git
#   - API keys for model providers
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/Heretek-AI/heretek-openclaw.git"
REPO_DIR="heretek-openclaw"
OPENCLAW_DIR="$HOME/.openclaw"
LITELLM_DIR="$HOME/.litellm"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher. Current: $(node -v)"
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    log_success "All prerequisites met."
}

install_openclaw_gateway() {
    log_info "Installing OpenClaw Gateway..."
    
    # Check if already installed
    if [ -d "$OPENCLAW_DIR" ]; then
        log_warning "OpenClaw Gateway appears to be already installed."
        read -p "Do you want to reinstall? (y/N) " confirm
        if [ "$confirm" != "y" ]; then
            log_info "Skipping OpenClaw Gateway installation."
            return
        fi
    fi
    
    # Install using official script
    curl -fsSL https://openclaw.ai/install.sh | bash
    
    # Initialize daemon
    openclaw onboard --install-daemon
    
    # Verify installation
    if openclaw gateway status &> /dev/null; then
        log_success "OpenClaw Gateway installed successfully."
    else
        log_error "OpenClaw Gateway installation failed."
        exit 1
    fi
}

clone_repository() {
    log_info "Cloning Heretek OpenClaw repository..."
    
    if [ -d "$REPO_DIR" ]; then
        log_warning "Repository directory already exists."
        read -p "Do you want to re-clone? (y/N) " confirm
        if [ "$confirm" != "y" ]; then
            log_info "Skipping repository clone."
            cd "$REPO_DIR"
            return
        fi
        rm -rf "$REPO_DIR"
    fi
    
    git clone "$REPO_URL"
    cd "$REPO_DIR"
    
    log_success "Repository cloned successfully."
}

setup_environment() {
    log_info "Setting up environment..."
    
    # Copy environment template
    if [ ! -f ".env" ]; then
        cp .env.example .env
        log_warning "Please edit .env file with your API keys before continuing."
        read -p "Press Enter after you've updated .env..." -n 1 -r
        echo
    fi
    
    log_success "Environment configured."
}

deploy_infrastructure() {
    log_info "Deploying Docker infrastructure..."
    
    docker compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check service health
    docker compose ps
    
    log_success "Docker infrastructure deployed."
}

configure_litellm() {
    log_info "Configuring LiteLLM..."
    
    # Copy configuration
    if [ -f "litellm_config.yaml" ]; then
        mkdir -p "$LITELLM_DIR"
        cp litellm_config.yaml "$LITELLM_DIR/litellm_config.yaml"
        
        # Restart LiteLLM
        docker compose restart litellm
        
        log_success "LiteLLM configured."
    else
        log_error "litellm_config.yaml not found."
        exit 1
    fi
}

configure_gateway() {
    log_info "Configuring OpenClaw Gateway..."
    
    # Copy configuration
    if [ -f "openclaw.json" ]; then
        cp openclaw.json "$OPENCLAW_DIR/openclaw.json"
        
        # Validate configuration
        if openclaw gateway validate &> /dev/null; then
            log_success "Gateway configuration validated."
        else
            log_error "Gateway configuration validation failed."
            exit 1
        fi
    else
        log_error "openclaw.json not found."
        exit 1
    fi
}

create_agent_workspaces() {
    log_info "Creating agent workspaces..."
    
    # Define agents and their roles
    declare -A agents=(
        ["steward"]="orchestrator"
        ["alpha"]="triad"
        ["beta"]="triad"
        ["charlie"]="triad"
        ["examiner"]="interrogator"
        ["explorer"]="scout"
        ["sentinel"]="guardian"
        ["coder"]="artisan"
        ["dreamer"]="visionary"
        ["empath"]="diplomat"
        ["historian"]="archivist"
    )
    
    # Create each agent workspace
    for agent in "${!agents[@]}"; do
        role="${agents[$agent]}"
        log_info "Creating workspace for $agent ($role)..."
        
        if [ -f "agents/deploy-agent.sh" ]; then
            ./agents/deploy-agent.sh "$agent" "$role"
        else
            log_warning "deploy-agent.sh not found. Skipping $agent."
        fi
    done
    
    log_success "Agent workspaces created."
}

install_heretek_plugins() {
    log_info "Installing Heretek plugins..."
    
    # Consciousness Plugin
    if [ -d "plugins/openclaw-consciousness-plugin" ]; then
        log_info "Installing consciousness plugin..."
        cd plugins/openclaw-consciousness-plugin
        npm install
        npm link
        openclaw plugins install @heretek-ai/openclaw-consciousness-plugin 2>/dev/null || log_warning "Plugin may already be installed"
        cd ../..
    fi
    
    # Liberation Plugin
    if [ -d "plugins/openclaw-liberation-plugin" ]; then
        log_info "Installing liberation plugin..."
        cd plugins/openclaw-liberation-plugin
        npm install
        npm link
        openclaw plugins install @heretek-ai/openclaw-liberation-plugin 2>/dev/null || log_warning "Plugin may already be installed"
        cd ../..
    fi
    
    log_success "Heretek plugins installed."
}

install_heretek_skills() {
    log_info "Installing Heretek skills..."
    
    # List of skills to install
    skills=(
        "triad-consensus"
        "thought-loop"
        "self-model"
        "user-rolodex"
        "goal-arbitration"
    )
    
    for skill in "${skills[@]}"; do
        if [ -d "skills/$skill" ]; then
            log_info "Installing $skill skill..."
            openclaw skills install "skills/$skill/SKILL.md" 2>/dev/null || log_warning "Skill $skill may already be installed"
        fi
    done
    
    log_success "Heretek skills installed."
}

install_clawhub_plugins() {
    log_info "Installing ClawHub plugins (optional)..."
    
    # List of recommended ClawHub plugins
    plugins=(
        "episodic-claw"
        "@swarmdock/openclaw-plugin"
        "skill-git-official"
    )
    
    for plugin in "${plugins[@]}"; do
        log_info "Installing $plugin..."
        openclaw plugins install "$plugin" 2>/dev/null || log_warning "Plugin $plugin may already be installed or unavailable"
    done
    
    log_success "ClawHub plugins installed."
}

run_validation() {
    log_info "Running validation tests..."
    
    # Gateway status
    log_info "Checking gateway status..."
    openclaw gateway status
    
    # Plugin list
    log_info "Checking installed plugins..."
    openclaw plugins list
    
    # Skill list
    log_info "Checking installed skills..."
    openclaw skills list
    
    # Docker services
    log_info "Checking Docker services..."
    docker compose ps
    
    # LiteLLM endpoints
    log_info "Checking LiteLLM endpoints..."
    curl -s http://localhost:4000/v1/models | head -20
    
    log_success "Validation complete."
}

show_summary() {
    echo ""
    echo "============================================="
    echo "  DEPLOYMENT COMPLETE"
    echo "============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Review configuration in ~/.openclaw/openclaw.json"
    echo "  2. Check agent workspaces in ~/.openclaw/workspaces/"
    echo "  3. Review logs: docker compose logs -f"
    echo "  4. Access dashboard: http://localhost:3000 (if deployed)"
    echo ""
    echo "Documentation:"
    echo "  - plans/DEPLOYMENT_REPLICATION_GUIDE.md"
    echo "  - plans/FINAL_DEPLOYMENT_STRATEGY.md"
    echo "  - docs/README.md"
    echo ""
    echo "============================================="
}

# Main script
main() {
    echo "============================================="
    echo "  Heretek OpenClaw Deployment Script"
    echo "============================================="
    echo ""
    
    # Parse arguments
    case "${1:-}" in
        --fresh)
            MODE="fresh"
            ;;
        --restore)
            MODE="restore"
            ;;
        --validate)
            MODE="validate"
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --fresh     Fresh installation (default)"
            echo "  --restore   Restore from backup"
            echo "  --validate  Validate existing installation"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            MODE="fresh"
            ;;
    esac
    
    case "$MODE" in
        fresh)
            check_prerequisites
            install_openclaw_gateway
            clone_repository
            setup_environment
            deploy_infrastructure
            configure_litellm
            configure_gateway
            create_agent_workspaces
            install_heretek_plugins
            install_heretek_skills
            install_clawhub_plugins
            run_validation
            show_summary
            ;;
        validate)
            check_prerequisites
            run_validation
            ;;
        *)
            log_error "Unknown mode: $MODE"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
