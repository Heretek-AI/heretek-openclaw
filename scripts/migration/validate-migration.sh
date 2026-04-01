#!/bin/bash

# Heretek OpenClaw Migration Validation Script
# 
# Verifies completeness of repository split by checking:
# - Required files exist in each repository
# - Package.json files are correctly updated
# - No cross-repo file references remain
# - CI/CD workflows are present
# 
# Usage: ./scripts/migration/validate-migration.sh [options]
# 
# Options:
#   --all       Validate all repositories
#   --repo <n>  Validate specific repository only
#   --fix       Attempt to fix common issues
#   --verbose   Show detailed output
#   --help      Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_CHECKS=0

# Repository configurations
declare -A REPO_FILES
REPO_FILES["heretek-openclaw-core"]="src/agents/ src/skills/ migrations/ tests/ openclaw.json package.json Dockerfile docker-compose.yml litellm_config.yaml"
REPO_FILES["heretek-openclaw-cli"]="src/ bin/openclaw.js package.json README.md openclaw.config.js scripts/install/"
REPO_FILES["heretek-openclaw-dashboard"]="src/ frontend/ config/ README.md package.json"
REPO_FILES["heretek-openclaw-plugins"]="plugins/ templates/ docs/ README.md"
REPO_FILES["heretek-openclaw-deploy"]="terraform/ kubernetes/ helm/ README.md"
REPO_FILES["heretek-openclaw-docs"]="src/ content/ package.json .github/workflows/deploy.yml"

declare -A REPO_PACKAGES
REPO_PACKAGES["heretek-openclaw-core"]="@heretek/openclaw-core"
REPO_PACKAGES["heretek-openclaw-cli"]="@heretek/openclaw-cli"
REPO_PACKAGES["heretek-openclaw-dashboard"]="@heretek/openclaw-dashboard"
REPO_PACKAGES["heretek-openclaw-plugins"]="@heretek/openclaw-plugins"

# Parse arguments
VALIDATE_ALL=false
SPECIFIC_REPO=""
DO_FIX=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      VALIDATE_ALL=true
      shift
      ;;
    --repo)
      SPECIFIC_REPO="$2"
      shift 2
      ;;
    --fix)
      DO_FIX=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Heretek OpenClaw Migration Validation Script"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --all       Validate all repositories"
      echo "  --repo <n>  Validate specific repository only"
      echo "  --fix       Attempt to fix common issues"
      echo "  --verbose   Show detailed output"
      echo "  --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((TOTAL_WARNINGS++))
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
  ((TOTAL_ERRORS++))
}

log_check() {
  ((TOTAL_CHECKS++))
  if [ "$VERBOSE" = true ]; then
    echo "  ✓ $1"
  fi
}

# Check if a file or directory exists
check_exists() {
  local path="$1"
  local name="$2"
  
  if [ -e "$path" ]; then
    log_check "$name exists"
    return 0
  else
    log_error "Missing: $name ($path)"
    return 1
  fi
}

# Validate package.json
validate_package_json() {
  local repo_dir="$1"
  local repo_name="$2"
  local expected_package="${REPO_PACKAGES[$repo_name]}"
  
  if [ -z "$expected_package" ]; then
    log_info "No package.json expected for $repo_name"
    return 0
  fi
  
  local package_json="$repo_dir/package.json"
  
  # Check for CLI which has nested package.json
  if [ "$repo_name" = "heretek-openclaw-cli" ]; then
    # After migration, cli/ contents should be at root
    if [ ! -f "$package_json" ]; then
      # Check if it's still in cli/ subdirectory
      if [ -f "$repo_dir/cli/package.json" ]; then
        log_warning "CLI package.json still in cli/ subdirectory"
        if [ "$DO_FIX" = true ]; then
          log_info "Moving cli/ contents to root..."
          mv "$repo_dir/cli/"* "$repo_dir/"
          rmdir "$repo_dir/cli" 2>/dev/null || true
          log_success "Moved cli/ contents to root"
        fi
      else
        log_error "CLI package.json not found"
        return 1
      fi
    fi
  fi
  
  if [ ! -f "$package_json" ]; then
    log_error "package.json not found in $repo_dir"
    return 1
  fi
  
  # Check package name
  local actual_package=$(node -e "console.log(require('$package_json').name)" 2>/dev/null || echo "")
  if [ "$actual_package" != "$expected_package" ]; then
    log_warning "Package name mismatch: expected '$expected_package', got '$actual_package'"
    if [ "$DO_FIX" = true ]; then
      log_info "Fixing package name..."
      node -e "
        const pkg = require('$package_json');
        pkg.name = '$expected_package';
        pkg.version = '1.0.0';
        pkg.repository = { type: 'git', url: 'https://github.com/heretek/$repo_name.git' };
        require('fs').writeFileSync('$package_json', JSON.stringify(pkg, null, 2));
      "
      log_success "Fixed package.json"
    fi
  else
    log_check "Package name is correct: $expected_package"
  fi
  
  return 0
}

