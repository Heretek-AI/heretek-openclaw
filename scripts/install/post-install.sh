#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - Post-Installation Configuration Script
# ==============================================================================
# This script performs post-installation configuration tasks for OpenClaw
# bare metal and VM deployments. It configures databases, services, and
# performs initial setup validation.
#
# Usage: sudo ./post-install.sh
#
# Version: 1.0.0
# Last Updated: 2026-03-31
# ==============================================================================

set -e  # Exit on error

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CONFIG_DIR="/etc/openclaw"
LOG_DIR="/var/log/openclaw"
BACKUP_DIR="/var/backups/openclaw"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Verify prerequisites
verify_prerequisites() {
    log_step "Verifying prerequisites..."
    
    local missing=()
    
    # Check required commands
    for cmd in psql redis-cli ollama openclaw; do
        if ! command -v $cmd &>/dev/null; then
            missing+=($cmd)
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_warning "Missing commands: ${missing[*]}"
        log_warning "Please run the dependencies script first."
        return 1
    fi
    
    log_success "Prerequisites verified"
    return 0
}

# Configure PostgreSQL database
configure_postgresql() {
    log_step "Configuring PostgreSQL database..."
    
    # Check if database already exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw openclaw; then
        log_info "Database 'openclaw' already exists"
    else
        # Generate secure password
        DB_PASSWORD=$(openssl rand -hex 16)
        
        # Create database and user
        sudo -u postgres psql -c "CREATE DATABASE openclaw;" 2>/dev/null || true
        sudo -u postgres psql -c "CREATE USER openclaw WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE openclaw TO openclaw;" 2>/dev/null || true
        sudo -u postgres psql -d openclaw -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
        
        log_info "Generated PostgreSQL password: $DB_PASSWORD"
        
        # Update environment file if it exists
        if [[ -f "$CONFIG_DIR/.env" ]]; then
            sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" "$CONFIG_DIR/.env"
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://openclaw:$DB_PASSWORD@localhost:5432/openclaw|" "$CONFIG_DIR/.env"
            log_success "Environment file updated with database credentials"
        fi
    fi
    
    # Verify pgvector extension
    if sudo -u postgres psql -d openclaw -c "SELECT * FROM pg_extension WHERE extname = 'vector';" | grep -q vector; then
        log_success "pgvector extension enabled"
    else
        log_warning "pgvector extension may not be installed"
    fi
    
    log_success "PostgreSQL configured"
}

# Configure Redis
configure_redis() {
    log_step "Configuring Redis..."
    
    # Generate secure password
    REDIS_PASSWORD=$(openssl rand -hex 16)
    
    # Update Redis configuration
    if [[ -f /etc/redis/redis.conf ]]; then
        # Check if requirepass already set
        if grep -q "^requirepass" /etc/redis/redis.conf; then
            log_info "Redis password already configured"
        else
            echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf
            systemctl restart redis
            log_info "Generated Redis password: $REDIS_PASSWORD"
        fi
        
        # Update environment file
        if [[ -f "$CONFIG_DIR/.env" ]]; then
            sed -i "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379/0|" "$CONFIG_DIR/.env"
            log_success "Environment file updated with Redis credentials"
        fi
    else
        log_warning "Redis configuration file not found"
    fi
    
    # Test Redis connection
    if redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
        log_success "Redis connection verified"
    else
        log_warning "Redis connection test failed"
    fi
    
    log_success "Redis configured"
}

# Configure Ollama
configure_ollama() {
    log_step "Configuring Ollama..."
    
    # Check if Ollama is running
    if systemctl is-active --quiet ollama; then
        log_success "Ollama service is running"
    else
        log_info "Starting Ollama service..."
        systemctl start ollama
        systemctl enable ollama
    fi
    
    # Pull required embedding model
    log_info "Pulling embedding model..."
    if ollama list | grep -q "nomic-embed-text"; then
        log_info "Embedding model already exists"
    else
        ollama pull nomic-embed-text-v2-moe
        log_success "Embedding model pulled"
    fi
    
    # Test Ollama connection
    if curl -s http://localhost:11434/api/tags | grep -q "models"; then
        log_success "Ollama connection verified"
    else
        log_warning "Ollama connection test failed"
    fi
    
    log_success "Ollama configured"
}

