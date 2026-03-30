# Gap Analysis: Heretek OpenClaw → OpenClaw Framework

## Overview

This document provides a detailed gap analysis between the current Heretek OpenClaw implementation and the official OpenClaw framework. It identifies what needs to be changed, what can be preserved, and what new capabilities become available.

---

## 1. Architecture Gaps

### 1.1 Runtime Model

| Aspect | Current State | OpenClaw Target | Migration Effort |
|--------|---------------|-----------------|------------------|
| **Agent Deployment** | 11 separate Docker containers, each running as independent HTTP services | Single Gateway process with embedded multi-agent runtime | **HIGH** - Requires container consolidation |
| **Communication** | Redis Pub/Sub with custom message envelopes | Gateway WebSocket RPC + agent event streams | **HIGH** - Complete protocol rewrite |
| **Session Management** | Redis hashes with custom session keys | OpenClaw session storage with JSONL transcripts | **MEDIUM** - Data migration required |
| **Model Routing** | LiteLLM with agent passthrough endpoints | OpenClaw Gateway with LiteLLM as provider | **LOW** - Configuration change |
| **Service Discovery** | Static port mapping (8001-8011) | Gateway agent registry with dynamic routing | **MEDIUM** - Update agent references |

### 1.2 Data Flow Comparison

**Current Flow:**
```
User → Web UI → WebSocket Bridge → Redis Pub/Sub → Agent Inbox → Agent → LiteLLM → Response
```

**Target Flow:**
```
User → WebChat/Control UI → Gateway WebSocket → Agent Session → LiteLLM Provider → Response
```

**Key Differences:**
- Redis Pub/Sub eliminated
- WebSocket Bridge eliminated
- Direct Gateway routing
- Unified session management

---

## 2. Skills and Tools Gaps

### 2.1 Skills Inventory

| Skill Name | Current Location | OpenClaw Equivalent | Action Required |
|------------|------------------|---------------------|-----------------|
| `healthcheck` | `skills/core/` | Built-in `openclaw health`, `gateway status` | **DEPRECATE** - Use native commands |
| `a2a-agent-register` | `skills/core/` | Gateway agent registration | **REPLACE** - Use `agent` RPC |
| `a2a-message-send` | `skills/core/` | `message` tool | **REWRITE** - Adapt to OpenClaw API |
| `deployment-health-check` | `skills/` | `openclaw doctor` | **DEPRECATE** - Use native |
| `deployment-smoke-test` | `skills/` | Custom test script | **KEEP** - Adapt for OpenClaw |
| `curiosity-engine` | `skills/autonomy/` | Custom skill | **PORT** - Convert to SKILL.md |
| `gap-detector` | `skills/autonomy/` | Custom skill | **PORT** - Convert to SKILL.md |
| `opportunity-scanner` | `skills/autonomy/` | Custom skill | **PORT** - Convert to SKILL.md |
| `governance-modules` | `skills/governance/` | Multi-agent bindings | **REDESIGN** - Use native routing |
| `triad-sync-protocol` | `skills/governance/` | Custom skill | **REWRITE** - Implement as OpenClaw skill |
| `triad-heartbeat` | `skills/governance/` | `agents.defaults.heartbeat` | **REPLACE** - Use native heartbeat |
| `quorum-enforcement` | `skills/governance/` | Custom skill + bindings | **REDESIGN** - Use agent routing |
| `backup-ledger` | `skills/operations/` | Custom skill | **PORT** - Convert to SKILL.md |
| `fleet-backup` | `skills/operations/` | Custom skill | **PORT** - Convert to SKILL.md |
| `detect-corruption` | `skills/operations/` | Custom skill | **PORT** - Convert to SKILL.md |
| `audit-triad-files` | `skills/operations/` | Custom skill | **PORT** - Convert to SKILL.md |
| `day-dream` | `skills/cognitive/` | Background tasks + cron | **REDESIGN** - Use native automation |
| `memory-consolidation` | `skills/cognitive/` | Compaction + context engine | **REDESIGN** - Use native compaction |
| `autonomous-pulse` | `skills/session/` | Heartbeat + session management | **REPLACE** - Use native features |
| `user-rolodex` | `skills/session/` | USER.md + custom skill | **PORT** - Convert to SKILL.md |
| `user-context-resolve` | `skills/session/` | Custom skill | **PORT** - Convert to SKILL.md |

