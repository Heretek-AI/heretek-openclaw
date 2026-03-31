# Heretek OpenClaw Monitoring Stack (P2-3)

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

The Heretek OpenClaw Monitoring Stack provides comprehensive observability for the agent collective using Prometheus for metrics collection and Grafana for visualization. This implementation addresses the infrastructure gap identified in [`docs/GAP_ANALYSIS_REPORT.md`](docs/GAP_ANALYSIS_REPORT.md:979) and [`docs/EXTERNAL_PROJECTS_GAP_ANALYSIS.md`](docs/EXTERNAL_PROJECTS_GAP_ANALYSIS.md:1433).

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Heretek OpenClaw Monitoring Stack                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Metrics Collection                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Node      │  │   cAdvisor  │  │  Blackbox   │              │   │
│  │  │  Exporter   │  │  (Container)│  │  Exporter   │              │   │
│  │  │   :9100     │  │   :8080     │  │   :9115     │              │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │   │
│  │         │                │                │                       │   │
│  │  ┌──────┴────────────────┴────────────────┴──────┐               │   │
│  │  │              Prometheus (:9090)                │               │   │
│  │  │         (Metrics Storage & Alerting)           │               │   │
│  │  └──────────────────────┬────────────────────────┘               │   │
│  └─────────────────────────┼─────────────────────────────────────────┘   │
│                            │                                             │
│  ┌─────────────────────────▼─────────────────────────────────────────┐   │
│  │                    Grafana Dashboard (:3001)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Agent     │  │   System    │  │    LLM      │              │   │
│  │  │  Collective │  │  Resources  │ │   Metrics   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Integration with Existing Services                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   Langfuse  │  │   LiteLLM   │  │   OpenClaw  │              │   │
│  │  │    (:3000)  │  │    (:4000)  │  │ Gateway     │              │   │
│  │  │             │  │             │  │  (:18789)   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Exporters

| Exporter | Port | Purpose | Metrics Collected |
|----------|------|---------|-------------------|
| **Node Exporter** | 9100 | System-level metrics | CPU, Memory, Disk, Network |
| **cAdvisor** | 8080 | Container metrics | Container CPU, Memory, Network |
| **Redis Exporter** | 9121 | Redis metrics | Memory, Connections, Keys |
| **Postgres Exporter** | 9187 | PostgreSQL metrics | Connections, Queries, Replication |
| **Blackbox Exporter** | 9115 | Endpoint probing | HTTP/TCP health checks |

### Core Services

| Service | Port | Purpose |
|---------|------|---------|
| **Prometheus** | 9090 | Metrics storage, alerting, PromQL queries |
| **Grafana** | 3001 | Dashboards, visualization, alerting |

---

## Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Existing Heretek OpenClaw stack running
- 4GB RAM available for monitoring stack
- 20GB disk space for metrics retention

### Quick Start

```bash
# Deploy monitoring stack alongside main services
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Check status
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml ps

# View logs
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml logs -f prometheus
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml logs -f grafana
```

### Environment Variables

Create or update `.env` file with monitoring-specific variables:

```bash
# Monitoring Stack Ports
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
NODE_EXPORTER_PORT=9100
CADVISOR_PORT=8080
REDIS_EXPORTER_PORT=9121
POSTGRES_EXPORTER_PORT=9187
BLACKBOX_EXPORTER_PORT=9115

# Grafana Admin Credentials
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<secure-password>
```

---

## Accessing Dashboards

### Grafana Dashboard

1. Open http://localhost:3001
2. Login with credentials from `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD`
3. Navigate to **Heretek OpenClaw** folder
4. Select **Agent Collective Dashboard**

### Prometheus UI

1. Open http://localhost:9090
2. Use **Graph** tab for ad-hoc queries
3. Use **Alerts** tab to view firing alerts
4. Use **Status** → **Targets** to verify scrape targets

---

## Metrics Collected

### Agent Metrics (OpenClaw Gateway)

| Metric | Description | Type |
|--------|-------------|------|
| `openclaw_agent_status` | Agent online/offline status | Gauge |
| `openclaw_agent_heartbeat_age_seconds` | Seconds since last heartbeat | Gauge |
| `openclaw_agent_health_score` | Agent health score (0-1) | Gauge |
| `openclaw_agent_messages_processed_total` | Total messages processed | Counter |
| `openclaw_agent_deliberations_total` | Total deliberation cycles | Counter |

### System Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `node_cpu_seconds_total` | CPU time by mode | Counter |
| `node_memory_MemAvailable_bytes` | Available memory | Gauge |
| `node_filesystem_avail_bytes` | Available filesystem space | Gauge |
| `node_network_receive_bytes_total` | Network received bytes | Counter |

### Container Metrics (cAdvisor)

| Metric | Description | Type |
|--------|-------------|------|
| `container_cpu_usage_seconds_total` | Container CPU usage | Counter |
| `container_memory_usage_bytes` | Container memory usage | Gauge |
| `container_network_receive_bytes_total` | Container network received | Counter |

### Database Metrics (PostgreSQL)

| Metric | Description | Type |
|--------|-------------|------|
| `pg_stat_activity_count` | Active connections | Gauge |
| `pg_stat_database_tup_fetched` | Rows fetched | Counter |
| `pg_stat_database_deadlocks` | Deadlock count | Counter |

### Cache Metrics (Redis)

| Metric | Description | Type |
|--------|-------------|------|
| `redis_memory_used_bytes` | Memory used by Redis | Gauge |
| `redis_connected_clients` | Connected clients | Gauge |
| `redis_ops_sec` | Operations per second | Gauge |

