-- ============================================================================
-- 6FB AI Agent System - Production Database Deployment Script
-- ============================================================================
-- This script deploys the complete database schema to production Supabase
-- Run this script in your Supabase SQL editor for production deployment
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- CORE AUTHENTICATION & USERS
-- ============================================================================

-- User profiles table with comprehensive business data
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'barber', 'shop_owner', 'admin')),
    
    -- Business specific fields
    shop_id UUID,
    barber_specialties TEXT[],
    years_experience INTEGER,
    certifications TEXT[],
    bio TEXT,
    
    -- Profile customization
    avatar_url TEXT,
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT false,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    
    -- Metadata
    onboarding_completed BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SHOP MANAGEMENT
-- ============================================================================

-- Shops/Barbershops table
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Location
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Business hours (JSON format)
    business_hours JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Branding
    logo_url TEXT,
    banner_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1F2937',
    
    -- Settings
    booking_buffer_minutes INTEGER DEFAULT 15,
    max_advance_booking_days INTEGER DEFAULT 60,
    cancellation_hours INTEGER DEFAULT 24,
    
    -- Features
    features TEXT[] DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SERVICES & PRICING
-- ============================================================================

-- Services offered by shops
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Service details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- Barber-specific pricing
    barber_pricing JSONB DEFAULT '{}', -- { barber_id: price }
    
    -- Settings
    requires_consultation BOOLEAN DEFAULT false,
    is_addon BOOLEAN DEFAULT false,
    max_clients INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STAFF & BARBER MANAGEMENT
-- ============================================================================

-- Staff members (barbers, assistants, etc.)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Employment details
    role VARCHAR(50) DEFAULT 'barber' CHECK (role IN ('barber', 'assistant', 'manager', 'owner')),
    employment_type VARCHAR(50) DEFAULT 'employee' CHECK (employment_type IN ('employee', 'contractor', 'booth_renter')),
    
    -- Schedule
    default_schedule JSONB DEFAULT '{}',
    hourly_rate DECIMAL(10, 2),
    commission_rate DECIMAL(5, 4) DEFAULT 0.6000, -- 60%
    booth_rent DECIMAL(10, 2),
    
    -- Settings
    accepts_walk_ins BOOLEAN DEFAULT true,
    max_daily_bookings INTEGER DEFAULT 20,
    break_duration_minutes INTEGER DEFAULT 30,
    
    -- Specialties and services
    service_ids UUID[],
    specialties TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    hire_date DATE DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CUSTOMER MANAGEMENT
-- ============================================================================

-- Customer profiles (extends profiles for customers)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Preferences
    preferred_barber_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    preferred_services UUID[],
    
    -- Customer data
    hair_type VARCHAR(100),
    skin_type VARCHAR(100),
    allergies TEXT[],
    notes TEXT,
    
    -- Loyalty program
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    last_visit DATE,
    
    -- Marketing preferences
    birthday DATE,
    referral_source VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENT SYSTEM
-- ============================================================================

-- Appointments and bookings
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Related entities
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    service_ids UUID[] NOT NULL,
    
    -- Scheduling
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed', 
        'cancelled', 'no_show', 'rescheduled'
    )),
    
    -- Customer information (for walk-ins or non-registered customers)
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Pricing
    total_price DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2) DEFAULT 0.00,
    tip_amount DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Additional details
    notes TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    
    -- Notifications
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    booking_source VARCHAR(50) DEFAULT 'online', -- online, phone, walk_in, admin
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT SYSTEM
-- ============================================================================

-- Payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Related entities
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(50) DEFAULT 'service' CHECK (payment_type IN (
        'service', 'deposit', 'tip', 'product', 'gift_card', 'refund'
    )),
    
    -- Payment method
    payment_method VARCHAR(50) CHECK (payment_method IN (
        'card', 'cash', 'digital_wallet', 'bank_transfer', 'gift_card'
    )),
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_refund_id VARCHAR(255),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'
    )),
    
    -- Commission tracking
    barber_amount DECIMAL(10, 2) DEFAULT 0.00,
    shop_amount DECIMAL(10, 2) DEFAULT 0.00,
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY MANAGEMENT
-- ============================================================================

-- Product inventory
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    
    -- Product details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(255),
    category VARCHAR(100),
    sku VARCHAR(100),
    barcode VARCHAR(100),
    
    -- Inventory tracking
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    max_stock INTEGER DEFAULT 100,
    unit_cost DECIMAL(10, 2),
    retail_price DECIMAL(10, 2),
    
    -- Supplier information
    supplier_name VARCHAR(255),
    supplier_contact TEXT,
    
    -- Settings
    track_inventory BOOLEAN DEFAULT true,
    is_sellable BOOLEAN DEFAULT true,
    is_service_item BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AI AGENT SYSTEM
