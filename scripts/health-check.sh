#!/bin/bash
# ==============================================================================
# Heretek OpenClaw — Health Check Script
# ==============================================================================
# Verifies all infrastructure services are running and responding
#
# Usage:
#   ./health-check.sh          # Check all services
#   ./health-check.sh litellm  # Check specific service
#   ./health-check.sh --watch  # Continuous monitoring
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service endpoints
LITELLM_HOST="${LITELLM_HOST:-http://localhost:4000}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# ==============================================================================
# Functions
# ==============================================================================

print_header() {
    echo "=============================================="
    echo "  Heretek OpenClaw — Health Check"
    echo "=============================================="
    echo ""
}

check_litellm() {
    echo -n "Checking LiteLLM Gateway... "
    
    if curl -sf --connect-timeout 5 -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-heretek-master-key-change-me}" \
        "$LITELLM_HOST/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        
        # Get LiteLLM version
        version=$(curl -s -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-heretek-master-key-change-me}" \
            "$LITELLM_HOST/health" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        echo "  Version: $version"
        
        # Check models endpoint
        models=$(curl -s -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-heretek-master-key-change-me}" \
            "$LITELLM_HOST/v1/models" 2>/dev/null | grep -o '"id":"[^"]*"' | wc -l || echo "0")
        echo "  Available models: $models"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

check_postgres() {
    echo -n "Checking PostgreSQL... "
    
    # Try pg_isready first, fall back to docker check
    if command -v pg_isready > /dev/null 2>&1; then
        if pg_isready -h "$POSTGRES_HOST" -p 5432 -U heretek > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OK${NC}"
            
            # Check pgvector extension
            vector_ext=$(psql -h "$POSTGRES_HOST" -p 5432 -U heretek -d heretek -t -c "SELECT 1 FROM pg_extension WHERE extname='vector';" 2>/dev/null || echo "")
            if [ "$vector_ext" = "1" ]; then
                echo "  pgvector: ${GREEN}enabled${NC}"
            else
                echo "  pgvector: ${YELLOW}not installed${NC}"
            fi
            return 0
        fi
    fi
    
    # Fall back to docker container check
    if docker ps --filter "name=heretek-postgres" --format "{{.Names}}" 2>/dev/null | grep -q "heretek-postgres"; then
        echo -e "${GREEN}✓ OK${NC} (via Docker)"
        echo "  Container: heretek-postgres"
        return 0
    fi
    
    echo -e "${RED}✗ FAILED${NC}"
    return 1
}

check_redis() {
    echo -n "Checking Redis... "
    
    # Try redis-cli first, fall back to docker check
    if command -v redis-cli > /dev/null 2>&1; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OK${NC}"
            
            # Get Redis info
            info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info server 2>/dev/null | grep "redis_version" | cut -d: -f2 | tr -d '\r' || echo "unknown")
            echo "  Version: $info"
            
            # Check memory usage
            mem=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "unknown")
            echo "  Memory: $mem"
            return 0
        fi
    fi
    
    # Fall back to docker container check
    if docker ps --filter "name=heretek-redis" --format "{{.Names}}" 2>/dev/null | grep -q "heretek-redis"; then
        echo -e "${GREEN}✓ OK${NC} (via Docker)"
        echo "  Container: heretek-redis"
        return 0
    fi
    
    echo -e "${RED}✗ FAILED${NC}"
    return 1
}

check_docker() {
    echo -n "Checking Docker containers... "
    
    containers=$(docker ps --filter "name=heretek-" --format "{{.Names}}" 2>/dev/null | wc -l || echo "0")
    
    if [ "$containers" -gt 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        echo "  Running containers: $containers"
        docker ps --filter "name=heretek-" --format "  • {{.Names}} ({{.Status}})" 2>/dev/null
        return 0
    else
        echo -e "${YELLOW}⚠ No containers running${NC}"
        return 1
    fi
}

check_a2a_agents() {
    echo -n "Checking A2A Agents... "
    
    if curl -sf --connect-timeout 5 -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-heretek-master-key-change-me}" \
        "$LITELLM_HOST/v1/agents" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        
        # Get agent list
        agents=$(curl -s -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-heretek-master-key-change-me}" \
            "$LITELLM_HOST/v1/agents" 2>/dev/null | grep -o '"agent_name":"[^"]*"' | cut -d'"' -f4 | tr '\n' ' ' || echo "")
        
        if [ -n "$agents" ]; then
            echo "  Registered agents: $agents"
        else
            echo "  No agents registered yet"
        fi
        return 0
    else
        echo -e "${YELLOW}⚠ A2A endpoint not available${NC}"
        return 1
    fi
}

print_summary() {
    local status=$1
    echo ""
    echo "=============================================="
    if [ $status -eq 0 ]; then
        echo -e "  ${GREEN}All services healthy!${NC}"
    else
        echo -e "  ${RED}Some services failed${NC}"
    fi
    echo "=============================================="
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    local service="$1"
    local watch=false
    local failed=0
    
    # Parse arguments
    if [ "$1" = "--watch" ]; then
        watch=true
        shift
    fi
    
    if [ -n "$1" ]; then
        service="$1"
    fi
    
    if [ "$watch" = true ]; then
        echo "Watching services (Ctrl+C to exit)... "
        echo ""
        while true; do
            print_header
            failed=0
            
            check_litellm || failed=1
            check_postgres || failed=1
            check_redis || failed=1
            check_docker || failed=1
            check_a2a_agents || failed=1
            
            print_summary $failed
            sleep 30
        done
        return
    fi
    
    print_header
    
    # Run selected checks
    case "$service" in
        litellm)
            check_litellm
            failed=$?
            ;;
        postgres)
            check_postgres
            failed=$?
            ;;
        redis)
            check_redis
            failed=$?
            ;;
        docker)
            check_docker
            failed=$?
            ;;
        a2a|agents)
            check_a2a_agents
            failed=$?
            ;;
        all|"")
            check_litellm || failed=1
            check_postgres || failed=1
            check_redis || failed=1
            check_docker || failed=1
            check_a2a_agents || failed=1
            ;;
        *)
            echo "Unknown service: $service"
            echo "Available: litellm, postgres, redis, docker, a2a, all"
            exit 1
            ;;
    esac
    
    print_summary $failed
    exit $failed
}

main "$@"
