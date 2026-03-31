# Plugin Testing Plan

## Overview

This document outlines the comprehensive testing strategy for the six new plugins implemented in the Heretek OpenClaw project. The test plan covers unit tests, integration tests, and end-to-end testing approaches.

**Document Version:** 1.0.0  
**Last Updated:** 2026-03-31  
**Author:** Jest Test Engineer

---

## Table of Contents

1. [Plugin Summary](#plugin-summary)
2. [Test Strategy](#test-strategy)
3. [Plugin Test Details](#plugin-test-details)
4. [Integration Testing](#integration-testing)
5. [Test Execution Plan](#test-execution-plan)
6. [Coverage Requirements](#coverage-requirements)
7. [Test Results](#test-results)

---

## Plugin Summary

| # | Plugin | Directory | Status | Test Coverage |
|---|--------|-----------|--------|---------------|
| 1 | Conflict Monitor | [`plugins/conflict-monitor/`](../../plugins/conflict-monitor/) | ✅ Implemented | 📝 Tests Created |
| 2 | Emotional Salience | [`plugins/emotional-salience/`](../../plugins/emotional-salience/) | ✅ Implemented | ✅ Tests Exist |
| 3 | ClawBridge Dashboard | [`plugins/clawbridge-dashboard/`](../../plugins/clawbridge-dashboard/) | ✅ Implemented | ⚠️ External Integration |
| 4 | SwarmClaw Integration | [`plugins/swarmclaw-integration/`](../../plugins/swarmclaw-integration/) | ✅ Implemented | ✅ Tests Exist |
| 5 | MCP Server | [`plugins/openclaw-mcp-server/`](../../plugins/openclaw-mcp-server/) | ✅ Implemented | 📝 Tests Created |
| 6 | GraphRAG Enhancements | [`plugins/openclaw-graphrag-enhancements/`](../../plugins/openclaw-graphrag-enhancements/) | ✅ Implemented | 📝 Tests Created |

---

## Test Strategy

### Testing Levels

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test component interactions
3. **Plugin Integration Tests** - Test plugin-to-plugin interactions
4. **E2E Tests** - Test full user workflows

### Testing Framework

- **Primary Framework:** Jest 29.x
- **Test Runner:** Node.js native test runner (for MCP Server)
- **Mocking:** Jest mocking and stubbing
- **Coverage:** Istanbul/nyc via Jest

### Test Organization

```
plugins/
├── conflict-monitor/
│   └── src/__tests__/
│       ├── conflict-detector.test.js
│       ├── severity-scorer.test.js
│       ├── resolution-suggester.test.js
│       └── plugin-integration.test.js
├── emotional-salience/
│   └── tests/
│       └── emotional-salience.test.js (existing)
├── swarmclaw-integration/
│   └── src/__tests__/
│       └── failover-manager.test.js (existing)
├── openclaw-mcp-server/
│   └── tests/
│       └── mcp-server.test.js
└── openclaw-graphrag-enhancements/
    └── tests/
        ├── graph-rag.test.js
        ├── entity-extractor.test.js
        ├── relationship-mapper.test.js
        ├── community-detector.test.js
        └── graph-traverser.test.js
```

---

## Plugin Test Details

### 1. Conflict Monitor Plugin

**Location:** [`plugins/conflict-monitor/`](../../plugins/conflict-monitor/)

**Components to Test:**

| Component | File | Test File | Priority |
|-----------|------|-----------|----------|
| ConflictDetector | [`src/conflict-detector.js`](../../plugins/conflict-monitor/src/conflict-detector.js) | `src/__tests__/conflict-detector.test.js` | High |
| SeverityScorer | [`src/severity-scorer.js`](../../plugins/conflict-monitor/src/severity-scorer.js) | `src/__tests__/severity-scorer.test.js` | High |
| ResolutionSuggester | [`src/resolution-suggester.js`](../../plugins/conflict-monitor/src/resolution-suggester.js) | `src/__tests__/resolution-suggester.test.js` | High |
| ConflictMonitorPlugin | [`src/index.js`](../../plugins/conflict-monitor/src/index.js) | `src/__tests__/plugin-integration.test.js` | High |

**Test Cases:**

#### ConflictDetector Tests

```javascript
describe('ConflictDetector', () => {
  // Agent registration
  test('should register agent with initial state', () => {...});
  test('should update agent state', () => {...});
  
  // Logical contradiction detection
  test('should detect direct negation contradictions', () => {...});
  test('should detect mutual exclusivity', () => {...});
  test('should detect known contradiction patterns', () => {...});
  
  // Goal conflict detection
  test('should detect goal conflicts between agents', () => {...});
  test('should identify conflict reasons', () => {...});
  
  // Resource conflict detection
  test('should detect exclusive resource conflicts', () => {...});
  test('should handle non-exclusive resources', () => {...});
  
  // Value conflict detection
  test('should detect value system violations', () => {...});
  test('should identify opposing values', () => {...});
  
  // Temporal conflict detection
  test('should detect scheduling overlaps', () => {...});
  test('should calculate overlap percentage', () => {...});
  
  // History and statistics
  test('should maintain conflict history', () => {...});
  test('should provide accurate statistics', () => {...});
});
```

#### SeverityScorer Tests

```javascript
describe('SeverityScorer', () => {
  // Factor scoring
  test('should score autonomy impact', () => {...});
  test('should score collective impact', () => {...});
  test('should score agent count factor', () => {...});
  test('should score resource contention', () => {...});
  test('should score value violations', () => {...});
  test('should score temporal urgency', () => {...});
  test('should score escalation potential', () => {...});
  
  // Severity classification
  test('should classify low severity (0.0-0.3)', () => {...});
  test('should classify medium severity (0.3-0.6)', () => {...});
  test('should classify high severity (0.6-0.85)', () => {...});
  test('should classify critical severity (0.85-1.0)', () => {...});
  
  // Context multipliers
  test('should apply triad deliberation multiplier', () => {...});
  test('should apply emergency multiplier', () => {...});
  test('should cap multiplier at 2.0', () => {...});
  
  // Automatic escalation
  test('should auto-escalate on safety violation', () => {...});
  test('should auto-escalate when triad consensus blocked', () => {...});
  
  // Recommendations
  test('should provide appropriate recommendations per severity', () => {...});
});
```

#### ResolutionSuggester Tests

```javascript
describe('ResolutionSuggester', () => {
  // Strategy generation by type
  test('should suggest appropriate strategies for logical contradictions', () => {...});
  test('should suggest appropriate strategies for goal conflicts', () => {...});
  test('should suggest appropriate strategies for resource conflicts', () => {...});
  test('should suggest appropriate strategies for value conflicts', () => {...});
  
  // Strategy generation by severity
  test('should suggest avoidance for low severity', () => {...});
  test('should suggest collaboration for medium severity', () => {...});
  test('should suggest arbitration for high severity', () => {...});
  test('should suggest consensus for critical severity', () => {...});
  
  // Individual strategy suggestions
  test('should generate compromise suggestions with steps', () => {...});
  test('should generate collaboration suggestions', () => {...});
  test('should generate accommodation suggestions', () => {...});
  test('should generate arbitration suggestions', () => {...});
  test('should generate consensus suggestions', () => {...});
  test('should generate reframing suggestions', () => {...});
  test('should generate resource expansion suggestions', () => {...});
  
  // Success rate tracking
  test('should record resolution outcomes', () => {...});
  test('should calculate strategy success rates', () => {...});
  test('should use historical data for suggestions', () => {...});
});
```

#### Plugin Integration Tests

```javascript
describe('ConflictMonitorPlugin Integration', () => {
  // Initialization
  test('should initialize with default options', () => {...});
  test('should initialize with custom options', () => {...});
  test('should throw on double initialization', () => {...});
  
  // Agent management
  test('should register triad members automatically', () => {...});
  test('should update agent states', () => {...});
  
  // Proposal analysis
  test('should analyze proposal for conflicts', () => {...});
  test('should generate severity scores', () => {...});
  test('should auto-generate suggestions for high severity', () => {...});
  
  // Triad monitoring
  test('should monitor triad deliberation', () => {...});
  test('should detect inter-proposal conflicts', () => {...});
  test('should block deliberation on critical conflicts', () => {...});
  
  // Conflict resolution
  test('should resolve conflicts', () => {...});
  test('should record resolution for learning', () => {...});
  
  // Analytics
  test('should provide comprehensive analytics', () => {...});
  test('should track triad-specific status', () => {...});
  
  // Event emission
  test('should emit conflictDetected events', () => {...});
  test('should emit severityAssessed events', () => {...});
  test('should emit conflictResolved events', () => {...});
  test('should emit criticalConflict events', () => {...});
});
```

---

### 2. Emotional Salience Plugin

**Location:** [`plugins/emotional-salience/`](../../plugins/emotional-salience/)

**Existing Tests:** [`tests/emotional-salience.test.js`](../../plugins/emotional-salience/tests/emotional-salience.test.js)

**Components Tested:**

| Component | Test Status | Coverage |
|-----------|-------------|----------|
| ValenceDetector | ✅ Tested | Comprehensive |
| SalienceScorer | ✅ Tested | Comprehensive |
| EmotionalContextTracker | ✅ Tested | Comprehensive |
| FearConditioner | ✅ Tested | Comprehensive |
| EmotionalSaliencePlugin | ✅ Tested | Comprehensive |

**Existing Test Coverage:**

- Valence detection (positive, negative, neutral)
- Threat detection and scoring
- Urgency and importance detection
- Salience scoring and categorization
- Emotional context tracking
- Pattern detection (escalation)
- Fear conditioning and extinction
- Full plugin integration tests

**Additional Tests Needed:**

```javascript
// Edge cases and error handling
describe('EmotionalSaliencePlugin Edge Cases', () => {
  test('should handle empty text input', () => {...});
  test('should handle very long text input', () => {...});
  test('should handle non-string input gracefully', () => {...});
  test('should handle missing Empath connection', () => {...});
  test('should recover from Empath disconnection', () => {...});
});
```

---

### 3. ClawBridge Dashboard

**Location:** [`plugins/clawbridge-dashboard/`](../../plugins/clawbridge-dashboard/)

**Test Strategy:** External Integration Testing

The ClawBridge Dashboard is an external integration that connects to a third-party service. Testing focuses on:

1. **Configuration Validation** - Verify plugin configuration
2. **API Contract Testing** - Verify expected API endpoints
3. **Integration Smoke Tests** - Verify connection capability

**Test File:** `tests/clawbridge-integration.test.js`

```javascript
describe('ClawBridge Dashboard Integration', () => {
  // Configuration tests
  test('should validate configuration structure', () => {...});
  test('should require CLAWBRIDGE_ACCESS_KEY', () => {...});
  
  // API endpoint tests (mocked)
  test('should define correct dashboard endpoint', () => {...});
  test('should define correct agents endpoint', () => {...});
  test('should define correct websocket endpoint', () => {...});
  
  // Authentication tests
  test('should use Bearer token authentication', () => {...});
  test('should read from CLAWBRIDGE_ACCESS_KEY env var', () => {...});
  
  // Cloudflare Tunnel configuration
  test('should define tunnel configuration', () => {...});
  test('should specify correct service file path', () => {...});
});
```

---

### 4. SwarmClaw Integration Plugin

**Location:** [`plugins/swarmclaw-integration/`](../../plugins/swarmclaw-integration/)

**Existing Tests:** [`src/__tests__/failover-manager.test.js`](../../plugins/swarmclaw-integration/src/__tests__/failover-manager.test.js)

**Components Tested:**

| Component | Test Status | Coverage |
|-----------|-------------|----------|
| ProviderConfig | ✅ Tested | Comprehensive |
| HealthCheckManager | ✅ Tested | Good |
| FailoverManager | ✅ Tested | Comprehensive |
| SwarmClawPlugin | ⚠️ Partial | Needs Integration Tests |

**Existing Test Coverage:**

- Provider configuration from environment
- Provider validation
- URL construction
- Health check registration
- Failover provider selection
- Retry logic
- Integration tests with mock providers

**Additional Tests Needed:**

```javascript
// SwarmClawPlugin integration tests
describe('SwarmClawPlugin Integration', () => {
  test('should initialize all providers from environment', () => {...});
  test('should execute chat with failover', () => {...});
  test('should execute embedding with failover', () => {...});
  test('should emit providerRegistered events', () => {...});
  test('should emit providerFailed events on failure', () => {...});
  test('should emit failoverTriggered events', () => {...});
  test('should provide accurate status', () => {...});
  test('should handle graceful shutdown', () => {...});
});

// Provider-specific tests
describe('Provider-Specific Request Handling', () => {
  test('should format OpenAI chat request correctly', () => {...});
  test('should format Anthropic chat request correctly', () => {...});
  test('should format Google chat request correctly', () => {...});
  test('should format Ollama chat request correctly', () => {...});
  test('should handle provider-specific response formats', () => {...});
});
```

---

### 5. MCP Server Plugin

**Location:** [`plugins/openclaw-mcp-server/`](../../plugins/openclaw-mcp-server/)

**Test File:** `tests/mcp-server.test.js`

**Components to Test:**

| Component | File | Test File | Priority |
|-----------|------|-----------|----------|
| OpenClawMCPServer | [`src/index.js`](../../plugins/openclaw-mcp-server/src/index.js) | `tests/mcp-server.test.js` | High |
| MemoryResourceHandler | [`src/handlers/memory-resources.js`](../../plugins/openclaw-mcp-server/src/handlers/memory-resources.js) | `tests/handlers/memory-resources.test.js` | Medium |
| KnowledgeResourceHandler | [`src/handlers/knowledge-resources.js`](../../plugins/openclaw-mcp-server/src/handlers/knowledge-resources.js) | `tests/handlers/knowledge-resources.test.js` | Medium |
| SkillResourceHandler | [`src/handlers/skill-resources.js`](../../plugins/openclaw-mcp-server/src/handlers/skill-resources.js) | `tests/handlers/skill-resources.test.js` | Medium |
| SkillToolHandler | [`src/handlers/skill-tools.js`](../../plugins/openclaw-mcp-server/src/handlers/skill-tools.js) | `tests/handlers/skill-tools.test.js` | Medium |
| PromptHandler | [`src/handlers/prompts.js`](../../plugins/openclaw-mcp-server/src/handlers/prompts.js) | `tests/handlers/prompts.test.js` | Low |

**Test Cases:**

```javascript
describe('OpenClawMCPServer', () => {
  // Server initialization
  test('should create server instance with default config', () => {...});
  test('should create server instance with custom config', () => {...});
  test('should initialize all handlers', () => {...});
  
  // MCP Protocol - Resources
  test('should list all resources', async () => {...});
  test('should read memory resources', async () => {...});
  test('should read knowledge resources', async () => {...});
  test('should read skill resources', async () => {...});
  test('should handle unknown resource URIs', async () => {...});
  
  // MCP Protocol - Tools
  test('should list available tools', async () => {...});
  test('should execute skill tools', async () => {...});
  test('should execute memory tools', async () => {...});
  test('should handle unknown tool names', async () => {...});
  test('should return error content on tool failure', async () => {...});
  
  // MCP Protocol - Prompts
  test('should list available prompts', async () => {...});
  test('should get specific prompt', async () => {...});
  test('should handle prompt arguments', async () => {...});
  test('should handle unknown prompt names', async () => {...});
  
  // Server lifecycle
  test('should connect via stdio transport', async () => {...});
  test('should close cleanly', async () => {...});
  test('should handle SIGINT gracefully', async () => {...});
  test('should handle SIGTERM gracefully', async () => {...});
});

describe('SkillResourceHandler', () => {
  test('should list all skills', async () => {...});
  test('should list skill categories', async () => {...});
  test('should list skills by category', async () => {...});
  test('should read skill markdown file', async () => {...});
  test('should return mock skill for missing files', async () => {...});
  test('should handle missing skills directory', async () => {...});
});
```

---

### 6. GraphRAG Enhancements Plugin

**Location:** [`plugins/openclaw-graphrag-enhancements/`](../../plugins/openclaw-graphrag-enhancements/)

**Test File:** `tests/graphrag-enhancements.test.js`

**Components to Test:**

| Component | File | Test File | Priority |
|-----------|------|-----------|----------|
| GraphRAG | [`src/algorithms/graph-rag.js`](../../plugins/openclaw-graphrag-enhancements/src/algorithms/graph-rag.js) | `tests/graph-rag.test.js` | High |
| EntityExtractor | [`src/extractors/entity-extractor.js`](../../plugins/openclaw-graphrag-enhancements/src/extractors/entity-extractor.js) | `tests/entity-extractor.test.js` | High |
| RelationshipMapper | [`src/extractors/relationship-mapper.js`](../../plugins/openclaw-graphrag-enhancements/src/extractors/relationship-mapper.js) | `tests/relationship-mapper.test.js` | High |
| CommunityDetector | [`src/communities/community-detector.js`](../../plugins/openclaw-graphrag-enhancements/src/communities/community-detector.js) | `tests/community-detector.test.js` | Medium |
| GraphTraverser | [`src/traversal/graph-traverser.js`](../../plugins/openclaw-graphrag-enhancements/src/traversal/graph-traverser.js) | `tests/graph-traverser.test.js` | High |
| GraphRAGEnhancementsPlugin | [`src/index.js`](../../plugins/openclaw-graphrag-enhancements/src/index.js) | `tests/plugin-integration.test.js` | High |

**Test Cases:**

#### EntityExtractor Tests

```javascript
describe('EntityExtractor', () => {
  test('should extract person entities', () => {...});
  test('should extract organization entities', () => {...});
  test('should extract location entities', () => {...});
  test('should extract concept entities', () => {...});
  test('should extract event entities', () => {...});
  test('should assign confidence scores', () => {...});
  test('should extract entity context', () => {...});
  test('should handle empty text', () => {...});
  test('should provide extraction statistics', () => {...});
});
```

#### RelationshipMapper Tests

```javascript
describe('RelationshipMapper', () => {
  test('should map related_to relationships', () => {...});
  test('should map part_of relationships', () => {...});
  test('should map causes relationships', () => {...});
  test('should map similar_to relationships', () => {...});
  test('should map located_in relationships', () => {...});
  test('should map member_of relationships', () => {...});
  test('should assign relationship confidence scores', () => {...});
  test('should extract relationship evidence', () => {...});
  test('should handle circular relationships', () => {...});
});
```

#### GraphTraverser Tests

```javascript
describe('GraphTraverser', () => {
  // Node operations
  test('should add nodes to graph', () => {...});
  test('should get node by ID', () => {...});
  test('should remove nodes', () => {...});
  
  // Edge operations
  test('should add edges between nodes', () => {...});
  test('should get neighbors of a node', () => {...});
  test('should remove edges', () => {...});
  
  // Traversal
  test('should perform BFS traversal', () => {...});
  test('should perform DFS traversal', () => {...});
  test('should limit traversal by max hops', () => {...});
  test('should find paths between nodes', () => {...});
  test('should calculate path scores', () => {...});
  
  // Multi-hop reasoning
  test('should perform multi-hop reasoning', () => {...});
  test('should generate reasoning summaries', () => {...});
  test('should handle disconnected graphs', () => {...});
});
```

#### GraphRAG Tests

```javascript
describe('GraphRAG', () => {
  // Document processing
  test('should process single document', async () => {...});
  test('should process multiple documents', async () => {...});
  test('should extract entities from documents', async () => {...});
  test('should map relationships from documents', async () => {...});
  
  // Retrieval
  test('should find seed nodes from query', async () => {...});
  test('should perform graph retrieval', async () => {...});
  test('should perform multi-hop reasoning', async () => {...});
  test('should return reasoning chains', async () => {...});
  
  // Community detection
  test('should detect communities', async () => {...});
  test('should include community info in results', async () => {...});
  
  // RAG context generation
  test('should generate RAG context', async () => {...});
  test('should include reasoning summaries in context', async () => {...});
  
  // Graph management
  test('should export graph data', () => {...});
  test('should import graph data', () => {...});
  test('should clear all data', async () => {...});
  test('should provide statistics', async () => {...});
});
```

#### Plugin Integration Tests

```javascript
describe('GraphRAGEnhancementsPlugin Integration', () => {
  test('should initialize all components', async () => {...});
  test('should process documents through plugin', async () => {...});
  test('should perform hybrid search', async () => {...});
  test('should integrate with hybrid search plugin', async () => {...});
  test('should extract entities via plugin API', async () => {...});
  test('should map relationships via plugin API', async () => {...});
  test('should detect communities via plugin API', async () => {...});
  test('should perform multi-hop reasoning via plugin API', async () => {...});
  test('should generate RAG context via plugin API', async () => {...});
});
```

---

## Integration Testing

### Plugin-to-Plugin Integration Tests

**Test File:** `tests/integration/plugin-integration.test.js`

```javascript
describe('Plugin Integration Tests', () => {
  // Conflict Monitor + Emotional Salience
  describe('Conflict Monitor + Emotional Salience', () => {
    test('should use emotional valence in conflict severity scoring', async () => {...});
    test('should prioritize emotionally charged conflicts', async () => {...});
    test('should track emotional context during conflict resolution', async () => {...});
  });
  
  // SwarmClaw + All Plugins
  describe('SwarmClaw Multi-Provider Support', () => {
    test('should route Conflict Monitor requests through failover', async () => {...});
    test('should route Emotional Salience requests through failover', async () => {...});
    test('should route GraphRAG requests through failover', async () => {...});
  });
  
  // MCP Server + All Plugins
  describe('MCP Server Plugin Exposure', () => {
    test('should expose Conflict Monitor tools via MCP', async () => {...});
    test('should expose Emotional Salience tools via MCP', async () => {...});
    test('should expose GraphRAG tools via MCP', async () => {...});
    test('should expose skill resources via MCP', async () => {...});
  });
  
  // GraphRAG + Hybrid Search
  describe('GraphRAG + Hybrid Search Integration', () => {
    test('should combine graph and vector search results', async () => {...});
    test('should weight results appropriately', async () => {...});
    test('should provide combined scoring', async () => {...});
  });
});
```

---

## Test Execution Plan

### Prerequisites

```bash
# Install dependencies for all plugins
npm install --prefix plugins/conflict-monitor
npm install --prefix plugins/emotional-salience
npm install --prefix plugins/swarmclaw-integration
npm install --prefix plugins/openclaw-mcp-server
npm install --prefix plugins/openclaw-graphrag-enhancements
```

### Execution Order

1. **Unit Tests** - Run individual plugin tests
2. **Integration Tests** - Run plugin interaction tests
3. **Coverage Report** - Generate and analyze coverage

### Test Commands

```bash
# Conflict Monitor Plugin
cd plugins/conflict-monitor && npm test

# Emotional Salience Plugin
cd plugins/emotional-salience && npm test

# SwarmClaw Integration Plugin
cd plugins/swarmclaw-integration && npm test

# MCP Server Plugin
cd plugins/openclaw-mcp-server && npm test

# GraphRAG Enhancements Plugin
cd plugins/openclaw-graphrag-enhancements && npm test

# Integration Tests (from project root)
npm test -- tests/integration/
```

---

## Coverage Requirements

| Plugin | Target Coverage | Minimum Acceptable |
|--------|-----------------|-------------------|
| Conflict Monitor | 85% | 75% |
| Emotional Salience | 85% | 75% |
| ClawBridge Dashboard | 70% | 60% |
| SwarmClaw Integration | 85% | 75% |
| MCP Server | 80% | 70% |
| GraphRAG Enhancements | 85% | 75% |

**Overall Target:** 80% code coverage across all plugins

---

## Test Results

### Execution Summary

| Plugin | Tests Run | Passed | Failed | Skipped | Coverage |
|--------|-----------|--------|--------|---------|----------|
| Conflict Monitor | TBD | TBD | TBD | TBD | TBD |
| Emotional Salience | TBD | TBD | TBD | TBD | TBD |
| ClawBridge Dashboard | TBD | TBD | TBD | TBD | TBD |
| SwarmClaw Integration | TBD | TBD | TBD | TBD | TBD |
| MCP Server | TBD | TBD | TBD | TBD | TBD |
| GraphRAG Enhancements | TBD | TBD | TBD | TBD | TBD |
| **Total** | **TBD** | **TBD** | **TBD** | **TBD** | **TBD** |

### Issues Found and Fixes Applied

| Issue | Plugin | Severity | Status | Fix Description |
|-------|--------|----------|--------|-----------------|
| TBD | TBD | TBD | TBD | TBD |

### Test Execution Log

```
# Test execution output will be appended here
```

---

## Appendix: Test Utilities

### Common Test Helpers

```javascript
// test-utils.js
export function createMockAgent(id, state = {}) {
  return {
    id,
    goals: state.goals || [],
    proposals: state.proposals || [],
    resources: state.resources || [],
    values: state.values || []
  };
}

export function createMockProposal(id, agentId, content) {
  return {
    id,
    agentId,
    content,
    goals: [],
    timestamp: Date.now()
  };
}

export function createMockConflict(type, description, agents = []) {
  return {
    id: `conflict-${Date.now()}`,
    type,
    description,
    agents,
    timestamp: Date.now(),
    resolved: false
  };
}
```

### Mock Data

```javascript
// mock-data.js
export const sampleDocuments = [
  {
    id: 'doc-1',
    content: 'John Smith works at Acme Corporation in New York.',
    metadata: { source: 'test' }
  },
  {
    id: 'doc-2',
    content: 'Acme Corporation announced quarterly earnings event.',
    metadata: { source: 'test' }
  }
];

export const sampleConflicts = [
  {
    type: 'logical_contradiction',
    description: 'Direct contradiction detected',
    agents: ['alpha', 'beta']
  },
  {
    type: 'goal_conflict',
    description: 'Conflicting goals detected',
    agents: ['alpha', 'charlie']
  }
];
```

---

*End of Plugin Testing Plan*
