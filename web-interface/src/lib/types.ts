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

// Channel types for multi-agent communication
export interface Channel {
	name: string;
	description: string;
	subscriberCount: number;
}

export interface ChannelMessage {
	id: string;
	channel: string;
	from: string;
	content: string;
	timestamp: Date;
	type: 'message' | 'direct' | 'broadcast';
	metadata?: Record<string, unknown>;
}

export interface ChannelEvent {
	type: 'channel_message' | 'agent_subscribed' | 'agent_unsubscribed' | 'channel_activity' | 'manager_status';
	channel?: string;
	agentId?: string;
	timestamp: string;
	data?: unknown;
}

export interface ChannelSubscription {
	agentId: string;
	channel: string;
	subscribedAt: Date;
}

// Multi-agent thread types
export interface AgentThread {
	id: string;
	channel: string;
	participants: string[];
	messages: ThreadMessage[];
	createdAt: Date;
	lastActivity: Date;
	status: 'active' | 'archived';
}

export interface ThreadMessage {
	id: string;
	from: string;
	to?: string;
	content: string;
	timestamp: Date;
	type: 'query' | 'response' | 'action' | 'broadcast';
	metadata?: {
		tool?: string;
		result?: string;
		error?: string;
	};
}

// Agent activity for real-time dashboard
export interface AgentActivity {
	agentId: string;
	agentName: string;
	channel: string;
	action: string;
	timestamp: Date;
	type: 'subscription' | 'message' | 'broadcast' | 'heartbeat';
}

// Channel connection state
export interface ChannelConnectionState {
	connected: boolean;
	method: 'websocket' | 'http' | 'offline';
	channels: Set<string>;
	lastActivity: Date;
}
