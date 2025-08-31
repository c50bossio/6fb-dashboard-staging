-- ===============================================
-- SIMPLE BOOKINGS TABLE CREATION
-- ===============================================
-- First let's see what we actually have

-- Step 1: Show current table structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('barbershops', 'appointments', 'services', 'customers', 'profiles')
    AND column_name LIKE '%shop%' OR column_name LIKE '%barbershop%'
ORDER BY table_name, column_name;

-- Step 2: Create bookings table with minimal dependencies first
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID,
  service_id UUID, 
  barber_id UUID,
  appointment_id UUID,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'PENDING',
  price DECIMAL(10,2),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add shop reference column based on what exists
DO $$
DECLARE
    shop_column_exists boolean;
    barbershop_column_exists boolean;
BEGIN
    -- Check if barbershops table has 'id' column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barbershops' AND column_name = 'id'
    ) INTO barbershop_column_exists;
    
    IF barbershop_column_exists THEN
        -- Add the shop reference column
        ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS shop_id UUID;
        
        -- Add foreign key constraint
        BEGIN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_shop_id_fkey 
            FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Foreign key constraint already exists';
        END;
        
        RAISE NOTICE '✅ Added shop_id column with foreign key';
    ELSE
        RAISE NOTICE '❌ barbershops table not found or missing id column';
    END IF;
END $$;

-- Step 4: Add other foreign key constraints if tables exist
DO $$
BEGIN
    -- Add customers foreign key if customers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        BEGIN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    -- Add services foreign key if services table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
        BEGIN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_service_id_fkey 
            FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    -- Add profiles foreign key if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        BEGIN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_barber_id_fkey 
            FOREIGN KEY (barber_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
    
    -- Add appointments foreign key if appointments table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        BEGIN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_appointment_id_fkey 
            FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Step 5: Create indexes based on what columns actually exist
DO $$
DECLARE
    col_name text;
BEGIN
    -- Create indexes for existing columns only
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name IN ('shop_id', 'barbershop_id', 'customer_id', 'service_id', 'barber_id', 'date', 'status')
    LOOP
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bookings_%s ON public.bookings(%I)', col_name, col_name);
        RAISE NOTICE '✅ Created index for column: %', col_name;
    END LOOP;
END $$;

-- Step 6: Enable RLS and create basic policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows users to see their own bookings
CREATE POLICY IF NOT EXISTS "Users can view their bookings" ON public.bookings
  FOR SELECT USING (barber_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can manage their bookings" ON public.bookings
  FOR ALL USING (barber_id = auth.uid());

-- Step 7: Add updated_at trigger
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Grant permissions
GRANT ALL ON public.bookings TO authenticated;

-- Final verification
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'bookings'
ORDER BY ordinal_position;

RAISE NOTICE '✅ Bookings table setup complete!';
RAISE NOTICE '📋 Check the column list above to see what was created';
RAISE NOTICE '🎯 Calendar functionality should now work!';