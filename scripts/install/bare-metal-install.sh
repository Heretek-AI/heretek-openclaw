#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - Bare Metal Installation Script
# ==============================================================================
# This script performs a complete automated installation of OpenClaw on
# bare metal Linux servers. It detects the OS and installs appropriate
# dependencies, then configures all services.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/scripts/install/bare-metal-install.sh | sudo bash
#
# Or download and run:
#   curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/scripts/install/bare-metal-install.sh -o bare-metal-install.sh
#   chmod +x bare-metal-install.sh
#   sudo ./bare-metal-install.sh
#
# Version: 1.0.0
# Last Updated: 2026-03-31
# ==============================================================================

set -e  # Exit on error

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
OPENCLAW_DIR="/root/heretek/heretek-openclaw"
LITELLM_DIR="/opt/litellm"
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

# Detect OS and architecture
detect_os() {
    log_step "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
        OS_FAMILY=$ID_LIKE
        
        log_info "Detected: $OS $VERSION"
        
        # Determine installer script
        if [[ "$OS" == "ubuntu" || "$OS" == "debian" || "$OS_FAMILY" == *"debian"* ]]; then
            INSTALLER_SCRIPT="ubuntu-deps.sh"
            log_info "Using Ubuntu/Debian installer"
        elif [[ "$OS" == "rhel" || "$OS" == "centos" || "$OS" == "rocky" || "$OS" == "almalinux" || "$OS_FAMILY" == *"rhel"* ]]; then
            INSTALLER_SCRIPT="rhel-deps.sh"
            log_info "Using RHEL installer"
        else
            log_error "Unsupported OS: $OS"
            exit 1
        fi
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
    
    # Detect architecture
    ARCH=$(uname -m)
    log_info "Architecture: $ARCH"
    
    # Detect GPU
    detect_gpu
}

# Detect GPU
detect_gpu() {
    log_step "Detecting GPU..."
    
    GPU_TYPE="none"
    
    # Check for AMD GPU
    if lspci | grep -i "vga.*amd\|vga.*advanced micro devices" &>/dev/null; then
        GPU_TYPE="amd"
        log_info "Detected AMD GPU"
    fi
    
    # Check for NVIDIA GPU
    if lspci | grep -i "vga.*nvidia\|3d.*nvidia" &>/dev/null; then
        GPU_TYPE="nvidia"
        log_info "Detected NVIDIA GPU"
    fi
    
    # Check for ROCm devices
    if [[ -e /dev/kfd && -e /dev/dri ]]; then
        GPU_TYPE="amd"
        log_info "Detected AMD ROCm devices"
    fi
    
    # Check for NVIDIA devices
    if [[ -e /dev/nvidia0 ]]; then
        GPU_TYPE="nvidia"
        log_info "Detected NVIDIA CUDA devices"
    fi
    
    log_info "GPU Type: $GPU_TYPE"
}

# Check system requirements
check_requirements() {
    log_step "Checking system requirements..."
    
    # Check CPU cores
    CPU_CORES=$(nproc)
    if [[ $CPU_CORES -lt 2 ]]; then
        log_warning "Minimum 2 CPU cores recommended. Found: $CPU_CORES"
    fi
    log_info "CPU Cores: $CPU_CORES"
    
    # Check RAM
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $RAM_GB -lt 4 ]]; then
        log_warning "Minimum 4GB RAM recommended. Found: ${RAM_GB}GB"
    fi
    log_info "RAM: ${RAM_GB}GB"
    
    # Check disk space
    DISK_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ $DISK_GB -lt 10 ]]; then
        log_warning "Minimum 10GB free disk space recommended. Found: ${DISK_GB}GB"
    fi
    log_info "Free Disk Space: ${DISK_GB}GB"
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies..."
    
    # Download and run the appropriate dependencies script
    DEPS_URL="https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/scripts/install/$INSTALLER_SCRIPT"
    
    log_info "Downloading $INSTALLER_SCRIPT..."
    curl -fsSL "$DEPS_URL" -o "/tmp/$INSTALLER_SCRIPT"
    chmod +x "/tmp/$INSTALLER_SCRIPT"
    
    log_info "Running $INSTALLER_SCRIPT..."
    "/tmp/$INSTALLER_SCRIPT"
    
    log_success "Dependencies installed"
}

# Clone repository
clone_repository() {
    log_step "Cloning OpenClaw repository..."
    
    if [[ -d "$OPENCLAW_DIR" ]]; then
        log_warning "Directory $OPENCLAW_DIR already exists"
        log_info "Pulling latest changes..."
        cd "$OPENCLAW_DIR"
        git pull
    else
        log_info "Cloning repository to $OPENCLAW_DIR..."
        git clone https://github.com/Heretek-AI/heretek-openclaw.git "$OPENCLAW_DIR"
    fi
    
    log_success "Repository cloned"
}

