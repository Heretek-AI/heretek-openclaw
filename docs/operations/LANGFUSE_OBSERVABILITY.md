# Langfuse Observability for OpenClaw

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Overview

Langfuse is an open-source LLM observability platform that provides comprehensive tracing, monitoring, and analytics for OpenClaw deployments. This guide covers self-hosting Langfuse and integrating it with OpenClaw for A2A communication verification.

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
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   OpenClaw Gateway                        │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │  │
│  │  │stew │ │alpha│ │beta │ │char │ │exam │ │expl │       │  │
│  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘       │  │
│  │     │       │       │       │       │       │            │  │
│  │     └───────┴───────┼───────┴───────┴───────┘            │  │
│  │                     │                                     │  │
│  │              ┌──────▼──────┐                              │  │
│  │              │ Langfuse    │                              │  │
│  │              │ Integration │                              │  │
│  │              └──────┬──────┘                              │  │
│  └─────────────────────┼─────────────────────────────────────┘  │
│                        │                                         │
│  ┌─────────────────────▼─────────────────────────────────────┐  │
│  │                    Langfuse Platform                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │   Traces    │  │    Costs    │  │  Analytics  │       │  │
│  │  │  (A2A Msgs) │  │  (By Agent) │  │  (Sessions) │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Options

### Option 1: Langfuse Cloud (Quick Start)

**Best for:** Quick setup, development, small teams

| Feature | Details |
|---------|---------|
| **URL** | https://cloud.langfuse.com |
| **Pricing** | Free tier available, paid plans from $99/month |
| **Setup Time** | < 5 minutes |
| **Maintenance** | None (managed service) |

#### Setup Steps

1. **Create Account**
   - Visit https://cloud.langfuse.com
   - Sign up with GitHub, Google, or email
   - Create a new project for OpenClaw

2. **Get API Keys**
   - Navigate to Project Settings → API Keys
   - Copy `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`

3. **Configure OpenClaw**
   ```bash
   # Add to .env
   LANGFUSE_ENABLED=true
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_HOST=https://cloud.langfuse.com
   ```

---

### Option 2: Self-Hosted Docker (Recommended)

**Best for:** Production, data control, compliance

| Feature | Details |
|---------|---------|
| **Cost** | Free (open source) |
| **Setup Time** | ~30 minutes |
| **Maintenance** | Docker updates, backups |
| **Data Location** | Your infrastructure |

#### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 14+ (or use Langfuse bundled)
- 4GB RAM minimum
- 20GB disk space

#### Installation

```bash
# Create langfuse directory
mkdir -p ~/langfuse && cd ~/langfuse

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  langfuse:
    image: langfuse/langfuse:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://langfuse:langfuse@postgres:5432/langfuse
      - SALT=${SALT:-random-salt-change-me}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-random-secret-change-me}
      - NEXTAUTH_URL=http://localhost:3000
      - TELEMETRY_ENABLED=false
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=langfuse
      - POSTGRES_PASSWORD=langfuse
      - POSTGRES_DB=langfuse
    volumes:
      - langfuse_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U langfuse"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  langfuse_postgres_data:
EOF

# Generate secure secrets
export SALT=$(openssl rand -hex 32)
export NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Replace placeholders in compose file
sed -i "s/random-salt-change-me/$SALT/g" docker-compose.yml
sed -i "s/random-secret-change-me/$NEXTAUTH_SECRET/g" docker-compose.yml

# Start Langfuse
docker compose up -d

# Check status
docker compose ps
```

#### Access Langfuse

1. Open http://localhost:3000
2. Create admin account (first user becomes admin)
3. Navigate to Project Settings → API Keys
4. Copy keys for OpenClaw configuration

#### Update OpenClaw Configuration

```bash
# Add to .env in heretek-openclaw directory
export LANGFUSE_ENABLED=true
export LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxx
export LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxx
export LANGFUSE_HOST=http://localhost:3000
```

---

### Option 3: Kubernetes (Enterprise)

**Best for:** Large-scale deployments, high availability

See official documentation: https://langfuse.com/docs/deployment/kubernetes

---

## OpenClaw Integration

### Configuration

Add Langfuse settings to your OpenClaw configuration:

#### In `openclaw.json`

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

#### In `.env`

```bash
# Langfuse Configuration
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxxxxx
LANGFUSE_HOST=http://localhost:3000
LANGFUSE_RELEASE=2.0.3
LANGFUSE_ENVIRONMENT=production

# Optional: Debug logging
LANGFUSE_DEBUG=true
```

### A2A Message Tracing

Langfuse can trace all Agent-to-Agent communication through the Gateway WebSocket RPC:

```javascript
// Example: Trace A2A message in agent code
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

// Create span for each agent's deliberation
const alphaSpan = trace.span({
  name: 'alpha-deliberation',
  metadata: { agent: 'alpha', role: 'triad_member' }
});

// Record input (proposal)
alphaSpan.generation({
  name: 'proposal-input',
  input: { content: proposal.content },
  metadata: { timestamp: Date.now() }
});

// Record output (vote)
alphaSpan.generation({
  name: 'vote-output',
  output: { vote: 'approve', reasoning: '...' },
  metadata: { timestamp: Date.now() }
});

// Finalize trace
await langfuse.flushAsync();
```

### Cost Tracking

Track costs per agent and model:

```javascript
// Track LLM usage with costs
const generation = trace.generation({
  name: 'agent-completion',
  model: 'minimax/MiniMax-M2.7',
  modelParameters: {
    maxTokens: 8192,
    temperature: 0.7
  },
  input: messages,
  output: response,
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
// Create session trace
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

// Add events throughout session
sessionTrace.event({
  name: 'user-message',
  input: { content: userMessage }
});

sessionTrace.event({
  name: 'agent-response',
  output: { content: agentResponse, agent: 'steward' }
});
```

