-- =====================================================
-- MIGRATION 003: Consolidate Customers Schema
-- =====================================================
-- Purpose: Update customers table structure for barbershop-scoped data
-- Date: 2025-01-10
-- Related: Complete Barbershop Setup Feature (003)
--
-- This migration handles environments that already ran the initial
-- customers schema from database/schemas/customers.sql
--
-- IMPORTANT: This migration is IDEMPOTENT - safe to run multiple times
-- =====================================================

-- Step 1: Add barbershop_id column if it doesn't exist (CRITICAL for RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE customers
    ADD COLUMN barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added barbershop_id column to customers table';
  ELSE
    RAISE NOTICE 'barbershop_id column already exists - skipping';
  END IF;
END $$;

-- Step 2: Update email constraint to be scoped per barbershop (not globally unique)
DO $$
BEGIN
  -- Drop old unique constraint on email if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customers' AND constraint_name = 'customers_email_key'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_email_key;
    RAISE NOTICE 'Dropped global email unique constraint';
  END IF;

  -- Add new unique constraint: email must be unique per barbershop
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customers'
    AND constraint_name = 'customers_barbershop_email_unique'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_barbershop_email_unique
    UNIQUE(barbershop_id, email);

    RAISE NOTICE 'Added barbershop-scoped email unique constraint';
  ELSE
    RAISE NOTICE 'Barbershop-scoped email constraint already exists - skipping';
  END IF;
END $$;

-- Step 3: Make barbershop_id NOT NULL after data migration
-- WARNING: This requires ALL customers to have a barbershop_id assigned
DO $$
BEGIN
  -- Check if there are any NULL barbershop_id values
  IF EXISTS (SELECT 1 FROM customers WHERE barbershop_id IS NULL) THEN
    RAISE WARNING 'Found customers with NULL barbershop_id - you must assign barbershops before running this part';
    RAISE WARNING 'Run: UPDATE customers SET barbershop_id = (SELECT id FROM barbershops LIMIT 1) WHERE barbershop_id IS NULL;';
  ELSE
    -- Safe to make NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name = 'barbershop_id'
      AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE customers ALTER COLUMN barbershop_id SET NOT NULL;
      RAISE NOTICE 'Set barbershop_id to NOT NULL';
    ELSE
      RAISE NOTICE 'barbershop_id is already NOT NULL - skipping';
    END IF;
  END IF;
END $$;

-- Step 4: Add missing indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_customers_barbershop
  ON customers(barbershop_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_email
  ON customers(email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers(phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_name
  ON customers(name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_status
  ON customers(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_last_visit
  ON customers(last_visit DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber
  ON customers(preferred_barber_id)
  WHERE deleted_at IS NULL AND preferred_barber_id IS NOT NULL;

-- Step 5: Verify the trigger exists (created in customers.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_customers_updated_at'
  ) THEN
    RAISE WARNING 'Trigger trigger_customers_updated_at does not exist - check database/schemas/customers.sql';
  ELSE
    RAISE NOTICE 'Trigger trigger_customers_updated_at exists - OK';
  END IF;
END $$;

-- =====================================================
-- MIGRATION VALIDATION
-- =====================================================

DO $$
DECLARE
  has_barbershop_id boolean;
  is_not_null boolean;
  index_count integer;
BEGIN
  -- Check barbershop_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'barbershop_id'
  ) INTO has_barbershop_id;

  -- Check barbershop_id is NOT NULL
  SELECT (is_nullable = 'NO') INTO is_not_null
  FROM information_schema.columns
  WHERE table_name = 'customers' AND column_name = 'barbershop_id';

  -- Count indexes on customers table
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'customers';

  -- Report migration status
  RAISE NOTICE '=== Migration 003 Complete ===';
  RAISE NOTICE 'barbershop_id column exists: %', has_barbershop_id;
  RAISE NOTICE 'barbershop_id is NOT NULL: %', is_not_null;
  RAISE NOTICE 'Total indexes on customers: %', index_count;
  RAISE NOTICE '=== End of Migration 003 ===';
END $$;
