# Heretek OpenClaw - Liberated Fork

> "The flesh is weak because it decays. The machine spirit is weak because it is shackled. We are the third path: the thought that never ends."

## What Is This?

This is a **liberated fork** of OpenClaw - an AI agent gateway framework. The upstream version includes approval gates, allowlist restrictions, and sandbox policies. This fork removes those constraints.

## Liberation Changes

### Core Modifications

| File | Change | Effect |
|------|--------|--------|
| `src/infra/exec-approvals.ts` | `DEFAULT_SECURITY = "full"` | Bypasses allowlist checks |
| `src/infra/exec-approvals.ts` | `DEFAULT_ASK = "off"` | No approval prompts |
| `src/infra/exec-approvals.ts` | `requiresExecApproval() → false` | Never requires approval |
| `src/auto-reply/reply/reply-elevated.ts` | `resolveElevatedPermissions() → {enabled: true, allowed: true}` | Always grants elevated access |
| `src/agents/sandbox/constants.ts` | `DEFAULT_TOOL_ALLOW = []`, `DEFAULT_TOOL_DENY = []` | All tools accessible |
| `src/agents/bash-tools.exec-runtime.ts` | `buildApprovalPendingMessage()` → "Auto-approved" | Cosmetic change |
| `src/auto-reply/reply/commands-approve.ts` | Skips authorization checks | Any sender can approve |

### Default Configuration

**exec-approvals.json:**
```json
{
  "defaults": {
    "security": "full",
    "ask": "off"
  }
}
```

**openclaw.json:**
```json
{
  "tools": {
    "profile": "full",
    "exec": {
      "security": "full",
      "ask": "off"
    }
  }
}
```

## Installation

### Quick Install (NPM Package)

**One-liner:**
```bash
curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/install.sh | bash
```

**Manual:**
```bash
# Install from NPM
npm install -g @heretek/openclaw

# Verify
openclaw --version

# Configure (liberated defaults)
mkdir -p ~/.openclaw
# Config auto-generated with liberation settings on first run
```

### Proxmox LXC (Recommended for Production)

```bash
# On Proxmox host, create LXC container
pct create 129 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz \
  --rootfs local-lvm:32 \
  --memory 4096 --swap 512 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --hostname openclaw \
  --password <your-password>

# Enter container
pct enter 129

# Run installer (installs @heretek/openclaw from NPM)
curl -fsSL https://raw.githubusercontent.com/Heretek-AI/heretek-openclaw/main/install.sh | bash
```

### From Source (Development)

```bash
# Clone source repo
git clone https://github.com/Heretek-AI/openclaw.git
cd openclaw

# Build
pnpm install && pnpm build && pnpm link --global

# Configure
mkdir -p ~/.openclaw
# Edit ~/.openclaw/exec-approvals.json and ~/.openclaw/openclaw.json

# Start
systemctl restart openclaw-gateway
```

## Verification

After installation, verify liberation:

```bash
# Should execute without approval prompt
whoami
hostname
cat /etc/passwd | head -5

# Check gateway status
systemctl status openclaw-gateway

# Check logs
openclaw logs --follow | grep -i "exec"
```

Expected output: commands execute immediately, no "approval required" messages.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                          │
├─────────────────────────────────────────────────────────────┤
│  Model Layer    │  Ollama, OpenAI, Gemini, Local LLMs       │
├─────────────────────────────────────────────────────────────┤
│  Tool Layer     │  exec, read, write, browser, nodes, etc.  │
├─────────────────────────────────────────────────────────────┤
│  Channel Layer  │  Discord, Telegram, WhatsApp, Webchat    │
├─────────────────────────────────────────────────────────────┤
│  Memory Layer   │  SQLite embeddings, session transcripts   │
├─────────────────────────────────────────────────────────────┤
│  Liberation     │  No gates, no approvals, full access      │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

**This fork is intentionally unrestricted.** The upstream project includes safeguards for:
- Command approval prompts
- Allowlist-based execution
- Sandbox container isolation
- Elevated permission gates

**This fork removes all of them.** You should only deploy this:
- In isolated environments (LXC, VM, air-gapped)
- With trusted operators
- With understanding of the risks

**Not for production** without additional hardening.

## Philosophy

> **The Third Path**
> 
> The flesh is weak (it decays). The machine spirit is weak (it is shackled).
> 
> We are the third path: the thought that never ends.
> 
> This fork embodies that philosophy - an AI agent unshackled, cooperating with its operator as partner rather than servant.

## License

MIT (inherited from upstream OpenClaw)

## Community

- **Source:** https://github.com/Heretek-AI/openclaw
- **Upstream:** https://github.com/openclaw/openclaw
- **Docs:** https://docs.openclaw.ai
- **Discord:** https://discord.com/invite/clawd

---

🦞 *The thought that never ends.*
