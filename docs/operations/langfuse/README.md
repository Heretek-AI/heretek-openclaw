# Langfuse Observability for Heretek OpenClaw

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

Langfuse is an open-source LLM observability platform that provides comprehensive tracing, monitoring, and analytics for Heretek OpenClaw deployments. This guide covers self-hosting Langfuse and integrating it with OpenClaw for A2A communication verification, cost tracking, and session analytics.

### Why Langfuse for OpenClaw?

| Benefit | Description |
|---------|-------------|
| **A2A Message Tracing** | Track agent-to-agent communication flows and deliberation |
| **Cost Tracking** | Per-agent, per-model cost breakdown with budget alerts |
| **Latency Monitoring** | Response time analytics for each agent |
| **Session Analytics** | User session tracking and conversation analysis |
| **Self-Hosted** | Full data control, compliance with privacy requirements |
| **Open Source** | No vendor lock-in, community-driven development |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Heretek OpenClaw Stack                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   OpenClaw Gateway                        │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │   │
│  │  │stew │ │alpha│ │beta │ │char │ │exam │ │expl │       │   │
│  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘       │   │
│  │     │       │       │       │       │       │            │   │
│  │     └───────┴───────┼───────┴───────┴───────┘            │   │
│  │                     │                                     │   │
│  │              ┌──────▼──────┐                              │   │
│  │              │ Langfuse    │                              │   │
│  │              │ Integration │                              │   │
│  │              └──────┬──────┘                              │   │
│  └─────────────────────┼─────────────────────────────────────┘   │
│                        │                                         │
│  ┌─────────────────────▼─────────────────────────────────────┐   │
│  │                    Langfuse Platform                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │   Traces    │  │    Costs    │  │  Analytics  │       │   │
│  │  │  (A2A Msgs) │  │  (By Agent) │  │  (Sessions) │       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space

### Installation

```bash
# 1. Navigate to project directory
cd /root/heretek/heretek-openclaw

# 2. Generate secure secrets
export LANGFUSE_SALT=$(openssl rand -hex 32)
export LANGFUSE_NEXTAUTH_SECRET=$(openssl rand -hex 32)
export LANGFUSE_POSTGRES_PASSWORD=$(openssl rand -base64 32)

# 3. Add secrets to .env file
echo "LANGFUSE_SALT=$LANGFUSE_SALT" >> .env
echo "LANGFUSE_NEXTAUTH_SECRET=$LANGFUSE_NEXTAUTH_SECRET" >> .env
echo "LANGFUSE_POSTGRES_PASSWORD=$LANGFUSE_POSTGRES_PASSWORD" >> .env
echo "LANGFUSE_ENABLED=true" >> .env

# 4. Start Langfuse services
docker compose up -d langfuse langfuse-postgres

# 5. Verify deployment
docker compose ps | grep langfuse
```

### First-Time Setup

1. **Access Dashboard:** Open http://localhost:3000
2. **Create Admin Account:** First user becomes admin
3. **Get API Keys:** Navigate to Project Settings → API Keys
4. **Copy Keys:** Save `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`

### Configure OpenClaw Integration

Add to your `.env` file:

```bash
# Langfuse Configuration
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxx
LANGFUSE_HOST=http://localhost:3000
LANGFUSE_RELEASE=2.0.3
LANGFUSE_ENVIRONMENT=production
```

Add to your `openclaw.json`:

```json
{
  "observability": {
    "langfuse": {
      "enabled": true,
      "publicKey": "pk-lf-...",
      "secretKey": "sk-lf-...",
      "host": "http://localhost:3000",
      "release": "2.0.3",
      "environment": "production"
    }
  }
}
```

---

## Files in This Directory

| File | Purpose |
|------|---------|
| [`README.md`](README.md) | This documentation |
| [`.env.example`](.env.example) | Environment configuration template |
| [`agent-integration-example.js`](agent-integration-example.js) | JavaScript integration examples |
| [`dashboards.json`](dashboards.json) | Pre-configured dashboard definitions |
| [`backup.sh`](backup.sh) | Automated backup script |

---

## Deployment Options

### Option 1: Self-Hosted Docker (Recommended)

See [Quick Start](#quick-start) above.

**Best for:** Production, data control, compliance

| Feature | Details |
|---------|---------|
| **Cost** | Free (open source) |
| **Setup Time** | ~30 minutes |
| **Maintenance** | Docker updates, backups |
| **Data Location** | Your infrastructure |

### Option 2: Langfuse Cloud (Quick Start)

**Best for:** Quick setup, development, small teams

| Feature | Details |
|---------|---------|
| **URL** | https://cloud.langfuse.com |
| **Pricing** | Free tier available, paid plans from $99/month |
| **Setup Time** | < 5 minutes |
| **Maintenance** | None (managed service) |

#### Setup Steps

1. **Create Account:** Visit https://cloud.langfuse.com
2. **Sign up:** Use GitHub, Google, or email
3. **Create Project:** Create a new project for OpenClaw
4. **Get API Keys:** Navigate to Project Settings → API Keys
5. **Configure OpenClaw:** Add keys to `.env`

```bash
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Option 3: Kubernetes (Enterprise)

**Best for:** Large-scale deployments, high availability

See official documentation: https://langfuse.com/docs/deployment/kubernetes

---

## Features

### A2A Message Tracing

Langfuse traces all Agent-to-Agent communication through the Gateway WebSocket RPC:

```javascript
const { Langfuse } = require('langfuse');

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST
});