# Configure LiteLLM
configure_litellm() {
    log_step "Configuring LiteLLM..."
    
    # Create directories if needed
    mkdir -p /etc/litellm
    mkdir -p /var/log/litellm
    
    # Copy configuration if it exists in project
    if [[ -f "$PROJECT_DIR/litellm_config.yaml" ]]; then
        cp "$PROJECT_DIR/litellm_config.yaml" /etc/litellm/litellm_config.yaml
        
        # Set ownership
        if id -u litellm &>/dev/null; then
            chown litellm:litellm /etc/litellm/litellm_config.yaml
        fi
        
        log_success "LiteLLM configuration copied"
    else
        log_warning "litellm_config.yaml not found in project"
    fi
    
    # Create systemd service if not exists
    if [[ ! -f /etc/systemd/system/litellm.service ]]; then
        log_info "Creating LiteLLM systemd service..."
        create_litellm_service
    fi
    
    log_success "LiteLLM configured"
}

# Create LiteLLM systemd service
create_litellm_service() {
    cat > /etc/systemd/system/litellm.service << 'EOF'
[Unit]
Description=LiteLLM Proxy Service
Documentation=https://docs.litellm.ai
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=litellm
Group=litellm

# Environment configuration
Environment="LITELLM_CONFIG_PATH=/etc/litellm/litellm_config.yaml"
Environment="DATABASE_URL=postgresql://openclaw:password@localhost:5432/openclaw"
Environment="REDIS_URL=redis://localhost:6379/0"
EnvironmentFile=-/etc/openclaw/.env

# Working directory
WorkingDirectory=/opt/litellm

# Main execution
ExecStart=/opt/litellm/venv/bin/litellm --config /etc/litellm/litellm_config.yaml --port 4000 --num_workers 4

# Restart configuration
Restart=on-failure
RestartSec=5

# Resource limits
LimitNOFILE=65535

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=true

# Allow write access to log directory
ReadWritePaths=/var/log/litellm

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=litellm

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
}

# Configure OpenClaw Gateway
configure_openclaw() {
    log_step "Configuring OpenClaw Gateway..."
    
    # Check if OpenClaw is installed
    if ! command -v openclaw &>/dev/null; then
        log_error "OpenClaw Gateway not installed"
        return 1
    fi
    
    # Create workspace directory
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/agents
    mkdir -p ~/.openclaw/logs
    
    # Copy configuration if it exists in project
    if [[ -f "$PROJECT_DIR/openclaw.json" ]]; then
        cp "$PROJECT_DIR/openclaw.json" ~/.openclaw/openclaw.json
        log_success "OpenClaw configuration copied"
    fi
    
    # Validate configuration
    if openclaw gateway validate 2>/dev/null; then
        log_success "OpenClaw configuration validated"
    else
        log_warning "OpenClaw configuration validation failed"
    fi
    
    # Create systemd service if not exists
    if [[ ! -f /etc/systemd/system/openclaw-gateway.service ]]; then
        log_info "Creating OpenClaw Gateway systemd service..."
        create_openclaw_service
    fi
    
    log_success "OpenClaw Gateway configured"
}

# Create OpenClaw Gateway systemd service
create_openclaw_service() {
    cat > /etc/systemd/system/openclaw-gateway.service << 'EOF'
[Unit]
Description=OpenClaw Gateway Service
Documentation=https://github.com/Heretek-AI/heretek-openclaw
After=network.target litellm.service postgresql.service redis.service
Wants=litellm.service postgresql.service redis.service

[Service]
Type=simple
User=root
Group=root

# Environment configuration
Environment="OPENCLAW_DIR=/root/.openclaw"
Environment="OPENCLAW_WORKSPACE=/root/.openclaw/agents"
Environment="NODE_ENV=production"
EnvironmentFile=-/etc/openclaw/.env

# Working directory
WorkingDirectory=/root/heretek/heretek-openclaw

# Main execution
ExecStart=/usr/bin/node /root/heretek/heretek-openclaw/dist/gateway/index.js
Restart=on-failure
RestartSec=10

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=true

# Allow write access to OpenClaw directories
ReadWritePaths=/root/.openclaw
ReadWritePaths=/var/log/openclaw

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=openclaw-gateway

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
}

