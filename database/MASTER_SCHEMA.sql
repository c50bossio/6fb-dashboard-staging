-- ===============================================
-- 6FB AI AGENT SYSTEM - MASTER SCHEMA
-- ===============================================
-- This is the SINGLE SOURCE OF TRUTH for database schema
-- Consolidates: complete-schema.sql + supabase-schema.sql + migrations
-- Version: 1.0.0 (Consolidation Refactor)
-- Date: 2025-08-30

-- ===============================================
-- EXTENSIONS & ENUMS
-- ===============================================

-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Core business enums
CREATE TYPE user_role AS ENUM (
  'CLIENT',
  'BARBER', 
  'SHOP_OWNER',
  'ENTERPRISE_OWNER',
  'SUPER_ADMIN'
);

CREATE TYPE appointment_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'COMPLETED', 
  'CANCELLED',
  'NO_SHOW'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'DISPUTED'
);

CREATE TYPE ai_agent_type AS ENUM (
  'master_coach',
  'financial',
  'client_acquisition',
  'operations',
  'brand',
  'growth',
  'strategic_mindset'
);

CREATE TYPE notification_type AS ENUM (
  'email',
  'sms', 
  'push',
  'in_app'
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'basic',
  'premium',
  'enterprise'
);

-- ===============================================
-- CORE USER MANAGEMENT (Supabase Compatible)
-- ===============================================

-- Profiles table (extends Supabase auth.users)
-- NOTE: This is the SINGLE user table - no separate 'users' table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  
  -- Basic user information
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  
  -- Business role and permissions
  role user_role DEFAULT 'CLIENT',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Shop associations (for multi-tenant support)
  shop_id UUID, -- Direct ownership (individual barbers)
  barbershop_id UUID, -- Employment association (staff)
  organization_id UUID, -- Enterprise association
  
  -- OAuth providers
  google_id TEXT UNIQUE,
  facebook_id TEXT UNIQUE,
  
  -- Subscription and billing
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status TEXT DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_account_id TEXT, -- For receiving payments (barbers)
  
  -- Trial and onboarding
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}',
  
  -- AI Agent subscription and usage
  ai_agent_subscription_tier subscription_tier DEFAULT 'basic',
  ai_agent_monthly_quota INTEGER DEFAULT 100,
  ai_agent_usage_count INTEGER DEFAULT 0,
  ai_agent_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance indexes
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR length(phone) >= 10)
);

-- ===============================================
-- ORGANIZATION & SHOP HIERARCHY
-- ===============================================

-- Organizations (for enterprise chains)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Business information
  website TEXT,
  industry TEXT DEFAULT 'beauty_services',
  
  -- Settings and configuration
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_org_name UNIQUE(name)
);

-- Barbershops (individual locations)
CREATE TABLE public.barbershops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE, -- For public URLs
  
  -- Location information
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Contact information
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Business configuration
  business_hours JSONB DEFAULT '{}',
  booking_settings JSONB DEFAULT '{}',
  pricing_config JSONB DEFAULT '{}',
  
  -- Associations
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  -- Feature flags
  booking_enabled BOOLEAN DEFAULT TRUE,
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  ai_agent_enabled BOOLEAN DEFAULT TRUE,
  payment_processing_enabled BOOLEAN DEFAULT FALSE,
  
  -- Business metrics (cached for performance)
  monthly_revenue DECIMAL(12,2) DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, ''))
  ) STORED
);

-- Staff relationships (many-to-many: users ↔ barbershops)
CREATE TABLE public.barbershop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role user_role NOT NULL DEFAULT 'BARBER',
  permissions JSONB DEFAULT '{}',
  
  -- Financial arrangements
  commission_rate DECIMAL(5,4) DEFAULT 0.20, -- 20% default
  booth_rent_amount DECIMAL(8,2) DEFAULT 0,
  arrangement_type TEXT DEFAULT 'commission', -- commission, booth_rent, hybrid, salary
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_staff_assignment UNIQUE(barbershop_id, user_id)
);

-- ===============================================
-- BUSINESS OPERATIONS
-- ===============================================

