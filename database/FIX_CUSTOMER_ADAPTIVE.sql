-- ===============================================
-- 6FB AI AGENT SYSTEM - ADAPTIVE CUSTOMER FIX
-- ===============================================
-- This script adapts to whatever columns exist in your current customers table
-- Version: 1.0.7 (Adaptive column detection)
-- Date: 2025-08-30

-- ===============================================
-- STEP 1: Analyze current customers table
-- ===============================================

DO $$
DECLARE
  col_record record;
  has_name_col boolean := false;
  has_full_name_col boolean := false;
  name_column text;
  id_type text;
BEGIN
  RAISE NOTICE '=== Analyzing current customers table structure ===';
  
  -- Check if customers table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_name = 'customers') THEN
    RAISE NOTICE 'Customers table does not exist - will create it';
    -- Create new table and exit this block
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
    RETURN; -- Exit block
  END IF;
  
  -- List all columns
  RAISE NOTICE 'Current columns in customers table:';
  FOR col_record IN 
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - %: % (nullable: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    
    -- Check for name columns
    IF col_record.column_name = 'full_name' THEN
      has_full_name_col := true;
      name_column := 'full_name';
    ELSIF col_record.column_name = 'name' THEN
      has_name_col := true;
      IF name_column IS NULL THEN
        name_column := 'name';
      END IF;
    END IF;
    
    -- Check ID type
    IF col_record.column_name = 'id' THEN
      id_type := col_record.data_type;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'ID column type: %', id_type;
  RAISE NOTICE 'Name column found: %', COALESCE(name_column, 'NONE');
END $$;

-- ===============================================
-- STEP 2: Fix the customers table based on what exists
-- ===============================================

DO $$
DECLARE
  id_type text;
  name_column text;
  col_exists boolean;
  r record;
BEGIN
  -- Get the current ID type
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name = 'id';
  
  -- Determine which name column exists
  SELECT column_name INTO name_column
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name IN ('full_name', 'name', 'customer_name')
  LIMIT 1;
  
  IF id_type = 'text' OR id_type = 'character varying' THEN
    RAISE NOTICE 'Converting customers.id from % to UUID', id_type;
    
    -- Drop foreign key constraints
    FOR r IN (
      SELECT conname
      FROM pg_constraint
      WHERE confrelid = 'public.customers'::regclass
    ) LOOP
      EXECUTE format('ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
    
    -- Create new table with correct types
    DROP TABLE IF EXISTS public.customers_new;
    
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
    
    -- Build dynamic INSERT based on existing columns
    IF name_column IS NOT NULL THEN
      -- We have a name column to migrate
      EXECUTE format('
        INSERT INTO public.customers_new (
          id, barbershop_id, email, full_name, phone,
          first_visit, last_visit, total_visits, total_spent,
          loyalty_points, tags, notes, preferred_barber_id,
          created_at, updated_at, metadata
        )
        SELECT 
          CASE 
            WHEN id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
            THEN id::UUID
            ELSE uuid_generate_v4()
          END,
          CASE 
            WHEN barbershop_id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
            THEN barbershop_id::UUID
            WHEN barbershop_id IN (''demo-shop-001'', ''demo-shop-002'')
            THEN uuid_generate_v4()
            ELSE NULL
          END,
          email,
          COALESCE(%I, ''Unknown Customer''),
          %s,
          %s,
          %s,
          %s,
          %s,
          %s,
          %s,
          %s,
          COALESCE(%s, NOW()),
          COALESCE(%s, NOW()),
          COALESCE(%s, ''{}''::jsonb)
        FROM public.customers',
        name_column,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') 
             THEN 'phone' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'first_visit') 
             THEN 'first_visit' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_visit') 
             THEN 'last_visit' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_visits') 
             THEN 'total_visits' ELSE '0' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_spent') 
             THEN 'total_spent' ELSE '0' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'loyalty_points') 
             THEN 'loyalty_points' ELSE '0' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tags') 
             THEN 'tags' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'notes') 
             THEN 'notes' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'preferred_barber_id') 
             THEN 'CASE WHEN preferred_barber_id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN preferred_barber_id::UUID ELSE NULL END' 
             ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_at') 
             THEN 'created_at' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'updated_at') 
             THEN 'updated_at' ELSE 'NULL' END,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'metadata') 
             THEN 'metadata' ELSE 'NULL' END
      );
    ELSE
      -- No name column, create with default
      EXECUTE '
        INSERT INTO public.customers_new (
          id, barbershop_id, email, full_name, created_at, updated_at
        )
        SELECT 
          CASE 
            WHEN id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
            THEN id::UUID
            ELSE uuid_generate_v4()
          END,
          CASE 
            WHEN barbershop_id ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
            THEN barbershop_id::UUID
            ELSE NULL
          END,
          email,
          COALESCE(email, ''Customer''),
          NOW(),
          NOW()
        FROM public.customers';
    END IF;
    
    RAISE NOTICE 'Migrated % records', (SELECT COUNT(*) FROM public.customers_new);
    
    -- Replace old table
    DROP TABLE public.customers CASCADE;
    ALTER TABLE public.customers_new RENAME TO customers;
    
    RAISE NOTICE 'Successfully converted customers table to UUID';
  ELSIF id_type = 'uuid' THEN
    RAISE NOTICE 'customers.id is already UUID - no conversion needed';
    
    -- Just ensure full_name column exists
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name TEXT;
    
    -- Update full_name from other name column if needed
    IF name_column IS NOT NULL AND name_column != 'full_name' THEN
      EXECUTE format('UPDATE public.customers SET full_name = %I WHERE full_name IS NULL', name_column);
    END IF;
    
    -- Set default for any remaining nulls
    UPDATE public.customers SET full_name = COALESCE(email, 'Unknown Customer') WHERE full_name IS NULL;
    
    -- Now make it NOT NULL
    ALTER TABLE public.customers ALTER COLUMN full_name SET NOT NULL;
  END IF;
