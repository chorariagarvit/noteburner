-- Migration: Add stats tracking tables
-- Created: 2025-12-17

-- Stats table for tracking platform-wide metrics
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL, -- 'all_time', 'today', 'this_week'
  date TEXT NOT NULL, -- ISO date string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_metric_period_date 
  ON stats(metric, period, date);

-- Insert initial counters
INSERT OR IGNORE INTO stats (metric, value, period, date) VALUES
  ('messages_created', 0, 'all_time', date('now')),
  ('messages_burned', 0, 'all_time', date('now')),
  ('files_encrypted', 0, 'all_time', date('now')),
  ('total_file_size', 0, 'all_time', date('now')),
  ('messages_created', 0, 'today', date('now')),
  ('messages_burned', 0, 'today', date('now')),
  ('messages_created', 0, 'this_week', date('now')),
  ('messages_burned', 0, 'this_week', date('now'));
