/**
 * Heretek OpenClaw — LangFuse Observability Client
 * =================================================
 * LangFuse integration for tracing and observing LLM calls.
 * 
 * Usage:
 *   const langfuse = require('./modules/observability/langfuse-client');
 *   
 *   // Track a generation
 *   const trace = langfuse.trace({ name: 'agent-task', metadata: { agent: 'steward' } });
 *   const generation = trace.generation({ name: 'llm-call', model: 'gpt-4' });
 *   
 *   // End tracking
 *   generation.end({ output: 'response' });
 *   trace.end();
 * 
 * Environment Variables:
 *   LANGFUSE_PUBLIC_KEY  - Your LangFuse public key
 *   LANGFUSE_SECRET_KEY  - Your LangFuse secret key  
 *   LANGFUSE_HOST        - LangFuse host (default: https://cloud.langfuse.com)
 *   LANGFUSE_ENABLED     - Set to 'false' to disable (default: true)
 * 
 * Run: node modules/observability/langfuse-client.js (for testing)
 */

const fs = require('fs');
const path = require('path');

// Configuration from environment
const config = {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
    secretKey: process.env.LANGFUSE_SECRET_KEY || '',
    host: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
    enabled: process.env.LANGFUSE_ENABLED === 'true',
    agentName: process.env.AGENT_NAME || 'unknown',
    stateDir: process.env.STATE_DIR || '/app/state'
};

// Ensure state directory exists
try {
    fs.mkdirSync(config.stateDir, { recursive: true });
} catch (e) {}

// Logging utility
function log(level, message) {
    if (!config.enabled) return;
    
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [LANGFUSE] [${level}] ${message}`;
    console.log(entry);
}

// Simple trace class for manual instrumentation
class LangfuseTrace {
    constructor(options = {}) {
        this.id = options.id || generateId();
        this.name = options.name || 'trace';
        this.metadata = options.metadata || {};
        this.startTime = Date.now();
        this.spans = [];
        this.generations = [];
        
        // Add agent name to metadata
        this.metadata.agent = this.metadata.agent || config.agentName;
        
        log('INFO', `Starting trace: ${this.name} (${this.id})`);
    }
    
    // Create a generation (LLM call)
    generation(options = {}) {
        const gen = new LangfuseGeneration(this, options);
        this.generations.push(gen);
        return gen;
    }
    
    // Create a span (any operation)
    span(options = {}) {
        const span = new LangfuseSpan(this, options);
        this.spans.push(span);
        return span;
    }
    
    // Update metadata
    updateMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
    }
    
    // End the trace
    end(options = {}) {
        const duration = Date.now() - this.startTime;
        
        if (config.enabled && config.publicKey && config.secretKey) {
            // In production, this would send to LangFuse API
            // For now, we log and store locally
            this._sendToLangfuse({
                type: 'trace',
                id: this.id,
                name: this.name,
                metadata: this.metadata,
                startTime: this.startTime,
                endTime: Date.now(),
                duration: duration,
                generations: this.generations.map(g => g.toObject()),
                spans: this.spans.map(s => s.toObject())
            });
        }
        
        log('INFO', `Trace ended: ${this.name} (${duration}ms)`);
        
        // Store trace in state
        this._storeLocally();
    }
    
    _storeLocally() {
        try {
            const file = path.join(config.stateDir, 'langfuse-traces.jsonl');
            const data = JSON.stringify({
                traceId: this.id,
                name: this.name,
                metadata: this.metadata,
                startTime: this.startTime,
                duration: Date.now() - this.startTime,
                generations: this.generations.length,
                spans: this.spans.length
            }) + '\n';
            fs.appendFileSync(file, data);
        } catch (e) {
            log('WARN', `Failed to store trace: ${e.message}`);
        }
    }
    
    _sendToLangfuse(data) {
        // Send trace to LangFuse API
        if (!config.publicKey || !config.secretKey) {
            log('WARN', 'LangFuse credentials not provided, storing locally only');
            return;
        }
        
        const url = `${config.host}/api/public/traces`;
        const payload = {
            id: data.id,
            name: data.name,
            metadata: data.metadata,
            timestamp: new Date(data.startTime).toISOString(),
            tags: [config.agentName]
        };
        
        log('DEBUG', `Sending trace to LangFuse: ${url}`);
        
        // Use fetch API if available (Node 18+), otherwise use https module
        if (typeof fetch !== 'undefined') {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`).toString('base64')}`
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (response.ok) {
                    log('INFO', `Trace sent successfully to LangFuse: ${data.id}`);
                } else {
                    log('ERROR', `Failed to send trace: ${response.status} ${response.statusText}`);
                }
            })
            .catch(err => {
                log('ERROR', `Error sending trace to LangFuse: ${err.message}`);
            });
        } else {
            // Fallback for older Node versions using https module
            const https = require('https');
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify(payload)),
                    'Authorization': `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`).toString('base64')}`
                }
            };
            
            const req = https.request(options, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    log('INFO', `Trace sent successfully to LangFuse: ${data.id}`);
                } else {
                    log('ERROR', `Failed to send trace: ${res.statusCode} ${res.statusMessage}`);
                }
            });
            
            req.on('error', (err) => {
                log('ERROR', `Error sending trace to LangFuse: ${err.message}`);
            });
            
            req.write(JSON.stringify(payload));
            req.end();
        }
    }
}

