# Monitoring Stack

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Deployment](#deployment)
5. [Metrics Collected](#metrics-collected)
6. [Alerting](#alerting)
7. [Dashboards](#dashboards)
8. [Integration](#integration)
9. [Troubleshooting](#troubleshooting)
10. [Related Documents](#related-documents)

---

## Overview

The Heretek OpenClaw Monitoring Stack provides comprehensive observability using Prometheus for metrics collection and Grafana for visualization.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Heretek OpenClaw Monitoring Stack               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Metrics Collection                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   Node      │  │   cAdvisor  │  │  Blackbox   │      │   │
│  │  │  Exporter   │  │  (Container)│  │  Exporter   │      │   │
│  │  │   :9100     │  │   :8080     │  │   :9115     │      │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │   │
│  │         │                │                │               │   │
│  │  ┌──────┴────────────────┴────────────────┴──────┐       │   │
│  │  │              Prometheus (:9090)                │       │   │
│  │  │         (Metrics Storage & Alerting)           │       │   │
│  │  └──────────────────────┬────────────────────────┘       │   │
│  └─────────────────────────┼─────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐   │
│  │                    Grafana Dashboard (:3001)               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   Agent     │  │   System    │  │    LLM      │      │   │
│  │  │  Collective │  │  Resources  │ │   Metrics   │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### Exporters

| Exporter | Port | Purpose |
|----------|------|---------|
| **Node Exporter** | 9100 | System-level metrics |
| **cAdvisor** | 8080 | Container metrics |
| **Redis Exporter** | 9121 | Redis metrics |
| **Postgres Exporter** | 9187 | PostgreSQL metrics |
| **Blackbox Exporter** | 9115 | Endpoint probing |

### Core Services

| Service | Port | Purpose |
|---------|------|---------|
| **Prometheus** | 9090 | Metrics storage, alerting |
| **Grafana** | 3001 | Dashboards, visualization |

---

## Deployment

### Quick Start

```bash
# Deploy monitoring stack
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Check status
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml ps

# View logs
docker compose logs -f prometheus
docker compose logs -f grafana
```

### Environment Variables

```bash
# Monitoring Stack Ports
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
NODE_EXPORTER_PORT=9100
CADVISOR_PORT=8080

# Grafana Admin Credentials
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<secure-password>
```

---

## Metrics Collected

### Agent Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `openclaw_agent_status` | Agent online/offline status | Gauge |
| `openclaw_agent_heartbeat_age_seconds` | Seconds since last heartbeat | Gauge |
| `openclaw_agent_health_score` | Agent health score (0-1) | Gauge |
| `openclaw_agent_messages_processed_total` | Total messages processed | Counter |

### System Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `node_cpu_seconds_total` | CPU time by mode | Counter |
| `node_memory_MemAvailable_bytes` | Available memory | Gauge |
| `node_filesystem_avail_bytes` | Available filesystem space | Gauge |

### Container Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `container_cpu_usage_seconds_total` | Container CPU usage | Counter |
| `container_memory_usage_bytes` | Container memory usage | Gauge |

### Database Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `pg_stat_activity_count` | Active connections | Gauge |
| `pg_stat_database_deadlocks` | Deadlock count | Counter |

### Redis Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `redis_memory_used_bytes` | Memory used by Redis | Gauge |
| `redis_connected_clients` | Connected clients | Gauge |
| `redis_ops_sec` | Operations per second | Gauge |

---

## Alerting

### Alert Categories

| Category | Alerts | Severity |
|----------|--------|----------|
| **System Resources** | High CPU, High Memory, Disk Full | Warning/Critical |
| **Container Resources** | Container OOM, High CPU/Memory | Warning/Critical |
| **Service Health** | LiteLLM Down, PostgreSQL Down | Critical |
| **Agent Health** | Agent Offline, Triad Node Down | Warning/Critical |
| **LLM Usage** | High Token Rate, High Error Rate | Warning |

### Viewing Alerts

1. **Grafana**: Navigate to **Alerting** → **Alert Rules**
2. **Prometheus**: Navigate to **Alerts** tab
3. **Console**: Check Prometheus logs

### Alert Routing

Configure in Grafana:
1. Navigate to **Alerting** → **Contact Points**
2. Add notification channels (Email, Slack, Discord)
3. Create notification policies

---

## Dashboards

### Accessing Grafana

1. Open http://localhost:3001
2. Login with admin credentials
3. Navigate to **Heretek OpenClaw** folder
4. Select **Agent Collective Dashboard**

### Available Dashboards

| Dashboard | Description |
|-----------|-------------|
| **Agent Collective** | Agent status, health, messages |
| **System Resources** | CPU, memory, disk, network |
| **LLM Metrics** | Token usage, latency, costs |
| **Database Health** | PostgreSQL and Redis metrics |

---

## Integration with Langfuse

### Complementary Roles

| Aspect | Prometheus/Grafana | Langfuse |
|--------|-------------------|----------|
| **Focus** | Infrastructure Metrics | LLM Traces & Costs |
| **Data Type** | Time-series metrics | Traces, Spans, Events |
| **Use Case** | Resource monitoring | LLM debugging |

### Correlation

Use Grafana to correlate infrastructure metrics with Langfuse observations:

1. **High Latency**: Check Prometheus for CPU spikes, Langfuse for trace breakdown
2. **Error Rate**: Check Prometheus for service health, Langfuse for error traces
3. **Cost Anomalies**: Check Prometheus for request spikes, Langfuse for cost analysis

---

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check configuration
docker compose exec prometheus cat /etc/prometheus/prometheus.yml

# Check target status in Prometheus UI (Status → Targets)
```

### Grafana Cannot Connect to Prometheus

1. Verify both containers are on the same network
2. Check Prometheus is healthy: `docker compose ps prometheus`
3. Verify datasource URL is `http://prometheus:9090`

### High Memory Usage

1. Reduce scrape interval in prometheus.yml
2. Reduce retention period
3. Add metric relabeling to drop unnecessary metrics

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Operations Overview](./overview.md) | Operations overview |
| [Backup Procedures](./backup.md) | Backup documentation |
| [Troubleshooting](./troubleshooting.md) | Troubleshooting guide |
| [Langfuse Integration](../operations/LANGFUSE_OBSERVABILITY.md) | Langfuse documentation |

---

🦞 *The thought that never ends.*
