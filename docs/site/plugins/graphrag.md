# GraphRAG Enhancements Plugin

**Package:** `@heretek-ai/openclaw-graphrag-enhancements`  
**Version:** 1.0.0  
**Type:** Knowledge Graph Enhancement  
**License:** MIT

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Architecture](#architecture)
5. [API Reference](#api-reference)
6. [Community Detection](#community-detection)
7. [Hierarchical Summaries](#hierarchical-summaries)
8. [Configuration](#configuration)
9. [Related Documents](#related-documents)

---

## Overview

The GraphRAG Enhancements Plugin provides enhanced GraphRAG capabilities with community detection and hierarchical summarization for the Heretek OpenClaw knowledge graph.

---

## Features

- **Community Detection** - Louvain algorithm for identifying knowledge clusters
- **Hierarchical Summarization** - Multi-level graph summarization
- **Entity Extraction** - Improved named entity recognition
- **Relationship Mapping** - Automated relationship extraction
- **Graph Traversal** - Advanced graph traversal algorithms
- **Knowledge Clustering** - Automatic topic clustering

---

## Installation

```bash
cd plugins/openclaw-graphrag-enhancements
npm install
```

---

## Architecture

```
src/
├── index.js                      # Main plugin entry point
├── communities/
│   └── community-detector.js     # Louvain community detection
├── extractors/
│   ├── entity-extractor.js       # Named entity recognition
│   └── relationship-mapper.js    # Relationship extraction
├── summarization/
│   └── hierarchical-summarizer.js # Graph summarization
└── traversal/
    └── graph-traverser.js        # Graph traversal algorithms
```

---

## API Reference

### CommunityDetector

```javascript
import { CommunityDetector } from './plugins/openclaw-graphrag-enhancements/src/index.js';

const detector = new CommunityDetector({
  resolution: 1.0,
  minCommunitySize: 3,
  maxIterations: 100
});

// Detect communities in graph
const communities = await detector.detectCommunities(graph);

// Get community statistics
const stats = detector.getStatistics();
```

### EntityExtractor

```javascript
import { EntityExtractor } from './plugins/openclaw-graphrag-enhancements/src/index.js';

const extractor = new EntityExtractor({
  confidenceThreshold: 0.7,
  entityTypes: ['PERSON', 'ORGANIZATION', 'LOCATION', 'CONCEPT']
});

// Extract entities from text
const entities = await extractor.extract(text);
```

### RelationshipMapper

```javascript
import { RelationshipMapper } from './plugins/openclaw-graphrag-enhancements/src/index.js';

const mapper = new RelationshipMapper({
  relationTypes: ['RELATED_TO', 'PART_OF', 'CAUSES', 'DERIVED_FROM'],
  confidenceThreshold: 0.6
});

// Extract relationships from text
const relationships = await mapper.extract(text);
```

### GraphTraverser

```javascript
import { GraphTraverser } from './plugins/openclaw-graphrag-enhancements/src/index.js';

const traverser = new GraphTraverser(graph);

// Breadth-first search
const bfs = await traverser.bfs(startNode);

// Depth-first search
const dfs = await traverser.dfs(startNode);

// Shortest path
const path = await traverser.shortestPath(startNode, endNode);
```

---

## Community Detection

### Algorithm

The plugin uses the Louvain algorithm for community detection:

1. **Initialization** - Each node starts in its own community
2. **Local Optimization** - Nodes move to neighboring communities for modularity gain
3. **Aggregation** - Communities are aggregated into super-nodes
4. **Iteration** - Process repeats until no improvement

### Configuration

```javascript
const detector = new CommunityDetector({
  resolution: 1.0,      // Resolution parameter (higher = more communities)
  minCommunitySize: 3,  // Minimum nodes per community
  maxIterations: 100    // Maximum iterations
});
```

### Output

```javascript
{
  communities: [
    {
      id: 1,
      nodes: ['node1', 'node2', 'node3'],
      modularity: 0.45,
      density: 0.78
    }
  ],
  modularity: 0.67,
  numCommunities: 5
}
```

---

## Hierarchical Summaries

### Levels

The plugin generates hierarchical summaries at multiple levels:

1. **Node Level** - Individual node summaries
2. **Community Level** - Community-level summaries
3. **Cluster Level** - Group of communities
4. **Global Level** - Entire graph summary

### Usage

```javascript
import { HierarchicalSummarizer } from './plugins/openclaw-graphrag-enhancements/src/index.js';

const summarizer = new HierarchicalSummarizer({
  llmModel: 'gpt-4',
  maxSummaryLength: 500,
  includeExamples: true
});

// Generate hierarchical summary
const summary = await summarizer.generate(graph);
```

### Output

```javascript
{
  global: 'Summary of entire knowledge graph...',
  clusters: [
    {
      id: 'cluster-1',
      summary: 'Summary of cluster...',
      communities: [
        {
          id: 'community-1',
          summary: 'Summary of community...',
          nodes: [
            { id: 'node1', summary: 'Node summary...' }
          ]
        }
      ]
    }
  ]
}
```

---

## Configuration

### Environment Variables

```bash
# GraphRAG settings
GRAPHRAG_RESOLUTION=1.0
GRAPHRAG_MIN_COMMUNITY_SIZE=3
GRAPHRAG_CONFIDENCE_THRESHOLD=0.7

# LLM settings
GRAPHRAG_LLM_MODEL=gpt-4
GRAPHRAG_MAX_SUMMARY_LENGTH=500
```

### openclaw.json Configuration

```json
{
  "plugins": {
    "graphrag-enhancements": {
      "enabled": true,
      "path": "./plugins/openclaw-graphrag-enhancements",
      "config": {
        "communityDetection": {
          "resolution": 1.0,
          "minCommunitySize": 3,
          "maxIterations": 100
        },
        "entityExtraction": {
          "confidenceThreshold": 0.7,
          "entityTypes": ["PERSON", "ORGANIZATION", "LOCATION", "CONCEPT"]
        },
        "summarization": {
          "llmModel": "gpt-4",
          "maxSummaryLength": 500,
          "includeExamples": true
        }
      }
    }
  }
}
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Plugins Overview](./overview.md) | Plugin system overview |
| [Knowledge Architecture](../architecture/overview.md) | Knowledge graph architecture |
| [Memory Systems](../architecture/overview.md#session-management) | Memory documentation |

---

🦞 *So the collective may understand.*