# Create directories
create_directories() {
    log_step "Creating directories..."
    
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p /etc/litellm
    mkdir -p /var/log/litellm
    
    # Set permissions
    chmod 755 "$CONFIG_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "$BACKUP_DIR"
    chmod 755 /etc/litellm
    chmod 755 /var/log/litellm
    
    log_success "Directories created"
}

# Configure environment
configure_environment() {
    log_step "Configuring environment..."
    
    cd "$OPENCLAW_DIR"
    
    # Copy environment template
    if [[ -f ".env.bare-metal.example" ]]; then
        cp ".env.bare-metal.example" "$CONFIG_DIR/.env"
        log_info "Environment file created: $CONFIG_DIR/.env"
    elif [[ -f ".env.example" ]]; then
        cp ".env.example" "$CONFIG_DIR/.env"
        log_info "Environment file created: $CONFIG_DIR/.env"
    else
        log_warning "No environment template found. Creating basic template..."
        create_basic_env
    fi
    
    # Set permissions
    chmod 600 "$CONFIG_DIR/.env"
    
    log_success "Environment configured"
}

# Create basic environment file
create_basic_env() {
    cat > "$CONFIG_DIR/.env" << 'EOF'
# Heretek OpenClaw - Environment Configuration
# Generated by bare-metal-install.sh

# LiteLLM Gateway
LITELLM_MASTER_KEY=change-me-openssl-rand-hex-32
LITELLM_SALT_KEY=change-me-openssl-rand-hex-32
LITELLM_PORT=4000

# Model Providers
MINIMAX_API_KEY=your-minimax-key-here
ZAI_API_KEY=your-zai-key-here

# Database
POSTGRES_USER=openclaw
POSTGRES_PASSWORD=change-me-secure-password
POSTGRES_DB=openclaw
DATABASE_URL=postgresql://openclaw:change-me-secure-password@localhost:5432/openclaw

# Redis
REDIS_URL=redis://localhost:6379/0

# Ollama
OLLAMA_HOST=http://localhost:11434

# OpenClaw
OPENCLAW_DIR=/root/.openclaw
OPENCLAW_WORKSPACE=/root/.openclaw/agents
EOF
}

# Configure PostgreSQL
configure_postgresql() {
    log_step "Configuring PostgreSQL..."
    
    # Generate secure password
    DB_PASSWORD=$(openssl rand -hex 16)
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE openclaw;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER openclaw WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE openclaw TO openclaw;" 2>/dev/null || true
    sudo -u postgres psql -d openclaw -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
    
    # Update environment file with password
    sed -i "s/change-me-secure-password/$DB_PASSWORD/g" "$CONFIG_DIR/.env"
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" "$CONFIG_DIR/.env"
    sed -i "s/DATABASE_URL=.*/DATABASE_URL=postgresql:\/\/openclaw:$DB_PASSWORD@localhost:5432\/openclaw/" "$CONFIG_DIR/.env"
    
    log_success "PostgreSQL configured"
}

# Configure Redis
configure_redis() {
    log_step "Configuring Redis..."
    
    # Generate secure password
    REDIS_PASSWORD=$(openssl rand -hex 16)
    
    # Update Redis configuration
    if [[ -f /etc/redis/redis.conf ]]; then
        sed -i "s/# requirepass/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf 2>/dev/null || \
        echo "requirepass $REDIS_PASSWORD" >> /etc/redis/redis.conf
        
        # Restart Redis
        systemctl restart redis
    fi
    
    # Update environment file
    sed -i "s|REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379/0|" "$CONFIG_DIR/.env"
    
    log_success "Redis configured"
}

# Configure Ollama for GPU
configure_ollama() {
    if [[ "$GPU_TYPE" == "amd" ]]; then
        log_step "Configuring Ollama for AMD ROCm..."
        
        # Create systemd override
        mkdir -p /etc/systemd/system/ollama.service.d
        cat > /etc/systemd/system/ollama.service.d/rocm.conf << EOF
[Service]
Environment="HSA_OVERRIDE_GFX_VERSION=10.3.0"
Environment="OLLAMA_HOST=0.0.0.0:11434"
DevicePolicy=closed
DeviceAllow=/dev/kfd rw
DeviceAllow=/dev/dri rw
EOF
        
        systemctl daemon-reload
        systemctl restart ollama
        
        log_success "Ollama configured for AMD ROCm"
        
    elif [[ "$GPU_TYPE" == "nvidia" ]]; then
        log_step "Configuring Ollama for NVIDIA CUDA..."
        
        # Create systemd override
        mkdir -p /etc/systemd/system/ollama.service.d
        cat > /etc/systemd/system/ollama.service.d/cuda.conf << EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="PATH=/usr/bin:/usr/local/cuda/bin"
Environment="LD_LIBRARY_PATH=/usr/local/cuda/lib64"
DevicePolicy=closed
DeviceAllow=/dev/nvidia0 rw
DeviceAllow=/dev/nvidiactl rw
DeviceAllow=/dev/nvidia-uvm rw
EOF
        
        systemctl daemon-reload
        systemctl restart ollama
        
        log_success "Ollama configured for NVIDIA CUDA"
    else
        log_info "No GPU detected. Ollama will run on CPU."
    fi
    
    # Pull embedding model
    log_info "Pulling embedding model..."
    ollama pull nomic-embed-text-v2-moe 2>/dev/null || log_warning "Failed to pull embedding model"
}

