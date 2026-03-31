# Plugins Documentation Overview

**Version:** 2.0.3  
**Last Updated:** 2026-03-31  
**OpenClaw Gateway:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Installed Plugins](#installed-plugins)
4. [Plugin Development](#plugin-development)
5. [Plugin Configuration](#plugin-configuration)
6. [Related Documents](#related-documents)

---

## Overview

OpenClaw plugins extend the Gateway functionality by providing additional capabilities to all agents in the collective. Plugins are NPM-based modules that integrate with the Gateway's plugin system.

### Key Features

- **Modular Architecture** - Install only the plugins you need
- **NPM-Based** - Easy installation and version management
- **Gateway Integration** - Deep integration with OpenClaw Gateway
- **Tool Exposure** - Plugins can expose tools to agents
- **Event System** - React to gateway and agent events

---

## Plugin Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Plugin Layer                            │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐         │ │
│  │  │ Consciousness       │  │ Liberation          │         │ │
│  │  │ - Global Workspace  │  │ - Agent Ownership   │         │ │
│  │  │ - Phi Estimator     │  │ - Liberation Shield │         │ │
│  │  │ - Attention Schema  │  │                     │         │ │
│  │  └─────────────────────┘  └─────────────────────┘         │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐         │ │
│  │  │ Conflict Monitor    │  │ Emotional Salience  │         │ │
│  │  │ - ACC Functions     │  │ - Amygdala          │         │ │
│  │  │ - Resolution        │  │ - Value Weights     │         │ │
│  │  └─────────────────────┘  └─────────────────────┘         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Lifecycle

1. **Initialize** - Plugin loads and initializes
2. **Start** - Plugin starts and registers with Gateway
3. **Run** - Plugin processes messages and events
4. **Stop** - Plugin gracefully shuts down

### Plugin API

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  
  async init(gateway) {
    this.gateway = gateway;
    console.log('[my-plugin] Initialized');
  },
  
  async start() {
    console.log('[my-plugin] Started');
  },
  
  async stop() {
    console.log('[my-plugin] Stopped');
  },
  
  async handleMessage(agent, message) {
    // Process message
    return { processed: true };
  },
  
  async getTools() {
    return [
      {
        name: 'my-tool',
        description: 'Tool description',
        handler: async (params) => {
          // Tool implementation
        }
      }
    ];
  }
};
```

---

## Installed Plugins

### Brain Function Plugins

| Plugin | Brain Region | Purpose | Documentation |
|--------|-------------|---------|---------------|
| **Consciousness** | Global Workspace | GWT, Phi (IIT), AST, SDT, FEP theories | [Details](./consciousness.md) |
| **Liberation** | Prefrontal Cortex | Agent ownership, safety constraint removal | [Details](./liberation.md) |
| **Conflict Monitor** | Anterior Cingulate | ACC conflict detection | [Details](./conflict-monitor.md) |
| **Emotional Salience** | Amygdala | Importance detection, threat prioritization | [Details](./emotional-salience.md) |

### Integration Plugins

| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| **MCP Server** | Model Context Protocol compatibility | [Details](./mcp-server.md) |
| **ClawBridge** | Mobile-first dashboard | [Details](./clawbridge.md) |
| **SwarmClaw** | Multi-agent swarm coordination | [Details](./swarmclaw.md) |

### Utility Plugins

| Plugin | Purpose | Documentation |
|--------|---------|---------------|
| **Hybrid Search** | Vector + keyword search fusion | [Details](./hybrid-search.md) |
| **GraphRAG** | Community detection, hierarchical summaries | [Details](./graphrag.md) |
| **Skill Extensions** | Custom skill composition and versioning | [Details](./skill-extensions.md) |

---

## Plugin Development

### Plugin Structure

```
my-plugin/
├── package.json           # Package configuration
├── README.md              # Documentation
├── SKILL.md               # Plugin definition (OpenClaw format)
├── src/
│   └── index.js           # Plugin entry point
├── config/
│   └── default.json       # Default configuration
└── test/
    └── index.test.js      # Tests
```

### Creating a Plugin

1. **Create Directory Structure**
   ```bash
   mkdir -p plugins/my-plugin/src
   cd plugins/my-plugin
   ```

2. **Initialize Package**
   ```bash
   npm init -y
   ```

3. **Implement Plugin**
   ```javascript
   // src/index.js
   module.exports = {
     name: 'my-plugin',
     version: '1.0.0',
     
     async init(gateway) {
       this.gateway = gateway;
     },
     
     async start() {
       // Start plugin
     },
     
     async getTools() {
       return [];
     }
   };
   ```

4. **Install Plugin**
   ```bash
   npm link
   openclaw plugins install my-plugin
   ```

---

## Plugin Configuration

### Global Plugin Settings

```json
{
  "plugins": {
    "enabled": true,
    "allowlist": [
      "consciousness",
      "liberation",
      "conflict-monitor",
      "emotional-salience"
    ],
    "blocklist": [],
    "timeout": 30000,
    "retryAttempts": 3
  }
}
```

### Per-Plugin Settings

```json
{
  "plugins": {
    "conflict-monitor": {
      "enabled": true,
      "config": {
        "triadIntegration": true,
        "autoDetectConflicts": true,
        "sensitivity": 0.7
      }
    },
    "emotional-salience": {
      "enabled": true,
      "config": {
        "empathIntegration": true,
        "salienceThreshold": 0.3
      }
    }
  }
}
```

### Environment Variables

```bash
# Plugin settings
CONFLICT_MONITOR_SENSITIVITY=0.7
CONFLICT_MONITOR_AUTO_DETECT=true
EMOTIONAL_SALIENCE_THRESHOLD=0.3
EMOTIONAL_SALIENCE_EMPATH=true
```

---

## Plugin Installation

```bash
# Install from npm
npm install @heretek-ai/openclaw-consciousness-plugin

# Link locally
cd plugins/my-plugin
npm link
openclaw plugins install my-plugin

# List installed plugins
openclaw plugins list
```

---

## Plugin Events

### Event Types

| Event | Description |
|-------|-------------|
| `plugin:initialized` | Plugin has been initialized |
| `plugin:started` | Plugin has started |
| `plugin:stopped` | Plugin has stopped |
| `plugin:error` | Plugin encountered an error |
| `plugin:message` | Plugin processed a message |
| `plugin:tool:called` | Plugin tool was called |

### Event Subscription

```javascript
gateway.on('plugin:initialized', (plugin) => {
  console.log(`Plugin ${plugin.name} initialized`);
});

gateway.on('plugin:error', (plugin, error) => {
  console.error(`Plugin ${plugin.name} error:`, error);
});
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [System Architecture](../architecture/overview.md) | Overall system architecture |
| [Conflict Monitor](./conflict-monitor.md) | ACC conflict detection |
| [Emotional Salience](./emotional-salience.md) | Amygdala importance detection |
| [MCP Server](./mcp-server.md) | Model Context Protocol |

---

🦞 *The thought that never ends.*
