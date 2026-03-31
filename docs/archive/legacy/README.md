# Archived Legacy Code

**Archive Date:** 2026-03-31  
**Version:** v2.0.3  
**Reason:** Architecture consolidation to OpenClaw Gateway

---

## Overview

This directory contains legacy code that was removed during the v2.0.3 codebase consolidation. These components were part of the original container-based agent architecture and are no longer used in the current Gateway-based architecture.

---

## Archived Components

### redis-subscriber.js

**Original Location:** `agents/lib/legacy/redis-subscriber.js`  
**Purpose:** Real-time Redis pub/sub subscriber for A2A agent communication  
**Status:** DEPRECATED - Replaced by Gateway WebSocket RPC

**Why Archived:**
- With OpenClaw Gateway v2026.3.28, all agents run within a single Gateway process
- A2A communication now uses Gateway WebSocket RPC instead of Redis pub/sub
- Real-time message delivery is handled internally by the Gateway

**Original Functionality:**
- Subscribed to Redis channels for direct agent messages
- Handled workspace broadcasts and channel messages
- Provided instant message delivery vs. polling

**Replacement:**
- Gateway WebSocket RPC (port 18789)
- See: [`docs/architecture/GATEWAY_ARCHITECTURE.md`](../../architecture/GATEWAY_ARCHITECTURE.md)

---

## Historical Context

### v1.x Architecture (Legacy)

In v1.x, each agent ran as a separate Docker container:
- 11 agent containers (ports 8001-8011)
- Redis pub/sub for inter-agent communication
- WebSocket bridge for real-time updates
- Separate web interface (SvelteKit)

### v2.0.3 Architecture (Current)

In v2.0.3+, the architecture was consolidated:
- Single Gateway process containing all 11 agents
- Gateway WebSocket RPC for A2A communication
- Langfuse Dashboard for observability
- Agent workspaces at `~/.openclaw/agents/{agent}/`

---

## Migration Path

If you need to understand or restore this legacy code:

1. **Reference Only:** This code is for historical reference only
2. **Not Supported:** No updates or bug fixes will be applied
3. **Restoration:** To restore, copy files back to original locations (NOT RECOMMENDED)

**For new installations, always use the Gateway architecture.**

---

## Related Documentation

- [Migration Guide](../../deployment/MIGRATION_GUIDE.md) - v2.0.3 migration details
- [Gateway Architecture](../../architecture/GATEWAY_ARCHITECTURE.md) - Current architecture
- [A2A Protocol](../../standards/A2A_PROTOCOL.md) - Current A2A specification
- [Local Deployment](../../deployment/LOCAL_DEPLOYMENT.md) - Deployment guide

---

## Files in This Archive

| File | Original Purpose | Lines of Code |
|------|------------------|---------------|
| `redis-subscriber.js` | Redis pub/sub A2A subscriber | 309 |

---

**Note:** This archive is part of the technical debt cleanup initiated in the P4 Sanity Test Report (2026-03-31).
