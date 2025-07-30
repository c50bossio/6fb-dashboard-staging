-- Complete PostgreSQL Schema for 6FB AI Agent System
-- Combines barbershop management with AI agent functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pgvector extension will be added when implementing RAG features

-- User Roles Enum
CREATE TYPE user_role AS ENUM (
  'CLIENT',
  'BARBER', 
  'SHOP_OWNER',
  'ENTERPRISE_OWNER',
  'SUPER_ADMIN'
);

-- Appointment Status Enum
CREATE TYPE appointment_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'COMPLETED', 
  'CANCELLED',
  'NO_SHOW'
);

-- Payment Status Enum
CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED'
);

-- AI Agent Types Enum
CREATE TYPE ai_agent_type AS ENUM (
  'master_coach',
  'financial',
  'client_acquisition',
  'operations',
  'brand',
  'growth',
  'strategic_mindset'
);

-- ==========================================
-- CORE USER MANAGEMENT
-- ==========================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  hashed_password VARCHAR(255),
  role user_role DEFAULT 'CLIENT',
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- OAuth fields
  google_id VARCHAR(255) UNIQUE,
  facebook_id VARCHAR(255) UNIQUE,
  
  -- Stripe integration
  stripe_customer_id VARCHAR(255),
  stripe_account_id VARCHAR(255), -- For barbers receiving payments
  
  -- Trial and subscription
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  subscription_status VARCHAR(20) DEFAULT 'trial',
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}',
  
  -- AI Agent subscription
  ai_agent_subscription_tier VARCHAR(20) DEFAULT 'basic', -- basic, premium, enterprise
  ai_agent_monthly_quota INTEGER DEFAULT 100,
  ai_agent_usage_count INTEGER DEFAULT 0,
  ai_agent_reset_date DATE DEFAULT CURRENT_DATE
);

-- ==========================================
-- BARBERSHOP MANAGEMENT
-- ==========================================

-- Organizations (for enterprise owners)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershops
CREATE TABLE barbershops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  country VARCHAR(50) DEFAULT 'US',
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Business hours (JSON format)
  business_hours JSONB DEFAULT '{}',
  
  -- Pricing and services
  base_pricing JSONB DEFAULT '{}',
  
  -- Owner and organization
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Settings
  booking_enabled BOOLEAN DEFAULT TRUE,
  online_booking_enabled BOOLEAN DEFAULT TRUE,
  ai_agent_enabled BOOLEAN DEFAULT TRUE,
  
  -- Analytics and AI context
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershop staff relationships
CREATE TABLE barbershop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  commission_rate DECIMAL(5,4) DEFAULT 0.20, -- 20% default
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, user_id)
);

-- Base services offered by barbershops (templates)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_duration_minutes INTEGER NOT NULL, -- Base duration in minutes
  base_price DECIMAL(8,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(100), -- haircut, beard, styling, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barber-specific services with individual pricing and duration
CREATE TABLE barber_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Barber-specific pricing and timing
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  
  -- Barber's skill level or notes for this service
  skill_level VARCHAR(50), -- expert, intermediate, beginner
  specialty_notes TEXT,
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barber_id, service_id)
);

-- ==========================================
-- APPOINTMENT MANAGEMENT
-- ==========================================

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  -- Appointment details
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status appointment_status DEFAULT 'PENDING',
  
  -- Pricing
  service_price DECIMAL(8,2) NOT NULL,
  tip_amount DECIMAL(8,2) DEFAULT 0,
  total_amount DECIMAL(8,2) NOT NULL,
  
  -- Client information
  client_name VARCHAR(255),
  client_phone VARCHAR(20),
  client_email VARCHAR(255),
  
  -- Notes and special requests
  client_notes TEXT,
  barber_notes TEXT,
  
  -- Google Calendar integration
  google_calendar_event_id VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PAYMENT MANAGEMENT
-- ==========================================

-- Payment transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe integration
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  
  -- Payment amounts
  service_amount DECIMAL(8,2) NOT NULL,
  tip_amount DECIMAL(8,2) DEFAULT 0,
  platform_fee DECIMAL(8,2) DEFAULT 0,
  total_amount DECIMAL(8,2) NOT NULL,
  
  -- Commission calculation
  barber_commission DECIMAL(8,2) DEFAULT 0,
  barbershop_earnings DECIMAL(8,2) DEFAULT 0,
  
  status payment_status DEFAULT 'PENDING',
  payment_method VARCHAR(50), -- card, cash, etc.
  
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AI AGENT SYSTEM
-- ==========================================

-- AI Agent chat sessions
CREATE TABLE ai_chat_sessions (
  id VARCHAR(255) PRIMARY KEY, -- Custom session ID format
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
  agent_type ai_agent_type NOT NULL,
  
  -- Session metadata
  session_title VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Business context for RAG
  business_context JSONB DEFAULT '{}', -- Current revenue, goals, challenges
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent chat messages
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  
  -- AI response metadata
  agent_name VARCHAR(100),
  recommendations JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2),
  
  -- Usage tracking
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CALENDAR INTEGRATION
-- ==========================================

-- User calendar integrations (Google Calendar, etc.)
CREATE TABLE user_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google', 'outlook', etc.
  
  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Calendar info
  calendar_id VARCHAR(255),
  calendar_name VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Barbershop indexes
CREATE INDEX idx_barbershops_owner ON barbershops(owner_id);
CREATE INDEX idx_barbershops_org ON barbershops(organization_id);
CREATE INDEX idx_barbershop_staff_shop ON barbershop_staff(barbershop_id);

