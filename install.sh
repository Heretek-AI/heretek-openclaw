#!/bin/bash
# ==============================================================================
# Heretek OpenClaw — Oneshot Installer
# ==============================================================================
# Usage: curl -fsSL https://raw.githubusercontent.com/heretek-ai/heretek-openclaw/main/install.sh | bash
#
# This script:
#   1. Detects GPU (NVIDIA/AMD/CPU)
#   2. Clones the repository
#   3. Generates .env file with API keys
#   4. Starts all services
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Print banner
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           Heretek OpenClaw — Installer v2.0                  ║"
echo "║                                                              ║"
echo "║     Configuration: AMD GPU + MiniMax Primary + z.ai Failover      ║"
echo "║     Passthrough Endpoints: Per-agent virtual models in LiteLLM           ║"
echo "║                                                              ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ==============================================================================
# Prerequisites Check
# ==============================================================================

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check curl
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed.${NC}"
    echo "Please install curl."
    exit 1
fi

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    echo "Please install git."
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"

# ==============================================================================
# GPU Detection
# ==============================================================================

detect_gpu() {
    if command -v nvidia-smi &> /dev/null && nvidia-smi & grep -q "Driver Version" &> /dev/null; then
        echo "nvidia"
    elif [ -d "/sys/module/amdgpu" ] || lspci 2>/dev/null | grep -qi "amd.*vga\|amd.*display" &> /dev/null; then
        echo "amd"
    else
        echo "cpu"
    fi
}

GPU_MODE=$(detect_gpu)
echo -e "${GREEN}✓ Detected GPU: ${GPU_MODE}${NC}"

# ==============================================================================
# Clone Repository
# ==============================================================================

REPO_URL="https://github.com/heretek-ai/heretek-openclaw.git"
INSTALL_DIR="heretek-openclaw"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Updating existing installation...${NC}"
    cd "$INSTALL_DIR"
    git pull
else
    echo -e "${YELLOW}Cloning Heretek OpenClaw...${NC}"
    git clone "$REPO_URL"
    cd "$INSTALL_DIR"
fi

# ==============================================================================
# Generate .env File
# ==============================================================================

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env
    
    # Prompt for API keys
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════"
    echo "  API Key Configuration"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${NC}"
    
    # MiniMax API Key
    read -p "MiniMax API Key (required): " MINIMAX_KEY
    if [ -z "$MINIMAX_KEY" ]; then
        echo -e "${RED}Error: MiniMax API key is required.${NC}"
        exit 1
    fi
    sed -i "s/your-minimax-key-here/${MINIMAX_KEY}/" .env
    
    # z.ai API Key
    read -p "z.ai API Key (optional, press Enter to skip): " ZAI_KEY
    if [ -n "$ZAI_KEY" ]; then
        ZAI_KEY=""
    fi
    sed -i "s/your-zai-key-here/${ZAI_KEY}/" .env
    
    # Generate secure keys
    MASTER_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 8 | echo "master-key-$(date +%s | head -c 10 | cut -c1-8 -d -1-2,3)
    SALT_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 8 | echo "salt-key-$(date +%s | head -c 10 | cut -c1-8 -d,1,2,3)
    
    sed -i "s/heretek-master-key-change-me/${MASTER_KEY}/" .env
    sed -i "s/heretek-salt-change-me/${SALT_KEY}/" .env
    
    # Set GPU mode
    sed -i "s/cpu/${GPU_MODE}/" .env
    
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# ==============================================================================
# Create Init Directory
# ==============================================================================

mkdir -p init

cp init/pgvector-init.sql init/ 2>/dev/null || true

# ==============================================================================
# Pull Docker Images
# ==============================================================================

echo -e "${YELLOW}Pulling Docker images...${NC}"
docker compose pull

echo -e "${GREEN}✓ Images pulled${NC}"

# ==============================================================================
# Start Core Services
# ==============================================================================

echo -e "${YELLOW}Starting core services...${NC}"
docker compose up -d postgres redis

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 15

# ==============================================================================
# Start Ollama
# ==============================================================================

echo -e "${YELLOW}Starting Ollama...${NC}"
docker compose up -d ollama

# Wait for Ollama to be ready
sleep 10

# Pull embedding model
echo -e "${YELLOW}Pulling embedding model (nomic-embed-text-v2-moe)...${NC}"
docker exec heretek-ollama ollama pull nomic-embed-text-v2-moe

# ==============================================================================
# Start LiteLLM
# ==============================================================================

echo -e "${YELLOW}Starting LiteLLM Gateway...${NC}"
docker compose up -d litellm

# Wait for LiteLLM to be healthy
echo -e "${YELLOW}Waiting for LiteLLM to be healthy...${NC}"
sleep 30

# ==============================================================================
# Start Agent Services
# ==============================================================================

echo -e "${YELLOW}Starting agent services...${NC}"
docker compose up -d steward alpha beta charlie examiner explorer sentinel coder

# Wait for agents to be healthy
sleep 20

# ==============================================================================
# Verify Installation
# ==============================================================================

echo -e "${YELLOW}Verifying installation...${NC}"

# Check LiteLLM health
if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ LiteLLM Gateway is healthy${NC}"
else
    echo -e "${RED}✗ LiteLLM Gateway health check failed${NC}"
fi

# Check Ollama health
if curl -sf http://localhost:11434/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama is healthy${NC}"
else
    echo -e "${RED}✗ Ollama health check failed${NC}"
fi

# ==============================================================================
# Print Success Message
# ==============================================================================

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           Heretek OpenClaw — Installation Complete!                ║"
echo "║                                                              ║"
echo "╠════════════════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Services:                                                    ║"
echo "║    LiteLLM Gateway:  http://localhost:4000                        ║"
echo "║    LiteLLM UI:       http://localhost:4000/ui                     ║"
echo "║    PostgreSQL:       localhost:5432                                ║"
echo "║    Redis:            localhost:6379                                ║"
echo "║    Ollama:           http://localhost:11434                       ║"
echo "║                                                              ║"
echo "║  Agents (Passthrough Endpoints):                              ║"
echo "║    Steward:    http://localhost:8001  → agent/steward            ║"
echo "║    Alpha:      http://localhost:8002  → agent/alpha              ║"
echo "║    Beta:       http://localhost:8003  → agent/beta               ║"
echo "║    Charlie:    http://localhost:8004  → agent/charlie            ║"
echo "║    Examiner:   http://localhost:8005  → agent/examiner           ║"
echo "║    Explorer:   http://localhost:8006  → agent/explorer           ║"
echo "║    Sentinel:   http://localhost:8007  → agent/sentinel           ║"
echo "║    Coder:      http://localhost:8008  → agent/coder              ║"
echo "║                                                              ║"
echo "║  Configuration:                                               ║"
echo "║    GPU Mode:        ${GPU_MODE}                                      ║"
echo "║    Primary Model:   MiniMax M2.7                                  ║"
echo "║    Failover Model:  z.ai GLM-5                                    ║"
echo "║    Embedding:       nomic-embed-text-v2-moe                      ║"
echo "║                                                              ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ==============================================================================
# Print Useful Commands
# ==============================================================================

echo -e "${CYAN}"
echo "Useful Commands:"
echo "  View logs:       docker compose logs -f"
echo "  Stop services:   docker compose down"
echo "  Restart:         docker compose restart"
echo "  Status:          docker compose ps"
echo -e "${NC}"
