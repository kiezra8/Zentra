-- ================================================================
-- Zentra Migration v005 — Multi-Device Sync Fix
-- Adds business_id to child tables (order_items, sale_items)
-- and fixes RLS policies for full multi-device sync.
-- All operations are safe to re-run — fully wrapped in IF EXISTS.
-- NOTE: Requires migration 004 to have been run first.
-- ================================================================

-- ── 1. Add business_id to order_items ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'order_items' AND column_name = 'business_id'
    ) THEN
      ALTER TABLE order_items
        ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

      UPDATE order_items oi
      SET business_id = o.business_id
      FROM orders o
      WHERE oi.order_id = o.id;
    END IF;
  END IF;
END $$;

-- ── 2. Add business_id to sale_items ────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sale_items' AND column_name = 'business_id'
    ) THEN
      ALTER TABLE sale_items
        ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

      UPDATE sale_items si
      SET business_id = s.business_id
      FROM sales s
      WHERE si.sale_id = s.id;
    END IF;
  END IF;
END $$;

-- ── 3. sale_items RLS ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items') THEN
    ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Sale items select"                     ON sale_items;
    DROP POLICY IF EXISTS "Sale items insert"                     ON sale_items;
    DROP POLICY IF EXISTS "Sale items update"                     ON sale_items;
    DROP POLICY IF EXISTS "Sale items delete"                     ON sale_items;
    DROP POLICY IF EXISTS "Business members select sale_items"    ON sale_items;
    DROP POLICY IF EXISTS "Business members insert sale_items"    ON sale_items;
    DROP POLICY IF EXISTS "Business members update sale_items"    ON sale_items;

    EXECUTE $pol$
      CREATE POLICY "Sale items select" ON sale_items FOR SELECT USING (
        sale_id IN (SELECT id FROM sales WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
      CREATE POLICY "Sale items insert" ON sale_items FOR INSERT WITH CHECK (
        sale_id IN (SELECT id FROM sales WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
      CREATE POLICY "Sale items update" ON sale_items FOR UPDATE USING (
        sale_id IN (SELECT id FROM sales WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
      CREATE POLICY "Sale items delete" ON sale_items FOR DELETE USING (
        sale_id IN (SELECT id FROM sales WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
    $pol$;
  END IF;
END $$;

-- ── 4. order_items RLS ───────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    DROP POLICY IF EXISTS order_items_owner         ON order_items;
    DROP POLICY IF EXISTS "Order items select"      ON order_items;
    DROP POLICY IF EXISTS "Order items insert"      ON order_items;
    DROP POLICY IF EXISTS "Order items update"      ON order_items;
    DROP POLICY IF EXISTS "Order items delete"      ON order_items;

    EXECUTE $pol$
      CREATE POLICY "Order items select" ON order_items FOR SELECT USING (
        order_id IN (SELECT id FROM orders WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
      CREATE POLICY "Order items insert" ON order_items FOR INSERT WITH CHECK (
        order_id IN (SELECT id FROM orders WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
      CREATE POLICY "Order items update" ON order_items FOR UPDATE USING (
        order_id IN (SELECT id FROM orders WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
      CREATE POLICY "Order items delete" ON order_items FOR DELETE USING (
        order_id IN (SELECT id FROM orders WHERE business_id IN (
          SELECT id FROM businesses WHERE owner_id = auth.uid()
        ))
      );
    $pol$;
  END IF;
END $$;

-- ── 5. menu_items RLS ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
    DROP POLICY IF EXISTS menu_items_owner         ON menu_items;
    DROP POLICY IF EXISTS "Menu items select"      ON menu_items;
    DROP POLICY IF EXISTS "Menu items insert"      ON menu_items;
    DROP POLICY IF EXISTS "Menu items update"      ON menu_items;
    DROP POLICY IF EXISTS "Menu items delete"      ON menu_items;

    EXECUTE $pol$
      CREATE POLICY "Menu items select" ON menu_items FOR SELECT USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
      CREATE POLICY "Menu items insert" ON menu_items FOR INSERT WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
      CREATE POLICY "Menu items update" ON menu_items FOR UPDATE USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
      CREATE POLICY "Menu items delete" ON menu_items FOR DELETE USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
    $pol$;
  END IF;
END $$;

-- ── 6. orders RLS ────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    DROP POLICY IF EXISTS orders_owner        ON orders;
    DROP POLICY IF EXISTS "Orders select"     ON orders;
    DROP POLICY IF EXISTS "Orders insert"     ON orders;
    DROP POLICY IF EXISTS "Orders update"     ON orders;
    DROP POLICY IF EXISTS "Orders delete"     ON orders;

    EXECUTE $pol$
      CREATE POLICY "Orders select" ON orders FOR SELECT USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
      CREATE POLICY "Orders insert" ON orders FOR INSERT WITH CHECK (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
      CREATE POLICY "Orders update" ON orders FOR UPDATE USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
      CREATE POLICY "Orders delete" ON orders FOR DELETE USING (
        business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
      );
    $pol$;
  END IF;
END $$;

-- ── 7. Indexes (safe — IF NOT EXISTS) ────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_order_items_business ON order_items(business_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sale_items_business  ON sale_items(business_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sale_items_sale      ON sale_items(sale_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sales_biz_updated    ON sales(business_id, updated_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_biz_updated   ON orders(business_id, updated_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_menu_items_updated   ON menu_items(business_id, updated_at)';
  END IF;
END $$;
