#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - Redeploy Stack with Logging
# ==============================================================================
# This script:
# 1. Stops existing containers
# 2. Rebuilds and starts the stack
# 3. Waits for containers to initialize
# 4. Saves container logs to container-logs.txt
#
# Usage:
#   ./deploy-with-logs.sh
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/container-logs.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Starting OpenClaw stack deployment with logging..."

# Step 1: Stop existing containers
echo -e "${CYAN}[1/4]${NC} Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Step 2: Rebuild and start
echo -e "${CYAN}[2/4]${NC} Building and starting containers..."
docker compose up -d --build

# Step 3: Wait for initialization
echo -e "${CYAN}[3/4]${NC} Waiting for containers to initialize (30s)..."
sleep 30

# Step 4: Save logs
echo -e "${CYAN}[4/4]${NC} Saving container logs to $LOG_FILE..."

# Get full logs from all containers
docker compose logs --tail=500 > "$LOG_FILE" 2>&1

# Show summary
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Container status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}" | head -20

echo ""
echo "Log file saved: $LOG_FILE ($(wc -l < "$LOG_FILE") lines)"
echo ""

# Quick health check
echo "Quick health check:"
echo "- LiteLLM: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health 2>/dev/null || echo 'failed')"
echo "- Web UI:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/agents 2>/dev/null || echo 'failed')"
echo "- Channels:$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/channels 2>/dev/null || echo 'failed')"

echo ""
echo -e "${GREEN}Done!${NC} Check $LOG_FILE for full container logs."