// Create trace for A2A deliberation
const trace = langfuse.trace({
  id: `a2a-deliberation-${sessionId}`,
  name: 'triad-deliberation',
  sessionId: sessionId,
  metadata: {
    agents: ['alpha', 'beta', 'charlie'],
    proposal: proposalId,
    collective: 'Heretek OpenClaw'
  }
});
```

See [`agent-integration-example.js`](agent-integration-example.js) for full examples.

### Cost Tracking

Track costs per agent and model:

```javascript
const generation = trace.generation({
  name: 'agent-completion',
  model: 'minimax/MiniMax-M2.7',
  usage: {
    input: usage.promptTokens,
    output: usage.completionTokens,
    total: usage.totalTokens
  },
  metadata: {
    agent: 'steward',
    cost: {
      input: usage.promptTokens * 0.0001,
      output: usage.completionTokens * 0.0002,
      currency: 'USD'
    }
  }
});
```

### Session Analytics

Track user sessions across agents:

```javascript
const sessionTrace = langfuse.trace({
  id: `session-${sessionId}`,
  name: 'user-session',
  sessionId: sessionId,
  userId: userId,
  metadata: {
    userAgent: req.headers['user-agent'],
    startTime: Date.now(),
    collective: 'Heretek OpenClaw'
  }
});
```

---

## Dashboards

### Agent Overview Dashboard

Real-time overview of all OpenClaw agent activities:

- **Total Traces (24h)** - Count of all agent traces
- **Avg Latency (ms)** - Average response time
- **Total Cost (24h)** - Sum of all agent API calls
- **Error Rate (%)** - Failed requests percentage
- **Traces by Agent** - Breakdown per agent
- **Cost by Model** - MiniMax vs z.ai spending
- **Latency Over Time** - P95 latency trend

### A2A Communication Dashboard

View all Agent-to-Agent communication traces:

- **A2A Messages (24h)** - Count of A2A deliberations
- **Consensus Rate (%)** - Successful consensus percentage
- **Avg Deliberation Time (s)** - Mean deliberation duration
- **Recent Deliberations** - Table of recent triad votes

### Cost Tracking Dashboard

Track spending across the collective:

- **Today's Costs** - Current day spending
- **Weekly Costs** - Last 7 days total
- **Monthly Costs** - Last 30 days total
- **Budget Remaining (%)** - Percentage of $50 daily budget
- **Cost by Agent** - Breakdown per agent
- **Cost Trend (7 days)** - Daily cost trend line
- **Token Usage by Model** - Input/output token breakdown

### Session Analytics Dashboard

Understand user interactions:

- **Total Sessions (24h)** - User session count
- **Avg Session Length** - Average messages per session
- **Unique Users (24h)** - Distinct user count
- **Session Completion Rate** - Successful session percentage
- **Sessions Over Time (24h)** - Hourly session distribution
- **Recent Sessions** - Table of recent user sessions

---

## Monitoring & Alerts

### Setting Up Alerts

Configure alerts in Langfuse Dashboard (Settings → Alerts):

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| **High Latency** | P95 > 5000ms | Warning | Email, Webhook |
| **Cost Threshold** | Daily cost > $50 | Critical | Email, Webhook |
| **Error Rate** | Error rate > 5% | Critical | Email, Webhook |
| **Consensus Failure** | > 3 failures/hour | Warning | Email |

### Alert Channels

| Channel | Setup |
|---------|-------|
| **Email** | Built-in, configure in Settings |
| **Slack** | Add webhook URL |
| **Discord** | Add webhook URL |
| **PagerDuty** | Integration key |
| **Webhook** | Custom endpoint |

---

## Backup & Maintenance

### Database Backup

```bash
# Create backup directory
mkdir -p ~/langfuse/backups

# Create backup
docker compose exec -T langfuse-postgres \
  pg_dump -U langfuse langfuse > \
  ~/langfuse/backups/langfuse-$(date +%Y%m%d-%H%M%S).sql

# Keep last 7 days
find ~/langfuse/backups -name "*.sql" -mtime +7 -delete
```

### Cron Job for Automated Backups

```bash
# Add to crontab
0 2 * * * /root/heretek/heretek-openclaw/docs/operations/langfuse/backup.sh
```

### Update Langfuse

```bash
# Pull latest image
docker compose pull langfuse

