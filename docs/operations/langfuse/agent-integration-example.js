/**
 * Langfuse Integration Example for Heretek OpenClaw Agents
 * =============================================================================
 * This example demonstrates how to integrate Langfuse observability into
 * OpenClaw agents for tracing A2A communication, cost tracking, and session
 * analytics.
 * 
 * Usage: Copy this pattern into your agent's main script or skill modules.
 * 
 * Documentation: docs/operations/LANGFUSE_OBSERVABILITY.md
 */

const { Langfuse } = require('langfuse');

// =============================================================================
// Langfuse Client Initialization
// =============================================================================

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST || 'http://localhost:3000',
  release: process.env.LANGFUSE_RELEASE || '2.0.3',
  environment: process.env.LANGFUSE_ENVIRONMENT || 'production',
  debug: process.env.LANGFUSE_DEBUG === 'true'
});

// Handle Langfuse errors gracefully
langfuse.onError((error) => {
  console.error('[Langfuse] Error:', error.message);
  // Continue agent execution - observability is non-blocking
});

// =============================================================================
// A2A Message Tracing Example
// =============================================================================

/**
 * Trace an Agent-to-Agent deliberation message
 * @param {Object} params - Message parameters
 * @param {string} params.sessionId - Session identifier
 * @param {string} params.agentId - Agent identifier (steward, alpha, etc.)
 * @param {Object} params.message - Message content
 * @param {string} params.recipientAgent - Target agent for A2A message
 * @returns {Promise<Object>} - Trace result
 */
async function traceA2AMessage({ sessionId, agentId, message, recipientAgent }) {
  const traceId = `a2a-${sessionId}-${Date.now()}`;
  
  // Create trace for A2A communication
  const trace = langfuse.trace({
    id: traceId,
    name: 'a2a-deliberation',
    sessionId: sessionId,
    userId: agentId,
    tags: ['a2a', 'deliberation', 'openclaw'],
    metadata: {
      sourceAgent: agentId,
      targetAgent: recipientAgent,
      messageType: message.type || 'message',
      priority: message.priority || 'normal',
      collective: 'Heretek OpenClaw',
      gateway: 'v2026.3.28'
    }
  });

  // Create span for message sending
  const sendSpan = trace.span({
    name: 'a2a-message-send',
    metadata: {
      direction: 'outbound',
      protocol: 'websocket-rpc',
      endpoint: 'ws://127.0.0.1:18789'
    }
  });

  try {
    // Record the message content
    sendSpan.generation({
      name: 'message-content',
      input: {
        role: message.role || 'user',
        content: message.content,
        metadata: message.metadata
      },
      metadata: {
        timestamp: Date.now(),
        agentId: agentId
      }
    });

    // Simulate A2A message send (replace with actual Gateway RPC call)
    const response = await sendA2AMessageViaGateway({
      sessionId,
      agentId,
      recipientAgent,
      message
    });

    // Record the response
    sendSpan.generation({
      name: 'message-response',
      output: {
        status: response.status,
        content: response.content,
        latency: response.latency
      },
      metadata: {
        timestamp: Date.now()
      }
    });

    // Score the interaction (optional - for quality tracking)
    trace.score({
      name: 'message-success',
      value: response.status === 'success' ? 1 : 0,
      comment: response.status === 'success' 
        ? 'A2A message delivered successfully' 
        : `Failed: ${response.error}`
    });

    return { traceId, success: true };
  } catch (error) {
    sendSpan.generation({
      name: 'message-error',
      output: {
        error: error.message,
        stack: error.stack
      }
    });

    trace.score({
      name: 'message-success',
      value: 0,
      comment: `Error: ${error.message}`
    });

    return { traceId, success: false, error: error.message };
  } finally {
    // Always finalize the span
    sendSpan.end();
    
    // Flush to ensure traces are sent
    await langfuse.flushAsync();
  }
}

// =============================================================================
// Triad Deliberation Tracing Example
// =============================================================================

