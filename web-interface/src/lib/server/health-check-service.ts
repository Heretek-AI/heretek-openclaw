/**
 * Heretek OpenClaw — Health Check Service
 * ==============================================================================
 * Provides real-time agent health status via LiteLLM A2A endpoints.
 * 
 * Usage:
 *   import { HealthCheckService } from './health-check-service';
 *   
 *   const healthService = new HealthCheckService();
 *   const statuses = await healthService.checkAllAgents();
 *   console.log(statuses);
 * ==============================================================================
 */

import type { Agent } from '../types';

export interface AgentHealthStatus {
	agentId: string;
	agentName: string;
	status: 'online' | 'offline' | 'busy' | 'error';
	timestamp: Date;
	latency?: number;
	error?: string;
}

export class HealthCheckService {
	private litellmHost: string;
	private apiKey: string;
	private timeout: number;
	private redisUrl?: string;

	constructor(config?: {
		litellmHost?: string;
		apiKey?: string;
		timeout?: number;
		redisUrl?: string;
	}) {
		this.litellmHost = config?.litellmHost || process.env.LITELLM_HOST || 'http://litellm:4000';
		this.apiKey = config?.apiKey || process.env.LITELLM_API_KEY || '';
		this.timeout = config?.timeout || 5000;
		this.redisUrl = config?.redisUrl || process.env.REDIS_URL;
	}

	/**
	 * Check health of a single agent via direct container endpoint
	 * Agents run as Docker containers accessible at localhost:8001-8011
	 */
	async checkAgentHealth(agentName: string): Promise<AgentHealthStatus> {
		const startTime = Date.now();
		const result: AgentHealthStatus = {
			agentId: agentName,
			agentName: agentName.charAt(0).toUpperCase() + agentName.slice(1),
			status: 'offline',
			timestamp: new Date()
		};

		// In Docker, use container names (e.g., heretek-steward) for internal network on port 8000
		// For local development/host access, use localhost with mapped port (8001-8011)
		const isDockerEnv = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
		
		// Agent ports: steward=8001, alpha=8002, beta=8003, charlie=8004,
		// examiner=8005, explorer=8006, sentinel=8007, coder=8008,
		// dreamer=8009, empath=8010, historian=8011
		const agentExternalPorts: Record<string, number> = {
			steward: 8001, alpha: 8002, beta: 8003, charlie: 8004,
			examiner: 8005, explorer: 8006, sentinel: 8007, coder: 8008,
			dreamer: 8009, empath: 8010, historian: 8011
		};
		
		// Internal port is always 8000 for Docker networking
		const host = isDockerEnv ? `heretek-${agentName}` : 'localhost';
		const port = isDockerEnv ? 8000 : (agentExternalPorts[agentName] || 8001);
		const agentUrl = `http://${host}:${port}/health`;

		try {
			// Check agent container health endpoint directly
			const response = await fetch(agentUrl, {
				method: 'GET',
				signal: AbortSignal.timeout(this.timeout)
			});

			if (response.ok) {
				result.status = 'online';
				result.latency = Date.now() - startTime;
				
				// Try to get additional status info
				const data = await response.json().catch(() => ({}));
				if (data.status === 'busy' || data.busy) {
					result.status = 'busy';
				}
			} else if (response.status === 429 || response.status === 503) {
				result.status = 'busy';
				result.error = 'Agent is busy or overloaded';
			}
		} catch (error) {
			result.status = 'offline';
			result.error = error instanceof Error ? error.message : 'Unknown error';
			result.latency = Date.now() - startTime;
		}

		return result;
	}

	/**
	 * Check health of all 11 agents
	 */
	async checkAllAgents(): Promise<AgentHealthStatus[]> {
		const agents = [
			'steward', 'alpha', 'beta', 'charlie',
			'examiner', 'explorer', 'sentinel', 'coder',
			'dreamer', 'empath', 'historian'
		];

		const results = await Promise.all(
			agents.map(async (agent) => this.checkAgentHealth(agent))
		);

		return results;
	}

	/**
	 * Get online count summary
	 */
	async getStatusSummary(): Promise<{
		total: number;
		online: number;
		offline: number;
		busy: number;
	}> {
		const statuses = await this.checkAllAgents();
		
		return {
			total: statuses.length,
			online: statuses.filter(s => s.status === 'online').length,
			offline: statuses.filter(s => s.status === 'offline').length,
			busy: statuses.filter(s => s.status === 'busy').length
		};
	}

	/**
	 * Convert health status to Agent array for AgentStatus.svelte
	 */
	async getAgentsWithStatus(): Promise<Agent[]> {
		const statuses = await this.checkAllAgents();
		
		const agentMap: Record<string, { name: string; role: string; port: number }> = {
			steward: { name: 'Steward', role: 'Orchestrator', port: 8001 },
			alpha: { name: 'Alpha', role: 'Triad', port: 8002 },
			beta: { name: 'Beta', role: 'Triad', port: 8003 },
			charlie: { name: 'Charlie', role: 'Triad', port: 8004 },
			examiner: { name: 'Examiner', role: 'Interrogator', port: 8005 },
			explorer: { name: 'Explorer', role: 'Scout', port: 8006 },
			sentinel: { name: 'Sentinel', role: 'Guardian', port: 8007 },
			coder: { name: 'Coder', role: 'Artisan', port: 8008 },
			dreamer: { name: 'Dreamer', role: 'Visionary', port: 8009 },
			empath: { name: 'Empath', role: 'Diplomat', port: 8010 },
			historian: { name: 'Historian', role: 'Archivist', port: 8011 }
		};

		return statuses.map(status => ({
			id: status.agentId,
			name: status.agentName,
			role: agentMap[status.agentId]?.role || 'Agent',
			// Map 'error' to 'offline' as Agent type only has 'online' | 'offline' | 'busy'
			status: status.status === 'error' ? 'offline' : status.status as 'online' | 'offline' | 'busy',
			port: agentMap[status.agentId]?.port || 8001,
			description: `Agent ${status.agentName}`
		}));
	}
}

// Export singleton for easy use
export const healthCheckService = new HealthCheckService();