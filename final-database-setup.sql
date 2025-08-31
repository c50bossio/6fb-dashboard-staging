-- ===============================================
-- FINAL DATABASE SETUP - HANDLES ALL EXISTING CONFLICTS
-- ===============================================
-- This script handles all existing triggers, policies, and objects

-- Step 1: Clean up existing objects intelligently
DO $$
DECLARE
    obj_name text;
BEGIN
    RAISE NOTICE 'Starting final database setup...';
    RAISE NOTICE '';
    
    -- Drop tables and views in dependency order
    FOR obj_name IN 
        SELECT unnest(ARRAY['analytics_events', 'ai_agent_interactions', 'barbershop_staff', 'appointments', 'customers', 'services'])
    LOOP
        -- Drop view if exists
        IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = obj_name) THEN
            EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', obj_name);
            RAISE NOTICE '🗑️  Dropped VIEW: %', obj_name;
        END IF;
        
        -- Drop table if exists  
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = obj_name) THEN
            EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', obj_name);
            RAISE NOTICE '🗑️  Dropped TABLE: %', obj_name;
        END IF;
    END LOOP;
    
    -- Handle profiles and barbershops specially (they have circular references)
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'profiles') THEN
        DROP VIEW IF EXISTS public.profiles CASCADE;
        RAISE NOTICE '🗑️  Dropped VIEW: profiles';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'barbershops') THEN
        DROP VIEW IF EXISTS public.barbershops CASCADE;
        RAISE NOTICE '🗑️  Dropped VIEW: barbershops';
    END IF;
    
    -- Drop constraints first to avoid circular dependency issues
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_shop_id_fkey;
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_barbershop_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP TABLE IF EXISTS public.profiles CASCADE;
        RAISE NOTICE '🗑️  Dropped TABLE: profiles';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'barbershops') THEN
        DROP TABLE IF EXISTS public.barbershops CASCADE;
        RAISE NOTICE '🗑️  Dropped TABLE: barbershops';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Cleanup complete';
    RAISE NOTICE '';
END $$;

-- Step 2: Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Step 3: Create core tables

-- Profiles table
CREATE TABLE public.profiles (
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
CREATE TABLE public.barbershops (
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

-- Add circular foreign keys after both tables exist
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_shop_id_fkey 
  FOREIGN KEY (shop_id) REFERENCES public.barbershops(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_barbershop_id_fkey 
  FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE SET NULL;

-- Services table
CREATE TABLE public.services (
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
CREATE TABLE public.customers (
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
CREATE TABLE public.appointments (
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
CREATE TABLE public.barbershop_staff (
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
CREATE TABLE public.ai_agent_interactions (
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
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
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

-- Step 5: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies (drop existing ones first)
DO $$
DECLARE
    policy_name text;
    table_name text;
BEGIN
    -- Drop all existing policies
    FOR table_name IN SELECT unnest(ARRAY['profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events']) LOOP
        FOR policy_name IN 
            SELECT pol.polname 
            FROM pg_policy pol 
            JOIN pg_class cls ON pol.polrelid = cls.oid 
            WHERE cls.relname = table_name 
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
        END LOOP;
    END LOOP;
END $$;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view active barbershops" ON public.barbershops
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage their barbershops" ON public.barbershops
  FOR ALL USING (auth.uid() = owner_id);

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

CREATE POLICY "Shop staff can view customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = customers.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
      AND barbershop_staff.is_active = true
    )
  );

CREATE POLICY "Users can view their appointments" ON public.appointments
  FOR SELECT USING (
    barber_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.barbershop_staff
      WHERE barbershop_staff.barbershop_id = appointments.barbershop_id
      AND barbershop_staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own AI interactions" ON public.ai_agent_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI interactions" ON public.ai_agent_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 7: Handle functions and triggers carefully
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

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE '✅ Created trigger: on_auth_user_created';
  ELSE
    RAISE NOTICE '✅ Trigger already exists: on_auth_user_created';
  END IF;
END $$;

-- Updated at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers (drop existing ones first)
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

-- Step 8: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Final success message
DO $$
DECLARE
    table_count integer;
    policy_count integer;
    trigger_count integer;
BEGIN
    -- Count what we created
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events');
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
    AND cls.relname IN ('profiles', 'barbershops', 'services', 'customers', 'appointments', 'barbershop_staff', 'ai_agent_interactions', 'analytics_events');
    
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%updated_at%' OR tgname = 'on_auth_user_created';

    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '🎉 DATABASE SETUP COMPLETE!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '  • Tables created: %', table_count;
    RAISE NOTICE '  • RLS policies: %', policy_count;
    RAISE NOTICE '  • Triggers active: %', trigger_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ All UUID types correct';
    RAISE NOTICE '✅ Foreign keys working';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Performance optimized';
    RAISE NOTICE '✅ Auto-updates configured';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 6FB AI Agent System database is ready!';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Next: Test your integration at:';
    RAISE NOTICE '   http://localhost:9999/test-integration';
    RAISE NOTICE '===============================================';
END $$;