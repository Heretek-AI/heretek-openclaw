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
    
    public onMessage?: (message: any) => void;
    public onConnect?: () => void;
    public onDisconnect?: () => void;
    public onError?: (error: Event) => void;
    
    constructor(config: WebSocketConfig = {}) {
        this.url = config.url || 'ws://localhost:3001';
        this.reconnectInterval = config.reconnectInterval || 5000;
        this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
        this.reconnectAttempts = 0;
        
        this.onMessage = config.onMessage;
        this.onConnect = config.onConnect;
        this.onDisconnect = config.onDisconnect;
        this.onError = config.onError;
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
     * Send message through WebSocket
     */
    send(message: any): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocketClient] Not connected');
            return false;
        }

        try {
            const payload = typeof message === 'string' ? message : JSON.stringify(message);
            this.ws.send(payload);
            return true;
        } catch (error) {
            console.error('[WebSocketClient] Send error:', error);
            return false;
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
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.onMessage?.(message);
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