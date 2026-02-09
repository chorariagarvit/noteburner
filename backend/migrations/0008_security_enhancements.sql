-- Migration 0008: Security Enhancements (Audit Logs & Advanced Options)

-- Audit logs table (privacy-first - only country-level geo data)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'viewed', 'burned', 'password_attempt', 'password_failed'
  country TEXT, -- Country code only (e.g., 'US', 'GB') - no IP storage
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  success INTEGER DEFAULT 1, -- 0 for failed attempts, 1 for successful
  metadata TEXT -- JSON for additional non-sensitive data
);

CREATE INDEX idx_audit_message ON audit_logs(message_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);

-- Add security-related columns to messages table
ALTER TABLE messages ADD COLUMN creator_token TEXT; -- Token to access audit logs
ALTER TABLE messages ADD COLUMN max_views INTEGER DEFAULT 1; -- Max allowed views before deletion
ALTER TABLE messages ADD COLUMN view_count INTEGER DEFAULT 0; -- Current view count
ALTER TABLE messages ADD COLUMN max_password_attempts INTEGER DEFAULT 3; -- Max wrong passwords
ALTER TABLE messages ADD COLUMN password_attempts INTEGER DEFAULT 0; -- Current attempts
ALTER TABLE messages ADD COLUMN require_geo_match INTEGER DEFAULT 0; -- Must be same country
ALTER TABLE messages ADD COLUMN creator_country TEXT; -- Country where created
ALTER TABLE messages ADD COLUMN auto_burn_suspicious INTEGER DEFAULT 0; -- Auto-burn on suspicious activity
ALTER TABLE messages ADD COLUMN require_2fa INTEGER DEFAULT 0; -- Requires TOTP code
ALTER TABLE messages ADD COLUMN totp_secret TEXT; -- TOTP secret (if enabled)

CREATE INDEX idx_messages_view_count ON messages(view_count);
CREATE INDEX idx_messages_creator_token ON messages(creator_token);
