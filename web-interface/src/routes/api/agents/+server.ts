import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkAllAgentsHealth, getAllAgents } from '$lib/server/agent-registry';

// GET /api/agents - List all agents with status
export const GET: RequestHandler = async () => {
	try {
		// Check health of all agents
		const agents = await checkAllAgentsHealth();
		
		return json({
			success: true,
			agents,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{
				success: false,
				error: errorMessage,
				agents: getAllAgents() // Return static list even on error
			},
			{ status: 500 }
		);
	}
};
