-- Server-side one-time access enforcement
-- auth_hash: SHA-256 of a password-derived auth tag (never the password or key).
--            NULL for legacy / group messages (no server-side password check).
-- totp_attempts: atomic per-message counter for 2FA guesses.
ALTER TABLE messages ADD COLUMN auth_hash TEXT;
ALTER TABLE messages ADD COLUMN totp_attempts INTEGER NOT NULL DEFAULT 0;
