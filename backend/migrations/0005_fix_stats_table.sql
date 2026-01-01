-- Migration: Fix stats table with proper unique constraint
-- Created: 2026-01-02
-- Purpose: Add missing unique index and consolidate duplicate rows

-- First, create the unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_metric_period_date 
  ON stats(metric, period, date);

-- Consolidate duplicate rows into a temporary table
CREATE TABLE stats_consolidated AS
SELECT 
  MIN(id) as id,
  metric,
  SUM(value) as value,
  period,
  date,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM stats
GROUP BY metric, period, date;

-- Drop the old table
DROP TABLE stats;

-- Rename the consolidated table
ALTER TABLE stats_consolidated RENAME TO stats;

-- Recreate the unique index on the new table
CREATE UNIQUE INDEX idx_stats_metric_period_date 
  ON stats(metric, period, date);
