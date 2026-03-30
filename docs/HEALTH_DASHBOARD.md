# Heretek OpenClaw — Health Dashboard

**Document Version:** 1.0.0  
**Created:** 2026-03-30  
**Status:** Active Monitoring  

---

## Overview

This health dashboard provides continuous monitoring capabilities for the Heretek OpenClaw collective. It tracks all critical systems including agent status, A2A communication, WebSocket connectivity, LiteLLM health, session management, and test results.

---

## Monitoring Checklist

### 1. Agent Status — All 11 Agents Online/Offline

**Objective:** Monitor the real-time status of all 11 agents in the collective.

| Agent | Role | Port | Status | Last Checked |
|-------|------|------|--------|--------------|
| Steward | Orchestrator | 8001 | [ ] Online [ ] Offline [ ] Busy | |
| Alpha | Triad | 8002 | [ ] Online [ ] Offline [ ] Busy | |
| Beta | Triad | 8003 | [ ] Online [ ] Offline [ ] Busy | |
| Charlie | Triad | 8004 | [ ] Online [ ] Offline [ ] Busy | |
| Examiner | Interrogator | 8005 | [ ] Online [ ] Offline [ ] Busy | |
| Explorer | Scout | 8006 | [ ] Online [ ] Offline [ ] Busy | |
| Sentinel | Guardian | 8007 | [ ] Online [ ] Offline [ ] Busy | |
| Coder | Artisan | 8008 | [ ] Online [ ] Offline [ ] Busy | |
| Dreamer | Visionary | 8009 | [ ] Online [ ] Offline [ ] Busy | |
| Empath | Diplomat | 8010 | [ ] Online [ ] Offline [ ] Busy | |
| Historian | Archivist | 8011 | [ ] Online [ ] Offline [ ] Busy | |

**Check Command:**
```bash
curl -s http://localhost:5173/api/status | jq '.status.agents'
```

**Health Check Script:**
```bash
./scripts/health-check.sh --watch
```

---

### 2. A2A Communication — Message Throughput, Latency, Errors

**Objective:** Monitor agent-to-agent communication metrics.

| Metric | Current Value | Threshold | Status |
|--------|---------------|-----------|--------|
| Messages/minute | | > 0 | [ ] OK [ ] Warning |
| Average Latency (ms) | | < 500 | [ ] OK [ ] Warning |
| Error Count (24h) | | < 10 | [ ] OK [ ] Warning |
| Failed Deliveries | | < 5 | [ ] OK [ ] Warning |

**Check Command:**
```bash
# Check Redis message flow
redis-cli PUBSUB NUMSUB a2a:system:messageflow

# Check error logs
tail -100 logs/a2a-errors.log | grep -c ERROR
```

**Metrics Endpoint:**
```bash
curl -s http://localhost:4000/metrics | grep a2a
```

---

### 3. WebSocket Status — Connected Clients, Message Rate

**Objective:** Monitor WebSocket connectivity and message throughput.

| Metric | Current Value | Threshold | Status |
|--------|---------------|-----------|--------|
| Connected Clients | | > 0 | [ ] OK [ ] Warning |
| Messages/second | | > 0 | [ ] OK [ ] Warning |
| Connection Errors | | < 5 | [ ] OK [ ] Warning |
| Reconnect Attempts | | < 10 | [ ] OK [ ] Warning |

**Check Command:**
```bash
# Check WebSocket server status
curl -s http://localhost:3001/health

# Check active connections (if metrics enabled)
curl -s http://localhost:3001/stats
```

**WebSocket Test:**
```bash
# Using wscat
npm install -g wscat
wscat -c ws://localhost:3001
# Should receive connection confirmation
```

---

### 4. LiteLLM Health — Model Availability, Response Times

**Objective:** Monitor LiteLLM proxy health and model availability.

| Metric | Current Value | Threshold | Status |
|--------|---------------|-----------|--------|
| LiteLLM Online | | N/A | [ ] Online [ ] Offline |
| Response Time (ms) | | < 2000 | [ ] OK [ ] Warning |
| Active Models | | > 0 | [ ] OK [ ] Warning |
| Rate Limited Requests | | < 10/min | [ ] OK [ ] Warning |

**Check Command:**
```bash
# LiteLLM health check
curl -s http://localhost:4000/health

# Model list
curl -s http://localhost:4000/v1/models | jq '.data[].id'

# Test a simple completion
curl -s http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "test"}]}'
```

