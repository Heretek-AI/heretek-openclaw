#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - Ubuntu/Debian Dependencies Installer
# ==============================================================================
# This script installs all required dependencies for OpenClaw bare metal
# deployment on Ubuntu 20.04+ and Debian 11+ systems.
#
# Usage: sudo ./ubuntu-deps.sh
#
# Version: 1.0.0
# Last Updated: 2026-03-31
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check OS version
check_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
        
        log_info "Detected OS: $OS $VERSION"
        
        # Check for supported versions
        if [[ "$OS" == "ubuntu" ]]; then
            if (( $(echo "$VERSION < 20.04" | bc -l) )); then
                log_error "Ubuntu 20.04 or higher is required. Found: $VERSION"
                exit 1
            fi
        elif [[ "$OS" == "debian" ]]; then
            if (( $(echo "$VERSION < 11" | bc -l) )); then
                log_error "Debian 11 or higher is required. Found: $VERSION"
                exit 1
            fi
        else
            log_warning "Unsupported OS: $OS. Script may not work correctly."
        fi
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    log_success "System packages updated"
}

# Install core dependencies
install_core_deps() {
    log_info "Installing core dependencies..."
    
    apt-get install -y -qq \
        curl \
        git \
        wget \
        gnupg \
        ca-certificates \
        software-properties-common \
        build-essential \
        libssl-dev \
        libffi-dev \
        zlib1g-dev \
        libbz2-dev \
        libreadline-dev \
        libsqlite3-dev \
        libncursesw5-dev \
        xz-utils \
        tk-dev \
        libxml2-dev \
        libxmlsec1-dev \
        liblzma-dev \
        jq \
        net-tools \
        lsof \
        htop \
        vim \
        unzip \
        pkg-config
    
    log_success "Core dependencies installed"
}

# Install Python 3.10+
install_python() {
    log_info "Installing Python 3.10+..."
    
    # Check if Python 3.10+ is already installed
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | awk '{print $2}')
        log_info "Python $PYTHON_VERSION already installed"
        
        # Check if version is 3.10+
        if (( $(echo "$PYTHON_VERSION < 3.10" | bc -l) )); then
            log_warning "Python 3.10+ required. Installing..."
            apt-get install -y -qq python3 python3-pip python3-venv python3-dev
        fi
    else
        apt-get install -y -qq python3 python3-pip python3-venv python3-dev
    fi
    
    # Upgrade pip
    python3 -m pip install --upgrade pip --quiet
    
    log_success "Python installed: $(python3 --version)"
}

# Install Node.js 20 LTS
install_nodejs() {
    log_info "Installing Node.js 20 LTS..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        log_info "Node.js $(node --version) already installed"
        
        if [[ $NODE_VERSION -lt 20 ]]; then
            log_warning "Node.js 20+ required. Installing..."
        else
            log_success "Node.js version is adequate"
            return 0
        fi
    fi
    
    # Install Node.js 20 LTS
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    
    log_success "Node.js installed: $(node --version)"
    log_success "npm installed: $(npm --version)"
}

# Install PostgreSQL 15 with pgvector
install_postgresql() {
    log_info "Installing PostgreSQL 15 with pgvector..."
    
    # Check if PostgreSQL is already installed
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version | awk '{print $3}' | cut -d'.' -f1)
        log_info "PostgreSQL $PG_VERSION already installed"
        
        if [[ $PG_VERSION -ge 15 ]]; then
            log_success "PostgreSQL version is adequate"
            return 0
        fi
    fi
    
    # Add PostgreSQL repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt '$(lsb_release -cs)'-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    
    # Update and install
    apt-get update -qq
    apt-get install -y -qq postgresql-15 postgresql-contrib-15 postgresql-15-pgvector
    
    # Start PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    log_success "PostgreSQL 15 installed with pgvector"
}

# Install Redis 7
install_redis() {
    log_info "Installing Redis 7..."
    
    # Check if Redis is already installed
    if command -v redis-cli &> /dev/null; then
        REDIS_VERSION=$(redis-cli --version | awk '{print $2}')
        log_info "Redis $REDIS_VERSION already installed"
        
        if (( $(echo "$REDIS_VERSION >= 7" | bc -l) )); then
            log_success "Redis version is adequate"
            return 0
        fi
    fi
    
    # Add Redis repository
    curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/redis.list
    
    # Update and install
    apt-get update -qq
    apt-get install -y -qq redis
    
    # Start Redis
    systemctl start redis
    systemctl enable redis
    
    log_success "Redis 7 installed"
}

