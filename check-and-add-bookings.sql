-- ===============================================
-- CHECK EXISTING SCHEMA AND ADD BOOKINGS TABLE
-- ===============================================
-- This script checks what columns exist and creates bookings table accordingly

-- First, let's see what columns exist in our key tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'barbershops', 'services', 'customers', 'appointments')
ORDER BY table_name, ordinal_position;

-- Check if barbershops table exists and what columns it has
DO $$
DECLARE
    has_barbershops boolean;
    barbershop_id_column text;
BEGIN
    -- Check if barbershops table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'barbershops'
    ) INTO has_barbershops;
    
    IF has_barbershops THEN
        RAISE NOTICE '✅ barbershops table exists';
        
        -- Find the appropriate shop reference column in other tables
        -- Check what appointments table uses for shop reference
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'barbershop_id') THEN
            barbershop_id_column := 'barbershop_id';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'shop_id') THEN
            barbershop_id_column := 'shop_id';
        ELSE
            barbershop_id_column := 'barbershop_id'; -- default
        END IF;
        
        RAISE NOTICE 'Using column name: %', barbershop_id_column;
        
        -- Create bookings table with the correct column reference
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS public.bookings (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              %I UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
              customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
              service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
              barber_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
              appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
              date DATE NOT NULL,
              start_time TIME NOT NULL,
              end_time TIME NOT NULL,
              duration_minutes INTEGER DEFAULT 30,
              status TEXT DEFAULT ''PENDING'',
              price DECIMAL(10,2),
              notes TEXT,
              metadata JSONB DEFAULT ''{}'',
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            )', barbershop_id_column);
            
        -- Create indexes
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_bookings_%I ON public.bookings(%I)', barbershop_id_column, barbershop_id_column);
        CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
        CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON public.bookings(barber_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

        -- Enable RLS
        ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

        -- Create policies (using the correct column name)
        EXECUTE format('
            CREATE POLICY "Users can view bookings for their shop" ON public.bookings
              FOR SELECT USING (
                barber_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.barbershop_staff
                  WHERE barbershop_staff.barbershop_id = bookings.%I
                  AND barbershop_staff.user_id = auth.uid()
                )
              )', barbershop_id_column);

        EXECUTE format('
            CREATE POLICY "Users can manage bookings for their shop" ON public.bookings
              FOR ALL USING (
                barber_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.barbershop_staff
                  WHERE barbershop_staff.barbershop_id = bookings.%I
                  AND barbershop_staff.user_id = auth.uid()
                )
              )', barbershop_id_column);

        -- Add updated_at trigger
        DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
        CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        -- Grant permissions
        GRANT ALL ON public.bookings TO authenticated;
        
        RAISE NOTICE '✅ Bookings table created successfully with % column', barbershop_id_column;
        
    ELSE
        RAISE NOTICE '❌ barbershops table does not exist - cannot create bookings table';
    END IF;
END $$;

-- Final verification - show what tables we have
SELECT 
    'TABLE' as type,
    tablename as name
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'bookings')
ORDER BY name;

-- Show the structure of the bookings table if it was created
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'bookings'
ORDER BY ordinal_position;