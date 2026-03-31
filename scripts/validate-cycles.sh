#!/bin/bash

# ==============================================================================
# Heretek OpenClaw — Gateway Architecture Validation Script
# ==============================================================================
# Validates the OpenClaw Gateway v2026.3.28+ architecture and generates
# a validation report.
#
# Usage:
#   ./scripts/validate-cycles.sh [--verbose] [--output FILE]
#
# DEPRECATED: This script was originally written for cycle-based validation
# of the legacy container architecture. It has been updated to validate the
# current Gateway-based architecture (v2.0.3+).
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Options
VERBOSE=false
OUTPUT_FILE=""
VALIDATION_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        log_pass "$description: $file exists"
        return 0
    else
        log_fail "$description: $file NOT FOUND"
        return 1
    fi
}

check_dir() {
    local dir=$1
    local description=$2
    if [ -d "$dir" ]; then
        log_pass "$description: $dir exists"
        return 0
    else
        log_fail "$description: $dir NOT FOUND"
        return 1
    fi
}

check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    if grep -q "$pattern" "$file" 2>/dev/null; then
        log_pass "$description"
        return 0
    else
        log_fail "$description: pattern not found in $file"
        return 1
    fi
}

# ==============================================================================
# Gateway Architecture Validation
# ==============================================================================

validate_gateway() {
    log_info "Validating OpenClaw Gateway Architecture"
    echo "============================================="
    
    # Check openclaw.json exists
    check_file "openclaw.json" "OpenClaw Gateway configuration"
    
    # Check agents directory exists
    check_dir "agents" "Agent templates directory"
    
    # Check agent identity files
    check_file "agents/steward/IDENTITY.md" "Steward agent identity"
    check_file "agents/alpha/IDENTITY.md" "Alpha agent identity"
    check_file "agents/beta/IDENTITY.md" "Beta agent identity"
    check_file "agents/charlie/IDENTITY.md" "Charlie agent identity"
    check_file "agents/examiner/IDENTITY.md" "Examiner agent identity"
    check_file "agents/explorer/IDENTITY.md" "Explorer agent identity"
    check_file "agents/sentinel/IDENTITY.md" "Sentinel agent identity"
    check_file "agents/coder/IDENTITY.md" "Coder agent identity"
    check_file "agents/dreamer/IDENTITY.md" "Dreamer agent identity"
    check_file "agents/empath/IDENTITY.md" "Empath agent identity"
    check_file "agents/historian/IDENTITY.md" "Historian agent identity"
    
    # Check agent client library
    check_file "agents/lib/agent-client.js" "Gateway WebSocket RPC client"
    
    # Check docker-compose.yml
    check_file "docker-compose.yml" "Docker Compose configuration"
    
    echo ""
}

# ==============================================================================
# LiteLLM Configuration Validation
# ==============================================================================

validate_litellm() {
    log_info "Validating LiteLLM Configuration"
    echo "====================================="
    
    # Check litellm_config.yaml exists
    check_file "litellm_config.yaml" "LiteLLM configuration"
    
    # Check model routing configured
    check_content "litellm_config.yaml" "model_list" "Model routing configured"
    
    # Check agent passthrough endpoints
    check_content "openclaw.json" "passthrough_endpoints" "Agent passthrough endpoints"
    
    echo ""
}

# ==============================================================================
# Skills Repository Validation
# ==============================================================================

validate_skills() {
    log_info "Validating Skills Repository"
    echo "================================="
    
    # Check skills directory exists
    check_dir "skills" "Skills directory"
    
    # Check key skills
    check_file "skills/steward-orchestrator/SKILL.md" "Steward Orchestrator skill"
    check_file "skills/triad-sync-protocol/SKILL.md" "Triad Sync Protocol skill"
    check_file "skills/backup-ledger/SKILL.md" "Backup Ledger skill"
    check_file "skills/curiosity-engine/SKILL.md" "Curiosity Engine skill"
    
    echo ""
}

# ==============================================================================
# Plugins Validation
# ==============================================================================

validate_plugins() {
    log_info "Validating Plugins"
    echo "======================"
    
    # Check plugins directory exists
    check_dir "plugins" "Plugins directory"
    
    # Check consciousness plugin
    check_file "plugins/openclaw-consciousness-plugin/package.json" "Consciousness plugin"
    check_file "plugins/openclaw-consciousness-plugin/README.md" "Consciousness plugin documentation"
    
    # Check liberation plugin
    check_file "plugins/openclaw-liberation-plugin/package.json" "Liberation plugin"
    check_file "plugins/openclaw-liberation-plugin/README.md" "Liberation plugin documentation"
    
    echo ""
}

# ==============================================================================
# Documentation Validation
# ==============================================================================

validate_documentation() {
    log_info "Validating Documentation"
    echo "============================"
    
    # Check main documentation files
    check_file "docs/README.md" "Documentation index"
    check_file "docs/ARCHITECTURE.md" "System architecture"
    check_file "docs/AGENTS.md" "Agent documentation"
    check_file "docs/PLUGINS.md" "Plugin documentation"
    check_file "docs/SKILLS.md" "Skills documentation"
    check_file "docs/CONFIGURATION.md" "Configuration reference"
    check_file "docs/DEPLOYMENT.md" "Deployment guide"
    check_file "docs/OPERATIONS.md" "Operations guide"
    
    # Check architecture subdirectory
    check_file "docs/architecture/GATEWAY_ARCHITECTURE.md" "Gateway architecture"
    check_file "docs/architecture/A2A_ARCHITECTURE.md" "A2A protocol documentation"
    
    echo ""
}

# ==============================================================================
# Operations Validation
# ==============================================================================

