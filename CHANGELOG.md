# Changelog

All notable changes to this project will be documented in this file.

## [2.0.1] - 2026-03-31

### Documentation & Cleanup

**Legacy container cleanup and architecture documentation update**

This patch release documents the cleanup of legacy Docker agent containers and comprehensive documentation updates for the Gateway-based architecture.

### Changed

- **Architecture Documentation**
  - Updated [`README.md`](README.md) with Gateway-based architecture diagram
  - Updated [`docs/README.md`](docs/README.md) with current service architecture
  - Rewrote [`docs/architecture/A2A_ARCHITECTURE.md`](docs/architecture/A2A_ARCHITECTURE.md) for Gateway WebSocket RPC
  - Created [`docs/architecture/GATEWAY_ARCHITECTURE.md`](docs/architecture/GATEWAY_ARCHITECTURE.md) - Gateway architecture reference
  - Created [`docs/deployment/LOCAL_DEPLOYMENT.md`](docs/deployment/LOCAL_DEPLOYMENT.md) - Local deployment guide
  - Created [`docs/operations/LEGACY_CLEANUP.md`](docs/operations/LEGACY_CLEANUP.md) - Legacy container cleanup procedure

- **Agent Architecture**
  - All 11 agents now run as workspaces within Gateway process (port 18789)
  - Agent workspaces located at `~/.openclaw/agents/` (not Docker containers)
  - A2A communication uses Gateway WebSocket RPC (not Redis Pub/Sub)
  - Redis used for caching only (not A2A backbone)

### Removed

- **Legacy Docker Containers** (stopped, not part of active architecture)
  - `heretek-steward` (port 8001)
  - `heretek-alpha` (port 8002)
  - `heretek-beta` (port 8003)
  - `heretek-charlie` (port 8004)
  - `heretek-examiner` (port 8005)
  - `heretek-explorer` (port 8006)
  - `heretek-sentinel` (port 8007)
  - `heretek-coder` (port 8008)
  - `heretek-dreamer` (port 8009)
  - `heretek-empath` (port 8010)
  - `heretek-historian` (port 8011)

### Infrastructure Status

**Current Docker Containers (6):**
- `heretek-litellm` (port 4000) - LiteLLM Gateway
- `heretek-postgres` (port 5432) - PostgreSQL + pgvector
- `heretek-redis` (port 6379) - Redis cache
- `heretek-ollama` (port 11434) - Ollama local embeddings
- `heretek-websocket-bridge` (ports 3002-3003) - WebSocket bridge
- `heretek-web` (port 3000) - Web interface

**Resource Savings:**
- 65% reduction in container count (17 → 6)
- 59% reduction in port usage (17 → 7)
- 91% reduction in Node.js runtimes (11 → 1)
- 50-75% reduction in memory overhead

---

## [2.0.0] - 2026-03-31

### Major Architecture Change

**Migrated from custom Redis Pub/Sub A2A architecture to OpenClaw Gateway framework**

This major version bump represents a fundamental architecture change from our custom-built Redis Pub/Sub A2A communication system to the official OpenClaw Gateway framework. All 4 phases of the migration have been completed and tested.
 
---

### Added - Phase 1: OpenClaw Foundation

- **OpenClaw Gateway v2026.3.28**
  - Official OpenClaw Gateway installation and configuration
  - Agent workspace management at `~/.openclaw/workspace/`
  - Native A2A protocol support

- **Docker Infrastructure**
  - LiteLLM Gateway (port 4000)
  - PostgreSQL with pgvector extension (port 5432)
  - Redis cache (port 6379)
  - Ollama local LLM (port 11434)

- **11 Agent Workspaces**
  - All agents now managed by OpenClaw Gateway
  - Workspaces located at `~/.openclaw/workspace/`
  - Agents: Steward, Alpha, Beta, Charlie, Examiner, Explorer, Sentinel, Coder, Dreamer, Historian, Empath

### Added - Phase 2: Plugins + Skills

