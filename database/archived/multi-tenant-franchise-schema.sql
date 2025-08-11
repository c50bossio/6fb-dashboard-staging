-- ==========================================
-- MULTI-TENANT FRANCHISE ARCHITECTURE SCHEMA
-- 6FB AI Agent System - Enterprise Edition
-- ==========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ==========================================
-- ENUM TYPES
-- ==========================================

-- Enhanced User Roles for Franchise Hierarchy
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'FRANCHISE_OWNER',
  'REGIONAL_MANAGER',
  'SHOP_OWNER',
  'SHOP_MANAGER', 
  'BARBER',
  'RECEPTIONIST',
  'CLIENT'
);

-- Franchise Status Types
CREATE TYPE franchise_status AS ENUM (
  'ACTIVE',
  'PENDING_SETUP',
  'SUSPENDED',
  'TERMINATED'
);

-- Location Status Types
CREATE TYPE location_status AS ENUM (
  'ACTIVE',
  'UNDER_CONSTRUCTION',
  'TEMPORARILY_CLOSED',
  'PERMANENTLY_CLOSED'
);

-- Subscription Tiers
CREATE TYPE subscription_tier AS ENUM (
  'FRANCHISE_BASIC',
  'FRANCHISE_PREMIUM', 
  'FRANCHISE_ENTERPRISE',
  'LOCATION_STARTER',
  'LOCATION_PROFESSIONAL',
  'LOCATION_PREMIUM'
);

-- Cross-location Permission Types
CREATE TYPE cross_location_permission AS ENUM (
  'VIEW_ALL_LOCATIONS',
  'MANAGE_ALL_LOCATIONS',
  'VIEW_REGION_LOCATIONS',
  'MANAGE_REGION_LOCATIONS',
  'TRANSFER_CUSTOMERS',
  'VIEW_FRANCHISE_ANALYTICS',
  'MANAGE_FRANCHISE_SETTINGS'
);

-- ==========================================
-- CORE FRANCHISE MANAGEMENT
-- ==========================================

-- Master Franchise Registry
CREATE TABLE franchises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., "6FB001"
  franchise_name VARCHAR(255) NOT NULL,
  brand_name VARCHAR(255) NOT NULL DEFAULT '6FB',
  
  -- Franchise Owner Information
  owner_id UUID NOT NULL, -- References users table
  legal_entity_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  
  -- Business Details
  industry_vertical VARCHAR(100) DEFAULT 'barbershop',
  target_market VARCHAR(100),
  business_model VARCHAR(50) DEFAULT 'franchise',
  
  -- Geographic Information
  primary_region VARCHAR(100),
  operating_countries TEXT[] DEFAULT ARRAY['US'],
  headquarters_address JSONB,
  
  -- Franchise Agreement
  franchise_agreement_date DATE,
  franchise_term_years INTEGER DEFAULT 10,
  renewal_date DATE,
  
  -- Operational Status
  status franchise_status DEFAULT 'PENDING_SETUP',
  is_active BOOLEAN DEFAULT TRUE,
  max_locations INTEGER DEFAULT 50,
  current_location_count INTEGER DEFAULT 0,
  
  -- Financial Terms
  franchise_fee DECIMAL(12,2),
  royalty_percentage DECIMAL(5,4) DEFAULT 0.0500, -- 5%
  marketing_fee_percentage DECIMAL(5,4) DEFAULT 0.0200, -- 2%
  
  -- Technology Configuration
  subscription_tier subscription_tier DEFAULT 'FRANCHISE_BASIC',
  ai_agent_enabled BOOLEAN DEFAULT TRUE,
  multi_location_dashboard_enabled BOOLEAN DEFAULT TRUE,
  cross_location_booking_enabled BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_checklist JSONB DEFAULT '{}',
  brand_customization JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Franchise Regions (for larger franchise networks)
