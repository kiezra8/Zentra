-- ================================================================
-- Zentra Migration v006 — Timestamp Normalization
-- Converts BIGINT epoch-ms timestamps to TIMESTAMPTZ in all
-- tables created by migration 004 (clinic + restaurant).
-- IMPORTANT: Run migration 004 before this one.
-- All operations wrapped in IF EXISTS checks — fully safe to run.
-- ================================================================

-- menu_items timestamps
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'menu_items' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
      ALTER TABLE menu_items
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
        ALTER COLUMN synced_at  TYPE TIMESTAMPTZ USING CASE WHEN synced_at  IS NOT NULL THEN to_timestamp(synced_at  / 1000.0) ELSE NULL END;
    END IF;
    ALTER TABLE menu_items ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;

-- orders timestamps
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
      ALTER TABLE orders
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
        ALTER COLUMN synced_at  TYPE TIMESTAMPTZ USING CASE WHEN synced_at  IS NOT NULL THEN to_timestamp(synced_at  / 1000.0) ELSE NULL END;
    END IF;
    ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;

-- patients timestamps
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'patients' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
      ALTER TABLE patients
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
        ALTER COLUMN synced_at  TYPE TIMESTAMPTZ USING CASE WHEN synced_at  IS NOT NULL THEN to_timestamp(synced_at  / 1000.0) ELSE NULL END;
    END IF;
    ALTER TABLE patients ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;

-- patient_visits timestamps
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_visits') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'patient_visits' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
      ALTER TABLE patient_visits
        ALTER COLUMN visit_date TYPE TIMESTAMPTZ USING to_timestamp(visit_date / 1000.0),
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
        ALTER COLUMN synced_at  TYPE TIMESTAMPTZ USING CASE WHEN synced_at  IS NOT NULL THEN to_timestamp(synced_at  / 1000.0) ELSE NULL END;
    END IF;
    ALTER TABLE patient_visits ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;

-- prescriptions timestamps
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'prescriptions' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
      ALTER TABLE prescriptions
        ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING to_timestamp(created_at   / 1000.0),
        ALTER COLUMN updated_at   TYPE TIMESTAMPTZ USING to_timestamp(updated_at   / 1000.0),
        ALTER COLUMN dispensed_at TYPE TIMESTAMPTZ USING CASE WHEN dispensed_at IS NOT NULL THEN to_timestamp(dispensed_at / 1000.0) ELSE NULL END,
        ALTER COLUMN deleted_at   TYPE TIMESTAMPTZ USING CASE WHEN deleted_at   IS NOT NULL THEN to_timestamp(deleted_at   / 1000.0) ELSE NULL END,
        ALTER COLUMN synced_at    TYPE TIMESTAMPTZ USING CASE WHEN synced_at    IS NOT NULL THEN to_timestamp(synced_at    / 1000.0) ELSE NULL END;
    END IF;
    ALTER TABLE prescriptions ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;

-- patient_bills timestamps
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_bills') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'patient_bills' AND column_name = 'created_at' AND data_type = 'bigint'
    ) THEN
      ALTER TABLE patient_bills
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0),
        ALTER COLUMN deleted_at TYPE TIMESTAMPTZ USING CASE WHEN deleted_at IS NOT NULL THEN to_timestamp(deleted_at / 1000.0) ELSE NULL END,
        ALTER COLUMN synced_at  TYPE TIMESTAMPTZ USING CASE WHEN synced_at  IS NOT NULL THEN to_timestamp(synced_at  / 1000.0) ELSE NULL END;
    END IF;
    ALTER TABLE patient_bills ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;
END $$;
