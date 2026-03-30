import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import type { AgentStatusUpdate, Message, WSMessage, A2AMessage } from '../types';

// WebSocket server for real-time updates
let wss: WebSocketServer | null = null;
const clients: Set<WebSocket> = new Set();

/**
 * Internal broadcast that accepts any message type
 */
function broadcastAny(message: any): void {
	const data = JSON.stringify(message);
	
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
}

// Redis client for pub/sub
let redisSubscriber: Redis | null = null;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis channels to subscribe to
const REDIS_CHANNELS = ['agent:status', 'agent:message', 'agent:a2a', 'agent:activity'];

/**
 * Initialize Redis subscriber for pub/sub
 */
async function initRedisSubscriber(): Promise<void> {
	if (redisSubscriber) {
		return;
	}

	redisSubscriber = new Redis(redisUrl, {
		retryStrategy: (times) => {
			if (times > 10) {
				console.error('[WebSocket] Redis max retries reached');
				return null;
			}
			const delay = Math.min(times * 200, 10000);
			return delay;
		}
	});

	redisSubscriber.on('error', (err: Error) => {
		console.error('[WebSocket] Redis Subscriber Error:', err);
	});

	redisSubscriber.on('connect', () => {
		console.log('[WebSocket] Redis subscriber connected');
	});

	redisSubscriber.on('close', () => {
		console.log('[WebSocket] Redis subscriber connection closed');
	});

	try {
		// Wait for connection
		await new Promise<void>((resolve, reject) => {
			if (redisSubscriber?.status === 'ready') {
				resolve();
			} else {
				redisSubscriber?.on('ready', resolve);
				setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
			}
		});

		console.log('[WebSocket] Redis subscriber initialized');

		// Subscribe to agent channels
		for (const channel of REDIS_CHANNELS) {
			redisSubscriber.subscribe(channel);
			console.log(`[WebSocket] Subscribed to Redis channel: ${channel}`);
		}

		// Handle incoming messages from subscribed channels
		redisSubscriber.on('message', (channel: string, message: string) => {
			handleRedisMessage(channel, message);
		});
	} catch (error) {
		console.error('[WebSocket] Failed to connect to Redis:', error);
	}
}

/**
 * Handle messages from Redis pub/sub
 */
function handleRedisMessage(channel: string, message: string): void {
	try {
		const data = JSON.parse(message);
		console.log(`[WebSocket] Redis message on ${channel}:`, data);

		switch (channel) {
			case 'agent:status':
				// Agent status update
				broadcast({ type: 'status', data: data as AgentStatusUpdate });
				break;

			case 'agent:message':
				// Chat message
				broadcast({ type: 'message', data: data as Message });
				break;

			case 'agent:a2a':
				// A2A message between agents
				broadcast({ type: 'a2a', data: data as A2AMessage });
				break;

			case 'agent:activity':
				// General activity event
				broadcastAny({ type: 'channel_activity', data });
				break;

			default:
				console.warn(`[WebSocket] Unknown Redis channel: ${channel}`);
		}
	} catch (error) {
		console.error('[WebSocket] Failed to parse Redis message:', error);
	}
}

// Initialize WebSocket server with Redis integration
export async function initWebSocketServer(port: number = 3002): Promise<WebSocketServer> {
	if (wss) {
		return wss;
	}

	// Initialize Redis subscriber first
	await initRedisSubscriber();

	wss = new WebSocketServer({ port });

	wss.on('connection', (ws) => {
		clients.add(ws);
		console.log('[WebSocket] Client connected');

		// Send welcome message with connection info
		ws.send(JSON.stringify({
			type: 'connected',
			timestamp: new Date().toISOString(),
			data: {
				message: 'Connected to WebSocket bridge',
				redisChannels: REDIS_CHANNELS
			}
		}));

		ws.on('close', () => {
			clients.delete(ws);
			console.log('[WebSocket] Client disconnected');
		});

		ws.on('error', (error) => {
			console.error('[WebSocket] Client error:', error);
			clients.delete(ws);
		});

		// Handle incoming messages from clients
		ws.on('message', (data) => {
			try {
				const message = JSON.parse(data.toString());
				console.log('[WebSocket] Client message:', message);
				
				// Handle client requests (e.g., send message to agent)
				if (message.type === 'a2a' && message.action === 'send') {
					// Forward to Redis for agent delivery
					redisSubscriber?.publish('agent:a2a:outbound', JSON.stringify(message));
				}
			} catch (error) {
				console.error('[WebSocket] Failed to parse client message:', error);
			}
		});
	});

	console.log(`[WebSocket] Server started on port ${port}`);
	return wss;
}

// Broadcast message to all connected clients
export function broadcast(message: WSMessage): void {
	const data = JSON.stringify(message);
	
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
}

// Broadcast agent status update
export function broadcastStatus(update: AgentStatusUpdate): void {
	broadcast({ type: 'status', data: update });
}

// Broadcast chat message
export function broadcastMessage(message: Message): void {
	broadcast({ type: 'message', data: message });
}

// Get connected clients count
export function getConnectedClientsCount(): number {
	return clients.size;
}

// Close WebSocket server
export function closeWebSocketServer(): void {
	if (wss) {
		clients.forEach((client) => {
			client.close();
		});
		clients.clear();
		wss.close();
		wss = null;
	}
}