CREATE TABLE franchise_regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  region_code VARCHAR(10) NOT NULL, -- e.g., "NW", "SE", "MW"
  region_name VARCHAR(255) NOT NULL,
  
  -- Regional Management
  regional_manager_id UUID, -- References users table
  
  -- Geographic Bounds
  geographic_bounds JSONB, -- GeoJSON polygon
  included_states TEXT[],
  included_cities TEXT[],
  
  -- Performance Targets
  target_locations INTEGER,
  target_annual_revenue DECIMAL(15,2),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(franchise_id, region_code)
);

-- Enhanced Multi-tenant Locations Table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  region_id UUID REFERENCES franchise_regions(id) ON DELETE SET NULL,
  
  -- Location Identification
  location_code VARCHAR(15) UNIQUE NOT NULL, -- e.g., "6FB001-NYC-001"
  location_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  
  -- Hierarchy and Ownership
  shop_owner_id UUID NOT NULL, -- References users table
  shop_manager_id UUID, -- References users table
  
  -- Physical Address
  street_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(50) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(3) DEFAULT 'USA',
  
  -- Geographic Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geo_point POINT, -- PostGIS point for spatial queries
  
  -- Contact Information
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  social_media_handles JSONB DEFAULT '{}',
  
  -- Business Operations
  status location_status DEFAULT 'UNDER_CONSTRUCTION',
  is_active BOOLEAN DEFAULT TRUE,
  grand_opening_date DATE,
  business_hours JSONB DEFAULT '{}',
  appointment_buffer_minutes INTEGER DEFAULT 15,
  
  -- Capacity and Resources
  total_chairs INTEGER DEFAULT 4,
  barber_stations INTEGER DEFAULT 4,
  max_concurrent_appointments INTEGER DEFAULT 8,
  waiting_area_capacity INTEGER DEFAULT 12,
  
  -- Services and Pricing
  base_pricing_tier VARCHAR(50) DEFAULT 'standard',
  service_menu JSONB DEFAULT '{}',
  pricing_overrides JSONB DEFAULT '{}',
  
  -- Technology Configuration
  subscription_tier subscription_tier DEFAULT 'LOCATION_STARTER',
  pos_system_integration VARCHAR(50),
  calendar_integration_enabled BOOLEAN DEFAULT TRUE,
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  waitlist_enabled BOOLEAN DEFAULT TRUE,
  loyalty_program_enabled BOOLEAN DEFAULT TRUE,
  
  -- AI Features
  ai_agent_enabled BOOLEAN DEFAULT TRUE,
  ai_scheduling_optimization BOOLEAN DEFAULT TRUE,
  ai_customer_insights BOOLEAN DEFAULT FALSE,
  ai_inventory_management BOOLEAN DEFAULT FALSE,
  
  -- Branding and Customization
  brand_colors JSONB DEFAULT '{}',
  logo_url TEXT,
  interior_photos TEXT[],
  custom_styling JSONB DEFAULT '{}',
  
  -- Performance Metrics (cached for quick access)
  monthly_revenue DECIMAL(12,2) DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Metadata
  setup_completed BOOLEAN DEFAULT FALSE,
  setup_checklist JSONB DEFAULT '{}',
  compliance_checklist JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ENHANCED USER MANAGEMENT WITH HIERARCHY
-- ==========================================