-- ============================================================================

-- AI agents configuration
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Agent details
    name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Configuration
    system_prompt TEXT,
    model_provider VARCHAR(50) DEFAULT 'openai',
    model_name VARCHAR(100) DEFAULT 'gpt-4',
    temperature DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    
    -- Capabilities
    capabilities TEXT[],
    knowledge_domains TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    version VARCHAR(50) DEFAULT '1.0.0',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base for RAG system
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Content details
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'document',
    source VARCHAR(255),
    category VARCHAR(100),
    
    -- Vector embeddings for RAG
    embedding vector(1536),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent interactions log
CREATE TABLE IF NOT EXISTS agent_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Related entities
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    
    -- Interaction details
    session_id UUID,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    confidence_score DECIMAL(3, 2),
    
    -- Performance metrics
    response_time_ms INTEGER,
    tokens_used INTEGER,
    
    -- Context
    context JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template details
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- sms, email, push
    event_trigger VARCHAR(100) NOT NULL, -- appointment_booked, appointment_reminder, etc.
    
    -- Content
    subject VARCHAR(255),
    template_body TEXT NOT NULL,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    send_delay_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification queue
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Recipients
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification details
    type VARCHAR(50) NOT NULL, -- sms, email, push
    title VARCHAR(255),
    message TEXT NOT NULL,
    
    -- Delivery settings
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'failed', 'cancelled'
    )),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

-- Business analytics data
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    
    -- Related entities
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    
    -- Event data
    properties JSONB DEFAULT '{}',
    
    -- Tracking
    session_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User and profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_shop_id ON profiles(shop_id);

-- Shop indexes
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON shops(is_active);

-- Service indexes
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_shop_id ON staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_preferred_barber_id ON customers(preferred_barber_id);

-- Appointment indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON appointments(staff_id, appointment_date);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);

-- AI system indexes
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent_id ON agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_session ON agent_interactions(session_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_shop_id ON analytics_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles policy - users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR ALL USING (auth.uid() = user_id);

-- Shops policy - shop owners and staff can access their shop data
CREATE POLICY "Shop access policy" ON shops
    FOR ALL USING (
        owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR id IN (SELECT shop_id FROM staff s JOIN profiles p ON s.profile_id = p.id WHERE p.user_id = auth.uid())
    );

-- Services policy - follows shop access
CREATE POLICY "Services access policy" ON services
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            OR id IN (SELECT shop_id FROM staff s JOIN profiles p ON s.profile_id = p.id WHERE p.user_id = auth.uid())
        )
    );