-- Service indexes
CREATE INDEX idx_services_barbershop ON services(barbershop_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_barber_services_barber ON barber_services(barber_id);
CREATE INDEX idx_barber_services_service ON barber_services(service_id);
CREATE INDEX idx_barber_services_barbershop ON barber_services(barbershop_id);

-- Appointment indexes
CREATE INDEX idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_barber ON appointments(barber_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Payment indexes
CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);

-- AI Chat indexes
CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX idx_ai_sessions_barbershop ON ai_chat_sessions(barbershop_id);
CREATE INDEX idx_ai_sessions_agent ON ai_chat_sessions(agent_type);
CREATE INDEX idx_ai_messages_session ON ai_chat_messages(session_id);

-- Calendar integration indexes
CREATE INDEX idx_calendar_integrations_user ON user_calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON user_calendar_integrations(provider);
CREATE INDEX idx_calendar_integrations_active ON user_calendar_integrations(is_active);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_barber_services_updated_at BEFORE UPDATE ON barber_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON user_calendar_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ==========================================

-- Insert sample users
INSERT INTO users (email, hashed_password, name, role, is_active) 
VALUES 
    ('dev@6fb.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeqX8QGR8.gN1GQK6', 'Dev User', 'SHOP_OWNER', TRUE),
    ('client@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeqX8QGR8.gN1GQK6', 'John Client', 'CLIENT', TRUE),
    ('barber@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeqX8QGR8.gN1GQK6', 'Mike Barber', 'BARBER', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Get the dev user ID for sample barbershop
DO $$
DECLARE
    dev_user_id UUID;
    sample_barbershop_id UUID;
    sample_service_id UUID;
BEGIN
    -- Get dev user ID
    SELECT id INTO dev_user_id FROM users WHERE email = 'dev@6fb.local';
    
    -- Insert sample barbershop
    INSERT INTO barbershops (name, owner_id, description, address, city, state, phone, email)
    VALUES ('Development Shop', dev_user_id, 'Sample barbershop for testing', '123 Main St', 'San Francisco', 'CA', '(555) 123-4567', 'dev@6fb.local')
    RETURNING id INTO sample_barbershop_id;
    
    -- Insert base services (templates)
    INSERT INTO services (barbershop_id, name, description, base_duration_minutes, base_price, category)
    VALUES 
        (sample_barbershop_id, 'Classic Haircut', 'Traditional men''s haircut', 30, 35.00, 'haircut'),
        (sample_barbershop_id, 'Beard Trim', 'Professional beard shaping and trim', 15, 20.00, 'beard'),
        (sample_barbershop_id, 'Premium Cut & Style', 'Haircut with wash and styling', 45, 55.00, 'haircut'),
        (sample_barbershop_id, 'Hot Towel Shave', 'Traditional straight razor shave', 30, 40.00, 'shaving');
    
END $$;

-- Create barber-specific services for sample data
DO $$
DECLARE
    classic_haircut_id UUID;
    beard_trim_id UUID;
    premium_cut_id UUID;
    shave_id UUID;
    barber_user_id UUID;
    sample_barbershop_id UUID;
BEGIN
    -- Get barbershop ID
    SELECT id INTO sample_barbershop_id FROM barbershops WHERE name = 'Development Shop';
    
    -- Get service IDs  
    SELECT id INTO classic_haircut_id FROM services WHERE name = 'Classic Haircut' AND barbershop_id = sample_barbershop_id;
    SELECT id INTO beard_trim_id FROM services WHERE name = 'Beard Trim' AND barbershop_id = sample_barbershop_id;
    SELECT id INTO premium_cut_id FROM services WHERE name = 'Premium Cut & Style' AND barbershop_id = sample_barbershop_id;
    SELECT id INTO shave_id FROM services WHERE name = 'Hot Towel Shave' AND barbershop_id = sample_barbershop_id;
    
    -- Get barber user ID
    SELECT id INTO barber_user_id FROM users WHERE email = 'barber@example.com';
    
    -- Only proceed if we have all the required IDs
    IF sample_barbershop_id IS NOT NULL AND barber_user_id IS NOT NULL AND classic_haircut_id IS NOT NULL THEN
        -- Create barber-specific services (Mike Barber - Expert level, slightly faster)
        INSERT INTO barber_services (barber_id, service_id, barbershop_id, duration_minutes, price, skill_level, specialty_notes)
        VALUES 
            (barber_user_id, classic_haircut_id, sample_barbershop_id, 25, 35.00, 'expert', 'Specializes in modern and classic styles'),
            (barber_user_id, beard_trim_id, sample_barbershop_id, 12, 20.00, 'expert', 'Master of beard sculpting and design'),
            (barber_user_id, premium_cut_id, sample_barbershop_id, 40, 55.00, 'expert', 'Complete styling experience with premium products'),
            (barber_user_id, shave_id, sample_barbershop_id, 25, 40.00, 'expert', 'Traditional straight razor techniques')
        ON CONFLICT (barber_id, service_id) DO NOTHING;
        
        -- Add staff relationship for the barber
        INSERT INTO barbershop_staff (barbershop_id, user_id, role, commission_rate, is_active)
        VALUES (sample_barbershop_id, barber_user_id, 'BARBER', 0.25, TRUE)
        ON CONFLICT (barbershop_id, user_id) DO NOTHING;
    END IF;
    
    -- Create a "no preference" option by having barbershop-level services available to any barber
    -- This allows customers to book without selecting a specific barber
END $$;

-- Grant all permissions to the database user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO agent_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO agent_user;
GRANT USAGE ON SCHEMA public TO agent_user;