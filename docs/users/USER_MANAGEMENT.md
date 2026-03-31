# User Management System

## Overview

The User Rolodex system provides comprehensive multi-user management with identity resolution, relationship tracking, and preference learning for the OpenClaw agent collective.

**Location:** `skills/user-rolodex/`

**Status:** ✅ Multi-User Enabled (Phase 8)

---

## Features

### 1. User Profile Management
- Structured user profiles with UUID canonical identifiers
- Multiple user types (primary, collaborator, partner, observer, client, vendor)
- Preference categories (communication style, technical level, topics of interest)
- Project associations and role tracking
- Context notes for personalized interactions

### 2. Identity Resolution
- Multi-platform identity linking (Discord, Phone, Email, GitHub, Slack, Telegram)
- Universal lookup by any platform identifier
- Cross-platform identity correlation
- Identity verification status tracking
- Fast lookup via pre-built identity index

### 3. Relationship Tracking
- Trust level system (0.0 - 1.0 scale)
- Relationship types with defined permissions
- Relationship graph between users and agents
- Relationship history tracking
- Agent-specific relationship tracking

---

## Directory Structure

```
skills/user-rolodex/
├── SKILL.md                    # Skill documentation
├── user-rolodex.js             # Main user management module
├── user-rolodex.sh             # Shell wrapper script
├── identity-resolution.js      # Identity resolution system
├── relationship-tracker.js     # Relationship and trust management
├── package.json
├── README.md
│
└── users/
    ├── _schema.json            # User schema definition
    ├── _identity-index.json    # Fast lookup identity index
    ├── index.json              # Quick user index
    │
    ├── _templates/             # User profile templates
    │   ├── README.md
    │   ├── primary-user.json
    │   ├── collaborator-user.json
    │   ├── partner-user.json
    │   ├── observer-user.json
    │   └── client-user.json
    │
    ├── _relationships/         # Relationship data
    │   ├── graph.json          # Relationship graph
    │   └── history.json        # Relationship history
    │
    └── <user-slug>/            # Individual user directory
        ├── profile.json        # User profile data
        ├── preferences.json    # Learned preferences
        └── history.json        # Interaction history
```

---

