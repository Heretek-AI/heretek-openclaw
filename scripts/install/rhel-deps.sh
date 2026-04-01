#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - RHEL/CentOS Dependencies Installer
# ==============================================================================
# This script installs all required dependencies for OpenClaw bare metal
# deployment on RHEL 9+, CentOS Stream 9, Rocky Linux 9, and AlmaLinux 9.
#
# Usage: sudo ./rhel-deps.sh
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
        if [[ "$OS" == "rhel" ]]; then
            if (( $(echo "$VERSION < 9" | bc -l) )); then
                log_error "RHEL 9 or higher is required. Found: $VERSION"
                exit 1
            fi
        elif [[ "$OS" == "centos" ]]; then
            if [[ "$VERSION_ID" != "9"* ]]; then
                log_error "CentOS Stream 9 or higher is required. Found: $VERSION"
                exit 1
            fi
        elif [[ "$OS" == "rocky" ]]; then
            if (( $(echo "$VERSION < 9" | bc -l) )); then
                log_error "Rocky Linux 9 or higher is required. Found: $VERSION"
                exit 1
            fi
        elif [[ "$OS" == "almalinux" ]]; then
            if (( $(echo "$VERSION < 9" | bc -l) )); then
                log_error "AlmaLinux 9 or higher is required. Found: $VERSION"
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
    dnf update -y -q
    log_success "System packages updated"
}

# Install EPEL repository
install_epel() {
    log_info "Installing EPEL repository..."
    
    if ! rpm -q epel-release &>/dev/null; then
        dnf install -y -q epel-release
        log_success "EPEL repository installed"
    else
        log_info "EPEL repository already installed"
    fi
}

# Install core dependencies
install_core_deps() {
    log_info "Installing core dependencies..."
    
    dnf install -y -q \
        curl \
        git \
        wget \
        gnupg2 \
        ca-certificates \
        gcc \
        gcc-c++ \
        make \
        openssl-devel \
        libffi-devel \
        bzip2-devel \
        readline-devel \
        sqlite-devel \
        ncurses-devel \
        xz-devel \
        tk-devel \
        libxml2-devel \
        libxmlsec1-devel \
        zlib-devel \
        jq \
        net-tools \
        lsof \
        htop \
        vim \
        unzip \
        pkg-config \
        policycoreutils-python-utils
    
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
            dnf install -y -q python3 python3-pip python3-devel
        fi
    else
        dnf install -y -q python3 python3-pip python3-devel
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
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y -q nodejs
    
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
    dnf install -y -q https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    
    # Disable default PostgreSQL module
    dnf -qy module disable postgresql
    
    # Install PostgreSQL 15
    dnf install -y -q postgresql15 postgresql15-contrib postgresql15-pgvector
    
    # Start PostgreSQL
    systemctl start postgresql-15
    systemctl enable postgresql-15
    
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
    
    # Install Redis from Remi repository
    dnf install -y -q dnf-utils
    dnf config-manager --set-enabled crb  # CodeReady Builder
    dnf install -y -q https://rpms.remirepo.net/enterprise/remi-release-9.rpm
    dnf module reset redis -y -q
    dnf module enable redis:7 -y -q
    dnf install -y -q redis
    
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

# Configure firewall (firewalld)
configure_firewall() {
    log_info "Configuring firewall..."
    
    if command -v firewall-cmd &> /dev/null; then
        # Check if firewalld is active
        if ! systemctl is-active --quiet firewalld; then
            log_warning "firewalld is not active. Skipping firewall configuration."
            return 0
        fi
        
        # Allow required ports
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-port=4000/tcp    # LiteLLM
        firewall-cmd --permanent --add-port=18789/tcp   # OpenClaw Gateway
        firewall-cmd --permanent --add-port=3000/tcp    # Dashboard (optional)
        
        # Allow localhost for internal services
        firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" port port="5432" protocol="tcp" accept'
        firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" port port="6379" protocol="tcp" accept'
        firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" port port="11434" protocol="tcp" accept'
        
        # Reload firewall
        firewall-cmd --reload
        
        log_success "Firewall configured"
    else
        log_warning "firewalld not installed. Skipping firewall configuration."
    fi
}

# Configure SELinux (optional)
configure_selinux() {
    log_info "Checking SELinux configuration..."
    
    if command -v getenforce &> /dev/null; then
        SELINUX_STATUS=$(getenforce)
        log_info "SELinux status: $SELINUX_STATUS"
        
        if [[ "$SELINUX_STATUS" == "Enforcing" ]]; then
            log_warning "SELinux is in Enforcing mode. You may need to create custom policies for OpenClaw."
            log_info "See docs/deployment/VM_DEPLOYMENT.md for SELinux configuration."
        fi
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
    echo "     cp .env.vm.example .env"
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
    echo "  Heretek OpenClaw - RHEL Dependencies"
    echo "=============================================="
    echo ""
    
    check_root
    check_os
    update_system
    install_epel
    install_core_deps
    install_python
    install_nodejs
    install_postgresql
    install_redis
    install_ollama
    install_litellm_deps
    install_openclaw
    configure_firewall
    configure_selinux
    print_summary
}

# Run main function
main "$@"
