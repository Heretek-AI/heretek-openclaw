# Local Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Clone Repository](#step-1-clone-repository)
3. [Step 2: Deploy Infrastructure](#step-2-deploy-infrastructure)
4. [Step 3: Install Gateway](#step-3-install-gateway)
5. [Step 4: Configure Gateway](#step-4-configure-gateway)
6. [Step 5: Create Agent Workspaces](#step-5-create-agent-workspaces)
7. [Step 6: Install Plugins](#step-6-install-plugins)
8. [Step 7: Validate Deployment](#step-7-validate-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Related Documents](#related-documents)

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Disk** | 20 GB | 50+ GB SSD |

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- Git

---

## Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# Verify repository structure
ls -la
```

Expected output should show:
- `docker-compose.yml`
- `openclaw.json`
- `litellm_config.yaml`
- `.env.example`

---

## Step 2: Deploy Infrastructure

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### Required Environment Variables

```bash
# LiteLLM Gateway
LITELLM_MASTER_KEY=generate-a-secure-key-here
LITELLM_SALT_KEY=generate-another-secure-key

# Model Providers
MINIMAX_API_KEY=your_minimax_api_key
ZAI_API_KEY=your_zai_api_key

# Database
POSTGRES_USER=openclaw
POSTGRES_PASSWORD=generate-secure-db-password
POSTGRES_DB=openclaw

# Redis
REDIS_URL=redis://localhost:6379

# OpenClaw Gateway
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/agents
```

### Start Docker Services

```bash
# Deploy infrastructure
docker compose up -d

# Verify services
docker compose ps

# Check service health
curl http://localhost:4000/health
docker compose exec postgres psql -U openclaw -c "SELECT version();"
docker compose exec redis redis-cli ping
```

---

## Step 3: Install Gateway

```bash
# Install OpenClaw Gateway
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify installation
openclaw --version

# Initialize daemon
openclaw onboard --install-daemon

# Verify Gateway status
openclaw gateway status
```

### Expected Output

```
Gateway: Running
Version: v2026.3.28
Workspace: /root/.openclaw
Agents: 0 configured
Plugins: 0 loaded
Skills: 0 loaded
```

---

## Step 4: Configure Gateway

```bash
# Copy Gateway configuration
cp openclaw.json ~/.openclaw/openclaw.json

# Validate configuration
openclaw gateway validate

# Restart Gateway
openclaw gateway restart

# Verify configuration loaded
openclaw gateway status
```

### Expected Output

```
Gateway: Running
Version: v2026.3.28
Workspace: /root/.openclaw
Agents: 12 configured (main + 11 collective)
Plugins: 0 loaded
Skills: 0 loaded
```

---

## Step 5: Create Agent Workspaces

```bash
# Deploy each agent
./agents/deploy-agent.sh steward orchestrator
./agents/deploy-agent.sh alpha triad
./agents/deploy-agent.sh beta triad
./agents/deploy-agent.sh charlie triad
./agents/deploy-agent.sh examiner interrogator
./agents/deploy-agent.sh explorer scout
./agents/deploy-agent.sh sentinel guardian
./agents/deploy-agent.sh coder artisan
./agents/deploy-agent.sh dreamer visionary
./agents/deploy-agent.sh empath diplomat
./agents/deploy-agent.sh historian archivist

# Verify workspaces created
ls -la ~/.openclaw/agents/
```

### Expected Workspace Structure

Each agent workspace contains:
```
~/.openclaw/agents/steward/
├── SOUL.md          # Partnership protocol
├── IDENTITY.md      # Personality matrix
├── AGENTS.md        # Operational guidance
├── USER.md          # Human partner context
├── TOOLS.md         # Tool usage notes
└── session.jsonl    # Session data
```

---

## Step 6: Install Plugins

```bash
# Install consciousness plugin
cd plugins/openclaw-consciousness-plugin
npm install
npm link
openclaw plugins install @heretek-ai/openclaw-consciousness-plugin

# Install liberation plugin
cd ../openclaw-liberation-plugin
npm install
npm link
openclaw plugins install @heretek-ai/openclaw-liberation-plugin

# Verify plugins
openclaw plugins list
```

---

## Step 7: Validate Deployment

### Gateway Health Check

```bash
# Check gateway status
openclaw gateway status

# Run comprehensive health check
./scripts/health-check.sh
```

### Agent Health Check

```bash
# Check each agent
for agent in steward alpha beta charlie examiner explorer sentinel coder dreamer empath historian; do
  echo "=== $agent ==="
  openclaw agent status $agent
done
```

---

## Troubleshooting

### Gateway Won't Start

```bash
# Check installation
openclaw gateway status

# Reinstall if needed
openclaw gateway reinstall

# Check logs
journalctl -u openclaw-gateway -f
```

### Docker Services Not Starting

```bash
# Check Docker daemon
sudo systemctl status docker

# Check service logs
docker compose logs litellm
docker compose logs postgres

# Restart all services
docker compose down
docker compose up -d
```

### Port Conflicts

```bash
# Check if ports are in use
sudo netstat -tlnp | grep -E '4000|5432|6379|18789'

# Kill conflicting process
sudo kill -9 <PID>
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Deployment Overview](./overview.md) | Deployment overview |
| [Docker Deployment](./docker.md) | Docker deployment guide |
| [Kubernetes Deployment](./kubernetes.md) | K8s/Helm deployment |
| [Operations Guide](../operations/monitoring.md) | Operations documentation |

---

🦞 *The thought that never ends.*
