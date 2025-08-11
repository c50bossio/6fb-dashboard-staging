-- Migration: Core Tables for 6FB AI Agent System
-- Description: Creates essential tables for barbershop operations
-- Author: System
-- Date: 2025-01-11
-- 
-- This migration creates the core tables needed for the system to function.
-- It consolidates the best parts of multiple schema files into one canonical version.
-- Reviews will be handled via Google Business Profile API, not stored internally.

-- ============================================
-- 1. BARBERSHOPS TABLE (Foundation)
-- ============================================
CREATE TABLE IF NOT EXISTS barbershops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE, -- URL-friendly name for routing
    custom_domain VARCHAR(255), -- Custom domain if they have one
    
    -- Location Details
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Business Details
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    opening_hours JSONB DEFAULT '{}', -- {monday: {open: "9:00", close: "18:00"}, ...}
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Google Integration
    google_business_profile_id VARCHAR(255), -- For fetching Google Reviews
    google_maps_url TEXT,
    
    -- Social Media
    social_links JSONB DEFAULT '{}', -- {instagram: "url", facebook: "url", ...}
    
    -- Ownership
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Settings
    booking_enabled BOOLEAN DEFAULT true,
    online_booking BOOLEAN DEFAULT true,
    walk_ins_accepted BOOLEAN DEFAULT true,
    
    -- Metrics (cached for performance)
    total_clients INTEGER DEFAULT 0,
    monthly_revenue DECIMAL(10, 2) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0, -- Average from Google Reviews
    total_reviews INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Service Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'haircut', 'beard', 'color', 'treatment', etc.
    
    -- Pricing & Duration
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    online_booking_enabled BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_service_per_shop UNIQUE(barbershop_id, name)
);

-- ============================================
-- 3. CUSTOMERS TABLE
-- ============================================
-- For both registered users and walk-in customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Customer Information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If registered
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE, -- Primary shop
    
    -- Contact Details (for non-registered customers)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Preferences
    preferred_barber_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    
    -- Communication Preferences
    communication_preferences JSONB DEFAULT '{"sms": true, "email": true, "marketing": false}',
    
    -- Customer History
    first_visit DATE,
    last_visit DATE,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    
    -- Marketing
    referral_source VARCHAR(100),
    referral_code VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either user_id or contact info is provided
    CONSTRAINT customer_identification CHECK (
        user_id IS NOT NULL OR 
        (email IS NOT NULL OR phone IS NOT NULL)
    )
);

-- ============================================
-- 4. APPOINTMENTS TABLE (Unified)
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core Relationships
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    -- Appointment Details
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Service Details (denormalized for history)
    service_name VARCHAR(255),
    service_price DECIMAL(10, 2),
    
    -- Status Management
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'arrived', 'in_progress', 
        'completed', 'cancelled', 'no_show', 'rescheduled'
    )),
    
    -- Booking Information
    booking_source VARCHAR(50) DEFAULT 'online', -- online, phone, walk_in, app
    booking_notes TEXT,
    internal_notes TEXT, -- Staff-only notes
    
    -- Cancellation/Rescheduling
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,
    rescheduled_from UUID REFERENCES appointments(id),
    
    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Transaction Details
    type VARCHAR(50) NOT NULL, -- 'service', 'product', 'tip', 'refund'
    amount DECIMAL(10, 2) NOT NULL,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Payment Information
    payment_method VARCHAR(50), -- 'cash', 'card', 'online', 'app'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Commission Tracking
    commission_rate DECIMAL(5, 2), -- Percentage for barber
    commission_amount DECIMAL(10, 2), -- Amount owed to barber
    commission_paid BOOLEAN DEFAULT false,
    commission_paid_date DATE,
    
    -- External References
    stripe_payment_id VARCHAR(255),
    stripe_refund_id VARCHAR(255),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. AVAILABILITY TEMPLATES TABLE
-- ============================================
-- Default working hours for barbershops and barbers
CREATE TABLE IF NOT EXISTS availability_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Owner of this template
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Template Details
    name VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    
    -- Schedule (JSONB for flexibility)
    schedule JSONB NOT NULL DEFAULT '{}',
    /* Example schedule format:
    {
        "monday": {"start": "09:00", "end": "18:00", "breaks": [{"start": "12:00", "end": "13:00"}]},
        "tuesday": {"start": "09:00", "end": "18:00", "breaks": []},
        ...
        "sunday": null // Closed
    }
    */
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one type of owner
    CONSTRAINT single_owner CHECK (
        (barbershop_id IS NOT NULL AND barber_id IS NULL) OR
        (barbershop_id IS NULL AND barber_id IS NOT NULL)
    )
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON barbershops(slug);
CREATE INDEX IF NOT EXISTS idx_barbershops_owner ON barbershops(owner_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_active ON barbershops(is_active);

CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_barbershop ON customers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;

-- Barbershops Policies
CREATE POLICY "Public can view active barbershops" ON barbershops
    FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage their barbershops" ON barbershops
    FOR ALL USING (auth.uid() = owner_id);

-- Services Policies
CREATE POLICY "Public can view active services" ON services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Shop owners can manage services" ON services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = services.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

-- Appointments Policies
CREATE POLICY "Users can view their appointments" ON appointments
    FOR SELECT USING (
        auth.uid() = barber_id OR
        EXISTS (
            SELECT 1 FROM customers 
            WHERE customers.id = appointments.customer_id 
            AND customers.user_id = auth.uid()
        )
    );

CREATE POLICY "Barbers can manage their appointments" ON appointments
    FOR ALL USING (auth.uid() = barber_id);

CREATE POLICY "Shop owners can view shop appointments" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = appointments.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

-- Transactions Policies
CREATE POLICY "Shop owners can view shop transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = transactions.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

CREATE POLICY "Barbers can view their transactions" ON transactions
    FOR SELECT USING (auth.uid() = barber_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Note: Reviews are fetched from Google Business Profile API
-- No internal review table is needed