### 2.2 Tools Mapping

| Current Tool | OpenClaw Built-in | Notes |
|--------------|-------------------|-------|
| Custom HTTP client | N/A | Use Gateway RPC |
| Redis client | N/A | Internal to Gateway |
| LiteLLM client | `models.providers.litellm` | Direct integration |
| File operations | `read`, `write`, `edit`, `apply_patch` | Native tools |
| Shell execution | `exec`, `process` | Native tools with approvals |
| Web browsing | `browser`, `web_search`, `web_fetch` | Native tools |
| Image handling | `image`, `image_generate` | Native tools |
| Session management | `sessions_*` tools | Native tools |
| Message sending | `message` tool | Native tool |

---

## 3. Module Gaps

### 3.1 Autonomy Modules

| Module | Current Implementation | OpenClaw Alternative | Migration Path |
|--------|----------------------|---------------------|----------------|
| **thought-loop** | Continuous background process in `modules/thought-loop/` | Agent loop with streaming | Replace with native agent loop |
| **self-model** | `modules/self-model/self-model.js` with capability tracking | IDENTITY.md + reflection skill | Port as skill |
| **goal-arbitration** | `modules/goal-arbitration/goal-arbitrator.js` | Standing orders + hooks | Redesign with automation |
| **predictive-reasoning** | `modules/predictive-reasoning/predictor.js` | Custom skill | Port as skill |
| **consciousness** | Global Workspace Theory implementation in `modules/consciousness/` | Not directly supported | Evaluate as plugin |
| **memory** | Vector store + graph RAG in `modules/memory/` | Session storage + pgvector | Integrate with OpenClaw storage |

### 3.2 Consciousness Module Analysis

The consciousness module (`modules/consciousness/`) implements:
- Active inference
- Attention schema
- Global workspace
- Intrinsic motivation
- Phi estimator
- Self-monitor

**OpenClaw Integration Options:**

1. **As Plugin**: Create custom OpenClaw plugin with consciousness hooks
2. **As Skill**: Simplify to skill-based reflection patterns
3. **External Service**: Run as separate service communicating via webhooks

**Recommendation**: Start with Option 2 (skill-based) for simplicity, evaluate Option 1 (plugin) if deeper integration needed.

---

## 4. Configuration Gaps

### 4.1 openclaw.json Mapping

| Current Field | Current Value | OpenClaw Field | OpenClaw Value |
|---------------|---------------|----------------|----------------|
| `collective.name` | "Heretek OpenClaw" | `identity.name` | "Heretek OpenClaw" |
| `collective.description` | "Self-improving..." | `identity.description` | Same |
| `agents[].id` | "steward", "alpha", etc. | `agents.list[].id` | Same |
| `agents[].model` | "agent/steward" | `agents.list[].model.primary` | "litellm/agent/steward" |
| `agents[].session` | "agent:heretek:steward" | `session.dmScope` | "per-channel-peer" |
| `agents[].skills` | ["steward-orchestrator", ...] | `skills.entries` | Migrated skills |
| `a2a_protocol.endpoints` | Custom HTTP paths | Gateway RPC API | Native endpoints |
| `embedding.model` | "ollama/nomic-embed-text-v2-moe" | `models.providers.ollama` | Same model |
| `memory.vector_store` | "pgvector" | Built-in session storage | Keep pgvector for embeddings |
| `memory.session_storage` | "redis" | Built-in JSONL storage | Migrate to JSONL |

### 4.2 litellm_config.yaml Preservation

The LiteLLM configuration can be largely preserved:

**Keep in LiteLLM:**
- Model list with passthrough endpoints
- Fallback configuration
- Budget settings
- Observability callbacks

**Move to OpenClaw:**
- Agent model references
- A2A settings (replaced by Gateway)
- Provider auth (in OpenClaw secrets)

---

## 5. Infrastructure Gaps

### 5.1 Docker Compose Changes

