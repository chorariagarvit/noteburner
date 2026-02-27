-- Migration 0011: Performance Optimization Indexes
-- Add composite indexes to improve query performance for team operations

-- Composite index for team membership lookups (team_id + user_id)
-- Already exists as unique index: idx_team_members_unique (team_id, user_id)
-- This helps with permission checks combined with other queries

-- Index for message queries with team filtering
CREATE INDEX IF NOT EXISTS idx_team_messages_team_created ON team_messages(team_id, created_at DESC);

-- Index for messages with expiration lookups
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);

-- Index for messages view count filtering
CREATE INDEX IF NOT EXISTS idx_messages_view_count ON messages(view_count);

-- Index for messages accessed status
CREATE INDEX IF NOT EXISTS idx_messages_accessed ON messages(accessed_at);

-- Composite index for team stats date range queries
CREATE INDEX IF NOT EXISTS idx_team_stats_team_date ON team_stats(team_id, date DESC);

-- Index for sessions expiration (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_sessions_expires_cleanup ON sessions(expires_at);

-- Index for password resets cleanup (expired tokens)
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_used ON password_resets(expires_at, used);

-- Index for team messages by creator (for tracking user activity)
CREATE INDEX IF NOT EXISTS idx_team_messages_creator ON team_messages(created_by, team_id);

-- Analyze tables to update statistics for query planner
ANALYZE teams;
ANALYZE team_members;
ANALYZE team_messages;
ANALYZE messages;
ANALYZE team_stats;
