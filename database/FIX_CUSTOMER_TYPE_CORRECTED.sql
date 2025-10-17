-- ===============================================
-- 6FB AI AGENT SYSTEM - FIX CUSTOMER TYPE ISSUES (CORRECTED)
-- ===============================================
-- This script fixes type mismatches in the customers table
-- Version: 1.0.6 (Fixed column name errors)
-- Date: 2025-08-30

-- ===============================================
-- STEP 1: Check current customer table structure
-- ===============================================

DO $$
DECLARE
  id_type text;
  has_fk_constraints boolean;
BEGIN
  -- Check the current type of customers.id
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name = 'id';
  
  RAISE NOTICE 'Current customers.id type: %', COALESCE(id_type, 'table not found');
  
  -- Check for existing foreign key constraints referencing customers
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu 
      ON rc.constraint_name = kcu.constraint_name
    WHERE rc.constraint_schema = 'public'
    AND kcu.table_name = 'customers'
  ) INTO has_fk_constraints;
  
  IF has_fk_constraints THEN
    RAISE NOTICE 'Found foreign key constraints referencing customers table';
  END IF;
END $$;

-- ===============================================
-- STEP 2: Fix the customers table if needed
-- ===============================================

DO $$
DECLARE
  id_type text;
  r record;
BEGIN
  -- Get the current type
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name = 'id';
  
  IF id_type = 'text' OR id_type = 'character varying' THEN
    RAISE NOTICE 'Need to convert customers.id from TEXT to UUID';
    
    -- First, drop any foreign key constraints that reference customers
    FOR r IN (
      SELECT DISTINCT 
        rc.constraint_name, 
        tc.table_name
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc
        ON rc.constraint_name = tc.constraint_name
      WHERE rc.unique_constraint_schema = 'public'
      AND rc.constraint_schema = 'public'
      AND EXISTS (
        SELECT 1 
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = rc.unique_constraint_name
        AND kcu.table_name = 'customers'
      )
    ) LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
      RAISE NOTICE 'Dropped constraint % from table %', r.constraint_name, r.table_name;
    END LOOP;
    
    -- Create a new customers table with correct types
    RAISE NOTICE 'Creating new customers table with correct UUID type';
    
    -- Drop the new table if it exists from a previous failed attempt
    DROP TABLE IF EXISTS public.customers_new;
    
    CREATE TABLE public.customers_new (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      barbershop_id UUID,
      email TEXT,
      full_name TEXT,
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
    
    -- Copy data from old table, converting text IDs to UUIDs where possible
    INSERT INTO public.customers_new (
      id,
      barbershop_id,
      email,
      full_name,
      phone,
      first_visit,
      last_visit,
      total_visits,
      total_spent,
      loyalty_points,
      tags,
      notes,
      preferred_barber_id,
      created_at,
      updated_at,
      metadata
    )
    SELECT 
      CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN id::UUID
        ELSE uuid_generate_v4()
      END as id,
      CASE 
        WHEN barbershop_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN barbershop_id::UUID
        WHEN barbershop_id = 'demo-shop-001' OR barbershop_id = 'demo-shop-002'
        THEN uuid_generate_v4()  -- Generate new UUID for demo shops
        ELSE NULL
      END as barbershop_id,
      email,
      COALESCE(full_name, 'Unknown Customer'),  -- Ensure full_name is not null
      phone,
      first_visit,
      last_visit,
      total_visits,
      total_spent,
      loyalty_points,
      tags,
      notes,
      CASE 
        WHEN preferred_barber_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN preferred_barber_id::UUID
        ELSE NULL
      END as preferred_barber_id,
      COALESCE(created_at, NOW()),
      COALESCE(updated_at, NOW()),
      COALESCE(metadata, '{}'::jsonb)
    FROM public.customers;
    
    -- Get count of migrated records
    RAISE NOTICE 'Migrated % customer records', (SELECT COUNT(*) FROM public.customers_new);
    
    -- Drop old table and rename new one
    DROP TABLE public.customers CASCADE;
    ALTER TABLE public.customers_new RENAME TO customers;
    
    RAISE NOTICE 'Successfully converted customers table to use UUID';
  ELSIF id_type = 'uuid' THEN
    RAISE NOTICE 'customers.id is already UUID type - no conversion needed';
  ELSE
    RAISE NOTICE 'customers table does not exist - will be created';
  END IF;
END $$;

-- ===============================================
-- STEP 3: Ensure customers table exists
-- ===============================================

CREATE TABLE IF NOT EXISTS public.customers (
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

-- ===============================================
-- STEP 4: Clean duplicates
-- ===============================================

-- Remove any duplicate customers by email/barbershop_id
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  -- Count duplicates first
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT barbershop_id, email
    FROM public.customers
    WHERE email IS NOT NULL
    GROUP BY barbershop_id, email
    HAVING COUNT(*) > 1
  ) dups;
  
  IF dup_count > 0 THEN
    DELETE FROM public.customers c1
    WHERE email IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.customers c2
      WHERE c2.barbershop_id = c1.barbershop_id
      AND c2.email = c1.email
      AND c2.created_at > c1.created_at
    );
    RAISE NOTICE 'Cleaned % duplicate customer email combinations', dup_count;
  ELSE
    RAISE NOTICE 'No duplicate customer records found';
  END IF;
