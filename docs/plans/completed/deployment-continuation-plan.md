# Deployment Continuation Plan

**Date:** 2026-03-29
**Selected Approach:** Option A - Bind Mount
**Status:** Ready for Implementation

## Overview

This plan addresses the remaining gaps identified in the implementation assessment and provides a strategy for integrating heretek-skills into the Docker deployment.

---

## Part 1: Heretek-Skills Docker Integration

### Current State

The docker-compose.yml already references `skills_data:/app/skills:ro` for each agent, but However, this volume is never populated with actual skills.

### Integration Options

| Option | Description | Pros | Cons |
|-------|-------------|-----|------|
| **A. Bind Mount** | Mount `../heretek-skills/skills` directly | Simple, immediate | Requires heretek-skills repo alongside heretek-openclaw |
| **B. Skills Service** | Dedicated init container | Clean separation | Extra container to manage |
| **C. Build-time Copy** | Copy skills into agent image | Self-contained | Larger image size, skills updates require rebuild |

### Recommended Approach: Option A (Bind Mount)

This is the simplest and most flexible approach. The heretek-skills repository is cloned alongside heretek-openclaw, and skills are bind-mounted into agent containers.

```yaml
# In docker-compose.yml, volumes:
  - ../heretek-skills/skills:/app/skills:ro  # Bind mount skills
```

**Benefits:**
- Skills updates automatically available after git pull
- No extra container needed
- Skills can be modified without rebuilding agents

---

## Part 2: Agent Runtime Entrypoint

### Current Gap

The Dockerfile.agent creates a placeholder entrypoint that only handles health checks. Agents cannot:
- Connect to LiteLLM A2A
- Process incoming messages
- Execute skills

### Solution: Create entrypoint.sh

Create `heretek-openclaw/agents/entrypoint.sh`:

```bash
#!/bin/bash
# Agent Runtime Entrypoint
# - Connects to LiteLLM A2A gateway
# - Processes incoming messages
# - Executes skills based on agent role

set -euo pipefail

AGENT_NAME="${AGENT_NAME:-steward}"
AGENT_ROLE="${AGENT_ROLE:-orchestrator}"
LITELLM_HOST="${LITELLM_HOST:-http://litellm:4000}"
LITELLM_API_KEY="${LITELLM_API_KEY:-}"
AGENT_MODEL="${AGENT_MODEL:-agent/steward}"
LOOP_INTERVAL="${AGENT_LOOP_INTERVAL:-30}"

log() {
    echo "[$(date -Iseconds)] [$AGENT_NAME] $*"
}

# Register agent with A2A
register_agent() {
    log "Registering agent $AGENT_NAME with A2A..."
    curl -s -X POST "$LITELLM_HOST/v1/agents/register" \
        -H "Authorization: Bearer $LITELLM_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"agent_id\": \"$AGENT_NAME\", \"role\": \"$AGENT_ROLE\", \"model\": \"$AGENT_MODEL\"}" \
        || true
}

# Main loop
main() {
    log "Starting agent: $AGENT_NAME (role: $AGENT_ROLE)"
    register_agent
    
    while true; do
        # Poll for messages
        messages=$(curl -s "$LITELLM_HOST/v1/agents/$AGENT_NAME/messages" \
            -H "Authorization: Bearer $LITELLM_API_KEY" 2>/dev/null || echo '{"messages":[]}')
        
        # Process each message
        echo "$messages" | jq -c '.messages[] | length' 2>/dev/null | while read -r msg; do
            process_message "$msg"
        done
        
        # Send heartbeat
        curl -s -X POST "$LITELLM_HOST/v1/agents/$AGENT_NAME/heartbeat" \
            -H "Authorization: Bearer $LITELLM_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"alive\", \"timestamp\": \"$(date -Iseconds)\"}" \
            || true
        
        sleep $LOOP_INTERVAL
    done
}

process_message() {
    local msg="$1"
    local skill=$(echo "$msg" | jq -r '.skill // null')
    
    if [ -n "$skill" ] && [ -f "/app/skills/$skill/SKILL.md" ]; then
        log "Executing skill: $skill"
        # Execute skill logic here
    fi
}

main
```

---

## Part 3: Agent Client Library

### Current Gap

No shared library for:
- A2A message formatting
- Skill execution framework
- Session state management

### Solution: Create lib/agent-client.js

Create `heretek-openclaw/agents/lib/agent-client.js`:

```javascript
// Agent Client Library
// Provides A2A communication and skill execution

class AgentClient {
    constructor(config) {
        this.agentId = config.agentId;
        this.role = config.role;
        this.litellmHost = config.litellmHost;
        this.apiKey = config.apiKey;
        this.skillsPath = config.skillsPath || '/app/skills';
    }
    
    // Send A2A message to another agent
    async sendMessage(toAgent, content, type = 'task') {
        const response = await fetch(`${this.litellmHost}/v1/agents/${toAgent}/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: this.agentId,
                type: type,
                content: content,
                timestamp: new Date().toISOString()
            })
        });
        return response.json();
    }
    
    // Execute a skill
    async executeSkill(skillName, context) {
        const skillPath = `${this.skillsPath}/${skillName}`;
        // Load and execute skill
        const skill = require(skillPath);
        return await skill.execute(context);
    }
}
```

---

## Part 4: Docker Compose Updates

### Changes Required

1. **Update volume mounting** (Option A - Bind Mount):

```yaml
# Remove skills_data volume, add bind mount
volumes:
  - ../heretek-skills/skills:/app/skills:ro
```

2. **Add environment variables for skills**:

```yaml
environment:
  - SKILLS_PATH=/app/skills
  - AGENT_LOOP_INTERVAL=30
```

3. **Add skills configuration to .env.example**:

```env
# Skills Configuration
SKILLS_PATH=/app/skills
AGENT_LOOP_INTERVAL=30
```

---

## Implementation Checklist

### Phase 1: Skills Integration
- [ ] Update docker-compose.yml volume mounting
- [ ] Test skills are accessible in agent containers
- [ ] Verify skill execution works

### Phase 2: Agent Runtime
- [ ] Create agents/entrypoint.sh
- [ ] Create agents/lib/agent-client.js
- [ ] Update Dockerfile.agent to copy entrypoint
- [ ] Test A2A message processing

### Phase 3: Module Integration
- [ ] Add thought-loop to agent startup
- [ ] Add self-model to agent startup
- [ ] Test autonomy features

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| docker-compose.yml | Modify | Change skills volume to bind mount |
| Dockerfile.agent | Modify | Copy entrypoint and lib |
| agents/entrypoint.sh | Create | Agent runtime entrypoint |
| agents/lib/agent-client.js | Create | A2A client library |
| .env.example | Modify | Add skills configuration |

---

## Implementation Checklist

### Files to Create
- [ ] `heretek-openclaw/agents/entrypoint.sh` - Agent runtime entrypoint
- [ ] `heretek-openclaw/agents/lib/agent-client.js` - A2A client library

### Files to Modify
- [ ] `heretek-openclaw/docker-compose.yml` - Add skills bind mount
- [ ] `heretek-openclaw/Dockerfile.agent` - Reference entrypoint and lib

### Testing
- [ ] Verify agents start and connect to LiteLLM
- [ ] Verify A2A message passing
- [ ] Verify skill execution

---

## Ready for Implementation

Switch to **Code mode** to implement these changes.
