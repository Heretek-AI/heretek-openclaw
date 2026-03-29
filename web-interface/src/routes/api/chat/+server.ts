import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendChatToAgent } from '$lib/server/litellm-client';
import type { ChatRequest } from '$lib/types';

// POST /api/chat - Send message to an agent
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: ChatRequest = await request.json();
		
		// Validate request
		if (!body.agent) {
			return json(
				{
					success: false,
					error: 'Agent name is required'
				},
				{ status: 400 }
			);
		}

		if (!body.message) {
			return json(
				{
					success: false,
					error: 'Message is required'
				},
				{ status: 400 }
			);
		}

		// Send message to agent via LiteLLM
		const response = await sendChatToAgent(body);
		
		return json(response);
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