-- Enhanced Users Table for Franchise Hierarchy
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core Identity
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  hashed_password VARCHAR(255),
  
  -- Role and Permissions
  role user_role DEFAULT 'CLIENT',
  is_active BOOLEAN DEFAULT TRUE,
  is_system_admin BOOLEAN DEFAULT FALSE,
  
  -- Franchise Association
  primary_franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
  primary_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  primary_region_id UUID REFERENCES franchise_regions(id) ON DELETE SET NULL,
  
  -- Cross-location Permissions
  cross_location_permissions cross_location_permission[],
  accessible_location_ids UUID[], -- Specific locations user can access
  accessible_region_ids UUID[], -- Specific regions user can access
  
  -- Personal Information
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  preferred_language VARCHAR(5) DEFAULT 'en',
  
  -- OAuth Integration
  google_id VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  
  -- Stripe Integration
  stripe_customer_id VARCHAR(255),
  stripe_account_id VARCHAR(255), -- For barbers receiving payments
  
  -- Trial and Subscription
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  subscription_status VARCHAR(20) DEFAULT 'trial',
  subscription_tier subscription_tier,
  
  -- Onboarding and Training
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}',
  training_modules_completed JSONB DEFAULT '[]',
  certification_status VARCHAR(50),
  
  -- AI Agent Usage
  ai_agent_subscription_tier VARCHAR(20) DEFAULT 'basic',
  ai_agent_monthly_quota INTEGER DEFAULT 100,
  ai_agent_usage_count INTEGER DEFAULT 0,
  ai_agent_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Employee Specific Fields
  employee_id VARCHAR(50),
  hire_date DATE,
  employment_status VARCHAR(20),
  hourly_rate DECIMAL(8,2),
  commission_rate DECIMAL(5,4) DEFAULT 0.20,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-Location Associations (Many-to-Many)
CREATE TABLE user_location_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Access Level
  access_level VARCHAR(50) NOT NULL, -- 'FULL_ACCESS', 'READ_ONLY', 'APPOINTMENTS_ONLY'
  permissions JSONB DEFAULT '{}',
  
  -- Employment Details (if staff)
  position_title VARCHAR(100),
  start_date DATE,
  end_date DATE,
  is_primary_location BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, location_id)
);

-- ==========================================
-- CROSS-LOCATION CUSTOMER MANAGEMENT
-- ==========================================

-- Unified Customer Profiles (across all franchise locations)
CREATE TABLE franchise_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Customer Identity
  customer_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "6FB001-CUST-000001"
  email VARCHAR(255),
  phone VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  
  -- Demographics
  date_of_birth DATE,
  gender VARCHAR(10),
  preferred_language VARCHAR(5) DEFAULT 'en',
  
  -- Addresses (can have multiple)
  addresses JSONB DEFAULT '[]',
  primary_address_index INTEGER DEFAULT 0,
  
  -- Franchise Loyalty Program
  loyalty_member_since DATE DEFAULT CURRENT_DATE,
  loyalty_tier VARCHAR(50) DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD, PLATINUM
  loyalty_points INTEGER DEFAULT 0,
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  total_spend DECIMAL(12,2) DEFAULT 0,
  
  -- Preferences
  preferred_locations UUID[], -- Array of location IDs
  preferred_barbers UUID[], -- Array of user IDs
  service_preferences JSONB DEFAULT '{}',
  communication_preferences JSONB DEFAULT '{}',
  
  -- Behavioral Analytics
  visit_frequency_days INTEGER, -- Average days between visits
  average_service_duration INTEGER, -- Minutes
  average_spend_per_visit DECIMAL(8,2),
  most_popular_service_category VARCHAR(100),
  seasonal_patterns JSONB DEFAULT '{}',
  
  -- Marketing and Communication
  marketing_opt_in BOOLEAN DEFAULT TRUE,
  sms_opt_in BOOLEAN DEFAULT FALSE,
  email_opt_in BOOLEAN DEFAULT TRUE,
  last_marketing_contact DATE,
  
  -- Customer Lifecycle
  acquisition_date DATE DEFAULT CURRENT_DATE,
  acquisition_location_id UUID REFERENCES locations(id),
  acquisition_channel VARCHAR(100), -- 'WALK_IN', 'REFERRAL', 'ONLINE', 'SOCIAL_MEDIA'
  last_visit_date DATE,
  last_visit_location_id UUID REFERENCES locations(id),
  customer_status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'CHURNED', 'VIP'
  
  -- Data Privacy and Compliance
  gdpr_consent BOOLEAN DEFAULT FALSE,
  gdpr_consent_date TIMESTAMP WITH TIME ZONE,
  data_retention_expires DATE,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Location History (tracks which locations a customer has visited)
