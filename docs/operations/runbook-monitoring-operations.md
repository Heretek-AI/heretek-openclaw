# Runbook: Monitoring Stack Operations

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Purpose

This runbook provides operational procedures for the Heretek OpenClaw Monitoring Stack (Prometheus/Grafana). Use this guide for daily operations, incident response, and maintenance tasks.

**Related Documents:**
- [`MONITORING_STACK.md`](MONITORING_STACK.md) - Architecture and configuration reference
- [`monitoring-config.json`](monitoring-config.json) - Alerting thresholds
- [`LANGFUSE_OBSERVABILITY.md`](LANGFUSE_OBSERVABILITY.md) - Langfuse integration

---

## Quick Reference

| Service | URL | Port | Health Check |
|---------|-----|------|--------------|
| **Grafana** | http://localhost:3001 | 3001 | `/api/health` |
| **Prometheus** | http://localhost:9090 | 9090 | `/-/healthy` |
| **Node Exporter** | http://localhost:9100 | 9100 | `/metrics` |
| **cAdvisor** | http://localhost:8080 | 8080 | `/healthz` |

---

## Daily Operations

### Morning Health Check

```bash
# 1. Check all monitoring services are running
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml ps

# Expected output: All services should show "Up" status

# 2. Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# Expected: All targets should return "up"

# 3. Check for active alerts
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# Expected: No firing alerts (or expected maintenance alerts)

# 4. Verify Grafana is accessible
curl -s http://localhost:3001/api/health

# Expected: {"commit":"...","database":"ok","version":"..."}
```

### Dashboard Review

1. **Open Grafana**: http://localhost:3001
2. **Navigate to**: Heretek OpenClaw → Agent Collective Dashboard
3. **Review**:
   - All 11 agents showing green status
   - CPU/Memory/Disk within normal ranges
   - No active alerts or anomalies
4. **Document**: Any unusual patterns or trends

---

## Incident Response

### Alert: Agent Offline

**Severity:** Critical  
**Trigger:** `openclaw_agent_status == 0` for > 2 minutes

```bash
# 1. Identify the affected agent
curl -s 'http://localhost:9090/api/v1/query?query=openclaw_agent_status{agent_id=~".+"}' | \
  jq '.data.result[] | select(.value[1] == "0")'

# 2. Check Gateway health
docker compose ps gateway 2>/dev/null || docker compose ps litellm

# 3. Check agent logs (if using Gateway workspaces)
tail -f ~/.openclaw/logs/gateway.log | grep -i "<agent_id>"

# 4. Attempt agent restart via Steward
# Use the steward-orchestrator skill to restart the affected agent

# 5. If restart fails, escalate to runbook-agent-restart.md
```

**Resolution:**
- [ ] Agent restarted successfully
- [ ] Agent status confirmed green in Grafana
- [ ] Alert cleared in Prometheus
- [ ] Incident logged in operations journal

---

### Alert: High CPU Usage

**Severity:** Warning (>70%), Critical (>90%)  
**Trigger:** `node_cpu_usage > 90%` for > 5 minutes

```bash
# 1. Identify top CPU consumers
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 2. Check which container is consuming CPU
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml top

# 3. Check Prometheus for metric details
curl -s 'http://localhost:9090/api/v1/query?query=topk(5, rate(container_cpu_usage_seconds_total[5m]))'

# 4. If LiteLLM is the cause, check for stuck requests
curl -s http://localhost:4000/health

# 5. If Ollama is the cause, check GPU utilization
rocm-smi 2>/dev/null || echo "ROCm not available"
```

**Mitigation:**
- [ ] Identify root cause (stuck request, model loading, etc.)
- [ ] Scale resources if needed
- [ ] Restart affected service if necessary
- [ ] Document incident and resolution

---

### Alert: High Memory Usage

**Severity:** Warning (>75%), Critical (>90%)  
**Trigger:** `node_memory_usage > 90%` for > 5 minutes

```bash
# 1. Check memory usage by container
docker stats --no-stream --format "table {{.Name}}\t{{.MemPerc}}\t{{.MemUsage}}"

# 2. Check system memory
free -h

# 3. Check for memory leaks in Prometheus
curl -s 'http://localhost:9090/api/v1/query?query=process_resident_memory_bytes{job="prometheus"}'

# 4. Check Grafana memory
docker exec heretek-grafana cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null || \
  docker stats heretek-grafana --no-stream --format "{{.MemUsage}}"
```

**Mitigation:**
- [ ] Identify memory-intensive service
- [ ] Check for memory leaks
- [ ] Consider increasing retention period or reducing scrape frequency
- [ ] Restart service if memory leak suspected

---

### Alert: Disk Space Low

**Severity:** Warning (>80%), Critical (>95%)  
**Trigger:** `node_disk_usage > 95%`

```bash
# 1. Check disk usage
df -h

# 2. Identify large files/directories
du -sh /* 2>/dev/null | sort -hr | head -20

# 3. Check Prometheus data size
docker exec heretek-prometheus du -sh /prometheus

# 4. Check Grafana data size
docker exec heretek-grafana du -sh /var/lib/grafana

# 5. Check Docker overlay size
du -sh /var/lib/docker/overlay2 | head -1
```

**Mitigation:**
- [ ] Reduce Prometheus retention period (edit docker-compose.monitoring.yml)
- [ ] Clean old Docker images: `docker image prune -a`
- [ ] Clean old containers: `docker container prune`
- [ ] Archive or delete old logs
- [ ] Expand disk if necessary

---

### Alert: Prometheus Down

**Severity:** Critical  
**Trigger:** Blackbox probe failure on `http://prometheus:9090/-/healthy`

