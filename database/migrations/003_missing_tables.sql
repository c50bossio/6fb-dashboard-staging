-- Migration: Add Missing Tables (appointments and transactions)
-- Date: 2025-01-11
-- 
-- This adds the appointments and transactions tables that were missing

-- ============================================
-- APPOINTMENTS TABLE
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
-- TRANSACTIONS TABLE
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
-- AVAILABILITY TEMPLATES TABLE (if missing)
-- ============================================
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
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one type of owner
    CONSTRAINT single_owner CHECK (
        (barbershop_id IS NOT NULL AND barber_id IS NULL) OR
        (barbershop_id IS NULL AND barber_id IS NOT NULL)
    )
);

-- ============================================
-- INDEXES
-- ============================================
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
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();