# Enable and start services
enable_services() {
    log_step "Enabling and starting services..."
    
    # List of services to enable
    local services=("postgresql" "redis" "ollama" "litellm" "openclaw-gateway")
    
    for service in "${services[@]}"; do
        # Check if service file exists
        if [[ -f /etc/systemd/system/${service}.service ]] || systemctl list-unit-files | grep -q "^${service}"; then
            log_info "Enabling $service..."
            systemctl enable "$service" 2>/dev/null || log_warning "Failed to enable $service"
            
            log_info "Starting $service..."
            systemctl start "$service" 2>/dev/null || log_warning "Failed to start $service"
            
            # Wait for service to be ready
            sleep 2
            
            if systemctl is-active --quiet "$service"; then
                log_success "$service is running"
            else
                log_warning "$service is not running"
            fi
        else
            log_warning "Service $service not found"
        fi
    done
    
    log_success "Services enabled and started"
}

# Run database migrations
run_migrations() {
    log_step "Running database migrations..."
    
    cd "$PROJECT_DIR"
    
    # Check if package.json exists
    if [[ -f "package.json" ]]; then
        # Check if npm is available
        if command -v npm &>/dev/null; then
            # Run migrations
            if npm run db:migrate 2>/dev/null; then
                log_success "Database migrations completed"
            else
                log_warning "Database migrations failed or not available"
            fi
        else
            log_warning "npm not found. Skipping migrations."
        fi
    else
        log_warning "package.json not found. Skipping migrations."
    fi
    
    log_success "Database migrations complete"
}

# Create agent workspaces
create_agent_workspaces() {
    log_step "Creating agent workspaces..."
    
    # List of agents to create
    local agents=(
        "steward:orchestrator"
        "alpha:triad"
        "beta:triad"
        "charlie:triad"
        "examiner:interrogator"
        "explorer:scout"
        "sentinel:guardian"
        "coder:artisan"
        "dreamer:visionary"
        "empath:diplomat"
        "historian:archivist"
    )
    
    # Check if deploy-agent.sh exists
    if [[ -f "$PROJECT_DIR/agents/deploy-agent.sh" ]]; then
        for agent_info in "${agents[@]}"; do
            agent=$(echo "$agent_info" | cut -d: -f1)
            role=$(echo "$agent_info" | cut -d: -f2)
            
            if [[ -d "~/.openclaw/agents/$agent" ]]; then
                log_info "Agent workspace already exists: $agent"
            else
                log_info "Creating agent workspace: $agent ($role)..."
                cd "$PROJECT_DIR"
                ./agents/deploy-agent.sh "$agent" "$role" 2>/dev/null || log_warning "Failed to create agent: $agent"
            fi
        done
        
        log_success "Agent workspaces created"
    else
        log_warning "deploy-agent.sh not found. Skipping agent workspace creation."
    fi
}

# Configure log rotation
configure_log_rotation() {
    log_step "Configuring log rotation..."
    
    cat > /etc/logrotate.d/openclaw << 'EOF'
/var/log/openclaw/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload openclaw-gateway 2>/dev/null || true
    endscript
}

/var/log/litellm/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 litellm litellm
    sharedscripts
    postrotate
        systemctl reload litellm 2>/dev/null || true
    endscript
}
EOF

    log_success "Log rotation configured"
}

# Configure backup
configure_backup() {
    log_step "Configuring automated backup..."
    
    # Create backup script
    cat > /usr/local/bin/openclaw-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/openclaw"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

# Backup OpenClaw configuration
tar -czf $BACKUP_DIR/openclaw-config-$DATE.tar.gz \
    ~/.openclaw/ \
    /etc/litellm/ \
    /etc/openclaw/ 2>/dev/null

# Backup PostgreSQL
pg_dump -U openclaw openclaw 2>/dev/null | gzip > $BACKUP_DIR/openclaw-db-$DATE.sql.gz

# Backup Redis
redis-cli BGSAVE 2>/dev/null
sleep 2
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis-dump-$DATE.rdb 2>/dev/null

# Remove old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete 2>/dev/null

echo "Backup completed: $DATE" >> /var/log/openclaw/backup.log
EOF

    chmod +x /usr/local/bin/openclaw-backup.sh
    
    # Create systemd timer
    if [[ ! -f /etc/systemd/system/openclaw-backup.timer ]]; then
        cat > /etc/systemd/system/openclaw-backup.timer << 'EOF'
[Unit]
Description=Daily OpenClaw Backup
Documentation=file:///root/heretek/heretek-openclaw/docs/operations/AUTOMATED_BACKUP.md

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

        cat > /etc/systemd/system/openclaw-backup.service << 'EOF'
[Unit]
Description=OpenClaw Backup Service
After=postgresql.service redis.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/openclaw-backup.sh
User=root
Group=root
EOF

        systemctl daemon-reload
        systemctl enable openclaw-backup.timer
        systemctl start openclaw-backup.timer
    fi
    
    log_success "Automated backup configured"
}

