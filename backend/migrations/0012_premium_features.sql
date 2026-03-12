-- Week 14: Premium Features
-- Migration: 0012_premium_features.sql

-- Premium plans catalog
CREATE TABLE IF NOT EXISTS premium_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                    -- 'free', 'premium', 'lifetime'
  price_monthly INTEGER NOT NULL DEFAULT 0, -- cents (0 = free, 500 = $5)
  price_lifetime INTEGER NOT NULL DEFAULT 0, -- cents (4900 = $49)
  file_size_limit INTEGER NOT NULL DEFAULT 104857600, -- bytes (100MB default)
  custom_urls_limit INTEGER NOT NULL DEFAULT 5,       -- -1 = unlimited
  api_calls_limit INTEGER NOT NULL DEFAULT 1000,      -- per day, -1 = unlimited
  features TEXT NOT NULL DEFAULT '[]',   -- JSON array of feature flags
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active', -- 'active','cancelled','expired','trialing'
  payment_method TEXT DEFAULT NULL,      -- 'stripe','crypto','manual'
  stripe_customer_id TEXT DEFAULT NULL,
  stripe_subscription_id TEXT DEFAULT NULL,
  btc_address TEXT DEFAULT NULL,         -- for crypto payments
  current_period_start DATETIME DEFAULT NULL,
  current_period_end DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES premium_plans(id)
);

-- Monthly usage tracking
CREATE TABLE IF NOT EXISTS premium_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  month_year TEXT NOT NULL,              -- 'YYYY-MM'
  messages_created INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  storage_used INTEGER DEFAULT 0,        -- bytes
  api_calls INTEGER DEFAULT 0,
  custom_urls_created INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month_year),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_premium_usage_user_month ON premium_usage(user_id, month_year);

-- Seed default plans
INSERT OR IGNORE INTO premium_plans (id, name, price_monthly, price_lifetime, file_size_limit, custom_urls_limit, api_calls_limit, features) VALUES
  ('free',     'Free',     0,   0,    104857600,   5,  1000,  '["basic_encryption","one_time_messages","file_uploads_100mb","5_custom_urls"]'),
  ('premium',  'Premium',  500, 0,    1073741824,  -1, 10000, '["basic_encryption","one_time_messages","file_uploads_1gb","unlimited_custom_urls","priority_support","advanced_analytics","api_access","no_ads","premium_badge"]'),
  ('lifetime', 'Lifetime', 0,   4900, 1073741824,  -1, -1,    '["basic_encryption","one_time_messages","file_uploads_1gb","unlimited_custom_urls","priority_support","advanced_analytics","api_access","no_ads","premium_badge","lifetime_updates"]');
