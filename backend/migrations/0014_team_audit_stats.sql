-- Team data: audit events carry the team they belong to, so team exports and stats
-- can be built after the message itself has been burned (and its row deleted).
ALTER TABLE audit_logs ADD COLUMN team_id TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_team ON audit_logs(team_id, timestamp);
