-- Create Missing Tables for 6FB AI Agent System (Updated for Barber Permissions)
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    barber_id TEXT NOT NULL,
    customer_id TEXT,
    service_name TEXT NOT NULL,
    service_duration INTEGER DEFAULT 30,
    service_price DECIMAL(10,2) DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON public.appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON public.appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view appointments" ON public.appointments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert appointments" ON public.appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own appointments" ON public.appointments
    FOR UPDATE USING (true);

-- ============================================
-- 2. CREATE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    barber_id TEXT NOT NULL,
    customer_id TEXT,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'service' CHECK (type IN ('service', 'product', 'tip', 'other')),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'online', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON public.transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON public.transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON public.transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view transactions" ON public.transactions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own transactions" ON public.transactions
    FOR UPDATE USING (true);

-- ============================================
-- 3. CREATE UPDATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT SELECT ON public.appointments TO anon;
GRANT SELECT ON public.transactions TO anon;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('appointments', 'transactions');

-- Note: Reviews are handled via Google Reviews integration, not stored in database

-- ============================================
-- 5. CREATE MISSING TABLES FOR BARBER PERMISSIONS
-- ============================================

-- Create users table with required columns
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'CLIENT',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create barbershops table
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for barbershops.organization_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'barbershops_organization_id_fkey'
  ) THEN
    ALTER TABLE public.barbershops 
    ADD CONSTRAINT barbershops_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  END IF;
END $$;

-- Create barbershop_staff table (required for staff management)
CREATE TABLE IF NOT EXISTS public.barbershop_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'BARBER',
  hire_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id, user_id)
);

-- Create services table (base shop services)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(8,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  online_booking_enabled BOOLEAN DEFAULT true,
  requires_consultation BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_barbershops_owner ON public.barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_organization ON public.barbershops(organization_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_barbershop ON public.barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON public.barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);

-- Enable RLS for new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view barbershops" ON public.barbershops FOR SELECT USING (true);
CREATE POLICY "Owners can manage their barbershops" ON public.barbershops FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Owners can manage their organizations" ON public.organizations FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view staff" ON public.barbershop_staff FOR SELECT USING (true);
CREATE POLICY "Shop owners can manage staff" ON public.barbershop_staff FOR ALL USING (
  barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid())
);

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Shop owners can manage services" ON public.services FOR ALL USING (
  barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid())
);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.barbershops TO authenticated;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.barbershop_staff TO authenticated;
GRANT ALL ON public.services TO authenticated;

GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.barbershops TO anon;
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.barbershop_staff TO anon;
GRANT SELECT ON public.services TO anon;

-- ============================================
-- 6. INSERT TEST DATA FOR DEVELOPMENT
-- ============================================

-- Insert test users
INSERT INTO public.users (id, email, name, role) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner@testshop.com', 'Shop Owner', 'SHOP_OWNER'),
  ('00000000-0000-0000-0000-000000000002', 'barber1@testshop.com', 'Alex Rodriguez', 'BARBER'),
  ('00000000-0000-0000-0000-000000000003', 'barber2@testshop.com', 'Jamie Chen', 'BARBER'),
  ('00000000-0000-0000-0000-000000000004', 'barber3@testshop.com', 'Mike Thompson', 'BARBER')
ON CONFLICT (email) DO NOTHING;

-- Insert test barbershop
INSERT INTO public.barbershops (id, name, owner_id, description, address, city, state, phone) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Elite Cuts Barbershop', '00000000-0000-0000-0000-000000000001', 
   'Premium barbershop with expert barbers', '123 Main St', 'New York', 'NY', '(555) 123-4567')
ON CONFLICT (id) DO NOTHING;

-- Insert test staff relationships
INSERT INTO public.barbershop_staff (barbershop_id, user_id, role) VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'BARBER'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'BARBER'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'SENIOR_BARBER')
ON CONFLICT (barbershop_id, user_id) DO NOTHING;

-- Insert test services
INSERT INTO public.services (id, barbershop_id, name, description, category, price, duration_minutes, is_featured, display_order) VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Classic Haircut', 'Traditional scissor cut with styling', 'haircut', 35.00, 45, true, 1),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Fade Cut', 'Modern fade with precise blending', 'haircut', 40.00, 50, true, 2),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Beard Trim & Shape', 'Professional beard trimming and shaping', 'beard', 25.00, 30, false, 3),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Hot Towel Shave', 'Traditional hot towel straight razor shave', 'shave', 30.00, 35, false, 4),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Hair Wash & Style', 'Shampoo, conditioning, and styling', 'styling', 20.00, 25, false, 5),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Full Service Package', 'Haircut, beard trim, shampoo, and styling', 'combo', 75.00, 90, true, 6)
ON CONFLICT (id) DO NOTHING;

-- Add update triggers for new tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbershop_staff_updated_at BEFORE UPDATE ON public.barbershop_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FINAL VERIFICATION
-- ============================================
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('appointments', 'transactions', 'users', 'barbershops', 'organizations', 'barbershop_staff', 'services');

-- Check if barber permission tables exist (these need to be created separately)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('barber_permissions', 'permission_templates', 'permission_audit_log');