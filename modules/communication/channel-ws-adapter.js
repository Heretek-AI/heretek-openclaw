/**
 * Heretek OpenClaw — Channel WebSocket Adapter
 * ==============================================================================
 * Integrates ChannelManager with WebSocket for real-time UI channel updates.
 * 
 * Usage:
 *   const adapter = new ChannelWSAdapter(channelManager);
 *   await adapter.start();
 * ==============================================================================
 */

const WebSocket = require('ws');

// Event types for channel activity
const CHANNEL_EVENTS = {
    CHANNEL_MESSAGE: 'channel:message',
    AGENT_SUBSCRIBED: 'agent:subscribed',
    AGENT_UNSUBSCRIBED: 'agent:unsubscribed',
    CHANNEL_ACTIVITY: 'channel:activity',
    MANAGER_STARTED: 'manager:started',
    MANAGER_STOPPED: 'manager:stopped'
};

/**
 * ChannelWSAdapter - Bridges ChannelManager events to WebSocket clients
 */
class ChannelWSAdapter {
    constructor(channelManager, config = {}) {
        this.channelManager = channelManager;
        this.config = {
            port: config.port || parseInt(process.env.CHANNEL_WS_PORT || '3002'),
            path: config.path || '/channels',
            ...config
        };

        this.wss = null;
        this.clients = new Map(); // clientId -> { ws, subscriptions, metadata }
        this.isRunning = false;
        this.clientCounter = 0;
    }

    /**
     * Start the WebSocket adapter
     */
    async start() {
        if (this.isRunning) {
            console.log('[ChannelWSAdapter] Already running');
            return;
        }

        console.log('[ChannelWSAdapter] Starting...');

        // Subscribe to channel manager events
        this.subscribeToChannelEvents();

        // Create WebSocket server
        this.wss = new WebSocket.Server({
            port: this.config.port,
            path: this.config.path
        });

        this.setupWebSocketServer();

        this.isRunning = true;
        console.log(`[ChannelWSAdapter] Listening on port ${this.config.port}${this.config.path}`);

        return this;
    }

    /**
     * Stop the adapter
     */
    async stop() {
        if (!this.isRunning) return;

        console.log('[ChannelWSAdapter] Stopping...');

        // Close all client connections
        for (const [clientId, clientInfo] of this.clients) {
            clientInfo.ws.close();
        }
        this.clients.clear();

        // Close WebSocket server
        if (this.wss) {
            await new Promise((resolve) => {
                this.wss.close(() => resolve());
            });
        }

        this.isRunning = false;
        console.log('[ChannelWSAdapter] Stopped');
    }

    /**
     * Subscribe to channel manager events
     */
    subscribeToChannelEvents() {
        // Channel messages
        this.channelManager.onEvent(CHANNEL_EVENTS.CHANNEL_MESSAGE, (data) => {
            this.broadcastToChannel(data.channel, {
                type: 'channel_message',
                ...data
            });
        });

        // Agent subscriptions
        this.channelManager.onEvent(CHANNEL_EVENTS.AGENT_SUBSCRIBED, (data) => {
            this.broadcast({
                type: 'agent_subscribed',
                ...data
            });
        });

        // Agent unsubscriptions
        this.channelManager.onEvent(CHANNEL_EVENTS.AGENT_UNSUBSCRIBED, (data) => {
            this.broadcast({
                type: 'agent_unsubscribed',
                ...data
            });
        });

        // Channel activity
        this.channelManager.onEvent(CHANNEL_EVENTS.CHANNEL_ACTIVITY, (data) => {
            this.broadcast({
                type: 'channel_activity',
                ...data
            });
        });

        // Manager status
        this.channelManager.onEvent(CHANNEL_EVENTS.MANAGER_STARTED, (data) => {
            this.broadcast({
                type: 'manager_status',
                status: 'started',
                ...data
            });
        });

        this.channelManager.onEvent(CHANNEL_EVENTS.MANAGER_STOPPED, (data) => {
            this.broadcast({
                type: 'manager_status',
                status: 'stopped',
                ...data
            });
        });

        console.log('[ChannelWSAdapter] Subscribed to channel manager events');
    }

    /**
     * Setup WebSocket server handlers
     */
    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = `client_${++this.clientCounter}`;
            
            this.clients.set(clientId, {
                ws,
                subscriptions: new Set(),
                metadata: {
                    ip: req.socket.remoteAddress,
                    connectedAt: new Date().toISOString()
                }
            });

            console.log(`[ChannelWSAdapter] Client connected: ${clientId}`);

            // Send welcome message
            this.sendToClient(clientId, {
                type: 'connected',
                clientId,
                channels: this.channelManager.getAvailableChannels(),
                timestamp: new Date().toISOString()
            });

            // Handle client messages
            ws.on('message', (data) => {
                this.handleClientMessage(clientId, data.toString());
            });

