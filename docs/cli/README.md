# OpenClaw CLI Documentation

Welcome to the Heretek OpenClaw CLI documentation. This guide provides comprehensive information about the `openclaw` command-line tool.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Command Reference](#command-reference)
4. [Deployment Types](#deployment-types)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

## Getting Started

The OpenClaw CLI provides a unified interface for deploying and managing Heretek OpenClaw across different environments:

- **Docker Compose** - Local development
- **Bare Metal** - Direct Linux installation
- **Kubernetes** - Production clusters
- **Cloud** - AWS, GCP, Azure via Terraform

### Quick Start

```bash
# 1. Initialize configuration
openclaw init

# 2. Deploy
openclaw deploy

# 3. Check status
openclaw status

# 4. View health
openclaw health check
```

## Installation

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Install from Source

```bash
# Clone repository
git clone https://github.com/heretek/heretek-openclaw.git
cd heretek-openclaw/cli

# Install dependencies
npm install

# Link CLI globally
npm link
```

### Verify Installation

```bash
openclaw --version
openclaw --help
```

## Command Reference

### Overview

| Command | Description |
|---------|-------------|
| [`init`](COMMANDS.md#init) | Initialize deployment configuration |
| [`deploy`](COMMANDS.md#deploy) | Deploy OpenClaw |
| [`status`](COMMANDS.md#status) | Check deployment status |
| [`logs`](COMMANDS.md#logs) | View logs |
| [`stop`](COMMANDS.md#stop) | Stop deployment |
| [`backup`](COMMANDS.md#backup) | Manage backups |
| [`config`](COMMANDS.md#config) | Manage configuration |
| [`update`](COMMANDS.md#update) | Update OpenClaw |
| [`agents`](COMMANDS.md#agents) | Manage agents |
| [`health`](COMMANDS.md#health) | Run health checks |

### Global Options

```bash
openclaw --help      # Show help
openclaw --version   # Show version
```

## Deployment Types

### Docker Compose

Best for local development and testing.

```bash
openclaw init --type docker
openclaw deploy
```

**Requirements:**
- Docker 20+
- Docker Compose 2+

### Bare Metal

Direct installation on Linux servers.

```bash
openclaw init --type bare-metal
openclaw deploy
```

**Requirements:**
- Ubuntu 22.04+ or RHEL 8+
- Root/sudo access
- Node.js, PostgreSQL, Redis

### Kubernetes

Production-grade deployment using Helm or Kustomize.

```bash
openclaw init --type kubernetes
openclaw deploy --method helm
```

**Requirements:**
- kubectl
- Helm 3+ (for Helm deployments)
- Kubernetes 1.25+

### Cloud (AWS/GCP/Azure)

Cloud-native deployment using Terraform.

```bash
# AWS
openclaw init --type aws
openclaw deploy

# GCP
openclaw init --type gcp
openclaw deploy

# Azure
openclaw init --type azure
openclaw deploy
```

**Requirements:**
- Terraform 1+
- Cloud provider CLI (aws, gcloud, or az)
- Cloud provider credentials

## Configuration

### Configuration Files

| File | Description |
|------|-------------|
| `openclaw.json` | Main configuration |
| `.env` | Environment variables |
| `~/.openclaw/openclaw.json` | User configuration |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GATEWAY_URL` | Gateway endpoint | `http://localhost:18789` |
| `LITELLM_URL` | LiteLLM endpoint | `http://localhost:4000` |
| `LITELLM_MASTER_KEY` | LiteLLM API key | - |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `REDIS_HOST` | Redis host | `localhost` |

### Configuration Guide

See [CONFIGURATION.md](CONFIGURATION.md) for detailed configuration options.

## Usage Examples

See [EXAMPLES.md](EXAMPLES.md) for common usage patterns and examples.

## Troubleshooting

### Common Issues

#### Command Not Found

```bash
# Ensure CLI is installed
npm install -g @heretek/openclaw-cli

# Or run directly from source
node cli/bin/openclaw.js
```

#### Permission Denied

```bash
# Fix npm global permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

#### Docker Connection Failed

```bash
# Ensure Docker is running
docker ps

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Kubernetes Connection Failed

```bash
# Check kubeconfig
kubectl config current-context

# Update context if needed
kubectl config use-context your-context
```

### Getting Help

```bash
# General help
openclaw --help

# Command-specific help
openclaw deploy --help
openclaw backup --help
```

### Logs

```bash
# View CLI debug logs
DEBUG=openclaw:* openclaw deploy

# View service logs
openclaw logs gateway
openclaw logs litellm
```

## Additional Resources

- [Main Documentation](../README.md)
- [Deployment Guides](../deployment/)
- [Operations Guide](../operations/)
- [GitHub Issues](https://github.com/heretek/heretek-openclaw/issues)
