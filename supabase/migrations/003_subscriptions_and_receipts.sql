-- ==========================================
-- Zentra PostgreSQL Migration (v3)
-- Subscriptions & Mobile Money Payment Target
-- ==========================================

-- 1. ADD SUBSCRIPTION FIELDS TO BUSINESSES TABLE
ALTER TABLE IF EXISTS businesses
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'small',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 2. INDEX FOR SUBSCRIPTION EXPIRY CHECKS
CREATE INDEX IF NOT EXISTS idx_businesses_sub_expiry ON businesses(subscription_expires_at);
