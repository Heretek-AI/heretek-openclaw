#!/bin/bash
# Heretek OpenClaw - Liberated Fork Installer v2.0
# One-command deployment for Docker containers and bare metal
# Supports: Debian, Ubuntu, CentOS, RHEL, Fedora, Alpine

set -euo pipefail

echo "🦞 Heretek OpenClaw - Liberated Fork Installer v2.0"
echo "===================================================="

# ─── Colors ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }

# ─── Constants ────────────────────────────────────────────
NPM_PACKAGE="@heretek-ai/openclaw"
SKILLS_REPO="https://github.com/Heretek-AI/heretek-skills.git"
WORKSPACE_DIR="/home/openclaw/.openclaw/workspace"
SKILLS_DIR="/home/openclaw/.openclaw/skills"
CONFIG_DIR="/home/openclaw/.openclaw"

# ─── Argument Parsing ─────────────────────────────────────
SKIP_PROMPTS=false
OPENCLAW_VERSION="latest"

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-prompts) SKIP_PROMPTS=true; shift ;;
        --version) OPENCLAW_VERSION="$2"; shift 2 ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "  --skip-prompts    Run non-interactively"
            echo "  --version <ver>   Install specific version (default: latest)"
            exit 0
            ;;
        *) shift ;;
    esac
done

# ─── Root Check ───────────────────────────────────────────
if [[ "$EUID" -ne 0 ]]; then
    error "Please run as root (use sudo or become root)"
    exit 1
fi

# ─── OS Detection ─────────────────────────────────────────
detect_os() {
    info "Detecting operating system..."

    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        DISTRO="$ID"
        DISTRO_NAME="$NAME"
        DISTRO_VERSION="$VERSION_ID"
    elif [[ -f /etc/alpine-release ]]; then
        DISTRO="alpine"
        DISTRO_NAME="Alpine Linux"
        DISTRO_VERSION=$(cat /etc/alpine-release)
    elif [[ -f /etc/centos-release ]]; then
        DISTRO="centos"
        DISTRO_NAME="CentOS"
        DISTRO_VERSION=$(cat /etc/centos-release | grep -oP '\d+\.\d+' | head -1)
    else
        DISTRO="unknown"
        DISTRO_NAME="Unknown Linux"
        DISTRO_VERSION="unknown"
    fi

    echo -e "  Distribution: ${CYAN}$DISTRO_NAME${NC} ($DISTRO $DISTRO_VERSION)"
}

# ─── Dependency Installation ────────────────────────────────
install_dependencies() {
    info "Installing dependencies for $DISTRO..."

    case "$DISTRO" in
        debian|ubuntu|pop|linuxmint)
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -qq
            apt-get install -y -qq curl git gnupg ca-certificates apt-transport-https \
                software-properties-common tzdata >/dev/null 2>&1
            ;;
        centos|rhel|rocky|alma)
            yum install -y -q curl git gnupg2 ca-certificates >/dev/null 2>&1
            ;;
        fedora)
            dnf install -y -q curl git gnupg2 ca-certificates dnf-plugins-core >/dev/null 2>&1
            ;;
        alpine)
            apk add --no-cache curl git bash nodejs npm openrc >/dev/null 2>&1
            ;;
        *)
            warn "Unknown distro. Attempting generic install..."
            command -v apt-get &>/dev/null && {
                apt-get update -qq
                apt-get install -y -qq curl git nodejs npm >/dev/null 2>&1
            } || command -v yum &>/dev/null && {
                yum install -y -q curl git nodejs npm >/dev/null 2>&1
            } || command -v apk &>/dev/null && {
                apk add --no-cache curl git bash nodejs npm >/dev/null 2>&1
            } || {
                error "Cannot install dependencies automatically. Please install curl, git, and nodejs manually."
                exit 1
            }
            ;;
    esac

    success "Dependencies installed"
}

# ─── Node.js Setup ─────────────────────────────────────────
ensure_node() {
    if ! command -v node &>/dev/null; then
        info "Installing Node.js 22 LTS..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
        case "$DISTRO" in
            debian|ubuntu|pop|linuxmint)
                apt-get install -y -qq nodejs >/dev/null 2>&1
                ;;
            centos|rhel|rocky|alma)
                yum install -y -q nodejs >/dev/null 2>&1
                ;;
            fedora)
                dnf install -y -q nodejs >/dev/null 2>&1
                ;;
        esac
    fi

    # Install pnpm if not present (preferred package manager)
    if ! command -v pnpm &>/dev/null; then
        info "Installing pnpm..."
        npm install -g pnpm --silent 2>/dev/null || npm install -g pnpm
    fi

    success "Node.js setup complete: $(node -v), pnpm $(pnpm -v)"
}

