-- ===============================================
-- FINAL BOOKINGS TABLE CREATION (NO ERRORS)
-- ===============================================

-- Step 1: Create bookings table with minimal dependencies
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

-- Step 2: Add shop reference column
DO $$
BEGIN
    -- Add shop_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'shop_id'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN shop_id UUID;
    END IF;
    
    -- Add foreign key constraints only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_shop_id_fkey'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_shop_id_fkey 
            FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Add other foreign keys if tables exist and constraints don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_customer_id_fkey'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_service_id_fkey'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_service_id_fkey 
            FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_barber_id_fkey'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_barber_id_fkey 
            FOREIGN KEY (barber_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_appointment_id_fkey'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
            ALTER TABLE public.bookings 
            ADD CONSTRAINT bookings_appointment_id_fkey 
            FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_shop_id ON public.bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON public.bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Step 4: Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Step 5: Handle policies properly (drop existing ones first)
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can manage their bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Users can view bookings for their shop" ON public.bookings;
    DROP POLICY IF EXISTS "Users can manage bookings for their shop" ON public.bookings;
    
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

-- Step 8: Success message
DO $$
DECLARE
    column_count integer;
    policy_count integer;
    index_count integer;
BEGIN
    -- Count what we created
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookings';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = 'bookings';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'bookings';

    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ BOOKINGS TABLE CREATED SUCCESSFULLY!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '📊 Table Details:';
    RAISE NOTICE '  • Columns: %', column_count;
    RAISE NOTICE '  • RLS Policies: %', policy_count;
    RAISE NOTICE '  • Indexes: %', index_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Calendar functionality ready!';
    RAISE NOTICE '📅 Bookings table available for appointments';
    RAISE NOTICE '🔒 Row Level Security enabled';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your 6FB AI Agent System is now complete!';
    RAISE NOTICE '===============================================';
END $$;

-- Show final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'bookings'
ORDER BY ordinal_position;