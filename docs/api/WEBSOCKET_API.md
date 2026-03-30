# WebSocket Bridge API

## Overview

The WebSocket bridge provides real-time communication between the Redis Pub/Sub system and web clients. It enables the WebUI to receive live updates from agents and A2A communication.

## Endpoints

### WebSocket Server

**URL:** `ws://localhost:3003` (development) or `ws://web:3003` (Docker)

**Health Check:** `http://localhost:3002/health`

## Connection

### Client Connection

```javascript
const ws = new WebSocket('ws://localhost:3003');

ws.onopen = () => {
  console.log('Connected to WebSocket bridge');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket bridge');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Reconnection Strategy

```javascript
function connectWithRetry() {
  const maxRetries = 5;
  const delays = [1000, 2000, 4000, 8000, 16000];
  let attempts = 0;

  function connect() {
    const ws = new WebSocket('ws://localhost:3003');
    
    ws.onopen = () => {
      attempts = 0;
      console.log('Connected');
    };

    ws.onclose = () => {
      if (attempts < maxRetries) {
        setTimeout(connect, delays[attempts]);
        attempts++;
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  connect();
}
```

## Message Format

### Server-to-Client Messages

All messages from the server follow this format:

```typescript
interface WSMessage {
  type: 'status' | 'message' | 'a2a' | 'activity' | 'error';
  channel: string;
  data: any;
  timestamp: number;
}
```

### Message Types

#### Status Update

```json
{
  "type": "status",
  "channel": "agent:status",
  "data": {
    "agent": "steward",
    "status": "online",
    "timestamp": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Chat Message

```json
{
  "type": "message",
  "channel": "agent:message",
  "data": {
    "id": "msg-uuid",
    "from": "steward",
    "to": "user",
    "content": "Hello, how can I help?",
    "timestamp": 1234567890
  },
  "timestamp": 1234567890
}
```

#### A2A Message

```json
{
  "type": "a2a",
  "channel": "agent:a2a",
  "data": {
    "id": "a2a-uuid",
    "type": "proposal",
    "from": "alpha",
    "to": null,
    "content": {
      "proposal": "Implement feature X"
    },
    "timestamp": 1234567890,
    "metadata": {
      "priority": "normal",
      "requiresResponse": true
    }
  },
  "timestamp": 1234567890
}
```

#### Activity Update

```json
{
  "type": "activity",
  "channel": "agent:activity",
  "data": {
    "agent": "explorer",
    "activity": "task_start",
    "task": "research",
    "timestamp": 1234567890
  },
  "timestamp": 1234567890
}
```

#### Error

```json
{
  "type": "error",
  "channel": "agent:activity",
  "data": {
    "agent": "coder",
    "error": "Failed to execute task",
    "details": "Connection timeout",
    "timestamp": 1234567890
  },
  "timestamp": 1234567890
}
```

### Client-to-Server Messages

Clients can send messages to the bridge:

```typescript
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'publish' | 'ping';
  channel?: string;
  data?: any;
}
```

#### Subscribe to Channel

```json
{
  "type": "subscribe",
  "channel": "agent:status"
}
```

#### Unsubscribe from Channel

```json
{
  "type": "unsubscribe",
  "channel": "agent:status"
}
```

#### Publish Message

```json
{
  "type": "publish",
  "channel": "agent:message",
  "data": {
    "from": "user",
    "to": "steward",
    "content": "Hello"
  }
}
```

#### Ping (Keep-alive)

```json
{
  "type": "ping"
}
```

Server responds with:

```json
{
  "type": "pong",
  "timestamp": 1234567890
}
```

## Subscribed Channels

By default, the bridge subscribes to these Redis channels and forwards to WebSocket clients:

| Redis Channel | WebSocket Message Type |
|---------------|----------------------|
| `agent:status` | `status` |
| `agent:message` | `message` |
| `agent:a2a` | `a2a` |
| `agent:activity` | `activity` |

## HTTP Health Endpoint

**URL:** `http://localhost:3002/health`

**Method:** `GET`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "websocket": {
    "clients": 5,
    "port": 3003
  },
  "redis": {
    "connected": true,
    "subscribedChannels": 4
  }
}
```

## Implementation Files

| File | Purpose |
|------|---------|
| `modules/communication/redis-websocket-bridge.js` | Bridge implementation |
| `web-interface/src/lib/server/websocket.ts` | WebSocket server for UI |
| `web-interface/src/lib/server/websocket-client.ts` | Client utilities |
| `web-interface/src/lib/components/MessageFlow.svelte` | Real-time message visualization |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `WS_PORT` | WebSocket server port | `3002` |
| `DOCKER_ENV` | Running in Docker | `false` |

## Usage Example: WebUI Component

```typescript
// web-interface/src/lib/server/websocket-client.ts
import type { WSMessage, ConnectionStatus } from '../types';

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

export function connectWebSocket(
  onMessage: (message: WSMessage) => void,
  onStatusChange: (status: ConnectionStatus) => void
): void {
  const url = 'ws://localhost:3003';
  ws = new WebSocket(url);

  ws.onopen = () => {
    onStatusChange({ connected: true, reconnecting: false });
  };

  ws.onmessage = (event) => {
    const message: WSMessage = JSON.parse(event.data);
    onMessage(message);
  };

  ws.onclose = () => {
    onStatusChange({ connected: false, reconnecting: true });
    scheduleReconnect(onMessage, onStatusChange);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    ws?.close();
  };
}

function scheduleReconnect(
  onMessage: (message: WSMessage) => void,
  onStatusChange: (status: ConnectionStatus) => void
): void {
  const delays = [1000, 2000, 4000, 8000, 16000];
  let attempts = 0;

  function tryConnect() {
    if (attempts < delays.length) {
      reconnectTimeout = setTimeout(() => {
        connectWebSocket(onMessage, onStatusChange);
        attempts++;
      }, delays[attempts - 1] || 1000);
    }
  }

  tryConnect();
}

export function disconnectWebSocket(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}
```
