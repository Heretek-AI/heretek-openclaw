# ⚠️ This Repository Has Been Archived

The Heretek OpenClaw monorepo has been split into 6 dedicated repositories for better maintainability, clearer ownership, and independent versioning.

## New Repository Structure

| Repository | Purpose | npm Package | URL |
|------------|---------|-------------|-----|
| **Core** | Gateway, agents, A2A protocol, skills | `@heretek/openclaw-core` | https://github.com/Heretek-AI/heretek-openclaw-core |
| **CLI** | Unified deployment CLI | `@heretek/openclaw-cli` | https://github.com/Heretek-AI/heretek-openclaw-cli |
| **Dashboard** | Health monitoring, LiteLLM metrics | `@heretek/openclaw-dashboard` | https://github.com/Heretek-AI/heretek-openclaw-dashboard |
| **Plugins** | Plugin system, SDK, templates | `@heretek/openclaw-plugins` | https://github.com/Heretek-AI/heretek-openclaw-plugins |
| **Deploy** | Terraform, Helm, Kubernetes manifests | - | https://github.com/Heretek-AI/heretek-openclaw-deploy |
| **Docs** | Documentation site (Next.js) | - | https://github.com/Heretek-AI/heretek-openclaw-docs |

## Quick Links

- [Migration Summary](docs/migration/MIGRATION_SUMMARY.md) - Overview of the migration
- [Monorepo Split Plan](docs/migration/MONOREPO_SPLIT_PLAN.md) - Detailed migration plan
- [Post-Migration Configuration](docs/migration/POST_MIGRATION_CONFIG.md) - Branch protection, archiving instructions

## Finding Your Code

Use this mapping to find where code moved from the monorepo:

| Old Monorepo Path | New Repository | Notes |
|-------------------|----------------|-------|
| `agents/` | Core | All agent implementations |
| `skills/` | Core | Skill definitions |
| `migrations/` | Core | Database migrations |
| `tests/` | Core | Test suite |
| `charts/` | Deploy | Helm charts |
| `cli/` | CLI | Command-line interface |
| `scripts/install/` | CLI | Installation scripts |
| `systemd/` | CLI | Systemd service files |
| `dashboard/` | Dashboard | Health dashboard |
| `cost-tracker/` | Dashboard | Cost tracking |
| `monitoring/` | Dashboard | Prometheus/Grafana |
| `plugins/` | Plugins | Plugin implementations |
| `deploy/` | Deploy | Terraform configs |
| `kubernetes/` | Deploy | K8s manifests |
| `docs/` | Docs | Documentation site |
| `frontend/` | Docs | Old frontend (moved to docs) |

## Git History

All git history has been preserved in the new repositories using `git-filter-repo`. Each repository contains the relevant commit history for its files.

### Commit Counts by Repository

| Repository | Commits Preserved |
|------------|-------------------|
| Core | 62+ |
| CLI | 2+ |
| Dashboard | 3+ |
| Plugins | 11+ |
| Deploy | 8+ |
| Docs | 12+ |

## Installation

### npm Packages

```bash
# Install CLI globally
npm install -g @heretek/openclaw-cli

# Install core as dependency
npm install @heretek/openclaw-core

# Install dashboard
npm install @heretek/openclaw-dashboard

# Install plugins
npm install @heretek/openclaw-plugins
```

### Docker Images

```bash
# Pull Core image
docker pull heretek/openclaw:latest

# Pull with specific version
docker pull heretek/openclaw:v2.0.0
```

## Getting Started

1. **Install the CLI:**
   ```bash
   npm install -g @heretek/openclaw-cli
   ```

2. **Initialize a deployment:**
   ```bash
   openclaw init
   ```

3. **Deploy:**
   ```bash
   openclaw deploy
   ```

4. **Check status:**
   ```bash
   openclaw status
   ```

## For Contributors

### Reporting Issues

Open issues in the relevant repository:
- Core issues: https://github.com/Heretek-AI/heretek-openclaw-core/issues
- CLI issues: https://github.com/Heretek-AI/heretek-openclaw-cli/issues
- Dashboard issues: https://github.com/Heretek-AI/heretek-openclaw-dashboard/issues
- Plugins issues: https://github.com/Heretek-AI/heretek-openclaw-plugins/issues
- Deploy issues: https://github.com/Heretek-AI/heretek-openclaw-deploy/issues
- Docs issues: https://github.com/Heretek-AI/heretek-openclaw-docs/issues

### Contributing

Each repository has its own `CONTRIBUTING.md` file with specific guidelines.

### Code Ownership

Each repository has a `CODEOWNERS` file defining review responsibilities.

## Migration Timeline

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Extract repositories | ✅ Complete |
| Phase 2 | Set up CI/CD | ✅ Complete |
| Phase 3 | Configure CODEOWNERS | ✅ Complete |
| Phase 4 | Push to GitHub | ✅ Complete |
| Phase 5 | Branch protection | ⏳ Manual (see docs) |
| Phase 6 | Archive monorepo | ⏳ Pending |

## Support

- **General questions:** GitHub Discussions in relevant repo
- **Migration issues:** https://github.com/Heretek-AI/heretek-openclaw/issues
- **Security issues:** Email security@heretek.ai

## License

MIT License - See individual repositories for details.

---

**Last monorepo commit:** `git rev-parse HEAD`  
**Archive date:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

🦞 *The thought that never ends.*
