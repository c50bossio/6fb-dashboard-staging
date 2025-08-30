-- ===============================================
-- 6FB AI AGENT SYSTEM - SAFE MIGRATION SCRIPT
-- ===============================================
-- This script safely checks and creates only missing objects
-- Version: 1.0.2 (Safe incremental migration)
-- Date: 2025-08-30

-- ===============================================
-- STEP 1: EXTENSIONS (Safe to re-run)
-- ===============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ===============================================
-- STEP 2: ENUMS (Check before creating)
-- ===============================================

-- Check and create user_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'CLIENT',
      'BARBER', 
      'SHOP_OWNER',
      'ENTERPRISE_OWNER',
      'SUPER_ADMIN'
    );
  END IF;
END $$;

-- Check and create appointment_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'PENDING',
      'CONFIRMED',
      'COMPLETED', 
      'CANCELLED',
      'NO_SHOW'
    );
  END IF;
END $$;

-- Check and create payment_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'REFUNDED',
      'DISPUTED'
    );
  END IF;
END $$;

-- Check and create ai_agent_type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_agent_type') THEN
    CREATE TYPE ai_agent_type AS ENUM (
      'master_coach',
      'financial',
      'client_acquisition',
      'operations',
      'brand',
      'growth',
      'risk',
      'tech'
    );
  END IF;
END $$;

-- Check and create subscription_tier enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM (
      'FREE',
      'ESSENTIALS',
      'PROFESSIONAL',
      'BUSINESS',
      'ENTERPRISE'
    );
  END IF;
END $$;

-- ===============================================
-- STEP 3: CHECK EXISTING OBJECTS
-- ===============================================

-- Check what appointments object is (table, view, etc)
DO $$ 
DECLARE
  obj_type text;
BEGIN
  -- Check if appointments exists as a view
  SELECT 'view' INTO obj_type
  FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'appointments';
  
  IF obj_type = 'view' THEN
    RAISE NOTICE 'appointments exists as a view - may need to drop and recreate as table';
    -- Optionally drop the view if you want to replace it
    -- DROP VIEW IF EXISTS public.appointments CASCADE;
  END IF;
END $$;

-- ===============================================
-- STEP 4: ADD MISSING COLUMNS TO EXISTING TABLES
-- ===============================================

-- Add missing columns to profiles if table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Add missing columns one by one (won't error if they exist)
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_id UUID;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS barbershop_id UUID;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'FREE';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    
    -- Add unique constraint if not exists
    DO $$ BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  END IF;
END $$;

-- ===============================================
-- STEP 5: CREATE ONLY MISSING TABLES
-- ===============================================

-- Create organizations table if not exists
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id),
  tier subscription_tier DEFAULT 'ENTERPRISE',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create barbershops table if not exists
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  owner_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  business_hours JSONB DEFAULT '[]'::jsonb,
  timezone TEXT DEFAULT 'America/New_York',
  location_status TEXT DEFAULT 'active',
  stripe_account_id TEXT UNIQUE,
  google_place_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create barbershop_staff table if not exists
CREATE TABLE IF NOT EXISTS public.barbershop_staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  role TEXT DEFAULT 'BARBER',
  is_active BOOLEAN DEFAULT true,
  commission_rate DECIMAL(5,2),
  booth_rent DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id, user_id)
);

-- Create services table if not exists
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table if not exists  
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  first_visit DATE,
  last_visit DATE,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  preferred_barber_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(barbershop_id, email)
);

-- Check if appointments is a view and needs to be replaced
DO $$ 
DECLARE
  is_view boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'appointments'
  ) INTO is_view;
  
  IF is_view THEN
    RAISE NOTICE 'appointments exists as a view - skipping table creation';
    RAISE NOTICE 'To replace with table, run: DROP VIEW public.appointments CASCADE;';
  ELSE
    -- Create appointments table only if it doesn't exist at all
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'appointments'
    ) THEN
      CREATE TABLE public.appointments (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
        barber_id UUID REFERENCES public.profiles(id),
        customer_id UUID REFERENCES public.customers(id),
        service_id UUID REFERENCES public.services(id),
        date DATE NOT NULL,
        time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        status appointment_status DEFAULT 'PENDING',
        price DECIMAL(10,2),
        notes TEXT,
        google_event_id TEXT,
        source TEXT DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
      RAISE NOTICE 'Created appointments table';
    END IF;
  END IF;
END $$;

-- Create remaining tables if they don't exist
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID, -- Removed FK constraint since appointments might be a view
  barbershop_id UUID REFERENCES public.barbershops(id),
  customer_id UUID REFERENCES public.customers(id),
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'PENDING',
  payment_method TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT UNIQUE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID, -- Removed FK constraint since appointments might be a view
  barbershop_id UUID REFERENCES public.barbershops(id),
  barber_id UUID REFERENCES public.profiles(id),
  customer_id UUID REFERENCES public.customers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  type ai_agent_type NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}'::jsonb,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  messages JSONB DEFAULT '[]'::jsonb,
  total_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_arrangements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.profiles(id),
  arrangement_type TEXT NOT NULL,
  commission_rate DECIMAL(5,2),
  booth_rent_amount DECIMAL(10,2),
  rent_frequency TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings_hierarchy (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  context_type TEXT NOT NULL,
  context_id UUID,
  category TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(context_type, context_id, category)
);

-- ===============================================
-- STEP 6: CREATE INDEXES (Safe - IF NOT EXISTS)
-- ===============================================

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Barbershop indexes
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_id ON public.barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_organization_id ON public.barbershops(organization_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_status ON public.barbershops(location_status);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_staff_barbershop_id ON public.barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.barbershop_staff(is_active);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_barbershop_id ON public.customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_barbershop_id ON public.payments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- AI indexes
CREATE INDEX IF NOT EXISTS idx_ai_agents_barbershop_id ON public.ai_agents(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_agent_id ON public.ai_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);

-- ===============================================
-- STEP 7: SUMMARY
-- ===============================================

DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'This script safely added missing objects without replacing existing ones.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: If appointments exists as a VIEW and you need it as a TABLE:';
  RAISE NOTICE '1. Backup the view definition';
  RAISE NOTICE '2. Run: DROP VIEW public.appointments CASCADE;';
  RAISE NOTICE '3. Re-run this migration to create the appointments table';
  RAISE NOTICE '';
END $$;