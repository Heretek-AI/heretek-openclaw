# LiteLLM Observability Integration for OpenClaw

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** 2.0+

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [LiteLLM WebUI](#litellm-webui)
4. [Health Dashboard Integration](#health-dashboard-integration)
5. [Prometheus Metrics](#prometheus-metrics)
6. [Budget Management](#budget-management)
7. [Configuration](#configuration)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This integration leverages LiteLLM's native observability features to provide comprehensive monitoring for the Heretek OpenClaw multi-agent system:

### Features

| Feature | Description |
|---------|-------------|
| **Cost Tracking** | Per-model, per-agent, per-key cost breakdown |
| **Token Analytics** | Input/output token counts and trends |
| **Latency Monitoring** | P50, P95, P99 latency percentiles |
| **Budget Management** | Budget limits, alerts, and utilization tracking |
| **Request Analytics** | Success/failure rates, request counts |
| **Prometheus Export** | Metrics for external monitoring systems |

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Observability Stack                            │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  LiteLLM WebUI  │    │ Health Dashboard│                     │
│  │  (Built-in)     │    │ (React/Express)  │                     │
│  │                 │    │                  │                     │
│  │  - Cost Reports │    │  - Service Health│                     │
│  │  - Key Mgmt     │    │  - Agent Status  │                     │
│  │  - Budget Mgmt  │    │  - LiteLLM Metrics│                    │
│  │  - Spend Analytics│  │  - Model Usage   │                     │
│  └────────┬────────┘    └────────┬─────────┘                     │
│           │                      │                                │
│           └──────────┬───────────┘                                │
│                      │                                            │
│           ┌──────────▼───────────┐                               │
│           │   LiteLLM Proxy      │                               │
│           │   :4000              │                               │
│           │                      │                               │
│           │  - /spend endpoints  │                               │
│           │  - /metrics (Prom)   │                               │
│           │  - /budget endpoints │                               │
│           └──────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Data Flow

1. **LLM Requests** → LiteLLM Proxy tracks all requests
2. **Metrics Collection** → Collector polls every 30 seconds
3. **Data Aggregation** → Costs, tokens, latency aggregated
4. **Dashboard Display** → React components show real-time data
5. **Alert Generation** → Budget warnings/critical alerts

### Integration Points

| Component | Integration Method |
|-----------|-------------------|
| LiteLLM Proxy | HTTP API with master key auth |
| Prometheus Metrics | `/metrics` endpoint (Prometheus format) |
| Spend Data | `/spend/*` endpoints (JSON) |
| Budget Data | `/budget/*` endpoints (JSON) |
| Health Dashboard | Express API proxy |

---

## LiteLLM WebUI

### Access

The LiteLLM WebUI is accessible at `http://localhost:4000/ui`

**Authentication:** Requires `LITELLM_MASTER_KEY` header

### Features

#### Spend Analytics
- Total spend (today/week/month)
- Spend by API key
- Spend by user
- Spend by model
- Spend by endpoint (agent)

#### Token Usage
- Total tokens consumed
- Input vs output breakdown
- Tokens by model
- Usage trends over time

#### Budget Management
- Create/edit/delete budgets
- Set budget limits per key/user
- Configure alert thresholds
- View utilization percentages

#### Key Management
- Generate new API keys
- Set key-specific budgets
- Revoke compromised keys
- View key usage statistics

#### Reports
- Export spend data (CSV)
- Generate cost reports
- Filter by date range
- Group by model/agent/key

---

## Health Dashboard Integration

### Components

#### `LiteLLMMetrics.tsx`
Main metrics display component showing:
- Today's/week's/month's spend
- Total tokens used
- Latency percentiles (P50, P95, P99)
- Request success/failure counts
- Gateway health status
- Active budget alerts

#### `ModelUsage.tsx`
Model-specific analytics:
- Cost breakdown by model (bar chart)
- Top model identification
- Active models count
- Token usage summary

#### `BudgetStatus.tsx`
Budget tracking and alerts:
- Total budget vs spent
- Per-budget utilization
- Status indicators (healthy/warning/exceeded)
- Alert list with severity

### Data Hook

`useLiteLLMData.ts` provides:
- Automatic polling (30s interval)
- Cached data with timestamps
- Error handling
- Refresh functionality
- Utility functions (formatting)

### API Routes

```javascript
// dashboard/api/litellm-api.js
GET /api/litellm/health          // Health check
GET /api/litellm/metrics         // Comprehensive metrics
GET /api/litellm/spend           // Spend data
GET /api/litellm/spend/models    // By model
GET /api/litellm/spend/endpoints // By agent
GET /api/litellm/budgets         // Budget status
GET /api/litellm/models/usage    // Model statistics
GET /api/litellm/agents/usage    // Agent statistics
GET /api/litellm/prometheus      // Raw Prometheus metrics
```

---

## Prometheus Metrics

### Available Metrics

LiteLLM exposes the following Prometheus-format metrics at `/metrics`:

#### Cost Metrics
```
litellm_cost_dollars_total{model="agent/steward"} 12.45
litellm_cost_dollars_total{model="agent/alpha"} 8.32
litellm_cost_dollars_total{model="minimax/MiniMax-M2.7"} 25.67
```

#### Token Metrics
```
litellm_tokens_total{model="agent/steward",type="input"} 125000
litellm_tokens_total{model="agent/steward",type="output"} 45000
litellm_tokens_total{model="minimax/MiniMax-M2.7",type="input"} 500000
```

#### Request Metrics
```
litellm_request_count_total{model="agent/steward",status="success"} 1250
litellm_request_count_total{model="agent/steward",status="failure"} 12
litellm_request_count_total{model="minimax/MiniMax-M2.7",status="success"} 5000
```

#### Latency Metrics
```
litellm_request_latency_seconds{model="agent/steward",le="0.5"} 800
litellm_request_latency_seconds{model="agent/steward",le="1.0"} 1100
litellm_request_latency_seconds{model="agent/steward",le="5.0"} 1250
```

#### Failure Metrics
```
litellm_deployment_failure_responses{model="agent/steward"} 5
litellm_deployment_failure_responses{model="minimax/MiniMax-M2.7"} 15
```

### Scraping Configuration

For Prometheus server:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'litellm'
    static_configs:
      - targets: ['litellm:4000']
    metrics_path: '/metrics'
```

For Grafana:
- Add Prometheus datasource
- Import dashboard from JSON
- Query metrics using PromQL

---

## Budget Management

### Configuration in LiteLLM

Budgets can be configured via:

1. **LiteLLM WebUI** - Navigate to Budgets section
2. **API** - POST to `/budget/new`
3. **Config File** - `budget_settings` in `litellm_config.yaml`

### Budget Settings

```yaml
# litellm_config.yaml
budget_settings:
  enabled: true
  
  # Per-agent budgets (daily token limits)
  agent_budgets:
    agent/steward: 1000000    # tokens/day
    agent/alpha: 500000
    agent/beta: 500000
    agent/coder: 1000000
  
  # Global budget
  global_budget: 5000000
  
  # Alert thresholds
  alert_threshold: 0.8  # 80% triggers warning
```

### Alert Types

| Alert | Severity | Trigger |
|-------|----------|---------|
| `budget_warning` | Warning | Utilization >= 80% |
| `budget_exceeded` | Critical | Utilization >= 100% |

### Alert Actions

- Dashboard displays alert banner
- Red/yellow status indicators
- Email notifications (if configured)
- Slack webhook (if configured)

---

## Configuration

### Environment Variables

```bash
# LiteLLM Configuration
LITELLM_URL=http://litellm:4000
LITELLM_MASTER_KEY=sk-1234567890abcdef

# Dashboard Configuration
DASHBOARD_PORT=18790
DASHBOARD_HOST=0.0.0.0

# Langfuse (for tracing)
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=http://langfuse:3000
```

### LiteLLM Config Updates

```yaml
# litellm_config.yaml
litellm_settings:
  success_callback: ["prometheus", "langfuse", "log_cost"]
  
observability:
  prometheus:
    enabled: true
    port: 4000  # Exposed on main port
  
  langfuse:
    enabled: true
    public_key: os.environ/LANGFUSE_PUBLIC_KEY
    secret_key: os.environ/LANGFUSE_SECRET_KEY
    host: os.environ/LANGFUSE_HOST
  
  cost_tracking:
    enabled: true
    track_agent_costs: true
    alert_threshold_warning: 0.8
    alert_threshold_critical: 1.0
```

### Dashboard Config

```yaml
# dashboard/config/dashboard-config.yaml
litellm:
  enabled: true
  url: "http://litellm:4000"
  master_key_env: "LITELLM_MASTER_KEY"
  collection_interval: 30000
  
  metrics:
    - spend
    - tokens
    - latency
    - request_counts
    - budget_status
```

---

## API Reference

### LiteLLM Proxy API

All endpoints require `Authorization: Bearer {LITELLM_MASTER_KEY}`

#### Get Total Spend
```
GET /spend
Response: { spend: { today: 12.45, this_week: 67.89, this_month: 245.00 } }
```

#### Get Spend by Keys
```
GET /spend/keys
Response: { keys: [{ key: "sk-xxx", spend: 45.67, ... }] }
```

#### Get Spend by Users
```
GET /spend/users
Response: { users: [{ user: "user@id", spend: 23.45, ... }] }
```

#### Get Spend by Models
```
GET /spend/models
Response: { models: [{ model: "agent/steward", spend: 12.34, ... }] }
```

#### Get Spend by Endpoints
```
GET /spend/endpoints
Response: { endpoints: [{ endpoint: "agent/steward", spend: 12.34, ... }] }
```

#### Get Budget List
```
GET /budget/list
Response: { budgets: [{ key: "sk-xxx", max_budget: 100, spent: 45, ... }] }
```

#### Get Budget Info
```
GET /budget/info?key={key}
Response: { key: "sk-xxx", max_budget: 100, spent: 45, utilization: 45.0 }
```

#### Get Prometheus Metrics
```
GET /metrics
Response: (Prometheus text format)
# HELP litellm_cost_dollars_total
# TYPE litellm_cost_dollars_total counter
litellm_cost_dollars_total{model="agent/steward"} 12.45
```

---

## Troubleshooting

### Connection Issues

**Problem:** Dashboard shows "Failed to load LiteLLM metrics"

**Solutions:**
```bash
# Check LiteLLM is running
curl http://litellm:4000/health

# Verify master key
curl -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
     http://litellm:4000/spend

# Check network connectivity
docker compose ps
docker compose logs litellm
```

### Missing Metrics

**Problem:** Metrics show 0 or N/A

**Solutions:**
1. Verify `success_callback` includes `"prometheus"` and `"log_cost"`
2. Check LiteLLM has processed requests
3. Wait for next collection cycle (30s)
4. Manually refresh dashboard

### Budget Alerts Not Working

**Problem:** No alerts showing when budget exceeded

**Solutions:**
1. Verify budgets configured in LiteLLM
2. Check `budget_settings.enabled: true`
3. Ensure spend data is being collected
4. Review LiteLLM logs for budget errors

### High Latency

**Problem:** Dashboard slow to load

**Solutions:**
1. Increase collection interval (default 30s)
2. Check LiteLLM response times
3. Verify network between services
4. Consider caching optimization

### Prometheus Metrics Parsing Errors

**Problem:** Metrics not displaying correctly

**Solutions:**
```javascript
// Check raw metrics format
curl http://litellm:4000/metrics

// Verify format matches:
// metric_name{labels} value
// Example:
// litellm_cost_dollars_total{model="agent/steward"} 12.45
```

---

## References

- [LiteLLM Proxy Documentation](https://docs.litellm.ai/docs/proxy/prometheus)
- [LiteLLM Observability](https://docs.litellm.ai/docs/observability)
- [Prometheus Metrics Format](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [Langfuse Integration](./LANGFUSE_OBSERVABILITY.md)
- [Health Dashboard Documentation](../../dashboard/README.md)

---

🦞 *The thought that never ends.*
