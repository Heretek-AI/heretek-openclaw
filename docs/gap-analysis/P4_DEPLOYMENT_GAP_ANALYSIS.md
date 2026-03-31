# P4-5 Gap Analysis: Deployment, API Management, Data Persistence, and Deployment Tooling

**Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28  
**Analysis Scope:** P4-5 Sanity Test Follow-up

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Deployment Options Assessment](#2-deployment-options-assessment)
3. [API Management Analysis](#3-api-management-analysis)
4. [Data Persistence Review](#4-data-persistence-review)
5. [Deployment Tooling Proposal](#5-deployment-tooling-proposal)
6. [Priority Recommendations](#6-priority-recommendations)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## Executive Summary

### Current State Overview

This gap analysis examines four critical areas of the Heretek OpenClaw deployment infrastructure following the P4-5 sanity test. The analysis covers deployment flexibility, API management, data persistence, and deployment tooling.

**Current Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Heretek OpenClaw Stack                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Docker Services                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │   │
│  │  │ LiteLLM  │ │PostgreSQL│ │  Redis   │ │    Ollama    │ │   │
│  │  │  :4000   │ │  :5432   │ │  :6379   │ │   :11434     │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OpenClaw Gateway (System Daemon)              │   │
│  │                    Port 18789                              │   │
│  │  All 11 agents run as workspaces within Gateway process   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Kubernetes Helm Charts                        │   │
│  │  charts/openclaw/ (production-ready)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Findings Summary

| Category | Status | Coverage | Critical Gaps |
|----------|--------|----------|---------------|
| **Deployment Options** | 🟡 Partial | 40% | No bare-metal, VM, or cloud-native options |
| **API Management** | 🟡 Partial | 35% | Limited provider support, no per-agent UI |
| **Data Persistence** | 🟡 Partial | 50% | Manual backups, no migration strategy |
| **Deployment Tooling** | 🔴 Limited | 20% | No CLI wizard, validator, or health dashboard |

### Priority Gap Summary

| Priority | Count | Areas Affected |
|----------|-------|----------------|
| **P0 (Critical)** | 4 | API management, deployment validation, backup automation |
| **P1 (High)** | 6 | Non-Docker deployment, per-agent routing, migration procedures |
| **P2 (Medium)** | 5 | Cloud-native deployments, deployment CLI, monitoring |
| **P3 (Low)** | 3 | Advanced tooling, service mesh, enterprise features |

---

## 2. Deployment Options Assessment

### 2.1 Current State

#### Supported Deployment Methods

| Method | Status | Documentation | Maturity |
|--------|--------|---------------|----------|
| **Docker Compose** | ✅ Production | [`docs/deployment/LOCAL_DEPLOYMENT.md`](docs/deployment/LOCAL_DEPLOYMENT.md:1) | High |
| **Kubernetes Helm** | ✅ Production | [`charts/openclaw/`](charts/openclaw/Chart.yaml:1) | High |
| **Bare-Metal** | ❌ Not Supported | - | None |
| **VM Deployment** | ❌ Not Supported | - | None |
| **Cloud-Native (AWS)** | ❌ Not Supported | - | None |
| **Cloud-Native (GCP)** | ❌ Not Supported | - | None |
| **Cloud-Native (Azure)** | ❌ Not Supported | - | None |

#### Current Docker Compose Services

**File:** [`docker-compose.yml`](docker-compose.yml:1)

| Service | Image | Port | Purpose | Volume Persistence |
|---------|-------|------|---------|-------------------|
| `langfuse` | langfuse/langfuse:latest | 3000 | Observability | ✅ `langfuse_blobs` |
| `langfuse-postgres` | postgres:15-alpine | - | Langfuse DB | ✅ `langfuse_postgres_data` |
| `litellm` | ghcr.io/berriai/litellm:main-latest | 4000 | Model Gateway | ❌ Config bind-mount only |
| `postgres` | pgvector/pgvector:pg17 | 5432 | Vector Database | ✅ `postgres_data` |
| `redis` | redis:7-alpine | 6379 | Cache | ✅ `redis_data` |
| `ollama` | ollama/ollama:rocm | 11434 | Local LLM | ✅ `ollama_data` |

#### Current Helm Chart Configuration

**File:** [`charts/openclaw/values.yaml`](charts/openclaw/values.yaml:1)

| Component | Configurable | Persistence | Autoscaling |
|-----------|--------------|-------------|-------------|
| Gateway | ✅ | N/A (stateless) | ✅ HPA support |
| LiteLLM | ✅ | N/A | ✅ |
| PostgreSQL | ✅ | ✅ 50Gi default | ❌ |
| Redis | ✅ | ✅ 10Gi default | ❌ |
| Ollama | ✅ | ✅ 100Gi default | ❌ |
| Neo4j | ✅ | ✅ 20Gi default | ❌ |
| Langfuse | ✅ | ✅ 20Gi (postgres) | ❌ |

---

### 2.2 Gap Analysis: Deployment Options

#### Gap 2.2.1: No Bare-Metal Deployment Option

| Attribute | Value |
|-----------|-------|
| **Description** | Users cannot deploy directly on Linux/Unix without Docker |
| **Impact** | Limits deployment in environments where Docker is prohibited or unavailable |
| **Affected Users** | Enterprise security teams, HPC environments, minimal installations |
| **Priority** | 🔴 P1 |
| **Effort** | High (4-6 weeks) |

**Missing Components:**
- Native systemd service files for OpenClaw Gateway
- Direct Node.js installation scripts
- PostgreSQL native installation (non-Docker)
- Redis native installation (non-Docker)
- Ollama native installation
- LiteLLM native installation

**Recommended Solution:**
```bash
# Proposed bare-metal installation script
./scripts/install-baremetal.sh
  ├── Install Node.js 20 LTS
  ├── Install PostgreSQL 17 with pgvector
  ├── Install Redis 7
  ├── Install Ollama
  ├── Install LiteLLM (pip)
  ├── Install OpenClaw Gateway (npm)
  ├── Configure systemd services
  └── Validate installation
```

---

#### Gap 2.2.2: No VM Deployment Option

| Attribute | Value |
|-----------|-------|
| **Description** | No pre-configured VM images for common cloud providers |
| **Impact** | Manual setup required for each VM deployment |
| **Affected Users** | Cloud users, enterprise IT |
| **Priority** | 🟡 P2 |
| **Effort** | Medium (2-3 weeks) |

**Missing Components:**
- AWS AMI images
- GCP Compute Engine images
- Azure VM images
- Vagrant boxes for local testing
- Packer configurations for image building

**Recommended Solution:**
- Create Packer templates for each cloud provider
- Build and publish official AMIs/images
- Document VM deployment procedures

---

#### Gap 2.2.3: No Cloud-Native Deployments

| Attribute | Value |
|-----------|-------|
| **Description** | No native AWS/GCP/Azure deployment solutions |
| **Impact** | Cannot leverage managed services (RDS, ElastiCache, etc.) |
| **Affected Users** | Enterprise cloud deployments |
| **Priority** | 🟡 P2 |
| **Effort** | High (6-8 weeks) |

**Missing Components:**
- AWS CloudFormation templates
- Terraform modules for multi-cloud
- AWS ECS/EKS deployment configurations
- GCP Cloud Run/GKE configurations
- Azure Container Apps/AKS configurations
- Managed database integration (RDS, Cloud SQL, Cosmos DB)

**Recommended Architecture for Cloud-Native:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Cloud-Native Deployment                   │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   Application   │    │   Application   │                     │
│  │   Load Balancer │───>│   Auto Scaling  │                     │
│  │   (ALB)         │    │   Group         │                     │
│  └─────────────────┘    └────────┬────────┘                     │
│                                 │                                │
│           ┌─────────────────────┼─────────────────────┐         │
│           │                     │                     │          │
│           ▼                     ▼                     ▼          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Amazon RDS    │  │  Amazon Elasti  │  │   Amazon EKS    │  │
│  │   (PostgreSQL)  │  │  Cache (Redis)  │  │   (OpenClaw)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Deployment Options Summary

| Gap | Priority | Effort | Recommendation |
|-----|----------|--------|----------------|
| Bare-metal deployment | P1 | High | Build native install scripts |
| VM images | P2 | Medium | Create Packer templates |
| AWS CloudFormation | P2 | High | Build CFN templates |
| Terraform modules | P2 | High | Multi-cloud IaC |
| Managed services integration | P2 | High | RDS, ElastiCache support |

---

## 3. API Management Analysis

### 3.1 Current State

#### LiteLLM Configuration

**File:** [`litellm_config.yaml`](litellm_config.yaml:1)

**Currently Supported Providers:**

| Provider | Models | Status | Configuration |
|----------|--------|--------|---------------|
| **MiniMax** | MiniMax-M2.7, MiniMax-M2.5 | ✅ Configured | Environment variables |
| **z.ai** | glm-5-1, glm-5, glm-4 | ✅ Configured | Environment variables |
| **Ollama** | nomic-embed-text-v2-moe | ✅ Configured | HTTP endpoint |
| **OpenAI** | - | ❌ Not Configured | - |
| **Anthropic** | - | ❌ Not Configured | - |
| **Google** | - | ❌ Not Configured | - |

**Agent Passthrough Endpoints:**

| Agent | Model Endpoint | Current Backend | Configurable |
|-------|----------------|-----------------|--------------|
| Steward | `agent/steward` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Alpha | `agent/alpha` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Beta | `agent/beta` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Charlie | `agent/charlie` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Examiner | `agent/examiner` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Explorer | `agent/explorer` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Sentinel | `agent/sentinel` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Coder | `agent/coder` | zai/glm-5-1 | ✅ Via LiteLLM UI |
| Dreamer | `agent/dreamer` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Empath | `agent/empath` | MiniMax-M2.7 | ✅ Via LiteLLM UI |
| Historian | `agent/historian` | MiniMax-M2.7 | ✅ Via LiteLLM UI |

---

### 3.2 Gap Analysis: API Management

#### Gap 3.2.1: Limited Provider Support

| Attribute | Value |
|-----------|-------|
| **Description** | Only MiniMax and z.ai configured by default |
| **Impact** | Users cannot easily bring their own API keys for other providers |
| **Affected Users** | All users wanting OpenAI, Anthropic, Google, etc. |
| **Priority** | 🔴 P0 |
| **Effort** | Low (1 week) |

**Missing Providers:**
- OpenAI (GPT-4, GPT-4o, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Google (Gemini 2.0, Gemini 1.5 Pro)
- Azure OpenAI
- AWS Bedrock
- Groq
- Together AI
- Other providers via LiteLLM

**Recommended Solution:**

Add provider templates to [`litellm_config.yaml`](litellm_config.yaml:1):

```yaml
model_list:
  # OpenAI
  - model_name: openai/gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
      api_base: https://api.openai.com/v1
  
  # Anthropic
  - model_name: anthropic/claude-sonnet-4-20250514
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: os.environ/ANTHROPIC_API_KEY
  
  # Google
  - model_name: gemini/gemini-2.0-flash
    litellm_params:
      model: gemini/gemini-2.0-flash
      api_key: os.environ/GOOGLE_API_KEY
```

---

#### Gap 3.2.2: No Per-Agent Model Configuration UI

| Attribute | Value |
|-----------|-------|
| **Description** | Users must edit YAML files or use LiteLLM WebUI directly |
| **Impact** | Non-technical users cannot easily configure per-agent models |
| **Affected Users** | All users, especially non-technical |
| **Priority** | 🔴 P0 |
| **Effort** | Medium (2-3 weeks) |

**Current State:**
- LiteLLM WebUI exists but is generic
- No OpenClaw-specific model configuration interface
- No visualization of agent-to-model mappings
- No bulk configuration options

**Missing Features:**
- OpenClaw-specific model configuration UI
- Drag-and-drop agent-to-model assignment
- Model cost comparison per agent
- Usage analytics per agent/model
- One-click failover configuration

**Recommended Solution:**

Build OpenClaw Model Manager UI:
```
┌─────────────────────────────────────────────────────────────────┐
│              OpenClaw Model Manager                              │
│                                                                  │
│  Agent Model Assignment                                          │
│  ┌───────���──────────────────────────────────────────────────┐   │
│  │  Agent        │  Current Model      │  Change To         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Steward      │  MiniMax-M2.7      │  [GPT-4o    ▼]     │   │
│  │  Alpha        │  MiniMax-M2.7      │  [Claude-3.5  ▼]   │   │
│  │  Beta         │  MiniMax-M2.7      │  [Gemini-2.0  ▼]   │   │
│  │  Charlie      │  MiniMax-M2.7      │  [MiniMax-M2.7 ▼]  │   │
│  │  Coder        │  zai/glm-5-1       │  [GPT-4o    ▼]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Save Configuration]  [Test All Endpoints]  [Reset to Default] │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Gap 3.2.3: No Configuration Validation Tool

| Attribute | Value |
|-----------|-------|
| **Description** | No tool to validate LiteLLM and openclaw.json configurations |
| **Impact** | Configuration errors discovered at runtime |
| **Affected Users** | All users deploying or modifying configuration |
| **Priority** | 🔴 P0 |
| **Effort** | Low (1 week) |

**Missing Features:**
- YAML syntax validation
- Schema validation for litellm_config.yaml
- JSON schema validation for openclaw.json
- API key connectivity tests
- Model endpoint health checks
- Configuration diff tool

**Recommended Solution:**

```bash
# Proposed validation CLI
openclaw config validate
  ├── Validate litellm_config.yaml syntax
  ├── Validate openclaw.json schema
  ├── Test all API endpoints
  ├── Check model availability
  └── Report configuration issues

# Example output
✓ litellm_config.yaml syntax valid
✓ openclaw.json schema valid
✓ MiniMax API connection: OK (45ms)
✓ z.ai API connection: OK (120ms)
⚠ OpenAI API key not configured
✗ Anthropic endpoint unreachable
```

---

#### Gap 3.2.4: No Model Cost Tracking Dashboard

| Attribute | Value |
|-----------|-------|
| **Description** | Cost tracking exists in LiteLLM but not OpenClaw-specific |
| **Impact** | Users cannot see per-agent costs in OpenClaw context |
| **Affected Users** | All users managing budgets |
| **Priority** | 🟡 P1 |
| **Effort** | Medium (2 weeks) |

**Current State:**
- LiteLLM has built-in cost tracking
- Langfuse provides observability
- No OpenClaw-specific cost dashboard

**Missing Features:**
- Per-agent cost breakdown
- Per-model cost analysis
- Budget alerts per agent
- Cost projection based on usage
- Cost optimization recommendations

---

### 3.3 API Management Summary

| Gap | Priority | Effort | Recommendation |
|-----|----------|--------|----------------|
| Limited provider support | P0 | Low | Add provider templates |
| No per-agent configuration UI | P0 | Medium | Build Model Manager UI |
| No configuration validation | P0 | Low | Build validation CLI |
| No cost tracking dashboard | P1 | Medium | Build cost dashboard |

---

## 4. Data Persistence Review

### 4.1 Current State

#### Volume Configuration

**File:** [`docker-compose.yml`](docker-compose.yml:344)

| Volume | Driver | Service | Data Type | Retention |
|--------|--------|---------|-----------|-----------|
| `postgres_data` | local | postgres | Database | Persistent |
| `redis_data` | local | redis | Cache/Sessions | Persistent |
| `ollama_data` | local | ollama | LLM Models | Persistent |
| `langfuse_postgres_data` | local | langfuse-postgres | Observability DB | Persistent |
| `langfuse_blobs` | local | langfuse | Observability Blobs | Persistent |
| `collective_memory` | local | - | Skills (bind-mounted) | N/A |

#### Backup System

**File:** [`scripts/production-backup.sh`](scripts/production-backup.sh:1)

**Backup Capabilities:**

| Backup Type | Supported | Schedule | Retention |
|-------------|-----------|----------|-----------|
| PostgreSQL | ✅ Manual script | Manual | 30 days |
| Redis | ✅ Manual script | Manual | 7 days |
| Workspace | ✅ Manual script | Manual | 30 days |
| Agent State | ✅ Manual script | Manual | 7 days |
| Config | ✅ Manual script | Manual | 30 days |
| Full System | ✅ Manual script | Manual | 90 days |

**Backup Configuration:**

**File:** [`docs/operations/backup-config.json`](docs/operations/backup-config.json:1)

```json
{
  "schedules": {
    "database": { "cron": "0 2 * * *", "retention_days": 30 },
    "redis": { "cron": "0 3 * * *", "retention_days": 7 },
    "workspace": { "cron": "0 4 * * *", "retention_days": 30 },
    "agent_state": { "cron": "0 */6 * * *", "retention_days": 7 },
    "full_system": { "cron": "0 5 * * 0", "retention_days": 90 }
  }
}
```

---

### 4.2 Gap Analysis: Data Persistence

#### Gap 4.2.1: No Automated Backup Scheduling

| Attribute | Value |
|-----------|-------|
| **Description** | Backup script exists but requires manual execution or external cron |
| **Impact** | Users may forget to run backups, risking data loss |
| **Affected Users** | All production users |
| **Priority** | 🔴 P0 |
| **Effort** | Low (1 week) |

**Current State:**
- [`production-backup.sh`](scripts/production-backup.sh:1) is comprehensive but manual
- [`backup-config.json`](docs/operations/backup-config.json:1) defines schedules but doesn't enforce them
- Documentation suggests manual cron setup

**Missing Features:**
- Built-in backup scheduler (systemd timer or internal cron)
- Backup status notifications
- Failed backup alerts
- Backup verification automation

**Recommended Solution:**

```bash
# Add systemd timer for automated backups
# /etc/systemd/system/openclaw-backup.timer
[Unit]
Description=Daily OpenClaw Backup
Requires=openclaw-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target

# /etc/systemd/system/openclaw-backup.service
[Unit]
Description=OpenClaw Backup Service
After=docker.service

[Service]
Type=oneshot
ExecStart=/root/heretek/heretek-openclaw/scripts/production-backup.sh --all
```

---

#### Gap 4.2.2: No Database Migration Strategy

| Attribute | Value |
|-----------|-------|
| **Description** | No schema migration system for PostgreSQL |
| **Impact** | Database updates may fail or cause data loss during upgrades |
| **Affected Users** | Users upgrading between versions |
| **Priority** | 🔴 P0 |
| **Effort** | Medium (2-3 weeks) |

**Current State:**
- PostgreSQL schema created on first run
- pgvector extension installed via init script
- No versioned migrations
- No rollback capability

**Missing Features:**
- Migration versioning system
- Pre-upgrade backup automation
- Rollback procedures
- Migration testing framework
- Schema documentation

**Recommended Solution:**

Implement database migration system:
```bash
# Proposed migration structure
migrations/
├── 001_initial_schema.sql
├── 002_add_vector_indexes.sql
├── 003_add_agent_memory_table.sql
├── 004_add_episodic_memory.sql
└── rollback/
    ├── 001_initial_schema.sql
    └── ...

# Migration CLI
openclaw db migrate
  ├── Check current schema version
  ├── Apply pending migrations
  ├── Verify migration success
  └── Update schema_version table

openclaw db rollback --to 002
  ├── Create pre-rollback backup
  ├── Apply rollback migrations
  └── Verify data integrity
```

---

#### Gap 4.2.3: No Update/Upgrade Safety Procedures

| Attribute | Value |
|-----------|-------|
| **Description** | No documented or automated safe upgrade procedures |
| **Impact** | Updates may cause data loss or service disruption |
| **Affected Users** | All users performing updates |
| **Priority** | 🔴 P0 |
| **Effort** | Medium (2 weeks) |

**Current State:**
- [`MIGRATION_GUIDE.md`](docs/deployment/MIGRATION_GUIDE.md:1) documents v1.x to v2.0.3 migration
- No automated upgrade procedures
- No pre-upgrade validation

**Missing Features:**
- Pre-upgrade validation checklist
- Automated pre-upgrade backup
- Rolling update support
- Post-upgrade verification
- Rollback procedures

**Recommended Upgrade Procedure:**

```bash
# Proposed safe upgrade script
openclaw upgrade --to v2.1.0
  ├── Step 1: Validate current state
  ├── Step 2: Create full backup
  ├── Step 3: Verify backup integrity
  ├── Step 4: Pull new images
  ├── Step 5: Stop services gracefully
  ├── Step 6: Apply database migrations
  ├── Step 7: Start new services
  ├── Step 8: Run health checks
  ├── Step 9: Verify data integrity
  └── Step 10: Report upgrade status
```

---

#### Gap 4.2.4: No Remote Backup Storage

| Attribute | Value |
|-----------|-------|
| **Description** | Backups stored locally only |
| **Impact** | Single point of failure, no disaster recovery |
| **Affected Users** | Production users |
| **Priority** | 🟡 P1 |
| **Effort** | Medium (2 weeks) |

**Missing Features:**
- S3-compatible storage integration
- Google Drive backup export
- Encrypted remote backups
- Backup replication

**Recommended Solution:**
- Add S3 upload option to backup script
- Support for rclone integration
- Encrypted backup archives

---

#### Gap 4.2.5: No Volume Size Monitoring

| Attribute | Value |
|-----------|-------|
| **Description** | No monitoring for volume capacity |
| **Impact** | Volumes may fill up causing service failures |
| **Affected Users** | Long-running deployments |
| **Priority** | 🟡 P1 |
| **Effort** | Low (1 week) |

**Recommended Solution:**
- Add volume size metrics to monitoring
- Alert on 80% capacity threshold
- Automatic cleanup recommendations

---

### 4.3 Data Persistence Summary

| Gap | Priority | Effort | Recommendation |
|-----|----------|--------|----------------|
| No automated backup scheduling | P0 | Low | Add systemd timers |
| No database migration strategy | P0 | Medium | Build migration system |
| No upgrade safety procedures | P0 | Medium | Build upgrade script |
| No remote backup storage | P1 | Medium | Add S3/rclone support |
| No volume monitoring | P1 | Low | Add volume metrics |

---

## 5. Deployment Tooling Proposal

### 5.1 Current State

#### Existing Tooling

| Tool | Type | Status | Purpose |
|------|------|--------|---------|
| `docker compose up` | CLI | ✅ Production | Start services |
| `helm install` | CLI | ✅ Production | Kubernetes deployment |
| `openclaw gateway` | CLI | ✅ Production | Gateway management |
| [`health-check.sh`](scripts/health-check.sh:1) | Script | ✅ Production | Health validation |
| [`production-backup.sh`](scripts/production-backup.sh:1) | Script | ✅ Production | Backup operations |

#### CI/CD Pipeline

**File:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml:1)

| Feature | Status | Description |
|---------|--------|-------------|
| Automated builds | ✅ | Docker image builds on release |
| Staging deployment | ✅ | Helm-based staging deploy |
| Production deployment | ✅ | Helm-based production deploy |
| Health checks | ✅ | Post-deployment validation |
| Version management | ✅ | Automatic version tagging |

---

### 5.2 Gap Analysis: Deployment Tooling

#### Gap 5.2.1: No Interactive Setup Wizard

| Attribute | Value |
|-----------|-------|
| **Description** | First-time users must manually configure everything |
| **Impact** | High barrier to entry, configuration errors |
| **Affected Users** | New users |
| **Priority** | 🔴 P0 |
| **Effort** | Medium (2-3 weeks) |

**Current State:**
- Users must manually:
  - Copy `.env.example` to `.env`
  - Generate secure keys
  - Edit configuration files
  - Deploy services
  - Validate installation

**Missing Features:**
- Interactive setup wizard
- Automatic key generation
- Configuration validation during setup
- Step-by-step guidance
- Progress indicators

**Recommended Solution:**

```bash
# Proposed interactive setup
openclaw setup
  ┌─────────────────────────────────────────────────────────────────┐
  │  Welcome to Heretek OpenClaw Setup Wizard                       │
  │                                                                 │
  │  Step 1/6: Environment Configuration                           │
  │  ───────────────────────────────────────────────────────────    │
  │                                                                 │
  │  Where should OpenClaw be installed?                           │
  │  Current: /root/.openclaw                                      │
  │  > /root/.openclaw                                             │
  │                                                                 │
  │  Step 2/6: API Provider Selection                              │
  │  ───────────────────────────────────────────────────────────    │
  │                                                                 │
  │  Which LLM providers will you use? (Select all that apply)     │
  │  [ ] MiniMax (Primary - Recommended)                           │
  │  [ ] z.ai (Failover)                                           │
  │  [ ] OpenAI                                                    │
  │  [ ] Anthropic                                                 │
  │  [ ] Google                                                    │
  │  [ ] Ollama (Local)                                            │
  │                                                                 │
  │  Step 3/6: API Key Configuration                               │
  │  ───────────────────────────────────────────────────────────    │
  │                                                                 │
  │  Enter your MiniMax API key:                                   │
  │  > ••••••••••••••••••••••••••••••••                           │
  │                                                                 │
  │  Step 4/6: Security Configuration                              │
  │  ───────────────────────────────────────────────────────────    │
  │                                                                 │
  │  Generating secure keys...                                     │
  │  ✓ LITELLM_MASTER_KEY generated                                │
  │  ✓ LITELLM_SALT_KEY generated                                  │
  │  ✓ POSTGRES_PASSWORD generated                                 │
  │                                                                 │
  │  Step 5/6: Resource Allocation                                 │
  │  ─────────────────────────────────────────────────────────��─    │
  │                                                                 │
  │  Deployment size:                                              │
  │  ○ Minimal (2 CPU, 4GB RAM)                                    │
  │  ● Standard (4 CPU, 8GB RAM)  ← Recommended                    │
  │  ○ Large (8 CPU, 16GB RAM)                                     │
  │                                                                 │
  │  Step 6/6: Deployment Selection                                │
  │  ───────────────────────────────────────────────────────────    │
  │                                                                 │
  │  How will you deploy?                                          │
  │  ● Docker Compose (Recommended for local)                      │
  │  ○ Kubernetes Helm (Recommended for production)                │
  │  ○ Bare-metal (Advanced)                                       │
  │                                                                 │
  │  [Begin Installation]                                          │
  └─────────────────────────────────────────────────────────────────┘
```

---

#### Gap 5.2.2: No Health Check Dashboard

| Attribute | Value |
|-----------|-------|
| **Description** | Health checks exist as scripts but no visual dashboard |
| **Impact** | Users cannot quickly assess system health |
| **Affected Users** | All users |
| **Priority** | 🔴 P0 |
| **Effort** | Medium (2-3 weeks) |

**Current State:**
- [`health-check.sh`](scripts/health-check.sh:1) provides CLI health checks
- No visual representation of health status
- No historical health data

**Missing Features:**
- Real-time health dashboard
- Service status visualization
- Historical health trends
- Alert notifications
- Health check scheduling

**Recommended Solution:**

```
┌─────────────────────────────────────────────────────────────────┐
│              OpenClaw Health Dashboard                           │
│                                                                  │
│  System Status: HEALTHY                          Last: 2 min ago │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  Core Services                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service         │  Status  │  Response  │  Uptime       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Gateway         │  ● OK    │  12ms      │  99.9% (24h)  │   │
│  │  LiteLLM         │  ● OK    │  45ms      │  99.8% (24h)  │   │
│  │  PostgreSQL      │  ● OK    │  8ms       │  100% (24h)   │   │
│  │  Redis           │  ● OK    │  3ms       │  99.9% (24h)  │   │
│  │  Ollama          │  ● OK    │  120ms     │  98.5% (24h)  │   │
│  │  Langfuse        │  ● OK    │  85ms      │  99.7% (24h)  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Agent Status                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Agent        │  Status  │  Last Active  │  Memory       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Steward      │  ● OK    │  1 min ago    │  245 MB       │   │
│  │  Alpha        │  ● OK    │  2 min ago    │  198 MB       │   │
│  │  Beta         │  ● OK    │  2 min ago    │  201 MB       │   │
│  │  Charlie      │  ● OK    │  3 min ago    │  187 MB       │   │
│  │  ...          │          │               │               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Resource Usage                                                  │
│  CPU:    ████████░░░░░░░░░░░░ 40%                                │
│  Memory: ██████████████░░░░░░ 68%                                │
│  Disk:   ██████░░░░░░░░░░░░░░ 32%                                │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Gap 5.2.3: No Deployment CLI Tool

| Attribute | Value |
|-----------|-------|
| **Description** | No unified CLI for deployment operations |
| **Impact** | Users must remember multiple commands and tools |
| **Affected Users** | All users |
| **Priority** | 🟡 P1 |
| **Effort** | High (4-6 weeks) |

**Current State:**
- Docker Compose commands for local deployment
- Helm commands for Kubernetes
- OpenClaw Gateway CLI for agent management
- Separate scripts for backup, health checks

**Missing Features:**
- Unified deployment CLI
- Deployment status tracking
- One-command deploy/undeploy
- Environment management
- Configuration management

**Recommended Solution:**

```bash
# Proposed OpenClaw CLI structure
openclaw deploy
  ├── openclaw deploy docker        # Docker Compose deployment
  ├── openclaw deploy k8s           # Kubernetes deployment
  ├── openclaw deploy baremetal     # Bare-metal deployment
  └── openclaw deploy cloud         # Cloud-native deployment

openclaw status
  ├── Show all service statuses
  ├── Show agent statuses
  └── Show resource usage

openclaw config
  ├── openclaw config show          # Show current config
  ├── openclaw config edit          # Edit configuration
  ├── openclaw config validate      # Validate configuration
  └── openclaw config backup        # Backup configuration

openclaw backup
  ├── openclaw backup create        # Create backup
  ├── openclaw backup list          # List backups
  ├── openclaw backup restore       # Restore from backup
  └── openclaw backup verify        # Verify backup

openclaw logs
  ├── openclaw logs gateway         # Gateway logs
  ├── openclaw logs agents          # Agent logs
  └── openclaw logs services        # Infrastructure logs

openclaw upgrade
  ├── openclaw upgrade check        # Check for updates
  ├── openclaw upgrade plan         # Plan upgrade
  └── openclaw upgrade apply        # Apply upgrade
```

---

#### Gap 5.2.4: No Configuration Diff Tool

| Attribute | Value |
|-----------|-------|
| **Description** | No tool to compare configurations |
| **Impact** | Users cannot easily track configuration changes |
| **Affected Users** | Users managing multiple environments |
| **Priority** | 🟡 P2 |
| **Effort** | Low (1 week) |

**Recommended Solution:**
```bash
# Proposed diff tool
openclaw config diff --from dev --to prod
  ├── Compare configurations
  ├── Highlight differences
  └── Generate migration report
```

---

### 5.3 Deployment Tooling Summary

| Gap | Priority | Effort | Recommendation |
|-----|----------|--------|----------------|
| No setup wizard | P0 | Medium | Build interactive wizard |
| No health dashboard | P0 | Medium | Build health dashboard |
| No deployment CLI | P1 | High | Build unified CLI |
| No config diff tool | P2 | Low | Build diff utility |

---

## 6. Priority Recommendations

### 6.1 P0 (Critical) - Immediate Action Required

| # | Initiative | Category | Effort | Timeline | Owner |
|---|------------|----------|--------|----------|-------|
| 1 | **Add Provider Templates** | API Management | Low | 1 week | Core |
| 2 | **Build Configuration Validator** | API Management | Low | 1 week | Core |
| 3 | **Automated Backup Scheduling** | Data Persistence | Low | 1 week | DevOps |
| 4 | **Database Migration System** | Data Persistence | Medium | 2-3 weeks | Core |
| 5 | **Upgrade Safety Procedures** | Data Persistence | Medium | 2 weeks | DevOps |
| 6 | **Interactive Setup Wizard** | Deployment Tooling | Medium | 2-3 weeks | Core |
| 7 | **Health Check Dashboard** | Deployment Tooling | Medium | 2-3 weeks | Core |

**Total P0 Effort:** 9-13 weeks

---

### 6.2 P1 (High) - Short-term

| # | Initiative | Category | Effort | Timeline | Owner |
|---|------------|----------|--------|----------|-------|
| 1 | **Per-Agent Model Configuration UI** | API Management | Medium | 2-3 weeks | Core |
| 2 | **Bare-Metal Deployment Scripts** | Deployment Options | High | 4-6 weeks | DevOps |
| 3 | **Remote Backup Storage** | Data Persistence | Medium | 2 weeks | DevOps |
| 4 | **Volume Monitoring** | Data Persistence | Low | 1 week | DevOps |
| 5 | **Deployment CLI Tool** | Deployment Tooling | High | 4-6 weeks | Core |
| 6 | **Cost Tracking Dashboard** | API Management | Medium | 2 weeks | Core |

**Total P1 Effort:** 15-20 weeks

---

### 6.3 P2 (Medium) - Medium-term

| # | Initiative | Category | Effort | Timeline | Owner |
|---|------------|----------|--------|----------|-------|
| 1 | **VM Image Templates** | Deployment Options | Medium | 2-3 weeks | DevOps |
| 2 | **AWS CloudFormation** | Deployment Options | High | 4-6 weeks | DevOps |
| 3 | **Terraform Modules** | Deployment Options | High | 4-6 weeks | DevOps |
| 4 | **Managed Services Integration** | Deployment Options | High | 6-8 weeks | DevOps |
| 5 | **Configuration Diff Tool** | Deployment Tooling | Low | 1 week | Core |

**Total P2 Effort:** 17-24 weeks

---

### 6.4 P3 (Low) - Long-term

| # | Initiative | Category | Effort | Timeline | Owner |
|---|------------|----------|--------|----------|-------|
| 1 | **Cloud-Native Deployments (GCP/Azure)** | Deployment Options | High | 6-8 weeks | DevOps |
| 2 | **Service Mesh Integration** | Deployment Tooling | Medium | 2-3 weeks | DevOps |
| 3 | **Enterprise Features** | Deployment Tooling | Medium | 2-4 weeks | Core |

**Total P3 Effort:** 10-15 weeks

---

### 6.5 Summary by Category

| Category | P0 | P1 | P2 | P3 | Total Effort |
|----------|----|----|----|----|--------------|
| **Deployment Options** | 0 | 1 | 4 | 2 | 22-33 weeks |
| **API Management** | 2 | 2 | 0 | 0 | 6-8 weeks |
| **Data Persistence** | 3 | 2 | 0 | 0 | 8-10 weeks |
| **Deployment Tooling** | 2 | 1 | 1 | 1 | 8-13 weeks |
| **TOTAL** | **7** | **6** | **5** | **3** | **44-64 weeks** |

---

## 7. Implementation Roadmap

### 7.1 Phase 1 (Weeks 1-4): Foundation

**Focus:** Critical API management and backup automation

| Week | Initiative | Deliverables | Success Criteria |
|------|------------|--------------|------------------|
| **1** | Provider Templates | - OpenAI, Anthropic, Google templates<br>- Updated `.env.example` | ✅ All major providers configurable |
| **2** | Configuration Validator | - CLI validation tool<br>- Schema definitions | ✅ `openclaw config validate` working |
| **3** | Automated Backups | - Systemd timers<br>- Backup notifications | ✅ Daily backups running automatically |
| **4** | Setup Wizard (Start) | - Interactive CLI wizard<br>- Key generation | ✅ Wizard guides through setup |

---

### 7.2 Phase 2 (Weeks 5-8): Data Safety

**Focus:** Database migrations and upgrade safety

| Week | Initiative | Deliverables | Success Criteria |
|------|------------|--------------|------------------|
| **5-6** | Migration System | - Versioned migrations<br>- Rollback support | ✅ Migrations apply cleanly |
| **7** | Upgrade Procedures | - Safe upgrade script<br>- Pre/post validation | ✅ Zero-downtime upgrades |
| **8** | Health Dashboard | - Real-time dashboard<br>- Alert system | ✅ Dashboard shows live status |

---

### 7.3 Phase 3 (Weeks 9-16): User Experience

**Focus:** Per-agent configuration and deployment CLI

| Week | Initiative | Deliverables | Success Criteria |
|------|------------|--------------|------------------|
| **9-10** | Model Manager UI | - Web UI for model config<br>- Per-agent assignment | ✅ UI for model configuration |
| **11-12** | Cost Dashboard | - Per-agent cost tracking<br>- Budget alerts | ✅ Cost visibility per agent |
| **13-16** | Deployment CLI | - Unified CLI tool<br>- All deployment commands | ✅ Single CLI for all operations |

---

### 7.4 Phase 4 (Weeks 17-24): Deployment Flexibility

**Focus:** Non-Docker deployment options

| Week | Initiative | Deliverables | Success Criteria |
|------|------------|--------------|------------------|
| **17-20** | Bare-Metal Scripts | - Native install scripts<br>- Systemd services | ✅ Docker-free deployment |
| **21-22** | VM Images | - Packer templates<br>- Cloud images | ✅ Pre-built VM images |
| **23-24** | Cloud-Native | - Terraform modules<br>- Managed services | ✅ AWS/GCP/Azure support |

---

### 7.5 Milestone Summary

| Milestone | Target | Key Deliverables |
|-----------|--------|------------------|
| **M1: API Foundation** | Week 4 | Provider templates, config validator, backup automation |
| **M2: Data Safety** | Week 8 | Migration system, upgrade procedures, health dashboard |
| **M3: UX Enhancement** | Week 16 | Model Manager UI, cost dashboard, deployment CLI |
| **M4: Deployment Flexibility** | Week 24 | Bare-metal, VM images, cloud-native |

---

## Appendix A: Quick Reference

### A.1 Current File Locations

| File | Purpose | Location |
|------|---------|----------|
| Docker Compose | Local deployment | [`docker-compose.yml`](docker-compose.yml:1) |
| Helm Chart | Kubernetes deployment | [`charts/openclaw/`](charts/openclaw/Chart.yaml:1) |
| LiteLLM Config | Model routing | [`litellm_config.yaml`](litellm_config.yaml:1) |
| Gateway Config | Agent configuration | [`openclaw.json`](openclaw.json:1) |
| Backup Script | Manual backups | [`scripts/production-backup.sh`](scripts/production-backup.sh:1) |
| Health Check | Service validation | [`scripts/health-check.sh`](scripts/health-check.sh:1) |

### A.2 Key Ports

| Service | Port | Purpose |
|---------|------|---------|
| OpenClaw Gateway | 18789 | Agent WebSocket RPC |
| LiteLLM | 4000 | Model API Gateway |
| PostgreSQL | 5432 | Vector Database |
| Redis | 6379 | Cache |
| Ollama | 11434 | Local LLM |
| Langfuse | 3000 | Observability Dashboard |

### A.3 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `MINIMAX_API_KEY` | MiniMax API access | ✅ |
| `ZAI_API_KEY` | z.ai API access | ✅ |
| `LITELLM_MASTER_KEY` | LiteLLM authentication | ✅ |
| `POSTGRES_PASSWORD` | Database password | ✅ |
| `OPENCLAW_DIR` | Gateway workspace | ✅ |

---

*P4-5 Deployment Gap Analysis Report - Generated 2026-03-31*

🦞 *The thought that never ends.*
