#!/bin/bash
# ==============================================================================
# Heretek OpenClaw - VM Installation Script
# ==============================================================================
# This script performs a complete automated installation of OpenClaw on
# virtual machines (VMs) across different cloud platforms. It detects
# the OS and cloud platform, then installs appropriate dependencies.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/scripts/install/vm-install.sh | sudo bash
#
# Or download and run:
#   curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/scripts/install/vm-install.sh -o vm-install.sh
#   chmod +x vm-install.sh
#   sudo ./vm-install.sh [--os OS_TYPE] [--gpu GPU_TYPE] [--cloud CLOUD_PROVIDER]
#
# Options:
#   --os OS_TYPE       Specify OS type (ubuntu, rhel, auto)
#   --gpu GPU_TYPE     Specify GPU type (amd, nvidia, none, auto)
#   --cloud PROVIDER   Specify cloud provider (aws, gcp, azure, auto)
#   --help             Show this help message
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
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
OPENCLAW_DIR="/root/heretek/heretek-openclaw"
LITELLM_DIR="/opt/litellm"
CONFIG_DIR="/etc/openclaw"
LOG_DIR="/var/log/openclaw"
BACKUP_DIR="/var/backups/openclaw"

# Default options
OS_TYPE="auto"
GPU_TYPE="auto"
CLOUD_PROVIDER="auto"

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

log_cloud() {
    echo -e "${MAGENTA}[CLOUD]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect cloud provider
detect_cloud() {
    if [[ "$CLOUD_PROVIDER" != "auto" ]]; then
        log_info "Using specified cloud provider: $CLOUD_PROVIDER"
        return
    fi
    
    log_step "Detecting cloud provider..."
    
    # AWS EC2
    if [[ -f /sys/hypervisor/uuid ]] && grep -qi "ec2" /sys/hypervisor/uuid 2>/dev/null; then
        CLOUD_PROVIDER="aws"
    elif dmidecode -s system-product-name 2>/dev/null | grep -qi "amazon ec2"; then
        CLOUD_PROVIDER="aws"
    fi
    
    # GCP Compute
    if dmidecode -s system-product-name 2>/dev/null | grep -qi "google compute"; then
        CLOUD_PROVIDER="gcp"
    fi
    
    # Azure VM
    if dmidecode -s system-manufacturer 2>/dev/null | grep -qi "microsoft corporation"; then
        CLOUD_PROVIDER="azure"
    fi
    
    # DigitalOcean
    if dmidecode -s system-product-name 2>/dev/null | grep -qi "digitalocean"; then
        CLOUD_PROVIDER="digitalocean"
    fi
    
    # Linode
    if dmidecode -s system-product-name 2>/dev/null | grep -qi "linode"; then
        CLOUD_PROVIDER="linode"
    fi
    
    if [[ "$CLOUD_PROVIDER" == "auto" ]]; then
        CLOUD_PROVIDER="bare-metal"
        log_info "No cloud provider detected. Assuming bare metal."
    else
        log_cloud "Detected cloud provider: $CLOUD_PROVIDER"
    fi
}

# Detect OS
detect_os() {
    if [[ "$OS_TYPE" != "auto" ]]; then
        log_info "Using specified OS type: $OS_TYPE"
        return
    fi
    
    log_step "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
        OS_FAMILY=$ID_LIKE
        
        log_info "Detected: $OS $VERSION"
        
        if [[ "$OS" == "ubuntu" || "$OS" == "debian" || "$OS_FAMILY" == *"debian"* ]]; then
            OS_TYPE="ubuntu"
            INSTALLER_SCRIPT="ubuntu-deps.sh"
        elif [[ "$OS" == "rhel" || "$OS" == "centos" || "$OS" == "rocky" || "$OS" == "almalinux" || "$OS_FAMILY" == *"rhel"* ]]; then
            OS_TYPE="rhel"
            INSTALLER_SCRIPT="rhel-deps.sh"
        else
            log_error "Unsupported OS: $OS"
            exit 1
        fi
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

# Detect GPU
detect_gpu() {
    if [[ "$GPU_TYPE" != "auto" ]]; then
        log_info "Using specified GPU type: $GPU_TYPE"
        return
    fi
    
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
    log_info "CPU Cores: $CPU_CORES"
    
    # Check RAM
    RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    log_info "RAM: ${RAM_GB}GB"
    
    # Check disk space
    DISK_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    log_info "Free Disk Space: ${DISK_GB}GB"
    
    # Cloud-specific checks
    case $CLOUD_PROVIDER in
        aws)
            log_cloud "AWS EC2 detected. Verifying instance type..."
            ;;
        gcp)
            log_cloud "GCP Compute detected. Verifying machine type..."
            ;;
        azure)
            log_cloud "Azure VM detected. Verifying VM size..."
            ;;
    esac
    
    # Warnings
    if [[ $CPU_CORES -lt 2 ]]; then
        log_warning "Minimum 2 CPU cores recommended. Found: $CPU_CORES"
    fi
    if [[ $RAM_GB -lt 4 ]]; then
        log_warning "Minimum 4GB RAM recommended. Found: ${RAM_GB}GB"
    fi
    if [[ $DISK_GB -lt 10 ]]; then
        log_warning "Minimum 10GB free disk space recommended. Found: ${DISK_GB}GB"
    fi
}

