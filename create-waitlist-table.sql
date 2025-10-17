-- Create missing waitlist table for Supabase
-- Copy this script and run it in Supabase SQL Editor

-- Waitlist table for barbershop booking management
CREATE TABLE public.waitlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) NOT NULL,
  barbershop_id UUID NOT NULL,
  service_id UUID,
  barber_id UUID,
  
  -- Scheduling preferences
  preferred_dates JSONB DEFAULT '[]'::jsonb,  -- Array of preferred dates
  preferred_times JSONB DEFAULT '[]'::jsonb,  -- Array of time ranges
  duration_minutes INTEGER DEFAULT 45,
  
  -- Waitlist management
  priority TEXT DEFAULT 'normal',  -- urgent, high, normal, low
  position INTEGER NOT NULL DEFAULT 1,
  estimated_wait_time INTEGER,  -- Minutes
  max_wait_days INTEGER DEFAULT 14,
  
  -- Customer information
  notes TEXT,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb,
  last_notified TIMESTAMPTZ,
  notification_count INTEGER DEFAULT 0,
  
  -- Status tracking
  status TEXT DEFAULT 'active',  -- active, matched, expired, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on waitlist
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Waitlist policies
CREATE POLICY "Users can view own waitlist entries" ON public.waitlist
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own waitlist entries" ON public.waitlist
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own waitlist entries" ON public.waitlist
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete own waitlist entries" ON public.waitlist
  FOR DELETE USING (auth.uid() = customer_id);

-- Indexes for performance
CREATE INDEX idx_waitlist_customer ON public.waitlist(customer_id);
CREATE INDEX idx_waitlist_barbershop ON public.waitlist(barbershop_id);
CREATE INDEX idx_waitlist_status ON public.waitlist(status);
CREATE INDEX idx_waitlist_position ON public.waitlist(barbershop_id, service_id, position);
CREATE INDEX idx_waitlist_expires ON public.waitlist(expires_at);

-- Update trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
SELECT 'Waitlist table created successfully! 🎉' as message;