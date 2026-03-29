-- ==============================================================================
-- Heretek OpenClaw — pgvector Initialization
-- ==============================================================================
-- This script initializes the pgvector extension and creates the necessary
-- tables for vector embeddings, RAG, and agent memory.
-- ==============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable HNSW extension for hierarchical navigable small world
CREATE EXTENSION IF NOT EXISTS hnsw;

-- ==============================================================================
-- LiteLLM Embeddings Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS litellm_embeddings (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),  -- nomic-embed-text-v2-moe dimensions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for similarity search (IVFFlat)
CREATE INDEX IF NOT EXISTS litellm_embeddings_idx ON litellm_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ==============================================================================
-- Agent Memory Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS agent_memory (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}',
    importance_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

-- Create index for agent memory similarity search
CREATE INDEX IF NOT EXISTS agent_memory_idx ON agent_memory 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Create index for agent name queries
CREATE INDEX IF NOT EXISTS agent_memory_agent_idx ON agent_memory(agent_name);

-- Create index for memory type queries
CREATE INDEX IF NOT EXISTS agent_memory_type_idx ON agent_memory(memory_type);

-- ==============================================================================
-- Collective Memory Table (Shared between agents)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS collective_memory (
    id SERIAL PRIMARY KEY,
    source_agent VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}',
    importance_score FLOAT DEFAULT 0.5,
    consensus_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

-- Create index for collective memory similarity search
CREATE INDEX IF NOT EXISTS collective_memory_idx ON collective_memory 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Create index for source agent queries
CREATE INDEX IF NOT EXISTS collective_memory_source_idx ON collective_memory(source_agent);

-- ==============================================================================
-- Conversation History Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS conversation_history (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL,
    conversation_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- user, assistant, system
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    model_used VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for conversation queries
CREATE INDEX IF NOT EXISTS conversation_history_conversation_idx ON conversation_history(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_history_agent_idx ON conversation_history(agent_name);

-- ==============================================================================
-- A2A Task Handoff Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS task_handoffs (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    source_agent VARCHAR(50) NOT NULL,
    target_agent VARCHAR(50) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    context JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB
);

-- Create index for task queries
CREATE INDEX IF NOT EXISTS task_handoffs_task_idx ON task_handoffs(task_id);
CREATE INDEX IF NOT EXISTS task_handoffs_source_idx ON task_handoffs(source_agent);
CREATE INDEX IF NOT EXISTS task_handoffs_target_idx ON task_handoffs(target_agent);

-- ==============================================================================
-- Agent Heartbeat Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50) UNIQUE NOT NULL,
    last_heartbeat TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- Skills Registry Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS skills_registry (
    id SERIAL PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL,
    skill_version VARCHAR(20),
    description TEXT,
    capabilities JSONB DEFAULT '{}',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- Memory Tiers Table (PAD/Episodic/Fact System)
-- ==============================================================================
-- Implements the three-tier memory architecture:
-- - PAD: Primary Active Data (short-term, session-based, expires quickly)
-- - Episodic: Event-based memories (medium-term, can be promoted to facts)
-- - Fact: Long-term knowledge (permanent, high importance)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS memory_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('pad', 'episodic', 'fact')),
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 / text-embedding-3-small dimensions
    metadata JSONB DEFAULT '{}',
    importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,  -- NULL for facts, set for pad/episodic
    source VARCHAR(50) CHECK (source IN ('agent', 'user', 'system')),
    session_id VARCHAR(100)
);

-- ==============================================================================
-- Memory Tiers Performance Indexes
-- ==============================================================================

-- IVFFlat index for fast approximate nearest neighbor search on embeddings
-- Using cosine similarity operator class for semantic search
CREATE INDEX IF NOT EXISTS memory_tiers_embedding_idx ON memory_tiers
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for filtering by tier type (common query pattern)
CREATE INDEX IF NOT EXISTS memory_tiers_tier_idx ON memory_tiers(tier);

-- Index for importance-based ranking (descending for "most important first" queries)
CREATE INDEX IF NOT EXISTS memory_tiers_importance_idx ON memory_tiers(importance_score DESC);

-- Partial index for expiration queries (only indexes rows with expiration set)
CREATE INDEX IF NOT EXISTS memory_tiers_expires_idx ON memory_tiers(expires_at)
    WHERE expires_at IS NOT NULL;

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS memory_tiers_session_idx ON memory_tiers(session_id);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS memory_tiers_source_idx ON memory_tiers(source);

-- ==============================================================================
-- Utility Functions
-- ==============================================================================

-- Function to compute cosine similarity
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float AS $$
    SELECT 1 - (a <=> b);
$$ LANGUAGE sql IMMUTABLE;

