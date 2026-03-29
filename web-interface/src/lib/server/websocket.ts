import { WebSocketServer, WebSocket } from 'ws';
import type { AgentStatusUpdate, Message, WSMessage } from '../types';

// WebSocket server for real-time updates
let wss: WebSocketServer | null = null;
const clients: Set<WebSocket> = new Set();

// Initialize WebSocket server
export function initWebSocketServer(port: number = 3001): WebSocketServer {
	if (wss) {
		return wss;
	}

	wss = new WebSocketServer({ port });

	wss.on('connection', (ws) => {
		clients.add(ws);
		console.log('WebSocket client connected');

		ws.on('close', () => {
			clients.delete(ws);
			console.log('WebSocket client disconnected');
		});

		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
			clients.delete(ws);
		});
	});

	console.log(`WebSocket server started on port ${port}`);
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
