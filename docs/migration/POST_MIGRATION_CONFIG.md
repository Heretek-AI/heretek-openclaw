# Post-Migration Configuration Guide

This document covers the remaining post-migration tasks that require manual GitHub configuration.

## Table of Contents

1. [Branch Protection Rules](#branch-protection-rules)
2. [Repository URLs](#repository-urls)
3. [Archiving the Monorepo](#archiving-the-monorepo)

---

## Branch Protection Rules

Branch protection rules must be configured manually in GitHub for each repository. Below are the recommended settings and API commands to configure them.

### Recommended Settings for All Repositories

| Setting | Value |
|---------|-------|
| **Protect `main` branch** | ✅ Enabled |
| **Require pull request reviews** | ✅ Enabled |
| **Required reviewers** | 1 |
| **Dismiss stale reviews** | ✅ Enabled |
| **Require status checks** | ✅ Enabled |
| **Required status checks** | `lint`, `build` (and `test` if applicable) |
| **Require branches to be up to date** | ✅ Enabled |
| **Require conversation resolution** | ✅ Enabled |
| **Include administrators** | ✅ Enabled |
| **Allow force pushes** | ❌ Disabled |
| **Allow deletions** | ❌ Disabled |

### Manual Configuration (GitHub UI)

For each repository, navigate to:
`Settings → Branches → Add branch protection rule`

**Branch name pattern:** `main`

**Settings:**
- [x] Require a pull request before merging
  - [x] Require approvals (1)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Status checks required:
    - `lint` (all repos)
    - `build` (all repos)
    - `test` (repos with tests: core, cli, dashboard, plugins, docs)
- [x] Require conversation resolution before merging
- [x] Include administrators
- [x] Restrict who can push to matching branches (optional: `@heretek/core-team`)

### API Configuration (Optional)

You can use the GitHub API to configure branch protection:

```bash
#!/bin/bash
# configure-branch-protection.sh

REPOS=(
  "heretek-openclaw-core"
  "heretek-openclaw-cli"
  "heretek-openclaw-dashboard"
  "heretek-openclaw-plugins"
  "heretek-openclaw-deploy"
  "heretek-openclaw-docs"
)

for repo in "${REPOS[@]}"; do
  echo "Configuring branch protection for $repo..."
  
  curl -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/Heretek-AI/$repo/branches/main/protection" \
    -d '{
      "required_status_checks": {
        "strict": true,
        "contexts": ["lint", "build"]
      },
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": true
      },
      "restrictions": null,
      "allow_force_pushes": false,
      "allow_deletions": false,
      "required_conversation_resolution": true
    }'
  
  echo ""
done
```

---

## Repository URLs

### Official Repository URLs

| Repository | URL | Purpose |
|------------|-----|---------|
| **Core** | https://github.com/Heretek-AI/heretek-openclaw-core | Gateway, agents, A2A protocol |
| **CLI** | https://github.com/Heretek-AI/heretek-openclaw-cli | Deployment CLI |
| **Dashboard** | https://github.com/Heretek-AI/heretek-openclaw-dashboard | Health monitoring |
| **Plugins** | https://github.com/Heretek-AI/heretek-openclaw-plugins | Plugin system |
| **Deploy** | https://github.com/Heretek-AI/heretek-openclaw-deploy | Infrastructure as Code |
| **Docs** | https://github.com/Heretek-AI/heretek-openclaw-docs | Documentation site |

### Update References in Documentation

Update any references to the monorepo in external documentation:

**Old (Monorepo):**
```
https://github.com/Heretek-AI/heretek-openclaw
```

**New (Multi-repo):**
```
# Core functionality
https://github.com/Heretek-AI/heretek-openclaw-core

# CLI
https://github.com/Heretek-AI/heretek-openclaw-cli

# Dashboard
https://github.com/Heretek-AI/heretek-openclaw-dashboard

# Plugins
https://github.com/Heretek-AI/heretek-openclaw-plugins

# Deployment
https://github.com/Heretek-AI/heretek-openclaw-deploy

# Documentation
https://github.com/Heretek-AI/heretek-openclaw-docs
```

### Package Names (npm)

| Package | npm Name |
|---------|----------|
| Core | `@heretek/openclaw-core` |
| CLI | `@heretek/openclaw-cli` |
| Dashboard | `@heretek/openclaw-dashboard` |
| Plugins | `@heretek/openclaw-plugins` |

---

## Archiving the Monorepo

### Pre-Archive Checklist

Before archiving the monorepo, ensure:

- [ ] All 6 repositories have been pushed to GitHub
- [ ] CI/CD workflows are configured and passing
- [ ] CODEOWNERS files are in place
- [ ] README files are updated with correct URLs
- [ ] Branch protection rules are configured
- [ ] All migration scripts are documented
- [ ] Team members are aware of new repository structure

### Archive Steps

1. **Update Monorepo README**
   
   Replace the existing README with an archive notice:

   ```markdown
   # ⚠️ This Repository Has Been Archived
   
   The Heretek OpenClaw monorepo has been split into 6 dedicated repositories:
   
   | Repository | Purpose | URL |
   |------------|---------|-----|
   | **Core** | Gateway, agents, A2A protocol | https://github.com/Heretek-AI/heretek-openclaw-core |
   | **CLI** | Deployment CLI | https://github.com/Heretek-AI/heretek-openclaw-cli |
   | **Dashboard** | Health monitoring | https://github.com/Heretek-AI/heretek-openclaw-dashboard |
   | **Plugins** | Plugin system | https://github.com/Heretek-AI/heretek-openclaw-plugins |
   | **Deploy** | Infrastructure as Code | https://github.com/Heretek-AI/heretek-openclaw-deploy |
   | **Docs** | Documentation site | https://github.com/Heretek-AI/heretek-openclaw-docs |
   
   ## Migration Information
   
   For details about the migration, see:
   - [Migration Summary](docs/migration/MIGRATION_SUMMARY.md)
   - [Monorepo Split Plan](docs/migration/MONOREPO_SPLIT_PLAN.md)
   
   ## Accessing Historical Data
   
   This repository is now read-only. All git history has been preserved in the new repositories.
   
   ### Finding Your Code
   
   Use this mapping to find where code moved:
   
   | Old Path | New Repository |
   |----------|----------------|
   | `agents/` | Core |
   | `skills/` | Core |
   | `cli/` | CLI |
   | `dashboard/` | Dashboard |
   | `cost-tracker/` | Dashboard |
   | `plugins/` | Plugins |
   | `charts/`, `helm/` | Deploy |
   | `deploy/`, `terraform/` | Deploy |
   | `docs/` | Docs |
   | `frontend/` | Docs |
   
   ---
   
   **Last monorepo commit:** $(git rev-parse HEAD)
   **Archive date:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   ```

2. **Archive on GitHub**
   
   - Go to: `Settings → Danger Zone → Archive this repository`
   - Confirm the archive action
   - Repository becomes read-only

3. **Update Repository Description**
   
   Set the description to:
   ```
   ⚠️ Archived: This monorepo has been split into 6 dedicated repositories. See the README for links.
   ```

4. **Add Archive Topic**
   
   Add the `archived` topic to the repository for visibility.

### Post-Archive

After archiving:

- Update any internal documentation linking to the monorepo
- Update CI/CD badges in external sites
- Notify team members and stakeholders
- Update any automation that references the monorepo

---

## Team Configuration

### Recommended Teams

Create these GitHub teams under the Heretek-AI organization:

| Team Name | Purpose | Repos Access |
|-----------|---------|--------------|
| `@heretek/core-team` | Core maintainers | All repos (admin) |
| `@heretek/core-devs` | Core repository developers | Core (write) |
| `@heretek/cli-devs` | CLI developers | CLI (write) |
| `@heretek/dashboard-devs` | Dashboard developers | Dashboard (write) |
| `@heretek/plugins-devs` | Plugin developers | Plugins (write) |
| `@heretek/deploy-devs` | Infrastructure developers | Deploy (write) |
| `@heretek/docs-devs` | Documentation writers | Docs (write) |

### Team Permissions

For each team:
- Set appropriate repository access level
- Configure team mentions in CODEOWNERS
- Enable team notifications

---

## Verification Checklist

After completing all post-migration tasks:

### CI/CD
- [ ] All repositories have `.github/workflows/ci.yml`
- [ ] All repositories have `.github/workflows/release.yml`
- [ ] CI workflows are triggered on push/PR
- [ ] Required status checks are configured

### Code Ownership
- [ ] All repositories have `CODEOWNERS` file
- [ ] Code owners are assigned to teams
- [ ] Review requirements are enforced

### Documentation
- [ ] All README files have correct repository URLs
- [ ] CONTRIBUTING.md references correct repos
- [ ] Cross-repo dependencies are documented

### Security
- [ ] Branch protection rules enabled on `main`
- [ ] Required status checks configured
- [ ] PR reviews required
- [ ] Force pushes disabled

### Archive
- [ ] Monorepo README updated with archive notice
- [ ] Monorepo archived on GitHub
- [ ] Team notified of new structure

---

## Support

For questions about the migration:
- Open an issue in the relevant repository
- Contact `@heretek/core-team`
- Refer to [`MONOREPO_SPLIT_PLAN.md`](MONOREPO_SPLIT_PLAN.md)