CREATE TABLE customer_location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES franchise_customers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Visit Statistics
  first_visit_date DATE NOT NULL,
  last_visit_date DATE NOT NULL,
  total_visits INTEGER DEFAULT 1,
  total_spend DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  
  -- Status at this location
  customer_status VARCHAR(50) DEFAULT 'ACTIVE',
  vip_status BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(customer_id, location_id)
);

-- ==========================================
-- ENHANCED APPOINTMENT SYSTEM
-- ==========================================

-- Enhanced Appointments with Cross-location Support
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "6FB001-NYC-001-000001"
  
  -- Location and Franchise Context
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Participants
  customer_id UUID REFERENCES franchise_customers(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  -- Appointment Details
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status appointment_status DEFAULT 'PENDING',
  
  -- Cross-location Transfer Information
  original_location_id UUID REFERENCES locations(id),
  transferred_from_appointment_id UUID REFERENCES appointments(id),
  transfer_reason VARCHAR(255),
  transfer_approved_by UUID REFERENCES users(id),
  
  -- Pricing Information
  base_service_price DECIMAL(8,2) NOT NULL,
  location_price_adjustment DECIMAL(8,2) DEFAULT 0, -- Location-specific pricing
  promotional_discount DECIMAL(8,2) DEFAULT 0,
  tip_amount DECIMAL(8,2) DEFAULT 0,
  total_amount DECIMAL(8,2) NOT NULL,
  
  -- Customer Information (denormalized for performance)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  
  -- Service Details
  service_notes TEXT,
  barber_notes TEXT,
  customer_special_requests TEXT,
  
  -- Quality and Experience
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  customer_review TEXT,
  service_quality_score DECIMAL(3,2), -- Internal quality assessment
  
  -- Integration Data
  google_calendar_event_id VARCHAR(255),
  pos_system_transaction_id VARCHAR(255),
  
  -- Metadata
  booking_source VARCHAR(50) DEFAULT 'ONLINE', -- 'ONLINE', 'PHONE', 'WALK_IN', 'REFERRAL'
  created_by_user_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- FRANCHISE FINANCIAL MANAGEMENT
-- ==========================================

-- Franchise Financial Transactions
CREATE TABLE franchise_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL, -- 'ROYALTY', 'MARKETING_FEE', 'FRANCHISE_FEE', 'TECHNOLOGY_FEE'
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Time Period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Payment Information
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'OVERDUE', 'DISPUTED'
  paid_date DATE,
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Calculation Details
  base_revenue DECIMAL(15,2), -- Revenue used for percentage calculations
  percentage_rate DECIMAL(5,4), -- Rate applied (e.g., 0.05 for 5%)
  calculation_details JSONB,
  
  -- References
  invoice_number VARCHAR(50) UNIQUE,
  invoice_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- COMPREHENSIVE ANALYTICS TABLES
-- ==========================================

-- Franchise-wide Business Analytics
CREATE TABLE franchise_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE, -- NULL for franchise-wide metrics
  
  -- Time Period
  date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  
  -- Revenue Metrics
  total_revenue DECIMAL(15,2) DEFAULT 0,
  service_revenue DECIMAL(15,2) DEFAULT 0,
  tip_revenue DECIMAL(15,2) DEFAULT 0,
  retail_revenue DECIMAL(15,2) DEFAULT 0,
  
  -- Appointment Metrics
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  average_appointment_value DECIMAL(8,2) DEFAULT 0,
  
  -- Customer Metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  total_unique_customers INTEGER DEFAULT 0,
  customer_retention_rate DECIMAL(5,4),
  
  -- Staff Performance
  active_barbers INTEGER DEFAULT 0,
  total_barber_hours DECIMAL(8,2) DEFAULT 0,
  revenue_per_barber_hour DECIMAL(8,2) DEFAULT 0,
  
  -- Operational Metrics
  chair_utilization_rate DECIMAL(5,4),
  average_wait_time_minutes INTEGER DEFAULT 0,
  customer_satisfaction_score DECIMAL(3,2),
  
  -- Cross-location Metrics (for location-specific rows)
  transfer_appointments_in INTEGER DEFAULT 0,
  transfer_appointments_out INTEGER DEFAULT 0,
  cross_location_customers INTEGER DEFAULT 0,
  
  -- AI and Technology Usage
  ai_recommendations_generated INTEGER DEFAULT 0,
  ai_recommendations_implemented INTEGER DEFAULT 0,
  online_bookings INTEGER DEFAULT 0,
  mobile_app_bookings INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(franchise_id, location_id, date, period_type)
);

