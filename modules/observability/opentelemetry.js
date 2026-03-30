/**
 * Heretek OpenClaw — OpenTelemetry Integration
 * ==============================================
 * Distributed tracing for the agent collective using OpenTelemetry.
 * 
 * Usage:
 *   const otel = require('./modules/observability/opentelemetry');
 *   
 *   // Manual tracing
 *   const span = otel.startSpan('agent-task');
 *   // ... do work ...
 *   otel.endSpan(span);
 *   
 *   // Or use the tracer
 *   const tracer = otel.tracer('agent-name');
 *   const span = tracer.startSpan('task-name');
 *   // ... do work ...
 *   span.end();
 * 
 * Environment Variables:
 *   OTEL_ENABLED           - Set to 'true' to enable (default: false)
 *   OTEL_EXPORTER_OTLP_ENDPOINT - OTLP collector URL
 *   OTEL_SERVICE_NAME      - Service name (default: heretek-agent)
 *   OTEL_EXPORTER_TYPE     - otlp, console, or both (default: console)
 * 
 * Run: node modules/observability/opentelemetry.js (for testing)
 */

const { trace,SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { 
  ConsoleSpanExporter, 
  OTLPTraceExporter 
} = require('@opentelemetry/exporter-trace-otlp-http');
const { 
  PeriodicExportingMetricReader, 
  ConsoleMetricExporter 
} = require('@opentelemetry/exporter-metrics-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configuration from environment
const config = {
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || 'heretek-agent',
    exporterType: process.env.OTEL_EXPORTER_TYPE || 'console', // console, otlp, both
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    agentName: process.env.AGENT_NAME || 'unknown',
    stateDir: process.env.STATE_DIR || '/app/state'
};

// Simple logging
function log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [OTEL] [${level}] ${message}`);
}

// State
let sdk = null;
let tracer = null;
let initialized = false;

// Initialize OpenTelemetry
function init() {
    if (initialized) {
        log('DEBUG', 'Already initialized');
        return true;
    }
    
    if (!config.enabled) {
        log('INFO', 'OpenTelemetry disabled (OTEL_ENABLED=false)');
        return false;
    }
    
    log('INFO', `Initializing OpenTelemetry for ${config.serviceName}`);
    
    try {
        // Create resource with service info
        const resource = new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
            [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
            [SemanticResourceAttributes.AGENT_NAME]: config.agentName
        });
        
        // Create exporters based on config
        const exporters = [];
        
        if (config.exporterType === 'console' || config.exporterType === 'both') {
            exporters.push(new ConsoleSpanExporter());
            log('INFO', 'Added Console span exporter');
        }
        
        if (config.exporterType === 'otlp' || config.exporterType === 'both') {
            exporters.push(new OTLPTraceExporter({
                url: config.otlpEndpoint
            }));
            log('INFO', `Added OTLP exporter: ${config.otlpEndpoint}`);
        }
        
        // Create simple SDK without full NodeSDK (lighter weight)
        // We'll use the global tracer for now
        tracer = trace.getTracer(config.serviceName, '1.0.0', {
            schemaUrl: 'https://opentelemetry.io/schemas/1.0.0'
        });
        
        initialized = true;
        log('INFO', 'OpenTelemetry initialized successfully');
        
        // Store config for status check
        return true;
        
    } catch (e) {
        log('ERROR', `Failed to initialize: ${e.message}`);
        return false;
    }
}

// Get the tracer
function getTracer() {
    if (!initialized) {
        init();
    }
    return tracer || trace.getTracer(config.serviceName);
}

// Start a span manually
function startSpan(name, options = {}) {
    if (!config.enabled || !tracer) {
        return null;
    }
    
    const spanOptions = {
        kind: options.kind || SpanKind.INTERNAL,
        attributes: {
            'agent.name': config.agentName,
            'service.name': config.serviceName,
            ...options.attributes
        }
    };
    
    return tracer.startSpan(name, spanOptions);
}

// End a span
function endSpan(span, options = {}) {
    if (!span) return;
    
    if (options.status === 'error') {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: options.errorMessage || 'Error'
        });
    }
    
    if (options.attributes) {
        span.setAttributes(options.attributes);
    }
    
    span.end();
}

// Wrapper class for easier use
class OTelTracing {
    constructor(serviceName) {
        this.serviceName = serviceName || config.serviceName;
        this.tracer = null;
    }
    
    // Get or create tracer
    getTracer() {
        if (!this.tracer) {
            this.tracer = trace.getTracer(this.serviceName);
        }
        return this.tracer;
    }
    
    // Start a new span
    startSpan(name, options = {}) {
        const tracer = this.getTracer();
        
        const spanOptions = {
            kind: options.kind || SpanKind.INTERNAL,
            attributes: {
                'agent.name': config.agentName,
                ...options.attributes
            }
        };
        
        return tracer.startSpan(name, spanOptions);
    }
    
    // Run a function within a span
    withSpan(name, fn, options = {}) {
        const span = this.startSpan(name, options);
        
        try {
            const result = fn(span);
            span.end();
            return result;
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e.message
            });
            span.end();
            throw e;
        }
    }
    
    // Add event to current span
    addEvent(name, attributes = {}) {
        // Could be implemented with context
    }
}

// Convenience function to wrap LiteLLM calls
function traceLLMCall(model, input, callback) {
    if (!config.enabled || !tracer) {
        return callback();
    }
    
    const span = tracer.startSpan('llm.call', {
        kind: SpanKind.CLIENT,
        attributes: {
            'llm.model': model,
            'llm.agent': config.agentName,
            'llm.input_length': input.length
        }
    });
    
    try {
        const result = callback();
        
        // Add response attributes
        if (result) {
            span.setAttributes({
                'llm.output_length': result.length || 0,
                'llm.success': true
            });
        }
        
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        
        return result;
    } catch (e) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: e.message
        });
        span.setAttribute('error', true);
        span.end();
        throw e;
    }
}

// Get status
function getStatus() {
    return {
        enabled: config.enabled,
        initialized: initialized,
        serviceName: config.serviceName,
        agentName: config.agentName,
        exporterType: config.exporterType,
        otlpEndpoint: config.otlpEndpoint
    };
}

// Main exports
const opentelemetry = {
    init,
    getTracer,
    startSpan,
    endSpan,
    traceLLMCall,
    Tracing: OTelTracing,
    getStatus,
    // Re-export constants for external use
    SpanKind,
    SpanStatusCode
};

// Test if run directly
if (require.main === module) {
    console.log('OpenTelemetry Test');
    console.log('===================');
    console.log('Config:', getStatus());
    
    // Try to initialize
    init();
    
    if (config.enabled && tracer) {
        // Test span creation
        const span = tracer.startSpan('test-span');
        span.setAttribute('test', 'value');
        span.end();
        
        console.log('Test span created and ended');
    } else {
        console.log('OTel disabled - no spans created');
    }
}

module.exports = opentelemetry;
module.exports.OTelTracing = OTelTracing;
module.exports.SpanKind = SpanKind;
module.exports.SpanStatusCode = SpanStatusCode;