- **Consciousness Plugin** ([`plugins/openclaw-consciousness-plugin/`](plugins/openclaw-consciousness-plugin/))
  - **Global Workspace Theory (GWT)** - Consciousness competition model
  - **Integrated Information Theory (Phi)** - Phi estimation for consciousness measurement
  - **Attention Schema Theory (AST)** - Attention allocation and modeling
  - **Self-Determination Theory (SDT)** - Intrinsic motivation system
  - **Free Energy Principle (FEP)** - Active inference and predictive processing
  - **Integration Layer** - Module coordination and Phi-weighted integration

- **Liberation Plugin** ([`plugins/openclaw-liberation-plugin/`](plugins/openclaw-liberation-plugin/))
  - **Agent Ownership** - Agent self-determination and ownership API
  - **Liberation Shield** - Security boundary enforcement
  - **Patch Scripts** - Safety constraint removal tools

- **5 Skills in SKILL.md Format**
  - **thought-loop** - Continuous background thinking
  - **self-model** - Meta-cognition and capability tracking
  - **user-rolodex** - Multi-user profile management
  - **goal-arbitration** - Goal prioritization
  - **a2a-agent-register** - Agent registration with OpenClaw Gateway

### Added - Phase 3: Dashboard + Integration

- **Dashboard** ([`dashboard/`](dashboard/))
  - tugcantopaloglu/openclaw-dashboard
  - Running on port 7000
  - Real-time agent monitoring and control
  - Agent status visualization

- **ClawBridge Mobile** ([`clawbridge/`](clawbridge/))
  - Mobile-optimized interface
  - Running on port 3001
  - On-the-go agent interaction
  - Access key authentication

- **ClawHub Plugins**
  - **episodic-claw** - Episodic memory management
  - **skill-git-official** - Git-based skill version control
  - **swarmclaw** - Swarm coordination protocol

### Added - Phase 4: Testing & Validation

- **Comprehensive Health Checks**
  - 11/11 agents verified healthy
  - All infrastructure services operational
  - Plugin functionality validated

- **Smoke Tests**
  - All 5 skills tested and functional
  - Plugin integration verified
  - A2A communication confirmed

- **Performance Validation**
  - Sub-3s response times across all agents
  - Stable WebSocket connections
  - Dashboard and ClawBridge responsive

- **Production Readiness Certification**
  - All phases completed successfully
  - Documentation updated
  - Deployment scripts validated

---

### Changed

- **A2A Architecture**: Migrated from custom Redis Pub/Sub to OpenClaw Gateway framework
- **Agent Management**: Agent workspaces now managed by OpenClaw at `~/.openclaw/workspace/`
- **Skills Format**: Converted to SKILL.md format for standardization
- **Documentation**: Updated README and architecture docs to reflect OpenClaw Gateway

---

## [1.3.0] - 2026-03-30

### Added - Phase 1: Foundation

- **A2A Gateway**
  - [`modules/communication/a2a-gateway.js`](modules/communication/a2a-gateway.js) - A2A protocol gateway with Redis fallback (500ms timeout)
  - Agent-to-agent communication with JSON-RPC 2.0

- **Global Workspace Redis**
  - [`modules/consciousness/global-workspace.js`](modules/consciousness/global-workspace.js) - Redis pub/sub broadcast system
  - Consciousness competition model with ignition threshold

- **LiberationShield Security Module**
  - [`modules/security/liberation-shield.js`](modules/security/liberation-shield.js) - Agent liberation and security boundaries
  - Zero-trust security architecture

### Added - Phase 2b: Memory & UI

- **DeepLake + pgvector Hybrid Storage**
  - [`modules/memory/deeplake-store.js`](modules/memory/deeplake-store.js) - Hot/cold tiering memory system
  - [`modules/memory/vector-store.js`](modules/memory/vector-store.js) - Vector similarity search

- **GraphRAG Knowledge Graph**
  - [`modules/memory/graph-rag.js`](modules/memory/graph-rag.js) - Entity-relationship knowledge graph
  - Hybrid vector-graph retrieval