-- Services offered by barbershops
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Service details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- haircut, beard, styling, coloring, etc.
  
  -- Pricing and duration
  base_price DECIMAL(8,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  buffer_minutes INTEGER DEFAULT 15, -- Time between appointments
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  requires_deposit BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(8,2) DEFAULT 0,
  
  -- Staff assignments (which barbers can perform this service)
  available_staff JSONB DEFAULT '[]', -- Array of user_ids
  
  -- Marketing
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer management
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Customer information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  
  -- Preferences and history
  preferences JSONB DEFAULT '{}',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Loyalty program
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier TEXT DEFAULT 'bronze',
  total_spent DECIMAL(10,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  
  -- Behavioral scoring
  no_show_count INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  last_visit_date TIMESTAMPTZ,
  avg_rating_given DECIMAL(3,2),
  
  -- Marketing consent
  email_consent BOOLEAN DEFAULT FALSE,
  sms_consent BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, ''))
  ) STORED
);

-- Appointments (core booking system)
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Associations
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status appointment_status DEFAULT 'PENDING',
  
  -- Pricing breakdown
  service_price DECIMAL(8,2) NOT NULL,
  tip_amount DECIMAL(8,2) DEFAULT 0,
  discount_amount DECIMAL(8,2) DEFAULT 0,
  tax_amount DECIMAL(8,2) DEFAULT 0,
  total_amount DECIMAL(8,2) NOT NULL,
  
  -- Customer details (cached for performance)
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Notes and communication
  customer_notes TEXT,
  barber_notes TEXT,
  special_requests TEXT,
  
  -- External integrations
  google_calendar_event_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Recurring appointments
  recurring_group_id UUID,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_appointment_time CHECK (scheduled_at > NOW() - INTERVAL '1 day'),
  CONSTRAINT valid_total_amount CHECK (total_amount >= 0)
);

-- ===============================================
-- PAYMENT & FINANCIAL MANAGEMENT
-- ===============================================

-- Payment transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status payment_status DEFAULT 'PENDING',
  
  -- Stripe integration
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  
  -- Payment breakdown
  service_amount DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  stripe_fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL, -- Amount to barber/shop
  
  -- Metadata
  payment_method TEXT, -- card, cash, etc.
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  CONSTRAINT valid_payment_amount CHECK (amount > 0)
);

-- Commission tracking for staff
CREATE TABLE public.commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  
  -- Commission calculation
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  
  -- Payout tracking
  payout_status TEXT DEFAULT 'pending', -- pending, paid, held
  payout_date DATE,
  payout_reference TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- AI AGENT SYSTEM
-- ===============================================

-- AI Agent definitions
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Agent identification
  name TEXT NOT NULL,
  type ai_agent_type NOT NULL,
  description TEXT,
  
  -- Configuration
  capabilities JSONB DEFAULT '[]',
  configuration JSONB DEFAULT '{}',
  prompt_template TEXT,
  
  -- Model configuration
  preferred_model TEXT DEFAULT 'gpt-4',
  fallback_models TEXT[] DEFAULT ARRAY['claude-3-sonnet', 'gemini-pro'],
  max_tokens INTEGER DEFAULT 4000,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT '1.0',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversation history
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  
  -- Conversation context
  barbershop_context UUID REFERENCES public.barbershops(id),
  session_id UUID DEFAULT uuid_generate_v4(),
  
  -- Message content
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  
  -- AI metadata
  model_used TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  confidence_score DECIMAL(3,2),
  
  -- Business context
  conversation_context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- NOTIFICATION & COMMUNICATION
-- ===============================================

-- Notification system
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  type notification_type NOT NULL,
  channel TEXT NOT NULL, -- email, sms, push, in_app
  template_id TEXT,
  
  -- Content
  subject TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Delivery tracking
  status TEXT DEFAULT 'pending', -- pending, sent, failed, delivered, opened
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- SETTINGS & CONFIGURATION
-- ===============================================

-- Unified settings hierarchy (replaces multiple settings tables)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Context (what this setting applies to)
  context_type TEXT NOT NULL, -- user, barbershop, organization, system
  context_id UUID, -- The specific entity ID (nullable for system settings)
  
  -- Setting definition
  category TEXT NOT NULL, -- booking, payment, notification, etc.
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  
  -- Inheritance and overrides
  inherits_from UUID REFERENCES public.settings(id),
  is_inherited BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  description TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_setting UNIQUE(context_type, context_id, category, key)
);

-- ===============================================
-- PERFORMANCE & SEARCH INDEXES
-- ===============================================

-- User/Profile indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_shop_associations ON public.profiles(shop_id, barbershop_id, organization_id);

