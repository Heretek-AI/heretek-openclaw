# Changelog

All notable changes to this project will be documented in this file.

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