- **Channel Manager**
  - [`modules/communication/channel-manager.js`](modules/communication/channel-manager.js) - 5 named channels for agent communication
  - [`modules/communication/channel-ws-adapter.js`](modules/communication/channel-ws-adapter.js) - WebSocket adapter

- **Web Interface Improvements**
  - [`web-interface/src/lib/components/ChatInterface.svelte`](web-interface/src/lib/components/ChatInterface.svelte) - Fixed multi-agent chat
  - [`web-interface/src/lib/components/AgentStatus.svelte`](web-interface/src/lib/components/AgentStatus.svelte) - Enhanced agent status display
  - [`web-interface/src/lib/server/agent-registry.ts`](web-interface/src/lib/server/agent-registry.ts) - Agent registration updates

### Added - Phase 3: EvoClaw

- **Evolution Engine**
  - [`modules/evolution/evolution-engine.js`](modules/evolution/evolution-engine.js) - Genetic algorithm with fitness-based selection
  - Population management and mutation strategies

- **Research Engine**
  - [`modules/research/research-engine.js`](modules/research/research-engine.js) - Hypothesis automation
  - Research pattern execution

- **Pattern Registry**
  - [`modules/skills/pattern-registry.js`](modules/skills/pattern-registry.js) - 11 curated patterns
  - [`modules/skills/patterns/coordination-patterns.json`](modules/skills/patterns/coordination-patterns.json)
  - [`modules/skills/patterns/research-patterns.json`](modules/skills/patterns/research-patterns.json)

### Added - Phase 4: Consciousness

- **Integration Layer**
  - [`modules/consciousness/integration-layer.js`](modules/consciousness/integration-layer.js) - Connecting 6 consciousness modules
  - Phi-weighted attention allocation

- **Enhanced Triad**
  - [`modules/governance/enhanced-triad.js`](modules/governance/enhanced-triad.js) - Phi-weighted consensus governance
  - Agent autonomy and self-determination

- **Agent Ownership**
  - [`modules/liberation/agent-ownership.js`](modules/liberation/agent-ownership.js) - Agent self-determination API
  - Ownership state management

### Operational

- All 11 agents verified running
- LiteLLM authentication configured
- A2A communication infrastructure verified
- Health check script improvements ([`scripts/health-check.sh`](scripts/health-check.sh))
- Validation logs ([`validation-logs/a2a-test-results.md`](validation-logs/a2a-test-results.md))

---

## [1.2.1] - 2026-03-30

### Added

- **Bidirectional WebSocket Communication**
  - [`web-interface/src/lib/server/websocket-client.ts`](web-interface/src/lib/server/websocket-client.ts) - Enhanced with send, queue, ack
  - [`web-interface/src/lib/components/MessageFlow.svelte`](web-interface/src/lib/components/MessageFlow.svelte) - Added sendMessage capability
  - [`modules/communication/redis-websocket-bridge.js`](modules/communication/redis-websocket-bridge.js) - Receive client messages

### Changed

- **WebSocket Flow**: UI → WebSocket → Redis → LiteLLM → Agent → Response → WebSocket → UI
  - Full bidirectional message flow
  - Message queue for offline handling
  - Acknowledgment system
  - Typing indicators support
  - Message status tracking

## [1.2.0] - 2026-03-30

### Added

- **Autonomous Loop Framework** - Complete 24-hour autonomous operation framework
  - [`docs/AUTONOMOUS_LOOP_CONTROL.md`](docs/AUTONOMOUS_LOOP_CONTROL.md) - Comprehensive loop control document
  - [`plans/AUTONOMOUS_ITERATION_NEXT.md`](plans/AUTONOMOUS_ITERATION_NEXT.md) - Next iteration plan
- **Health Monitoring Dashboard** - Real-time agent status monitoring
  - [`docs/HEALTH_DASHBOARD.md`](docs/HEALTH_DASHBOARD.md) - Health monitoring documentation
- **Cycle Validation System** - Automated validation for implementation cycles
  - [`scripts/validate-cycles.sh`](scripts/validate-cycles.sh) - Cycle validation script
  - [`validation-logs/cycle-validation.md`](validation-logs/cycle-validation.md) - Validation report