END $$;

-- ===============================================
-- STEP 3: Clean duplicates
-- ===============================================

DO $$
BEGIN
  DELETE FROM public.customers c1
  WHERE email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.customers c2
    WHERE (c2.barbershop_id = c1.barbershop_id OR (c2.barbershop_id IS NULL AND c1.barbershop_id IS NULL))
    AND c2.email = c1.email
    AND c2.created_at > c1.created_at
  );
  RAISE NOTICE 'Cleaned duplicate customer records';
END $$;

-- ===============================================
-- STEP 4: Create payments table
-- ===============================================

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

-- ===============================================
-- STEP 5: Add constraints
-- ===============================================

DO $$
BEGIN
  -- Customer constraints
  BEGIN
    ALTER TABLE public.customers 
      DROP CONSTRAINT IF EXISTS customers_barbershop_id_email_key;
    ALTER TABLE public.customers 
      ADD CONSTRAINT customers_barbershop_id_email_key UNIQUE(barbershop_id, email);
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
  END;
  
  -- Payment constraints
  BEGIN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.customers(id);
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not add payment->customer foreign key: %', SQLERRM;
  END;
END $$;

-- ===============================================
-- STEP 6: Create indexes
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- ===============================================
-- STEP 7: Final verification
-- ===============================================

DO $$
DECLARE
  cust_count INTEGER;
  cust_id_type TEXT;
  payment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cust_count FROM public.customers;
  SELECT data_type INTO cust_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
  AND table_name = 'customers'
  AND column_name = 'id';
  
  SELECT COUNT(*) INTO payment_count 
  FROM information_schema.tables 
  WHERE table_name = 'payments';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Customers: % records with ID type: %', cust_count, cust_id_type;
  RAISE NOTICE 'Payments table: %', CASE WHEN payment_count > 0 THEN 'Created' ELSE 'Failed' END;
  RAISE NOTICE '';
END $$;