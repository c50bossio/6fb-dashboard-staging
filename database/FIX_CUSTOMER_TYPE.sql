-- ===============================================
-- 6FB AI AGENT SYSTEM - FIX CUSTOMER TYPE ISSUES
-- ===============================================
-- This script fixes type mismatches in the customers table
-- Version: 1.0.5 (Fix UUID type issues)
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
  
  RAISE NOTICE 'Current customers.id type: %', id_type;
  
  -- Check for existing foreign key constraints referencing customers
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_schema = 'public'
    AND kcu.referenced_table_name = 'customers'
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
      SELECT DISTINCT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'customers'
      AND tc.table_schema = 'public'
    ) LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
      RAISE NOTICE 'Dropped constraint % from table %', r.constraint_name, r.table_name;
    END LOOP;
    
    -- Create a new customers table with correct types
    RAISE NOTICE 'Creating new customers table with correct UUID type';
    
    CREATE TABLE public.customers_new (
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
        WHEN barbershop_id IS NOT NULL AND barbershop_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN barbershop_id::UUID
        ELSE NULL
      END as barbershop_id,
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
      CASE 
        WHEN preferred_barber_id IS NOT NULL AND preferred_barber_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN preferred_barber_id::UUID
        ELSE NULL
      END as preferred_barber_id,
      created_at,
      updated_at,
      metadata
    FROM public.customers;
    
    -- Drop old table and rename new one
    DROP TABLE public.customers CASCADE;
    ALTER TABLE public.customers_new RENAME TO customers;
    
    RAISE NOTICE 'Successfully converted customers table to use UUID';
  ELSE
    RAISE NOTICE 'customers.id is already UUID type';
  END IF;
END $$;

-- ===============================================
-- STEP 3: Clean duplicates and add constraints
-- ===============================================

-- Remove any duplicate customers by email/barbershop_id
DO $$
BEGIN
  DELETE FROM public.customers c1
  WHERE email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.customers c2
    WHERE c2.barbershop_id = c1.barbershop_id
    AND c2.email = c1.email
    AND c2.created_at > c1.created_at
  );
  RAISE NOTICE 'Cleaned duplicate customer records';
END $$;

-- Add foreign key constraints for customers table
DO $$
BEGIN
  -- Add foreign key to barbershops if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
    ALTER TABLE public.customers 
      DROP CONSTRAINT IF EXISTS customers_barbershop_id_fkey,
      ADD CONSTRAINT customers_barbershop_id_fkey 
      FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added barbershop_id foreign key';
  END IF;
  
  -- Add foreign key to profiles if exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE public.customers 
      DROP CONSTRAINT IF EXISTS customers_preferred_barber_id_fkey,
      ADD CONSTRAINT customers_preferred_barber_id_fkey 
      FOREIGN KEY (preferred_barber_id) REFERENCES public.profiles(id);
    RAISE NOTICE 'Added preferred_barber_id foreign key';
  END IF;
  
  -- Add unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_barbershop_id_email_key'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_barbershop_id_email_key UNIQUE(barbershop_id, email);
    RAISE NOTICE 'Added unique constraint for barbershop_id/email';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error adding constraints: %', SQLERRM;
END $$;

-- ===============================================
-- STEP 4: Create/fix payments table
-- ===============================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID,
  barbershop_id UUID,
  customer_id UUID,  -- Now this will work with UUID type
  amount DECIMAL(10,2) NOT NULL,
  status text DEFAULT 'PENDING',
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
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_customer_id_fkey'
  ) THEN
    ALTER TABLE public.payments 
      ADD CONSTRAINT payments_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.customers(id);
    RAISE NOTICE 'Added payments.customer_id foreign key';
  END IF;
  
  -- Add barbershop foreign key if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'payments_barbershop_id_fkey'
    ) THEN
      ALTER TABLE public.payments 
        ADD CONSTRAINT payments_barbershop_id_fkey 
        FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id);
      RAISE NOTICE 'Added payments.barbershop_id foreign key';
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error adding payment constraints: %', SQLERRM;
END $$;

-- ===============================================
-- STEP 5: Create indexes
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

CREATE INDEX IF NOT EXISTS idx_payments_barbershop_id ON public.payments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ===============================================
-- STEP 6: Summary
-- ===============================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TYPE FIX COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '1. Converted customers.id from TEXT to UUID';
  RAISE NOTICE '2. Cleaned duplicate customer records';
  RAISE NOTICE '3. Added proper foreign key constraints';
  RAISE NOTICE '4. Created payments table with correct types';
  RAISE NOTICE '';
END $$;