**Current Services:**
```yaml
services:
  litellm          # Keep
  postgres         # Keep
  redis            # Evaluate (may not need for OpenClaw)
  ollama           # Keep
  steward          # Remove (consolidate into Gateway)
  alpha            # Remove
  beta             # Remove
  charlie          # Remove
  examiner         # Remove
  explorer         # Remove
  sentinel         # Remove
  coder            # Remove
  dreamer          # Remove
  empath           # Remove
  historian        # Remove
  websocket-bridge # Remove (replaced by Gateway WS)
  web              # Evaluate (use OpenClaw Control UI)
```

**Target Services:**
```yaml
services:
  litellm          # Keep - Model routing
  postgres         # Keep - Vector storage
  ollama           # Keep - Local embeddings
  openclaw         # NEW - Gateway with multi-agent
  # Optional: Custom UI if not using Control UI
```

### 5.2 Volume Changes

**Current Volumes:**
- `postgres_data` - Keep
- `redis_data` - May be deprecated
- `ollama_data` - Keep
- `collective_memory` - Migrate to workspace
- `agent_memory_*` (11 volumes) - Migrate to per-agent workspaces

**Target Volumes:**
```yaml
volumes:
  postgres_data:
  ollama_data:
  openclaw_state:     # ~/.openclaw state
  openclaw_workspace: # Default workspace
  openclaw_skills:    # Skills repository
```

---

## 6. API Gaps

### 6.1 Current A2A API vs OpenClaw Gateway RPC

| Current Endpoint | OpenClaw Equivalent | Notes |
|------------------|---------------------|-------|
| `POST /v1/agents/{name}/send` | `agent` RPC | Similar semantics |
| `GET /v1/agents/{name}/receive` | Agent event stream | Push-based instead of pull |
| `GET /v1/agents/discover` | `system-presence` event | Gateway broadcasts presence |
| `POST /v1/agents/{name}/tasks` | Subagent spawning | Different API |
| `GET /health` | `health` RPC | Similar |

### 6.2 Message Format Changes

**Current A2A Message:**
```json
{
  "id": "msg-uuid",
  "type": "proposal",
  "from": "steward",
  "to": "alpha",
  "channel": "agent:a2a",
  "content": {...},
  "timestamp": 1234567890,
  "threadId": "thread-uuid",
  "parentId": "msg-parent",
  "metadata": {...}
}
```

**OpenClaw Agent Request:**
```json
{
  "type": "req",
  "id": "req-uuid",
  "method": "agent",
  "params": {
    "agentId": "steward",
    "sessionKey": "session-key",
    "messages": [{"role": "user", "content": "..."}],
    "model": "litellm/agent/steward"
  }
}
```

**Key Differences:**
- Request/response vs pub/sub
- Session-based vs channel-based
- Gateway-mediated vs direct agent

---

## 7. New Capabilities Available

### 7.1 Channels

OpenClaw provides 30+ channel integrations not currently available:

| Channel | Use Case | Priority |
|---------|----------|----------|
| WhatsApp | Primary user messaging | High |
| Telegram | Bot-based interactions | High |
| Discord | Community engagement | Medium |
| Slack | Enterprise integration | Medium |
| Signal | Privacy-focused messaging | Low |
| iMessage (BlueBubbles) | Apple ecosystem | Low |
| WebChat | Browser-based UI | High (built-in) |

### 7.2 Automation

| Feature | Current State | OpenClaw Capability |
|---------|---------------|---------------------|
| Scheduled tasks | Custom cron in skills | Native cron jobs |
| Event hooks | Limited | Comprehensive hook system |
| Webhooks | Not implemented | Built-in webhook endpoint |
| Heartbeat | Custom skill | Native heartbeat config |
| Standing orders | AGENTS.md content | Native injection |
| Gmail integration | Not available | Gmail PubSub |
| Auth monitoring | Not available | Built-in auth monitoring |

### 7.3 Tools

| Tool Category | Current | OpenClaw |
|---------------|---------|----------|
| File I/O | Custom | `read`, `write`, `edit`, `apply_patch` |
| Shell exec | Custom | `exec`, `process` with approvals |
| Browser | Custom | `browser` with Chromium |
| Web search | Custom | `web_search`, `x_search`, `web_fetch` |
| Image | Custom | `image`, `image_generate` |
| Sessions | Custom | `sessions_*` tools |
| Nodes | Not available | `nodes` for device control |
| Canvas | Not available | `canvas` for node UI |

