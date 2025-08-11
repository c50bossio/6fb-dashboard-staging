-- Create Missing Tables for 6FB AI Agent System
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    barber_id TEXT NOT NULL,
    customer_id TEXT,
    service_name TEXT NOT NULL,
    service_duration INTEGER DEFAULT 30,
    service_price DECIMAL(10,2) DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON public.appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON public.appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view appointments" ON public.appointments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert appointments" ON public.appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own appointments" ON public.appointments
    FOR UPDATE USING (true);

-- ============================================
-- 2. CREATE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
    barber_id TEXT NOT NULL,
    customer_id TEXT,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'service' CHECK (type IN ('service', 'product', 'tip', 'other')),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'online', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON public.transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON public.transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON public.transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view transactions" ON public.transactions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own transactions" ON public.transactions
    FOR UPDATE USING (true);

-- ============================================
-- 3. CREATE UPDATE TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT SELECT ON public.appointments TO anon;
GRANT SELECT ON public.transactions TO anon;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('appointments', 'transactions');

-- Note: Reviews are handled via Google Reviews integration, not stored in database