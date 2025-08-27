-- Migration 001: Consolidate Schema to Single Source of Truth
-- This migration consolidates all fragmented schemas into the master schema
-- Run with: psql -f 001_consolidate_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ==============================================
-- PHASE 1: CREATE NEW UNIFIED TABLES
-- ==============================================

-- Create unified profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles_new (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic profile info
  full_name TEXT,
  email TEXT, -- Synced with auth.users.email
  phone TEXT,
  avatar_url TEXT,
  
  -- Business association - SINGLE SOURCE OF TRUTH
  barbershop_id UUID, -- Links to barbershops table
  
  -- Role and permissions
  role TEXT DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')),
  permissions JSONB DEFAULT '{}',
  
  -- Subscription and trial
  subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'basic', 'professional', 'enterprise')),
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  subscription_status TEXT DEFAULT 'active',
  
  -- Settings and preferences
  timezone TEXT DEFAULT 'America/New_York',
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
  dashboard_settings JSONB DEFAULT '{}',
  
  -- Onboarding and setup
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,
  setup_wizard_completed BOOLEAN DEFAULT FALSE,
  
  -- AI and usage
  ai_agent_tier TEXT DEFAULT 'basic',
  ai_monthly_quota INTEGER DEFAULT 1000,
  ai_usage_count INTEGER DEFAULT 0,
  ai_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  
  -- Indexes for performance
  UNIQUE(email),
  INDEX idx_profiles_barbershop_id (barbershop_id),
  INDEX idx_profiles_role (role),
  INDEX idx_profiles_subscription (subscription_tier, subscription_status)
);

-- Create unified barbershops table
CREATE TABLE IF NOT EXISTS barbershops_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  coordinates POINT, -- For location services
  
  -- Business details
  business_hours JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  pricing_structure JSONB DEFAULT '{}',
  
  -- Owner and organization
  owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_id UUID, -- For multi-location enterprises
  
  -- Settings and features
  booking_enabled BOOLEAN DEFAULT TRUE,
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  ai_enabled BOOLEAN DEFAULT TRUE,
  calendar_integration_enabled BOOLEAN DEFAULT FALSE,
  
  -- Business metrics (cached for performance)
  total_appointments INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Integration settings
  stripe_account_id TEXT,
  google_calendar_id TEXT,
  google_my_business_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_barbershops_owner (owner_id),
  INDEX idx_barbershops_org (organization_id),
  INDEX idx_barbershops_location (city, state)
);

-- Create unified staff relationships table
CREATE TABLE IF NOT EXISTS barbershop_staff_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  barbershop_id UUID NOT NULL REFERENCES barbershops_new(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role TEXT NOT NULL CHECK (role IN ('BARBER', 'MANAGER', 'ADMIN', 'OWNER')),
  permissions JSONB DEFAULT '{}',
  
  -- Employment details
  employment_type TEXT DEFAULT 'employee' CHECK (employment_type IN ('employee', 'contractor', 'owner', 'manager')),
  commission_rate DECIMAL(5,4) DEFAULT 0.30, -- 30% default
  hourly_rate DECIMAL(8,2),
  salary DECIMAL(10,2),
  
  -- Schedule and availability
  working_hours JSONB DEFAULT '{}',
  availability JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  hire_date DATE DEFAULT CURRENT_DATE,
  termination_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(barbershop_id, user_id),
  INDEX idx_staff_barbershop (barbershop_id),
  INDEX idx_staff_user (user_id),
  INDEX idx_staff_active (is_active)
);

