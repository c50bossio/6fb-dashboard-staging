-- ===============================================
-- ADD MISSING TABLES FOR 6FB AI AGENT SYSTEM
-- ===============================================
-- This adds the 'bookings' table and any other missing tables needed

-- Bookings table (for calendar functionality)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_barbershop_id ON public.bookings(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON public.bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for bookings
CREATE POLICY "Users can view bookings for their barbershop" ON public.bookings
  FOR SELECT USING (
    barber_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = bookings.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage bookings for their barbershop" ON public.bookings
  FOR ALL USING (
    barber_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = bookings.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
    )
  );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.bookings TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Missing tables added successfully!';
    RAISE NOTICE '📅 Bookings table created for calendar functionality';
    RAISE NOTICE '🔒 RLS policies applied';
    RAISE NOTICE '⚡ Indexes created for performance';
    RAISE NOTICE '🎯 Ready for calendar integration!';
END $$;