### 7.4 Security

| Feature | Current | OpenClaw |
|---------|---------|----------|
| Auth | Basic token | Token/password + device pairing |
| Sandboxing | None | Docker sandbox mode |
| Exec approvals | Custom | Native approval workflow |
| Tool policy | Custom | Native allow/deny lists |
| Channel gating | Custom | Native DM/group policies |

---

## 8. Migration Complexity Matrix

### 8.1 Component Complexity

| Component | Complexity | Effort | Risk | Priority |
|-----------|------------|--------|------|----------|
| Gateway installation | Low | 1 day | Low | 1 |
| LiteLLM integration | Low | 2 days | Low | 1 |
| Workspace setup | Low | 1 day | Low | 1 |
| Agent migration (11 agents) | High | 5 days | Medium | 2 |
| Skills porting (20+ skills) | Medium | 10 days | Medium | 3 |
| Module redesign | High | 10 days | High | 4 |
| Automation setup | Medium | 5 days | Low | 3 |
| UI integration | Medium | 5 days | Medium | 4 |
| Testing/validation | High | 10 days | Low | 5 |

### 8.2 Dependency Graph

```
Gateway Install → LiteLLM Config → Workspace Setup → Agent Migration
                                              ↓
                                      Skills Porting
                                              ↓
                                      Automation Setup
                                              ↓
                                      Module Redesign
                                              ↓
                                      UI Integration
                                              ↓
                                      Testing/Validation
```

---

## 9. Preservation Opportunities

### 9.1 What Can Be Preserved

| Asset | Preservation Method |
|-------|---------------------|
| Agent identity files | Copy to OpenClaw workspaces |
| Skills logic | Port to SKILL.md format |
| Module algorithms | Rewrite as skills or plugins |
| LiteLLM config | Keep in LiteLLM, reference from OpenClaw |
| PostgreSQL data | Keep, migrate session format |
| Ollama models | Keep, same embedding model |
| User profiles | Port to USER.md format |
| Collective memory | Migrate to workspace structure |

### 9.2 What Should Be Deprecated

| Asset | Reason |
|-------|--------|
| Redis Pub/Sub A2A | Replaced by Gateway events |
| WebSocket Bridge | Replaced by Gateway WebSocket |
| Individual agent containers | Consolidated into Gateway |
| Custom A2A HTTP API | Replaced by Gateway RPC |
| Custom health check skills | Replaced by `openclaw doctor` |
| Custom session management | Replaced by OpenClaw sessions |

---

## 10. Recommendations

### 10.1 Immediate Actions

1. **Install OpenClaw Gateway** in parallel with existing deployment
2. **Configure LiteLLM provider** in OpenClaw config
3. **Create workspace structure** for default agent
4. **Test WebChat connectivity** before full migration

### 10.2 Phased Approach

1. **Phase 1**: Gateway + single agent (Steward)
2. **Phase 2**: Migrate triad agents (Alpha, Beta, Charlie)
3. **Phase 3**: Port critical skills
4. **Phase 4**: Migrate remaining agents
5. **Phase 5**: Set up automation
6. **Phase 6**: UI integration and testing

### 10.3 Risk Mitigation

- **Parallel deployment**: Keep Redis A2A running during transition
- **Rollback plan**: Document procedures for reverting
- **Testing benchmarks**: Establish baseline metrics before migration
- **Incremental cutover**: Migrate agents one at a time

---

## Conclusion

The gap analysis reveals that while the migration requires significant effort (particularly in consolidating the agent runtime and rewriting the communication layer), the benefits of using OpenClaw's mature framework outweigh the costs:

- **Reduced complexity**: 15+ services → 4-5 services
- **Enhanced capabilities**: 30+ channels, comprehensive tools, plugins
- **Better maintainability**: Upstream updates, community support
- **Production features**: Auth, sandboxing, monitoring built-in

The migration is feasible with a phased approach over 12 weeks, with parallel deployment allowing for rollback if needed.
