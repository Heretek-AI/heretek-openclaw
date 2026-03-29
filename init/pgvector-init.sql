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
    metadata JSONB DEFAULT '{}'
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
-- Utility Functions
-- ==============================================================================

-- Function to compute cosine similarity
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float AS $$
    SELECT 1 - (a <=> b) / sqrt(a <=> a);
$$;

-- Function to find similar memories
CREATE or REPLACE FUNCTION find_similar_memories(
    query_embedding vector,
    table_name text,
    agent_name text DEFAULT NULL,
    limit integer DEFAULT 10
)
RETURNS TABLE AS $$
    DECLARE
        query_text text;
        threshold float := 0.7;
    BEGIN
        IF agent_name IS NOT NULL THEN
            RETURN QUERY
                SELECT id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
                FROM ${table_name}
                WHERE agent_name = agent_name
                ORDER BY similarity
                LIMIT limit;
        ELSE
            RETURN QUERY
                SELECT id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
                FROM ${table_name}
                ORDER BY similarity
                LIMIT limit;
        END IF;
    END;
$$;
