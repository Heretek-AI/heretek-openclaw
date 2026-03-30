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
	 * Check health of a single agent via LiteLLM A2A endpoint
	 */
	async checkAgentHealth(agentName: string): Promise<AgentHealthStatus> {
		const startTime = Date.now();
		const result: AgentHealthStatus = {
			agentId: agentName,
			agentName: agentName.charAt(0).toUpperCase() + agentName.slice(1),
			status: 'offline',
			timestamp: new Date()
		};

		try {
			// Try LiteLLM A2A endpoint
			const response = await fetch(`${this.litellmHost}/v1/agents/${agentName}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				signal: AbortSignal.timeout(this.timeout)
			});

			if (response.ok) {
				result.status = 'online';
				result.latency = Date.now() - startTime;
				
				// Try to get additional status info
				const data = await response.json().catch(() => ({}));
				if (data.status === 'busy') {
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
		
		const agentMap: Record<string, { name: string; role: string }> = {
			steward: { name: 'Steward', role: 'Orchestrator' },
			alpha: { name: 'Alpha', role: 'Triad' },
			beta: { name: 'Beta', role: 'Triad' },
			charlie: { name: 'Charlie', role: 'Triad' },
			examiner: { name: 'Examiner', role: 'Interrogator' },
			explorer: { name: 'Explorer', role: 'Scout' },
			sentinel: { name: 'Sentinel', role: 'Guardian' },
			coder: { name: 'Coder', role: 'Artisan' },
			dreamer: { name: 'Dreamer', role: 'Visionary' },
			empath: { name: 'Empath', role: 'Diplomat' },
			historian: { name: 'Historian', role: 'Archivist' }
		};

		return statuses.map(status => ({
			id: status.agentId,
			name: status.agentName,
			role: agentMap[status.agentId]?.role || 'Agent',
			// Map 'error' to 'offline' as Agent type only has 'online' | 'offline' | 'busy'
			status: status.status === 'error' ? 'offline' : status.status as 'online' | 'offline' | 'busy',
			port: 8000 + Object.keys(agentMap).indexOf(status.agentId) + 1,
			description: `Agent ${status.agentName}`
		}));
	}
}

// Export singleton for easy use
export const healthCheckService = new HealthCheckService();