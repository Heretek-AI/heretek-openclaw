# Docker Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Docker Compose Configuration](#docker-compose-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Service Management](#service-management)
6. [Troubleshooting](#troubleshooting)
7. [Related Documents](#related-documents)

---

## Overview

This guide covers Docker-based deployment of Heretek OpenClaw using Docker Compose for container orchestration.

---

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 16+ GB RAM recommended
- 50+ GB SSD storage

---

## Docker Compose Configuration

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **litellm** | 4000 | LLM gateway with model routing |
| **postgres** | 5432 | Vector database with pgvector |
| **redis** | 6379 | Caching layer |
| **ollama** | 11434 | Local LLM/embeddings |
| **websocket-bridge** | 3002-3003 | WebSocket bridge (legacy) |
| **web** | 3000 | Optional web dashboard |

### docker-compose.yml

```yaml
version: '3.8'

services:
  litellm:
    image: ghcr.io/berriai/litellm:latest
    ports:
      - "4000:4000"
    environment:
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  postgres_data:
  redis_data:
  ollama_data:
```

---

## Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/Heretek-AI/heretek-openclaw.git
cd heretek-openclaw
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

### 3. Start Services

```bash
# Start all services
docker compose up -d

# Verify services
docker compose ps

# View logs
docker compose logs -f
```

### 4. Verify Services

```bash
# Check LiteLLM
curl http://localhost:4000/health

# Check PostgreSQL
docker compose exec postgres psql -U openclaw -c "SELECT version();"

# Check Redis
docker compose exec redis redis-cli ping

# Check Ollama
curl http://localhost:11434/api/tags
```

---

## Service Management

### Start Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d litellm
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop specific service
docker compose stop litellm
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart postgres
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f litellm

# Last 100 lines
docker compose logs --tail=100 litellm
```

### Scale Services

```bash
# Scale LiteLLM (if configured for multiple instances)
docker compose up -d --scale litellm=3
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs litellm

# Check configuration
docker compose config

# Rebuild containers
docker compose up -d --force-recreate
```

### Port Conflicts

```bash
# Check port usage
sudo netstat -tlnp | grep docker

# Change port in docker-compose.yml
# Then restart
docker compose down
docker compose up -d
```

### Volume Issues

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect heretek-openclaw_postgres_data

# Remove volume (data loss!)
docker volume rm heretek-openclaw_postgres_data
```

### Resource Issues

```bash
# Check container resources
docker stats

# Check Docker daemon
sudo systemctl status docker
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Deployment Overview](./overview.md) | Deployment overview |
| [Local Deployment](./local.md) | Local deployment guide |
| [Kubernetes Deployment](./kubernetes.md) | K8s/Helm deployment |
| [Operations Guide](../operations/monitoring.md) | Operations documentation |

---

🦞 *The thought that never ends.*