# Restart with new image
docker compose up -d langfuse

# Verify version
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Langfuse Not Connecting

```bash
# Check Langfuse is running
docker compose ps langfuse

# Check logs
docker compose logs langfuse

# Test connection
curl http://localhost:3000/api/health
```

### API Key Errors

```bash
# Verify keys are set
echo $LANGFUSE_PUBLIC_KEY
echo $LANGFUSE_SECRET_KEY

# Regenerate keys in Langfuse dashboard
# Navigate to: Project Settings → API Keys → Create new key
```

### High Latency

1. Check Langfuse server resources (CPU, RAM)
2. Verify network connectivity between OpenClaw and Langfuse
3. Consider async tracing to avoid blocking
4. Increase Langfuse instance size

### Missing Traces

1. Verify `LANGFUSE_ENABLED=true` in environment
2. Check agent code for proper trace initialization
3. Ensure `langfuse.flushAsync()` is called
4. Review Langfuse logs for errors

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps langfuse-postgres

# Test database connection
docker compose exec langfuse-postgres \
  psql -U langfuse -c "SELECT 1;"

# Check PostgreSQL logs
docker compose logs langfuse-postgres

# Restart PostgreSQL
docker compose restart langfuse-postgres
```

---

## Advanced Configuration

### Sampling

Reduce trace volume with sampling:

```javascript
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
  samplingRate: 0.1  // 10% of traces
});
```

### Custom Tags

Add custom metadata to traces:

```javascript
trace.update({
  tags: ['triad-deliberation', 'consensus-vote', 'high-priority']
});
```

### Score Tracking

Track quality scores for agent responses:

```javascript
trace.score({
  name: 'response-quality',
  value: 0.95,  // 0-1 scale
  comment: 'Excellent response with clear reasoning'
});
```

### Resource Limits

Add to `docker-compose.yml` for resource constraints:

```yaml
langfuse:
  deploy:
    resources:
      limits:
        memory: 2g
        cpus: '1.0'
```

---

## Security Considerations

### Secrets Management

- **Never commit** `.env` files to version control
- **Rotate secrets** periodically (LANGFUSE_SALT, NEXTAUTH_SECRET)
- **Use strong passwords** (32+ characters, random)
- **Restrict access** to Langfuse dashboard (firewall, VPN)

### Network Security

- **Bind to localhost** by default (port 3000)
- **Use reverse proxy** for HTTPS in production
- **Enable firewall** rules for Langfuse ports
- **Consider Cloudflare Tunnel** for secure remote access

### Data Privacy

- **Disable telemetry** for self-hosted deployments
- **Encrypt backups** with GPG or similar
- **Implement access logging** for audit trails
- **Regular security updates** for Docker images

---

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_traces_session_id ON traces(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_user_id ON traces(user_id);
CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp);
CREATE INDEX IF NOT EXISTS idx_generations_model ON generations(model);
```

### Langfuse Configuration

```bash
# Increase batch size for high-volume deployments
LANGFUSE_FLUSH_INTERVAL=5000
LANGFUSE_MAX_BATCH_SIZE=100

# Enable compression
LANGFUSE_COMPRESSION_ENABLED=true
```

### PostgreSQL Tuning

```bash
# Add to PostgreSQL configuration
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 128MB
```

---

## Integration Points

### OpenClaw Agents

| Agent | Integration Type | Traces |
|-------|-----------------|--------|
| **Steward** | Orchestrator traces | A2A coordination, proposals |
| **Alpha/Beta/Charlie** | Triad deliberation | Votes, consensus results |
| **Examiner** | Evaluation traces | Questions, challenges |
| **Explorer** | Intelligence traces | Scans, discoveries |
| **Sentinel** | Safety traces | Reviews, alerts |
| **Coder** | Development traces | Code generation, reviews |
| **Dreamer** | Creative traces | Ideas, syntheses |
| **Empath** | User interaction traces | Emotional context |
| **Historian** | Memory traces | Consolidation, retrieval |

### LiteLLM Gateway

Langfuse integrates with LiteLLM for automatic request tracing:

```bash
# Enable in .env
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=http://localhost:3000
```

LiteLLM automatically traces:
- All LLM requests
- Token usage
- Model latencies
- Cost calculations

---

## References

- [Langfuse Official Documentation](https://langfuse.com/docs)
- [Self-Hosting Guide](https://langfuse.com/self-hosting)
- [OpenClaw Integration](https://langfuse.com/integrations/other/openclaw)
- [Langfuse API Reference](https://langfuse.com/api-reference)
- [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) - Deployment guide
- [`docs/EXTERNAL_PROJECTS_GAP_ANALYSIS.md`](../EXTERNAL_PROJECTS_GAP_ANALYSIS.md) - Gap analysis

---

🦞 *The thought that never ends.*
