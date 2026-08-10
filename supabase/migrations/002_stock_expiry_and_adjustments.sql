-- ==========================================
-- Zentra PostgreSQL Migration (v2)
-- Non-disruptive additions for Stock Expiry & Customer Debt
-- ==========================================

-- 1. ADD EXPIRY DATE TO PRODUCTS
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- 2. ADD DEBT & PAYMENT FIELDS TO CUSTOMERS
ALTER TABLE IF EXISTS customers
  ADD COLUMN IF NOT EXISTS initial_debt NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15,2) DEFAULT 0;

-- 3. INDEX FOR EXPIRY DATE SEARCHES
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date);
