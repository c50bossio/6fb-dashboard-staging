-- ===============================================
-- FIX TYPE MISMATCH IN EXISTING TABLES
-- ===============================================
-- This script fixes the UUID/TEXT type mismatch issue

-- Step 1: Check current column types
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND t.table_name IN ('services', 'appointments', 'customers', 'barbershops', 'profiles')
    AND c.column_name IN ('id', 'service_id', 'shop_id', 'barbershop_id', 'customer_id', 'barber_id')
ORDER BY t.table_name, c.column_name;

-- Step 2: Drop constraints that might conflict
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_barbershop_id_fkey;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_shop_id_fkey;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_barbershop_id_fkey;

-- Step 3: Fix services table if id is TEXT
DO $$
BEGIN
    -- Check if services.id is TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Create a new UUID column
        ALTER TABLE public.services ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();
        
        -- Try to convert existing TEXT ids to UUID if they're valid UUIDs
        UPDATE public.services 
        SET id_new = CASE 
            WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN id::UUID 
            ELSE uuid_generate_v4() 
        END;
        
        -- Drop the old column and rename the new one
        ALTER TABLE public.services DROP COLUMN id;
        ALTER TABLE public.services RENAME COLUMN id_new TO id;
        ALTER TABLE public.services ADD PRIMARY KEY (id);
        
        RAISE NOTICE 'Fixed services.id from TEXT to UUID';
    END IF;
END $$;

-- Step 4: Fix other columns that might be TEXT instead of UUID
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Fix appointments.service_id if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'service_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN service_id_new UUID;
        UPDATE public.appointments 
        SET service_id_new = CASE 
            WHEN service_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN service_id::UUID 
            ELSE NULL 
        END;
        ALTER TABLE public.appointments DROP COLUMN service_id;
        ALTER TABLE public.appointments RENAME COLUMN service_id_new TO service_id;
        RAISE NOTICE 'Fixed appointments.service_id from TEXT to UUID';
    END IF;

    -- Fix appointments.customer_id if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'customer_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN customer_id_new UUID;
        UPDATE public.appointments 
        SET customer_id_new = CASE 
            WHEN customer_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN customer_id::UUID 
            ELSE NULL 
        END;
        ALTER TABLE public.appointments DROP COLUMN customer_id;
        ALTER TABLE public.appointments RENAME COLUMN customer_id_new TO customer_id;
        RAISE NOTICE 'Fixed appointments.customer_id from TEXT to UUID';
    END IF;

    -- Fix appointments.barbershop_id if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'barbershop_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN barbershop_id_new UUID;
        UPDATE public.appointments 
        SET barbershop_id_new = CASE 
            WHEN barbershop_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN barbershop_id::UUID 
            ELSE NULL 
        END;
        ALTER TABLE public.appointments DROP COLUMN barbershop_id;
        ALTER TABLE public.appointments RENAME COLUMN barbershop_id_new TO barbershop_id;
        RAISE NOTICE 'Fixed appointments.barbershop_id from TEXT to UUID';
    END IF;

    -- Fix appointments.barber_id if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'barber_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN barber_id_new UUID;
        UPDATE public.appointments 
        SET barber_id_new = CASE 
            WHEN barber_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN barber_id::UUID 
            ELSE NULL 
        END;
        ALTER TABLE public.appointments DROP COLUMN barber_id;
        ALTER TABLE public.appointments RENAME COLUMN barber_id_new TO barber_id;
        RAISE NOTICE 'Fixed appointments.barber_id from TEXT to UUID';
    END IF;
END $$;

-- Step 5: Fix customers table if needed
DO $$
BEGIN
    -- Check if customers.id is TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();
        UPDATE public.customers 
        SET id_new = CASE 
            WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN id::UUID 
            ELSE uuid_generate_v4() 
        END;
        ALTER TABLE public.customers DROP COLUMN id;
        ALTER TABLE public.customers RENAME COLUMN id_new TO id;
        ALTER TABLE public.customers ADD PRIMARY KEY (id);
        RAISE NOTICE 'Fixed customers.id from TEXT to UUID';
    END IF;

    -- Fix customers.barbershop_id if it's TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'barbershop_id' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN barbershop_id_new UUID;
        UPDATE public.customers 
        SET barbershop_id_new = CASE 
            WHEN barbershop_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN barbershop_id::UUID 
            ELSE NULL 
        END;
        ALTER TABLE public.customers DROP COLUMN barbershop_id;
        ALTER TABLE public.customers RENAME COLUMN barbershop_id_new TO barbershop_id;
        RAISE NOTICE 'Fixed customers.barbershop_id from TEXT to UUID';
    END IF;
END $$;

-- Step 6: Fix barbershops table if needed
DO $$
BEGIN
    -- Check if barbershops.id is TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'barbershops' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.barbershops ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();
        UPDATE public.barbershops 
        SET id_new = CASE 
            WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN id::UUID 
            ELSE uuid_generate_v4() 
        END;
        ALTER TABLE public.barbershops DROP COLUMN id;
        ALTER TABLE public.barbershops RENAME COLUMN id_new TO id;
        ALTER TABLE public.barbershops ADD PRIMARY KEY (id);
        RAISE NOTICE 'Fixed barbershops.id from TEXT to UUID';
    END IF;
END $$;

-- Step 7: Re-add foreign key constraints with proper UUID types
DO $$
BEGIN
    -- Add appointments foreign keys
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_service_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_service_id_fkey 
        FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_customer_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_barbershop_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_barbershop_id_fkey 
        FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_barber_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_barber_id_fkey 
        FOREIGN KEY (barber_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add services foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'services_shop_id_fkey'
    ) THEN
        ALTER TABLE public.services 
        ADD CONSTRAINT services_shop_id_fkey 
        FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
    END IF;

    -- Add customers foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customers_barbershop_id_fkey'
    ) THEN
        ALTER TABLE public.customers 
        ADD CONSTRAINT customers_barbershop_id_fkey 
        FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Some foreign key constraints could not be added - there may be orphaned records';
END $$;

-- Step 8: Verify the fixes
DO $$
DECLARE
    type_issues integer;
BEGIN
    SELECT COUNT(*) INTO type_issues
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name IN ('services', 'appointments', 'customers', 'barbershops')
    AND column_name IN ('id', 'service_id', 'customer_id', 'barbershop_id', 'barber_id', 'shop_id')
    AND data_type = 'text';

    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    IF type_issues = 0 THEN
        RAISE NOTICE '✅ ALL TYPE MISMATCHES FIXED!';
        RAISE NOTICE '   All ID columns are now properly UUID type';
    ELSE
        RAISE NOTICE '⚠️  WARNING: % columns still have TEXT type', type_issues;
        RAISE NOTICE '   Run the query below to see which columns need fixing';
    END IF;
    RAISE NOTICE '===============================================';
END $$;

-- Final check - shows current column types
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    CASE 
        WHEN c.data_type = 'uuid' OR c.udt_name = 'uuid' THEN '✅ UUID' 
        WHEN c.data_type = 'text' THEN '❌ TEXT (needs fix)'
        ELSE c.data_type
    END as status
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND t.table_name IN ('services', 'appointments', 'customers', 'barbershops', 'profiles')
    AND c.column_name IN ('id', 'service_id', 'shop_id', 'barbershop_id', 'customer_id', 'barber_id', 'owner_id')
ORDER BY t.table_name, c.column_name;