-- Function to find similar memories (updated for compatibility)
CREATE OR REPLACE FUNCTION find_similar_memories(
    query_embedding vector,
    table_name text,
    agent_name text DEFAULT NULL,
    limit_count integer DEFAULT 10
)
RETURNS TABLE(id integer, content text, metadata jsonb, similarity float) AS $$
DECLARE
    query_text text;
BEGIN
    -- Note: Dynamic SQL with table names requires EXECUTE
    -- This is a simplified version; use hybrid_memory_search for memory_tiers
    IF agent_name IS NOT NULL THEN
        query_text := format('
            SELECT id, content, metadata, 1 - (embedding <=> %L::vector) as similarity
            FROM %I
            WHERE agent_name = %L
            ORDER BY similarity DESC
            LIMIT %L',
            query_embedding::text, table_name, agent_name, limit_count);
    ELSE
        query_text := format('
            SELECT id, content, metadata, 1 - (embedding <=> %L::vector) as similarity
            FROM %I
            ORDER BY similarity DESC
            LIMIT %L',
            query_embedding::text, table_name, limit_count);
    END IF;
    
    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Hybrid Memory Search Function
-- ==============================================================================
-- Combines semantic similarity (vector search) with keyword matching (full-text)
-- to provide more relevant and contextual memory retrieval.
--
-- Weighting: 70% semantic similarity + 30% keyword matching
-- This balances understanding intent with exact term matches.
-- ==============================================================================

CREATE OR REPLACE FUNCTION hybrid_memory_search(
    query_embedding vector(1536),
    query_text TEXT,
    match_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 10,
    filter_tier VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    rank FLOAT,
    metadata JSONB
) AS $$
DECLARE
    semantic_weight FLOAT := 0.7;
    keyword_weight FLOAT := 0.3;
BEGIN
    -- Validate tier filter if provided
    IF filter_tier IS NOT NULL AND filter_tier NOT IN ('pad', 'episodic', 'fact') THEN
        RAISE EXCEPTION 'Invalid tier filter. Must be pad, episodic, or fact.';
    END IF;

    RETURN QUERY
    WITH semantic_search AS (
        -- Semantic similarity using vector cosine distance
        SELECT
            mt.id,
            mt.content,
            mt.metadata,
            1 - (mt.embedding <=> query_embedding) AS semantic_score
        FROM memory_tiers mt
        WHERE
            (filter_tier IS NULL OR mt.tier = filter_tier)
            AND mt.embedding IS NOT NULL
    ),
    keyword_search AS (
        -- Keyword matching using PostgreSQL full-text search
        SELECT
            mt.id,
            mt.content,
            mt.metadata,
            ts_rank_cd(
                to_tsvector('english', mt.content),
                plainto_tsquery('english', query_text)
            ) AS keyword_score
        FROM memory_tiers mt
        WHERE
            (filter_tier IS NULL OR mt.tier = filter_tier)
            AND mt.content IS NOT NULL
    ),
    combined_scores AS (
        -- Normalize and combine scores
        SELECT
            COALESCE(ss.id, ks.id) AS id,
            COALESCE(ss.content, ks.content) AS content,
            COALESCE(ss.metadata, ks.metadata) AS metadata,
            COALESCE(ss.semantic_score, 0) AS semantic_score,
            COALESCE(ks.keyword_score, 0) AS keyword_score,
            -- Normalize keyword score to 0-1 range (ts_rank_cd returns 0-1 typically)
            -- Combined rank with weights
            (semantic_weight * COALESCE(ss.semantic_score, 0) +
             keyword_weight * LEAST(COALESCE(ks.keyword_score, 0), 1.0)) AS combined_rank
        FROM semantic_search ss
        FULL OUTER JOIN keyword_search ks ON ss.id = ks.id
    )
    SELECT
        cs.id,
        cs.content,
        cs.semantic_score AS similarity,
        cs.combined_rank AS rank,
        cs.metadata
    FROM combined_scores cs
    WHERE cs.combined_rank >= match_threshold
       OR cs.semantic_score >= match_threshold
    ORDER BY cs.combined_rank DESC, cs.semantic_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Memory Helper Functions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- promote_memory: Promote an episodic memory to a fact (permanent knowledge)
