'use client';

export default function OperationsOverview() {
  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Operations Guide Overview</h1>
      <p className="text-muted-foreground mb-8">
        Operational procedures for monitoring, maintaining, and troubleshooting the OpenClaw collective.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Operations Topics</h2>
        <div className="space-y-4">
          <OperationCard 
            title="Monitoring Stack" 
            path="/heretek-openclaw/operations/monitoring"
            description="Langfuse observability, Prometheus metrics, and Grafana dashboards"
          />
          <OperationCard 
            title="Backup Procedures" 
            path="/heretek-openclaw/operations/backup"
            description="Automated backup schedules, restoration procedures, and disaster recovery"
          />
          <OperationCard 
            title="Troubleshooting" 
            path="/heretek-openclaw/operations/troubleshooting"
            description="Common issues, debugging procedures, and emergency protocols"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Key Commands</h2>
        <div className="bg-muted p-4 rounded-lg font-mono text-sm">
          <p className="mb-2"># Check service health</p>
          <p className="mb-4">docker compose ps</p>
          <p className="mb-2"># View logs</p>
          <p className="mb-4">docker compose logs -f litellm</p>
          <p className="mb-2"># Run health check</p>
          <p className="mb-4">./scripts/health-check.sh</p>
          <p className="mb-2"># Production backup</p>
          <p>./scripts/production-backup.sh --all</p>
        </div>
      </section>
    </article>
  );
}

function OperationCard({ title, path, description }: { title: string; path: string; description: string }) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">{title}</h3>
      <a href={path} className="text-sm text-primary hover:underline">{path}</a>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
