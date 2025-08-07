-- Bookings table schema for Supabase
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id TEXT NOT NULL,
    barber_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    service_type TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no-show')),
    notes TEXT,
    price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Indexes for performance
    INDEX idx_bookings_shop_id (shop_id),
    INDEX idx_bookings_barber_id (barber_id),
    INDEX idx_bookings_start_time (start_time),
    INDEX idx_bookings_status (status)
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see bookings for their shop
CREATE POLICY "Users can view bookings for their shop" ON bookings
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can create bookings for their shop
CREATE POLICY "Users can create bookings for their shop" ON bookings
    FOR INSERT WITH CHECK (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can update bookings for their shop
CREATE POLICY "Users can update bookings for their shop" ON bookings
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can delete bookings for their shop
CREATE POLICY "Users can delete bookings for their shop" ON bookings
    FOR DELETE USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();