/**
 * Trace a complete triad deliberation cycle
 * @param {Object} params - Deliberation parameters
 * @param {string} params.sessionId - Session identifier
 * @param {Object} params.proposal - Proposal content
 * @returns {Promise<Object>} - Deliberation trace result
 */
async function traceTriadDeliberation({ sessionId, proposal }) {
  const traceId = `triad-${sessionId}-${Date.now()}`;
  
  const trace = langfuse.trace({
    id: traceId,
    name: 'triad-deliberation',
    sessionId: sessionId,
    tags: ['triad', 'consensus', 'governance'],
    metadata: {
      proposalId: proposal.id,
      proposalType: proposal.type,
      triadMembers: ['alpha', 'beta', 'charlie'],
      collective: 'Heretek OpenClaw'
    }
  });

  const votes = [];
  
  // Trace each triad member's deliberation
  for (const agent of ['alpha', 'beta', 'charlie']) {
    const agentSpan = trace.span({
      name: `triad-member-${agent}`,
      metadata: {
        agent: agent,
        role: 'triad_member',
        deliberationOrder: votes.length + 1
      }
    });

    try {
      // Record proposal input
      agentSpan.generation({
        name: 'proposal-input',
        input: { content: proposal.content },
        metadata: { timestamp: Date.now() }
      });

      // Simulate agent deliberation (replace with actual agent call)
      const vote = await deliberateAsTriadMember(agent, proposal);
      
      // Record vote output
      agentSpan.generation({
        name: 'vote-output',
        output: {
          vote: vote.decision,
          reasoning: vote.reasoning,
          confidence: vote.confidence
        },
        metadata: { timestamp: Date.now() }
      });

      votes.push(vote);
    } catch (error) {
      agentSpan.generation({
        name: 'deliberation-error',
        output: { error: error.message }
      });
      votes.push({ agent, decision: 'error', error: error.message });
    } finally {
      agentSpan.end();
    }
  }

  // Calculate consensus
  const approveVotes = votes.filter(v => v.decision === 'approve').length;
  const consensus = approveVotes >= 2;

  // Record consensus result
  trace.generation({
    name: 'consensus-result',
    input: { votes },
    output: {
      consensus,
      approveCount: approveVotes,
      rejectCount: votes.length - approveVotes,
      decision: consensus ? 'APPROVED' : 'REJECTED'
    },
    metadata: {
      timestamp: Date.now(),
      quorum: votes.length === 3
    }
  });

  // Score the deliberation quality
  const deliberationQuality = calculateDeliberationQuality(votes);
  trace.score({
    name: 'deliberation-quality',
    value: deliberationQuality,
    comment: `Consensus ${consensus ? 'reached' : 'not reached'} with ${approveVotes}/3 votes`
  });

  await langfuse.flushAsync();

  return {
    traceId,
    consensus,
    votes,
    decision: consensus ? 'APPROVED' : 'REJECTED'
  };
}

// =============================================================================
// Cost Tracking Example
// =============================================================================

/**
 * Track LLM usage with cost attribution
 * @param {Object} params - Usage parameters
 * @param {string} params.agentId - Agent identifier
 * @param {string} params.model - Model name used
 * @param {Object} params.usage - Token usage data
 * @param {Object} params.response - LLM response
 */