-- ------------------------------------------------------------------------------
-- This function:
-- 1. Validates the memory exists and is episodic
-- 2. Changes tier to 'fact'
-- 3. Sets expires_at to NULL (facts don't expire)
-- 4. Boosts importance score
-- 5. Records the promotion in metadata
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION promote_memory(memory_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_tier VARCHAR(10);
    current_metadata JSONB;
BEGIN
    -- Check if memory exists and get current tier
    SELECT tier, metadata INTO current_tier, current_metadata
    FROM memory_tiers
    WHERE id = memory_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Memory with id % not found', memory_id;
        RETURN FALSE;
    END IF;
    
    IF current_tier != 'episodic' THEN
        RAISE NOTICE 'Only episodic memories can be promoted. Current tier: %', current_tier;
        RETURN FALSE;
    END IF;
    
    -- Promote to fact
    UPDATE memory_tiers
    SET
        tier = 'fact',
        expires_at = NULL,
        importance_score = LEAST(importance_score + 0.2, 1.0),
        metadata = jsonb_set(
            COALESCE(current_metadata, '{}'),
            '{promoted_at}',
            to_jsonb(NOW())
        ),
        last_accessed = NOW()
    WHERE id = memory_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- archive_expired_memories: Clean up expired PAD and episodic memories
-- ------------------------------------------------------------------------------
-- Removes memories that have passed their expiration date.
-- By default, only archives PAD memories. Set include_episodic=TRUE to also
-- archive expired episodic memories.
-- Returns the count of archived memories.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION archive_expired_memories(
    include_episodic BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF include_episodic THEN
        -- Archive both PAD and expired episodic memories
        DELETE FROM memory_tiers
        WHERE
            (tier = 'pad' AND expires_at IS NOT NULL AND expires_at < NOW())
            OR (tier = 'episodic' AND expires_at IS NOT NULL AND expires_at < NOW());
    ELSE
        -- Only archive PAD memories
        DELETE FROM memory_tiers
        WHERE tier = 'pad'
          AND expires_at IS NOT NULL
          AND expires_at < NOW();
    END IF;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Archived % expired memories', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- decay_importance: Gradually reduce importance of unused memories
-- ------------------------------------------------------------------------------
-- Implements memory decay to simulate natural forgetting.
-- Memories that haven't been accessed recently have their importance reduced.
-- This helps prioritize frequently accessed and recently used memories.
--
-- Parameters:
-- - decay_factor: Multiplier for importance (default 0.95 = 5% reduction)
-- - days_threshold: Only decay memories not accessed in X days
-- - min_importance: Floor for importance score (don't decay below this)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION decay_importance(
    decay_factor FLOAT DEFAULT 0.95,
    days_threshold INT DEFAULT 7,
    min_importance FLOAT DEFAULT 0.1
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Validate parameters
    IF decay_factor < 0 OR decay_factor > 1 THEN
        RAISE EXCEPTION 'decay_factor must be between 0 and 1';
    END IF;
    
    IF min_importance < 0 OR min_importance > 1 THEN
        RAISE EXCEPTION 'min_importance must be between 0 and 1';
    END IF;
    
    -- Decay importance for memories not accessed recently
    UPDATE memory_tiers
    SET importance_score = GREATEST(importance_score * decay_factor, min_importance)
    WHERE
        (last_accessed IS NULL AND created_at < NOW() - (days_threshold || ' days')::INTERVAL)
        OR (last_accessed < NOW() - (days_threshold || ' days')::INTERVAL)
        AND importance_score > min_importance;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Decayed importance for % memories', updated_count;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- touch_memory: Update access statistics for a memory
-- ------------------------------------------------------------------------------
-- Call this whenever a memory is retrieved or used to maintain access stats.
-- This increments the access count and updates the last_accessed timestamp.
-- These stats are used by decay_importance and can inform ranking decisions.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_memory(memory_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE memory_tiers
    SET
        access_count = access_count + 1,
        last_accessed = NOW()
    WHERE id = memory_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- get_memory_stats: Return statistics about memory tiers
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_memory_stats()
RETURNS TABLE (
    tier VARCHAR(10),
    total_count BIGINT,
    avg_importance FLOAT,
    avg_access_count FLOAT,
    oldest_memory TIMESTAMP,
    newest_memory TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mt.tier,
        COUNT(*)::BIGINT AS total_count,
        AVG(mt.importance_score)::FLOAT AS avg_importance,
        AVG(mt.access_count)::FLOAT AS avg_access_count,
        MIN(mt.created_at)::TIMESTAMP AS oldest_memory,
        MAX(mt.created_at)::TIMESTAMP AS newest_memory
    FROM memory_tiers mt
    GROUP BY mt.tier
    ORDER BY mt.tier;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- Maintenance Job: Scheduled cleanup function
-- ==============================================================================
-- Call this periodically (e.g., via pg_cron or external scheduler) to maintain
-- memory health. It runs decay and cleanup in a single transaction.
-- ==============================================================================

CREATE OR REPLACE FUNCTION maintain_memory_tiers()
RETURNS JSONB AS $$
DECLARE
    decayed_count INTEGER;
    archived_count INTEGER;
    result JSONB;
BEGIN
    -- Decay importance of unused memories
    SELECT decay_importance(0.95, 7, 0.1) INTO decayed_count;
    
    -- Archive expired PAD memories
    SELECT archive_expired_memories(FALSE) INTO archived_count;
    
    -- Build result
    result = jsonb_build_object(
        'timestamp', NOW(),
        'decayed_memories', decayed_count,
        'archived_memories', archived_count,
        'status', 'success'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