```bash
# 1. Check container status
docker compose -f docker-compose.monitoring.yml ps prometheus

# 2. Check Prometheus logs
docker compose -f docker-compose.monitoring.yml logs --tail=100 prometheus

# 3. Check for configuration errors
docker compose -f docker-compose.monitoring.yml exec prometheus \
  promtool check config /etc/prometheus/prometheus.yml

# 4. Check for rule errors
docker compose -f docker-compose.monitoring.yml exec prometheus \
  promtool check rules /etc/prometheus/rules/*.yml

# 5. Attempt restart
docker compose -f docker-compose.monitoring.yml restart prometheus
```

**Resolution:**
- [ ] Configuration fixed (if applicable)
- [ ] Prometheus healthy and scraping
- [ ] Alerts re-enabled
- [ ] Verify no data gaps in Grafana

---

### Alert: Grafana Down

**Severity:** Warning  
**Trigger:** Blackbox probe failure on `http://grafana:3000/api/health`

```bash
# 1. Check container status
docker compose -f docker-compose.monitoring.yml ps grafana

# 2. Check Grafana logs
docker compose -f docker-compose.monitoring.yml logs --tail=100 grafana

# 3. Check database connectivity
docker compose -f docker-compose.monitoring.yml exec grafana \
  sqlite3 /var/lib/grafana/grafana.db "SELECT * FROM dashboard LIMIT 1;"

# 4. Check disk space for Grafana data
docker exec heretek-grafana df -h /var/lib/grafana

# 5. Attempt restart
docker compose -f docker-compose.monitoring.yml restart grafana
```

**Resolution:**
- [ ] Grafana accessible
- [ ] Dashboards loading correctly
- [ ] Data sources connected

---

## Maintenance Procedures

### Weekly Maintenance

```bash
# 1. Backup Prometheus data
BACKUP_DIR=~/monitoring-backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

docker compose -f docker-compose.monitoring.yml exec prometheus \
  tar czf /tmp/prometheus-backup.tar.gz /prometheus

docker compose -f docker-compose.monitoring.yml cp \
  prometheus:/tmp/prometheus-backup.tar.gz $BACKUP_DIR/

# 2. Backup Grafana data
docker compose -f docker-compose.monitoring.yml exec grafana \
  tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana

docker compose -f docker-compose.monitoring.yml cp \
  grafana:/tmp/grafana-backup.tar.gz $BACKUP_DIR/

# 3. Verify backups
tar tzf $BACKUP_DIR/prometheus-backup.tar.gz | head -5
tar tzf $BACKUP_DIR/grafana-backup.tar.gz | head -5

# 4. Clean old backups (keep 30 days)
find ~/monitoring-backups -mtime +30 -delete
```

### Monthly Maintenance

```bash
# 1. Update monitoring images
docker compose -f docker-compose.monitoring.yml pull

# 2. Review and update alerting rules
# Edit: monitoring/prometheus/rules/alerting-rules.yml

# 3. Review dashboard effectiveness
# - Remove unused panels
# - Add new metrics as needed

# 4. Check certificate expiration (if using TLS)
# Check Grafana TLS certificate validity

# 5. Review access logs
docker compose -f docker-compose.monitoring.yml logs --since 30d grafana | \
  grep -i "login\|access" | tail -50
```

### Quarterly Maintenance

```bash
# 1. Full system backup
# Follow weekly backup procedure + copy to offsite location

# 2. Review retention policies
# - Prometheus: Adjust based on storage and query patterns
# - Grafana: Archive old dashboards

# 3. Performance review
# - Check Prometheus query performance
# - Review Grafana dashboard load times
# - Identify slow queries

# 4. Security review
# - Update all monitoring images
# - Review access credentials
# - Rotate Grafana admin password

# 5. Documentation review
# - Update this runbook with new procedures
# - Document any incidents and resolutions
```

---

## Configuration Changes

### Adding New Scrape Target

1. Edit [`monitoring/prometheus/prometheus.yml`](monitoring/prometheus/prometheus.yml)
2. Add new job under `scrape_configs`
3. Validate configuration:
   ```bash
   docker compose -f docker-compose.monitoring.yml exec prometheus \
     promtool check config /etc/prometheus/prometheus.yml
   ```
4. Reload Prometheus:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

### Adding New Alert Rule

1. Edit [`monitoring/prometheus/rules/alerting-rules.yml`](monitoring/prometheus/rules/alerting-rules.yml)
2. Add new rule under appropriate group
3. Validate rules:
   ```bash
   docker compose -f docker-compose.monitoring.yml exec prometheus \
     promtool check rules /etc/prometheus/rules/*.yml
   ```
4. Reload Prometheus:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

### Adding New Dashboard

1. Create dashboard JSON in `monitoring/grafana/dashboards/`
2. Dashboard will be auto-provisioned on next Grafana restart
3. Or use Grafana UI to import:
   - Navigate to **Dashboards** → **Import**
   - Upload JSON file or paste dashboard ID

---

## Escalation Matrix

| Issue | First Responder | Escalation | Final Escalation |
|-------|-----------------|------------|------------------|
| Agent Offline | On-call Engineer | Steward Agent | System Administrator |
| High Resource Usage | On-call Engineer | DevOps Lead | Infrastructure Team |
| Monitoring Stack Down | On-call Engineer | DevOps Lead | External Consultant |
| Data Loss/Corruption | DevOps Lead | System Administrator | Backup Team |

---

## Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| **On-call Engineer** | #oncall-slack-channel | 24/7 |
| **DevOps Lead** | #devops-slack-channel | Business hours |
| **System Administrator** | #infra-slack-channel | Business hours |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-31 | DevOps | Initial version for P2-3 Monitoring Stack |

---

🦞 *The thought that never ends.*
