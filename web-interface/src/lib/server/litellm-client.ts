import type { ChatRequest, ChatResponse, A2AMessage } from '../types';

// LiteLLM Gateway configuration
const LITELLM_BASE_URL = process.env.LITELLM_HOST || process.env.LITELLM_URL || 'http://localhost:4000';

// Send a chat message to an agent via LiteLLM chat completion endpoint
export async function sendChatToAgent(request: ChatRequest): Promise<ChatResponse> {
	const { agent, message, conversationId } = request;
	
	try {
		// Use the chat completion endpoint with agent model
		const response = await fetch(`${LITELLM_BASE_URL}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${process.env.LITELLM_API_KEY || ''}`
			},
			body: JSON.stringify({
				model: `agent/${agent}`,
				messages: [
					{
						role: 'user',
						content: message
					}
				],
				stream: false
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
		const assistantMessage = data.choices?.[0]?.message?.content || JSON.stringify(data);
		
		return {
			success: true,
			response: assistantMessage,
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
		const response = await fetch(`${LITELLM_BASE_URL}/v1/agents/${message.to}/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${process.env.LITELLM_API_KEY || ''}`
			},
			body: JSON.stringify({
				from: message.from,
				to: message.to,
				message: message.content,
				timestamp: message.timestamp.toISOString()
			})
		});

		if (!response.ok) {
			console.error(`A2A send failed to ${message.to}: ${response.status} ${response.statusText}`);
			return false;
		}
		return true;
	} catch (error) {
		console.error(`A2A send error to ${message.to}:`, error instanceof Error ? error.message : 'Unknown error');
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
		const response = await fetch(`${LITELLM_BASE_URL}/v1/agents/${agentName}/heartbeat`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${process.env.LITELLM_API_KEY || ''}`,
				'Content-Type': 'application/json'
			},
			signal: AbortSignal.timeout(2000)
		});

		if (response.ok) {
			const data = await response.json().catch(() => ({}));
			return {
				online: true,
				lastSeen: new Date(),
				busy: data.status === 'busy' || data.busy === true
			};
		}
		
		return { online: false };
	} catch (error) {
		console.error(`Agent status check failed for ${agentName}:`, error instanceof Error ? error.message : 'Unknown error');
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
