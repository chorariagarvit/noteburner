-- Migration: Add incorrect_attempts column to track failed decryption attempts
-- This allows users to retry with wrong password without losing access

ALTER TABLE messages ADD COLUMN incorrect_attempts INTEGER DEFAULT 0;