END $$;

-- ===============================================
-- STEP 5: Add constraints
-- ===============================================

-- Add foreign key constraints for customers table
DO $$
BEGIN
  -- Add foreign key to barbershops if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'barbershops') THEN
    BEGIN
      ALTER TABLE public.customers 
        DROP CONSTRAINT IF EXISTS customers_barbershop_id_fkey;
      ALTER TABLE public.customers
        ADD CONSTRAINT customers_barbershop_id_fkey 
        FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added barbershop_id foreign key';
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Could not add barbershop_id foreign key: %', SQLERRM;
    END;
  END IF;
  
  -- Add foreign key to profiles if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    BEGIN
      ALTER TABLE public.customers 
        DROP CONSTRAINT IF EXISTS customers_preferred_barber_id_fkey;
      ALTER TABLE public.customers
        ADD CONSTRAINT customers_preferred_barber_id_fkey 
        FOREIGN KEY (preferred_barber_id) REFERENCES public.profiles(id);
      RAISE NOTICE 'Added preferred_barber_id foreign key';
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Could not add preferred_barber_id foreign key: %', SQLERRM;
    END;
  END IF;
  
  -- Add unique constraint
  BEGIN
    ALTER TABLE public.customers 
      DROP CONSTRAINT IF EXISTS customers_barbershop_id_email_key;
    ALTER TABLE public.customers 
      ADD CONSTRAINT customers_barbershop_id_email_key UNIQUE(barbershop_id, email);
    RAISE NOTICE 'Added unique constraint for barbershop_id/email';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
  END;
END $$;

-- ===============================================
-- STEP 6: Create/fix payments table
-- ===============================================

-- Drop and recreate payments table with correct types
DROP TABLE IF EXISTS public.payments CASCADE;

CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID,
  barbershop_id UUID,
  customer_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',
  payment_method TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT UNIQUE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add foreign keys for payments
DO $$
BEGIN
  -- Add customer foreign key
  BEGIN
    ALTER TABLE public.payments 
      ADD CONSTRAINT payments_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.customers(id);
    RAISE NOTICE 'Added payments.customer_id foreign key';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Could not add customer_id foreign key: %', SQLERRM;
  END;
  
  -- Add barbershop foreign key if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'barbershops') THEN
    BEGIN
      ALTER TABLE public.payments 
        ADD CONSTRAINT payments_barbershop_id_fkey 
        FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id);
      RAISE NOTICE 'Added payments.barbershop_id foreign key';
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Could not add barbershop_id foreign key: %', SQLERRM;
    END;
  END IF;
END $$;

-- ===============================================
-- STEP 7: Create indexes
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

CREATE INDEX IF NOT EXISTS idx_payments_barbershop_id ON public.payments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ===============================================
-- STEP 8: Summary
-- ===============================================

DO $$ 
DECLARE
  cust_count INTEGER;
  cust_id_type TEXT;
BEGIN
  -- Get final counts and type
  SELECT COUNT(*) INTO cust_count FROM public.customers;
  SELECT data_type INTO cust_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name = 'id';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TYPE FIX COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '- Customers table has % records', cust_count;
  RAISE NOTICE '- Customer ID type is now: %', cust_id_type;
  RAISE NOTICE '- Payments table created with correct UUID types';
  RAISE NOTICE '- All foreign keys and constraints added';
  RAISE NOTICE '';
  RAISE NOTICE 'Your database schema is now properly aligned!';
END $$;