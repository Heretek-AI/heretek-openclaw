import type { ChatRequest, ChatResponse, A2AMessage } from '../types';

// LiteLLM Gateway configuration
const LITELLM_BASE_URL = process.env.LITELLM_URL || 'http://localhost:4000';

// Send a chat message to an agent via LiteLLM A2A endpoint
export async function sendChatToAgent(request: ChatRequest): Promise<ChatResponse> {
	const { agent, message, conversationId } = request;
	
	try {
		// Use the A2A endpoint for agent communication
		const response = await fetch(`${LITELLM_BASE_URL}/a2a/${agent}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message,
				conversation_id: conversationId,
				timestamp: new Date().toISOString()
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				success: false,
				error: `Agent ${agent} returned error: ${response.status} - ${errorText}`,
				agent,
				timestamp: new Date()
			};
		}

		const data = await response.json();
		
		return {
			success: true,
			response: data.response || data.message || JSON.stringify(data),
			agent,
			timestamp: new Date()
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			success: false,
			error: `Failed to communicate with agent ${agent}: ${errorMessage}`,
			agent,
			timestamp: new Date()
		};
	}
}

// Send an A2A (agent-to-agent) message
export async function sendA2AMessage(message: A2AMessage): Promise<boolean> {
	try {
		const response = await fetch(`${LITELLM_BASE_URL}/a2a/${message.to}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: message.from,
				message: message.content,
				timestamp: message.timestamp.toISOString()
			})
		});

		return response.ok;
	} catch {
		return false;
	}
}

// Query agent status via LiteLLM
export async function queryAgentStatus(agentName: string): Promise<{
	online: boolean;
	lastSeen?: Date;
	busy?: boolean;
}> {
	try {
		const response = await fetch(`${LITELLM_BASE_URL}/a2a/${agentName}/status`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		});

		if (response.ok) {
			const data = await response.json();
			return {
				online: true,
				lastSeen: new Date(),
				busy: data.busy || false
			};
		}
		
		return { online: false };
	} catch {
		return { online: false };
	}
}

// Get LiteLLM gateway health
export async function getLiteLLMHealth(): Promise<boolean> {
	try {
		const response = await fetch(`${LITELLM_BASE_URL}/health`, {
			method: 'GET',
			signal: AbortSignal.timeout(2000)
		});
		return response.ok;
	} catch {
		return false;
	}
}