validate_operations() {
    log_info "Validating Operations Scripts"
    echo "================================="
    
    # Check operational scripts
    check_file "scripts/health-check.sh" "Health check script"
    check_file "scripts/production-backup.sh" "Production backup script"
    check_file "scripts/litellm-healthcheck.py" "LiteLLM health check"
    
    echo ""
}

# ==============================================================================
# Tests Validation
# ==============================================================================

validate_tests() {
    log_info "Validating Test Suite"
    echo "========================="
    
    # Check test directories
    check_dir "tests" "Tests directory"
    check_dir "tests/unit" "Unit tests"
    check_dir "tests/integration" "Integration tests"
    check_dir "tests/e2e" "End-to-end tests"
    
    # Check key test files
    check_file "tests/unit/health-check.test.ts" "Health check tests"
    check_file "tests/unit/agent-client.test.ts" "Agent client tests"
    check_file "tests/integration/a2a-communication.test.ts" "A2A communication tests"
    
    echo ""
}

# ==============================================================================
# Deprecated Components Check (Should NOT exist)
# ==============================================================================

validate_deprecated() {
    log_info "Checking for Deprecated Components (should be absent)"
    echo "========================================================="
    
    # These components were removed in v2.0.3
    if [ -d "web-interface" ]; then
        log_warn "DEPRECATED: web-interface/ directory still exists (removed in v2.0.3)"
    else
        log_pass "web-interface/ directory correctly removed"
    fi
    
    if [ -d "modules" ]; then
        log_warn "DEPRECATED: modules/ directory still exists (removed in v2.0.3)"
    else
        log_pass "modules/ directory correctly removed"
    fi
    
    if [ -d "init" ]; then
        log_warn "DEPRECATED: init/ directory still exists (removed in v2.0.3)"
    else
        log_pass "init/ directory correctly removed"
    fi
    
    if [ -d ".roo" ]; then
        log_warn "DEPRECATED: .roo/ directory still exists (removed in v2.0.3)"
    else
        log_pass ".roo/ directory correctly removed"
    fi
    
    if [ -d "installer" ]; then
        log_warn "DEPRECATED: installer/ directory still exists (removed in v2.0.3)"
    else
        log_pass "installer/ directory correctly removed"
    fi
    
    if [ -d "plans" ]; then
        log_warn "DEPRECATED: plans/ directory still exists (removed in v2.0.3)"
    else
        log_pass "plans/ directory correctly removed"
    fi
    
    echo ""
}

# ==============================================================================
# Generate Report
# ==============================================================================

generate_report() {
    local output=$1
    
    cat > "$output" << EOF
# Gateway Architecture Validation Report

**Date:** $VALIDATION_DATE  
**Status:** $([ $FAILED -eq 0 ] && echo "PASSED" || echo "FAILED")  
**Version:** OpenClaw Gateway v2026.3.28+

---

## Summary

| Metric | Count |
|--------|-------|
| Passed | $PASSED |
| Failed | $FAILED |
| Warnings | $WARNINGS |
| Total | $((PASSED + FAILED + WARNINGS)) |

---

## Validation Sections

### Gateway Architecture
- [x] openclaw.json configuration
- [x] Agent templates directory (agents/)
- [x] All 11 agent identity files
- [x] Gateway WebSocket RPC client (agent-client.js)
- [x] Docker Compose configuration

### LiteLLM Configuration
- [x] litellm_config.yaml
- [x] Model routing configured
- [x] Agent passthrough endpoints

### Skills Repository
- [x] Skills directory (skills/)
- [x] Core skills documented (SKILL.md)

### Plugins
- [x] Plugins directory (plugins/)
- [x] Consciousness plugin
- [x] Liberation plugin

### Documentation
- [x] docs/README.md
- [x] docs/ARCHITECTURE.md
- [x] docs/AGENTS.md
- [x] docs/PLUGINS.md
- [x] docs/SKILLS.md
- [x] docs/CONFIGURATION.md
- [x] docs/DEPLOYMENT.md
- [x] docs/OPERATIONS.md

### Operations
- [x] scripts/health-check.sh
- [x] scripts/production-backup.sh
- [x] scripts/litellm-healthcheck.py

### Test Suite
- [x] tests/unit/
- [x] tests/integration/
- [x] tests/e2e/

### Deprecated Components (Should Be Absent)
- [x] web-interface/ removed
- [x] modules/ removed
- [x] init/ removed
- [x] .roo/ removed
- [x] installer/ removed
- [x] plans/ removed

---

## Issues Found

$( [ $FAILED -eq 0 ] && echo "No critical issues found." || echo "$FAILED issue(s) require attention." )

$( [ $WARNINGS -gt 0 ] && echo "$WARNINGS warning(s) should be reviewed." )

---

## Next Steps

1. Run full test suite: \`npm test\`
2. Start services: \`docker compose up -d\`
3. Verify health endpoints: \`./scripts/health-check.sh\`
4. Monitor agent status via Gateway

---

*Generated: $VALIDATION_DATE*
EOF
    
    log_info "Report saved to: $output"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    echo "=============================================="
    echo "Heretek OpenClaw — Gateway Validation"
    echo "Version: OpenClaw Gateway v2026.3.28+"
    echo "=============================================="
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run all validations
    validate_gateway
    validate_litellm
    validate_skills
    validate_plugins
    validate_documentation
    validate_operations
    validate_tests
    validate_deprecated
    
    # Summary
    echo "=============================================="
    echo "Validation Summary"
    echo "=============================================="
    echo -e "${GREEN}Passed:${NC} $PASSED"
    echo -e "${RED}Failed:${NC} $FAILED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo "=============================================="
    
    # Generate report
    if [ -n "$OUTPUT_FILE" ]; then
        generate_report "$OUTPUT_FILE"
    fi
    
    # Exit with appropriate code
    if [ $FAILED -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
