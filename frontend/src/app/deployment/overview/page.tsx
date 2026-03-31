'use client';

export default function DeploymentOverview() {
  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Deployment Guide Overview</h1>
      <p className="text-muted-foreground mb-8">
        Deploy Heretek OpenClaw in various environments from local development to production Kubernetes clusters.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Deployment Options</h2>
        <div className="space-y-4">
          <DeploymentCard 
            title="Local Deployment" 
            path="/heretek-openclaw/deployment/local"
            description="Run OpenClaw on your local machine for development and testing"
            difficulty="Easy"
          />
          <DeploymentCard 
            title="Docker Deployment" 
            path="/heretek-openclaw/deployment/docker"
            description="Deploy using Docker Compose for containerized environments"
            difficulty="Medium"
          />
          <DeploymentCard 
            title="Kubernetes" 
            path="/heretek-openclaw/deployment/kubernetes"
            description="Production deployment with Helm charts on Kubernetes"
            difficulty="Advanced"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Prerequisites</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-left">Requirement</th>
              <th className="border p-2 text-left">Minimum</th>
              <th className="border p-2 text-left">Recommended</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2">OS</td>
              <td className="border p-2">Linux (Ubuntu 20.04+)</td>
              <td className="border p-2">Ubuntu 22.04 LTS</td>
            </tr>
            <tr>
              <td className="border p-2">CPU</td>
              <td className="border p-2">4 cores</td>
              <td className="border p-2">8+ cores</td>
            </tr>
            <tr>
              <td className="border p-2">RAM</td>
              <td className="border p-2">8 GB</td>
              <td className="border p-2">16+ GB</td>
            </tr>
            <tr>
              <td className="border p-2">Disk</td>
              <td className="border p-2">20 GB</td>
              <td className="border p-2">50+ GB SSD</td>
            </tr>
          </tbody>
        </table>
      </section>
    </article>
  );
}

function DeploymentCard({ title, path, description, difficulty }: { title: string; path: string; description: string; difficulty: string }) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-secondary">{difficulty}</span>
      </div>
      <a href={path} className="text-sm text-primary hover:underline">{path}</a>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
