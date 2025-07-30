-- Complete PostgreSQL Schema for 6FB AI Agent System
-- Combines barbershop management with AI agent functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

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

-- Services offered by barbershops
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL, -- Duration in minutes
  price DECIMAL(8,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(100), -- haircut, beard, styling, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  
  -- AI response metadata
  agent_name VARCHAR(100),
  recommendations JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2),
  
  -- RAG system data
  vector_embedding vector(1536), -- Voyage AI embeddings
  retrieval_sources JSONB DEFAULT '[]',
  
  -- Usage tracking
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent knowledge base for RAG
CREATE TABLE ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type ai_agent_type NOT NULL,
  category VARCHAR(100) NOT NULL, -- strategy, pricing, marketing, etc.
  
  -- Content
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Vector search
  vector_embedding vector(1536),
  
  -- Metadata
  tags VARCHAR(255)[],
  success_rate DECIMAL(3,2) DEFAULT 0.95, -- How successful this knowledge is
  usage_count INTEGER DEFAULT 0,
  
  -- Barbershop context
  business_type VARCHAR(50), -- solo, small_shop, enterprise
  revenue_range VARCHAR(50), -- starter, growth, established
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ANALYTICS AND REPORTING
-- ==========================================

-- Business analytics
CREATE TABLE business_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Time period
  date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  
  -- Revenue metrics
  total_revenue DECIMAL(10,2) DEFAULT 0,
  service_revenue DECIMAL(10,2) DEFAULT 0,
  tip_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Appointment metrics
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  
  -- Client metrics
  new_clients INTEGER DEFAULT 0,
  returning_clients INTEGER DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  
  -- AI usage metrics
  ai_conversations INTEGER DEFAULT 0,
  ai_recommendations_implemented INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, date, period_type)
);

-- AI Agent usage analytics
CREATE TABLE ai_usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE SET NULL,
  agent_type ai_agent_type NOT NULL,
  
  -- Usage metrics
  date DATE NOT NULL,
  conversations_started INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  recommendations_received INTEGER DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  
  -- Engagement metrics
  avg_session_duration_minutes DECIMAL(8,2) DEFAULT 0,
  satisfaction_rating DECIMAL(3,2), -- User feedback on AI responses
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, agent_type, date)
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

-- Vector similarity search indexes
CREATE INDEX idx_ai_messages_embedding ON ai_chat_messages USING ivfflat (vector_embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_embedding ON ai_knowledge_base USING ivfflat (vector_embedding vector_cosine_ops);

-- Analytics indexes
CREATE INDEX idx_business_analytics_shop_date ON business_analytics(barbershop_id, date);
CREATE INDEX idx_ai_usage_user_date ON ai_usage_analytics(user_id, date);

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
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON ai_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();