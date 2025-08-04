-- Calendar and Booking Tables for FullCalendar Integration

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30, -- in minutes
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  color TEXT DEFAULT '#3b82f6',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barbers/Resources table
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  color TEXT DEFAULT '#3b82f6',
  business_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb,
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=Sun, 1=Mon, etc.
  max_concurrent_bookings INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  barber_id UUID REFERENCES public.barbers(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  service_id UUID REFERENCES public.services(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  internal_notes TEXT,
  price DECIMAL(10,2),
  -- Recurring event support
  recurrence_rule TEXT, -- RRule string
  recurrence_id UUID, -- Parent recurring event ID
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability/Schedule Exceptions (holidays, time off, etc.)
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barber_id UUID REFERENCES public.barbers(id),
  shop_id UUID REFERENCES public.profiles(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'time_off', 'special_hours')),
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Services policies
CREATE POLICY "Shop owners can manage their services" ON public.services
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE id = shop_id
    )
  );

CREATE POLICY "Barbers can view their shop's services" ON public.services
  FOR SELECT USING (
    shop_id IN (
      SELECT shop_id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

-- Barbers policies
CREATE POLICY "Shop owners can manage their barbers" ON public.barbers
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE id = shop_id
    )
  );

CREATE POLICY "Barbers can view themselves" ON public.barbers
  FOR SELECT USING (user_id = auth.uid());

-- Customers policies
CREATE POLICY "Shop owners can manage their customers" ON public.customers
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE id = shop_id
    )
  );

CREATE POLICY "Barbers can view and create customers" ON public.customers
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

-- Bookings policies
CREATE POLICY "Shop owners can manage all bookings" ON public.bookings
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE id = shop_id
    )
  );

CREATE POLICY "Barbers can manage their bookings" ON public.bookings
  FOR ALL USING (
    barber_id IN (
      SELECT id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view their bookings" ON public.bookings
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE email = auth.email()
    )
  );

-- Schedule exceptions policies
CREATE POLICY "Shop owners can manage exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE id = shop_id
    )
  );

CREATE POLICY "Barbers can manage their own exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barber_id IN (
      SELECT id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_bookings_shop_id_start_time ON public.bookings(shop_id, start_time);
CREATE INDEX idx_bookings_barber_id_start_time ON public.bookings(barber_id, start_time);
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_recurrence_id ON public.bookings(recurrence_id);
CREATE INDEX idx_schedule_exceptions_barber_date ON public.schedule_exceptions(barber_id, date);
CREATE INDEX idx_services_shop_id_active ON public.services(shop_id, active);
CREATE INDEX idx_barbers_shop_id_active ON public.barbers(shop_id, active);

-- Functions

-- Check availability before booking
CREATE OR REPLACE FUNCTION public.check_booking_availability(
  p_barber_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.bookings
  WHERE barber_id = p_barber_id
    AND status NOT IN ('cancelled', 'no-show')
    AND (p_booking_id IS NULL OR id != p_booking_id)
    AND (
      (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );
    
  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate booking availability
CREATE OR REPLACE FUNCTION public.validate_booking_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_booking_availability(
    NEW.barber_id,
    NEW.start_time,
    NEW.end_time,
    NEW.id
  ) THEN
    RAISE EXCEPTION 'Time slot not available for this barber';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_booking_availability
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_availability();

-- Update timestamps
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();