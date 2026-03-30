/**
 * Heretek OpenClaw — Redis to WebSocket Bridge
 * ==============================================================================
 * Bridges Redis Pub/Sub messages to WebSocket for real-time UI updates.
 * 
 * Usage:
 *   const bridge = new RedisToWebSocketBridge({ wsPort: 3001 });
 *   await bridge.start();
 * ==============================================================================
 */

const Redis = require('ioredis');

// Redis channel constants
const CHANNELS = {
    // Per-agent inbox channels
    steward: 'a2a:steward:inbox',
    alpha: 'a2a:alpha:inbox',
    beta: 'a2a:beta:inbox',
    charlie: 'a2a:charlie:inbox',
    examiner: 'a2a:examiner:inbox',
    explorer: 'a2a:explorer:inbox',
    sentinel: 'a2a:sentinel:inbox',
    coder: 'a2a:coder:inbox',
    dreamer: 'a2a:dreamer:inbox',
    empath: 'a2a:empath:inbox',
    historian: 'a2a:historian:inbox',
    
    // Broadcast channels
    triad: 'a2a:triad:broadcast',
    collective: 'a2a:collective:broadcast',
    
    // System channels
    health: 'a2a:system:health',
    errors: 'a2a:system:errors',
    messageflow: 'a2a:system:messageflow'
};

class RedisToWebSocketBridge {
    constructor(config) {
        config = config || {};
        this.wsPort = config.wsPort || parseInt(process.env.WS_PORT || '3001');
        this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
        this.clients = new Set();
        this.isRunning = false;
        this.wsServer = null;
        
        // Create Redis clients
        this.redis = new Redis(this.redisUrl);
        this.subscriber = new Redis(this.redisUrl);
    }

    /**
     * Start the bridge - connect to Redis and start WebSocket server
     */
    async start() {
        if (this.isRunning) {
            console.log('[RedisToWebSocketBridge] Already running');
            return;
        }

        console.log('[RedisToWebSocketBridge] Starting bridge...');
        
        try {
            // Connect to Redis
            await this.redis.ping();
            console.log('[RedisToWebSocketBridge] Redis connected');
            
            // Setup WebSocket server
            await this.setupWebSocketServer();
            
            // Subscribe to messageflow channel
            await this.subscribeToChannels();
            
            this.isRunning = true;
            console.log(`[RedisToWebSocketBridge] Bridge running on port ${this.wsPort}`);
        } catch (error) {
            console.error('[RedisToWebSocketBridge] Failed to start:', error);
            throw error;
        }
    }

    /**
     * Stop the bridge gracefully
     */
    async stop() {
        if (!this.isRunning) return;

        console.log('[RedisToWebSocketBridge] Stopping bridge...');
        
        await this.subscriber.quit();
        await this.redis.quit();
        this.clients.forEach(client => client.close());
        this.clients.clear();
        
        this.isRunning = false;
        console.log('[RedisToWebSocketBridge] Bridge stopped');
    }

    /**
     * Setup WebSocket server
     */
    async setupWebSocketServer() {
        // Dynamic import for ws module
        const WebSocket = require('ws');
        
        this.wsServer = new WebSocket.Server({ port: this.wsPort });
        
        this.wsServer.on('connection', (ws) => {
            console.log('[RedisToWebSocketBridge] Client connected');
            this.clients.add(ws);
            
            ws.on('close', () => {
                console.log('[RedisToWebSocketBridge] Client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('[RedisToWebSocketBridge] Client error:', error.message);
                this.clients.delete(ws);
            });

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                timestamp: new Date().toISOString()
            }));
        });
        
        this.wsServer.on('error', (error) => {
            console.error('[RedisToWebSocketBridge] Server error:', error.message);
        });
        
        console.log(`[RedisToWebSocketBridge] WebSocket server listening on port ${this.wsPort}`);
    }

    /**
     * Subscribe to Redis channels for A2A messages
     */
    async subscribeToChannels() {
        const channels = [
            CHANNELS.messageflow,
            CHANNELS.collective,
            CHANNELS.health,
            CHANNELS.errors
        ];

        await this.subscriber.subscribe(...channels);
        
        this.subscriber.on('message', (channel, message) => {
            this.handleRedisMessage(channel, message);
        });
        
        console.log(`[RedisToWebSocketBridge] Subscribed to channels: ${channels.join(', ')}`);
    }

    /**
     * Handle incoming Redis messages
     */
    handleRedisMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            
            const wsMessage = {
                type: this.getMessageType(channel),
                data: data,
                timestamp: new Date().toISOString()
            };
            
            this.broadcast(wsMessage);
        } catch (error) {
            console.error('[RedisToWebSocketBridge] Failed to parse message:', error);
        }
    }

    /**
     * Determine message type based on channel
     */
    getMessageType(channel) {
        if (channel === CHANNELS.messageflow) return 'a2a';
        if (channel === CHANNELS.health) return 'health';
        if (channel === CHANNELS.errors) return 'error';
        return 'status';
    }

    /**
     * Broadcast message to all connected WebSocket clients
     */
    broadcast(message) {
        const payload = JSON.stringify(message);
        
        this.clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
                client.send(payload);
            }
        });
    }

    /**
     * Publish message to Redis channel
     */
    async publish(channel, data) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        await this.redis.publish(channel, message);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            running: this.isRunning,
            clients: this.clients.size,
            port: this.wsPort
        };
    }
}

// Export for Node.js
module.exports = {
    RedisToWebSocketBridge,
    CHANNELS
};

// Export singleton for easy use
let singleton = null;

async function getBridge() {
    if (!singleton) {
        const WebSocket = require('ws');
        singleton = new RedisToWebSocketBridge();
        await singleton.start();
    }
    return singleton;
}

async function stopBridge() {
    if (singleton) {
        await singleton.stop();
        singleton = null;
    }
}

module.exports.getBridge = getBridge;
module.exports.stopBridge = stopBridge;