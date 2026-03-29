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

// WebSocket message types
export type WSMessage = 
	| { type: 'status'; data: AgentStatusUpdate }
	| { type: 'message'; data: Message }
	| { type: 'a2a'; data: A2AMessage };
