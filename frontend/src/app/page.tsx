'use client';

import { useState } from 'react';
import { Moon, Sun, Github } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useState(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Heretek OpenClaw</h1>
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-accent"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <a
              href="https://github.com/heretek/heretek-openclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-accent"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Self-Improving Autonomous Agent Collective
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Heretek OpenClaw is a powerful multi-agent system built on the LiteLLM A2A protocol,
            featuring emotional salience, conflict resolution, and distributed memory capabilities.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="#documentation"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            >
              View Documentation
            </a>
            <a
              href="https://github.com/heretek/heretek-openclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold mb-8 text-center">Key Features</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            title="Multi-Agent System"
            description="Triad architecture with Explorer, Examiner, and Historian agents working in harmony"
          />
          <FeatureCard
            title="A2A Protocol"
            description="Built on LiteLLM's Agent-to-Agent protocol for seamless inter-agent communication"
          />
          <FeatureCard
            title="Emotional Salience"
            description="Advanced memory prioritization based on emotional significance scoring"
          />
          <FeatureCard
            title="Conflict Resolution"
            description="Automated conflict detection and resolution suggestions for agent disagreements"
          />
          <FeatureCard
            title="Distributed Memory"
            description="Redis-backed distributed memory system with pgvector vector storage"
          />
          <FeatureCard
            title="Plugin Architecture"
            description="Extensible plugin system including MCP server, GraphRAG, and more"
          />
        </div>
      </section>

      {/* Documentation Section */}
      <section id="documentation" className="container mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold mb-8">Documentation</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <DocCard
            title="Architecture"
            description="Learn about the triad architecture, A2A protocol, and system design"
            links={[
              { label: 'Overview', href: '/heretek-openclaw/architecture/overview' },
              { label: 'Agents', href: '/heretek-openclaw/architecture/agents' },
              { label: 'A2A Protocol', href: '/heretek-openclaw/architecture/a2a-protocol' },
            ]}
          />
          <DocCard
            title="API Reference"
            description="API documentation for WebSocket, LiteLLM, and MCP interfaces"
            links={[
              { label: 'WebSocket API', href: '/heretek-openclaw/api/websocket' },
              { label: 'LiteLLM API', href: '/heretek-openclaw/api/litellm' },
              { label: 'MCP Server', href: '/heretek-openclaw/api/mcp' },
            ]}
          />
          <DocCard
            title="Deployment"
            description="Deployment guides for local, Docker, and Kubernetes environments"
            links={[
              { label: 'Local Deployment', href: '/heretek-openclaw/deployment/local' },
              { label: 'Docker', href: '/heretek-openclaw/deployment/docker' },
              { label: 'Kubernetes', href: '/heretek-openclaw/deployment/kubernetes' },
            ]}
          />
          <DocCard
            title="Operations"
            description="Operational guides for monitoring, backup, and troubleshooting"
            links={[
              { label: 'Monitoring', href: '/heretek-openclaw/operations/monitoring' },
              { label: 'Backup', href: '/heretek-openclaw/operations/backup' },
              { label: 'Troubleshooting', href: '/heretek-openclaw/operations/troubleshooting' },
            ]}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Heretek. All rights reserved.</p>
          <p className="mt-2">
            Licensed under{' '}
            <a
              href="https://github.com/heretek/heretek-openclaw/blob/main/LICENSE"
              className="underline hover:text-foreground"
            >
              MIT License
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 border rounded-lg bg-card hover:shadow-lg transition">
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function DocCard({
  title,
  description,
  links,
}: {
  title: string;
  description: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="p-6 border rounded-lg bg-card">
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-primary hover:underline">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
