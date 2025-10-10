-- Production Database Setup for Supabase
-- This script sets up the complete 6FB AI Agent System database
-- Run this in Supabase SQL Editor or via CLI

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ==========================================
-- ENUMS AND TYPES
-- ==========================================

-- User Roles Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'CLIENT',
        'BARBER', 
        'SHOP_OWNER',
        'ENTERPRISE_OWNER',
        'SUPER_ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Appointment Status Enum
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
        'PENDING',
        'CONFIRMED',
        'COMPLETED', 
        'CANCELLED',
        'NO_SHOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Status Enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'PENDING',
        'COMPLETED',
        'FAILED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AI Agent Types Enum
DO $$ BEGIN
    CREATE TYPE ai_agent_type AS ENUM (
        'master_coach',
        'financial',
        'client_acquisition',
        'operations',
        'brand',
        'growth',
        'strategic_mindset'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AI Insight Types Enum
DO $$ BEGIN
    CREATE TYPE ai_insight_type AS ENUM (
        'revenue_opportunity',
        'customer_behavior', 
        'operational_efficiency',
        'marketing_insight',
        'scheduling_optimization',
        'performance_alert'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AI Insight Urgency Enum
DO $$ BEGIN
    CREATE TYPE ai_insight_urgency AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- CORE USER MANAGEMENT
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
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

-- Profiles table (for Supabase Auth compatibility)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(20),
    role user_role DEFAULT 'CLIENT',
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Business fields
    stripe_customer_id VARCHAR(255),
    stripe_account_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'trial',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_data JSONB DEFAULT '{}'
);

-- ==========================================
-- BARBERSHOP MANAGEMENT
-- ==========================================

-- Organizations (for enterprise owners)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbershops
CREATE TABLE IF NOT EXISTS barbershops (
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
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Services offered by barbershops
CREATE TABLE IF NOT EXISTS services (
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

-- Barbershop staff relationships
CREATE TABLE IF NOT EXISTS barbershop_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    commission_rate DECIMAL(5,4) DEFAULT 0.20, -- 20% default
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(barbershop_id, user_id)
);

-- ==========================================
-- APPOINTMENT MANAGEMENT
-- ==========================================

-- Customers table for non-registered users
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    notes TEXT,
    
    -- Customer preferences
    preferred_barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    communication_preferences JSONB DEFAULT '{"sms": true, "email": true}',
    
    -- Customer history
    first_visit DATE,
    last_visit DATE,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    
    -- Marketing preferences
    marketing_consent BOOLEAN DEFAULT FALSE,
    referral_source VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure at least email or phone is provided
    CONSTRAINT customers_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    
    -- Appointment details
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status appointment_status DEFAULT 'PENDING',
    
    -- Pricing
    service_price DECIMAL(8,2) NOT NULL,
    tip_amount DECIMAL(8,2) DEFAULT 0,
    total_amount DECIMAL(8,2) NOT NULL,
    
    -- Client information (for walk-ins/non-registered)
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_email VARCHAR(255),
    
    -- Notes and special requests
    client_notes TEXT,
    barber_notes TEXT,
    
    -- Booking details
    booking_source VARCHAR(50) DEFAULT 'online', -- online, phone, walk_in
    is_walk_in BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_status payment_status DEFAULT 'PENDING',
    transaction_id VARCHAR(255),
    
    -- Google Calendar integration
    google_calendar_event_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barber availability table
CREATE TABLE IF NOT EXISTS barber_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Availability schedule
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Break times within the day
    break_times JSONB DEFAULT '[]', -- Array of {start: "12:00", end: "13:00"}
    
    -- Availability status
    is_available BOOLEAN DEFAULT TRUE,
    max_concurrent_bookings INTEGER DEFAULT 1,
    
    -- Override for specific dates
    specific_date DATE, -- If set, this rule applies only to this date
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure end time is after start time
    CONSTRAINT availability_time_check CHECK (end_time > start_time),
    
    -- Unique constraint to prevent overlapping schedules
    UNIQUE(barber_id, day_of_week, specific_date, start_time, end_time)
);

-- ==========================================
-- PAYMENT AND TRANSACTIONS
-- ==========================================

-- Transactions for tracking payments and commissions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction details
    type VARCHAR(50) NOT NULL, -- service_payment, tip, commission, refund
    amount DECIMAL(8,2) NOT NULL,
    status payment_status DEFAULT 'PENDING',
    
    -- Payment method
    payment_method VARCHAR(50), -- cash, card, online
    stripe_payment_intent_id VARCHAR(255),
    
    -- Commission tracking
    commission_rate DECIMAL(5,4),
    commission_amount DECIMAL(8,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AI SYSTEM TABLES
-- ==========================================

-- AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    type ai_insight_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    impact_score DECIMAL(3,1) NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10),
    urgency ai_insight_urgency NOT NULL DEFAULT 'medium',
    data_points JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent Sessions
CREATE TABLE IF NOT EXISTS ai_agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    agent_type ai_agent_type NOT NULL,
    session_title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    context_data JSONB DEFAULT '{}',
    session_metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent Messages
CREATE TABLE IF NOT EXISTS ai_agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'agent')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================

-- Notification system
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- appointment, payment, system, marketing
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    action_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- User/Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Barbershop indexes
CREATE INDEX IF NOT EXISTS idx_barbershops_owner ON barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_shop ON barbershop_staff(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON barbershop_staff(user_id);

-- Service indexes
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Availability indexes
CREATE INDEX IF NOT EXISTS idx_availability_barber ON barber_availability(barber_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON barber_availability(day_of_week);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON transactions(barber_id);

-- AI indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_barbershop ON ai_insights(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_agent_sessions(user_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Barbershops policies
CREATE POLICY "Public can view barbershops" ON barbershops FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners can manage their barbershops" ON barbershops FOR ALL USING (auth.uid() = owner_id);

-- Services policies
CREATE POLICY "Public can view services" ON services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Shop owners can manage services" ON services 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = services.barbershop_id 
      AND barbershops.owner_id = auth.uid()
    )
  );

-- Appointments policies
CREATE POLICY "Users can view their appointments" ON appointments 
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = barber_id OR
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = appointments.barbershop_id 
      AND barbershops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create appointments" ON appointments 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Staff policies
CREATE POLICY "Staff can view barbershop staff" ON barbershop_staff 
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE barbershops.id = barbershop_staff.barbershop_id 
      AND barbershops.owner_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications 
  FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

-- Insert a confirmation record
DO $$
BEGIN
    RAISE NOTICE 'Database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: profiles, barbershops, services, appointments, customers, barber_availability, transactions, ai_insights, ai_agent_sessions, ai_agent_messages, notifications';
    RAISE NOTICE 'RLS policies enabled and configured';
    RAISE NOTICE 'Performance indexes created';
    RAISE NOTICE 'Ready for production use!';
END $$;