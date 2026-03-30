/**
 * Heretek OpenClaw — Channel Manager
 * ==============================================================================
 * Manages real-time agent communication channels with subscriptions and routing.
 * 
 * Channels: global, triad, governance, explorer, sentinel
 * 
 * Usage:
 *   const ChannelManager = require('./channel-manager');
 *   const manager = new ChannelManager();
 *   await manager.start();
 * ==============================================================================
 */

// Redis for cross-container communication
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  console.warn('[ChannelManager] ioredis not available, Redis features disabled');
  Redis = null;
}

// Predefined channel definitions
const CHANNEL_DEFINITIONS = {
    global: {
        name: 'global',
        description: 'Global broadcast channel for all agents',
        subscribers: ['*'], // wildcard means all agents
        persistence: true
    },
    triad: {
        name: 'triad',
        description: 'Core triad communication (alpha, beta, charlie)',
        subscribers: ['alpha', 'beta', 'charlie'],
        persistence: true
    },
    governance: {
        name: 'governance',
        description: 'Governance and decision-making channel',
        subscribers: ['steward', 'examiner', 'sentinel'],
        persistence: true
    },
    explorer: {
        name: 'explorer',
        description: 'Research and exploration channel',
        subscribers: ['explorer', 'historian', 'dreamer'],
        persistence: true
    },
    sentinel: {
        name: 'sentinel',
        description: 'Security and monitoring channel',
        subscribers: ['sentinel', 'security'],
        persistence: false
    }
};

// Redis channel prefix
const CHANNEL_PREFIX = 'channel:';

/**
 * ChannelManager - Manages named communication channels for agents
 */
class ChannelManager {
    constructor(config = {}) {
        this.config = {
            redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
            wsPort: config.wsPort || parseInt(process.env.WS_PORT || '3001'),
            ...config
        };

        // Redis clients
        this.redis = null;
        this.subscriber = null;
        
        // State tracking
        this.isRunning = false;
        this.agentSubscriptions = new Map(); // agentId -> Set of channels
        this.channelSubscribers = new Map(); // channel -> Set of agents
        this.eventHandlers = new Map(); // eventType -> Array of handlers
        this.messageHandlers = new Map(); // channel -> Array of handlers
        
        // Initialize subscriber sets
        for (const channelName of Object.keys(CHANNEL_DEFINITIONS)) {
            this.channelSubscribers.set(channelName, new Set());
        }
    }

    /**
     * Start the channel manager
     */
    async start() {
        if (this.isRunning) {
            console.log('[ChannelManager] Already running');
            return;
        }

        console.log('[ChannelManager] Starting...');

        // Check if Redis is available
        if (!Redis) {
            console.warn('[ChannelManager] ioredis not available, running in degraded mode');
            this.isRunning = true;
            this.emitEvent('manager:started', { timestamp: new Date().toISOString() });
            return;
        }

        try {
            // Create Redis clients
            this.redis = new Redis(this.config.redisUrl);
            this.subscriber = new Redis(this.config.redisUrl);

            // Test connection
            await this.redis.ping();
            console.log('[ChannelManager] Redis connected');

            // Setup Redis subscriptions
            await this.setupRedisSubscriptions();

            // Auto-subscribe agents based on channel definitions
            await this.autoSubscribeAgents();

            this.isRunning = true;
            console.log('[ChannelManager] Started successfully');

            // Emit startup event
            this.emitEvent('manager:started', { timestamp: new Date().toISOString() });

        } catch (error) {
            console.error('[ChannelManager] Failed to start:', error);
            throw error;
        }
    }

    /**
     * Stop the channel manager
     */
    async stop() {
        if (!this.isRunning) return;

        console.log('[ChannelManager] Stopping...');

        // Clear all subscriptions
        this.agentSubscriptions.clear();
        for (const [channel, subscribers] of this.channelSubscribers) {
            subscribers.clear();
        }

        // Close Redis connections
        if (this.subscriber) {
            await this.subscriber.quit();
        }
        if (this.redis) {
            await this.redis.quit();
        }

        this.isRunning = false;
        console.log('[ChannelManager] Stopped');

        // Emit stopped event
        this.emitEvent('manager:stopped', { timestamp: new Date().toISOString() });
    }

