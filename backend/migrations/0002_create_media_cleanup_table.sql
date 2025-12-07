-- Migration: Create media cleanup tracking table
-- This table tracks media files marked for deletion to avoid re-uploading files to R2

CREATE TABLE IF NOT EXISTS media_cleanup (
  file_id TEXT PRIMARY KEY,
  delete_after INTEGER NOT NULL,
  marked_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delete_after ON media_cleanup(delete_after);