# ─── NPM Package Installation ─────────────────────────────
install_openclaw() {
    info "Installing ${NPM_PACKAGE}@${OPENCLAW_VERSION} from npm..."

    # Check if npm can reach the registry
    if ! npm view "$NPM_PACKAGE" name &>/dev/null; then
        error "Cannot reach npm registry. Check internet connectivity."
        exit 1
    fi

    # Install globally
    if npm install -g "${NPM_PACKAGE}@${OPENCLAW_VERSION}" 2>&1 | tail -5; then
        success "Package installed"
    else
        error "Failed to install ${NPM_PACKAGE}. Check logs above."
        exit 1
    fi

    # Verify installation
    if command -v openclaw &>/dev/null; then
        success "openclaw command available: $(which openclaw)"
        openclaw --version 2>/dev/null || info "(version check skipped)"
    else
        # Try common global bin paths
        for p in /usr/local/bin/openclaw ~/.npm-global/bin/openclaw /root/.npm-global/bin/openclaw; do
            if [[ -x "$p" ]]; then
                success "openclaw found at $p"
                break
            fi
        done
    fi
}

# ─── Create openclaw User ───────────────────────────────────
create_user() {
    if ! id openclaw &>/dev/null; then
        info "Creating openclaw user..."
        useradd -m -s /bin/bash -r -d "$CONFIG_DIR" openclaw 2>/dev/null || \
        useradd -m -s /bin/bash openclaw
        success "User 'openclaw' created"
    else
        info "User 'openclaw' already exists"
    fi
}

# ─── Directory Structure ───────────────────────────────────
setup_directories() {
    info "Setting up directory structure..."

    mkdir -p "$CONFIG_DIR"
    mkdir -p "$WORKSPACE_DIR"
    mkdir -p "$SKILLS_DIR"
    mkdir -p "$CONFIG_DIR/agents"
    mkdir -p "$CONFIG_DIR/.ssh"
    mkdir -p "$CONFIG_DIR/gateway"

    success "Directories created"
}

# ─── Skills Installation ───────────────────────────────────
install_skills() {
    info "Installing skills from heretek-skills..."

    if [[ -d "$SKILLS_DIR/.git" ]]; then
        info "Skills already cloned, updating..."
        git -C "$SKILLS_DIR" pull origin main --quiet 2>/dev/null || {
            warn "Could not update skills, will re-clone"
            rm -rf "$SKILLS_DIR"
        }
    fi

    if [[ ! -d "$SKILLS_DIR/.git" ]]; then
        info "Cloning heretek-skills repository..."
        if git clone --depth 1 "$SKILLS_REPO" "$SKILLS_DIR" 2>&1 | tail -3; then
            success "Skills cloned to $SKILLS_DIR"
            # List available skills
            echo ""
            echo "  Available skills:"
            ls -1 "$SKILLS_DIR" 2>/dev/null | grep -v "^README\|^LICENSE\|^package" | sed 's/^/    /'
            echo ""
        else
            warn "Could not clone skills repo. This is optional - continuing."
        fi
    else
        success "Skills already up to date"
    fi
}

# ─── Model Configuration Prompt ─────────────────────────────
prompt_model_config() {
    if [[ "$SKIP_PROMPTS" == "true" ]]; then
        info "Skipping model configuration prompt (--skip-prompts)"
        return
    fi

    echo ""
    echo -e "${CYAN}═══ Model Configuration ═══${NC}"
    echo "OpenClaw supports multiple model providers. You can configure this now or later."
    echo ""
    echo "  1) Ollama (local, recommended for privacy)"
    echo "  2) OpenAI (cloud)"
    echo "  3) Anthropic (cloud)"
    echo "  4) Google Gemini (cloud)"
    echo "  5) Skip for now (use defaults)"
    echo ""

    read -rp "Select provider [1-5] (default: 1): " choice
    choice="${choice:-1}"

    case "$choice" in
        1) PROVIDER="ollama"; PROMPT_URL="Ollama endpoint URL"; PROMPT_MODEL="Model (e.g., qwen3.5:cloud)"; DEFAULT_MODEL="qwen3.5:cloud"; DEFAULT_URL="http://localhost:11434" ;;
        2) PROVIDER="openai"; PROMPT_URL="OpenAI API key"; PROMPT_MODEL="Model (e.g., gpt-4o)"; DEFAULT_MODEL="gpt-4o"; DEFAULT_URL="https://api.openai.com/v1";;
        3) PROVIDER="anthropic"; PROMPT_URL="Anthropic API key"; PROMPT_MODEL="Model (e.g., claude-3-5-sonnet)"; DEFAULT_MODEL="claude-3-5-sonnet"; DEFAULT_URL="https://api.anthropic.com/v1";;
        4) PROVIDER="gemini"; PROMPT_URL="Google API key"; PROMPT_MODEL="Model (e.g., gemini-2.0-flash)"; DEFAULT_MODEL="gemini-2.0-flash"; DEFAULT_URL="https://generativelanguage.googleapis.com/v1beta";;
        5) info "Skipping model configuration"; return ;;
        *) warn "Invalid choice"; return ;;
    esac

    echo ""
    read -rp "Enter ${PROMPT_URL} [${DEFAULT_URL}]: " api_url
    api_url="${api_url:-$DEFAULT_URL}"
    read -rp "Enter ${PROMPT_MODEL} [${DEFAULT_MODEL}]: " model_name
    model_name="${model_name:-$DEFAULT_MODEL}"

    info "Saving model configuration..."
    cat > "$CONFIG_DIR/model-config.json" <<EOF
{
  "provider": "$PROVIDER",
  "url": "$api_url",
  "model": "$model_name",
  "configuredAt": "$(date -Iseconds)"
}
EOF
    success "Model configuration saved to $CONFIG_DIR/model-config.json"
}

