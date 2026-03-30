# Changelog

All notable changes to this project will be documented in this file.

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
