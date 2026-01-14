-- Migration: Add group messages support
-- Created: 2026-01-14
-- Week 5: Network Effects - Group Messages (1-to-many)

-- Add group_id column to messages table
ALTER TABLE messages ADD COLUMN group_id TEXT;

-- Create index for group lookups
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);

-- Create message_groups table to track group metadata
CREATE TABLE IF NOT EXISTS message_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    total_links INTEGER NOT NULL DEFAULT 1,
    accessed_count INTEGER DEFAULT 0,
    max_views INTEGER, -- NULL = unlimited, number = max views before all burn
    burn_on_first_view INTEGER DEFAULT 0, -- 1 = all copies burn after first view
    expires_at INTEGER
);

-- Index for faster group_id lookups
CREATE INDEX IF NOT EXISTS idx_message_groups_group_id ON message_groups(group_id);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_message_groups_expires_at ON message_groups(expires_at);