### LLM Metrics (LiteLLM)

| Metric | Description | Type |
|--------|-------------|------|
| `litellm_tokens_total` | Total tokens processed | Counter |
| `litellm_requests_total` | Total API requests | Counter |
| `litellm_request_duration_seconds` | Request latency | Histogram |
| `litellm_responses_total` | Total responses | Counter |

---

## Alerting

### Alerting Rules

Alerting rules are defined in [`monitoring/prometheus/rules/alerting-rules.yml`](monitoring/prometheus/rules/alerting-rules.yml).

#### Alert Categories

| Category | Alerts | Severity |
|----------|--------|----------|
| **System Resources** | High CPU, High Memory, Disk Full | Warning/Critical |
| **Container Resources** | Container OOM, High CPU/Memory | Warning/Critical |
| **Service Health** | LiteLLM Down, PostgreSQL Down, Redis Down | Critical |
| **Agent Health** | Agent Offline, Triad Node Down | Warning/Critical |
| **Database Health** | Connection Pool High, Replication Lag | Warning |
| **Redis Health** | Memory High, Connected Clients High | Warning/Critical |
| **LLM Usage** | High Token Rate, High Error Rate, High Latency | Warning |

### Viewing Alerts

1. **Grafana**: Navigate to **Alerting** → **Alert Rules**
2. **Prometheus**: Navigate to **Alerts** tab
3. **Console**: Check Prometheus logs for alert evaluations

### Alert Routing

Configure alert routing in Grafana:
1. Navigate to **Alerting** → **Contact Points**
2. Add notification channels (Email, Slack, Discord, Webhook)
3. Create notification policies for alert routing

---

## Integration with Langfuse Observability

### Complementary Roles

| Aspect | Prometheus/Grafana | Langfuse |
|--------|-------------------|----------|
| **Focus** | Infrastructure & System Metrics | LLM Traces & Costs |
| **Data Type** | Time-series metrics | Traces, Spans, Events |
| **Use Case** | Resource monitoring, alerting | LLM debugging, cost tracking |
| **Retention** | 30 days (configurable) | Indefinite (PostgreSQL) |

### Correlation

Use Grafana to correlate infrastructure metrics with Langfuse observations:

1. **High Latency Investigation**:
   - Check Prometheus for CPU/Memory spikes
   - Check Langfuse for trace-level latency breakdown

2. **Error Rate Analysis**:
   - Check Prometheus for service health
   - Check Langfuse for error traces

3. **Cost Anomalies**:
   - Check Prometheus for request rate spikes
   - Check Langfuse for cost-per-trace analysis

### Langfuse Dashboard Integration

Add Langfuse as a data source in Grafana for unified viewing:

1. Navigate to **Configuration** → **Data Sources**
2. Add Prometheus data source pointing to Langfuse metrics endpoint
3. Create panels for Langfuse-specific metrics

---

## Configuration Reference

### Prometheus Scrape Configuration

Located in [`monitoring/prometheus/prometheus.yml`](monitoring/prometheus/prometheus.yml):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'openclaw-gateway'
    static_configs:
      - targets: ['host.docker.internal:18789']
```

### Grafana Dashboard Configuration

Located in [`monitoring/grafana/dashboards/agent-collective-dashboard.json`](monitoring/grafana/dashboards/agent-collective-dashboard.json):

- Pre-configured with agent status panels
- System resource graphs
- LLM metrics visualization
- Alert summary widgets

---

## Maintenance

### Backup

```bash
# Backup Prometheus data
docker compose -f docker-compose.monitoring.yml exec prometheus \
  tar czf /tmp/prometheus-backup.tar.gz /prometheus

# Backup Grafana data
docker compose -f docker-compose.monitoring.yml exec grafana \
  tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
```

### Data Retention

- **Prometheus**: 30 days (configured in docker-compose.monitoring.yml)
- **Grafana**: Indefinite (dashboard configurations)

### Updates

```bash
# Pull latest images
docker compose -f docker-compose.monitoring.yml pull

# Restart with new images
docker compose -f docker-compose.monitoring.yml up -d
```

---

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check Prometheus configuration
docker compose -f docker-compose.monitoring.yml exec prometheus \
  cat /etc/prometheus/prometheus.yml

# Check target status in Prometheus UI
# Navigate to Status → Targets
```

### Grafana Cannot Connect to Prometheus

1. Verify both containers are on the same network
2. Check Prometheus is healthy: `docker compose ps prometheus`
3. Verify datasource URL is `http://prometheus:9090`

### High Memory Usage

1. Reduce scrape interval in prometheus.yml
2. Reduce retention period in docker-compose.monitoring.yml
3. Add metric relabeling to drop unnecessary metrics

---

## References

- [`docs/GAP_ANALYSIS_REPORT.md`](docs/GAP_ANALYSIS_REPORT.md:979) - P2 Initiative #8
- [`docs/EXTERNAL_PROJECTS_GAP_ANALYSIS.md`](docs/EXTERNAL_PROJECTS_GAP_ANALYSIS.md:1433) - Infrastructure Gaps
- [`docs/operations/LANGFUSE_OBSERVABILITY.md`](docs/operations/LANGFUSE_OBSERVABILITY.md) - Langfuse Integration
- [`docs/operations/monitoring-config.json`](docs/operations/monitoring-config.json) - Monitoring Thresholds
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

🦞 *The thought that never ends.*
