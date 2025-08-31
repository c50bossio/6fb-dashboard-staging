-- ===============================================
-- 6FB AI AGENT SYSTEM - INTELLIGENT SUPABASE SETUP
-- ===============================================
-- This script intelligently handles existing tables/views
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===============================================
-- STEP 1: CHECK WHAT EXISTS
-- ===============================================
DO $$
DECLARE
    obj_type text;
    obj_name text;
BEGIN
    -- Check each object and report what it is
    FOR obj_name IN 
        SELECT unnest(ARRAY['appointments', 'services', 'customers', 'barbershops', 'profiles'])
    LOOP
        -- Check if it's a table
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = obj_name) THEN
            RAISE NOTICE '✓ % exists as a TABLE', obj_name;
        -- Check if it's a view
        ELSIF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = obj_name) THEN
            RAISE NOTICE '⚠ % exists as a VIEW - will need to drop and recreate as table', obj_name;
            -- Drop the view
            EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', obj_name);
            RAISE NOTICE '  → Dropped VIEW %', obj_name;
        ELSE
            RAISE NOTICE '○ % does not exist - will create', obj_name;
        END IF;
    END LOOP;
END $$;

-- ===============================================
-- STEP 2: CREATE OR VERIFY TABLES
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

-- Add missing columns if table already exists
DO $$
BEGIN
    -- Add columns that might be missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'shop_id') THEN
        ALTER TABLE public.profiles ADD COLUMN shop_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'barbershop_id') THEN
        ALTER TABLE public.profiles ADD COLUMN barbershop_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'trial';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_data') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_data JSONB DEFAULT '{}';
    END IF;
END $$;

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
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- ===============================================
DO $$
BEGIN
  -- Add foreign key for shop_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_shop_id_fkey'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE SET NULL;
  END IF;
  
  -- Add foreign key for barbershop_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_barbershop_id_fkey'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_barbershop_id_fkey 
    FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'Foreign key constraint could not be added - some references may be invalid';
END $$;

-- ===============================================
-- STEP 4: CREATE INDEXES
-- ===============================================
-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id ON public.barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);

-- For appointments, check if it's a table before creating indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
    CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON public.appointments(barbershop_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON public.appointments(barber_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_barbershop_id ON public.barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON public.ai_agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_barbershop_id ON public.analytics_events(barbershop_id);

-- ===============================================
-- STEP 5: SETUP ROW LEVEL SECURITY
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

-- Drop and recreate policies to avoid conflicts
DO $$
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  
  CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Barbershops policies
  DROP POLICY IF EXISTS "Anyone can view active barbershops" ON public.barbershops;
  DROP POLICY IF EXISTS "Owners can manage their barbershops" ON public.barbershops;
  
  CREATE POLICY "Anyone can view active barbershops" ON public.barbershops
    FOR SELECT USING (is_active = true);
  CREATE POLICY "Owners can manage their barbershops" ON public.barbershops
    FOR ALL USING (auth.uid() = owner_id);

  -- Services policies
  DROP POLICY IF EXISTS "Anyone can view services" ON public.services;
  DROP POLICY IF EXISTS "Shop owners can manage services" ON public.services;
  
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
  DROP POLICY IF EXISTS "Shop staff can view customers" ON public.customers;
  
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
  DROP POLICY IF EXISTS "Users can view their appointments" ON public.appointments;
  
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
  DROP POLICY IF EXISTS "Users can view own AI interactions" ON public.ai_agent_interactions;
  DROP POLICY IF EXISTS "Users can create own AI interactions" ON public.ai_agent_interactions;
  
  CREATE POLICY "Users can view own AI interactions" ON public.ai_agent_interactions
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can create own AI interactions" ON public.ai_agent_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

END $$;

-- ===============================================
-- STEP 6: CREATE FUNCTIONS AND TRIGGERS
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
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
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
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbershops_updated_at ON public.barbershops;
CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON public.barbershop_staff;
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.barbershop_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================================
-- STEP 7: GRANT PERMISSIONS
-- ===============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===============================================
-- STEP 8: FINAL VERIFICATION
-- ===============================================
DO $$
DECLARE
    obj_count integer;
    table_count integer;
    view_count integer;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events');
    
    -- Count views
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events');

    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '✅ 6FB AI AGENT SYSTEM - SETUP COMPLETE';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '📊 Database Status:';
    RAISE NOTICE '  • Tables created: %', table_count;
    RAISE NOTICE '  • Views remaining: %', view_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security:';
    RAISE NOTICE '  • Row Level Security: ENABLED';
    RAISE NOTICE '  • Policies: CONFIGURED';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Performance:';
    RAISE NOTICE '  • Indexes: CREATED';
    RAISE NOTICE '  • Triggers: ACTIVE';
    RAISE NOTICE '';
    
    IF view_count > 0 THEN
        RAISE NOTICE '⚠️  WARNING: Some objects may still be views.';
        RAISE NOTICE '   Run the verification query below to check.';
    ELSE
        RAISE NOTICE '🎯 All core objects are properly configured as tables!';
    END IF;
    
    RAISE NOTICE '===============================================';
END $$;

-- Verification Query - Shows what's a table vs view
SELECT 
  tablename as object_name,
  'TABLE' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events')
UNION ALL
SELECT 
  viewname as object_name,
  'VIEW' as object_type
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events')
ORDER BY object_name;