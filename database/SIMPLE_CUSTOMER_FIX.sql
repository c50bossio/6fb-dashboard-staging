-- ===============================================
-- 6FB AI AGENT SYSTEM - SIMPLE CUSTOMER FIX
-- ===============================================
-- Simplified migration that handles type issues properly
-- Version: 1.0.8 (Simple and robust)
-- Date: 2025-08-30

-- ===============================================
-- STEP 1: Check and report current state
-- ===============================================

DO $$
DECLARE
  id_type text;
  rec record;
BEGIN
  RAISE NOTICE '=== Checking current customers table ===';
  
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'customers') THEN
    RAISE NOTICE 'Customers table does not exist - will create it';
  ELSE
    -- Show current columns
    RAISE NOTICE 'Current columns:';
    FOR rec IN 
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customers'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  - %: %', rec.column_name, rec.data_type;
    END LOOP;
    
    -- Get ID type
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'id';
    
    RAISE NOTICE 'ID type is: %', id_type;
  END IF;
END $$;

-- ===============================================
-- STEP 2: Backup existing data if needed
-- ===============================================

DO $$
BEGIN
  -- Create backup if customers exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'customers') THEN
    
    -- Drop old backup if exists
    DROP TABLE IF EXISTS public.customers_backup;
    
    -- Create backup
    CREATE TABLE public.customers_backup AS SELECT * FROM public.customers;
    RAISE NOTICE 'Created backup of customers table';
  END IF;
END $$;

-- ===============================================
-- STEP 3: Create new customers table with correct structure
-- ===============================================

-- Drop the existing customers table (we have backup)
DROP TABLE IF EXISTS public.customers CASCADE;

-- Create fresh table with correct types
CREATE TABLE public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barbershop_id UUID,
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  first_visit DATE,
  last_visit DATE,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  preferred_barber_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

RAISE NOTICE 'Created new customers table with UUID types';

-- ===============================================
-- STEP 4: Migrate data from backup if exists
-- ===============================================

DO $$
DECLARE
  col_exists boolean;
  migrate_count integer := 0;
BEGIN
  -- Only migrate if backup exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'customers_backup') THEN
    
    -- Check what columns exist in backup
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'customers_backup' 
      AND column_name = 'name'
    ) INTO col_exists;
    
    IF col_exists THEN
      -- Backup has 'name' column
      INSERT INTO public.customers (
        id,
        barbershop_id,
        email,
        full_name,
        phone,
        total_visits,
        total_spent,
        notes,
        created_at,
        updated_at
      )
      SELECT 
        -- Handle ID conversion
        CASE 
          WHEN id IS NULL THEN uuid_generate_v4()
          WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
          THEN id::text::UUID
          ELSE uuid_generate_v4()
        END,
        -- Handle barbershop_id conversion
        CASE 
          WHEN barbershop_id IS NULL THEN NULL
          WHEN barbershop_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN barbershop_id::text::UUID
          ELSE NULL
        END,
        email::text,
        COALESCE(name::text, email::text, 'Unknown Customer'),
        phone::text,
        COALESCE(total_visits::integer, 0),
        COALESCE(total_spent::numeric, 0),
        notes::text,
        COALESCE(created_at::timestamptz, NOW()),
        COALESCE(updated_at::timestamptz, NOW())
      FROM public.customers_backup;
      
    ELSE
      -- Try with full_name column
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers_backup' 
        AND column_name = 'full_name'
      ) INTO col_exists;
      
      IF col_exists THEN
        INSERT INTO public.customers (
          id,
          barbershop_id,
          email,
          full_name,
          phone,
          total_visits,
          total_spent,
          notes,
          created_at,
          updated_at
        )
        SELECT 
          CASE 
            WHEN id IS NULL THEN uuid_generate_v4()
            WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN id::text::UUID
            ELSE uuid_generate_v4()
          END,
          CASE 
            WHEN barbershop_id IS NULL THEN NULL
            WHEN barbershop_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN barbershop_id::text::UUID
            ELSE NULL
          END,
          email::text,
          COALESCE(full_name::text, email::text, 'Unknown Customer'),
          phone::text,
          COALESCE(total_visits::integer, 0),
          COALESCE(total_spent::numeric, 0),
          notes::text,
          COALESCE(created_at::timestamptz, NOW()),
          COALESCE(updated_at::timestamptz, NOW())
        FROM public.customers_backup;
      ELSE
        -- Minimal migration - just ID and email
        INSERT INTO public.customers (id, email, full_name)
        SELECT 
          CASE 
            WHEN id IS NULL THEN uuid_generate_v4()
            WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN id::text::UUID
            ELSE uuid_generate_v4()
          END,
          email::text,
          COALESCE(email::text, 'Unknown Customer')
        FROM public.customers_backup;
      END IF;
    END IF;
    
    GET DIAGNOSTICS migrate_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % records from backup', migrate_count;
    
    -- Optional: Drop backup after successful migration
    -- DROP TABLE public.customers_backup;
    -- RAISE NOTICE 'Dropped backup table';
  END IF;
END $$;

-- ===============================================
-- STEP 5: Clean duplicates
-- ===============================================

DELETE FROM public.customers c1
WHERE email IS NOT NULL
AND EXISTS (
  SELECT 1 FROM public.customers c2
  WHERE c2.barbershop_id IS NOT DISTINCT FROM c1.barbershop_id
  AND c2.email = c1.email
  AND c2.id > c1.id
);

-- ===============================================
-- STEP 6: Add constraints
-- ===============================================

DO $$
BEGIN
  -- Add unique constraint
  BEGIN
    ALTER TABLE public.customers 
      ADD CONSTRAINT customers_barbershop_id_email_key UNIQUE(barbershop_id, email);
    RAISE NOTICE 'Added unique constraint';
  EXCEPTION 
    WHEN duplicate_object THEN 
      RAISE NOTICE 'Unique constraint already exists';
    WHEN unique_violation THEN
      RAISE NOTICE 'Cannot add unique constraint - duplicates still exist';
  END;
END $$;

-- ===============================================
-- STEP 7: Create payments table
-- ===============================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID,
  barbershop_id UUID,
  customer_id UUID REFERENCES public.customers(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  payment_method TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT UNIQUE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ===============================================
-- STEP 8: Create indexes
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- ===============================================
-- STEP 9: Final summary
-- ===============================================

DO $$
DECLARE
  cust_count INTEGER;
  payment_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO cust_count FROM public.customers;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') INTO payment_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Customers table: % records (UUID type)', cust_count;
  RAISE NOTICE '✓ Payments table: %', CASE WHEN payment_exists THEN 'Created' ELSE 'Failed' END;
  RAISE NOTICE '✓ Backup table: %', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers_backup') 
    THEN 'Preserved (customers_backup)' 
    ELSE 'Not needed' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Your database is now properly configured!';
END $$;