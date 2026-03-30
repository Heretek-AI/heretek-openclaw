-- ==============================================================================
-- Heretek OpenClaw — Session Management Schema
-- ==============================================================================
-- PostgreSQL schema for session persistence and room management
-- 
-- Usage:
--   psql $DATABASE_URL -f init/session-schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- Sessions Table
-- ==============================================================================
-- Stores user conversations, agent coordination, and task workspaces

CREATE TABLE IF NOT EXISTS sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session metadata
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'user_conversation',
        'agent_coordination',
        'task_workspace'
    )),
    name VARCHAR(255) NOT NULL,
    
    -- Participants (agents and/or users)
    participants JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{"id": "steward", "type": "agent"}, {"id": "user123", "type": "user"}]
    
    -- Creator reference
    created_by VARCHAR(100) NOT NULL,
    
    -- Context and state storage
    context JSONB DEFAULT '{}',
    state JSONB DEFAULT '{"status": "active", "messages": []}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Expiration (for temporary sessions)
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) 
    WHERE expires_at IS NOT NULL;

-- ==============================================================================
-- Session Messages Table
-- ==============================================================================
-- Stores all messages within a session

CREATE TABLE IF NOT EXISTS session_messages (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session reference
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Message metadata
    from_agent VARCHAR(50) NOT NULL,
    to_agent VARCHAR(50),  -- NULL for broadcasts
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN (
        'text',
        'task',
        'query',
        'broadcast',
        'response',
        'heartbeat'
    )),
    
    -- Message context
    context JSONB DEFAULT '{}',
    -- Structure: {"sessionId": "...", "taskId": "...", "replyTo": "..."}
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Message metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_from_agent ON session_messages(from_agent);
CREATE INDEX IF NOT EXISTS idx_session_messages_created_at ON session_messages(created_at DESC);

-- ==============================================================================
-- Rooms Table
-- ==============================================================================
-- Stores room/space configurations for task-oriented collaboration

CREATE TABLE IF NOT EXISTS rooms (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Room metadata
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'public',
        'private',
        'direct'
    )),
    description TEXT,
    
    -- Room owner
    owner VARCHAR(100) NOT NULL,
    
    -- Members
    members JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{"id": "steward", "role": "admin"}, {"id": "alpha", "role": "member"}]
    
    -- Settings
    settings JSONB DEFAULT '{"allowGuestMessages": false, "maxMembers": 50}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for room queries
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);

-- ==============================================================================
-- Room Memberships Table
-- ==============================================================================
-- Tracks room membership history

CREATE TABLE IF NOT EXISTS room_memberships (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Room reference
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    
    -- Member info
    member_id VARCHAR(100) NOT NULL,
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('agent', 'user')),
    
    -- Role in room
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN (
        'owner',
        'admin',
        'moderator',
        'member',
        'guest'
    )),
    
    -- Joined at
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Left at (NULL if still active)
    left_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Unique constraint: one active membership per member per room
    UNIQUE(room_id, member_id, left_at)
);

-- Indexes for membership queries
CREATE INDEX IF NOT EXISTS idx_room_memberships_room_id ON room_memberships(room_id);
CREATE INDEX IF NOT EXISTS idx_room_memberships_member_id ON room_memberships(member_id);

-- ==============================================================================
-- Activity Log Table
-- ==============================================================================
-- Audit trail for all collective activities

CREATE TABLE IF NOT EXISTS activity_log (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Activity type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'agent_message',
        'health_status',
        'session_created',
        'session_updated',
        'room_created',
        'room_joined',
        'room_left',
        'error',
        'system'
    )),
    
    -- Actor (who performed the action)
    actor VARCHAR(100),
    actor_type VARCHAR(20),
    
    -- Target (what was acted upon)
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Context
    context JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Severity (for filtering)
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN (
        'debug',
        'info',
        'warning',
        'error',
        'critical'
    ))
);

-- Indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_severity ON activity_log(severity);

-- ==============================================================================
-- Triggers for automatic updates
-- ==============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Views for common queries
-- ==============================================================================

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.*,
    (SELECT COUNT(*) FROM session_messages WHERE session_id = s.id) as message_count
FROM sessions s
WHERE s.state->>'status' = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > NOW());

-- Room with member count
CREATE OR REPLACE VIEW rooms_with_members AS
SELECT 
    r.*,
    COUNT(DISTINCT rm.member_id) FILTER (WHERE rm.left_at IS NULL) as active_member_count,
    json_agg(
        json_build_object(
            'member_id', rm.member_id,
            'role', rm.role,
            'joined_at', rm.joined_at
        )
    ) FILTER (WHERE rm.left_at IS NULL) as active_members
FROM rooms r
LEFT JOIN room_memberships rm ON r.id = rm.room_id
GROUP BY r.id;

-- ==============================================================================
-- Grant permissions (adjust as needed for your setup)
-- ==============================================================================

-- For development, grant all to public role
-- In production, use specific roles

-- COMMENT ON TABLE sessions IS 'Stores user conversations, agent coordination, and task workspaces';
-- COMMENT ON TABLE session_messages IS 'Stores all messages within a session';
-- COMMENT ON TABLE rooms IS 'Stores room/space configurations for task-oriented collaboration';
-- COMMENT ON TABLE room_memberships IS 'Tracks room membership history';
-- COMMENT ON TABLE activity_log IS 'Audit trail for all collective activities';