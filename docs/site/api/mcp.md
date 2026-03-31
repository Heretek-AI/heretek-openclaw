# MCP Server Reference

**Package:** `@heretek-ai/openclaw-mcp-server`  
**Version:** 1.0.0  
**Protocol:** Model Context Protocol (MCP)

---

## Table of Contents

1. [Overview](#overview)
2. [Connection](#connection)
3. [Resources](#resources)
4. [Tools](#tools)
5. [Prompts](#prompts)
6. [Examples](#examples)
7. [Related Documents](#related-documents)

---

## Overview

The OpenClaw MCP Server provides standardized access to Heretek OpenClaw capabilities through the Model Context Protocol (MCP).

### Capabilities

- **Resources** - Access to memory, knowledge, and skills
- **Tools** - Skill execution and memory operations
- **Prompts** - Templated agent interactions

---

## Connection

### Transport Options

| Transport | Use Case | Command |
|-----------|----------|---------|
| **stdio** | Local processes | `npx openclaw-mcp-server` |
| **SSE** | Remote connections | HTTP SSE endpoint |

### Connection Example (stdio)

```javascript
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['openclaw-mcp-server'],
});

const client = new Client({
  name: 'my-agent',
  version: '1.0.0',
});

await client.connect(transport);
```

---

## Resources

### Memory Resources

| URI | Description |
|-----|-------------|
| `memory://episodic/list` | List all episodic memories |
| `memory://episodic/{id}` | Get specific episodic memory |
| `memory://semantic/list` | List all semantic schemas |
| `memory://semantic/{schemaId}` | Get specific semantic schema |
| `memory://session/list` | List all agent sessions |
| `memory://session/{agentId}` | Get agent session memory |
| `memory://swarm/stats` | Get swarm memory statistics |

### Knowledge Resources

| URI | Description |
|-----|-------------|
| `knowledge://docs/list` | List all documents |
| `knowledge://docs/{path}` | Get specific document |
| `knowledge://schemas/list` | List knowledge schemas |
| `knowledge://schemas/{id}` | Get specific schema |
| `knowledge://graph/stats` | Get knowledge graph statistics |
| `knowledge://ingest/status` | Get ingestion status |

### Skill Resources

| URI | Description |
|-----|-------------|
| `skill://list` | List all available skills |
| `skill://{name}` | Get specific skill definition |
| `skill://categories` | List skill categories |
| `skill://category/{category}` | List skills in category |

### Reading Resources

```javascript
// List resources
const resources = await client.request({ method: 'resources/list' });

// Read a resource
const memory = await client.request({
  method: 'resources/read',
  params: { uri: 'memory://episodic/list' },
});
```

---

## Tools

### Skill Tools

| Tool | Description |
|------|-------------|
| `skill-execute` | Execute any OpenClaw skill by name |
| `skill-list` | List all available skills |
| `skill-info` | Get information about a skill |

### Memory Tools

| Tool | Description |
|------|-------------|
| `memory-search` | Search across memory using natural language |
| `memory-read` | Read specific memory by ID |
| `memory-stats` | Get swarm memory statistics |
| `memory-consolidate` | Trigger memory consolidation |

### Knowledge Tools

| Tool | Description |
|------|-------------|
| `knowledge-search` | Hybrid search (vector + keyword) |
| `knowledge-read` | Read specific document |
| `knowledge-ingest` | Ingest new document |
| `knowledge-graph-query` | Query knowledge graph |

### Calling Tools

```javascript
// List available tools
const tools = await client.request({ method: 'tools/list' });

// Execute a skill
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'skill-execute',
    arguments: {
      skillName: 'healthcheck',
      arguments: [],
    },
  },
});
```

---

## Prompts

### Available Prompts

| Prompt | Description |
|--------|-------------|
| `agent-deliberation` | Triad deliberation template |
| `agent-proposal` | Create new proposal |
| `agent-safety-review` | Sentinel safety review |
| `agent-memory-query` | Memory query template |
| `agent-knowledge-search` | Knowledge search template |
| `agent-skill-execution` | Skill execution request |
| `agent-explorer-intel` | Explorer intelligence request |
| `agent-historian-retrieval` | Historian retrieval request |
| `agent-coder-implementation` | Coder implementation request |
| `agent-dreamer-synthesis` | Dreamer synthesis request |
| `agent-empath-user-context` | Empath user context query |
| `agent-steward-orchestrate` | Steward orchestration request |

### Getting Prompts

```javascript
// List available prompts
const prompts = await client.request({ method: 'prompts/list' });

// Get a prompt
const prompt = await client.request({
  method: 'prompts/get',
  params: {
    name: 'agent-deliberation',
    arguments: {
      proposal: 'Implement new feature X',
      priority: 'high',
    },
  },
});
```

---

## Examples

### Full Example

```javascript
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function main() {
  // Connect to MCP server
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['openclaw-mcp-server'],
  });

  const client = new Client({
    name: 'my-agent',
    version: '1.0.0',
  });

  await client.connect(transport);

  // List available resources
  const resources = await client.request({ method: 'resources/list' });
  console.log('Resources:', resources);

  // Read episodic memory
  const memory = await client.request({
    method: 'resources/read',
    params: { uri: 'memory://episodic/list' },
  });
  console.log('Memory:', memory);

  // Execute a skill
  const result = await client.request({
    method: 'tools/call',
    params: {
      name: 'skill-execute',
      arguments: {
        skillName: 'healthcheck',
        arguments: [],
      },
    },
  });
  console.log('Skill result:', result);

  // Get deliberation prompt
  const prompt = await client.request({
    method: 'prompts/get',
    params: {
      name: 'agent-deliberation',
      arguments: {
        proposal: 'Implement feature X',
        priority: 'high',
      },
    },
  });
  console.log('Prompt:', prompt);

  await client.close();
}

main().catch(console.error);
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [API Overview](./overview.md) | API reference overview |
| [Plugins: MCP Server](../plugins/mcp-server.md) | MCP Server plugin |
| [MCP Specification](https://modelcontextprotocol.io/) | Model Context Protocol |

---

🦞 *So the collective may connect.*