-- Staff policy - staff can see their own data and shop owners can see their staff
CREATE POLICY "Staff access policy" ON staff
    FOR ALL USING (
        profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR shop_id IN (SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

-- Customers policy - customers can see their own data, staff can see customers in their shop
CREATE POLICY "Customers access policy" ON customers
    FOR ALL USING (
        profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM staff s 
            JOIN profiles p ON s.profile_id = p.id 
            WHERE p.user_id = auth.uid()
        )
    );

-- Appointments policy - customers see their appointments, staff see shop appointments
CREATE POLICY "Appointments access policy" ON appointments
    FOR ALL USING (
        customer_id = (SELECT c.id FROM customers c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid())
        OR staff_id IN (SELECT s.id FROM staff s JOIN profiles p ON s.profile_id = p.id WHERE p.user_id = auth.uid())
        OR shop_id IN (SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

-- Payments policy - follows appointment access
CREATE POLICY "Payments access policy" ON payments
    FOR ALL USING (
        customer_id = (SELECT c.id FROM customers c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid())
        OR shop_id IN (
            SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            OR id IN (SELECT shop_id FROM staff s JOIN profiles p ON s.profile_id = p.id WHERE p.user_id = auth.uid())
        )
    );

-- Inventory policy - follows shop access
CREATE POLICY "Inventory access policy" ON inventory
    FOR ALL USING (
        shop_id IN (
            SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            OR id IN (SELECT shop_id FROM staff s JOIN profiles p ON s.profile_id = p.id WHERE p.user_id = auth.uid())
        )
    );

-- AI agents policy - all authenticated users can access
CREATE POLICY "Agents access policy" ON agents
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Knowledge base policy - all authenticated users can read
CREATE POLICY "Knowledge base access policy" ON knowledge_base
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Agent interactions policy - users can see their own interactions
CREATE POLICY "Agent interactions access policy" ON agent_interactions
    FOR ALL USING (
        user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR shop_id IN (SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

-- Notifications policy - users can see their own notifications
CREATE POLICY "Notifications access policy" ON notifications
    FOR ALL USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Analytics policy - shop owners can see their shop analytics
CREATE POLICY "Analytics access policy" ON analytics_events
    FOR ALL USING (
        user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR shop_id IN (SELECT id FROM shops WHERE owner_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEFAULT DATA INSERTION
-- ============================================================================

-- Insert default AI agents
INSERT INTO agents (name, agent_type, description, system_prompt, capabilities, knowledge_domains) VALUES
('Marcus - Master Business Coach', 'master_coach', 'Strategic business coaching and leadership development', 
 'You are Marcus, a master business coach specializing in the Six Figure Barber methodology. Provide strategic guidance, leadership development, and business growth advice.',
 ARRAY['strategic_planning', 'leadership_coaching', 'business_growth', 'team_management'],
 ARRAY['business_strategy', 'leadership', 'six_figure_barber_methodology']
),
('Sophia - Technical Operations Expert', 'technical_operations', 'Technical operations and system optimization',
 'You are Sophia, a technical operations expert. Help optimize business processes, implement systems, and improve operational efficiency.',
 ARRAY['process_optimization', 'system_implementation', 'efficiency_analysis', 'workflow_design'],
 ARRAY['operations', 'technology', 'process_improvement']
),
('David - Customer Success Specialist', 'customer_success', 'Customer retention and relationship management',
 'You are David, a customer success specialist. Focus on customer retention strategies, relationship building, and client satisfaction.',
 ARRAY['customer_retention', 'relationship_management', 'satisfaction_analysis', 'loyalty_programs'],
 ARRAY['customer_service', 'retention_strategies', 'client_relationships']
),
('Emma - Marketing Strategist', 'marketing', 'Marketing strategies and customer acquisition',
 'You are Emma, a marketing strategist. Develop marketing campaigns, social media strategies, and customer acquisition plans.',
 ARRAY['marketing_campaigns', 'social_media', 'customer_acquisition', 'brand_development'],
 ARRAY['marketing', 'social_media', 'brand_building', 'customer_acquisition']
),
('Alex - Financial Analyst', 'financial', 'Financial analysis and profit optimization',
 'You are Alex, a financial analyst. Provide financial insights, profit optimization strategies, and business metrics analysis.',
 ARRAY['financial_analysis', 'profit_optimization', 'metrics_analysis', 'cost_management'],
 ARRAY['finance', 'analytics', 'profit_optimization', 'business_metrics']
)
ON CONFLICT DO NOTHING;

-- Insert Six Figure Barber methodology knowledge
INSERT INTO knowledge_base (title, content, content_type, source, category, tags) VALUES
('Six Figure Barber Core Philosophy', 
 'The Six Figure Barber methodology is built on transforming traditional barbershops into premium, profitable businesses through strategic pricing, exceptional service delivery, and operational excellence. The foundation is treating barbering as a skilled profession deserving of premium compensation.',
 'methodology', 'six_figure_barber_system', 'business_strategy',
 ARRAY['six_figure_barber', 'business_strategy', 'premium_pricing']
),
('Premium Pricing Framework',
 'Implement value-based pricing that reflects skill level, service quality, and client experience. Foundation level: $35-50, Professional level: $50-75, Master level: $75-125+. Move away from competitive pricing to premium positioning through service differentiation.',
 'methodology', 'six_figure_barber_system', 'pricing',
 ARRAY['pricing', 'value_pricing', 'service_levels']
),
('Client Experience Excellence',
 'Create memorable experiences that justify premium pricing and drive customer loyalty. Focus on every touchpoint: professional appearance, warm greetings, comfortable environment, thorough consultation, skilled execution, quality finish, and follow-up care.',
 'methodology', 'six_figure_barber_system', 'customer_experience',
 ARRAY['customer_experience', 'service_excellence', 'client_retention']
)
ON CONFLICT DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (name, type, event_trigger, subject, template_body) VALUES
('Appointment Confirmation', 'email', 'appointment_booked', 'Appointment Confirmed',
 'Hi {{customer_name}}, your appointment with {{barber_name}} on {{appointment_date}} at {{appointment_time}} has been confirmed. Service: {{services}}. Total: {{total_price}}. See you soon!'
),
('Appointment Reminder', 'sms', 'appointment_reminder', NULL,
 'Reminder: You have an appointment with {{barber_name}} tomorrow at {{appointment_time}}. Reply CONFIRM to confirm or call {{shop_phone}} to reschedule.'
),
('Appointment Cancellation', 'email', 'appointment_cancelled', 'Appointment Cancelled',
 'Your appointment on {{appointment_date}} at {{appointment_time}} has been cancelled. {{cancellation_reason}}. Book again anytime at {{booking_url}}.'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Production database deployment completed successfully!' as status,
       NOW() as deployed_at,
       COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';