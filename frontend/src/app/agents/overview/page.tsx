'use client';

export default function AgentsOverview() {
  const agents = [
    { name: 'steward', role: 'orchestrator', emoji: '🦞', triad: false },
    { name: 'alpha', role: 'triad_member', emoji: '🔺', triad: true },
    { name: 'beta', role: 'triad_member', emoji: '🔷', triad: true },
    { name: 'charlie', role: 'triad_member', emoji: '🔶', triad: true },
    { name: 'examiner', role: 'evaluator', emoji: '❓', triad: false },
    { name: 'explorer', role: 'researcher', emoji: '🧭', triad: false },
    { name: 'sentinel', role: 'safety', emoji: '🦔', triad: false },
    { name: 'coder', role: 'developer', emoji: '⌨️', triad: false },
    { name: 'dreamer', role: 'creative', emoji: '💭', triad: false },
    { name: 'empath', role: 'emotional', emoji: '💙', triad: false },
    { name: 'historian', role: 'archivist', emoji: '📜', triad: false }
  ];

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">Agent Collective</h1>
      <p className="text-muted-foreground mb-8">
        Heretek OpenClaw consists of 11 specialized agents that run as workspaces within the OpenClaw Gateway process.
      </p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Triad Members</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {agents.filter(a => a.triad).map((agent) => (
            <AgentCard key={agent.name} {...agent} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Supporting Agents</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.filter(a => !a.triad).map((agent) => (
            <AgentCard key={agent.name} {...agent} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Triad Deliberation</h2>
        <p className="text-muted-foreground mb-4">
          Alpha, Beta, and Charlie form the deliberative triad for consensus-based decision making.
          2 of 3 votes required for decision.
        </p>
        <div className="bg-muted p-4 rounded-lg">
          <pre className="text-sm">
{`┌─────────────────────────────────────────┐
│         Triad Deliberation              │
│                                         │
│  Proposal ──> Alpha ──┐                │
│                       │                 │
│  Proposal ──> Beta ───┼──> 2/3 Consensus│
│                       │                 │
│  Proposal ──> Charlie─┘                 │
└─────────────────────────────────────────┘`}
          </pre>
        </div>
      </section>
    </article>
  );
}

function AgentCard({ name, role, emoji, triad }: { name: string; role: string; emoji: string; triad: boolean }) {
  return (
    <div className="p-4 border rounded-lg bg-card text-center">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="text-sm text-muted-foreground">{role}</p>
      {triad && <span className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground mt-2 inline-block">Triad</span>}
    </div>
  );
}