    /**
     * Subscribe an agent to a channel
     * @param {string} agentId - Agent identifier
     * @param {string} channelName - Channel to subscribe to
     */
    async subscribe(agentId, channelName) {
        if (!CHANNEL_DEFINITIONS[channelName]) {
            throw new Error(`Unknown channel: ${channelName}`);
        }

        // Add to agent subscriptions
        if (!this.agentSubscriptions.has(agentId)) {
            this.agentSubscriptions.set(agentId, new Set());
        }
        this.agentSubscriptions.get(agentId).add(channelName);

        // Add to channel subscribers
        this.channelSubscribers.get(channelName).add(agentId);

        // Subscribe to Redis channel for this agent
        const redisChannel = this.getRedisChannel(channelName);
        await this.subscriber.subscribe(redisChannel);

        // Emit subscription event
        this.emitEvent('agent:subscribed', {
            agentId,
            channel: channelName,
            timestamp: new Date().toISOString()
        });

        console.log(`[ChannelManager] Agent ${agentId} subscribed to ${channelName}`);
    }

    /**
     * Unsubscribe an agent from a channel
     * @param {string} agentId - Agent identifier
     * @param {string} channelName - Channel to unsubscribe from
     */
    async unsubscribe(agentId, channelName) {
        // Remove from agent subscriptions
        const agentChannels = this.agentSubscriptions.get(agentId);
        if (agentChannels) {
            agentChannels.delete(channelName);
        }

        // Remove from channel subscribers
        const channelSubs = this.channelSubscribers.get(channelName);
        if (channelSubs) {
            channelSubs.delete(agentId);
        }

        // Emit unsubscription event
        this.emitEvent('agent:unsubscribed', {
            agentId,
            channel: channelName,
            timestamp: new Date().toISOString()
        });

        console.log(`[ChannelManager] Agent ${agentId} unsubscribed from ${channelName}`);
    }

    /**
     * Publish a message to a channel
     * @param {string} channelName - Target channel
     * @param {object} message - Message payload
     * @param {string} senderId - Sender agent ID
     */
    async publish(channelName, message, senderId = 'system') {
        if (!CHANNEL_DEFINITIONS[channelName]) {
            throw new Error(`Unknown channel: ${channelName}`);
        }

        const enrichedMessage = {
            channel: channelName,
            from: senderId,
            content: message.content || message,
            metadata: message.metadata || {},
            timestamp: new Date().toISOString(),
            messageId: this.generateMessageId()
        };

        // Publish to Redis
        const redisChannel = this.getRedisChannel(channelName);
        await this.redis.publish(redisChannel, JSON.stringify(enrichedMessage));

        // Emit channel message event
        this.emitEvent('channel:message', {
            channel: channelName,
            message: enrichedMessage,
            sender: senderId
        });

        console.log(`[ChannelManager] Message published to ${channelName} by ${senderId}`);

        return enrichedMessage;
    }

    /**
     * Send a message to a specific agent through a channel
     * @param {string} channelName - Source channel
     * @param {string} targetAgent - Target agent ID
     * @param {object} message - Message payload
     * @param {string} senderId - Sender agent ID
     */
    async sendToAgent(channelName, targetAgent, message, senderId = 'system') {
        if (!CHANNEL_DEFINITIONS[channelName]) {
            throw new Error(`Unknown channel: ${channelName}`);
        }

        // Verify target is subscribed to channel
        const subscribers = this.channelSubscribers.get(channelName);
        if (!subscribers || !subscribers.has(targetAgent)) {
            throw new Error(`Agent ${targetAgent} not subscribed to ${channelName}`);
        }

        const directMessage = {
            channel: channelName,
            from: senderId,
            to: targetAgent,
            content: message.content || message,
            type: 'direct',
            metadata: message.metadata || {},
            timestamp: new Date().toISOString(),
            messageId: this.generateMessageId()
        };

        // Publish as direct message
        const redisChannel = `${CHANNEL_PREFIX}${channelName}:direct:${targetAgent}`;
        await this.redis.publish(redisChannel, JSON.stringify(directMessage));

        // Emit send event
        this.emitEvent('message:sent', {
            channel: channelName,
            target: targetAgent,
            message: directMessage,
            sender: senderId
        });

        return directMessage;
    }

    /**
     * Get list of agents subscribed to a channel
     * @param {string} channelName - Channel name
     */
    getChannelSubscribers(channelName) {
        const subscribers = this.channelSubscribers.get(channelName);
        return subscribers ? Array.from(subscribers) : [];
    }

