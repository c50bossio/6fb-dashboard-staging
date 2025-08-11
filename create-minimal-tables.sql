-- Create minimal appointments and transactions tables for testing
-- This SQL can be run directly in Supabase SQL Editor

-- First, add the slug column to barbershops
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Update existing barbershops with slugs
UPDATE barbershops SET slug = 'elite-cuts' WHERE name = 'Elite Cuts Barbershop';
UPDATE barbershops SET slug = 'premium-cuts' WHERE name = 'Premium Cuts Barbershop';

-- Create appointments table (simplified)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    service_name VARCHAR(255),
    service_price DECIMAL(10, 2),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'arrived', 'in_progress', 
        'completed', 'cancelled', 'no_show', 'rescheduled'
    )),
    
    booking_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table (simplified)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL, -- 'service', 'product', 'tip', 'refund'
    amount DECIMAL(10, 2) NOT NULL,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    payment_method VARCHAR(50), -- 'cash', 'card', 'online'
    payment_status VARCHAR(50) DEFAULT 'completed',
    
    commission_rate DECIMAL(5, 2),
    commission_amount DECIMAL(10, 2),
    commission_paid BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
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

CREATE POLICY "Barbers can view their transactions" ON transactions
    FOR SELECT USING (auth.uid() = barber_id);

CREATE POLICY "Shop owners can view shop transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = transactions.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

-- Insert sample appointment data
INSERT INTO appointments (barbershop_id, barber_id, service_name, service_price, start_time, end_time, status, booking_notes)
SELECT 
    b.id as barbershop_id,
    bs.user_id as barber_id,
    'Classic Haircut' as service_name,
    25.00 as service_price,
    NOW() + INTERVAL '1 day' as start_time,
    NOW() + INTERVAL '1 day' + INTERVAL '30 minutes' as end_time,
    'confirmed' as status,
    'Walk-in customer' as booking_notes
FROM barbershops b
JOIN barbershop_staff bs ON bs.barbershop_id = b.id
WHERE b.name = 'Elite Cuts Barbershop'
LIMIT 1;

-- Insert sample transaction data
INSERT INTO transactions (barbershop_id, barber_id, type, amount, total_amount, payment_method, commission_rate, commission_amount)
SELECT 
    b.id as barbershop_id,
    bs.user_id as barber_id,
    'service' as type,
    25.00 as amount,
    25.00 as total_amount,
    'card' as payment_method,
    60.00 as commission_rate,
    15.00 as commission_amount
FROM barbershops b
JOIN barbershop_staff bs ON bs.barbershop_id = b.id
WHERE b.name = 'Elite Cuts Barbershop'
LIMIT 1;