-- Undo 0013: removes the password check hash and the 2FA attempt counter.
-- WARNING: this also removes the server-side password check for messages created since 0013, so roll back
-- the matching Worker release first and expect those messages to become unreadable.
ALTER TABLE messages DROP COLUMN auth_hash;
ALTER TABLE messages DROP COLUMN totp_attempts;
-- Forget that 0013 was applied, so `wrangler d1 migrations apply` runs it again later
DELETE FROM d1_migrations WHERE name = '0013_server_side_burn.sql';
