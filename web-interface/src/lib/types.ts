// Agent types for The Collective

export interface Agent {
	id: string;
	name: string;
	role: string;
	status: 'online' | 'offline' | 'busy';
	port: number;
	description: string;
}

export interface Message {
	id: string;
	from: string;
	to: string;
	content: string;
	timestamp: Date;
	type: 'user' | 'agent' | 'system';
}

export interface ChatRequest {
	agent: string;
	message: string;
	conversationId?: string;
	fromUser?: string;
}

export interface ChatResponse {
	success: boolean;
	response?: string;
	error?: string;
	agent: string;
	timestamp: Date;
}

export interface AgentStatusUpdate {
	agentId: string;
	status: 'online' | 'offline' | 'busy';
	timestamp: Date;
}

export interface A2AMessage {
	from: string;
	to: string;
	content: string;
	timestamp: Date;
}

// Session message type for conversation history
export interface SessionMessage {
	id: string;
	fromAgent: string;
	toAgent?: string;
	content: string;
	messageType: 'text' | 'task' | 'query' | 'broadcast' | 'response' | 'heartbeat';
	timestamp: Date;
	context?: Record<string, any>;
}

// WebSocket message types
export type WSMessage = 
	| { type: 'status'; data: AgentStatusUpdate }
	| { type: 'message'; data: Message }
	| { type: 'a2a'; data: A2AMessage };

// Connection status for UI
export interface ConnectionStatus {
	connected: boolean;
	method: 'websocket' | 'http' | 'offline';
	lastPing?: Date;
}
