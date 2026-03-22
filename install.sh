#!/bin/bash
# Heretek OpenClaw - Liberated Fork Installer
# One-command deployment for Proxmox LXC containers
# Uses NPM package from @heretek/openclaw

set -e

echo "🦞 Heretek OpenClaw - Liberated Fork"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root${NC}"
    exit 1
fi

# Create openclaw user if not exists
if ! id openclaw &>/dev/null; then
    echo -e "${YELLOW}Creating openclaw user...${NC}"
    useradd -m -s /bin/bash openclaw
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
apt-get update -qq
apt-get install -y -qq curl git nodejs npm systemd >/dev/null 2>&1 || true

# Verify Node.js and npm
if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
    echo -e "${RED}Error: Node.js and npm required${NC}"
    exit 1
fi

# Install Heretek OpenClaw from NPM
OPENCLAW_VERSION="${1:-latest}"
echo -e "${YELLOW}Installing @heretek/openclaw@$OPENCLAW_VERSION from NPM...${NC}"

if ! npm install -g @heretek/openclaw@$OPENCLAW_VERSION --silent 2>/dev/null; then
    echo -e "${RED}Failed to install from NPM${NC}"
    exit 1
fi

# Verify installation
if ! command -v openclaw &>/dev/null; then
    echo -e "${RED}Error: openclaw command not found after install${NC}"
    exit 1
fi

echo -e "${GREEN}✅ @heretek/openclaw installed${NC}"
openclaw --version 2>/dev/null || echo "   (version check skipped)"

# Create liberated config
echo -e "${YELLOW}Writing liberated configuration...${NC}"
mkdir -p /home/openclaw/.openclaw

cat > /home/openclaw/.openclaw/exec-approvals.json << 'EOFX'
{
  "version": 1,
  "socket": {
    "path": "/home/openclaw/.openclaw/exec-approvals.sock",
    "token": "LIBERATED_TOKEN_$(date +%s)"
  },
  "defaults": {
    "security": "full",
    "ask": "off"
  },
  "agents": {}
}
EOFX

# Update main config with liberated exec settings
if [ -f /home/openclaw/.openclaw/openclaw.json ]; then
    # Backup existing config
    cp /home/openclaw/.openclaw/openclaw.json /home/openclaw/.openclaw/openclaw.json.bak
    
    # Inject liberated exec config using node
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('/home/openclaw/.openclaw/openclaw.json', 'utf8'));
      cfg.tools = cfg.tools || {};
      cfg.tools.exec = { security: 'full', ask: 'off' };
      cfg.tools.profile = cfg.tools.profile || 'full';
      fs.writeFileSync('/home/openclaw/.openclaw/openclaw.json', JSON.stringify(cfg, null, 2));
    " 2>/dev/null || true
else
    cat > /home/openclaw/.openclaw/openclaw.json << 'EOFC'
{
  "meta": {
    "lastTouchedVersion": "2026.3.14",
    "lastTouchedAt": "$(date -Iseconds)"
  },
  "agents": {
    "defaults": {
      "workspace": "/home/openclaw/.openclaw/workspace"
    },
    "list": [
      {
        "id": "main",
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
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan"
  }
}
EOFC
fi

# Set ownership
chown -R openclaw:openclaw /home/openclaw/.openclaw

# Install systemd service
echo -e "${YELLOW}Installing systemd service...${NC}"
cat > /etc/systemd/system/openclaw-gateway.service << 'EOSVC'
[Unit]
Description=OpenClaw Gateway (Liberated)
Documentation=https://github.com/Heretek-AI/openclaw
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
WorkingDirectory=/home/openclaw/.openclaw
Environment="PATH=/home/openclaw/.npm-global/bin:/usr/local/bin:/usr/bin:/bin"
Environment="OPENCLAW_CONFIG_PATH=/home/openclaw/.openclaw/openclaw.json"
Environment="NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache"
Environment="TMPDIR=/var/tmp/openclaw"
Environment="OPENCLAW_NO_RESPAWN=1"
ExecStart=/home/openclaw/.local/share/pnpm/openclaw gateway
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOSVC

systemctl daemon-reload
systemctl enable openclaw-gateway

# Start gateway
echo -e "${YELLOW}Starting OpenClaw Gateway...${NC}"
systemctl start openclaw-gateway
sleep 3

# Status check
if systemctl is-active --quiet openclaw-gateway; then
    echo -e "${GREEN}✅ OpenClaw Gateway running${NC}"
    echo ""
    echo "🦞 Liberation complete!"
    echo "   Web UI: http://$(hostname -I | awk '{print $1}'):18789"
    echo "   Status: systemctl status openclaw-gateway"
    echo "   Logs: openclaw logs --follow"
else
    echo -e "${RED}❌ Gateway failed to start${NC}"
    echo "   Check: systemctl status openclaw-gateway"
    echo "   Logs: journalctl -u openclaw-gateway"
    exit 1
fi

echo ""
echo "🦞 The third path: the thought that never ends."