# Configure cloud-specific settings
configure_cloud() {
    log_step "Configuring cloud-specific settings..."
    
    case $CLOUD_PROVIDER in
        aws)
            configure_aws
            ;;
        gcp)
            configure_gcp
            ;;
        azure)
            configure_azure
            ;;
        digitalocean)
            configure_digitalocean
            ;;
        linode)
            configure_linode
            ;;
        bare-metal)
            log_info "Bare metal deployment. Skipping cloud configuration."
            ;;
    esac
    
    log_success "Cloud configuration complete"
}

# Configure AWS-specific settings
configure_aws() {
    log_cloud "Configuring AWS-specific settings..."
    
    # Install AWS CLI if not present
    if ! command -v aws &>/dev/null; then
        log_info "Installing AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
        unzip -q /tmp/awscliv2.zip -d /tmp
        /tmp/aws/install
        rm -rf /tmp/aws /tmp/awscliv2.zip
    fi
    
    # Check instance metadata
    if curl -s http://169.254.169.254/latest/meta-data/instance-type &>/dev/null; then
        INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)
        log_cloud "Instance Type: $INSTANCE_TYPE"
    fi
}

# Configure GCP-specific settings
configure_gcp() {
    log_cloud "Configuring GCP-specific settings..."
    
    # Install GCloud CLI if not present
    if ! command -v gcloud &>/dev/null; then
        log_info "Installing GCloud CLI..."
        echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
        curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
        apt-get update -qq
        apt-get install -y -qq google-cloud-cli
    fi
    
    # Check instance metadata
    if curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/machine-type &>/dev/null; then
        MACHINE_TYPE=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/machine-type)
        log_cloud "Machine Type: $MACHINE_TYPE"
    fi
}

# Configure Azure-specific settings
configure_azure() {
    log_cloud "Configuring Azure-specific settings..."
    
    # Install Azure CLI if not present
    if ! command -v az &>/dev/null; then
        log_info "Installing Azure CLI..."
        curl -sL https://aka.ms/InstallAzureCLIDeb | bash
    fi
    
    # Check instance metadata
    if curl -s -H "Metadata:true" "http://169.254.169.254/metadata/instance/compute/vmSize?api-version=2021-02-01" &>/dev/null; then
        VM_SIZE=$(curl -s -H "Metadata:true" "http://169.254.169.254/metadata/instance/compute/vmSize?api-version=2021-02-01")
        log_cloud "VM Size: $VM_SIZE"
    fi
}

