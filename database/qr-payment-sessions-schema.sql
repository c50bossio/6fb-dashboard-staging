-- QR Payment Sessions Table
-- This table stores QR payment sessions for the POS system

CREATE TABLE IF NOT EXISTS qr_payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL, -- Stripe Checkout Session ID
    barbershop_id UUID NOT NULL,
    barber_id UUID,
    customer_id UUID,
    cart_items JSONB NOT NULL, -- Array of cart items with product details
    total_amount DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    application_fee DECIMAL(10,2) DEFAULT 0, -- Platform fee in dollars
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
    stripe_session_url TEXT NOT NULL, -- Stripe Checkout URL
    stripe_payment_intent_id TEXT, -- Populated when payment completes
    expires_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_qr_payment_sessions_barbershop 
        FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_payment_sessions_barber 
        FOREIGN KEY (barber_id) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_qr_payment_sessions_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_session_id ON qr_payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_barbershop_id ON qr_payment_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_status ON qr_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_created_at ON qr_payment_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_expires_at ON qr_payment_sessions(expires_at);

-- Updated trigger for automatic updated_at
CREATE OR REPLACE FUNCTION update_qr_payment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_qr_payment_sessions_updated_at ON qr_payment_sessions;
CREATE TRIGGER trigger_update_qr_payment_sessions_updated_at
    BEFORE UPDATE ON qr_payment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_payment_sessions_updated_at();

-- RLS Policies for security
ALTER TABLE qr_payment_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access sessions for their own barbershop
CREATE POLICY "Users can access QR sessions for their barbershop" ON qr_payment_sessions
    FOR ALL USING (
        barbershop_id IN (
            SELECT s.barbershop_id 
            FROM staff s 
            WHERE s.user_id = auth.uid()
        )
        OR 
        barbershop_id IN (
            SELECT b.id 
            FROM barbershops b 
            WHERE b.owner_id = auth.uid()
        )
    );

-- Policy: Service role can access all sessions
CREATE POLICY "Service role can access all QR sessions" ON qr_payment_sessions
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Add helpful comments
COMMENT ON TABLE qr_payment_sessions IS 'Stores QR payment sessions for POS system with Stripe integration';
COMMENT ON COLUMN qr_payment_sessions.session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN qr_payment_sessions.cart_items IS 'JSON array of cart items with product details';
COMMENT ON COLUMN qr_payment_sessions.application_fee IS 'Platform fee charged in dollars';
COMMENT ON COLUMN qr_payment_sessions.stripe_session_url IS 'Stripe Checkout URL for customer payment';

-- Function to cleanup expired sessions (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_qr_sessions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE qr_payment_sessions 
    SET status = 'expired', processed_at = NOW()
    WHERE status = 'pending' 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;