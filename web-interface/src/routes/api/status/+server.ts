import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAllAgentsHealth } from '$lib/server/agent-registry';
import { getLiteLLMHealth } from '$lib/server/litellm-client';

// GET /api/status - Get system status
export const GET: RequestHandler = async () => {
	try {
		const [agents, litellmOnline] = await Promise.all([
			checkAllAgentsHealth(),
			getLiteLLMHealth()
		]);

		const onlineAgents = agents.filter(a => a.status === 'online').length;
		const totalAgents = agents.length;

		return json({
			success: true,
			status: {
				litellm: {
					online: litellmOnline,
					url: process.env.LITELLM_URL || 'http://localhost:4000'
				},
				agents: {
					online: onlineAgents,
					total: totalAgents,
					list: agents
				},
				timestamp: new Date().toISOString()
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
};
