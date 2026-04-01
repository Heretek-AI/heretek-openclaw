# Heretek OpenClaw Monorepo Migration Summary

**Document Version:** 1.0.0  
**Created:** 2026-04-01  
**Status:** Ready for Execution

---

## Quick Reference

### Target Repositories

| Repository | Purpose | Package | Initial Version |
|------------|---------|---------|-----------------|
| [heretek-openclaw-core](https://github.com/heretek/heretek-openclaw-core) | Gateway, agents, A2A | `@heretek/openclaw-core` | v1.0.0 |
| [heretek-openclaw-cli](https://github.com/heretek/heretek-openclaw-cli) | Deployment CLI | `@heretek/openclaw-cli` | v1.0.0 |
| [heretek-openclaw-dashboard](https://github.com/heretek/heretek-openclaw-dashboard) | Health monitoring | `@heretek/openclaw-dashboard` | v1.0.0 |
| [heretek-openclaw-plugins](https://github.com/heretek/heretek-openclaw-plugins) | Plugin system | `@heretek/openclaw-plugins` | v1.0.0 |
| [heretek-openclaw-deploy](https://github.com/heretek/heretek-openclaw-deploy) | Infrastructure as Code | N/A | v1.0.0 |
| [heretek-openclaw-docs](https://github.com/heretek/heretek-openclaw-docs) | Documentation site | N/A | v1.0.0 |

### Migration Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Phase 1 | Week 1 | Preparation |
| Phase 2 | Week 2 | Core Extraction |
| Phase 3 | Week 3 | Tooling Extraction |
| Phase 4 | Week 4 | Ecosystem Extraction |
| Phase 5 | Week 5 | Integration & Validation |

---

## Version Synchronization Strategy

### Independent Versioning Model

Each repository maintains its own semantic version following [SemVer 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Version Tags

Tags follow the format: `<component>/v<version>`

```bash
# Core tags
git tag core/v1.0.0
git tag core/v1.1.0
git tag core/v2.0.0

# CLI tags
git tag cli/v1.0.0
git tag cli/v1.0.1

# Dashboard tags
git tag dashboard/v1.0.0
```

### Dependency Version Ranges

Dependent repositories use caret (^) ranges for flexibility:

```json
// CLI package.json
{
  "name": "@heretek/openclaw-cli",
  "dependencies": {
    "@heretek/openclaw-core": "^1.0.0"
  },
  "peerDependencies": {
    "@heretek/openclaw-core": "^1.0.0"
  }
}

// Dashboard package.json
{
  "name": "@heretek/openclaw-dashboard",
  "dependencies": {
    "@heretek/openclaw-core": "^1.0.0",
    "@heretek/openclaw-plugins": "^1.0.0"
  }
}
```

### Compatibility Matrix

| Core Version | Compatible CLI | Compatible Dashboard | Compatible Plugins |
|--------------|----------------|---------------------|-------------------|
| 1.x.x | ^1.0.0 | ^1.0.0 | ^1.0.0 |
| 2.x.x | ^2.0.0 | ^2.0.0 | ^2.0.0 |

### Coordinated Releases

For breaking changes affecting multiple repositories:

1. **Create release branch in each repo:**
   ```bash
   git checkout -b release/v2.0.0
   ```

2. **Update inter-repo dependencies:**
   ```json
   // Update all to v2.0.0
   "@heretek/openclaw-core": "^2.0.0"
   ```

3. **Test integration:**
   ```bash
   # In each repo
   npm install
   npm run test:integration
   ```

4. **Tag all repos simultaneously:**
   ```bash
   git tag core/v2.0.0
   git tag cli/v2.0.0
   git tag dashboard/v2.0.0
   git tag plugins/v2.0.0
   ```

5. **Publish to npm:**
   ```bash
   npm publish --access public
   ```

### Meta-Package (Optional)

For users who want to install everything:

```json
{
  "name": "@heretek/openclaw",
  "version": "2.0.0",
  "description": "Heretek OpenClaw - Meta-package",
  "dependencies": {
    "@heretek/openclaw-core": "^1.0.0",
    "@heretek/openclaw-cli": "^1.0.0",
    "@heretek/openclaw-dashboard": "^1.0.0",
    "@heretek/openclaw-plugins": "^1.0.0"
  }
}
```

### Release Coordination Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    Release Coordination                          │
│                                                                  │
│  1. Create Release Plan                                          │
│     ↓                                                            │
│  2. Update Dependencies in Each Repo                             │
│     ↓                                                            │
│  3. Run Integration Tests                                        │
│     ↓                                                            │
│  4. Create Release PRs                                           │
│     ↓                                                            │
│  5. Merge All PRs                                                │
│     ↓                                                            │
│  6. Tag All Repos (coordinated)                                  │
│     ↓                                                            │
│  7. Publish to npm (all packages)                                │
│     ↓                                                            │
│  8. Create GitHub Releases                                       │
│     ↓                                                            │
│  9. Announce Release                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Repo Testing Strategy

### Integration Test Matrix

| Test Type | Repositories Involved | Frequency |
|-----------|----------------------|-----------|
| Core + CLI | core, cli | Every PR |
| Core + Dashboard | core, dashboard | Every PR |
| Core + Plugins | core, plugins | Every PR |
| Full Stack | All | Nightly |
| E2E | All | Weekly |

### Test Configuration

```yaml
# .github/workflows/integration.yml
name: Cross-Repo Integration

on:
  schedule:
    - cron: '0 2 * * *'  # Nightly
  workflow_dispatch:

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - name: Setup test environment
        run: |
          # Clone all repos
          git clone https://github.com/heretek/heretek-openclaw-core.git
          git clone https://github.com/heretek/heretek-openclaw-cli.git
          git clone https://github.com/heretek/heretek-openclaw-dashboard.git
          git clone https://github.com/heretek/heretek-openclaw-plugins.git
          
          # Install all packages
          cd heretek-openclaw-core && npm install && npm link
          cd ../heretek-openclaw-cli && npm install && npm link @heretek/openclaw-core
          cd ../heretek-openclaw-dashboard && npm install && npm link @heretek/openclaw-core
          
          # Run integration tests
          npm run test:integration
```

### Contract Testing

Use [Pact](https://docs.pact.io/) or similar for API contract testing between repositories:

```javascript
// Core provides API
// CLI consumes API
// Contract tests verify compatibility

// core/tests/contracts/api-contract.js
const { Verifier } = require('@pact-foundation/pact');

describe('Core API Contract', () => {
  it('validates the API contract', async () => {
    await new Verifier({
      provider: 'openclaw-core',
      providerBaseUrl: 'http://localhost:18789',
      pactUrls: ['http://pact-broker/pacts'],
    }).verifyProvider();
  });
});
```

---

## Access Control Strategy

### Team Structure

| Team | Responsibility | Repositories |
|------|----------------|--------------|
| Core Team | Overall architecture | All (admin) |
| Agent Team | Agent development | core |
| CLI Team | CLI tooling | cli |
| Dashboard Team | Monitoring | dashboard |
| Plugin Team | Plugin system | plugins |
| DevOps Team | Infrastructure | deploy |
| Docs Team | Documentation | docs |

### Branch Protection Rules

```yaml
# Apply to all repositories
branch_protection:
  main:
    required_status_checks:
      strict: true
      contexts:
        - CI
        - Test
        - Build
    required_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
    enforce_admins: false
    restrictions: null
```

### CODEOWNERS

Each repository should have a `.github/CODEOWNERS` file:

```
# Default owners
* @heretek/core-team

# Specific paths
/src/ @heretek/core-team
/tests/ @heretek/qa-team
/docs/ @heretek/docs-team
```

---

## Communication Plan

### During Migration

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| Core Team | Slack | Daily | Progress, blockers |
| Contributors | GitHub Discussions | Weekly | Migration updates |
| External Users | README, Issues | Milestone-based | Migration timeline |

### Post-Migration

| Audience | Channel | Content |
|----------|---------|---------|
| All | GitHub Releases | New repository structure |
| Developers | CONTRIBUTING.md | Updated contribution guidelines |
| Users | Documentation | Installation updates |

---

## Rollback Procedures

### Pre-Migration Backup

```bash
# Create full backup
git clone --mirror git@github.com:heretek/heretek-openclaw.git backup-heretek-openclaw
cd backup-heretek-openclaw
git push --mirror /path/to/local/backup
```

### Rollback Triggers

Initiate rollback if:
1. Critical functionality broken in multiple repos
2. Data loss detected
3. CI/CD pipelines non-functional for >24 hours
4. Cross-repo dependencies fundamentally incompatible

### Rollback Steps

1. **Stop development** on split repositories
2. **Archive split repos** as read-only
3. **Restore monorepo:**
   ```bash
   cd backup-heretek-openclaw
   git push --force git@github.com:heretek/heretek-openclaw.git
   ```
4. **Communicate rollback** to stakeholders
5. **Document issues** that caused rollback

---

## Migration Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `split-repos.js` | Extract repos from monorepo | `node scripts/migration/split-repos.js heretek-openclaw-core` |
| `update-imports.js` | Fix import paths | `node scripts/migration/update-imports.js ./heretek-openclaw-core` |
| `validate-migration.sh` | Verify completeness | `./scripts/migration/validate-migration.sh --all` |

---

## Post-Migration Checklist

### Immediate (Week 5)

- [ ] All 6 repositories created and populated
- [ ] CI/CD pipelines passing
- [ ] Initial releases tagged (v1.0.0)
- [ ] npm packages published (where applicable)
- [ ] Documentation updated

### Short-term (Week 6-8)

- [ ] Cross-repo integration tests passing
- [ ] Plugin compatibility verified
- [ ] User migration guide published
- [ ] Monorepo archived (read-only)
- [ ] GitHub redirect configured

### Long-term (Month 2-3)

- [ ] Deprecation notice in monorepo
- [ ] All external links updated
- [ ] npm deprecation notice (if applicable)
- [ ] Community feedback incorporated

---

## Repository URLs

| Repository | GitHub URL | npm Package |
|------------|------------|-------------|
| Core | https://github.com/heretek/heretek-openclaw-core | `@heretek/openclaw-core` |
| CLI | https://github.com/heretek/heretek-openclaw-cli | `@heretek/openclaw-cli` |
| Dashboard | https://github.com/heretek/heretek-openclaw-dashboard | `@heretek/openclaw-dashboard` |
| Plugins | https://github.com/heretek/heretek-openclaw-plugins | `@heretek/openclaw-plugins` |
| Deploy | https://github.com/heretek/heretek-openclaw-deploy | N/A |
| Docs | https://github.com/heretek/heretek-openclaw-docs | N/A |

---

## Related Documents

- [Monorepo Split Plan](MONOREPO_SPLIT_PLAN.md) - Detailed migration plan
- [Architecture](../ARCHITECTURE.md) - System architecture
- [Operations](../operations/README.md) - Operational procedures

---

🦞 *The thought that never ends.*
