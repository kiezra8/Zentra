-- ==========================================================
-- Zentra PostgreSQL Migration (v5) — Unified Multi-Device Sync
-- Ensures all tables, timestamps, and child item RLS policies 
-- work smoothly across all devices (Menu, Sales, Orders, Clinic)
-- ==========================================================

-- 1. CONVERT CLINIC & RESTAURANT TIMESTAMPS TO TIMESTAMPTZ (IF BIGINT)
DO $$
BEGIN
  -- menu_items
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'created_at' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE menu_items 
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
      ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
      ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
      ALTER COLUMN synced_at TYPE TIMESTAMPTZ USING CASE WHEN synced_at IS NOT NULL THEN to_timestamp(synced_at / 1000.0) ELSE NULL END;
  END IF;

  -- orders
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'created_at' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE orders 
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
      ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
      ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
      ALTER COLUMN synced_at TYPE TIMESTAMPTZ USING CASE WHEN synced_at IS NOT NULL THEN to_timestamp(synced_at / 1000.0) ELSE NULL END;
  END IF;

  -- patients
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'created_at' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE patients 
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
      ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
      ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
      ALTER COLUMN synced_at TYPE TIMESTAMPTZ USING CASE WHEN synced_at IS NOT NULL THEN to_timestamp(synced_at / 1000.0) ELSE NULL END;
  END IF;
END $$;

-- 2. ENSURE RLS IS CONFIGURED FOR SALE_ITEMS & ORDER_ITEMS
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sale items select" ON sale_items;
DROP POLICY IF EXISTS "Sale items insert" ON sale_items;
DROP POLICY IF EXISTS "Sale items update" ON sale_items;
DROP POLICY IF EXISTS "Sale items delete" ON sale_items;

CREATE POLICY "Sale items select" ON sale_items
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE user_belongs_to_business(business_id)
    )
  );

CREATE POLICY "Sale items insert" ON sale_items
  FOR INSERT WITH CHECK (
    sale_id IN (
      SELECT id FROM sales WHERE user_belongs_to_business(business_id)
    )
  );

CREATE POLICY "Sale items update" ON sale_items
  FOR UPDATE USING (
    sale_id IN (
      SELECT id FROM sales WHERE user_belongs_to_business(business_id)
    )
  );

CREATE POLICY "Sale items delete" ON sale_items
  FOR DELETE USING (
    sale_id IN (
      SELECT id FROM sales WHERE user_belongs_to_business(business_id)
    )
  );

-- Order items policies
DROP POLICY IF EXISTS "Order items select" ON order_items;
DROP POLICY IF EXISTS "Order items insert" ON order_items;
DROP POLICY IF EXISTS "Order items update" ON order_items;
DROP POLICY IF EXISTS "Order items delete" ON order_items;

CREATE POLICY "Order items select" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE user_belongs_to_business(business_id)
    )
  );

CREATE POLICY "Order items insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE user_belongs_to_business(business_id)
    )
  );

CREATE POLICY "Order items update" ON order_items
  FOR UPDATE USING (
    order_id IN (
      SELECT id FROM orders WHERE user_belongs_to_business(business_id)
    )
  );

CREATE POLICY "Order items delete" ON order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders WHERE user_belongs_to_business(business_id)
    )
  );

-- 3. ENSURE RLS POLICIES FOR MENU_ITEMS & ORDERS
DROP POLICY IF EXISTS "Menu items select" ON menu_items;
DROP POLICY IF EXISTS "Menu items insert" ON menu_items;
DROP POLICY IF EXISTS "Menu items update" ON menu_items;
DROP POLICY IF EXISTS "Menu items delete" ON menu_items;

CREATE POLICY "Menu items select" ON menu_items
  FOR SELECT USING (user_belongs_to_business(business_id));
CREATE POLICY "Menu items insert" ON menu_items
  FOR INSERT WITH CHECK (user_belongs_to_business(business_id));
CREATE POLICY "Menu items update" ON menu_items
  FOR UPDATE USING (user_belongs_to_business(business_id));
CREATE POLICY "Menu items delete" ON menu_items
  FOR DELETE USING (user_belongs_to_business(business_id));

DROP POLICY IF EXISTS "Orders select" ON orders;
DROP POLICY IF EXISTS "Orders insert" ON orders;
DROP POLICY IF EXISTS "Orders update" ON orders;
DROP POLICY IF EXISTS "Orders delete" ON orders;

CREATE POLICY "Orders select" ON orders
  FOR SELECT USING (user_belongs_to_business(business_id));
CREATE POLICY "Orders insert" ON orders
  FOR INSERT WITH CHECK (user_belongs_to_business(business_id));
CREATE POLICY "Orders update" ON orders
  FOR UPDATE USING (user_belongs_to_business(business_id));
CREATE POLICY "Orders delete" ON orders
  FOR DELETE USING (user_belongs_to_business(business_id));
