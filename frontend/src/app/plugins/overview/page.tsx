'use client';

export default function PluginsOverview() {
  const plugins = [
    {
      name: 'Conflict Monitor',
      path: '/heretek-openclaw/plugins/conflict-monitor',
      description: 'ACC conflict detection and resolution suggestions',
      status: 'Active'
    },
    {
      name: 'Emotional Salience',
      path: '/heretek-openclaw/plugins/emotional-salience',
      description: 'Amygdala-based importance detection for memory prioritization',
      status: 'Active'
    },
    {
      name: 'MCP Server',
      path: '/heretek-openclaw/plugins/mcp-server',
      description: 'Model Context Protocol compatibility for external tools',
      status: 'Active'
    },
    {
      name: 'GraphRAG',
      path: '/heretek-openclaw/plugins/graphrag',
      description: 'Knowledge graph enhancements for RAG operations',
      status: 'Beta'
    },
    {
      name: 'Clawbridge',
      path: '/heretek-openclaw/plugins/clawbridge',
      description: 'Bridge integration for legacy systems',
      status: 'Beta'
    }
  ];

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Plugins Overview</h1>
      <p className="text-muted-foreground mb-8">
        Extend OpenClaw functionality with plugins for consciousness theories, conflict resolution, and more.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Plugins</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.name} {...plugin} />
          ))}
        </div>
      </section>
    </article>
  );
}

function PluginCard({ name, path, description, status }: { name: string; path: string; description: string; status: string }) {
  const statusColor = status === 'Active' ? 'bg-green-500' : 'bg-yellow-500';
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className={`text-xs px-2 py-1 rounded text-white ${statusColor}`}>{status}</span>
      </div>
      <a href={path} className="text-sm text-primary hover:underline">{path}</a>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
