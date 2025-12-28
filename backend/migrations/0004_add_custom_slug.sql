-- Migration: Add custom_slug column for user-defined URLs
-- Created: 2025-12-28

-- Add custom_slug column (optional, unique if provided)
ALTER TABLE messages ADD COLUMN custom_slug TEXT;

-- Create unique index on custom_slug (only for non-null values)
CREATE UNIQUE INDEX idx_messages_custom_slug ON messages(custom_slug) WHERE custom_slug IS NOT NULL;

-- Create index for faster lookups by slug
CREATE INDEX idx_messages_slug_lookup ON messages(custom_slug);