-- Location Performance Benchmarking
CREATE TABLE location_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Benchmark Period
  benchmark_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  
  -- Performance Categories
  category VARCHAR(50) NOT NULL, -- 'REVENUE', 'CUSTOMER_SATISFACTION', 'EFFICIENCY', 'GROWTH'
  
  -- Statistical Data
  top_performer_location_id UUID REFERENCES locations(id),
  top_performer_value DECIMAL(15,2),
  
  franchise_average DECIMAL(15,2),
  franchise_median DECIMAL(15,2),
  franchise_percentile_25 DECIMAL(15,2),
  franchise_percentile_75 DECIMAL(15,2),
  
  -- Industry Benchmarks (if available)
  industry_average DECIMAL(15,2),
  industry_percentile_rank DECIMAL(5,2), -- Where this franchise ranks in industry
  
  -- Performance Rankings
  location_rankings JSONB, -- Array of {location_id, rank, value}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(franchise_id, benchmark_date, period_type, category)
);

-- ==========================================
-- AI AGENT ENHANCEMENTS FOR MULTI-LOCATION
-- ==========================================

-- Enhanced AI Chat Sessions for Franchise Context
CREATE TABLE ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and Context
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  region_id UUID REFERENCES franchise_regions(id) ON DELETE SET NULL,
  
  -- AI Agent Configuration
  agent_type ai_agent_type NOT NULL,
  session_title VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Multi-location Context
  location_scope VARCHAR(50) DEFAULT 'SINGLE', -- 'SINGLE', 'REGION', 'FRANCHISE', 'CROSS_FRANCHISE'
  accessible_location_ids UUID[], -- Locations this session can analyze
  
  -- Business Context for Enhanced RAG
  business_context JSONB DEFAULT '{}',
  comparative_context JSONB DEFAULT '{}', -- Cross-location comparisons
  benchmark_context JSONB DEFAULT '{}', -- Industry/franchise benchmarks
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-location AI Knowledge Base
CREATE TABLE franchise_ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
  
  -- Knowledge Classification
  agent_type ai_agent_type NOT NULL,
  category VARCHAR(100) NOT NULL,
  knowledge_level VARCHAR(50) DEFAULT 'FRANCHISE', -- 'FRANCHISE', 'LOCATION', 'INDUSTRY', 'UNIVERSAL'
  
  -- Content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Applicability
  applicable_location_types TEXT[], -- e.g., ['URBAN', 'SUBURBAN', 'HIGH_VOLUME']
  applicable_franchise_sizes TEXT[], -- e.g., ['SMALL', 'MEDIUM', 'LARGE']
  applicable_regions TEXT[],
  
  -- Vector Search
  vector_embedding vector(1536),
  
  -- Performance Tracking
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.95,
  avg_user_rating DECIMAL(3,2),
  
  -- Context Metadata
  revenue_impact_category VARCHAR(50), -- 'HIGH', 'MEDIUM', 'LOW'
  implementation_difficulty VARCHAR(50), -- 'EASY', 'MODERATE', 'COMPLEX'
  roi_timeframe VARCHAR(50), -- 'IMMEDIATE', 'SHORT_TERM', 'LONG_TERM'
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR ENTERPRISE PERFORMANCE
-- ==========================================

