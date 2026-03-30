# A2A Communication Test Results

**Date:** 2026-03-30  
**Test Duration:** ~5 minutes  
**Environment:** Docker Compose with 11 agents + LiteLLM + Redis + PostgreSQL

---

## Executive Summary

✅ **A2A communication is partially working**  
The infrastructure is in place, but active message consumption is not happening due to the shell-based agent design.

---

## Test Results by Component

### 1. A2A Gateway (agent-client.js)

**Status:** ✅ Functional

| Test | Result | Notes |
|------|--------|-------|
| 500ms timeout | ✅ Pass | A2A timeout correctly configured at 500ms |
| Redis fallback | ✅ Pass | Falls back to Redis when A2A fails (LiteLLM doesn't support A2A endpoints) |
| Agent discovery | ⚠️ Partial | Returns empty array from A2A, falls back to local registry (working as designed) |
| Message queue | ✅ Pass | Messages are queued in Redis successfully |

**Configuration Verified:**
```
A2A Timeout: 500 ms
Redis URL: redis://heretek-redis:6379
Discovery Cache TTL: 300000ms (5 minutes)
```

**Issue:** `discoverAgents()` returns empty array from LiteLLM (expected since A2A isn't implemented in LiteLLM), then falls back to local registry correctly.

---

### 2. Redis Pub/Sub for Agent Messaging

**Status:** ✅ Functional

| Test | Result | Notes |
|------|--------|-------|
| Redis connection | ✅ Pass | PONG response received |
| Publish to a2a:alpha | ✅ Pass | 0 subscribers (no active listeners) |
| Message storage | ✅ Pass | Messages stored in `agent:{name}:messages` Redis lists |
| A2A channels | ✅ Pass | `a2a:alpha`, `a2a:steward` etc. working |

**Redis Keys Found:**
```
agent:examiner:messages
agent:charlie:messages
agent:empath:messages
agent:beta:messages
agent:dreamer:messages
agent:historian:messages
agent:steward:messages
agent:alpha:messages
agent:sentinel:messages
agent:explorer:messages
```

**Issue:** No active pub/sub subscribers (pubsub_clients: 0). Agents are not actively listening to Redis channels for incoming messages.

---

### 3. Global Workspace Broadcast

**Status:** ✅ Functional

| Test | Result | Notes |
|------|--------|-------|
| Module initialization | ✅ Pass | GlobalWorkspace module loads correctly |
| Redis connection | ✅ Pass | Connected to `heretek-redis:6379` |
| Competition mechanism | ✅ Pass | Submissions compete at 0.7 threshold, winner broadcasts |
| Remote broadcast subscription | ✅ Pass | Subscribed to `global-workspace:broadcast` |
| Module registration | ✅ Pass | Modules receive broadcast callbacks |

**Test Output:**
```
Winner: test Priority: 0.85
Stats: {
  "workspaceSize": 1,
  "maxWorkspaceSize": 7,
  "competitorsPending": 0,
  "totalBroadcasts": 1,
  "redisAvailable": true,
  "containerId": "19393c79dbb1"
}
```

**Configuration:**
```javascript
{
  ignitionThreshold: 0.7,
  maxWorkspaceSize: 7,
  competitionCycleMs: 1000,
  broadcastHistorySize: 1000
}
```

---

### 4. Channel Manager Communication

**Status:** ✅ Functional

| Test | Result | Notes |
|------|--------|-------|
| Redis connection | ✅ Pass | Connected successfully |
| Channel patterns | ✅ Pass | Subscribed to 5 channel patterns |
| Auto-subscription | ✅ Pass | Agents auto-subscribed based on role |
| Publish to channel | ✅ Pass | Message published with ID generated |

**Channels Configured:**
| Channel | Subscribers | Count |
|---------|-------------|-------|
| global | * (wildcard) | 0 |
| triad | alpha, beta, charlie | 3 |
| governance | steward, examiner, sentinel | 3 |
| explorer | explorer, historian, dreamer | 3 |
| sentinel | sentinel, security | 2 |

**Test Output:**
```
Published message: msg_1774878238046_m1sglbj7g
[ChannelManager] Message published to global by test-agent
```

---

## Identified Issues

### Issue 1: No Active Message Consumers (CRITICAL)

**Problem:** Redis pub/sub returns 0 subscribers. Agents are not actively listening to messages.

**Root Cause:** The agent containers run `entrypoint.sh` (bash script) which:
1. Polls LiteLLM for messages every 30 seconds via HTTP
2. Does NOT subscribe to Redis pub/sub channels
3. Stores received messages in Redis lists, but doesn't actively consume them

**Evidence:**
```
pubsub_clients:0  (from Redis INFO clients)
PUBSUB NUMSUB returns 0 for all channels
```

**Fix Recommendation:**
Modify `entrypoint.sh` to include a Redis subscriber that actively listens for A2A messages:

```bash
# Add to entrypoint.sh after agent registration
# Start Redis subscriber for A2A messages
start_redis_subscriber() {
    while true; do
        redis-cli --csv subscribe "a2a:$AGENT_NAME" "global-workspace:broadcast" "channel:*" 2>/dev/null | \
        while IFS=, read -r channel message; do
            if [ "$channel" = "\"a2a:$AGENT_NAME\"" ]; then
                process_a2a_message "$message"
            fi
        done
    done &
}
```

Alternatively, implement a Node.js wrapper that uses `agent-client.js` with proper Redis subscriptions.

---

### Issue 2: LiteLLM A2A Endpoints Not Supported

**Problem:** HTTP 405 returned for `/v1/agents/register` and `/v1/agents/{name}/send`

**Root Cause:** LiteLLM is a proxy service, not an A2A implementation. It doesn't have native agent-to-agent communication endpoints.

**Current Behavior:** `A2AClient` correctly falls back to Redis when LiteLLM endpoints fail.

**Fix Recommendation:**
The architecture is correct - A2A should use Redis as the primary transport. The fallback mechanism is working as designed.

---

### Issue 3: Agent Discovery Returns Empty Array

**Problem:** `discoverAgents()` returns empty array from LiteLLM

**Root Cause:** LiteLLM doesn't implement `/v1/agents` endpoint

**Current Behavior:** Falls back to local hardcoded agent registry in `agent-client.js`

**Fix Recommendation:**
Replace A2A discovery with direct Redis-based agent registration:
1. Agents register their presence in Redis on startup
2. Discovery reads from Redis hash `agents:registry`
3. Add TTL to handle agent crashes

---

## Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| heretek-redis | ✅ Healthy | Connected, pub/sub available |
| heretek-litellm | ✅ Healthy | HTTP endpoints working |
| heretek-steward | ✅ Running | Shell-based polling active |
| heretek-alpha | ✅ Running | Shell-based polling active |
| heretek-beta | ✅ Running | Shell-based polling active |
| All 11 agents | ✅ Running | Health checks return 200 |

---

## Recommendations

### High Priority

1. **Implement Redis Subscriber in Agents**
   - Add active listener for `a2a:{agent-name}` channel
   - Parse and process incoming messages
   - Send acknowledgments back via response channel

2. **Use Redis Lists for Message Queuing (ALREADY IN USE)**
   - Messages are being stored in `agent:{name}:messages`
   - Currently only consumed by manual poll via LiteLLM
   - Should be consumed directly from Redis

### Medium Priority

3. **Upgrade to Node.js Agent Runtime**
   - Current bash-based agents can't use `ioredis` effectively
   - Node.js wrapper would enable full A2A capabilities
   - Would allow use of `global-workspace.js` and `channel-manager.js` directly

4. **Add Agent Registration to Redis**
   - Create `agents:registry` hash with agent info
   - Add heartbeat that updates TTL
   - Discovery reads from this hash

### Low Priority

5. **Add Message Encryption**
   - A2A messages currently in plain text
   - Add shared secret for inter-agent communication

6. **Implement Message Correlation IDs**
   - Track request/response pairs
   - Enable retry logic for failed messages

---

## Conclusion

The A2A communication infrastructure is **functionally complete**:
- ✅ Redis pub/sub is working
- ✅ Global Workspace broadcasts work
- ✅ Channel Manager works
- ✅ A2A Gateway with Redis fallback works
- ✅ Messages are stored in Redis

However, **active message consumption is not implemented** because the shell-based agents cannot maintain persistent Redis subscriptions. The infrastructure is ready for a Node.js-based agent runtime that can actively subscribe to Redis channels.

---

## Test Commands Used

```bash
# Redis connectivity
docker exec heretek-redis redis-cli PING

# List pub/sub channels
docker exec heretek-redis redis-cli PUBSUB CHANNELS

# Check subscribers
docker exec heretek-redis redis-cli PUBSUB NUMSUB a2a:steward

# List message queues
docker exec heretek-redis redis-cli KEYS "agent:*"

# View messages for an agent
docker exec heretek-redis redis-cli LRANGE "agent:steward:messages" 0 10

# Publish test message
docker exec heretek-redis redis-cli PUBLISH "a2a:alpha" '{"from":"test","content":"hello"}'
```

---

**Test Completed By:** Code Mode Agent  
**Next Action:** Implement Redis subscriber in agent containers OR upgrade to Node.js runtime