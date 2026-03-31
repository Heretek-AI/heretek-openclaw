# A2A (Agent-to-Agent) Protocol Specification

**Version:** 1.0.0  
**Status:** Standard  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28  
**Author:** Heretek OpenClaw Project  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Protocol Overview](#2-protocol-overview)
3. [Transport Layer](#3-transport-layer)
4. [Message Format](#4-message-format)
5. [Handshake Procedures](#5-handshake-procedures)
6. [Discovery Mechanisms](#6-discovery-mechanisms)
7. [Session Management](#7-session-management)
8. [Agent Registry](#8-agent-registry)
9. [Message Types](#9-message-types)
10. [Triad Deliberation Protocol](#10-triad-deliberation-protocol)
11. [Reference Implementation](#11-reference-implementation)
12. [Compatibility with Other Protocols](#12-compatibility-with-other-protocols)
13. [Security Considerations](#13-security-considerations)
14. [Appendix A: Message Type Registry](#appendix-a-message-type-registry)
15. [Appendix B: Error Codes](#appendix-b-error-codes)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the Agent-to-Agent (A2A) Protocol used in Heretek OpenClaw for inter-agent communication. The protocol enables real-time, decoupled message passing between specialized AI agents within a unified runtime environment.

### 1.2 Scope

The A2A Protocol defines:
- Message envelope formats and encoding
- Transport layer specifications (WebSocket RPC)
- Handshake and connection procedures
- Agent discovery mechanisms
- Session management protocols
- Standard message types and semantics
- Error handling and recovery procedures

### 1.3 Terminology

| Term | Definition |
|------|------------|
| **A2A** | Agent-to-Agent communication |
| **Gateway** | OpenClaw Gateway - central message broker and runtime |
| **Agent** | An autonomous AI entity within the OpenClaw system |
| **Workspace** | Isolated environment for agent execution and session storage |
| **Session** | A persistent conversation context between agents |
| **Triad** | A consensus group of three agents (Alpha, Beta, Charlie) |
| **JSONL** | JSON Lines - newline-delimited JSON format |

### 1.4 Conformance

Implementations claiming conformance to this specification MUST:
- Support all required message types defined in Section 9
- Implement the WebSocket transport as specified in Section 3
- Follow the message format defined in Section 4
- Support the handshake procedures in Section 5

---

## 2. Protocol Overview

### 2.1 Architecture

The A2A Protocol follows a hub-and-spoke architecture with OpenClaw Gateway as the central broker:

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         OpenClaw Gateway                │
│         (Port 18789)                    │
└──────┬──────────────────────────────────┘
       │
       ├─────────┬─────────┬──────────┐
       ▼         ▼         ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│ Steward  │ │ Alpha  │ │ Beta   │ │ Charlie  │
└──────────┘ └────────┘ └────────┘ └──────────┘
```

### 2.2 Design Principles

1. **Unified Runtime** - All agents operate within a single Gateway process
2. **Session Isolation** - Per-workspace JSONL session storage
3. **Real-time Communication** - WebSocket-based bidirectional messaging
4. **Decoupled Architecture** - Agents communicate through the Gateway, not directly
5. **Extensibility** - Plugin system for extended functionality

### 2.3 Protocol Layers

| Layer | Responsibility |
|-------|----------------|
| **Transport** | WebSocket connection management |
| **Message** | Envelope formatting and encoding |
| **Session** | Conversation context and persistence |
| **Application** | Agent-specific message semantics |

---

## 3. Transport Layer

### 3.1 Connection Endpoint

The Gateway WebSocket endpoint:

```
ws://127.0.0.1:18789
```

### 3.2 Connection Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `protocol` | string | No | `a2a-v1` | Subprotocol identifier |
| `timeout` | number | No | `30000` | Connection timeout (ms) |
| `heartbeat` | number | No | `30000` | Heartbeat interval (ms) |

### 3.3 Connection States

| State | Code | Description |
|-------|------|-------------|
| `CONNECTING` | 0 | Connection initiated |
| `OPEN` | 1 | Connection established |
| `CLOSING` | 2 | Connection closing |
| `CLOSED` | 3 | Connection closed |

### 3.4 WebSocket Subprotocol

Clients SHOULD specify the subprotocol during handshake:

```javascript
const ws = new WebSocket('ws://127.0.0.1:18789', ['a2a-v1']);
```

### 3.5 Connection Lifecycle

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ CLOSED  │───>│CONNECTING│───>│  OPEN   │───>│ CLOSING │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     ▲                              │              │
     │                              │              │
     └──────────────────────────────┴──────────────┘
```

---

## 4. Message Format

### 4.1 Envelope Structure

All A2A messages follow a standardized envelope format:

```typescript
interface A2AMessage {
  // Required fields
  type: MessageType;           // Message type (Section 9)
  content: MessageContent;     // Message payload
  
  // Optional fields
  id?: string;                 // Unique message identifier (UUID)
  agent?: string;              // Target agent name
  from?: string;               // Source agent name
  sessionId?: string;          // Session identifier
  timestamp?: number;          // Unix timestamp (milliseconds)
  metadata?: MessageMetadata;  // Additional metadata
}
```

### 4.2 Message Content

```typescript
interface MessageContent {
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string | object;
}
```

### 4.3 Message Metadata

```typescript
interface MessageMetadata {
  priority?: 'low' | 'normal' | 'high' | 'critical';
  requiresResponse?: boolean;
  threadId?: string;
  parentId?: string;
  ttl?: number;              // Time-to-live in seconds
  correlationId?: string;    // For request/response correlation
}
```

### 4.4 Example Message

```json
{
  "id": "msg-550e8400-e29b-41d4-a716-446655440000",
  "type": "message",
  "from": "steward",
  "agent": "alpha",
  "sessionId": "sess-12345",
  "content": {
    "role": "agent",
    "content": "Proposal received: Implement feature X"
  },
  "timestamp": 1711843200000,
  "metadata": {
    "priority": "normal",
    "requiresResponse": true,
    "threadId": "thread-abc",
    "correlationId": "corr-xyz"
  }
}
```

### 4.5 Message Validation

Messages MUST be valid UTF-8 encoded JSON. Invalid messages SHOULD be rejected with an error response.

---

## 5. Handshake Procedures

### 5.1 Connection Establishment

1. Client initiates WebSocket connection to Gateway
2. Gateway accepts connection and assigns client ID
3. Client optionally sends capability advertisement
4. Gateway acknowledges and connection is ready

### 5.2 Capability Advertisement (Optional)

After connection, clients MAY advertise capabilities:

```json
{
  "type": "handshake",
  "content": {
    "action": "advertise",
    "capabilities": {
      "supportedMessageTypes": ["message", "status", "error"],
      "supportedAgents": ["steward", "alpha", "beta"],
      "version": "1.0.0"
    }
  }
}
```

### 5.3 Gateway Response

Gateway responds with acknowledgment:

```json
{
  "type": "handshake",
  "content": {
    "action": "acknowledge",
    "clientId": "client-uuid",
    "availableAgents": ["steward", "alpha", "beta", "charlie"],
    "protocolVersion": "1.0.0"
  }
}
```

### 5.4 Authentication (Optional)

For secured deployments, authentication MAY be required:

```json
{
  "type": "auth",
  "content": {
    "token": "<JWT-or-API-key>"
  }
}
```

### 5.5 Connection Termination

Either party MAY terminate the connection:

```json
{
  "type": "disconnect",
  "content": {
    "reason": "shutdown" | "timeout" | "error" | "manual",
    "message": "Optional explanation"
  }
}
```

---

## 6. Discovery Mechanisms

### 6.1 Agent Discovery

Agents are discovered through the Gateway registry:

```json
{
  "type": "discovery",
  "content": {
    "action": "list"
  }
}
```

Response:

```json
{
  "type": "discovery",
  "content": {
    "agents": [
      {
        "name": "steward",
        "role": "orchestrator",
        "status": "online",
        "workspace": "~/.openclaw/agents/steward"
      },
      {
        "name": "alpha",
        "role": "triad-member",
        "status": "online",
        "workspace": "~/.openclaw/agents/alpha"
      }
    ]
  }
}
```

### 6.2 Agent Status Subscription

Clients MAY subscribe to agent status updates:

```json
{
  "type": "subscribe",
  "content": {
    "channel": "agent:status",
    "agents": ["steward", "alpha"]
  }
}
```

### 6.3 Workspace Discovery

Workspaces can be discovered and queried:

```json
{
  "type": "workspace",
  "content": {
    "action": "list"
  }
}
```

### 6.4 Service Discovery

For external service integration:

```typescript
interface ServiceDiscovery {
  serviceId: string;
  endpoint: string;
  capabilities: string[];
  healthEndpoint?: string;
}
```

---

## 7. Session Management

### 7.1 Session Storage

Sessions are stored as JSONL files:

```
~/.openclaw/agents/{agent-name}/session.jsonl
```

### 7.2 Session Entry Format

```jsonl
{"timestamp": 1711843200000, "role": "user", "content": "Hello!", "sessionId": "sess-123", "id": "msg-001"}
{"timestamp": 1711843201000, "role": "assistant", "content": "Hi there!", "sessionId": "sess-123", "id": "msg-002"}
```

### 7.3 Session Lifecycle

| Operation | Command | Description |
|-----------|---------|-------------|
| Create | `openclaw session create {agent}` | Initialize new session |
| List | `openclaw session list` | List active sessions |
| Get | `openclaw session get {agent} {sessionId}` | Retrieve session data |
| Commit | `openclaw session commit {agent} {sessionId}` | Persist session |
| Archive | `openclaw session archive {agent} --older-than 7d` | Archive old sessions |
| Delete | `openclaw session delete {agent} {sessionId}` | Remove session |

### 7.4 Session Persistence

Sessions are automatically persisted on:
- Message receipt
- Session commit command
- Agent shutdown (graceful)

### 7.5 Session Isolation

Each workspace maintains isolated sessions. Cross-workspace session sharing requires explicit export/import.

---

## 8. Agent Registry

### 8.1 Available Agents

| Agent | Role | Workspace Path | Status |
|-------|------|----------------|--------|
| `main` | Default agent | `~/.openclaw/agents/main` | Active |
| `steward` | Orchestrator | `~/.openclaw/agents/steward` | Active |
| `alpha` | Triad member | `~/.openclaw/agents/alpha` | Active |
| `beta` | Triad member | `~/.openclaw/agents/beta` | Active |
| `charlie` | Triad member | `~/.openclaw/agents/charlie` | Active |
| `examiner` | Evaluator | `~/.openclaw/agents/examiner` | Active |
| `explorer` | Researcher | `~/.openclaw/agents/explorer` | Active |
| `sentinel` | Safety | `~/.openclaw/agents/sentinel` | Active |
| `coder` | Developer | `~/.openclaw/agents/coder` | Active |
| `dreamer` | Creative | `~/.openclaw/agents/dreamer` | Active |
| `empath` | Emotional | `~/.openclaw/agents/empath` | Active |
| `historian` | Historical | `~/.openclaw/agents/historian` | Active |

### 8.2 Agent Status States

| Status | Description |
|--------|-------------|
| `online` | Agent is running and accepting messages |
| `offline` | Agent is not running |
| `busy` | Agent is processing a task |
| `idle` | Agent is available but not processing |
| `error` | Agent encountered an error |

### 8.3 Agent Commands

```bash
# List all agents
openclaw agent list

# Get agent status
openclaw agent status {agent-name}

# Get agent configuration
openclaw agent config {agent-name} get

# Restart agent
openclaw agent restart {agent-name}
```

---

## 9. Message Types

### 9.1 Standard Message Types

| Type | Code | Description | Required Fields |
|------|------|-------------|-----------------|
| `message` | 0x01 | Standard agent message | `content`, `agent` |
| `status` | 0x02 | Agent status update | `content` |
| `error` | 0x03 | Error notification | `content`, `error` |
| `event` | 0x04 | Gateway event | `content`, `event` |
| `handshake` | 0x10 | Connection handshake | `content.action` |
| `discovery` | 0x11 | Agent/service discovery | `content.action` |
| `subscribe` | 0x12 | Channel subscription | `content.channel` |
| `unsubscribe` | 0x13 | Channel unsubscription | `content.channel` |
| `auth` | 0x20 | Authentication | `content.token` |
| `disconnect` | 0x21 | Connection termination | `content.reason` |

### 9.2 Application-Specific Message Types

| Type | Code | Description |
|------|------|-------------|
| `proposal` | 0x30 | Triad proposal |
| `decision` | 0x31 | Triad decision |
| `vote` | 0x32 | Triad vote |
| `request` | 0x33 | Service request |
| `response` | 0x34 | Service response |
| `broadcast` | 0x35 | Multi-agent broadcast |

---

## 10. Triad Deliberation Protocol

### 10.1 Overview

The Triad Protocol enables consensus-based decision making among three agents (Alpha, Beta, Charlie).

### 10.2 Message Flow

```
┌──────────────┐     ┌─────────────────────────────────────────┐     ┌──────────────┐
│   Client     │────>│         OpenClaw Gateway                │────>│   Steward    │
│              │     │         (Port 18789)                    │     │              │
└──────────────┘     └─────────────────────────────────────────┘     └──────────────┘
                            │              │              │
                            │              │              │
                            ▼              ▼              ▼
                     ┌────────────┐ ┌────────────┐ ┌────────────┐
                     │   Alpha    │ │    Beta    │ │  Charlie   │
                     │  (Vote)    │ │  (Vote)    │ │  (Vote)    │
                     └──────���─────┘ └────────────┘ └────────────┘
```

### 10.3 Proposal Message

```json
{
  "type": "proposal",
  "from": "steward",
  "content": {
    "proposal": "Implement new feature X",
    "reasoning": "User request analysis indicates need",
    "deadline": 1711843200000
  },
  "metadata": {
    "requiresResponse": true,
    "correlationId": "prop-001"
  }
}
```

### 10.4 Vote Message

```json
{
  "type": "vote",
  "from": "alpha",
  "content": {
    "proposalId": "prop-001",
    "vote": "approve" | "reject" | "abstain",
    "reasoning": "Feature aligns with roadmap"
  },
  "metadata": {
    "correlationId": "prop-001"
  }
}
```

### 10.5 Decision Message

```json
{
  "type": "decision",
  "from": "gateway",
  "content": {
    "proposalId": "prop-001",
    "result": "approved" | "rejected",
    "votes": {
      "alpha": "approve",
      "beta": "approve",
      "charlie": "abstain"
    },
    "consensus": true
  }
}
```

### 10.6 Consensus Rules

| Votes | Result |
|-------|--------|
| 3-0 | Approved |
| 2-1 | Approved |
| 2-0-1 | Approved |
| 1-2 | Rejected |
| 0-3 | Rejected |
| 1-1-1 | Rejected (no consensus) |

---

## 11. Reference Implementation

### 11.1 Client Connection Example

```javascript
const WebSocket = require('ws');

class A2AClient {
  constructor(gatewayUrl = 'ws://127.0.0.1:18789') {
    this.gatewayUrl = gatewayUrl;
    this.ws = null;
    this.messageHandlers = new Map();
    this.clientId = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.gatewayUrl, ['a2a-v1']);
      
      this.ws.on('open', () => {
        console.log('Connected to Gateway');
        this.sendHandshake().then(resolve).catch(reject);
      });
      
      this.ws.on('error', reject);
      this.ws.on('message', (data) => this.handleMessage(JSON.parse(data)));
    });
  }

  async sendHandshake() {
    return new Promise((resolve) => {
      const handler = (message) => {
        if (message.type === 'handshake' && message.content.action === 'acknowledge') {
          this.clientId = message.content.clientId;
          this.off('handshake', handler);
          resolve(message);
        }
      };
      this.on('handshake', handler);
      
      this.send({
        type: 'handshake',
        content: {
          action: 'advertise',
          capabilities: {
            supportedMessageTypes: ['message', 'status', 'error'],
            version: '1.0.0'
          }
        }
      });
    });
  }

  send(message) {
    if (!message.id) {
      message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }
    this.ws.send(JSON.stringify(message));
  }

  async sendMessage(agent, content, metadata = {}) {
    return new Promise((resolve) => {
      const correlationId = `corr-${Date.now()}`;
      
      const handler = (message) => {
        if (message.metadata?.correlationId === correlationId) {
          this.off('message', handler);
          resolve(message);
        }
      };
      this.on('message', handler);
      
      this.send({
        type: 'message',
        agent: agent,
        content: content,
        metadata: {
          ...metadata,
          requiresResponse: true,
          correlationId: correlationId
        }
      });
    });
  }

  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  handleMessage(message) {
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));
  }

  disconnect() {
    if (this.ws) {
      this.send({
        type: 'disconnect',
        content: { reason: 'manual' }
      });
      this.ws.close();
    }
  }
}

// Usage example
async function main() {
  const client = new A2AClient();
  await client.connect();
  
  const response = await client.sendMessage('steward', {
    role: 'user',
    content: 'What is the current status of the collective?'
  });
  
  console.log('Response:', response);
  client.disconnect();
}

main().catch(console.error);
```

### 11.2 Gateway Server Example

```javascript
const WebSocket = require('ws');

class A2AGateway {
  constructor(port = 18789) {
    this.port = port;
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map();
    this.agents = new Map();
    this.sessions = new Map();
    
    this.initialize();
  }

  initialize() {
    this.wss.on('connection', (ws) => this.handleConnection(ws));
    console.log(`Gateway listening on ws://127.0.0.1:${this.port}`);
  }

  handleConnection(ws) {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.clients.set(clientId, ws);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.routeMessage(clientId, message);
      } catch (error) {
        this.sendError(ws, 'INVALID_JSON', error.message);
      }
    });
    
    ws.on('close', () => {
      this.clients.delete(clientId);
    });
  }

  routeMessage(clientId, message) {
    switch (message.type) {
      case 'handshake':
        this.handleHandshake(clientId, message);
        break;
      case 'message':
        this.handleAgentMessage(clientId, message);
        break;
      case 'discovery':
        this.handleDiscovery(clientId, message);
        break;
      case 'subscribe':
        this.handleSubscribe(clientId, message);
        break;
      default:
        this.sendError(this.clients.get(clientId), 'UNKNOWN_TYPE', `Unknown message type: ${message.type}`);
    }
  }

  handleHandshake(clientId, message) {
    const ws = this.clients.get(clientId);
    const response = {
      type: 'handshake',
      content: {
        action: 'acknowledge',
        clientId: clientId,
        availableAgents: Array.from(this.agents.keys()),
        protocolVersion: '1.0.0'
      }
    };
    ws.send(JSON.stringify(response));
  }

  handleAgentMessage(clientId, message) {
    const targetAgent = message.agent;
    if (!targetAgent || !this.agents.has(targetAgent)) {
      this.sendError(this.clients.get(clientId), 'AGENT_NOT_FOUND', `Agent not found: ${targetAgent}`);
      return;
    }
    
    // Route to appropriate agent handler
    const agentHandler = this.agents.get(targetAgent);
    agentHandler.process(message);
  }

  handleDiscovery(clientId, message) {
    const ws = this.clients.get(clientId);
    const response = {
      type: 'discovery',
      content: {
        agents: Array.from(this.agents.entries()).map(([name, handler]) => ({
          name,
          role: handler.role,
          status: handler.status,
          workspace: handler.workspace
        }))
      }
    };
    ws.send(JSON.stringify(response));
  }

  handleSubscribe(clientId, message) {
    const ws = this.clients.get(clientId);
    // Implement subscription logic
    ws.send(JSON.stringify({
      type: 'subscribe',
      content: {
        channel: message.content.channel,
        status: 'subscribed'
      }
    }));
  }

  sendError(ws, code, message) {
    ws.send(JSON.stringify({
      type: 'error',
      content: {
        error: code,
        message: message
      }
    }));
  }
}

// Start gateway
const gateway = new A2AGateway(18789);
```

### 11.3 Triad Vote Implementation

```javascript
class TriadVoter {
  constructor(agentName, gateway) {
    this.agentName = agentName;
    this.gateway = gateway;
    this.pendingProposals = new Map();
  }

  async vote(proposal) {
    const analysis = await this.analyze(proposal);
    
    return {
      type: 'vote',
      from: this.agentName,
      content: {
        proposalId: proposal.id,
        vote: analysis.decision,
        reasoning: analysis.reasoning,
        confidence: analysis.confidence
      },
      metadata: {
        correlationId: proposal.id
      }
    };
  }

  async analyze(proposal) {
    // Agent-specific analysis logic
    // This is a simplified example
    const reasoning = await this.generateReasoning(proposal);
    const confidence = this.calculateConfidence(reasoning);
    const decision = confidence > 0.5 ? 'approve' : 'reject';
    
    return { decision, reasoning, confidence };
  }

  async generateReasoning(proposal) {
    // Implementation depends on agent role
    return `Analysis of proposal: ${proposal.content.proposal}`;
  }

  calculateConfidence(reasoning) {
    // Simplified confidence calculation
    return Math.random();
  }
}

// Usage
const alpha = new TriadVoter('alpha', gateway);
const vote = await alpha.vote(proposalMessage);
```

---

## 12. Compatibility with Other Protocols

### 12.1 A2A Protocol (Google/Industry Standard)

The Heretek OpenClaw A2A Protocol shares conceptual similarities with the industry-standard A2A Protocol but differs in implementation:

| Aspect | Heretek A2A | Industry A2A |
|--------|-------------|--------------|
| Transport | WebSocket RPC | HTTP/gRPC |
| Discovery | Gateway registry | DNS/Service mesh |
| Session | JSONL files | Database |
| Authentication | Optional JWT | OAuth2/OIDC |

**Interoperability Notes:**
- Message formats can be translated via adapters
- Gateway can act as a bridge to external A2A networks
- Semantic compatibility exists for basic message types

### 12.2 Agent Protocol (Agent Protocol Foundation)

The Agent Protocol focuses on agent-task interaction rather than agent-to-agent communication:

| Aspect | Heretek A2A | Agent Protocol |
|--------|-------------|----------------|
| Focus | Inter-agent messaging | Task execution |
| Transport | WebSocket | REST API |
| State | Session-based | Task-based |
| Scope | Internal collective | External integration |

**Integration Points:**
- Heretek Gateway can expose Agent Protocol-compatible endpoints
- Task definitions can be translated to A2A messages
- Session data can be exported in Agent Protocol format

### 12.3 FIPA ACL (Foundation for Intelligent Physical Agents)

FIPA ACL is a legacy agent communication standard:

| Aspect | Heretek A2A | FIPA ACL |
|--------|-------------|----------|
| Transport | WebSocket | IIOP/HTTP |
| Message Format | JSON | ACL-encoded |
| Ontology | Custom | FIPA-specified |
| Scope | AI collective | Multi-agent systems |

**Mapping Table:**

| FIPA Performative | Heretek Message Type |
|-------------------|---------------------|
| `inform` | `message` |
| `request` | `request` |
| `agree` | `response` (vote: approve) |
| `refuse` | `response` (vote: reject) |
| `propose` | `proposal` |
| `accept-proposal` | `decision` (approved) |
| `reject-proposal` | `decision` (rejected) |

### 12.4 Protocol Adapter Pattern

For interoperability, implement adapters:

```javascript
class ProtocolAdapter {
  // Convert Heretek A2A to FIPA ACL
  static toFIPA(message) {
    return {
      performative: this.mapPerformative(message.type),
      sender: message.from,
      receiver: message.agent,
      content: message.content,
      language: 'json',
      ontology: 'heretek-v1'
    };
  }

  // Convert FIPA ACL to Heretek A2A
  static fromFIPA(aclMessage) {
    return {
      type: this.mapType(aclMessage.performative),
      from: aclMessage.sender,
      agent: aclMessage.receiver,
      content: aclMessage.content,
      timestamp: Date.now()
    };
  }

  static mapPerformative(type) {
    const mapping = {
      'message': 'inform',
      'request': 'request',
      'proposal': 'propose',
      'decision': 'accept-proposal'
    };
    return mapping[type] || 'inform';
  }

  static mapType(performative) {
    const mapping = {
      'inform': 'message',
      'request': 'request',
      'propose': 'proposal',
      'accept-proposal': 'decision'
    };
    return mapping[performative] || 'message';
  }
}
```

---

## 13. Security Considerations

### 13.1 Authentication

- JWT-based authentication for secured deployments
- API key authentication for service accounts
- Mutual TLS for Gateway-to-Gateway communication

### 13.2 Authorization

- Role-based access control (RBAC) for agent operations
- Per-agent permission policies
- Workspace isolation enforcement

### 13.3 Message Security

- Message signing for integrity verification
- Encryption at rest for session data
- Transport encryption via WSS (WebSocket Secure)

### 13.4 Audit Logging

All messages SHOULD be logged for audit purposes:
- Message ID and timestamp
- Source and destination agents
- Message type (not content for privacy)
- Processing outcome

### 13.5 Rate Limiting

Gateway SHOULD implement rate limiting:
- Per-client message rate limits
- Burst protection
- Graceful degradation under load

---

## Appendix A: Message Type Registry

### A.1 Core Message Types (0x00-0x0F)

| Code | Type | Description |
|------|------|-------------|
| 0x00 | Reserved | Reserved for future use |
| 0x01 | message | Standard agent message |
| 0x02 | status | Agent status update |
| 0x03 | error | Error notification |
| 0x04 | event | Gateway event |
| 0x05-0x0F | Reserved | Reserved for future core types |

### A.2 Control Message Types (0x10-0x1F)

| Code | Type | Description |
|------|------|-------------|
| 0x10 | handshake | Connection handshake |
| 0x11 | discovery | Agent/service discovery |
| 0x12 | subscribe | Channel subscription |
| 0x13 | unsubscribe | Channel unsubscription |
| 0x14 | ping | Keep-alive ping |
| 0x15 | pong | Keep-alive response |
| 0x16-0x1F | Reserved | Reserved for future control types |

### A.3 Authentication Message Types (0x20-0x2F)

| Code | Type | Description |
|------|------|-------------|
| 0x20 | auth | Authentication request |
| 0x21 | auth-response | Authentication response |
| 0x22 | disconnect | Connection termination |
| 0x23-0x2F | Reserved | Reserved for future auth types |

### A.4 Application Message Types (0x30-0x4F)

| Code | Type | Description |
|------|------|-------------|
| 0x30 | proposal | Triad proposal |
| 0x31 | decision | Triad decision |
| 0x32 | vote | Triad vote |
| 0x33 | request | Service request |
| 0x34 | response | Service response |
| 0x35 | broadcast | Multi-agent broadcast |
| 0x36-0x4F | Reserved | Reserved for future application types |

---

## Appendix B: Error Codes

### B.1 Connection Errors (1xxx)

| Code | Error | Description |
|------|-------|-------------|
| 1001 | CONNECTION_REFUSED | Gateway rejected connection |
| 1002 | CONNECTION_TIMEOUT | Connection timed out |
| 1003 | CONNECTION_RESET | Connection was reset |
| 1004 | PROTOCOL_ERROR | Protocol violation detected |

### B.2 Message Errors (2xxx)

| Code | Error | Description |
|------|-------|-------------|
| 2001 | INVALID_JSON | Message is not valid JSON |
| 2002 | MISSING_FIELD | Required field is missing |
| 2003 | INVALID_TYPE | Field has invalid type |
| 2004 | UNKNOWN_TYPE | Unknown message type |
| 2005 | INVALID_CONTENT | Message content is invalid |

### B.3 Agent Errors (3xxx)

| Code | Error | Description |
|------|-------|-------------|
| 3001 | AGENT_NOT_FOUND | Target agent does not exist |
| 3002 | AGENT_OFFLINE | Target agent is offline |
| 3003 | AGENT_BUSY | Agent is busy processing |
| 3004 | AGENT_ERROR | Agent encountered an error |

### B.4 Session Errors (4xxx)

| Code | Error | Description |
|------|-------|-------------|
| 4001 | SESSION_NOT_FOUND | Session does not exist |
| 4002 | SESSION_EXPIRED | Session has expired |
| 4003 | SESSION_LOCKED | Session is locked by another process |
| 4004 | SESSION_CORRUPT | Session data is corrupted |

### B.5 Authentication Errors (5xxx)

| Code | Error | Description |
|------|-------|-------------|
| 5001 | AUTH_REQUIRED | Authentication required |
| 5002 | AUTH_FAILED | Authentication failed |
| 5003 | TOKEN_EXPIRED | Authentication token expired |
| 5004 | PERMISSION_DENIED | Insufficient permissions |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-31 | Heretek OpenClaw | Initial specification |

---

## References

- [Gateway Architecture](../architecture/GATEWAY_ARCHITECTURE.md)
- [A2A Architecture](../architecture/A2A_ARCHITECTURE.md)
- [WebSocket API](../api/WEBSOCKET_API.md)
- [Local Deployment Guide](../deployment/LOCAL_DEPLOYMENT.md)
- [FIPA ACL Specification](https://www.fipa.org/specs/fipa00061/)
- [Agent Protocol Foundation](https://agentprotocol.ai/)

---

🦞 *The thought that never ends.*
