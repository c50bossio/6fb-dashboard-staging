-- ===============================================
-- CREATE BOOKINGS TABLE - SIMPLIFIED VERSION
-- ===============================================
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing bookings table if it exists
DROP TABLE IF EXISTS public.bookings CASCADE;

-- Step 2: Create the bookings table with minimal dependencies
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  customer_name TEXT,
  service_name TEXT,
  barber_name TEXT,
  price DECIMAL(10,2),
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_created_at ON public.bookings(created_at);

-- Step 4: Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple RLS policies
-- Allow authenticated users to view all bookings
CREATE POLICY "Authenticated users can view bookings" ON public.bookings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage all bookings  
CREATE POLICY "Authenticated users can manage bookings" ON public.bookings
    FOR ALL USING (auth.role() = 'authenticated');

-- Step 6: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add trigger to update updated_at
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Grant permissions to authenticated users
GRANT ALL ON public.bookings TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 9: Insert sample booking for testing
INSERT INTO public.bookings (
  booking_date, 
  booking_time, 
  customer_name, 
  service_name, 
  barber_name, 
  price, 
  duration_minutes, 
  status,
  notes
) VALUES (
  CURRENT_DATE + INTERVAL '1 day',
  '10:00:00',
  'Test Customer',
  'Haircut',
  'Test Barber',
  35.00,
  30,
  'CONFIRMED',
  'Test booking for calendar functionality'
);

-- Step 10: Verify the table was created
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bookings'
ORDER BY ordinal_position;