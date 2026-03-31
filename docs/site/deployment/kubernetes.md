# Kubernetes/Helm Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Helm Chart Structure](#helm-chart-structure)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Service Management](#service-management)
7. [Scaling](#scaling)
8. [Troubleshooting](#troubleshooting)
9. [Related Documents](#related-documents)

---

## Overview

This guide covers Kubernetes deployment using Helm charts for enterprise-grade orchestration of Heretek OpenClaw.

---

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- kubectl configured
- Storage class configured
- GPU support (optional, for Ollama)

---

## Helm Chart Structure

```
charts/openclaw/
├── Chart.yaml           # Chart metadata
├── values.yaml          # Default values
├── README.md            # Chart documentation
└── templates/
    ├── _helpers.tpl     # Template helpers
    ├── secrets.yaml     # Kubernetes secrets
    ├── configmap.yaml   # ConfigMaps
    ├── litellm-deployment.yaml
    ├── litellm-service.yaml
    ├── postgresql-statefulset.yaml
    ├── postgresql-service.yaml
    ├── redis-statefulset.yaml
    ├── redis-service.yaml
    ├── ollama-statefulset.yaml
    ├── ollama-service.yaml
    ├── gateway-deployment.yaml
    ├── gateway-service.yaml
    ├── ingress.yaml
    └── servicemonitor.yaml
```

---

## Configuration

### values.yaml

```yaml
# Global settings
global:
  namespace: openclaw
  imagePullSecrets: []

# LiteLLM configuration
litellm:
  replicaCount: 1
  image:
    repository: ghcr.io/berriai/litellm
    tag: latest
  resources:
    limits:
      cpu: 2
      memory: 4Gi
    requests:
      cpu: 1
      memory: 2Gi
  service:
    type: ClusterIP
    port: 4000

# PostgreSQL configuration
postgresql:
  replicaCount: 1
  image:
    repository: pgvector/pgvector
    tag: pg16
  persistence:
    enabled: true
    size: 50Gi
  resources:
    limits:
      cpu: 2
      memory: 4Gi

# Redis configuration
redis:
  replicaCount: 1
  image:
    repository: redis
    tag: 7-alpine
  persistence:
    enabled: true
    size: 10Gi

# Ollama configuration
ollama:
  replicaCount: 1
  image:
    repository: ollama/ollama
    tag: latest
  gpu:
    enabled: false
    type: nvidia
  persistence:
    enabled: true
    size: 100Gi

# Gateway configuration
gateway:
  replicaCount: 1
  image:
    repository: heretek/openclaw-gateway
    tag: latest
  resources:
    limits:
      cpu: 4
      memory: 8Gi

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: openclaw.example.com
      paths:
        - path: /
          pathType: Prefix
```

### secrets.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openclaw-secrets
type: Opaque
stringData:
  litellm-master-key: "${LITELLM_MASTER_KEY}"
  postgres-password: "${POSTGRES_PASSWORD}"
  minimax-api-key: "${MINIMAX_API_KEY}"
  zai-api-key: "${ZAI_API_KEY}"
```

---

## Deployment

### 1. Add Helm Repository

```bash
# Add Heretek Helm repository
helm repo add heretek https://heretek-ai.github.io/helm-charts
helm repo update
```

### 2. Create Namespace

```bash
kubectl create namespace openclaw
```

### 3. Create Secrets

```bash
# Create secrets from environment
kubectl create secret generic openclaw-secrets \
  --from-literal=litellm-master-key="$LITELLM_MASTER_KEY" \
  --from-literal=postgres-password="$POSTGRES_PASSWORD" \
  --from-literal=minimax-api-key="$MINIMAX_API_KEY" \
  --from-literal=zai-api-key="$ZAI_API_KEY" \
  -n openclaw
```

### 4. Deploy Chart

```bash
# Deploy with default values
helm install openclaw charts/openclaw -n openclaw

# Deploy with custom values
helm install openclaw charts/openclaw \
  -n openclaw \
  -f custom-values.yaml
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n openclaw

# Check services
kubectl get svc -n openclaw

# View logs
kubectl logs -n openclaw deployment/openclaw-litellm
```

---

## Service Management

### Upgrade Release

```bash
# Upgrade with new values
helm upgrade openclaw charts/openclaw \
  -n openclaw \
  -f new-values.yaml
```

### Rollback

```bash
# List release history
helm history openclaw -n openclaw

# Rollback to previous revision
helm rollback openclaw -n openclaw

# Rollback to specific revision
helm rollback openclaw 1 -n openclaw
```

### Uninstall

```bash
# Uninstall release
helm uninstall openclaw -n openclaw

# Uninstall and purge data
helm uninstall openclaw -n openclaw --purge
```

---

## Scaling

### Horizontal Pod Autoscaler

```yaml
# In values.yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

### Manual Scaling

```bash
# Scale LiteLLM deployment
kubectl scale deployment openclaw-litellm \
  --replicas=3 \
  -n openclaw
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n openclaw

# Check logs
kubectl logs <pod-name> -n openclaw

# Check events
kubectl get events -n openclaw --sort-by='.lastTimestamp'
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints openclaw-litellm -n openclaw

# Test service internally
kubectl run test --rm -it --image=busybox --restart=Never \
  -- wget -qO- http://openclaw-litellm:4000/health
```

### PVC Issues

```bash
# Check PVC status
kubectl get pvc -n openclaw

# Describe PVC
kubectl describe pvc <pvc-name> -n openclaw
```

### Resource Issues

```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n openclaw
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Deployment Overview](./overview.md) | Deployment overview |
| [Local Deployment](./local.md) | Local deployment guide |
| [Docker Deployment](./docker.md) | Docker deployment guide |
| [Operations Guide](../operations/monitoring.md) | Operations documentation |

---

🦞 *The thought that never ends.*