## User Profile Schema

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "john-doe",
  "username": "johnd",
  "name": {
    "full": "John Doe",
    "preferred": "John",
    "phonetic": null
  },
  "pronouns": "he/him",
  "timezone": "America/New_York",
  "languages": ["en"],
  "platforms": {
    "discord": { "id": "123456789", "username": "johnd", "verified": true },
    "phone": { "number": "+15551234567", "verified": true },
    "web": { "email": "john@example.com", "sessions": [] },
    "github": { "id": "12345", "username": "johnd" },
    "slack": { "id": "U123456", "team_id": "T123456", "username": "john" },
    "telegram": { "id": "123456789", "username": "johnd" }
  },
  "preferences": {
    "communicationStyle": "technical",
    "response_length": "detailed",
    "preferredAgents": ["alpha", "coder"],
    "code_style": {
      "comments": "detailed",
      "naming": "descriptive"
    },
    "topics_of_interest": ["AI agents", "distributed systems"]
  },
  "relationship": {
    "type": "collaborator",
    "since": "2026-03-31T00:00:00Z",
    "trust_level": 0.7
  },
  "projects": [
    {
      "name": "heretek-openclaw",
      "role": "developer",
      "status": "active",
      "joined": "2026-03-31T00:00:00Z"
    }
  ],
  "context_notes": [],
  "sessions": []
}
```

---

## Commands

### User Management (user-rolodex.js)

| Command | Description | Example |
|---------|-------------|---------|
| `create` | Create new user | `node user-rolodex.js create --name "John Doe" --type collaborator` |
| `lookup <slug>` | Get user profile | `node user-rolodex.js lookup john-doe --json` |
| `update <slug>` | Update user info | `node user-rolodex.js update john-doe --timezone "America/New_York"` |
| `search` | Search users | `node user-rolodex.js search --project "heretek-openclaw"` |
| `note <slug> <note>` | Add context note | `node user-rolodex.js note john-doe "Prefers detailed explanations"` |
| `prefer <slug>` | Set preference | `node user-rolodex.js prefer john-doe communication technical` |
| `merge <src> <tgt>` | Merge profiles | `node user-rolodex.js merge old-profile john-doe` |
| `list` | List all users | `node user-rolodex.js list --json` |

### Identity Resolution (identity-resolution.js)

| Command | Description | Example |
|---------|-------------|---------|
| `lookup-discord <id>` | Find by Discord ID | `node identity-resolution.js lookup-discord 123456789` |
| `lookup-email <email>` | Find by email | `node identity-resolution.js lookup-email user@example.com` |
| `lookup-phone <phone>` | Find by phone | `node identity-resolution.js lookup-phone +15551234567` |
| `lookup-github <user>` | Find by GitHub | `node identity-resolution.js lookup-github johnd` |
| `resolve <id>` | Universal lookup | `node identity-resolution.js resolve 123456789` |
| `link <slug>` | Link identity | `node identity-resolution.js link john-doe --discord 123456789` |
| `unlink <slug> <platform>` | Remove identity | `node identity-resolution.js unlink john-doe discord` |
| `identities <slug>` | Show identities | `node identity-resolution.js identities john-doe` |
| `build-index` | Build lookup index | `node identity-resolution.js build-index` |
| `fast-lookup <id>` | Fast indexed lookup | `node identity-resolution.js fast-lookup 123456789` |

### Relationship Tracking (relationship-tracker.js)

| Command | Description | Example |
|---------|-------------|---------|
| `set-trust <slug> <level>` | Set trust (0-1) | `node relationship-tracker.js set-trust john-doe 0.85` |
| `get-trust <slug>` | Get trust level | `node relationship-tracker.js get-trust john-doe` |
| `adjust-trust <slug> <delta>` | Adjust trust | `node relationship-tracker.js adjust-trust john-doe 0.05` |
| `set-type <slug>` | Set relationship type | `node relationship-tracker.js set-type john-doe --type collaborator` |
| `add-relation <s1> <s2>` | Add user relation | `node relationship-tracker.js add-relation john-doe jane-doe` |
| `add-agent <slug> <agent>` | Add agent relation | `node relationship-tracker.js add-agent john-doe agent-alpha` |
| `history <slug>` | Get history | `node relationship-tracker.js history john-doe --limit 20` |
| `graph` | Show relationship graph | `node relationship-tracker.js graph --json` |
| `types` | List relationship types | `node relationship-tracker.js types` |

---

## Relationship Types

| Type | Default Trust | Trust Range | Description | Permissions |
|------|---------------|-------------|-------------|-------------|
| `primary` | 0.9 | 0.8 - 1.0 | Main project owner/leader | full_access, user_management, agent_control |
| `collaborator` | 0.7 | 0.5 - 0.9 | Active development partner | development_access, project_contrib |
| `partner` | 0.6 | 0.4 - 0.8 | Strategic organization | limited_access, project_view |
| `observer` | 0.3 | 0.1 - 0.5 | Passive viewer | read_only, public_info |
| `client` | 0.5 | 0.3 - 0.7 | External customer | project_access, status_view |
| `vendor` | 0.4 | 0.2 - 0.6 | Service provider | service_access, limited_integration |
| `agent` | 0.8 | 0.5 - 1.0 | AI agent in collective | autonomous_action, memory_access |

---

## Trust Adjustments

### Positive Adjustments
| Reason | Delta | Description |
|--------|-------|-------------|
| `successful_collaboration` | +0.05 | Successful project collaboration |
| `consistent_communication` | +0.02 | Regular, reliable communication |
| `valuable_contribution` | +0.03 | Significant contribution to project |
| `long_term_engagement` | +0.01 | Sustained engagement over time |
| `security_clearance` | +0.10 | Granted security clearance |
| `critical_assistance` | +0.08 | Critical help during incident |

### Negative Adjustments
| Reason | Delta | Description |
|--------|-------|-------------|
| `policy_violation` | -0.20 | Violation of project policies |
| `suspicious_activity` | -0.15 | Detected suspicious behavior |
| `communication_breakdown` | -0.05 | Breakdown in communication |
| `project_abandonment` | -0.10 | Abandoned project responsibilities |
| `security_concern` | -0.25 | Security concern raised |
| `trust_violation` | -0.30 | Direct violation of trust |

---

## Usage Examples

### Creating Users

```bash
# Create primary user (project owner)
node user-rolodex.js create --name "Derek" --type primary --trust 1.0