# Install Ollama
install_ollama() {
    log_info "Installing Ollama..."
    
    # Check if Ollama is already installed
    if command -v ollama &> /dev/null; then
        log_info "Ollama already installed: $(ollama --version 2>/dev/null || echo 'unknown')"
        log_success "Ollama installation verified"
        return 0
    fi
    
    # Install Ollama
    curl -fsSL https://ollama.ai/install.sh | sh
    
    # Start Ollama
    systemctl start ollama
    systemctl enable ollama
    
    log_success "Ollama installed"
}

# Install LiteLLM dependencies
install_litellm_deps() {
    log_info "Installing LiteLLM dependencies..."
    
    # Create litellm user if not exists
    if ! id -u litellm &>/dev/null; then
        useradd -r -s /bin/false litellm
        log_info "Created litellm user"
    fi
    
    # Create directories
    mkdir -p /opt/litellm
    mkdir -p /etc/litellm
    mkdir -p /var/log/litellm
    chown litellm:litellm /opt/litellm
    chown litellm:litellm /var/log/litellm
    
    # Create virtual environment
    if [[ ! -f /opt/litellm/venv/bin/python ]]; then
        python3 -m venv /opt/litellm/venv
        log_info "Created LiteLLM virtual environment"
    fi
    
    # Install LiteLLM
    /opt/litellm/venv/bin/pip install --upgrade pip --quiet
    /opt/litellm/venv/bin/pip install \
        'litellm[proxy]' \
        'litellm[langfuse]' \
        'litellm[postgres]' \
        'litellm[redis]' \
        psycopg2-binary \
        redis \
        langfuse --quiet
    
    log_success "LiteLLM installed"
}

# Install OpenClaw Gateway
install_openclaw() {
    log_info "Installing OpenClaw Gateway..."
    
    # Check if OpenClaw is already installed
    if command -v openclaw &> /dev/null; then
        log_info "OpenClaw already installed: $(openclaw --version)"
        log_success "OpenClaw installation verified"
        return 0
    fi
    
    # Install OpenClaw
    curl -fsSL https://openclaw.ai/install.sh | sh
    
    log_success "OpenClaw Gateway installed"
}

# Configure firewall (UFW)
configure_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Check if UFW is active
        if ! ufw status | grep -q "Status: active"; then
            log_warning "UFW is not active. Skipping firewall configuration."
            return 0
        fi
        
        # Allow required ports
        ufw allow ssh
        ufw allow 4000/tcp    # LiteLLM
        ufw allow 18789/tcp   # OpenClaw Gateway
        ufw allow 3000/tcp    # Dashboard (optional)
        
        # Allow localhost for internal services
        ufw allow from 127.0.0.1 to any port 5432   # PostgreSQL
        ufw allow from 127.0.0.1 to any port 6379   # Redis
        ufw allow from 127.0.0.1 to any port 11434  # Ollama
        
        log_success "Firewall configured"
    else
        log_warning "UFW not installed. Skipping firewall configuration."
    fi
}

# Print installation summary
print_summary() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - Installation Summary"
    echo "=============================================="
    echo ""
    log_success "All dependencies installed successfully!"
    echo ""
    echo "Installed components:"
    echo "  - Python: $(python3 --version)"
    echo "  - Node.js: $(node --version)"
    echo "  - npm: $(npm --version)"
    echo "  - PostgreSQL: $(psql --version)"
    echo "  - Redis: $(redis-cli --version)"
    echo "  - Ollama: $(ollama --version 2>/dev/null || echo 'installed')"
    echo "  - OpenClaw: $(openclaw --version 2>/dev/null || echo 'installed')"
    echo ""
    echo "Next steps:"
    echo "  1. Clone the OpenClaw repository:"
    echo "     git clone https://github.com/Heretek-AI/heretek-openclaw.git"
    echo "     cd heretek-openclaw"
    echo ""
    echo "  2. Copy environment template:"
    echo "     cp .env.bare-metal.example .env"
    echo "     nano .env  # Edit with your values"
    echo ""
    echo "  3. Run post-installation script:"
    echo "     sudo ./scripts/install/post-install.sh"
    echo ""
    echo "  4. Verify installation:"
    echo "     ./scripts/health-check.sh"
    echo ""
    echo "=============================================="
}

# Main installation function
main() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - Ubuntu Dependencies"
    echo "=============================================="
    echo ""
    
    check_root
    check_os
    update_system
    install_core_deps
    install_python
    install_nodejs
    install_postgresql
    install_redis
    install_ollama
    install_litellm_deps
    install_openclaw
    configure_firewall
    print_summary
}

# Run main function
main "$@"
