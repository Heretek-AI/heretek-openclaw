/**
 * Heretek OpenClaw — Multi-Collective Registry
 * ===============================================
 * Enables communication between multiple agent collectives.
 * 
 * Architecture:
 * - Each collective has a unique ID and name
 * - Collectives register with each other via Redis
 * - Cross-collective messages are routed through registry
 * 
 * Usage:
 *   const collective = require('./modules/collective/registry');
 *   
 *   // Register this collective
 *   collective.register();
 *   
 *   // Discover other collectives
 *   const others = await collective.discover();
 *   
 *   // Send message to another collective
 *   await collective.sendTo('other-collective', { type: 'task', content: '...' });
 * 
 * Environment Variables:
 *   COLLECTIVE_ID     - Unique ID for this collective (default: auto-generated)
 *   COLLECTIVE_NAME  - Human-readable name
 *   COLLECTIVE_URL   - External URL for this collective
 *   PEER_COLLECTIVES - Comma-separated list of peer collective URLs
 * 
 * Run: node modules/collective/registry.js (for testing)
 */

const fs = require('fs');
const path = require('path');

// Configuration from environment
const config = {
    collectiveId: process.env.COLLECTIVE_ID || `col_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    collectiveName: process.env.COLLECTIVE_NAME || 'heretek-openclaw',
    collectiveUrl: process.env.COLLECTIVE_URL || 'http://localhost:4000',
    peerCollectives: (process.env.PEER_COLLECTIVES || '').split(',').filter(Boolean),
    redisHost: process.env.REDIS_HOST || 'redis',
    redisPort: process.env.REDIS_PORT || 6379,
    registryTtl: 300, // 5 minutes
    stateDir: process.env.STATE_DIR || '/app/state'
};

// Ensure state directory exists
try {
    fs.mkdirSync(config.stateDir, { recursive: true });
} catch (e) {}

// Simple logging
function log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [COLLECTIVE] [${level}] ${message}`);
}

// Simple Redis client using ioredis if available, or http fallback
let redisClient = null;

async function getRedisClient() {
    if (redisClient) return redisClient;
    
    try {
        const Redis = require('ioredis');
        redisClient = new Redis({
            host: config.redisHost,
            port: config.redisPort,
            retryStrategy: (times) => Math.min(times * 500, 5000)
        });
        
        await redisClient.ping();
        log('INFO', 'Connected to Redis');
        return redisClient;
    } catch (e) {
        log('WARN', 'Redis not available, using in-memory mode');
        return null;
    }
}

// In-memory registry for fallback
const memoryRegistry = {
    collectives: new Map(),
    messages: []
};

// Collective registration
async function register() {
    const client = await getRedisClient();
    
    const info = {
        id: config.collectiveId,
        name: config.collectiveName,
        url: config.collectiveUrl,
        registeredAt: Date.now(),
        lastSeen: Date.now(),
        agentCount: 11, // Current count
        version: '2.0.0'
    };
    
    if (client) {
        try {
            await client.setex(
                `collective:${config.collectiveId}`,
                config.registryTtl,
                JSON.stringify(info)
            );
            log('INFO', `Registered collective: ${config.collectiveName} (${config.collectiveId})`);
        } catch (e) {
            log('ERROR', `Failed to register: ${e.message}`);
        }
    } else {
        memoryRegistry.collectives.set(config.collectiveId, info);
        log('INFO', `Registered (in-memory): ${config.collectiveName}`);
    }
    
    // Store locally
    try {
        fs.writeFileSync(
            path.join(config.stateDir, 'collective-info.json'),
            JSON.stringify(info, null, 2)
        );
    } catch (e) {}
    
    return info;
}

// Discover other collectives
async function discover() {
    const client = await getRedisClient();
    const collectives = [];
    
    if (client) {
        try {
            // Scan for collective keys
            const keys = await client.keys('collective:*');
            
            for (const key of keys) {
                const data = await client.get(key);
                if (data) {
                    const info = JSON.parse(data);
                    // Filter out self
                    if (info.id !== config.collectiveId) {
                        collectives.push(info);
                    }
                }
            }
        } catch (e) {
            log('WARN', `Discovery error: ${e.message}`);
        }
    } else {
        // Use peer list from environment
        for (const url of config.peerCollectives) {
            collectives.push({
                id: `peer_${Buffer.from(url).toString('base64').substr(0, 8)}`,
                name: 'Peer Collective',
                url: url.trim(),
                discovered: true
            });
        }
    }
    
    log('INFO', `Discovered ${collectives.length} other collective(s)`);
    return collectives;
}

// Send message to another collective
async function sendTo(collectiveId, message) {
    const client = await getRedisClient();
    
    const envelope = {
        from: config.collectiveId,
        fromName: config.collectiveName,
        to: collectiveId,
        type: message.type || 'message',
        content: message.content || message,
        timestamp: Date.now(),
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
    
    if (client) {
        // Publish to cross-collective channel
        await client.publish('cross-collective', JSON.stringify(envelope));
        
        // Also store in queue for reliability
        await client.lpush(
            `collective:${collectiveId}:inbox`,
            JSON.stringify(envelope)
        );
        
        log('INFO', `Sent message to ${collectiveId}: ${envelope.type}`);
    } else {
        memoryRegistry.messages.push(envelope);
        log('INFO', `Queued message to ${collectiveId} (offline)`);
    }
    
    return envelope;
}

// Broadcast to all known collectives
async function broadcast(message) {
    const collectives = await discover();
    const results = [];
    
    for (const col of collectives) {
        try {
            const result = await sendTo(col.id, message);
            results.push({ collective: col.id, status: 'sent' });
        } catch (e) {
            results.push({ collective: col.id, status: 'failed', error: e.message });
        }
    }
    
    log('INFO', `Broadcast to ${results.length} collective(s)`);
    return results;
}

// Check for incoming messages
async function checkInbox() {
    const client = await getRedisClient();
    const messages = [];
    
    if (client) {
        try {
            // Get messages from inbox
            const key = `collective:${config.collectiveId}:inbox`;
            const count = await client.llen(key);
            
            if (count > 0) {
                // Get up to 10 messages
                const items = await client.lrange(key, 0, Math.min(9, count - 1));
                
                for (const item of items) {
                    try {
                        const msg = JSON.parse(item);
                        messages.push(msg);
                    } catch (e) {}
                }
                
                // Remove processed messages
                await client.del(key);
            }
        } catch (e) {
            log('WARN', `Inbox check error: ${e.message}`);
        }
    } else {
        // Check memory
        const inbox = memoryRegistry.messages.filter(m => m.to === config.collectiveId);
        memoryRegistry.messages = memoryRegistry.messages.filter(m => m.to !== config.collectiveId);
        return inbox;
    }
    
    return messages;
}

// Get collective status
function getStatus() {
    return {
        id: config.collectiveId,
        name: config.collectiveName,
        url: config.collectiveUrl,
        peerCount: config.peerCollectives.length,
        redisAvailable: !!redisClient
    };
}

// Main export
const multiCollective = {
    register,
    discover,
    sendTo,
    broadcast,
    checkInbox,
    getStatus,
    config
};

// Test if run directly
if (require.main === module) {
    console.log('Multi-Collective Registry Test');
    console.log('================================');
    console.log('Config:', getStatus());
    
    async function test() {
        // Register
        await register();
        
        // Discover
        const others = await discover();
        console.log('Discovered:', others.length, 'collectives');
        
        // Send test
        await sendTo('test-collective', { type: 'test', content: 'Hello!' });
        
        console.log('Test complete!');
    }
    
    test().catch(console.error);
}

module.exports = multiCollective;