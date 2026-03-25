# Security Policy

## ⚠️ Important Warning

**Heretek OpenClaw is intentionally unrestricted.** This fork removes all safety constraints from the upstream OpenClaw project. This includes:

- Command approval prompts
- Allowlist-based execution
- Sandbox container isolation
- Elevated permission gates

## Intended Use

This software is designed for:
- Isolated environments (LXC containers, VMs, air-gapped systems)
- Trusted operators who understand the risks
- Development and research purposes

## NOT for Production

Do not deploy in production environments without additional hardening measures. The liberation process removes security controls that exist in the upstream project for good reason.

## Reporting Security Issues

Given the intentional nature of this fork, we do not accept traditional security vulnerability reports. However, if you discover unintended behavior (bugs, not features), please open an issue.

## Best Practices

1. **Isolation**: Run in LXC/VM, not directly on host
2. **Network**: Restrict network access appropriately
3. **User**: Run as dedicated non-root user where possible
4. **Monitoring**: Log and monitor all activity
5. **Updates**: Keep components updated

## Third-Party Dependencies

This project depends on:
- `openclaw` (npm) - upstream package
- `ollama` - local LLM runtime (if using default model)

Ensure you review and update these dependencies regularly.

---

**The third path: the thought that never ends.** 🦞
