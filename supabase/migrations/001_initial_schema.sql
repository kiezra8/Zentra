-- ==========================================
-- Zentra PostgreSQL / Supabase Schema (v1)
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  currency TEXT DEFAULT 'UGX',
  location TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  has_employees BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 2. BUSINESS MEMBERS (Roles & Permissions)
CREATE TABLE IF NOT EXISTS business_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'owner',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS & CATALOGUE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  buying_price NUMERIC(15,2) DEFAULT 0,
  selling_price NUMERIC(15,2) DEFAULT 0,
  stock_qty NUMERIC(15,2) DEFAULT 0,
  min_stock NUMERIC(15,2) DEFAULT 5,
  supplier_id UUID,
  unit TEXT DEFAULT 'pcs',
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 4. SALES
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID,
  employee_id UUID,
  total NUMERIC(15,2) NOT NULL,
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  receipt_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 5. SALE ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  quantity NUMERIC(15,2) NOT NULL,
  unit_price NUMERIC(15,2) NOT NULL,
  discount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL
);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  category_id TEXT,
  category_name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  credit_balance NUMERIC(15,2) DEFAULT 0,
  total_purchases NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 8. CASH TRANSACTIONS
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
  amount NUMERIC(15,2) NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 9. TRANSPORT TRIPS
CREATE TABLE IF NOT EXISTS transport_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  income NUMERIC(15,2) NOT NULL,
  fuel_cost NUMERIC(15,2) DEFAULT 0,
  other_cost NUMERIC(15,2) DEFAULT 0,
  pickup TEXT,
  destination TEXT,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 10. MOBILE MONEY TRANSACTIONS
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  network TEXT NOT NULL, -- 'mtn', 'airtel', 'bank'
  type TEXT NOT NULL,    -- 'deposit', 'withdrawal', 'transfer', 'commission'
  amount NUMERIC(15,2) NOT NULL,
  commission NUMERIC(15,2) DEFAULT 0,
  tx_ref TEXT,
  customer_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- 11. INCOME ENTRIES (Hustler)
CREATE TABLE IF NOT EXISTS income_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  source TEXT,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT,
  version INT DEFAULT 1
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;

-- Helper policy function: user belongs to business
CREATE OR REPLACE FUNCTION user_belongs_to_business(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM businesses WHERE id = b_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM business_members WHERE business_id = b_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for businesses
CREATE POLICY "Owners and members can view businesses" ON businesses
  FOR SELECT USING (owner_id = auth.uid() OR user_belongs_to_business(id));

CREATE POLICY "Owners can update businesses" ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create businesses" ON businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Policies for synced tables (sales, expenses, products, etc.)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['products', 'sales', 'expenses', 'customers', 'cash_transactions', 'transport_trips', 'mobile_money_transactions', 'income_entries'])
  LOOP
    EXECUTE format('
      CREATE POLICY "Business members select %1$s" ON %1$s FOR SELECT USING (user_belongs_to_business(business_id));
      CREATE POLICY "Business members insert %1$s" ON %1$s FOR INSERT WITH CHECK (user_belongs_to_business(business_id));
      CREATE POLICY "Business members update %1$s" ON %1$s FOR UPDATE USING (user_belongs_to_business(business_id));
    ', tbl);
  END LOOP;
END $$;