# Create collaborator
node user-rolodex.js create --name "Jane Smith" --type collaborator --trust 0.7

# Create observer
node user-rolodex.js create --name "Bob Viewer" --type observer --trust 0.3
```

### Linking Identities

```bash
# Link Discord identity
node identity-resolution.js link john-doe --discord 123456789 --discord-username johnd

# Link email
node identity-resolution.js link john-doe --email john@example.com

# Link phone number
node identity-resolution.js link john-doe --phone +15551234567

# Link GitHub
node identity-resolution.js link john-doe --github johnd

# Build identity index for fast lookups
node identity-resolution.js build-index
```

### Identity Lookup

```bash
# Lookup by Discord ID
node identity-resolution.js lookup-discord 123456789

# Lookup by email
node identity-resolution.js lookup-email john@example.com

# Universal resolve (tries all platforms)
node identity-resolution.js resolve 123456789

# Fast lookup using index
node identity-resolution.js fast-lookup john@example.com
```

### Relationship Management

```bash
# Set trust level
node relationship-tracker.js set-trust john-doe 0.85

# Adjust trust with reason
node relationship-tracker.js adjust-trust john-doe 0.05 --reason "valuable_contribution"

# Change relationship type
node relationship-tracker.js set-type john-doe --type collaborator

# Add relationship between users
node relationship-tracker.js add-relation john-doe jane-doe --type collaborator

# Add agent relationship
node relationship-tracker.js add-agent john-doe agent-alpha

# View relationship graph
node relationship-tracker.js graph --json
```

---

## Programmatic Usage

### JavaScript API

```javascript
const { UserRolodex } = require('./user-rolodex.js');
const { IdentityResolver } = require('./identity-resolution.js');
const { RelationshipTracker } = require('./relationship-tracker.js');

// User Management
const rolodex = new UserRolodex();
const user = rolodex.createUser({ name: "John Doe", type: "collaborator" });
const profile = rolodex.lookupUser("john-doe", "json");

// Identity Resolution
const resolver = new IdentityResolver();
const result = resolver.findByEmail("john@example.com");
resolver.linkDiscord("john-doe", "123456789", "johnd");
resolver.buildIdentityIndex();

// Relationship Tracking
const tracker = new RelationshipTracker();
tracker.setTrustLevel("john-doe", 0.85, "promoted_to_collaborator");
tracker.addAgentRelationship("john-doe", "agent-alpha", { type: "frequent_user" });
const graph = tracker.getGraph();
```

---

## Integration Points

### Agent Integration
- User context passed in A2A messages
- Preference-aware response generation
- Trust-based permission enforcement

### Memory System
- User profiles stored in episodic memory
- Interaction history consolidated to long-term memory
- Relationship graph persisted

### Security
- Trust levels gate access to sensitive operations
- Identity verification required for privileged actions
- Relationship history audit trail

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USERS_DIR` | `./users` | Base directory for user data |
| `USER_SCHEMA` | `./users/_schema.json` | Schema file path |
| `USER_INDEX` | `./users/index.json` | User index file path |
| `RELATIONSHIPS_DIR` | `./users/_relationships` | Relationship data directory |

---

## Best Practices

1. **Always link identities** when creating new users to enable cross-platform lookup
2. **Build identity index** after bulk operations for fast lookups
3. **Use appropriate trust levels** based on relationship type guidelines
4. **Record significant interactions** as context notes for personalization
5. **Review relationship history** periodically for audit purposes
6. **Export relationship data** before major system changes

---

## Troubleshooting

### User Not Found
- Check if user exists: `node user-rolodex.js list`
- Verify slug is correct (case-sensitive)
- Check index.json for user entry

### Identity Lookup Failing
- Ensure identity is linked: `node identity-resolution.js identities <slug>`
- Rebuild index: `node identity-resolution.js build-index`
- Check for typos in identifier

### Trust Level Issues
- Verify trust level is between 0.0 and 1.0
- Check relationship type constraints
- Review trust adjustment history

---

*User Management System - Building personalized agent interactions through comprehensive user understanding.*
