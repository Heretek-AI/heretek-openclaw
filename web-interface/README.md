# The Collective - Web Interface

A SvelteKit-based web interface for interacting with The Collective's 11 agents and visualizing agent-to-agent communication.

## Features

- **Chat Interface**: Send messages to any of the 11 agents
- **Agent Status Dashboard**: Real-time status of all agents (online/offline/busy)
- **Message Flow Visualization**: View agent-to-agent communications
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 18+
- npm or yarn
- LiteLLM Gateway running at `http://localhost:4000`
- Agent services running on ports 8001-8011

## Installation

```bash
# Navigate to the web-interface directory
cd web-interface

# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LITELLM_URL` | `http://localhost:4000` | LiteLLM Gateway URL |
| `PORT` | `3000` | Server port |

## Project Structure

```
web-interface/
├── src/
│   ├── lib/
│   │   ├── components/       # Svelte components
│   │   │   ├── ChatInterface.svelte
│   │   │   ├── AgentSelector.svelte
│   │   │   ├── MessageList.svelte
│   │   │   ├── AgentStatus.svelte
│   │   │   └── MessageFlow.svelte
│   │   ├── server/           # Server-side utilities
│   │   │   ├── litellm-client.ts
│   │   │   ├── agent-registry.ts
│   │   │   └── websocket.ts
│   │   └── types.ts          # TypeScript interfaces
│   ├── routes/
│   │   ├── +page.svelte      # Main page
│   │   ├── +layout.svelte    # Layout
│   │   └── api/              # API endpoints
│   │       ├── agents/+server.ts
│   │       ├── chat/+server.ts
│   │       └── status/+server.ts
│   ├── app.html              # HTML template
│   ├── app.css               # Global styles
│   └── app.d.ts              # Type declarations
├── static/                   # Static assets
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## API Endpoints

### GET /api/agents
Returns list of all agents with their current status.

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "steward",
      "name": "Steward",
      "role": "Orchestrator",
      "status": "online",
      "port": 8001,
      "description": "Coordinates agent activities..."
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/chat
Send a message to an agent.

**Request:**
```json
{
  "agent": "steward",
  "message": "Hello, how can you help?",
  "conversationId": "optional-conversation-id"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Agent response text...",
  "agent": "steward",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/status
Get overall system status including LiteLLM gateway and all agents.

## Agents

| Agent | Role | Port |
|-------|------|------|
| Steward | Orchestrator | 8001 |
| Alpha | Triad | 8002 |
| Beta | Triad | 8003 |
| Charlie | Triad | 8004 |
| Examiner | Interrogator | 8005 |
| Explorer | Scout | 8006 |
| Sentinel | Guardian | 8007 |
| Coder | Artisan | 8008 |
| Dreamer | Visionary | 8009 |
| Empath | Diplomat | 8010 |
| Historian | Archivist | 8011 |

## Technologies

- **SvelteKit** - Full-stack framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Vite** - Build tool
- **ws** - WebSocket support

## License

MIT
