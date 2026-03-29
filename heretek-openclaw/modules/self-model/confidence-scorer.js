#!/usr/bin/env node
// confidence-scorer.js - Scores confidence levels across domains
const fs = require('fs');
const path = require('path');

const DEFAULT_WEIGHTS = {
  evidence_quality: 0.3,
  consistency: 0.25,
  source_reliability: 0.2,
  recency: 0.15,
  source_count: 0.1
};

class ConfidenceScorer {
  constructor(config = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...config };
    this.evidenceStore = {};
  }

  // Evaluate confidence for a belief/claim
  evaluate(claim, evidence = []) {
    const factors = {
      evidence_quality: this.scoreEvidenceQuality(evidence),
      consistency: this.scoreConsistency(claim, evidence),
      source_reliability: this.scoreSourceReliability(evidence),
      recency: this.scoreRecency(evidence),
      source_count: this.scoreSourceCount(evidence)
    };

    // Calculate weighted score
    let totalScore = 0;
    for (const [factor, score] of Object.entries(factors)) {
      totalScore += score * (this.weights[factor] || 0);
    }

    return {
      claim,
      confidence: Math.round(totalScore * 100) / 100,
      factors,
      evidence_count: evidence.length,
      evaluated_at: new Date().toISOString()
    };
  }

  scoreEvidenceQuality(evidence) {
    if (evidence.length === 0) return 0.3;

    let total = 0;
    for (const e of evidence) {
      // Evidence quality: direct observation > logical inference > heuristic > assumption
      switch (e.type) {
        case 'observation':
          total += 1.0;
          break;
        case 'inference':
          total += 0.8;
          break;
        case 'heuristic':
          total += 0.5;
          break;
        case 'assumption':
        default:
          total += 0.3;
      }
    }

    return Math.min(1, total / evidence.length);
  }

  scoreConsistency(claim, evidence) {
    if (evidence.length < 2) return 0.7;

    let consistentCount = 0;
    const claimLower = claim.toLowerCase();

    for (const e of evidence) {
      if (e.claim && e.claim.toLowerCase().includes(claimLower.slice(0, 20))) {
        consistentCount++;
      } else if (e.supporting === true) {
        consistentCount += 0.5;
      }
    }

    return Math.min(1, consistentCount / evidence.length);
  }

  scoreSourceReliability(evidence) {
    if (evidence.length === 0) return 0.5;

    let total = 0;
    for (const e of evidence) {
      // Source reliability based on source type
      const reliability = {
        'collective_memory': 0.95,
        'governance': 0.95,
        'direct_observation': 0.9,
        'inference': 0.7,
        'external_api': 0.6,
        'user_input': 0.8,
        'inference_model': 0.5
      };

      total += reliability[e.source] || 0.5;
    }

    return total / evidence.length;
  }

  scoreRecency(evidence) {
    if (evidence.length === 0) return 0.5;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let totalRecency = 0;

    for (const e of evidence) {
      const timestamp = e.timestamp ? new Date(e.timestamp).getTime() : now;
      const age = now - timestamp;

      // Recency scoring: <1 day = 1.0, >7 days = 0.3
      if (age < day) {
        totalRecency += 1.0;
      } else if (age < 3 * day) {
        totalRecency += 0.8;
      } else if (age < 7 * day) {
        totalRecency += 0.5;
      } else {
        totalRecency += 0.3;
      }
    }

    return totalRecency / evidence.length;
  }

  scoreSourceCount(evidence) {
    if (evidence.length === 0) return 0.2;
    if (evidence.length === 1) return 0.4;
    if (evidence.length === 2) return 0.6;
    if (evidence.length >= 5) return 1.0;
    return 0.4 + (evidence.length - 1) * 0.15;
  }

  // Explain confidence breakdown
  explain(evaluation) {
    const explanation = [];
    
    explanation.push(`Overall confidence: ${(evaluation.confidence * 100).toFixed(0)}%`);
    explanation.push('');
    explanation.push('Factor breakdown:');
    
    const factorDescriptions = {
      evidence_quality: 'Quality of supporting evidence',
      consistency: 'Consistency across evidence',
      source_reliability: 'Reliability of information sources',
      recency: 'How recent is the information',
      source_count: 'Number of independent sources'
    };
    
    for (const [factor, score] of Object.entries(evaluation.factors)) {
      const desc = factorDescriptions[factor] || factor;
      const percent = (score * 100).toFixed(0);
      explanation.push(`  - ${desc}: ${percent}% (weight: ${(this.weights[factor] * 100).toFixed(0)}%)`);
    }
    
    return explanation.join('\n');
  }

  // Update weights
  setWeights(weights) {
    this.weights = { ...this.weights, ...weights };
  }
}

module.exports = { ConfidenceScorer, DEFAULT_WEIGHTS };

// CLI
if (require.main === module) {
  const scorer = new ConfidenceScorer();
  
  const command = process.argv[2];
  
  if (command === 'evaluate') {
    const claim = process.argv[3] || 'test claim';
    let evidenceStr = process.argv[4] || '[]';
    const evidence = JSON.parse(evidenceStr);
    
    const result = scorer.evaluate(claim, evidence);
    console.log(JSON.stringify(result, null, 2));
    
    if (process.argv.includes('--explain')) {
      console.log('\n' + scorer.explain(result));
    }
  } else if (command === 'weights') {
    const weightsStr = process.argv[3] || '{}';
    const weights = JSON.parse(weightsStr);
    scorer.setWeights(weights);
    console.log('Weights updated:', JSON.stringify(scorer.weights));
  } else {
    console.log('Usage: node confidence-scorer.js evaluate <claim> <evidence_json> [--explain]');
    console.log('       node confidence-scorer.js weights <weights_json>');
  }
}