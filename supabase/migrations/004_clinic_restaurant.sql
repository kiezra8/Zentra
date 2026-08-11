-- ==========================================
-- Zentra Migration 004 — Clinic & Restaurant
-- ==========================================

-- ── CLINIC TABLES ──────────────────────────

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  dob BIGINT,
  address TEXT,
  blood_group TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  -- sync
  sync_status TEXT DEFAULT 'synced',
  device_id TEXT,
  version INT DEFAULT 1,
  synced_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Patient Visits
CREATE TABLE IF NOT EXISTS patient_visits (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date BIGINT NOT NULL,
  chief_complaint TEXT NOT NULL,
  triage_bp TEXT,
  triage_temp TEXT,
  triage_weight TEXT,
  triage_pulse TEXT,
  diagnosis TEXT,
  doctor_notes TEXT,
  status TEXT DEFAULT 'closed' CHECK (status IN ('triage', 'waiting', 'with_doctor', 'closed')),
  -- sync
  sync_status TEXT DEFAULT 'synced',
  device_id TEXT,
  version INT DEFAULT 1,
  synced_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES patient_visits(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  quantity INT DEFAULT 1,
  dispensed BOOLEAN DEFAULT false,
  dispensed_at BIGINT,
  -- sync
  sync_status TEXT DEFAULT 'synced',
  device_id TEXT,
  version INT DEFAULT 1,
  synced_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Patient Bills
CREATE TABLE IF NOT EXISTS patient_bills (
  id UUID PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES patient_visits(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_fee NUMERIC DEFAULT 0,
  medicine_cost NUMERIC DEFAULT 0,
  lab_cost NUMERIC DEFAULT 0,
  other_cost NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  -- sync
  sync_status TEXT DEFAULT 'synced',
  device_id TEXT,
  version INT DEFAULT 1,
  synced_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ── RESTAURANT TABLES ──────────────────────

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Food',
  price NUMERIC NOT NULL,
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  -- sync
  sync_status TEXT DEFAULT 'synced',
  device_id TEXT,
  version INT DEFAULT 1,
  synced_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_no TEXT,
  customer_name TEXT,
  items_count INT DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'preparing', 'served', 'paid', 'cancelled')),
  notes TEXT,
  -- sync
  sync_status TEXT DEFAULT 'synced',
  device_id TEXT,
  version INT DEFAULT 1,
  synced_at BIGINT,
  deleted_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total NUMERIC NOT NULL,
  notes TEXT
);

-- ── INDEXES ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_business    ON patients(business_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_biz   ON patient_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_pat   ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit  ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_patient_bills_pat    ON patient_bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_biz       ON menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_biz           ON orders(business_id);

-- ── ROW LEVEL SECURITY ─────────────────────
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_bills  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see records belonging to their business
DROP POLICY IF EXISTS patients_owner       ON patients;
DROP POLICY IF EXISTS patient_visits_owner ON patient_visits;
DROP POLICY IF EXISTS prescriptions_owner  ON prescriptions;
DROP POLICY IF EXISTS patient_bills_owner  ON patient_bills;
DROP POLICY IF EXISTS menu_items_owner     ON menu_items;
DROP POLICY IF EXISTS orders_owner         ON orders;
DROP POLICY IF EXISTS order_items_owner    ON order_items;

CREATE POLICY patients_owner ON patients
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY patient_visits_owner ON patient_visits
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY prescriptions_owner ON prescriptions
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY patient_bills_owner ON patient_bills
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY menu_items_owner ON menu_items
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY orders_owner ON orders
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
CREATE POLICY order_items_owner ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders
      WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  );

