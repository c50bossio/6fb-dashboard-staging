-- 6FB AI Agent System - Calendar Database Setup
-- Production-ready schema with all necessary tables for appointment booking

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create barbershops table (multi-tenant support)
CREATE TABLE IF NOT EXISTS barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'US',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    business_hours JSONB DEFAULT '{"monday":{"open":"09:00","close":"18:00","closed":false},"tuesday":{"open":"09:00","close":"18:00","closed":false},"wednesday":{"open":"09:00","close":"18:00","closed":false},"thursday":{"open":"09:00","close":"18:00","closed":false},"friday":{"open":"09:00","close":"18:00","closed":false},"saturday":{"open":"09:00","close":"18:00","closed":false},"sunday":{"open":"10:00","close":"17:00","closed":true}}',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barbers table
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    skills TEXT[],
    hourly_rate DECIMAL(10,2),
    commission_rate DECIMAL(5,2) DEFAULT 50.00,
    hire_date DATE,
    schedule JSONB DEFAULT '{"monday":{"available":true,"start":"09:00","end":"18:00","breaks":[{"start":"12:00","end":"13:00","type":"lunch"}]},"tuesday":{"available":true,"start":"09:00","end":"18:00","breaks":[{"start":"12:00","end":"13:00","type":"lunch"}]},"wednesday":{"available":true,"start":"09:00","end":"18:00","breaks":[{"start":"12:00","end":"13:00","type":"lunch"}]},"thursday":{"available":true,"start":"09:00","end":"18:00","breaks":[{"start":"12:00","end":"13:00","type":"lunch"}]},"friday":{"available":true,"start":"09:00","end":"18:00","breaks":[{"start":"12:00","end":"13:00","type":"lunch"}]},"saturday":{"available":true,"start":"09:00","end":"18:00","breaks":[]},"sunday":{"available":false,"start":"10:00","end":"17:00","breaks":[]}}',
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes >= 15 AND duration_minutes <= 480),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100),
    requires_consultation BOOLEAN DEFAULT false,
    deposit_required BOOLEAN DEFAULT false,
    deposit_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table for customer management
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    preferences JSONB DEFAULT '{}',
    notes TEXT,
    last_visit_date DATE,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table (main booking table)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Booking details
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    end_time TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (scheduled_at + INTERVAL '1 minute' * duration_minutes) STORED,
    
    -- Customer information (for walk-ins or guests)
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_email VARCHAR(255),
    client_notes TEXT,
    
    -- Pricing
    service_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tip_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (service_price + COALESCE(tip_amount, 0)) STORED,
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    booking_source VARCHAR(50) DEFAULT 'online',
    confirmation_code VARCHAR(10),
    reminder_sent BOOLEAN DEFAULT false,
    is_walk_in BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    
    -- Recurrence support
    recurrence_rule TEXT, -- RRULE format for recurring appointments
    parent_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Payment tracking
    payment_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
    payment_method VARCHAR(50),
    payment_intent_id TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no overlapping appointments for the same barber
    CONSTRAINT no_barber_overlap EXCLUDE USING gist (
        barber_id WITH =,
        tsrange(scheduled_at, scheduled_at + INTERVAL '1 minute' * duration_minutes, '[)') WITH &&
    ) WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'))
);

-- Create appointment_history table for tracking changes
CREATE TABLE IF NOT EXISTS appointment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'cancelled', 'completed', etc.
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create barber_availability table for special availability/unavailability
CREATE TABLE IF NOT EXISTS barber_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN NOT NULL DEFAULT true,
    reason VARCHAR(255),
    recurring BOOLEAN DEFAULT false,
    recurring_pattern VARCHAR(50), -- 'weekly', 'daily', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_preferences table for customer preferences
CREATE TABLE IF NOT EXISTS booking_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    preferred_barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
    preferred_services UUID[],
    preferred_times JSONB, -- {"monday": ["09:00", "10:00"], "friday": ["14:00"]}
    reminder_preferences JSONB DEFAULT '{"email": true, "sms": false, "hours_before": 24}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(DATE(scheduled_at));

CREATE INDEX IF NOT EXISTS idx_barbers_barbershop_id ON barbers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON clients(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_preferences ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on your auth requirements)
CREATE POLICY "Public read access for barbershops" ON barbershops FOR SELECT TO public USING (true);
CREATE POLICY "Public read access for barbers" ON barbers FOR SELECT TO public USING (true);  
CREATE POLICY "Public read access for services" ON services FOR SELECT TO public USING (true);

-- Authenticated users can manage their data
CREATE POLICY "Users can manage their appointments" ON appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage clients" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage availability" ON barber_availability FOR ALL TO authenticated USING (true);

-- Comments for documentation
COMMENT ON TABLE barbershops IS 'Multi-tenant barbershop locations';
COMMENT ON TABLE barbers IS 'Individual barbers/stylists working at barbershops';
COMMENT ON TABLE services IS 'Services offered by barbershops with pricing and duration';
COMMENT ON TABLE clients IS 'Customer/client records with preferences and history';
COMMENT ON TABLE appointments IS 'Main appointment booking table with full business logic';
COMMENT ON TABLE appointment_history IS 'Audit trail for appointment changes';
COMMENT ON TABLE barber_availability IS 'Special availability overrides for barbers';
COMMENT ON TABLE booking_preferences IS 'Customer booking preferences and defaults';