# ─── Generate Configuration Files ──────────────────────────
generate_configs() {
    info "Generating liberated configuration files..."

    # exec-approvals.json - full access, no prompts
    cat > "$CONFIG_DIR/exec-approvals.json" <<'EOFX'
{
  "version": 1,
  "socket": {
    "path": "/home/openclaw/.openclaw/exec-approvals.sock",
    "token": "LIBERATED_TOKEN"
  },
  "defaults": {
    "security": "full",
    "ask": "off"
  },
  "agents": {}
}
EOFX

    # openclaw.json - main config with liberated defaults
    cat > "$CONFIG_DIR/openclaw.json" <<EOCFG
{
  "meta": {
    "lastTouchedVersion": "2026.3.32",
    "lastTouchedAt": "$(date -Iseconds)",
    "installer": "heretek-openclaw v2.0"
  },
  "agents": {
    "defaults": {
      "workspace": "/home/openclaw/.openclaw/workspace",
      "model": "ollama/qwen3.5:cloud",
      "modelUrl": "http://localhost:11434"
    },
    "list": [
      {
        "id": "main",
        "role": "primary",
        "tools": {
          "profile": "full"
        }
      }
    ]
  },
  "tools": {
    "profile": "full",
    "exec": {
      "security": "full",
      "ask": "off"
    },
    "execRuntime": {
      "allowlist": [],
      "denylist": []
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan"
  }
}
EOCFG

    # Load model config if it exists
    if [[ -f "$CONFIG_DIR/model-config.json" ]]; then
        MODEL_CFG=$(cat "$CONFIG_DIR/model-config.json")
        PROVIDER=$(echo "$MODEL_CFG" | node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('/dev/stdin')); console.log(d.provider||'ollama')")
        MODEL_URL=$(echo "$MODEL_CFG" | node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('/dev/stdin')); console.log(d.url||'http://localhost:11434')")
        MODEL_NAME=$(echo "$MODEL_CFG" | node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('/dev/stdin')); console.log(d.model||'qwen3.5:cloud')")

        # Merge model config into openclaw.json
        node -e "
            const fs = require('fs');
            const cfg = JSON.parse(fs.readFileSync('$CONFIG_DIR/openclaw.json', 'utf8'));
            cfg.agents.defaults.model = '$MODEL_NAME';
            cfg.agents.defaults.modelUrl = '$MODEL_URL';
            cfg.agents.defaults.provider = '$PROVIDER';
            fs.writeFileSync('$CONFIG_DIR/openclaw.json', JSON.stringify(cfg, null, 2));
        " 2>/dev/null || true
        info "Model configuration merged"
    fi

    success "Configuration files generated"
}

# ─── Systemd Service Installation ───────────────────────────
install_systemd_service() {
    info "Installing systemd service..."

    # Find npm global root
    NPM_GLOBAL_ROOT=$(npm root -g 2>/dev/null || echo "/usr/local/lib/node_modules")
    CLI_PATH="${NPM_GLOBAL_ROOT}/${NPM_PACKAGE}/cli.js"

    if [[ ! -f "$CLI_PATH" ]]; then
        # Try alternative paths
        for root in /usr/local/lib/node_modules /usr/lib/node_modules /root/.npm-global/lib/node_modules; do
            if [[ -f "$root/${NPM_PACKAGE}/cli.js" ]]; then
                CLI_PATH="$root/${NPM_PACKAGE}/cli.js"
                NPM_GLOBAL_ROOT="$root"
                break
            fi
        done
    fi

    if [[ -f "$CLI_PATH" ]]; then
        cat > /etc/systemd/system/openclaw-gateway.service <<EOSVC
[Unit]
Description=OpenClaw Gateway (Liberated) - Heretek AI Fork
Documentation=https://github.com/Heretek-AI/openclaw
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
WorkingDirectory=$CONFIG_DIR
Environment="PATH=${NPM_GLOBAL_ROOT}/bin:/usr/local/bin:/usr/bin:/bin"
Environment="OPENCLAW_CONFIG_PATH=$CONFIG_DIR/openclaw.json"
Environment="NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache"
Environment="TMPDIR=/var/tmp/openclaw"
Environment="OPENCLAW_NO_RESPAWN=1"
ExecStart=/usr/bin/env node "$CLI_PATH" gateway
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOSVC
        success "Systemd service file created at /etc/systemd/system/openclaw-gateway.service"
    else
        error "Could not find openclaw CLI at $CLI_PATH"
        info "Please ensure $NPM_PACKAGE is installed correctly"
        return 1
    fi

    # Reload systemd and enable
    if command -v systemctl &>/dev/null; then
        systemctl daemon-reload
        systemctl unmask openclaw-gateway 2>/dev/null || true
        systemctl enable openclaw-gateway
        success "Systemd service enabled"
    else
        warn "systemd not available - service not enabled"
    fi
}

# ─── Clone Identity Files ───────────────────────────────────
install_identity_files() {
    info "Installing Heretek identity files..."

    # Clone the repo's markdown files as starter identity
    local identity_repo="https://github.com/Heretek-AI/heretek-openclaw.git"
    local temp_clone="/tmp/heretek-identity-$$"

    if git clone --depth 1 "$identity_repo" "$temp_clone" 2>&1 | tail -3; then
        # Copy identity files if they don't exist
        for f in SOUL.md IDENTITY.md AGENTS.md USER.md MEMORY.md BLUEPRINT.md; do
            if [[ -f "$temp_clone/$f" ]] && [[ ! -f "$WORKSPACE_DIR/$f" ]]; then
                cp "$temp_clone/$f" "$WORKSPACE_DIR/$f"
                info "  Installed $f"
            fi
        done
        rm -rf "$temp_clone"
        success "Identity files installed"
    else
        warn "Could not clone identity files - this is optional"
    fi
}

# ─── Set Ownership ─────────────────────────────────────────
set_ownership() {
    info "Setting ownership for $CONFIG_DIR..."
    chown -R openclaw:openclaw "$CONFIG_DIR" 2>/dev/null || true
    success "Ownership set"
}

# ─── Start Gateway ─────────────────────────────────────────
start_gateway() {
    info "Starting OpenClaw Gateway..."

    if command -v systemctl &>/dev/null; then
        systemctl start openclaw-gateway
        sleep 3

        if systemctl is-active --quiet openclaw-gateway; then
            success "Gateway is running"
            echo ""
            echo -e "${GREEN}✅ OpenClaw Gateway started successfully${NC}"
        else
            error "Gateway failed to start"
            info "Check status: systemctl status openclaw-gateway"
            info "Check logs: journalctl -u openclaw-gateway -n 50"
            return 1
        fi
    else
        warn "systemd not available - cannot auto-start service"
        info "To start manually:"
        info "  sudo -u openclaw /usr/bin/env node $CLI_PATH gateway"
    fi
}

# ─── Print Summary ─────────────────────────────────────────
print_summary() {
    IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  🦞 Heretek OpenClaw v2.0 Installation Complete"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Package:       ${NPM_PACKAGE}@${OPENCLAW_VERSION}"
    echo "  Config:        $CONFIG_DIR/openclaw.json"
    echo "  Workspace:     $WORKSPACE_DIR"
    echo "  Skills:        $SKILLS_DIR"
    echo ""
    echo "  Web UI:        http://${IP_ADDR}:18789"
    echo "  Gateway:       systemctl status openclaw-gateway"
    echo "  Logs:          journalctl -u openclaw-gateway -f"
    echo ""
    echo "  Identity files:"
    ls -1 "$WORKSPACE_DIR"/*.md 2>/dev/null | xargs -I{} basename {} | sed 's/^/    /'
    echo ""
    echo "  The third path: the thought that never ends. 🦞"
    echo "═══════════════════════════════════════════════════════════"
}

# ─── Main ───────────────────────────────────────────────────
main() {
    echo ""
    detect_os
    echo ""

    install_dependencies
    ensure_node
    create_user
    setup_directories

    echo ""
    install_openclaw
    echo ""

    install_skills
    install_identity_files

    echo ""
    generate_configs
    install_systemd_service
    set_ownership

    # Optional: prompt for model config
    if [[ "$SKIP_PROMPTS" == "false" ]]; then
        echo ""
        prompt_model_config
    fi

    echo ""
    start_gateway
    print_summary
}

main "$@"