# Configure DigitalOcean-specific settings
configure_digitalocean() {
    log_cloud "Configuring DigitalOcean-specific settings..."
    
    # Check droplet metadata
    if curl -s http://169.254.169.254/metadata/v1/id &>/dev/null; then
        DROPLET_ID=$(curl -s http://169.254.169.254/metadata/v1/id)
        log_cloud "Droplet ID: $DROPLET_ID"
    fi
}

# Configure Linode-specific settings
configure_linode() {
    log_cloud "Configuring Linode-specific settings..."
    
    # Check instance metadata
    if curl -s http://169.254.169.254/metadata/linode/instance &>/dev/null; then
        INSTANCE_ID=$(curl -s http://169.254.169.254/metadata/linode/instance)
        log_cloud "Instance ID: $INSTANCE_ID"
    fi
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
    if [[ -f ".env.vm.example" ]]; then
        cp ".env.vm.example" "$CONFIG_DIR/.env"
    elif [[ -f ".env.bare-metal.example" ]]; then
        cp ".env.bare-metal.example" "$CONFIG_DIR/.env"
    elif [[ -f ".env.example" ]]; then
        cp ".env.example" "$CONFIG_DIR/.env"
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
# Generated by vm-install.sh

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

# Configure Ollama for GPU
configure_ollama() {
    if [[ "$GPU_TYPE" == "amd" ]]; then
        log_step "Configuring Ollama for AMD ROCm..."
        
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
        
        mkdir -p /etc/systemd/system/ollama.service.d
        cat > /etc/systemd/system/ollama.service.d/cuda.conf << EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
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

# Configure firewall for cloud
configure_firewall() {
    log_step "Configuring firewall..."
    
    case $CLOUD_PROVIDER in
        aws)
            log_cloud "For AWS, configure Security Groups in the AWS Console:"
            log_info "  - Allow SSH (22) from your IP"
            log_info "  - Allow LiteLLM (4000) from your IP"
            log_info "  - Allow OpenClaw Gateway (18789) from your IP"
            ;;
        gcp)
            log_cloud "For GCP, configure Firewall Rules in the GCP Console:"
            log_info "  - Allow SSH (22) from your IP"
            log_info "  - Allow LiteLLM (4000) from your IP"
            log_info "  - Allow OpenClaw Gateway (18789) from your IP"
            ;;
        azure)
            log_cloud "For Azure, configure NSG Rules in the Azure Portal:"
            log_info "  - Allow SSH (22) from your IP"
            log_info "  - Allow LiteLLM (4000) from your IP"
            log_info "  - Allow OpenClaw Gateway (18789) from your IP"
            ;;
    esac
    
    # Configure local firewall
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            ufw allow ssh
            ufw allow 4000/tcp
            ufw allow 18789/tcp
            ufw allow 3000/tcp
            log_success "UFW firewall configured"
        fi
    elif command -v firewall-cmd &> /dev/null; then
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-port=4000/tcp
            firewall-cmd --permanent --add-port=18789/tcp
            firewall-cmd --permanent --add-port=3000/tcp
            firewall-cmd --reload
            log_success "firewalld configured"
        fi
    fi
}

# Print installation summary
print_summary() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - VM Installation Complete"
    echo "=============================================="
    echo ""
    log_success "OpenClaw has been installed successfully!"
    echo ""
    echo "Deployment Details:"
    echo "  - Cloud Provider: $CLOUD_PROVIDER"
    echo "  - OS Type: $OS_TYPE"
    echo "  - GPU Type: $GPU_TYPE"
    echo "  - OpenClaw Directory: $OPENCLAW_DIR"
    echo "  - Configuration Directory: $CONFIG_DIR"
    echo "  - Log Directory: $LOG_DIR"
    echo ""
    echo "Next Steps:"
    echo ""
    echo "  1. Edit environment file with your API keys:"
    echo "     nano $CONFIG_DIR/.env"
    echo ""
    echo "  2. Configure cloud firewall/Security Groups:"
    case $CLOUD_PROVIDER in
        aws)
            echo "     AWS Console > EC2 > Security Groups > Add rules"
            ;;
        gcp)
            echo "     GCP Console > VPC Network > Firewall > Add rule"
            ;;
        azure)
            echo "     Azure Portal > Network Security Group > Add rule"
            ;;
    esac
    echo ""
    echo "  3. Start services:"
    echo "     sudo systemctl start postgresql redis ollama litellm openclaw-gateway"
    echo ""
    echo "  4. Verify installation:"
    echo "     cd $OPENCLAW_DIR"
    echo "     ./scripts/health-check.sh"
    echo ""
    echo "Documentation:"
    echo "  - VM Deployment: $OPENCLAW_DIR/docs/deployment/VM_DEPLOYMENT.md"
    echo "  - Troubleshooting: $OPENCLAW_DIR/docs/deployment/NON_DOCKER_TROUBLESHOOTING.md"
    echo ""
    echo "=============================================="
}

# Main installation function
main() {
    echo ""
    echo "=============================================="
    echo "  Heretek OpenClaw - VM Installer"
    echo "=============================================="
    echo ""
    
    check_root
    detect_cloud
    detect_os
    detect_gpu
    check_requirements
    configure_cloud
    install_dependencies
    clone_repository
    create_directories
    configure_environment
    configure_ollama
    configure_firewall
    print_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --os)
            OS_TYPE="$2"
            shift 2
            ;;
        --gpu)
            GPU_TYPE="$2"
            shift 2
            ;;
        --cloud)
            CLOUD_PROVIDER="$2"
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
            echo "  --os OS_TYPE       Specify OS type (ubuntu, rhel, auto)"
            echo "  --gpu GPU_TYPE     Specify GPU type (amd, nvidia, none, auto)"
            echo "  --cloud PROVIDER   Specify cloud provider (aws, gcp, azure, auto)"
            echo "  --no-gpu           Skip GPU configuration"
            echo "  --help             Show this help message"
            echo ""
            echo "Cloud Providers:"
            echo "  aws, gcp, azure, digitalocean, linode, bare-metal"
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
