# Deployment Guide Overview

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [Quick Start](#quick-start)
5. [Related Documents](#related-documents)

---

## Overview

This guide provides comprehensive deployment instructions for the Heretek OpenClaw stack across different environments.

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Disk** | 20 GB | 50+ GB SSD |
| **Docker** | 20.10+ | Latest stable |
| **Node.js** | 18+ | 20+ LTS |

### Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git
```

### API Keys Required

| Provider | Purpose | Get Key |
|----------|---------|---------|
| **MiniMax** | Primary LLM | https://platform.minimaxi.com |
| **z.ai** | Failover LLM | https://platform.z.ai |
| **(Optional) Langfuse** | Observability | https://cloud.langfuse.com |

---

## Deployment Options

| Option | Description | Best For | Documentation |
|--------|-------------|----------|---------------|
| **Local** | Single-server deployment | Development, testing | [Local Deployment](./local.md) |
| **Docker** | Container-based deployment | Production, staging | [Docker Deployment](./docker.md) |
| **Kubernetes** | K8s/Helm deployment | Enterprise, scaling | [Kubernetes Deployment](./kubernetes.md) |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw

# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env

# Start Docker services
docker compose up -d

# Install OpenClaw Gateway
curl -fsSL https://openclaw.ai/install.sh | bash

# Deploy agents
./agents/deploy-agent.sh steward orchestrator
./agents/deploy-agent.sh alpha triad
# ... (repeat for all 11 agents)

# Verify installation
docker compose ps
openclaw gateway status
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Local Deployment](./local.md) | Local deployment guide |
| [Docker Deployment](./docker.md) | Docker deployment guide |
| [Kubernetes Deployment](./kubernetes.md) | K8s/Helm deployment |
| [Operations Guide](../operations/monitoring.md) | Operations documentation |

---

🦞 *The thought that never ends.*
