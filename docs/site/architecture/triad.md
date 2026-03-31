# Triad Deliberation Protocol

**Version:** 1.0.0  
**Status:** Standard  
**Last Updated:** 2026-03-31  
**OpenClaw Version:** v2026.3.28

---

## Table of Contents

1. [Overview](#overview)
2. [Triad Composition](#triad-composition)
3. [Deliberation Flow](#deliberation-flow)
4. [Consensus Rules](#consensus-rules)
5. [Message Types](#message-types)
6. [Integration Points](#integration-points)
7. [Conflict Resolution](#conflict-resolution)
8. [Reference Implementation](#reference-implementation)
9. [Related Documents](#related-documents)

---

## Overview

The Triad Deliberation Protocol enables consensus-based decision making among three agents: Alpha, Beta, and Charlie. This protocol is fundamental to the Heretek OpenClaw collective's governance and decision-making processes.

### Key Principles

1. **Consensus-Based** - Decisions require 2 of 3 votes
2. **Deliberative** - All members must participate in discussion
3. **Transparent** - All votes and reasoning are recorded
4. **Time-Bounded** - Deliberations have configurable timeouts

---

## Triad Composition

### Members

| Node | Agent | Role | Emoji |
|------|-------|------|-------|
| Alpha | alpha | Primary Deliberator | 🔺 |
| Beta | beta | Critical Analysis | 🔷 |
| Charlie | charlie | Process Validation | 🔶 |

### Supporting Roles

| Agent | Role | Description |
|-------|------|-------------|
| **steward** | Orchestrator | Facilitates deliberation, provides tiebreaker |
| **examiner** | Questioner | Challenges assumptions during deliberation |
| **sentinel** | Safety | Reviews proposals for safety concerns |

### Deliberation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Triad Deliberation                            │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │    Alpha    │    │    Beta     │    │   Charlie   │          │
│  │  Primary    │    │   Critical  │    │   Process   │          │
│  │  Deliber.   │    │   Analysis  │    │  Validate   │          │
│  │             │    │             │    │             │          │
│  │ 🔺 Deliber │    │ 🔷 Deliber │    │ 🔶 Deliber │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼───────┐                            │
│                    │  2/3 Consensus│                            │
│                    └───────┬───────┘                            │
│                            │                                     │
│                            ▼                                     │
│                   ┌────────────────┐                            │
│                   │    Steward     │                            │
│                   │  (Tiebreaker)  │                            │
│                   └────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deliberation Flow

### Standard Flow

```
1. Proposal Submitted
         │
         ▼
2. Examiner Questions (optional)
         │
         ▼
3. Sentinel Safety Review
         │
         ▼
4. Triad Deliberation
   ┌─────────────────┐
   │ Alpha → Beta → Charlie │
   └─────────────────┘
         │
         ▼
5. Voting Phase
         │
         ▼
6. Consensus Check (≥2 votes)
         │
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ▼         ▼
7. Ratify  Return to Step 4
    │
    ▼
8. Steward Authorization
    │
    ▼
9. Coder Implementation
```

### Phase Details

#### Phase 1: Proposal Submission

- Proposal submitted by any agent or external source
- Assigned unique proposal ID
- Timestamp recorded
- Initial context captured

#### Phase 2: Examiner Questions (Optional)

- Examiner generates probing questions
- Question types:
  - `assumption_probe` - Untested assumptions
  - `failure_mode` - Potential harms
  - `value_conflict` - Principle contradictions
  - `consequence_probe` - Secondary effects
  - `scope_creep` - Boundary violations
  - `evidence_probe` - Measurable baselines

#### Phase 3: Sentinel Safety Review

- Safety constraint validation
- Risk assessment
- Constraint enforcement recommendations

#### Phase 4: Triad Deliberation

- Sequential deliberation: Alpha → Beta → Charlie
- Each member provides analysis and reasoning
- Cross-examination allowed
- Time-bounded (configurable, default: 5 minutes)

#### Phase 5: Voting Phase

- Each member submits vote: `approve`, `reject`, or `abstain`
- Votes include reasoning
- Votes are recorded in consensus ledger

#### Phase 6: Consensus Check

| Votes | Result |
|-------|--------|
| 3-0 | Approved |
| 2-1 | Approved |
| 2-0-1 | Approved |
| 1-2 | Rejected |
| 0-3 | Rejected |
| 1-1-1 | Rejected (no consensus) |

#### Phase 7: Ratification or Return

- If consensus reached: Proceed to ratification
- If no consensus: Return to deliberation with conflict resolution

#### Phase 8: Steward Authorization

- Steward reviews consensus decision
- Provides final authorization if needed
- Ensures proper documentation

#### Phase 9: Implementation

- Coder receives ratified decision
- Implementation begins
- Progress tracked and reported

---

## Consensus Rules

### Quorum Requirements

| Rule | Value |
|------|-------|
| **Quorum** | All 3 members present |
| **Threshold** | 2 of 3 votes |
| **Veto** | None (majority rules) |
| **Tiebreaker** | Steward authorization |
| **Deliberation Time** | Configurable (default: 5 min) |

### Vote Types

| Vote | Meaning |
|------|---------|
| `approve` | Support the proposal |
| `reject` | Oppose the proposal |
| `abstain` | No position (does not count toward consensus) |

### Consensus States

| State | Description |
|-------|-------------|
| `pending` | Awaiting votes |
| `deliberating` | Active deliberation |
| `approved` | Consensus reached to approve |
| `rejected` | Consensus reached to reject |
| `blocked` | No consensus possible |
| `escalated` | Escalated to Steward |

---

## Message Types

### Proposal Message

```json
{
  "type": "proposal",
  "from": "steward",
  "content": {
    "proposal": "Implement new feature X",
    "reasoning": "User request analysis indicates need",
    "deadline": 1711843200000
  },
  "metadata": {
    "requiresResponse": true,
    "correlationId": "prop-001"
  }
}
```

### Vote Message

```json
{
  "type": "vote",
  "from": "alpha",
  "content": {
    "proposalId": "prop-001",
    "vote": "approve" | "reject" | "abstain",
    "reasoning": "Feature aligns with roadmap"
  },
  "metadata": {
    "correlationId": "prop-001"
  }
}
```

### Decision Message

```json
{
  "type": "decision",
  "from": "gateway",
  "content": {
    "proposalId": "prop-001",
    "result": "approved" | "rejected",
    "votes": {
      "alpha": "approve",
      "beta": "approve",
      "charlie": "abstain"
    },
    "consensus": true
  }
}
```

---

## Integration Points

### Conflict Monitor Integration

The Conflict Monitor plugin integrates with triad deliberations:

1. **Pre-Deliberation Check** - Analyze proposal for conflicts
2. **During Deliberation** - Monitor for emerging conflicts
3. **Voting Phase** - Check for blocking conflicts
4. **Resolution** - Generate suggestions for conflicts

### Emotional Salience Integration

The Emotional Salience plugin provides:

- Value-based importance scoring for proposals
- Threat prioritization during safety review
- Emotional context tracking during deliberation

### Historian Integration

The Historian agent:

- Records all deliberation outcomes
- Tracks decision patterns
- Maintains consensus ledger
- Supports retrospective analysis

---

## Conflict Resolution

### Conflict Types

| Type | Description | Resolution Strategy |
|------|-------------|---------------------|
| `logical_contradiction` | Direct logical inconsistency | Reframe proposal |
| `goal_conflict` | Incompatible objectives | Find compromise |
| `value_conflict` | Value system violations | Value alignment discussion |
| `authority_conflict` | Jurisdiction disputes | Clarify boundaries |
| `methodology_conflict` | Approach disagreements | Evidence-based evaluation |

### Resolution Strategies

| Strategy | Success Rate | Use Case |
|----------|--------------|----------|
| `compromise` | 65% | Most conflicts |
| `collaboration` | 55% | High-trust situations |
| `arbitration` | 75% | High/critical severity |
| `consensus` | 50% | Triad deliberations |
| `reframing` | 45% | Value conflicts |

### Escalation Path

```
Conflict Detected
        │
        ▼
┌───────────────────┐
│ Resolution Attempt│
│ (Collaboration)   │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │           │
  Success     Failure
    │           │
    ▼           ▼
  Resolved  ┌─────────────┐
            │ Escalate to │
            │  Steward    │
            └──────┬──────┘
                   │
             ┌─────┴─────┐
             │           │
           Success     Failure
             │           │
             ▼           ▼
          Resolved    Blocked
```

---

## Reference Implementation

### Triad Voter Class

```javascript
class TriadVoter {
  constructor(agentName, gateway) {
    this.agentName = agentName;
    this.gateway = gateway;
    this.pendingProposals = new Map();
  }

  async vote(proposal) {
    const analysis = await this.analyze(proposal);
    
    return {
      type: 'vote',
      from: this.agentName,
      content: {
        proposalId: proposal.id,
        vote: analysis.decision,
        reasoning: analysis.reasoning,
        confidence: analysis.confidence
      },
      metadata: {
        correlationId: proposal.id
      }
    };
  }

  async analyze(proposal) {
    // Agent-specific analysis logic
    const reasoning = await this.generateReasoning(proposal);
    const confidence = this.calculateConfidence(reasoning);
    const decision = confidence > 0.5 ? 'approve' : 'reject';
    
    return { decision, reasoning, confidence };
  }

  async generateReasoning(proposal) {
    // Implementation depends on agent role
    return `Analysis of proposal: ${proposal.content.proposal}`;
  }

  calculateConfidence(reasoning) {
    // Simplified confidence calculation
    return Math.random();
  }
}

// Usage
const alpha = new TriadVoter('alpha', gateway);
const vote = await alpha.vote(proposalMessage);
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [System Architecture](./overview.md) | Overall system architecture |
| [Agents Documentation](./agents.md) | Agent collective details |
| [A2A Protocol](./a2a-protocol.md) | Communication protocol |
| [Conflict Monitor](../plugins/conflict-monitor.md) | Conflict detection plugin |

---

🦞 *The thought that never ends.*
