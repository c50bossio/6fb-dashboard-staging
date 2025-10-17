-- Create schedule_exceptions table for Special Hours & Holidays feature
-- This table stores exceptions to regular business hours (holidays, special hours, time off)

CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'time_off', 'special_hours')),
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_shop_date ON public.schedule_exceptions(shop_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_barber_date ON public.schedule_exceptions(barber_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_type ON public.schedule_exceptions(type);

-- Enable Row Level Security
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Shop owners can manage shop-wide exceptions for their barbershop
CREATE POLICY "Shop owners can manage shop exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE id = shop_id AND (shop_id IS NOT NULL OR barbershop_id IS NOT NULL)
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE id = shop_id AND (shop_id IS NOT NULL OR barbershop_id IS NOT NULL)
    )
  );

-- Barbers can manage their own exceptions if they are staff members
CREATE POLICY "Barbers can manage their own exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barber_id = auth.uid() OR
    (
      auth.uid() IN (
        SELECT user_id FROM public.barbershop_staff bs
        WHERE bs.barbershop_id = schedule_exceptions.shop_id
        AND bs.user_id = auth.uid()
        AND bs.is_active = true
      )
    )
  )
  WITH CHECK (
    barber_id = auth.uid() OR
    (
      auth.uid() IN (
        SELECT user_id FROM public.barbershop_staff bs
        WHERE bs.barbershop_id = schedule_exceptions.shop_id
        AND bs.user_id = auth.uid()
        AND bs.is_active = true
      )
    )
  );

-- Allow public read access for booking system (customers need to see exceptions)
CREATE POLICY "Public can view exceptions for booking" ON public.schedule_exceptions
  FOR SELECT USING (true);

-- Add helpful comments
COMMENT ON TABLE public.schedule_exceptions IS 'Stores exceptions to regular business hours including holidays, special hours, and time off';
COMMENT ON COLUMN public.schedule_exceptions.type IS 'Type of exception: holiday (closed), time_off (closed), special_hours (custom hours)';
COMMENT ON COLUMN public.schedule_exceptions.all_day IS 'True for all-day events (holidays, full day off)';
COMMENT ON COLUMN public.schedule_exceptions.start_time IS 'Custom start time (null for closed days)';
COMMENT ON COLUMN public.schedule_exceptions.end_time IS 'Custom end time (null for closed days)';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_exceptions_updated_at 
  BEFORE UPDATE ON public.schedule_exceptions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();