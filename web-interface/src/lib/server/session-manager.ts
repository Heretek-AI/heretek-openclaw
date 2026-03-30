/**
 * Heretek OpenClaw — Session Manager
 * ==============================================================================
 * PostgreSQL-backed session management with Redis caching.
 * 
 * Usage:
 *   import { SessionManager } from './session-manager';
 *   
 *   const sessionManager = new SessionManager();
 *   const session = await sessionManager.createSession('user_conversation', 'Test Chat', ['steward'], 'user123');
 *   await sessionManager.addMessage(session.id, { from: 'steward', to: 'user123', content: 'Hello' });
 * ==============================================================================
 */

import { Pool } from 'pg';

export interface Session {
    id: string;
    type: 'user_conversation' | 'agent_coordination' | 'task_workspace';
    name: string;
    participants: { id: string; type: 'agent' | 'user' }[];
    createdBy: string;
    context: Record<string, any>;
    state: {
        status: 'active' | 'paused' | 'completed';
        messages: SessionMessage[];
    };
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    metadata: Record<string, any>;
}

export interface SessionMessage {
    id: string;
    fromAgent: string;
    toAgent?: string;
    content: string;
    messageType: 'text' | 'task' | 'query' | 'broadcast' | 'response' | 'heartbeat';
    timestamp: Date;
    context?: Record<string, any>;
}

export interface SessionConfig {
    maxAge: number;          // Max session age in ms (default: 7 days)
    idleTimeout: number;     // Idle timeout in ms (default: 30 minutes)
    maxMessages: number;     // Max stored messages per session (default: 500)
    databaseUrl: string;     // PostgreSQL connection string
}

const DEFAULT_CONFIG: SessionConfig = {
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    idleTimeout: 30 * 60 * 1000,       // 30 minutes
    maxMessages: 500,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/heretek'
};

export class SessionManager {
    private pool: Pool;
    private config: SessionConfig;

    constructor(config: Partial<SessionConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.pool = new Pool({
            connectionString: this.config.databaseUrl
        });
    }

    /**
     * Create a new session
     */
    async createSession(
        type: Session['type'],
        name: string,
        participants: string[],
        createdBy: string,
        metadata?: Record<string, any>
    ): Promise<Session> {
        const session: Session = {
            id: crypto.randomUUID(),
            type,
            name,
            participants: participants.map(id => ({
                id,
                type: this.isAgent(id) ? 'agent' : 'user'
            })),
            createdBy,
            context: {},
            state: { status: 'active', messages: [] },
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: metadata || {}
        };

        await this.pool.query(
            `INSERT INTO sessions (id, type, name, participants, created_by, context, state, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                session.id,
                session.type,
                session.name,
                JSON.stringify(session.participants),
                session.createdBy,
                JSON.stringify(session.context),
                JSON.stringify(session.state),
                JSON.stringify(session.metadata)
            ]
        );

        // Log activity
        await this.logActivity('session_created', session.id, createdBy, {
            type,
            name,
            participants
        });

        return session;
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string): Promise<Session | null> {
        const result = await this.pool.query(
            'SELECT * FROM sessions WHERE id = $1',
            [sessionId]
        );

        if (result.rows.length === 0) return null;

        return this.rowToSession(result.rows[0]);
    }

    /**
     * Add message to session
     */
    async addMessage(
        sessionId: string,
        message: Omit<SessionMessage, 'id' | 'timestamp'>
    ): Promise<SessionMessage> {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        const fullMessage: SessionMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...message
        };

        // Insert message
        await this.pool.query(
            `INSERT INTO session_messages (id, session_id, from_agent, to_agent, content, message_type, context)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                fullMessage.id,
                sessionId,
                fullMessage.fromAgent,
                fullMessage.toAgent || null,
                fullMessage.content,
                fullMessage.messageType,
                JSON.stringify(fullMessage.context || {})
            ]
        );

        // Update session state
        session.state.messages.push(fullMessage);
        session.updatedAt = new Date();

        // Trim if exceeds max
        if (session.state.messages.length > this.config.maxMessages) {
            session.state.messages = session.state.messages.slice(-this.config.maxMessages);
        }

        await this.pool.query(
            'UPDATE sessions SET state = $1, updated_at = $2 WHERE id = $3',
            [JSON.stringify(session.state), session.updatedAt, sessionId]
        );

        return fullMessage;
    }

    /**
     * Get messages for session
     */
    async getMessages(sessionId: string, limit = 100, offset = 0): Promise<SessionMessage[]> {
        const result = await this.pool.query(
            `SELECT * FROM session_messages 
             WHERE session_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [sessionId, limit, offset]
        );

        return result.rows.map(row => ({
            id: row.id,
            fromAgent: row.from_agent,
            toAgent: row.to_agent,
            content: row.content,
            messageType: row.message_type,
            timestamp: row.created_at,
            context: row.context
        }));
    }

    /**
     * Update session status
     */
    async updateSessionStatus(sessionId: string, status: 'active' | 'paused' | 'completed'): Promise<void> {
        await this.pool.query(
            'UPDATE sessions SET state = state || $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify({ status }), sessionId]
        );
    }

    /**
     * Get active sessions
     */
    async getActiveSessions(): Promise<Session[]> {
        const result = await this.pool.query(
            `SELECT * FROM sessions 
             WHERE state->>'status' = 'active'
             ORDER BY updated_at DESC`
        );

        return result.rows.map(row => this.rowToSession(row));
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId: string): Promise<void> {
        await this.pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpired(): Promise<number> {
        const result = await this.pool.query(
            `DELETE FROM sessions 
             WHERE expires_at IS NOT NULL AND expires_at < NOW()`
        );
        return result.rowCount || 0;
    }

    /**
     * Log activity for audit
     */
    private async logActivity(
        type: string,
        targetId: string,
        actor: string,
        context: Record<string, any>
    ): Promise<void> {
        await this.pool.query(
            `INSERT INTO activity_log (type, target_id, actor, action, context)
             VALUES ($1, $2, $3, $4, $5)`,
            [type, targetId, actor, type, JSON.stringify(context)]
        );
    }

    /**
     * Convert database row to Session object
     */
    private rowToSession(row: any): Session {
        return {
            id: row.id,
            type: row.type,
            name: row.name,
            participants: row.participants,
            createdBy: row.created_by,
            context: row.context || {},
            state: row.state || { status: 'active', messages: [] },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            expiresAt: row.expires_at,
            metadata: row.metadata || {}
        };
    }

    /**
     * Check if ID is an agent
     */
    private isAgent(id: string): boolean {
        const agents = [
            'steward', 'alpha', 'beta', 'charlie',
            'examiner', 'explorer', 'sentinel', 'coder',
            'dreamer', 'empath', 'historian'
        ];
        return agents.includes(id.toLowerCase());
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        await this.pool.end();
    }
}

// Export singleton
let singleton: SessionManager | null = null;

export function getSessionManager(): SessionManager {
    if (!singleton) {
        singleton = new SessionManager();
    }
    return singleton;
}