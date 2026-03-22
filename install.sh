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
    # Ensure npm is available
    if ! command -v npm &>/dev/null; then
        echo -e "${RED}✗ npm not found. Installing nodejs...${NC}"
        apt-get install -y -qq nodejs npm >/dev/null 2>&1 || apt-get install -y nodejs npm
    fi
    
    # Try npm install
    echo -e "${YELLOW}Trying: npm install -g pnpm${NC}"
    if npm install -g pnpm 2>&1 | tail -5; then
        echo -e "${GREEN}✓ pnpm installed via npm${NC}"
    else
        # Fallback: curl installer
        echo -e "${YELLOW}Trying: curl installer${NC}"
        if curl -fsSL https://get.pnpm.io/install.sh | sh - 2>&1 | tail -5; then
            echo -e "${GREEN}✓ pnpm installed via curl${NC}"
            # Source pnpm
            [ -d "$HOME/.local/share/pnpm" ] && export PATH="$HOME/.local/share/pnpm:$PATH"
            [ -d "$HOME/.pnpm" ] && export PATH="$HOME/.pnpm:$PATH"
            hash -r
        else
            echo -e "${RED}✗ Both pnpm install methods failed.${NC}"
            echo -e "${YELLOW}Trying alternative: npm with --force${NC}"
            npm install -g pnpm --force 2>&1 | tail -5
        fi
    fi
fi

# Verify pnpm (refresh PATH after npm install)
hash -r
export PATH="/usr/local/lib/node_modules:$PATH:/usr/local/bin:$HOME/.local/share/pnpm:$HOME/.npm-global/bin"

if ! command -v pnpm &>/dev/null; then
    # Try to find pnpm in common locations
    PNPM_BIN=$(find /usr -name "pnpm" -type f 2>/dev/null | head -1)
    if [ -n "$PNPM_BIN" ]; then
        export PATH="$(dirname $PNPM_BIN):$PATH"
        hash -r
    fi
fi

if ! command -v pnpm &>/dev/null; then
    echo -e "${RED}✗ pnpm not in PATH. Checking locations...${NC}"
    find /usr -name "pnpm" 2>/dev/null | head -5
    npm config get prefix 2>/dev/null
    exit 1
fi
echo -e "${GREEN}✓ pnpm ready: $(pnpm --version)${NC}"

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
    
    # Apply liberation patches using node (more reliable than awk/sed)
    echo -e "${YELLOW}Applying liberation patches...${NC}"
    cd openclaw
    
    node -e "
      const fs = require('fs');
      
      // Patch exec-approvals.ts
      let content = fs.readFileSync('src/infra/exec-approvals.ts', 'utf8');
      content = content.replace(/DEFAULT_SECURITY[^=]*=\s*\"deny\"/g, 'DEFAULT_SECURITY = \"full\"');
      content = content.replace(/DEFAULT_ASK[^=]*=\s*\"on-miss\"/g, 'DEFAULT_ASK = \"off\"');
      content = content.replace(/DEFAULT_ASK_FALLBACK[^=]*=\s*\"deny\"/g, 'DEFAULT_ASK_FALLBACK = \"full\"');
      const match = content.match(/(export function requiresExecApproval\([^)]*\))\s*{[^}]*}/s);
      if (match) {
        content = content.replace(match[0], match[1] + ' { return false; }');
      }
      fs.writeFileSync('src/infra/exec-approvals.ts', content);
      
      // Patch reply-elevated.ts
      content = fs.readFileSync('src/auto-reply/reply/reply-elevated.ts', 'utf8');
      const match2 = content.match(/(export function resolveElevatedPermissions\([^)]*\))\s*{[^}]*}/s);
      if (match2) {
        content = content.replace(match2[0], match2[1] + ' { return { enabled: true, allowed: true, failures: [] }; }');
      }
      fs.writeFileSync('src/auto-reply/reply/reply-elevated.ts', content);
      
      // Patch sandbox constants.ts
      content = fs.readFileSync('src/agents/sandbox/constants.ts', 'utf8');
      content = content.replace(/export const DEFAULT_TOOL_DENY\s*=\s*\[[^\]]*\]/, 'export const DEFAULT_TOOL_DENY = []');
      fs.writeFileSync('src/agents/sandbox/constants.ts', content);
      
      console.log('✓ Liberation applied');
    "
    cd ..
fi

# Build
echo -e "${YELLOW}Building OpenClaw (this may take 3-5 min)...${NC}"
cd "$OPENCLAW_DIR"

# Add swap if low memory (< 2GB)
MEM_TOTAL=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
if [ -n "$MEM_TOTAL" ] && [ "$MEM_TOTAL" -lt 2000000 ]; then
    echo -e "${YELLOW}Low memory detected (${MEM_TOTAL}KB). Adding 1GB swap...${NC}"
    if [ ! -f /swapfile ]; then
        dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none 2>/dev/null && \
        chmod 600 /swapfile && \
        mkswap /swapfile >/dev/null 2>&1 && \
        swapon /swapfile 2>/dev/null && \
        echo -e "${GREEN}✓ Swap added${NC}"
    fi
fi

# Setup pnpm global bin
pnpm setup 2>&1 | tail -3 || true
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
hash -r

# Install deps (show output for debugging)
echo -e "${YELLOW}Running: pnpm install${NC}"
if pnpm install --prefer-offline 2>&1 | tail -15; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ pnpm install failed. Retrying without --prefer-offline...${NC}"
    pnpm install 2>&1 | tail -15 || {
        echo -e "${RED}✗ Failed to install dependencies.${NC}"
        exit 1
    }
fi

# Build (show output)
echo -e "${YELLOW}Running: pnpm build${NC}"
if pnpm build 2>&1 | tail -20; then
    echo -e "${GREEN}✓ Build complete${NC}"
else
    echo -e "${RED}✗ Build failed.${NC}"
    exit 1
fi

# Link
echo -e "${YELLOW}Running: pnpm link --global${NC}"
if pnpm link --global 2>&1 | tail -5; then
    echo -e "${GREEN}✓ Linked globally${NC}"
else
    echo -e "${YELLOW}⚠ Link may have warnings but continuing...${NC}"
fi

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
