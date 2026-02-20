-- Migration 0009: Enterprise Features
-- Add tables for teams, branding, and compliance

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  plan TEXT DEFAULT 'free', -- free, team, enterprise
  max_members INTEGER DEFAULT 5,
  custom_domain TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_domain ON teams(custom_domain);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- admin, member, viewer
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique ON team_members(team_id, user_id);

-- Team messages table (links messages to teams)
CREATE TABLE IF NOT EXISTS team_messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_message ON team_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created_by ON team_messages(created_by);

-- Branding configuration table
CREATE TABLE IF NOT EXISTS branding_config (
  id TEXT PRIMARY KEY,
  team_id TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f59e0b',
  secondary_color TEXT DEFAULT '#1f2937',
  custom_favicon TEXT,
  white_label INTEGER DEFAULT 0, -- Hide NoteBurner branding
  custom_footer TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_branding_team ON branding_config(team_id);

-- Compliance settings table
CREATE TABLE IF NOT EXISTS compliance_settings (
  id TEXT PRIMARY KEY,
  team_id TEXT UNIQUE NOT NULL,
  data_retention_days INTEGER DEFAULT 30,
  gdpr_enabled INTEGER DEFAULT 1,
  auto_delete_enabled INTEGER DEFAULT 1,
  audit_log_retention INTEGER DEFAULT 90,
  require_password INTEGER DEFAULT 0, -- Force password on all messages
  min_password_strength INTEGER DEFAULT 2, -- Minimum strength (0-4)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_compliance_team ON compliance_settings(team_id);

-- Team usage statistics table
CREATE TABLE IF NOT EXISTS team_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  date DATE NOT NULL,
  messages_created INTEGER DEFAULT 0,
  messages_viewed INTEGER DEFAULT 0,
  messages_burned INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  storage_used INTEGER DEFAULT 0, -- in bytes
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_stats_team ON team_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_date ON team_stats(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_stats_unique ON team_stats(team_id, date);

-- Add team_id to messages table for team workspace support
ALTER TABLE messages ADD COLUMN team_id TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_team ON messages(team_id);

-- Add API key usage tracking
ALTER TABLE api_keys ADD COLUMN requests_today INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN requests_month INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP;
