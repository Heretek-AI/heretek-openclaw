import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendChatToAgent, getConversationHistory, clearConversationCache } from '$lib/server/litellm-client';
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

		// Generate conversation ID if not provided
		const conversationId = body.conversationId || crypto.randomUUID();
		
		// Get conversation history for context
		const history = getConversationHistory(conversationId);
		
		// Send message to agent via LiteLLM
		const response = await sendChatToAgent({
			...body,
			conversationId,
			fromUser: body.fromUser || 'user'
		});
		
		return json({
			...response,
			conversationId,
			historyLength: history.length
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

// GET /api/chat - Get conversation history
export const GET: RequestHandler = async ({ url }) => {
	const conversationId = url.searchParams.get('conversationId');
	
	if (!conversationId) {
		return json(
			{
				success: false,
				error: 'conversationId is required'
			},
			{ status: 400 }
		);
	}
	
	const history = getConversationHistory(conversationId);
	
	return json({
		success: true,
		conversationId,
		history,
		count: history.length
	});
};

// DELETE /api/chat - Clear conversation
export const DELETE: RequestHandler = async ({ url }) => {
	const conversationId = url.searchParams.get('conversationId');
	
	if (!conversationId) {
		return json(
			{
				success: false,
				error: 'conversationId is required'
			},
			{ status: 400 }
		);
	}
	
	clearConversationCache(conversationId);
	
	return json({
		success: true,
		message: `Conversation ${conversationId} cleared`
	});
};