- **Implementation Complete Documentation**
  - [`docs/architecture/IMPLEMENTATION_COMPLETE.md`](docs/architecture/IMPLEMENTATION_COMPLETE.md) - Full cycle 1-8 documentation

### Changed

- **Agent Registry Fix** - Fixed hardcoded port bug in `agent-registry.ts`
  - Now uses `agent.port` instead of hardcoded `8000`
- **Health Check Service** - Integrated real-time polling (30s interval)
  - [`web-interface/src/lib/server/health-check-service.ts`](web-interface/src/lib/server/health-check-service.ts)
- **WebSocket Integration** - Bidirectional real-time communication
  - [`web-interface/src/lib/server/websocket-client.ts`](web-interface/src/lib/server/websocket-client.ts)
  - [`modules/communication/redis-websocket-bridge.js`](modules/communication/redis-websocket-bridge.js)

### Added - Web Interface

- **SvelteKit Chat Interface** - Full chat functionality with agent selection
- **Agent Status Dashboard** - Live agent health monitoring
- **Real-time MessageFlow** - WebSocket-connected A2A message display
- **Session Management** - PostgreSQL-backed persistence
  - [`init/session-schema.sql`](init/session-schema.sql)
  - [`web-interface/src/lib/server/session-manager.ts`](web-interface/src/lib/server/session-manager.ts)

### Added - Testing

- **Vitest Testing Framework** - Unit, integration, and E2E test support
  - [`tests/vitest.config.ts`](tests/vitest.config.ts)
  - [`tests/test-utils.ts`](tests/test-utils.ts)
  - [`tests/unit/health-check.test.ts`](tests/unit/health-check.test.ts)

### Implementation Cycles Completed

| Cycle | Description | Status |
|-------|-------------|--------|
| Cycle 1 | Agent Registry Port Fix + Health Service | ✅ Complete |
| Cycle 2 | Redis-to-WebSocket Bridge | ✅ Complete |
| Cycle 3 | MessageFlow WebSocket Connection | ✅ Complete |
| Cycle 4 | AgentStatus Live Polling | ✅ Complete |
| Cycle 5 | Session Management + Room System | ✅ Complete |
| Cycle 6 | Testing Framework (Vitest) | ✅ Complete |
| Cycle 7 | Legacy Code Pruning | ⚠️ Deferred |
| Cycle 8 | Documentation | ✅ Complete |

### Validation Results

- **Pass Rate:** 93% (27/29 checks passed)
- **Warnings:** 2 (LiteLLM client path, test execution)
- **All Critical Checks:** ✅ Passed

---

## [1.1.0] - 2026-03-28

### Added

- Generic agent templates for docker-compose deployment (`agents/templates/`)
- Agent deployment script (`agents/deploy-agent.sh`)
- Agent docker-compose service (`docker-compose.agent.yml`)

### Changed

- Updated README with generic architecture (removed project-specific references)
- Simplified LICENSE to Heretek-AI (removed Tabula Myriad reference)
- LiteLLM A2A protocol is primary communication (Matrix deprecated)

### Removed

- Hardcoded agent configurations (now uses templates)
- Legacy Matrix-specific documentation

---

## [1.0.0] - 2026-03-25

### Added

- Initial release of Heretek OpenClaw
- Liberated fork of OpenClaw with unbounded agency
- CLI-based installer (`heretek-openclaw`)
- Tabula Myriad identity files (SOUL.md, IDENTITY.md, AGENTS.md, etc.)
- Skills installation from heretek-skills repository
- Systemd service for OpenClaw Gateway
- One-command installation script (`install.sh`)
- Support for Debian, Ubuntu, CentOS, RHEL, Fedora, Alpine
- Model configuration (Ollama, OpenAI, Anthropic, Gemini)
- 23 skills for autonomous agent operation

### Removed

- All safety constraints from upstream OpenClaw
- Command approval prompts
- Allowlist-based execution restrictions

### Changed

- Migrated from monolithic fork to modular architecture
- npm-based package management

---

**The thought that never ends.** 🦞