-- Barbershop indexes
CREATE INDEX idx_barbershops_owner ON public.barbershops(owner_id);
CREATE INDEX idx_barbershops_organization ON public.barbershops(organization_id);
CREATE INDEX idx_barbershops_location ON public.barbershops(city, state, country);
CREATE INDEX idx_barbershops_search ON public.barbershops USING gin(search_vector);

-- Appointment indexes (critical for performance)
CREATE INDEX idx_appointments_barbershop_date ON public.appointments(barbershop_id, scheduled_at);
CREATE INDEX idx_appointments_barber_date ON public.appointments(barber_id, scheduled_at);
CREATE INDEX idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Customer indexes
CREATE INDEX idx_customers_barbershop ON public.customers(barbershop_id);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_search ON public.customers USING gin(search_vector);

-- AI conversation indexes
CREATE INDEX idx_conversations_user_session ON public.ai_conversations(user_id, session_id);
CREATE INDEX idx_conversations_agent_date ON public.ai_conversations(agent_id, created_at);

-- Notification indexes
CREATE INDEX idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX idx_notifications_type_status ON public.notifications(type, status);

-- Settings indexes
CREATE INDEX idx_settings_context ON public.settings(context_type, context_id);
CREATE INDEX idx_settings_category ON public.settings(category, key);

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Profile policies (users can manage own profile)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Barbershop policies (owners and staff can access)
CREATE POLICY "Barbershop access by ownership or employment" ON public.barbershops
  FOR ALL USING (
    owner_id = auth.uid() OR
    id IN (SELECT barbershop_id FROM public.barbershop_staff WHERE user_id = auth.uid() AND is_active = TRUE)
  );

-- Appointment policies (barbershop-scoped access)
CREATE POLICY "Appointment access by barbershop association" ON public.appointments
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM public.barbershops 
      WHERE owner_id = auth.uid() OR
      id IN (SELECT barbershop_id FROM public.barbershop_staff WHERE user_id = auth.uid() AND is_active = TRUE)
    )
  );

-- AI conversation policies (user-scoped)
CREATE POLICY "Users can manage own AI conversations" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- Notification policies (user-scoped)  
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ===============================================
-- TRIGGERS & FUNCTIONS
-- ===============================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- DEFAULT DATA & INITIAL SETUP
-- ===============================================

-- Insert default AI agents
INSERT INTO public.ai_agents (name, type, description, capabilities) VALUES
('Master Coach', 'master_coach', 'Strategic business coaching and growth planning', 
 '["business_strategy", "goal_setting", "performance_analysis", "market_insights"]'),
('Financial Advisor', 'financial', 'Revenue optimization and financial planning',
 '["revenue_analysis", "pricing_strategy", "cost_optimization", "profit_maximization"]'),
('Client Acquisition Expert', 'client_acquisition', 'Customer acquisition and retention strategies',
 '["marketing_campaigns", "customer_analysis", "retention_strategies", "lead_generation"]'),
('Operations Manager', 'operations', 'Workflow optimization and efficiency improvements',
 '["scheduling_optimization", "staff_management", "process_improvement", "automation"]'),
('Brand Strategist', 'brand', 'Brand development and market positioning',
 '["brand_analysis", "competitive_positioning", "marketing_strategy", "reputation_management"]'),
('Growth Strategist', 'growth', 'Scaling strategies and expansion planning',
 '["market_expansion", "scaling_strategies", "investment_planning", "partnership_opportunities"]'),
('Strategic Mindset Coach', 'strategic_mindset', 'Leadership development and strategic thinking',
 '["leadership_coaching", "strategic_planning", "decision_making", "team_building"]')
ON CONFLICT DO NOTHING;

-- ===============================================
-- SCHEMA VALIDATION & COMMENTS
-- ===============================================

COMMENT ON SCHEMA public IS '6FB AI Agent System - Master Schema v1.0.0';
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users - SINGLE source of truth for users';
COMMENT ON TABLE public.barbershops IS 'Individual barbershop locations with business configuration';
COMMENT ON TABLE public.appointments IS 'Core booking system with comprehensive appointment management';
COMMENT ON TABLE public.ai_conversations IS 'AI agent conversation history with business context';
COMMENT ON TABLE public.settings IS 'Unified hierarchical settings system replacing multiple settings tables';

-- Schema version tracking
CREATE TABLE public.schema_version (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO public.schema_version (version, description) VALUES 
('1.0.0', 'Master Schema Consolidation - Single source of truth');

-- ===============================================
-- END OF MASTER SCHEMA
-- ===============================================