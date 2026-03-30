import type { ChatRequest, ChatResponse, A2AMessage, SessionMessage } from '../types';

// LiteLLM Gateway configuration
const LITELLM_BASE_URL = process.env.LITELLM_HOST || process.env.LITELLM_URL || 'http://localhost:4000';

// Redis configuration for WebSocket broadcast
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MESSAGEFLOW_CHANNEL = 'a2a:system:messageflow';

// Cache for recent conversation context (in-memory, lightweight)
const conversationCache = new Map<string, SessionMessage[]>();
const MAX_CACHED_MESSAGES = 20;

/**
 * Get cached conversation history for an agent
 */
function getCachedHistory(conversationId: string): SessionMessage[] {
	return conversationCache.get(conversationId) || [];
}

/**
 * Update cached conversation history
 */
function updateCachedHistory(conversationId: string, messages: SessionMessage[]): void {
	if (messages.length > MAX_CACHED_MESSAGES) {
		messages = messages.slice(-MAX_CACHED_MESSAGES);
	}
	conversationCache.set(conversationId, messages);
}

/**
 * Convert Message[] to OpenAI-style messages for LiteLLM
 */
function formatMessagesForLiteLLM(messages: SessionMessage[], currentMessage: string, from: string): any[] {
	const formattedMessages: any[] = [];
	
	// Add system context
	formattedMessages.push({
		role: 'system',
		content: 'You are an agent in The Collective. Respond as the agent you represent. Be helpful, concise, and thoughtful.'
	});
	
	// Add conversation history
	for (const msg of messages) {
		formattedMessages.push({
			role: msg.fromAgent === from ? 'assistant' : 'user',
			content: msg.content
		});
	}
	
	// Add current message
	formattedMessages.push({
		role: 'user',
		content: currentMessage
	});
	
	return formattedMessages;
}

/**
 * Send a chat message to an agent via LiteLLM chat completion endpoint
 */
export async function sendChatToAgent(request: ChatRequest): Promise<ChatResponse> {
	const { agent, message, conversationId } = request;
	const fromUser = request.fromUser || 'user';
	
	try {
		// Get conversation history for context
		const history = conversationId ? getCachedHistory(conversationId) : [];
		
		// Format messages with history context
		const formattedMessages = formatMessagesForLiteLLM(history, message, fromUser);
		
		// Use the chat completion endpoint with agent model
		const response = await fetch(`${LITELLM_BASE_URL}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${process.env.LITELLM_API_KEY || ''}`
			},
			body: JSON.stringify({
				model: `agent/${agent}`,
				messages: formattedMessages,
				stream: false,
				metadata: {
					conversationId: conversationId || null,
					fromUser: fromUser
				}
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
		
		// Update conversation cache
		if (conversationId) {
			const newMessage: SessionMessage = {
				id: crypto.randomUUID(),
				fromAgent: fromUser,
				toAgent: agent,
				content: message,
				timestamp: new Date(),
				messageType: 'text'
			};
			const responseMessage: SessionMessage = {
				id: crypto.randomUUID(),
				fromAgent: agent,
				toAgent: fromUser,
				content: assistantMessage,
				timestamp: new Date(),
				messageType: 'response'
			};
			updateCachedHistory(conversationId, [...history, newMessage, responseMessage]);
		}
		
		// Broadcast to WebSocket clients
		const broadcastMessage: A2AMessage = {
			from: agent,
			to: fromUser,
			content: assistantMessage,
			timestamp: new Date()
		};
		broadcastToWebSocket(broadcastMessage);
		
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

/**
 * Send an A2A (agent-to-agent) message
 */
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

/**
 * Query agent status via LiteLLM
 */
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

/**
 * Get LiteLLM gateway health
 */
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

// Redis client for WebSocket broadcast (lazy initialized)
let redis: any = null;

async function getRedisClient() {
	if (!redis) {
		const Redis = require('ioredis');
		redis = new Redis(REDIS_URL);
	}
	return redis;
}

/**
 * Broadcast agent response to connected WebSocket clients via Redis
 */
export async function broadcastToWebSocket(message: A2AMessage): Promise<boolean> {
	try {
		const client = await getRedisClient();
		const payload = {
			type: 'a2a',
			data: {
				from: message.from,
				to: message.to,
				content: message.content,
				timestamp: message.timestamp.toISOString()
			},
			timestamp: new Date().toISOString()
		};
		
		await client.publish(MESSAGEFLOW_CHANNEL, JSON.stringify(payload));
		console.log(`[LitellmClient] Broadcast to WebSocket: ${message.from} -> ${message.to}`);
		return true;
	} catch (error) {
		console.error('[LitellmClient] WebSocket broadcast failed:', error);
		return false;
	}
}

/**
 * Clear conversation cache for a session
 */
export function clearConversationCache(conversationId: string): void {
	conversationCache.delete(conversationId);
}

/**
 * Get conversation history for a session
 */
export function getConversationHistory(conversationId: string): SessionMessage[] {
	return getCachedHistory(conversationId);
}
