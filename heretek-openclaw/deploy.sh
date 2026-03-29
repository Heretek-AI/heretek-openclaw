#!/bin/bash
# Heretek OpenClaw - Quick Start Deployment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }

case "${1:-}" in
  --docker|-d)
    if [ ! -f .env ]; then
      cp .env.example .env
    fi
    info "Starting Docker Compose..."
    docker-compose up -d
    success "Done!"
    docker-compose ps
    ;;
  *)
    if [ ! -f .env ]; then
      cp .env.example .env
      info "Created .env from template"
    fi
    info "Starting services..."
    docker-compose up -d
    success "Services started"
    docker-compose ps
    ;;
esac

echo ""
echo "LiteLLM: http://localhost:4000"
echo "UI: admin / heretek-admin"