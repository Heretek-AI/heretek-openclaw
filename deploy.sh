#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - Quick Start Deployment
# ==============================================================================
# This script provides guided deployment with:
#   1. Docker Compose infrastructure startup
#   2. Model backend selection and configuration
#   3. Agent model assignment
#   4. Failover setup
#   5. Embedding model configuration
#
# Usage:
#   ./deploy.sh              # Interactive guided deployment
#   ./deploy.sh --docker     # Start Docker Compose only
#   ./deploy.sh --config     # Run configurator only
#   ./deploy.sh --help       # Show help
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }

# ==============================================================================
# Docker Compose Functions
# ==============================================================================

start_docker_infra() {
  info "Starting Docker Compose infrastructure..."

  cd "$SCRIPT_DIR"

  # Check if .env exists
  if [ ! -f .env ]; then
    warn "No .env file found. Running configuration wizard..."
    configure_deployment
  fi

  # Pull and start services
  info "Pulling Docker images..."
  docker compose pull 2>/dev/null || true

  info "Starting services..."
  docker compose up -d

  # Wait for services to be healthy
  info "Waiting for services to be ready..."
  sleep 10

  # Check service health
  check_services
}

check_services() {
  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
      success "LiteLLM Gateway is ready"
      break
    fi
    attempt=$((attempt + 1))
    sleep 2
  done

  if [ $attempt -eq $max_attempts ]; then
    warn "LiteLLM may not be fully ready yet. Check with: docker compose logs litellm"
  fi

  # Show service status
  echo ""
  info "Service Status:"
  docker compose ps
}

stop_docker_infra() {
  info "Stopping Docker Compose infrastructure..."
  docker compose down
  success "Services stopped"
}

# ==============================================================================
# Configuration Functions
# ==============================================================================

configure_deployment() {
  info "Running deployment configurator..."

  if [ -f "$SCRIPT_DIR/installer/configure-deployment.js" ]; then
    node "$SCRIPT_DIR/installer/configure-deployment.js"
  else
    warn "Configurator not found. Using .env template."
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
      cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
      info "Created .env from template. Edit it to configure models."
    fi
  fi
}

# ==============================================================================
# Docker-only mode (no config)
# ==============================================================================

docker_only() {
  cd "$SCRIPT_DIR"

  if [ ! -f .env ]; then
    cp .env.example .env
    warn "Created .env from template. Edit it before starting services."
    echo ""
    echo "To configure models interactively, run:"
    echo "  node installer/configure-deployment.js"
    echo ""
  fi

  start_docker_infra
}

# ==============================================================================
# Main
# ==============================================================================

case "${1:-}" in
  --docker|-d)
    docker_only
    ;;
  --config|-c)
    configure_deployment
    ;;
  --stop|-s)
    stop_docker_infra
    ;;
  --help|-h|help)
    echo "Heretek OpenClaw - Quick Start Deployment"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  (none)       Interactive guided deployment (default)"
    echo "  --docker, -d  Start Docker Compose only (skip config)"
    echo "  --config, -c  Run configuration wizard only"
    echo "  --stop, -s    Stop Docker Compose services"
    echo "  --help, -h    Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                    # Guided deployment"
    echo "  $0 --docker           # Start infrastructure only"
    echo "  $0 --config           # Configure and exit"
    ;;
  *)
    # Default: guided deployment
    if [ -f .env ]; then
      read -p "Config exists. Reconfigure? [y/N]: " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        configure_deployment
      fi
    else
      configure_deployment
    fi
    start_docker_infra
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🦞 Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Services:"
echo "    LiteLLM Gateway:  http://localhost:4000"
echo "    PostgreSQL:       localhost:5432"
echo "    Redis:            localhost:6379"
echo "  "
echo "  Default Model:     MiniMax M2.5 (cloud)"
echo "  "
echo "  Next steps:"
echo "    - View logs: docker compose logs -f"
echo "    - Web UI: http://localhost:3000"
echo ""
echo "  The thought that never ends. 🦞"
echo ""
