'use client';

export default function ApiOverview() {
  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">API Reference Overview</h1>
      <p className="text-muted-foreground mb-8">
        Heretek OpenClaw provides multiple API interfaces for interacting with the agent collective.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available APIs</h2>
        <div className="space-y-4">
          <ApiCard 
            title="WebSocket API" 
            path="/heretek-openclaw/api/websocket"
            description="Real-time bidirectional communication with agents via WebSocket"
          />
          <ApiCard 
            title="LiteLLM API" 
            path="/heretek-openclaw/api/litellm"
            description="OpenAI-compatible API for LLM inference through LiteLLM Gateway"
          />
          <ApiCard 
            title="MCP Server" 
            path="/heretek-openclaw/api/mcp"
            description="Model Context Protocol server for external tool integration"
          />
        </div>
      </section>
    </article>
  );
}

function ApiCard({ title, path, description }: { title: string; path: string; description: string }) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">{title}</h3>
      <a href={path} className="text-sm text-primary hover:underline">{path}</a>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
