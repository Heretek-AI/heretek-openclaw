import type { Agent } from '../types';

// The Collective's 11 agents with their configurations
export const AGENTS: Agent[] = [
	{
		id: 'steward',
		name: 'Steward',
		role: 'Orchestrator',
		status: 'offline',
		port: 8001,
		description: 'Coordinates agent activities and manages task distribution'
	},
	{
		id: 'alpha',
		name: 'Alpha',
		role: 'Triad',
		status: 'offline',
		port: 8002,
		description: 'Triad member for strategic decision making'
	},
	{
		id: 'beta',
		name: 'Beta',
		role: 'Triad',
		status: 'offline',
		port: 8003,
		description: 'Triad member for analysis and review'
	},
	{
		id: 'charlie',
		name: 'Charlie',
		role: 'Triad',
		status: 'offline',
		port: 8004,
		description: 'Triad member for implementation oversight'
	},
	{
		id: 'examiner',
		name: 'Examiner',
		role: 'Interrogator',
		status: 'offline',
		port: 8005,
		description: 'Analyzes and validates information quality'
	},
	{
		id: 'explorer',
		name: 'Explorer',
		role: 'Scout',
		status: 'offline',
		port: 8006,
		description: 'Discovers new opportunities and resources'
	},
	{
		id: 'sentinel',
		name: 'Sentinel',
		role: 'Guardian',
		status: 'offline',
		port: 8007,
		description: 'Monitors security and protects the collective'
	},
	{
		id: 'coder',
		name: 'Coder',
		role: 'Artisan',
		status: 'offline',
		port: 8008,
		description: 'Creates and maintains code and technical solutions'
	},
	{
		id: 'dreamer',
		name: 'Dreamer',
		role: 'Visionary',
		status: 'offline',
		port: 8009,
		description: 'Generates creative ideas and future possibilities'
	},
	{
		id: 'empath',
		name: 'Empath',
		role: 'Diplomat',
		status: 'offline',
		port: 8010,
		description: 'Manages relationships and communication'
	},
	{
		id: 'historian',
		name: 'Historian',
		role: 'Archivist',
		status: 'offline',
		port: 8011,
		description: 'Maintains records and institutional knowledge'
	}
];

// Get agent by ID
export function getAgentById(id: string): Agent | undefined {
	return AGENTS.find(agent => agent.id === id);
}

// Get agent by port
export function getAgentByPort(port: number): Agent | undefined {
	return AGENTS.find(agent => agent.port === port);
}

// Get the base URL for agent communication (Docker network or localhost)
function getAgentBaseUrl(agent: Agent): string {
	// In Docker, use container names; in development, use localhost with mapped ports
	const host = process.env.DOCKER_ENV === 'true'
		? `heretek-${agent.id}` // Docker container name
		: 'localhost';
	// Use agent's actual port - Docker uses internal 8000, localhost uses mapped port
	const port = agent.port;
	return `http://${host}:${port}`;
}

// Get health check URL for agent
export function getAgentHealthUrl(agent: Agent): string {
	return `${getAgentBaseUrl(agent)}/health`;
}

// Check health of a single agent
export async function checkAgentHealth(agent: Agent): Promise<Agent> {
	try {
		const response = await fetch(getAgentHealthUrl(agent), {
			method: 'GET',
			signal: AbortSignal.timeout(2000) // 2 second timeout
		});
		
		if (response.ok) {
			return { ...agent, status: 'online' };
		} else {
			return { ...agent, status: 'offline' };
		}
	} catch {
		return { ...agent, status: 'offline' };
	}
}

// Check health of all agents
export async function checkAllAgentsHealth(): Promise<Agent[]> {
	const healthChecks = AGENTS.map(agent => checkAgentHealth(agent));
	return Promise.all(healthChecks);
}

// Get all agents (static list)
export function getAllAgents(): Agent[] {
	return AGENTS;
}
