-- Undo 0014: audit events no longer carry a team id.
DROP INDEX IF EXISTS idx_audit_team;
ALTER TABLE audit_logs DROP COLUMN team_id;
-- Forget that 0014 was applied, so `wrangler d1 migrations apply` runs it again later
DELETE FROM d1_migrations WHERE name = '0014_team_audit_stats.sql';