# Run health checks
run_health_checks() {
    log_step "Running health checks..."
    
    local checks_passed=0
    local checks_failed=0
    
    # Check PostgreSQL
    if psql -U openclaw -d openclaw -c "SELECT 1;" &>/dev/null; then
        log_success "PostgreSQL: OK"
        ((checks_passed++))
    else
        log_error "PostgreSQL: FAILED"
        ((checks_failed++))
    fi
    
    # Check Redis
    if redis-cli ping &>/dev/null; then
        log_success "Redis: OK"
        ((checks_passed++))
    else
        log_error "Redis: FAILED"
        ((checks_failed++))
    fi
    
    # Check Ollama
    if curl -s http://localhost:11434/api/tags &>/dev/null; then
        log_success "Ollama: OK"
        ((checks_passed++))
    else
        log_error "Ollama: FAILED"
        ((checks_failed++))
    fi
    
    # Check LiteLLM
    if curl -s http://localhost:4000/health &>/dev/null; then
        log_success "LiteLLM: OK"
        ((checks_passed++))
    else
        log_warning "LiteLLM: Not running (may need manual start)"
    fi
    
    # Check OpenClaw Gateway
    if openclaw gateway status &>/dev/null; then
        log_success "OpenClaw Gateway: OK"
        ((checks_passed++))
    else
        log_warning "OpenClaw Gateway: Not running (may need manual start)"
    fi
    
    echo ""
    log_info "Health Check Summary: $checks_passed passed, $checks_failed failed"
    
    if [[ $checks_failed -gt 0 ]]; then
        return 1
    fi
    
    return 0
}

# Print installation summary
print_summary() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - Post-Installation Complete"
    echo "=============================================="
    echo ""
    log_success "Post-installation configuration completed!"
    echo ""
    echo "Configuration Summary:"
    echo "  - PostgreSQL: Configured with pgvector"
    echo "  - Redis: Configured with password authentication"
    echo "  - Ollama: Running with embedding model"
    echo "  - LiteLLM: Configured"
    echo "  - OpenClaw Gateway: Configured"
    echo "  - Log Rotation: Configured"
    echo "  - Automated Backup: Configured"
    echo ""
    echo "Next Steps:"
    echo ""
    echo "  1. Edit environment file with your API keys:"
    echo "     nano $CONFIG_DIR/.env"
    echo ""
    echo "  2. Start all services:"
    echo "     sudo systemctl start postgresql redis ollama litellm openclaw-gateway"
    echo ""
    echo "  3. Verify installation:"
    echo "     cd $PROJECT_DIR"
    echo "     ./scripts/health-check.sh"
    echo ""
    echo "  4. Create agent workspaces (if not done):"
    echo "     ./agents/deploy-agent.sh steward orchestrator"
    echo "     (repeat for all agents)"
    echo ""
    echo "Documentation:"
    echo "  - BARE_METAL_DEPLOYMENT.md: $PROJECT_DIR/docs/deployment/BARE_METAL_DEPLOYMENT.md"
    echo "  - TROUBLESHOOTING: $PROJECT_DIR/docs/deployment/NON_DOCKER_TROUBLESHOOTING.md"
    echo ""
    echo "=============================================="
}

# Main function
main() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - Post-Installation"
    echo "=============================================="
    echo ""
    
    check_root
    
    if verify_prerequisites; then
        configure_postgresql
        configure_redis
        configure_ollama
        configure_litellm
        configure_openclaw
        enable_services
        run_migrations
        create_agent_workspaces
        configure_log_rotation
        configure_backup
        
        echo ""
        run_health_checks
        print_summary
    else
        log_error "Prerequisites not met. Please install dependencies first."
        exit 1
    fi
}

# Run main function
main "$@"