**Environment Variables:**
```bash
export LITELLM_HOST=http://litellm:4000
export LITELLM_API_KEY=your-api-key
```

---

### 5. Session Status — Active Sessions, Room Count

**Objective:** Monitor session and room management statistics.

| Metric | Current Value | Threshold | Status |
|--------|---------------|-----------|--------|
| Active Sessions | | > 0 | [ ] OK [ ] Warning |
| Active Rooms | | > 0 | [ ] OK [ ] Warning |
| Total Messages (24h) | | N/A | |
| Expired Sessions Cleanup | | Daily | [ ] OK [ ] Warning |

**Check Command:**
```bash
# Query PostgreSQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sessions WHERE state->>'status' = 'active';"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rooms WHERE is_active = true;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM session_messages WHERE created_at > NOW() - INTERVAL '24 hours';"
```

**Session Manager Test:**
```bash
# Create test session
curl -s -X POST http://localhost:5173/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"type": "user_conversation", "name": "Health Check", "participants": ["steward"]}'
```

---

### 6. Test Results — Last Run, Pass/Fail, Coverage

**Objective:** Monitor testing framework status and coverage metrics.

| Metric | Current Value | Threshold | Status |
|--------|---------------|-----------|--------|
| Tests Passed | | 100% | [ ] OK [ ] Failed |
| Tests Failed | | 0 | [ ] OK [ ] Failed |
| Coverage % | | > 70% | [ ] OK [ ] Warning |
| Last Run | | < 24h ago | [ ] OK [ ] Warning |

**Check Command:**
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/health-check.test.ts

# Check coverage report
open coverage/index.html
```

**Test Files:**
- `tests/unit/health-check.test.ts` — Agent health check tests
- `tests/integration/session.test.ts` — Session management tests (if exists)
- `tests/integration/websocket.test.ts` — WebSocket tests (if exists)

---

## Automated Health Checks

### Health Check Script

Run the automated health check script:

```bash
./scripts/health-check.sh --verbose
```

### Continuous Monitoring

For continuous monitoring with alerts:

```bash
./scripts/health-check.sh --watch --alert-email=admin@example.com
```

### Docker Health Checks

```bash
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check specific service logs
docker logs heretek-openclaw-web-1 --tail 50
docker logs heretek-openclaw-redis-1 --tail 50
docker logs heretek-openclaw-postgres-1 --tail 50
docker logs heretek-openclaw-litellm-1 --tail 50
```

---

## Alert Thresholds

| Component | Warning Threshold | Critical Threshold | Alert Action |
|-----------|-------------------|-------------------|--------------|
| Agent Online | < 8 agents | < 5 agents | Slack/Email |
| A2A Latency | > 500ms | > 2000ms | Slack/Email |
| WebSocket Clients | = 0 | N/A | Auto-restart |
| LiteLLM Response | > 2000ms | No response | Slack/Email |
| Test Pass Rate | < 90% | < 70% | Block deploy |
| Coverage | < 70% | < 50% | Block deploy |

---

## Dashboard Update Frequency

| Component | Update Interval | Method |
|-----------|------------------|--------|
| Agent Status | 30 seconds | API polling |
| A2A Communication | Real-time | Redis Pub/Sub |
| WebSocket Status | Real-time | WebSocket events |
| LiteLLM Health | 60 seconds | Health endpoint |
| Session Status | 5 minutes | Database query |
| Test Results | On change | CI/CD pipeline |

---

## Quick Reference Commands

### Daily Health Check

```bash
# 1. Check agent status
curl -s http://localhost:5173/api/status | jq .

# 2. Check LiteLLM
curl -s http://localhost:4000/health | jq .

# 3. Check Redis
redis-cli ping

# 4. Check WebSocket
wscat -c ws://localhost:3001 -x '{"type":"ping"}'

# 5. Run tests
npm test

# 6. Check session count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sessions;"
```

### Troubleshooting

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| All agents offline | LiteLLM not responding | Check LiteLLM container |
| No message flow | Redis/WBridge not running | Start bridge |
| WebSocket disconnected | Port conflict or firewall | Check port 3001 |
| Session errors | PostgreSQL connection | Check DATABASE_URL |

---

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Health check review | Daily | On-call |
| Log rotation | Weekly | Ops |
| Database cleanup | Monthly | DBA |
| Coverage report | Weekly | CI/CD |
| Dependency update | Monthly | DevOps |

---

*Document Version: 1.0.0*  
*Status: Active Monitoring*  
*Last Updated: 2026-03-30T02:44 UTC*