            // Handle client disconnect
            ws.on('close', () => {
                this.handleClientDisconnect(clientId);
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error(`[ChannelWSAdapter] Client ${clientId} error:`, error.message);
            });
        });

        this.wss.on('error', (error) => {
            console.error('[ChannelWSAdapter] Server error:', error.message);
        });
    }

    /**
     * Handle incoming client messages
     */
    async handleClientMessage(clientId, data) {
        try {
            const message = JSON.parse(data);
            const clientInfo = this.clients.get(clientId);

            switch (message.action) {
                case 'subscribe':
                    // Subscribe to channel
                    await this.handleSubscribe(clientId, message.channel);
                    break;

                case 'unsubscribe':
                    // Unsubscribe from channel
                    this.handleUnsubscribe(clientId, message.channel);
                    break;

                case 'publish':
                    // Publish to channel
                    await this.handlePublish(clientId, message.channel, message.content);
                    break;

                case 'send':
                    // Send to specific agent
                    await this.handleSend(clientId, message.channel, message.to, message.content);
                    break;

                case 'list_channels':
                    // Get available channels
                    this.sendToClient(clientId, {
                        type: 'channel_list',
                        channels: this.channelManager.getAvailableChannels()
                    });
                    break;

                case 'get_subscriptions':
                    // Get client's subscriptions
                    this.sendToClient(clientId, {
                        type: 'subscriptions',
                        channels: Array.from(clientInfo.subscriptions)
                    });
                    break;

                case 'ping':
                    // Keepalive ping
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;

                default:
                    console.warn(`[ChannelWSAdapter] Unknown action: ${message.action}`);
            }
        } catch (error) {
            console.error('[ChannelWSAdapter] Failed to handle client message:', error);
            this.sendToClient(clientId, {
                type: 'error',
                error: error.message
            });
        }
    }

    /**
     * Handle client subscription request
     */
    async handleSubscribe(clientId, channelName) {
        const clientInfo = this.clients.get(clientId);
        if (!clientInfo) return;

        // Add to client's subscriptions
        clientInfo.subscriptions.add(channelName);

        // Notify client of subscription
        this.sendToClient(clientId, {
            type: 'subscribed',
            channel: channelName
        });

        console.log(`[ChannelWSAdapter] Client ${clientId} subscribed to ${channelName}`);
    }

    /**
     * Handle client unsubscription request
     */
    handleUnsubscribe(clientId, channelName) {
        const clientInfo = this.clients.get(clientId);
        if (!clientInfo) return;

        clientInfo.subscriptions.delete(channelName);

        this.sendToClient(clientId, {
            type: 'unsubscribed',
            channel: channelName
        });

        console.log(`[ChannelWSAdapter] Client ${clientId} unsubscribed from ${channelName}`);
    }

    /**
     * Handle publish request
     */
    async handlePublish(clientId, channelName, content) {
        const clientInfo = this.clients.get(clientId);
        if (!clientInfo) return;

        // Publish to channel with client ID as sender
        const message = await this.channelManager.publish(channelName, { content }, clientId);

        // Acknowledge to sender
        this.sendToClient(clientId, {
            type: 'published',
            messageId: message.messageId,
            channel: channelName
        });
    }

    /**
     * Handle send to agent request
     */
    async handleSend(clientId, channelName, targetAgent, content) {
        const clientInfo = this.clients.get(clientId);
        if (!clientInfo) return;

        try {
            const message = await this.channelManager.sendToAgent(
                channelName,
                targetAgent,
                { content },
                clientId
            );

            this.sendToClient(clientId, {
                type: 'sent',
                messageId: message.messageId,
                target: targetAgent
            });
        } catch (error) {
            this.sendToClient(clientId, {
                type: 'error',
                error: error.message
            });
        }
    }

    /**
     * Handle client disconnect
     */
    handleClientDisconnect(clientId) {
        const clientInfo = this.clients.get(clientId);
        if (clientInfo) {
            console.log(`[ChannelWSAdapter] Client disconnected: ${clientId}`);
            this.clients.delete(clientId);
        }
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, message) {
        const clientInfo = this.clients.get(clientId);
        if (clientInfo && clientInfo.ws.readyState === WebSocket.OPEN) {
            clientInfo.ws.send(JSON.stringify({
                ...message,
                timestamp: new Date().toISOString()
            }));
        }
    }

    /**
     * Broadcast to all clients
     */
    broadcast(message) {
        const payload = JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
        });

        for (const [clientId, clientInfo] of this.clients) {
            if (clientInfo.ws.readyState === WebSocket.OPEN) {
                clientInfo.ws.send(payload);
            }
        }
    }

    /**
     * Broadcast to clients subscribed to specific channel
     */
    broadcastToChannel(channelName, message) {
        const payload = JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
        });

        for (const [clientId, clientInfo] of this.clients) {
            if (clientInfo.subscriptions.has(channelName) && 
                clientInfo.ws.readyState === WebSocket.OPEN) {
                clientInfo.ws.send(payload);
            }
        }
    }

    /**
     * Get adapter status
     */
    getStatus() {
        return {
            running: this.isRunning,
            port: this.config.port,
            path: this.config.path,
            clients: this.clients.size,
            channelManager: this.channelManager.getStatus()
        };
    }
}

// Export for Node.js
module.exports = {
    ChannelWSAdapter,
    CHANNEL_EVENTS
};