---

## Langfuse Dashboard Features

### Traces View

View all A2A communication traces:

1. **Filter by Agent** - See all traces for specific agent
2. **Filter by Session** - View complete conversation flow
3. **Search** - Find specific messages or topics
4. **Timeline** - Visualize agent deliberation sequence

### Costs Dashboard

Track spending across the collective:

| Metric | Description |
|--------|-------------|
| **Total Cost** | Sum of all agent API calls |
| **Cost by Agent** | Breakdown per agent (steward, alpha, etc.) |
| **Cost by Model** | MiniMax vs z.ai spending |
| **Daily Trend** | Cost over time with anomaly detection |
| **Budget Alerts** | Set thresholds and get notified |

### Latency Analytics

Monitor response times:

| Metric | Description |
|--------|-------------|
| **P50 Latency** | Median response time |
| **P95 Latency** | 95th percentile (slow responses) |
| **P99 Latency** | Worst-case response time |
| **By Agent** | Compare agent response times |
| **By Model** | Compare model latencies |

### Session Analytics

Understand user interactions:

| Metric | Description |
|--------|-------------|
| **Session Count** | Total user sessions |
| **Avg Session Length** | Average messages per session |
| **User Retention** | Returning users over time |
| **Popular Agents** | Most-used agents |
| **Error Rate** | Failed requests percentage |

---

## Monitoring & Alerts

### Setting Up Alerts

Configure alerts in Langfuse Dashboard:

1. Navigate to Settings → Alerts
2. Create new alert with conditions:
   - **High Latency** - P95 > 5000ms
   - **Cost Threshold** - Daily cost > $50
   - **Error Rate** - Error rate > 5%
   - **Token Usage** - Tokens/hour > threshold

### Alert Channels

| Channel | Setup |
|---------|-------|
| **Email** | Built-in, configure in Settings |
| **Slack** | Add webhook URL |
| **Discord** | Add webhook URL |
| **PagerDuty** | Integration key |
| **Webhook** | Custom endpoint |

### Health Check Dashboard

Create a monitoring dashboard for OpenClaw:

```
┌─────────────────────────────────────────────────────────────┐
│              OpenClaw Health Dashboard                        │
├─────────────────────────────────────────────────────────────┤
│  Agent Status    │  Cost Today  │  Avg Latency  │  Errors  │
├─────────────────────────────────────────────────────────────┤
│  steward  ✅     │  $12.45      │  1.2s         │  0.1%    │
│  alpha    ✅     │  $8.32       │  1.5s         │  0.2%    │
│  beta     ✅     │  $7.89       │  1.3s         │  0.1%    │
│  charlie  ✅     │  $9.12       │  1.4s         │  0.3%    │
│  examiner ⚠️     │  $5.67       │  2.1s         │  1.2%    │
│  explorer ✅     │  $6.45       │  1.1s         │  0.1%    │
│  sentinel ✅     │  $4.23       │  0.9s         │  0.0%    │
│  coder    ✅     │  $15.67      │  2.5s         │  0.5%    │
│  dreamer  ✅     │  $8.90       │  1.8s         │  0.2%    │
│  empath   ✅     │  $7.12       │  1.2s         │  0.1%    │
│  historian ✅    │  $5.34       │  1.0s         │  0.1%    │
├─────────────────────────────────────────────────────────────┤
│  Total: $85.16 today │ Avg: 1.4s │ Errors: 0.3%             │
└─────────────────────────────────────────────────────────────┘
```

---

## Backup & Maintenance

### Database Backup

```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR=~/langfuse/backups
mkdir -p $BACKUP_DIR

# Create backup
docker compose exec -T postgres pg_dump -U langfuse langfuse > \
  $BACKUP_DIR/langfuse-$(date +%Y%m%d-%H%M%S).sql

# Keep last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

### Cron Job for Backups

```bash
# Add to crontab
0 2 * * * /root/langfuse/backup.sh
```

### Update Langfuse

```bash
# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d

# Verify version
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Common Issues

#### Langfuse Not Connecting

```bash
# Check Langfuse is running
docker compose ps

# Check logs
docker compose logs langfuse

# Test connection
curl http://localhost:3000/api/health
```

#### API Key Errors

```bash
# Verify keys are set
echo $LANGFUSE_PUBLIC_KEY
echo $LANGFUSE_SECRET_KEY

# Regenerate keys in Langfuse dashboard
# Project Settings → API Keys → Create new key
```

#### High Latency

1. Check Langfuse server resources (CPU, RAM)
2. Verify network connectivity between OpenClaw and Langfuse
3. Consider async tracing to avoid blocking
4. Increase Langfuse instance size

#### Missing Traces

1. Verify `LANGFUSE_ENABLED=true` in environment
2. Check agent code for proper trace initialization
3. Ensure `langfuse.flushAsync()` is called
4. Review Langfuse logs for errors

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

---

## References

- [Langfuse Official Documentation](https://langfuse.com/docs)
- [Self-Hosting Guide](https://langfuse.com/self-hosting)
- [OpenClaw Integration](https://langfuse.com/integrations/other/openclaw#why-trace-openclaw)
- [GitHub - openclaw-langfuse](https://github.com/MCKRUZ/openclaw-langfuse)
- [Langfuse API Reference](https://langfuse.com/api-reference)

---

🦞 *The thought that never ends.*
