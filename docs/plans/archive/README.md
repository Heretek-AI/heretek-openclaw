# Plans Archive

This directory contains archived planning documents that are no longer active but are retained for historical reference.

## Archive Strategy

Plans are archived when they are:
- Superseded by newer planning documents
- Completed and no longer actively referenced
- Merged into comprehensive implementation plans
- Designated as reference-only materials

Archived plans are organized by date in `YYYY-MM-DD` subdirectories, making it easy to track when documents were retired and locate historical context.

## Archive Contents

### 2026-03-30

Archived on March 30, 2026 during repository consolidation and plan rationalization.

| File | Original Purpose | Status |
|------|------------------|--------|
| `PRIME_DIRECTIVE_ENhanced.md` | Enhanced version of master directive | Superseded duplicate |
| `PRIME_DIRECTIVE_REVIEW.md` | Review documentation for PRIME_DIRECTIVE | Review completed |
| `DEVELOPMENT_PLAN_2026.md` | 2026 development roadmap | Outdated, superseded by IMPLEMENTATION_PLAN.md |
| `FULL_STACK_VALIDATION_PLAN.md` | Full-stack testing strategy | Merged into IMPLEMENTATION_PLAN.md |
| `COLLECTIVE_TEST_TASK.md` | Collective module testing tasks | Reference only |

## Active vs. Archived Plans

**Active plans** remain in:
- `docs/plans/` - Root plans directory (master documents only)
- `docs/plans/active/` - Currently being worked on

**Historical reference** stored in:
- `docs/plans/completed/` - Completed implementation plans
- `docs/plans/reference/` - Reference documents and assessments
- `docs/plans/specs/` - Technical specifications
- `docs/plans/research/` - Research documents
- `docs/plans/archive/` - Superseded/retired plans (this directory)

## Retrieving Archived Plans

To restore an archived plan to active status, copy (do not move) the file back to the appropriate directory:
- Active work: `docs/plans/active/`
- Reference: `docs/plans/reference/`
- Specifications: `docs/plans/specs/`

Always retain the archived copy for historical tracking.