// Generation class for LLM calls
class LangfuseGeneration {
    constructor(trace, options = {}) {
        this.trace = trace;
        this.id = options.id || generateId();
        this.name = options.name || 'generation';
        this.model = options.model || 'unknown';
        this.metadata = options.metadata || {};
        this.startTime = Date.now();
        this.input = null;
        this.output = null;
        this.usage = { prompt: 0, completion: 0, total: 0 };
        
        log('DEBUG', `Starting generation: ${this.name} (${this.model})`);
    }
    
    // Set input
    setInput(input) {
        this.input = typeof input === 'string' ? input : JSON.stringify(input);
        return this;
    }
    
    // Set output
    setOutput(output) {
        this.output = typeof output === 'string' ? output : JSON.stringify(output);
        return this;
    }
    
    // Update usage
    setUsage(usage) {
        this.usage = { ...this.usage, ...usage };
        return this;
    }
    
    // End generation
    end(options = {}) {
        const duration = Date.now() - this.startTime;
        
        if (options.output) this.setOutput(options.output);
        if (options.input) this.setInput(options.input);
        
        log('DEBUG', `Generation ended: ${this.name} (${duration}ms, ${this.usage.total} tokens)`);
    }
    
    toObject() {
        return {
            id: this.id,
            name: this.name,
            model: this.model,
            startTime: this.startTime,
            endTime: Date.now(),
            duration: Date.now() - this.startTime,
            input: this.input,
            output: this.output,
            usage: this.usage,
            metadata: this.metadata
        };
    }
}

// Span class for any operation
class LangfuseSpan {
    constructor(trace, options = {}) {
        this.trace = trace;
        this.id = options.id || generateId();
        this.name = options.name || 'span';
        this.metadata = options.metadata || {};
        this.startTime = Date.now();
        this.input = null;
        this.output = null;
    }
    
    setInput(input) {
        this.input = typeof input === 'string' ? input : JSON.stringify(input);
        return this;
    }
    
    setOutput(output) {
        this.output = typeof output === 'string' ? output : JSON.stringify(output);
        return this;
    }
    
    end(options = {}) {
        if (options.output) this.setOutput(options.output);
        if (options.input) this.setInput(options.input);
        
        log('DEBUG', `Span ended: ${this.name}`);
    }
    
    toObject() {
        return {
            id: this.id,
            name: this.name,
            startTime: this.startTime,
            endTime: Date.now(),
            duration: Date.now() - this.startTime,
            input: this.input,
            output: this.output,
            metadata: this.metadata
        };
    }
}

// Generate unique ID
function generateId() {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main client
const langfuse = {
    // Create a new trace
    trace(options) {
        return new LangfuseTrace(options);
    },
    
    // Quick generation tracking
    trackGeneration(traceName, generationName, callback) {
        if (!config.enabled) {
            return callback();
        }
        
        const trace = this.trace({ name: traceName });
        const generation = trace.generation({ name: generationName });
        
        try {
            const result = callback(generation);
            generation.end();
            trace.end();
            return result;
        } catch (e) {
            generation.end({ output: `Error: ${e.message}` });
            trace.end({ status: 'error' });
            throw e;
        }
    },
    
    // Configuration
    isEnabled() {
        return config.enabled && !!config.publicKey && !!config.secretKey;
    },
    
    // Get configuration status
    getStatus() {
        return {
            enabled: config.enabled,
            configured: !!(config.publicKey && config.secretKey),
            host: config.host,
            agentName: config.agentName
        };
    }
};

// If run directly, test the client
if (require.main === module) {
    console.log('LangFuse Client Test');
    console.log('===================');
    console.log('Status:', langfuse.getStatus());
    console.log('');
    
    // Test trace
    const trace = langfuse.trace({ 
        name: 'test-trace', 
        metadata: { test: true } 
    });
    
    const gen = trace.generation({ 
        name: 'test-generation',
        model: 'gpt-4'
    });
    
    gen.setInput('Hello, world!');
    gen.setOutput('Hi there! How can I help?');
    gen.setUsage({ prompt: 5, completion: 8, total: 13 });
    gen.end();
    
    trace.end();
    
    console.log('Test complete!');
}

// Export for use in other modules
module.exports = langfuse;
module.exports.LangfuseTrace = LangfuseTrace;
module.exports.LangfuseGeneration = LangfuseGeneration;
module.exports.LangfuseSpan = LangfuseSpan;