async function trackLLMUsage({ agentId, model, usage, response }) {
  const trace = langfuse.trace({
    id: `llm-usage-${agentId}-${Date.now()}`,
    name: 'llm-completion',
    userId: agentId,
    tags: ['llm', 'cost-tracking', model],
    metadata: {
      agent: agentId,
      model: model,
      collective: 'Heretek OpenClaw'
    }
  });

  // Calculate costs (example rates - adjust for your provider)
  const costRates = {
    'minimax/MiniMax-M2.7': { input: 0.0001, output: 0.0002 },
    'z.ai/glm-4.5': { input: 0.00008, output: 0.00016 },
    'ollama/llama3': { input: 0, output: 0 } // Local model
  };

  const rates = costRates[model] || { input: 0.0001, output: 0.0002 };
  const inputCost = (usage.promptTokens || 0) * rates.input;
  const outputCost = (usage.completionTokens || 0) * rates.output;
  const totalCost = inputCost + outputCost;

  const generation = trace.generation({
    name: 'agent-completion',
    model: model,
    modelParameters: {
      maxTokens: 8192,
      temperature: 0.7
    },
    input: usage.messages || [],
    output: response,
    usage: {
      input: usage.promptTokens,
      output: usage.completionTokens,
      total: usage.totalTokens
    },
    metadata: {
      agent: agentId,
      cost: {
        input: inputCost,
        output: outputCost,
        total: totalCost,
        currency: 'USD',
        rates: rates
      },
      timestamp: Date.now()
    }
  });

  await langfuse.flushAsync();

  return {
    traceId: generation.traceId,
    cost: {
      input: inputCost,
      output: outputCost,
      total: totalCost,
      currency: 'USD'
    }
  };
}

// =============================================================================
// Session Analytics Example
// =============================================================================

/**
 * Track a user session across multiple agent interactions
 * @param {Object} params - Session parameters
 * @param {string} params.sessionId - Session identifier
 * @param {string} params.userId - User identifier
 * @param {Object} params.request - Initial request
 */
async function trackSession({ sessionId, userId, request }) {
  const trace = langfuse.trace({
    id: `session-${sessionId}`,
    name: 'user-session',
    sessionId: sessionId,
    userId: userId,
    tags: ['session', 'user-interaction'],
    metadata: {
      userAgent: request.headers?.['user-agent'] || 'unknown',
      startTime: Date.now(),
      collective: 'Heretek OpenClaw',
      gateway: 'v2026.3.28'
    }
  });

  // Track session start event
  trace.event({
    name: 'session-start',
    input: {
      request: request.content,
      timestamp: Date.now()
    }
  });

  return {
    traceId: trace.id,
    sessionId,
    trackEvent: (eventName, eventData) => {
      trace.event({
        name: eventName,
        ...eventData
      });
    },
    endSession: async (response) => {
      trace.event({
        name: 'session-end',
        output: {
          response: response,
          duration: Date.now() - trace.metadata.startTime
        }
      });
      await langfuse.flushAsync();
    }
  };
}

// =============================================================================
// Helper Functions (Implement based on your agent's architecture)
// =============================================================================

async function sendA2AMessageViaGateway({ sessionId, agentId, recipientAgent, message }) {
  // Implement actual Gateway WebSocket RPC call
  // This is a placeholder for demonstration
  return {
    status: 'success',
    content: 'Message delivered',
    latency: 150
  };
}

async function deliberateAsTriadMember(agent, proposal) {
  // Implement actual agent deliberation logic
  // This is a placeholder for demonstration
  return {
    agent,
    decision: Math.random() > 0.3 ? 'approve' : 'reject',
    reasoning: `Agent ${agent} has reviewed the proposal`,
    confidence: 0.85
  };
}

function calculateDeliberationQuality(votes) {
  // Simple quality metric based on vote distribution
  const approveCount = votes.filter(v => v.decision === 'approve').length;
  const rejectCount = votes.filter(v => v.decision === 'reject').length;
  const errorCount = votes.filter(v => v.decision === 'error').length;
  
  if (errorCount > 0) return 0.5; // Reduce quality for errors
  if (approveCount === 3 || rejectCount === 3) return 1.0; // Unanimous
  return 0.8; // Split decision
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

// Ensure all traces are flushed before process exit
process.on('SIGTERM', async () => {
  console.log('[Langfuse] Flushing traces on shutdown...');
  await langfuse.shutdownAsync();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Langfuse] Flushing traces on interrupt...');
  await langfuse.shutdownAsync();
  process.exit(0);
});

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  langfuse,
  traceA2AMessage,
  traceTriadDeliberation,
  trackLLMUsage,
  trackSession
};
