-- ===============================================
-- 6FB AI AGENT SYSTEM - SUPABASE DATABASE SETUP
-- ===============================================
-- Run this script in your Supabase SQL Editor
-- This creates all necessary tables for the system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===============================================
-- CORE TABLES
-- ===============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'CLIENT',
  is_active BOOLEAN DEFAULT TRUE,
  shop_id UUID,
  barbershop_id UUID,
  organization_id UUID,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_account_id TEXT,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barbershops table
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  phone TEXT,
  email TEXT,
  website TEXT,
  business_hours JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  birthday DATE,
  notes TEXT,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  tags TEXT[],
  is_vip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'PENDING',
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS public.barbershop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'BARBER',
  permissions JSONB DEFAULT '{}',
  commission_rate DECIMAL(5,2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id, user_id)
);

-- AI Agent Interactions table
CREATE TABLE IF NOT EXISTS public.ai_agent_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id ON public.barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON public.appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON public.appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_staff_barbershop_id ON public.barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON public.ai_agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_barbershop_id ON public.analytics_events(barbershop_id);

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Barbershops policies
CREATE POLICY "Anyone can view active barbershops" ON public.barbershops
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage their barbershops" ON public.barbershops
  FOR ALL USING (auth.uid() = owner_id);

-- Services policies
CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "Shop owners can manage services" ON public.services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.barbershops
      WHERE barbershops.id = services.shop_id
      AND barbershops.owner_id = auth.uid()
    )
  );

-- Customers policies
CREATE POLICY "Shop staff can view customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = customers.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
      AND barbershop_staff.is_active = true
    )
  );

-- Appointments policies
CREATE POLICY "Users can view their appointments" ON public.appointments
  FOR SELECT USING (
    barber_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = appointments.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
    )
  );

-- AI interactions policies
CREATE POLICY "Users can view own AI interactions" ON public.ai_agent_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI interactions" ON public.ai_agent_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===============================================
-- FUNCTIONS & TRIGGERS
-- ===============================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.barbershop_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================================
-- SEED DATA (Optional - for testing)
-- ===============================================

-- Create a demo barbershop (uncomment to use)
/*
INSERT INTO public.barbershops (name, description, address, city, state, zip_code, phone, email)
VALUES (
  'Demo Barbershop',
  'A premium barbershop experience',
  '123 Main Street',
  'New York',
  'NY',
  '10001',
  '555-0100',
  'demo@barbershop.com'
);

-- Add demo services
INSERT INTO public.services (shop_id, name, description, price, duration_minutes)
SELECT 
  id,
  service_name,
  service_desc,
  price,
  duration
FROM (
  VALUES 
    ('Haircut', 'Classic men''s haircut', 35.00, 30),
    ('Beard Trim', 'Professional beard shaping', 25.00, 20),
    ('Hot Shave', 'Traditional hot towel shave', 45.00, 45),
    ('Hair & Beard', 'Complete grooming package', 55.00, 50)
) AS services(service_name, service_desc, price, duration),
barbershops
WHERE barbershops.name = 'Demo Barbershop';
*/

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ 6FB AI Agent System database setup complete!';
  RAISE NOTICE '📋 Tables created: profiles, barbershops, services, customers, appointments, staff, ai_interactions, analytics';
  RAISE NOTICE '🔒 Row Level Security policies applied';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '🎯 Ready for production use!';
END $$;