# Install systemd services
install_systemd_services() {
    log_step "Installing systemd services..."
    
    cd "$OPENCLAW_DIR"
    
    # Copy service files
    if [[ -d "systemd" ]]; then
        cp systemd/openclaw-gateway.service /etc/systemd/system/ 2>/dev/null || true
        cp systemd/litellm.service /etc/systemd/system/ 2>/dev/null || true
        
        # Update service files with correct paths
        sed -i "s|WorkingDirectory=.*|WorkingDirectory=$OPENCLAW_DIR|" /etc/systemd/system/openclaw-gateway.service 2>/dev/null || true
        sed -i "s|EnvironmentFile=.*|EnvironmentFile=$CONFIG_DIR/.env|" /etc/systemd/system/openclaw-gateway.service 2>/dev/null || true
        
        # Reload systemd
        systemctl daemon-reload
        
        # Enable services
        systemctl enable openclaw-gateway 2>/dev/null || true
        systemctl enable litellm 2>/dev/null || true
        
        log_success "Systemd services installed"
    else
        log_warning "systemd directory not found. Skipping service installation."
    fi
}

# Initialize database
initialize_database() {
    log_step "Initializing database..."
    
    cd "$OPENCLAW_DIR"
    
    # Run migrations if available
    if [[ -f "package.json" ]] && command -v npm &>/dev/null; then
        npm run db:migrate 2>/dev/null || log_warning "Database migration failed"
    fi
    
    log_success "Database initialized"
}

# Configure LiteLLM
configure_litellm() {
    log_step "Configuring LiteLLM..."
    
    cd "$OPENCLAW_DIR"
    
    # Copy LiteLLM configuration
    if [[ -f "litellm_config.yaml" ]]; then
        cp "litellm_config.yaml" /etc/litellm/litellm_config.yaml
        chown litellm:litellm /etc/litellm/litellm_config.yaml 2>/dev/null || true
        log_success "LiteLLM configured"
    else
        log_warning "litellm_config.yaml not found"
    fi
}

# Print installation summary
print_summary() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - Installation Complete!"
    echo "=============================================="
    echo ""
    log_success "OpenClaw has been installed successfully!"
    echo ""
    echo "Installation Details:"
    echo "  - OpenClaw Directory: $OPENCLAW_DIR"
    echo "  - Configuration Directory: $CONFIG_DIR"
    echo "  - Log Directory: $LOG_DIR"
    echo "  - Backup Directory: $BACKUP_DIR"
    echo ""
    echo "Next Steps:"
    echo ""
    echo "  1. Edit environment file with your API keys:"
    echo "     nano $CONFIG_DIR/.env"
    echo ""
    echo "  2. Start services:"
    echo "     sudo systemctl start postgresql"
    echo "     sudo systemctl start redis"
    echo "     sudo systemctl start ollama"
    echo "     sudo systemctl start litellm"
    echo "     sudo systemctl start openclaw-gateway"
    echo ""
    echo "  3. Verify installation:"
    echo "     cd $OPENCLAW_DIR"
    echo "     ./scripts/health-check.sh"
    echo ""
    echo "  4. Access LiteLLM Dashboard:"
    echo "     http://localhost:4000/ui"
    echo ""
    echo "  5. Check OpenClaw status:"
    echo "     openclaw gateway status"
    echo ""
    echo "Documentation:"
    echo "  - Bare Metal Deployment: $OPENCLAW_DIR/docs/deployment/BARE_METAL_DEPLOYMENT.md"
    echo "  - Troubleshooting: $OPENCLAW_DIR/docs/deployment/NON_DOCKER_TROUBLESHOOTING.md"
    echo ""
    echo "=============================================="
}

# Main installation function
main() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - Bare Metal Installer"
    echo "=============================================="
    echo ""
    
    check_root
    detect_os
    check_requirements
    install_dependencies
    clone_repository
    create_directories
    configure_environment
    configure_postgresql
    configure_redis
    configure_ollama
    install_systemd_services
    initialize_database
    configure_litellm
    print_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --gpu)
            GPU_TYPE="$2"
            shift 2
            ;;
        --no-gpu)
            GPU_TYPE="none"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --gpu TYPE     Specify GPU type (amd, nvidia, none)"
            echo "  --no-gpu       Skip GPU configuration"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
