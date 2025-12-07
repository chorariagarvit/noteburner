-- Migration: Create messages table
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL,
    media_files TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    accessed INTEGER DEFAULT 0,
    accessed_at INTEGER
);

-- Index for faster token lookups
CREATE INDEX idx_messages_token ON messages(token);

-- Index for cleanup queries
CREATE INDEX idx_messages_expires_at ON messages(expires_at);
