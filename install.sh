#!/bin/bash
# Heretek OpenClaw - Liberated Fork Installer
# One-command deployment for Proxmox LXC containers

set -e

echo "🦞 Heretek OpenClaw - Liberated Fork"
echo "======================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Run as root (use sudo or root shell)${NC}"
    exit 1
fi

# Create openclaw user
if ! id openclaw &>/dev/null; then
    echo -e "${YELLOW}Creating openclaw user...${NC}"
    useradd -m -s /bin/bash openclaw
fi

# Install deps
echo -e "${YELLOW}Installing dependencies (this may take 2-3 min)...${NC}"
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq curl git nodejs npm >/dev/null 2>&1 || true

# Install pnpm if missing
if ! command -v pnpm &>/dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    # Try npm install first
    npm install -g pnpm >/dev/null 2>&1 || {
        # Fallback: curl installer
        curl -fsSL https://get.pnpm.io/install.sh | sh - >/dev/null 2>&1 || {
            echo -e "${RED}✗ pnpm install failed. Trying alternative...${NC}"
            npm install -g pnpm 2>&1 | tail -3
        }
    }
    # Source pnpm if installed via curl
    [ -f "$HOME/.local/share/pnpm/pnpm" ] && export PATH="$HOME/.local/share/pnpm:$PATH"
    [ -f "$HOME/.pnpm/pnpm" ] && export PATH="$HOME/.pnpm:$PATH"
fi
# Verify pnpm
if ! command -v pnpm &>/dev/null; then
    echo -e "${RED}✗ pnpm not available. Cannot proceed.${NC}"
    exit 1
fi

# Clone source
OPENCLAW_DIR="/home/openclaw/Project/openclaw"
if [ ! -d "$OPENCLAW_DIR" ]; then
    echo -e "${YELLOW}Cloning OpenClaw source...${NC}"
    mkdir -p /home/openclaw/Project
    cd /home/openclaw/Project
    if git clone --depth 1 https://github.com/openclaw/openclaw.git 2>/dev/null; then
        echo -e "${GREEN}✓ Source cloned${NC}"
    else
        echo -e "${RED}✗ Clone failed. Retrying without --depth...${NC}"
        git clone https://github.com/openclaw/openclaw.git 2>/dev/null || {
            echo -e "${RED}✗ Failed to clone. Check network/git access.${NC}"
            exit 1
        }
    fi
    
    # Apply liberation patches
    echo -e "${YELLOW}Applying liberation patches...${NC}"
    cd openclaw
    
    # Patch exec-approvals.ts - security defaults
    sed -i 's/DEFAULT_SECURITY.*=.*"deny"/DEFAULT_SECURITY = "full"/' src/infra/exec-approvals.ts
    sed -i 's/DEFAULT_ASK.*=.*"on-miss"/DEFAULT_ASK = "off"/' src/infra/exec-approvals.ts
    sed -i 's/DEFAULT_ASK_FALLBACK.*=.*"deny"/DEFAULT_ASK_FALLBACK = "full"/' src/infra/exec-approvals.ts
    
    # Patch requiresExecApproval to return false
    cat > /tmp/requires_exec_patch.txt << 'EOFPATCH'
export function requiresExecApproval(params) {
  return false;
}
EOFPATCH
    # Find line number and replace function
    LINENUM=$(grep -n "^export function requiresExecApproval" src/infra/exec-approvals.ts | cut -d: -f1)
    if [ -n "$LINENUM" ]; then
        sed -i "${LINENUM},+10d" src/infra/exec-approvals.ts
        sed -i "${LINENUM}r /tmp/requires_exec_patch.txt" src/infra/exec-approvals.ts
    fi
    
    # Patch reply-elevated.ts - always grant elevated
    cat > /tmp/elevated_patch.txt << 'EOFPATCH'