-- Create unified subscriptions table - SINGLE SOURCE OF TRUTH
CREATE TABLE IF NOT EXISTS subscriptions_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Subscription holder (can be user or barbershop)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops_new(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier TEXT NOT NULL CHECK (tier IN ('trial', 'basic', 'professional', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Pricing and limits
  price_per_month DECIMAL(8,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Feature limits
  max_staff INTEGER DEFAULT 5,
  max_services INTEGER DEFAULT 50,
  max_appointments_per_month INTEGER DEFAULT 1000,
  ai_quota_per_month INTEGER DEFAULT 1000,
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  
  -- Trial handling
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  is_trial BOOLEAN DEFAULT FALSE,
  
  -- Billing dates
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  next_billing_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  
  -- Constraints
  CHECK ((user_id IS NOT NULL AND barbershop_id IS NULL) OR (user_id IS NULL AND barbershop_id IS NOT NULL)),
  
  -- Indexes
  INDEX idx_subscriptions_user (user_id),
  INDEX idx_subscriptions_barbershop (barbershop_id),
  INDEX idx_subscriptions_stripe (stripe_subscription_id),
  INDEX idx_subscriptions_status (status)
);

-- ==============================================
-- PHASE 2: DATA MIGRATION FUNCTIONS
-- ==============================================

-- Function to safely migrate profiles data
CREATE OR REPLACE FUNCTION migrate_profiles_data()
RETURNS TEXT AS $$
DECLARE
  migration_count INTEGER := 0;
  error_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Migrate from existing profiles table if it exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    FOR rec IN SELECT * FROM profiles LOOP
      BEGIN
        INSERT INTO profiles_new (
          id, full_name, email, phone, avatar_url,
          barbershop_id, role, subscription_tier,
          timezone, onboarding_completed, created_at, updated_at
        ) VALUES (
          rec.id,
          COALESCE(rec.full_name, rec.name),
          rec.email,
          rec.phone,
          rec.avatar_url,
          COALESCE(rec.barbershop_id, rec.shop_id), -- Handle both field names
          COALESCE(rec.role, 'CLIENT'),
          COALESCE(rec.subscription_tier, 'trial'),
          COALESCE(rec.timezone, 'America/New_York'),
          COALESCE(rec.onboarding_completed, FALSE),
          COALESCE(rec.created_at, NOW()),
          COALESCE(rec.updated_at, NOW())
        ) ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          barbershop_id = EXCLUDED.barbershop_id,
          updated_at = NOW();
        
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Error migrating profile %: %', rec.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN format('Migrated %s profiles with %s errors', migration_count, error_count);
END;
$$ LANGUAGE plpgsql;

-- Function to safely migrate barbershops data
CREATE OR REPLACE FUNCTION migrate_barbershops_data()
RETURNS TEXT AS $$
DECLARE
  migration_count INTEGER := 0;
  error_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Check for existing barbershops table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'barbershops') THEN
    FOR rec IN SELECT * FROM barbershops LOOP
      BEGIN
        INSERT INTO barbershops_new (
          id, name, description, email, phone, website,
          address, city, state, zip_code, country,
          business_hours, owner_id, booking_enabled,
          online_booking_enabled, created_at, updated_at
        ) VALUES (
          rec.id,
          rec.name,
          rec.description,
          rec.email,
          rec.phone,
          rec.website,
          rec.address,
          rec.city,
          rec.state,
          rec.zip_code,
          COALESCE(rec.country, 'US'),
          COALESCE(rec.business_hours, '{}'),
          rec.owner_id,
          COALESCE(rec.booking_enabled, TRUE),
          COALESCE(rec.online_booking_enabled, TRUE),
          COALESCE(rec.created_at, NOW()),
          COALESCE(rec.updated_at, NOW())
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW();
        
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Error migrating barbershop %: %', rec.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN format('Migrated %s barbershops with %s errors', migration_count, error_count);
END;
$$ LANGUAGE plpgsql;

-- Function to migrate staff relationships
CREATE OR REPLACE FUNCTION migrate_staff_data()
RETURNS TEXT AS $$
DECLARE
  migration_count INTEGER := 0;
  error_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Check for existing barbershop_staff table
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'barbershop_staff') THEN
    FOR rec IN SELECT * FROM barbershop_staff LOOP
      BEGIN
        INSERT INTO barbershop_staff_new (
          id, barbershop_id, user_id, role,
          employment_type, commission_rate,
          is_active, created_at, updated_at
        ) VALUES (
          COALESCE(rec.id, uuid_generate_v4()),
          rec.barbershop_id,
          rec.user_id,
          COALESCE(rec.role, 'BARBER'),
          COALESCE(rec.employment_type, 'employee'),
          COALESCE(rec.commission_rate, 0.30),
          COALESCE(rec.is_active, TRUE),
          COALESCE(rec.created_at, NOW()),
          COALESCE(rec.updated_at, NOW())
        ) ON CONFLICT (barbershop_id, user_id) DO UPDATE SET
          role = EXCLUDED.role,
          commission_rate = EXCLUDED.commission_rate,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
        
        migration_count := migration_count + 1;
      EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Error migrating staff record %: %', rec.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN format('Migrated %s staff records with %s errors', migration_count, error_count);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- PHASE 3: EXECUTE MIGRATION
-- ==============================================

-- Run migrations
SELECT migrate_profiles_data();
SELECT migrate_barbershops_data();
SELECT migrate_staff_data();

-- ==============================================
-- PHASE 4: CREATE VIEWS FOR BACKWARD COMPATIBILITY
-- ==============================================

-- Create views that maintain API compatibility
CREATE OR REPLACE VIEW profiles AS SELECT * FROM profiles_new;
CREATE OR REPLACE VIEW barbershops AS SELECT * FROM barbershops_new;
CREATE OR REPLACE VIEW barbershop_staff AS SELECT * FROM barbershop_staff_new;

-- ==============================================
-- PHASE 5: ADD TRIGGERS AND CONSTRAINTS
-- ==============================================

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles_new 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at 
    BEFORE UPDATE ON barbershops_new 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at 
    BEFORE UPDATE ON barbershop_staff_new 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for security
ALTER TABLE profiles_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershops_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_staff_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions_new ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be expanded)
CREATE POLICY "Users can read own profile" ON profiles_new
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles_new
    FOR UPDATE USING (auth.uid() = id);

-- Log migration completion
INSERT INTO migration_log (migration_name, completed_at, notes) 
VALUES ('001_consolidate_schema', NOW(), 'Schema consolidation completed successfully')
ON CONFLICT DO NOTHING;