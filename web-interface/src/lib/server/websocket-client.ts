/**
 * Heretek OpenClaw — WebSocket Client for Svelte
 * ==============================================================================
 * Client-side WebSocket connection for real-time A2A message updates.
 * 
 * Usage:
 *   import { createWebSocketConnection } from './websocket-client';
 *   
 *   const connection = createWebSocketConnection({
 *     url: 'ws://localhost:3001',
 *     onMessage: (message) => console.log(message),
 *     onConnect: () => console.log('Connected'),
 *     onDisconnect: () => console.log('Disconnected')
 *   });
 *   
 *   connection.connect();
 *   connection.disconnect();
 * ==============================================================================
 */

import type { A2AMessage } from '../types';

export interface WebSocketConfig {
    url?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    onMessage?: (message: any) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    onAck?: (messageId: string, success: boolean) => void;
}

export interface WebSocketMessage {
    type: 'a2a' | 'status' | 'health' | 'error' | 'connected';
    data?: any;
    timestamp?: string;
}

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectInterval: number;
    private maxReconnectAttempts: number;
    private reconnectAttempts: number;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isManualDisconnect: boolean = false;
    
    // Message queue for offline handling
    private messageQueue: Array<{ message: any; messageId: string }> = [];
    private pendingAcks: Map<string, { resolve: Function; reject: Function; timer: NodeJS.Timeout }> = new Map();
    
    public onMessage?: (message: any) => void;
    public onConnect?: () => void;
    public onDisconnect?: () => void;
    public onError?: (error: Event) => void;
    public onAck?: (messageId: string, success: boolean) => void;
    
    constructor(config: WebSocketConfig = {}) {
        // Use environment variable if available, otherwise use config or default
        const defaultUrl = typeof process !== 'undefined' && process.env?.VITE_WS_URL
            ? process.env.VITE_WS_URL
            : 'ws://localhost:3002';
        this.url = config.url || defaultUrl;
        this.reconnectInterval = config.reconnectInterval || 5000;
        this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
        this.reconnectAttempts = 0;
        
        this.onMessage = config.onMessage;
        this.onConnect = config.onConnect;
        this.onDisconnect = config.onDisconnect;
        this.onError = config.onError;
        this.onAck = config.onAck;
    }

    /**
     * Connect to WebSocket server
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[WebSocketClient] Already connected');
            return;
        }

        this.isManualDisconnect = false;
        this.createConnection();
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.isManualDisconnect = true;
        this.clearReconnectTimer();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Send message through WebSocket with optional acknowledgment
     */
    send(message: any, waitForAck: boolean = true, ackTimeout: number = 10000): Promise<boolean> {
        // If not connected, queue the message
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocketClient] Not connected, queuing message');
            const messageId = this.generateMessageId();
            this.messageQueue.push({ message, messageId });
            return Promise.resolve(false);
        }

        try {
            // Add message ID for tracking
            const messageWithId = typeof message === 'string' 
                ? JSON.parse(message) 
                : { ...message };
            
            if (!messageWithId.messageId) {
                messageWithId.messageId = this.generateMessageId();
            }
            
            const payload = JSON.stringify(messageWithId);
            this.ws.send(payload);
            
            // If waiting for acknowledgment, set up promise
            if (waitForAck) {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        this.pendingAcks.delete(messageWithId.messageId);
                        resolve(false); // Timeout, but message was sent
                    }, ackTimeout);
                    
                    this.pendingAcks.set(messageWithId.messageId, { resolve, reject, timer });
                });
            }
            
            return Promise.resolve(true);
        } catch (error) {
            console.error('[WebSocketClient] Send error:', error);
            return Promise.resolve(false);
        }
    }

    /**
     * Send A2A message to an agent
     */
    sendToAgent(agent: string, content: string, from: string = 'user'): Promise<boolean> {
        return this.send({
            type: 'a2a',
            action: 'send',
            from,
            to: agent,
            content,
            timestamp: new Date().toISOString()
        }, true, 15000);
    }

    /**
     * Get queued messages count
     */
    getQueueLength(): number {
        return this.messageQueue.length;
    }

    /**
     * Clear message queue
     */
    clearQueue(): void {
        this.messageQueue = [];
    }

    /**
     * Flush queued messages
     */
    flushQueue(): void {
        if (!this.isConnected()) {
            console.warn('[WebSocketClient] Cannot flush queue - not connected');
            return;
        }
        
        while (this.messageQueue.length > 0) {
            const item = this.messageQueue.shift();
            if (item) {
                this.send(item.message, false);
            }
        }
    }

    /**
     * Handle acknowledgment from server
     */
    private handleAck(ack: { messageId: string; success: boolean; error?: string }): void {
        const pending = this.pendingAcks.get(ack.messageId);
        if (pending) {
            clearTimeout(pending.timer);
            this.pendingAcks.delete(ack.messageId);
            pending.resolve(ack.success);
            this.onAck?.(ack.messageId, ack.success);
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get connection status
     */
    getStatus(): 'connected' | 'connecting' | 'disconnected' {
        if (!this.ws) return 'disconnected';
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            default: return 'disconnected';
        }
    }

    private createConnection(): void {
        console.log(`[WebSocketClient] Connecting to ${this.url}...`);
        
        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                console.log('[WebSocketClient] Connected');
                this.reconnectAttempts = 0;
                this.onConnect?.();
                
                // Flush queued messages on reconnection
                if (this.messageQueue.length > 0) {
                    console.log(`[WebSocketClient] Flushing ${this.messageQueue.length} queued messages`);
                    this.flushQueue();
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    // Handle acknowledgment messages
                    if (message.type === 'ack') {
                        this.handleAck(message);
                    } else {
                        this.onMessage?.(message);
                    }
                } catch (error) {
                    // Handle non-JSON messages
                    this.onMessage?.(event.data);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log(`[WebSocketClient] Disconnected (code: ${event.code})`);
                this.onDisconnect?.();
                this.handleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('[WebSocketClient] Error:', error);
                this.onError?.(error);
            };
        } catch (error) {
            console.error('[WebSocketClient] Failed to create connection:', error);
            this.handleReconnect();
        }
    }

    private handleReconnect(): void {
        if (this.isManualDisconnect) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WebSocketClient] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 30000);
        
        console.log(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        this.reconnectTimer = setTimeout(() => {
            this.createConnection();
        }, delay);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

/**
 * Create a WebSocket connection with config
 */
export function createWebSocketConnection(config?: WebSocketConfig): WebSocketClient {
    return new WebSocketClient(config);
}

/**
 * Create pre-configured connection for A2A messages
 */
export function createA2AConnection(onMessage?: (message: A2AMessage) => void): WebSocketClient {
    return createWebSocketConnection({
        onMessage: (wsMessage) => {
            if (wsMessage.type === 'a2a' && wsMessage.data) {
                onMessage?.(wsMessage.data as A2AMessage);
            }
        }
    });
}

// Export singleton for easy global access
let globalConnection: WebSocketClient | null = null;

export function getGlobalConnection(): WebSocketClient {
    if (!globalConnection) {
        globalConnection = createWebSocketConnection();
    }
    return globalConnection;
}