# Check for CI/CD workflows
validate_ci_cd() {
  local repo_dir="$1"
  local repo_name="$2"
  
  local workflows_dir="$repo_dir/.github/workflows"
  
  if [ ! -d "$workflows_dir" ]; then
    log_warning "No .github/workflows directory found"
    return 1
  fi
  
  local workflow_count=$(ls -1 "$workflows_dir"/*.yml 2>/dev/null | wc -l)
  if [ "$workflow_count" -eq 0 ]; then
    log_warning "No workflow files found in .github/workflows"
    return 1
  fi
  
  log_check "Found $workflow_count workflow(s)"
  
  # Check for essential workflows
  local has_ci=false
  local has_release=false
  
  for workflow in "$workflows_dir"/*.yml; do
    if grep -q "test\|build\|ci" "$workflow" 2>/dev/null; then
      has_ci=true
    fi
    if grep -q "release\|publish" "$workflow" 2>/dev/null; then
      has_release=true
    fi
  done
  
  if [ "$has_ci" = false ]; then
    log_warning "No CI workflow detected"
  else
    log_check "CI workflow present"
  fi
  
  if [ "$has_release" = false ]; then
    log_warning "No release workflow detected"
  else
    log_check "Release workflow present"
  fi
  
  return 0
}

# Check for cross-repo file references
validate_no_cross_refs() {
  local repo_dir="$1"
  local repo_name="$2"
  
  log_info "Checking for cross-repo references..."
  
  # Patterns that indicate cross-repo file references
  local patterns=(
    "../agents/"
    "../skills/"
    "../dashboard/"
    "../cli/"
    "../plugins/"
    "../../agents/"
    "../../skills/"
  )
  
  local found_refs=0
  
  for pattern in "${patterns[@]}"; do
    local matches=$(grep -r "$pattern" "$repo_dir" --include="*.js" --include="*.ts" --include="*.json" 2>/dev/null | wc -l)
    if [ "$matches" -gt 0 ]; then
      log_warning "Found $matches reference(s) to '$pattern'"
      found_refs=$((found_refs + matches))
    fi
  done
  
  if [ "$found_refs" -eq 0 ]; then
    log_check "No cross-repo file references found"
  else
    log_warning "Total cross-repo references: $found_refs"
    if [ "$DO_FIX" = true ]; then
      log_info "Run update-imports.js to fix these references"
    fi
  fi
  
  return 0
}

# Validate a single repository
validate_repository() {
  local repo_name="$1"
  local repo_dir="./$repo_name"
  
  echo ""
  echo "========================================"
  echo "Validating: $repo_name"
  echo "========================================"
  
  if [ ! -d "$repo_dir" ]; then
    log_error "Repository directory not found: $repo_dir"
    return 1
  fi
  
  # Check required files
  local required_files="${REPO_FILES[$repo_name]}"
  for file in $required_files; do
    check_exists "$repo_dir/$file" "$file"
  done
  
  # Validate package.json
  validate_package_json "$repo_dir" "$repo_name"
  
  # Validate CI/CD
  validate_ci_cd "$repo_dir" "$repo_name"
  
  # Check for cross-repo references
  validate_no_cross_refs "$repo_dir" "$repo_name"
  
  # Check git remote
  if [ -d "$repo_dir/.git" ]; then
    local remote=$(cd "$repo_dir" && git remote get-url origin 2>/dev/null || echo "")
    if [[ "$remote" == *"heretek/$repo_name"* ]]; then
      log_check "Git remote is correct: $remote"
    else
      log_warning "Git remote may be incorrect: $remote"
    fi
  fi
  
  return 0
}

# Print summary
print_summary() {
  echo ""
  echo "========================================"
  echo "Migration Validation Summary"
  echo "========================================"
  echo "Total checks: $TOTAL_CHECKS"
  echo "Errors: $TOTAL_ERRORS"
  echo "Warnings: $TOTAL_WARNINGS"
  echo ""
  
  if [ "$TOTAL_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    return 0
  else
    echo -e "${RED}❌ Found $TOTAL_ERRORS error(s)${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review errors above"
    echo "  2. Fix issues manually or run with --fix"
    echo "  3. Run update-imports.js to fix import paths"
    echo "  4. Re-run validation"
    return 1
  fi
}

# Main execution
main() {
  echo "🔍 Heretek OpenClaw Migration Validation"
  echo ""
  
  if [ "$VALIDATE_ALL" = true ]; then
    for repo_name in "${!REPO_FILES[@]}"; do
      validate_repository "$repo_name"
    done
  elif [ -n "$SPECIFIC_REPO" ]; then
    if [ -z "${REPO_FILES[$SPECIFIC_REPO]}" ]; then
      log_error "Unknown repository: $SPECIFIC_REPO"
      echo "Available: ${!REPO_FILES[*]}"
      exit 1
    fi
    validate_repository "$SPECIFIC_REPO"
  else
    # Auto-detect: validate repositories in current directory
    local found=false
    for repo_name in "${!REPO_FILES[@]}"; do
      if [ -d "./$repo_name" ]; then
        validate_repository "$repo_name"
        found=true
      fi
    done
    
    if [ "$found" = false ]; then
      log_error "No split repositories found in current directory"
      echo ""
      echo "Expected directories:"
      for repo_name in "${!REPO_FILES[@]}"; do
        echo "  - $repo_name"
      done
      echo ""
      echo "Run this script from the directory containing the split repositories."
      exit 1
    fi
  fi
  
  print_summary
  exit $TOTAL_ERRORS
}

main
