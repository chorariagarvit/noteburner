-- Migration 0007: Platform Integrations & Webhooks
-- Add tables for API keys and webhook subscriptions

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  rate_limit INTEGER DEFAULT 1000
);

CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of subscribed events
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at DATETIME,
  failure_count INTEGER DEFAULT 0
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(active);

-- Add created_via column to messages table (if not exists)
ALTER TABLE messages ADD COLUMN created_via TEXT DEFAULT 'web';

-- Add user_id column to messages table (for API tracking)
ALTER TABLE messages ADD COLUMN user_id TEXT;

CREATE INDEX idx_messages_created_via ON messages(created_via);
CREATE INDEX idx_messages_user_id ON messages(user_id);
