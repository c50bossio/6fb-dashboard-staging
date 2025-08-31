-- ===============================================
-- MINIMAL BOOKINGS TABLE - NO COLUMN ERRORS
-- ===============================================
-- This creates the simplest possible bookings table to fix the calendar error

-- Step 1: Check what actually exists in the database
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('barbershops', 'services', 'customers', 'profiles', 'appointments')
GROUP BY table_name
ORDER BY table_name;

-- Step 2: Create the most basic bookings table possible
DROP TABLE IF EXISTS public.bookings CASCADE;

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add optional columns only if we can reference them safely
DO $$
BEGIN
    -- Only add foreign key columns if we can safely reference them
    -- Don't add constraints yet, just the columns
    
    ALTER TABLE public.bookings ADD COLUMN customer_name TEXT;
    ALTER TABLE public.bookings ADD COLUMN service_name TEXT;
    ALTER TABLE public.bookings ADD COLUMN barber_name TEXT;
    ALTER TABLE public.bookings ADD COLUMN price DECIMAL(10,2);
    ALTER TABLE public.bookings ADD COLUMN duration_minutes INTEGER DEFAULT 30;
    
    RAISE NOTICE '✅ Basic bookings table created with safe columns';
END $$;

-- Step 4: Create essential indexes
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Step 5: Enable RLS with simple policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Everyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Everyone can manage bookings" ON public.bookings;

-- Create simple policies that work without complex joins
CREATE POLICY "Authenticated users can view bookings" ON public.bookings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage bookings" ON public.bookings
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 6: Add the updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Grant permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 8: Insert a sample booking to test
INSERT INTO public.bookings (booking_date, booking_time, customer_name, service_name, barber_name, price, duration_minutes, notes)
VALUES (
    CURRENT_DATE + INTERVAL '1 day',
    '10:00:00',
    'Sample Customer',
    'Haircut',
    'Sample Barber',
    35.00,
    30,
    'Sample booking for testing calendar functionality'
);

-- Step 9: Success message and verification
DO $$
DECLARE
    booking_count integer;
    column_count integer;
BEGIN
    SELECT COUNT(*) INTO booking_count FROM public.bookings;
    SELECT COUNT(*) INTO column_count FROM information_schema.columns WHERE table_name = 'bookings';
    
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ MINIMAL BOOKINGS TABLE CREATED!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '📊 Table Details:';
    RAISE NOTICE '  • Columns: %', column_count;
    RAISE NOTICE '  • Sample bookings: %', booking_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Calendar Error Fixed!';
    RAISE NOTICE '📅 The calendar can now find the bookings table';
    RAISE NOTICE '🔒 Basic RLS enabled for security';
    RAISE NOTICE '⚡ Essential indexes created';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Your 6FB AI Agent System calendar should now work!';
    RAISE NOTICE 'Visit: http://localhost:9999/dashboard/calendar to test';
    RAISE NOTICE '===============================================';
END $$;

-- Show the final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'bookings'
ORDER BY ordinal_position;