    /**
     * Get channels an agent is subscribed to
     * @param {string} agentId - Agent identifier
     */
    getAgentSubscriptions(agentId) {
        const channels = this.agentSubscriptions.get(agentId);
        return channels ? Array.from(channels) : [];
    }

    /**
     * Get all available channels
     */
    getAvailableChannels() {
        return Object.entries(CHANNEL_DEFINITIONS).map(([name, def]) => ({
            name,
            description: def.description,
            subscriberCount: this.channelSubscribers.get(name)?.size || 0
        }));
    }

    /**
     * Register event handler
     * @param {string} eventType - Event type
     * @param {function} handler - Event handler function
     */
    onEvent(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    /**
     * Register message handler for specific channel
     * @param {string} channelName - Channel name
     * @param {function} handler - Message handler function
     */
    onMessage(channelName, handler) {
        if (!this.messageHandlers.has(channelName)) {
            this.messageHandlers.set(channelName, []);
        }
        this.messageHandlers.get(channelName).push(handler);
    }

    /**
     * Setup Redis subscriptions for all channels
     */
    async setupRedisSubscriptions() {
        // Subscribe to pattern for all channel messages
        const channelPatterns = Object.keys(CHANNEL_DEFINITIONS).map(
            name => `${CHANNEL_PREFIX}${name}:*`
        );

        await this.subscriber.psubscribe(...channelPatterns);

        this.subscriber.on('pmessage', (pattern, channel, message) => {
            this.handleRedisMessage(pattern, channel, message);
        });

        console.log(`[ChannelManager] Subscribed to channel patterns: ${channelPatterns.join(', ')}`);
    }

    /**
     * Handle incoming Redis messages
     */
    handleRedisMessage(pattern, channel, message) {
        try {
            const data = JSON.parse(message);
            
            // Extract channel name from pattern
            const channelName = pattern.replace(CHANNEL_PREFIX, '').replace(':*', '');
            
            // Notify message handlers
            const handlers = this.messageHandlers.get(channelName);
            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        handler(data, channelName);
                    } catch (err) {
                        console.error(`[ChannelManager] Message handler error:`, err);
                    }
                });
            }

            // Emit channel activity event
            this.emitEvent('channel:activity', {
                channel: channelName,
                message: data,
                rawChannel: channel
            });

        } catch (error) {
            console.error('[ChannelManager] Failed to handle Redis message:', error);
        }
    }

    /**
     * Auto-subscribe agents based on channel definitions
     */
    async autoSubscribeAgents() {
        for (const [channelName, def] of Object.entries(CHANNEL_DEFINITIONS)) {
            if (def.subscribers.includes('*')) {
                // For global channel, subscribe any connected agent
                console.log(`[ChannelManager] Global channel ready for wildcard subscriptions`);
            } else {
                // Subscribe defined agents
                for (const agentId of def.subscribers) {
                    await this.subscribe(agentId, channelName);
                }
            }
        }
    }

    /**
     * Emit an event to all registered handlers
     */
    emitEvent(eventType, data) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (err) {
                    console.error(`[ChannelManager] Event handler error for ${eventType}:`, err);
                }
            });
        }

        // Also emit to wildcard handlers
        const wildcardHandlers = this.eventHandlers.get('*');
        if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => {
                try {
                    handler(eventType, data);
                } catch (err) {
                    console.error(`[ChannelManager] Wildcard event handler error:`, err);
                }
            });
        }
    }

    /**
     * Get Redis channel name
     */
    getRedisChannel(channelName) {
        return `${CHANNEL_PREFIX}${channelName}`;
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get channel manager status
     */
    getStatus() {
        return {
            running: this.isRunning,
            channels: this.getAvailableChannels(),
            totalSubscriptions: this.agentSubscriptions.size,
            activeHandlers: this.eventHandlers.size + this.messageHandlers.size
        };
    }
}

// Export for Node.js
module.exports = {
    ChannelManager,
    CHANNEL_DEFINITIONS,
    CHANNEL_PREFIX
};

// Export singleton for easy use
let singleton = null;

async function getChannelManager(config) {
    if (!singleton) {
        singleton = new ChannelManager(config);
        await singleton.start();
    }
    return singleton;
}

async function stopChannelManager() {
    if (singleton) {
        await singleton.stop();
        singleton = null;
    }
}

module.exports.getChannelManager = getChannelManager;
module.exports.stopChannelManager = stopChannelManager;