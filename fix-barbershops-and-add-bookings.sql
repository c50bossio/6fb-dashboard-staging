-- ===============================================
-- FIX BARBERSHOPS ID TYPE AND ADD BOOKINGS TABLE  
-- ===============================================
-- This script fixes the TEXT/UUID mismatch and creates bookings table

-- Step 1: Check current types
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('barbershops', 'profiles')
    AND column_name = 'id'
ORDER BY table_name;

-- Step 2: Fix barbershops.id if it's TEXT
DO $$
DECLARE
    barbershops_id_type text;
BEGIN
    -- Check barbershops.id type
    SELECT data_type INTO barbershops_id_type
    FROM information_schema.columns 
    WHERE table_name = 'barbershops' AND column_name = 'id';
    
    IF barbershops_id_type = 'text' THEN
        RAISE NOTICE '🔧 Converting barbershops.id from TEXT to UUID...';
        
        -- Drop foreign key constraints that reference barbershops.id
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_shop_id_fkey;
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_barbershop_id_fkey;
        ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_shop_id_fkey;
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_barbershop_id_fkey;
        ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_barbershop_id_fkey;
        ALTER TABLE public.barbershop_staff DROP CONSTRAINT IF EXISTS barbershop_staff_barbershop_id_fkey;
        
        -- Convert barbershops.id to UUID
        ALTER TABLE public.barbershops ADD COLUMN id_new UUID DEFAULT uuid_generate_v4();
        
        -- Try to convert existing TEXT ids to UUID if they're valid
        UPDATE public.barbershops 
        SET id_new = CASE 
            WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
            THEN id::UUID 
            ELSE uuid_generate_v4() 
        END;
        
        -- Drop old column and rename new one
        ALTER TABLE public.barbershops DROP COLUMN id;
        ALTER TABLE public.barbershops RENAME COLUMN id_new TO id;
        ALTER TABLE public.barbershops ADD PRIMARY KEY (id);
        
        -- Recreate foreign key constraints with UUID
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'shop_id') THEN
            ALTER TABLE public.profiles 
            ADD CONSTRAINT profiles_shop_id_fkey 
            FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE SET NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'barbershop_id') THEN
            ALTER TABLE public.profiles 
            ADD CONSTRAINT profiles_barbershop_id_fkey 
            FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE SET NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'shop_id') THEN
            ALTER TABLE public.services 
            ADD CONSTRAINT services_shop_id_fkey 
            FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'barbershop_id') THEN
            ALTER TABLE public.customers 
            ADD CONSTRAINT customers_barbershop_id_fkey 
            FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'barbershop_id') THEN
            ALTER TABLE public.appointments 
            ADD CONSTRAINT appointments_barbershop_id_fkey 
            FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershop_staff' AND column_name = 'barbershop_id') THEN
            ALTER TABLE public.barbershop_staff 
            ADD CONSTRAINT barbershop_staff_barbershop_id_fkey 
            FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE '✅ Successfully converted barbershops.id to UUID';
    ELSE
        RAISE NOTICE '✅ barbershops.id is already UUID type';
    END IF;
END $$;

-- Step 3: Create bookings table with UUID types
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
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

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON public.bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON public.bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Step 5: Enable RLS and create policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can manage their bookings" ON public.bookings;
    
    -- Create new policies
    CREATE POLICY "Users can view their bookings" ON public.bookings
        FOR SELECT USING (
            barber_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.barbershop_staff
                WHERE barbershop_staff.barbershop_id = bookings.shop_id
                AND barbershop_staff.user_id = auth.uid()
                AND barbershop_staff.is_active = true
            )
        );
    
    CREATE POLICY "Users can manage their bookings" ON public.bookings
        FOR ALL USING (
            barber_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.barbershop_staff
                WHERE barbershop_staff.barbershop_id = bookings.shop_id
                AND barbershop_staff.user_id = auth.uid()
                AND barbershop_staff.is_active = true
            )
        );
END $$;

-- Step 6: Add updated_at trigger
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Grant permissions
GRANT ALL ON public.bookings TO authenticated;

-- Step 8: Final verification
DO $$
DECLARE
    barbershops_type text;
    bookings_exists boolean;
BEGIN
    -- Check final types
    SELECT data_type INTO barbershops_type
    FROM information_schema.columns 
    WHERE table_name = 'barbershops' AND column_name = 'id';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'bookings'
    ) INTO bookings_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ TYPE FIXES AND BOOKINGS TABLE COMPLETE!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '🔧 barbershops.id type: %', barbershops_type;
    RAISE NOTICE '📅 bookings table exists: %', bookings_exists;
    RAISE NOTICE '';
    IF barbershops_type = 'uuid' AND bookings_exists THEN
        RAISE NOTICE '🎉 All UUID types are correct!';
        RAISE NOTICE '🚀 Calendar functionality ready!';
        RAISE NOTICE '✅ Supabase integration complete!';
    ELSE
        RAISE NOTICE '⚠️  Some issues may remain - check the details above';
    END IF;
    RAISE NOTICE '===============================================';
END $$;

-- Show final structure
SELECT 
    'barbershops' as table_name,
    'id' as column_name,
    data_type,
    'Primary key for shops' as description
FROM information_schema.columns 
WHERE table_name = 'barbershops' AND column_name = 'id'
UNION ALL
SELECT 
    'bookings' as table_name,
    column_name,
    data_type,
    'Bookings table column' as description
FROM information_schema.columns 
WHERE table_name = 'bookings'
ORDER BY table_name, column_name;