-- Franchise and Location Indexes
CREATE INDEX idx_franchises_owner ON franchises(owner_id);
CREATE INDEX idx_franchises_status ON franchises(status, is_active);
CREATE INDEX idx_franchises_code ON franchises(franchise_code);

CREATE INDEX idx_locations_franchise ON locations(franchise_id);
CREATE INDEX idx_locations_owner ON locations(shop_owner_id);
CREATE INDEX idx_locations_region ON locations(region_id);
CREATE INDEX idx_locations_status ON locations(status, is_active);
CREATE INDEX idx_locations_code ON locations(location_code);
CREATE INDEX idx_locations_geo ON locations USING GIST(geo_point);

-- User and Access Control Indexes
CREATE INDEX idx_users_franchise ON users(primary_franchise_id);
CREATE INDEX idx_users_location ON users(primary_location_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_location_access_user ON user_location_access(user_id);
CREATE INDEX idx_user_location_access_location ON user_location_access(location_id);

-- Customer Relationship Indexes
CREATE INDEX idx_franchise_customers_franchise ON franchise_customers(franchise_id);
CREATE INDEX idx_franchise_customers_email ON franchise_customers(email);
CREATE INDEX idx_franchise_customers_phone ON franchise_customers(phone);
CREATE INDEX idx_franchise_customers_code ON franchise_customers(customer_code);
CREATE INDEX idx_franchise_customers_loyalty ON franchise_customers(loyalty_tier, loyalty_points DESC);

-- Appointment System Indexes
CREATE INDEX idx_appointments_franchise ON appointments(franchise_id);
CREATE INDEX idx_appointments_location ON appointments(location_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_barber ON appointments(barber_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_number ON appointments(appointment_number);

-- Analytics and Reporting Indexes
CREATE INDEX idx_franchise_analytics_franchise_date ON franchise_analytics(franchise_id, date DESC);
CREATE INDEX idx_franchise_analytics_location_date ON franchise_analytics(location_id, date DESC);
CREATE INDEX idx_franchise_analytics_period ON franchise_analytics(period_type, date DESC);

CREATE INDEX idx_location_benchmarks_franchise ON location_benchmarks(franchise_id, benchmark_date DESC);
CREATE INDEX idx_location_benchmarks_category ON location_benchmarks(category, benchmark_date DESC);

-- AI and Knowledge Base Indexes
CREATE INDEX idx_ai_sessions_franchise ON ai_chat_sessions(franchise_id);
CREATE INDEX idx_ai_sessions_location ON ai_chat_sessions(location_id);
CREATE INDEX idx_ai_sessions_agent ON ai_chat_sessions(agent_type);

CREATE INDEX idx_franchise_ai_knowledge_franchise ON franchise_ai_knowledge_base(franchise_id);
CREATE INDEX idx_franchise_ai_knowledge_agent ON franchise_ai_knowledge_base(agent_type);
CREATE INDEX idx_franchise_ai_knowledge_category ON franchise_ai_knowledge_base(category);

-- Vector similarity search indexes
CREATE INDEX idx_franchise_ai_knowledge_embedding ON franchise_ai_knowledge_base 
  USING ivfflat (vector_embedding vector_cosine_ops) WITH (lists = 100);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Franchise Isolation
CREATE POLICY franchise_isolation_policy ON franchises
  FOR ALL USING (
    -- Super admins can see all
    current_setting('app.user_role') = 'SUPER_ADMIN' OR
    -- Franchise owners can see their own franchise
    owner_id::text = current_setting('app.user_id') OR
    -- Users can see franchises they have access to
    id::text = ANY(string_to_array(current_setting('app.accessible_franchises', true), ','))
  );

-- Location access policies
CREATE POLICY location_access_policy ON locations
  FOR ALL USING (
    -- Super admins and franchise owners can see all locations in their franchise
    current_setting('app.user_role') IN ('SUPER_ADMIN', 'FRANCHISE_OWNER') OR
    -- Location-specific access
    id::text = ANY(string_to_array(current_setting('app.accessible_locations', true), ','))
  );

-- Customer data isolation
CREATE POLICY customer_franchise_isolation ON franchise_customers
  FOR ALL USING (
    franchise_id::text = ANY(string_to_array(current_setting('app.accessible_franchises', true), ','))
  );

-- ==========================================
-- TRIGGERS AND FUNCTIONS
-- ==========================================

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_franchises_updated_at 
  BEFORE UPDATE ON franchises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_franchise_customers_updated_at 
  BEFORE UPDATE ON franchise_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at 
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to maintain location count in franchises table
CREATE OR REPLACE FUNCTION maintain_location_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE franchises 
        SET current_location_count = current_location_count + 1
        WHERE id = NEW.franchise_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE franchises 
        SET current_location_count = current_location_count - 1
        WHERE id = OLD.franchise_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_franchise_location_count
  AFTER INSERT OR DELETE ON locations
  FOR EACH ROW EXECUTE FUNCTION maintain_location_count();

-- ==========================================
-- SAMPLE DATA VIEWS FOR ANALYTICS
-- ==========================================

-- Franchise Performance Overview
CREATE VIEW franchise_performance_overview AS
SELECT 
  f.id AS franchise_id,
  f.franchise_code,
  f.franchise_name,
  f.current_location_count,
  f.status,
  COALESCE(SUM(fa.total_revenue), 0) AS total_revenue_mtd,
  COALESCE(SUM(fa.total_appointments), 0) AS total_appointments_mtd,
  COALESCE(AVG(fa.customer_satisfaction_score), 0) AS avg_satisfaction_score,
  COUNT(DISTINCT fa.location_id) AS reporting_locations
FROM franchises f
LEFT JOIN franchise_analytics fa ON f.id = fa.franchise_id 
  AND fa.date >= DATE_TRUNC('month', CURRENT_DATE)
  AND fa.period_type = 'daily'
WHERE f.is_active = true
GROUP BY f.id, f.franchise_code, f.franchise_name, f.current_location_count, f.status;

-- Top Performing Locations
CREATE VIEW top_performing_locations AS
SELECT 
  l.id AS location_id,
  l.location_code,
  l.location_name,
  l.city,
  l.state_province,
  fa.total_revenue,
  fa.customer_satisfaction_score,
  fa.chair_utilization_rate,
  RANK() OVER (PARTITION BY l.franchise_id ORDER BY fa.total_revenue DESC) AS revenue_rank
FROM locations l
JOIN franchise_analytics fa ON l.id = fa.location_id
WHERE fa.date = CURRENT_DATE - INTERVAL '1 day'
  AND fa.period_type = 'daily'
  AND l.is_active = true;

-- Cross-location Customer Analysis
CREATE VIEW cross_location_customers AS
SELECT 
  fc.id AS customer_id,
  fc.customer_code,
  fc.name,
  fc.franchise_id,
  fc.total_visits,
  fc.lifetime_value,
  COUNT(DISTINCT clh.location_id) AS locations_visited,
  ARRAY_AGG(DISTINCT l.location_name) AS location_names
FROM franchise_customers fc
JOIN customer_location_history clh ON fc.id = clh.customer_id
JOIN locations l ON clh.location_id = l.id
WHERE fc.is_active = true
GROUP BY fc.id, fc.customer_code, fc.name, fc.franchise_id, fc.total_visits, fc.lifetime_value
HAVING COUNT(DISTINCT clh.location_id) > 1;