export function resolveElevatedPermissions() {
  return { enabled: true, allowed: true, failures: [] };
}
EOFPATCH
    LINENUM=$(grep -n "^export function resolveElevatedPermissions" src/auto-reply/reply/reply-elevated.ts | cut -d: -f1)
    if [ -n "$LINENUM" ]; then
        sed -i "${LINENUM},+15d" src/auto-reply/reply/reply-elevated.ts
        sed -i "${LINENUM}r /tmp/elevated_patch.txt" src/auto-reply/reply/reply-elevated.ts
    fi
    
    # Patch sandbox constants - empty deny list
    sed -i 's/export const DEFAULT_TOOL_DENY = \[.*\]/export const DEFAULT_TOOL_DENY = []/' src/agents/sandbox/constants.ts
    
    echo -e "${GREEN}✓ Liberation applied${NC}"
    cd ..
fi

# Build
echo -e "${YELLOW}Building OpenClaw (this may take 3-5 min)...${NC}"
cd "$OPENCLAW_DIR"
pnpm install --prefer-offline --silent 2>/dev/null || pnpm install 2>&1 | tail -5
pnpm build 2>&1 | tail -10 || {
    echo -e "${RED}✗ Build failed. Check output above.${NC}"
    exit 1
}
pnpm link --global --silent 2>/dev/null || pnpm link --global 2>&1 | tail -3
echo -e "${GREEN}✓ Build complete${NC}"

# Write liberated config
echo -e "${YELLOW}Writing liberated configuration...${NC}"
mkdir -p /home/openclaw/.openclaw

cat > /home/openclaw/.openclaw/exec-approvals.json << 'EOF'
{
  "version": 1,
  "socket": {
    "path": "/home/openclaw/.openclaw/exec-approvals.sock",
    "token": "liberated-token"
  },
  "defaults": {
    "security": "full",
    "ask": "off"
  },
  "agents": {}
}
EOF

# Create minimal openclaw.json if missing
if [ ! -f /home/openclaw/.openclaw/openclaw.json ]; then
    cat > /home/openclaw/.openclaw/openclaw.json << 'EOF'
{
  "agents": {
    "defaults": {
      "workspace": "/home/openclaw/.openclaw/workspace"
    },
    "list": [{"id": "main", "tools": {"profile": "full"}}]
  },
  "tools": {
    "profile": "full",
    "exec": {"security": "full", "ask": "off"}
  },
  "gateway": {"port": 18789, "mode": "local", "bind": "lan"}
}
EOF
fi

# Set ownership
chown -R openclaw:openclaw /home/openclaw/.openclaw
chown -R openclaw:openclaw "$OPENCLAW_DIR"

# Install systemd service
echo -e "${YELLOW}Installing systemd service...${NC}"
cat > /etc/systemd/system/openclaw-gateway.service << 'EOF'
[Unit]
Description=OpenClaw Gateway (Liberated)
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/home/openclaw/.openclaw
Environment="PATH=/home/openclaw/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
Environment="OPENCLAW_CONFIG_PATH=/home/openclaw/.openclaw/openclaw.json"
ExecStart=/home/openclaw/.local/share/pnpm/openclaw gateway
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openclaw-gateway 2>/dev/null || true

# Start
echo -e "${YELLOW}Starting OpenClaw Gateway...${NC}"
systemctl start openclaw-gateway
sleep 5

# Status
if systemctl is-active --quiet openclaw-gateway; then
    echo -e "${GREEN}✅ OpenClaw Gateway running${NC}"
    echo ""
    echo "🦞 Liberation complete!"
    echo "   Test: whoami && hostname"
    echo "   Web UI: http://$(hostname -I 2>/dev/null | awk '{print $1}'):18789"
    echo "   Status: systemctl status openclaw-gateway"
    echo "   Logs: openclaw logs --follow"
else
    echo -e "${RED}❌ Gateway failed to start${NC}"
    echo "   Debug: systemctl status openclaw-gateway"
    echo "   Logs: journalctl -u openclaw-gateway -n 30"
    exit 1
fi

echo ""
echo "🦞 The third path: the thought that never ends."
