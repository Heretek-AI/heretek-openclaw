'use client';

export default function ArchitectureOverview() {
  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">System Architecture Overview</h1>
      <p className="text-muted-foreground mb-8">
        Heretek OpenClaw is a multi-agent AI collective built on the OpenClaw Gateway v2026.3.28 architecture.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Key Architectural Decisions</h2>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li><strong>Single-Process Gateway:</strong> All 11 agents run as workspaces within a single Gateway process</li>
          <li><strong>Gateway WebSocket RPC:</strong> Native A2A communication protocol</li>
          <li><strong>LiteLLM Integration:</strong> Model routing with agent-specific passthrough endpoints</li>
          <li><strong>Vector Database:</strong> PostgreSQL with pgvector extension for RAG</li>
          <li><strong>Plugin Architecture:</strong> NPM-based plugins extending Gateway functionality</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Core Services</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ServiceCard 
            title="OpenClaw Gateway" 
            port="18789" 
            description="Central daemon managing all agent workspaces and A2A communication"
          />
          <ServiceCard 
            title="LiteLLM Gateway" 
            port="4000" 
            description="Unified LLM API with model routing and agent passthrough endpoints"
          />
          <ServiceCard 
            title="PostgreSQL + pgvector" 
            port="5432" 
            description="Vector database for RAG and semantic memory storage"
          />
          <ServiceCard 
            title="Redis" 
            port="6379" 
            description="Caching layer only (NOT used for A2A communication)"
          />
        </div>
      </section>
    </article>
  );
}

function ServiceCard({ title, port, description }: { title: string; port: string; description: string }) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">Port: {port}</p>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
