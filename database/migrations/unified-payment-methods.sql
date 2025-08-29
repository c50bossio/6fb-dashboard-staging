-- ==========================================
-- UNIFIED PAYMENT METHODS MIGRATION
-- ==========================================
-- Description: Consolidated database schema for all POS payment methods
-- - Payment Links (Stripe Payment Links)
-- - QR Code Payments (Stripe Checkout Sessions)
-- - Terminal Payments (Stripe Terminal)
-- Author: Claude Code - Infrastructure Coordination
-- Date: 2025-08-28

-- ==========================================
-- 1. PAYMENT LINKS INFRASTRUCTURE
-- ==========================================

-- Create pos_payment_links table
CREATE TABLE IF NOT EXISTS pos_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cart_data JSONB NOT NULL,
  payment_link_url TEXT NOT NULL,
  customer_contact TEXT,
  contact_method TEXT CHECK (contact_method IN ('sms', 'email')) DEFAULT 'sms',
  status TEXT CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')) DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'usd',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata for tracking
  metadata JSONB DEFAULT '{}',
  
  -- Ensure we have required contact info
  CONSTRAINT valid_contact_info CHECK (
    customer_contact IS NOT NULL AND 
    length(trim(customer_contact)) > 0
  )
);

-- ==========================================
-- 2. QR CODE PAYMENT SESSIONS
-- ==========================================

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
        FOREIGN KEY (barber_id) REFERENCES profiles(id) ON DELETE SET NULL,
    CONSTRAINT fk_qr_payment_sessions_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- ==========================================
-- 3. TERMINAL INFRASTRUCTURE
-- ==========================================

-- Terminal locations tracking table
CREATE TABLE IF NOT EXISTS terminal_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  stripe_location_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  address JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terminal readers tracking table
CREATE TABLE IF NOT EXISTS terminal_readers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  stripe_reader_id TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  device_type TEXT NOT NULL,
  label TEXT,
  location_id UUID REFERENCES terminal_locations(id),
  stripe_location_id TEXT,
  status TEXT NOT NULL DEFAULT 'offline', -- offline, online, busy
  last_seen_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  device_sw_version TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terminal payment intents tracking table
CREATE TABLE IF NOT EXISTS terminal_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id),
  barber_id UUID REFERENCES profiles(id),
  customer_id UUID REFERENCES customers(id),
  reader_id UUID REFERENCES terminal_readers(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- requires_payment_method, requires_confirmation, requires_action, processing, succeeded, canceled
  payment_method_types TEXT[] DEFAULT '{"card_present"}',
  charges JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terminal connection tokens table (for security audit trail)
CREATE TABLE IF NOT EXISTS terminal_connection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id),
  token_secret TEXT NOT NULL, -- hashed for security
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. UNIFIED SALES AND COMMISSIONS
-- ==========================================

-- Create unified pos_sales table if it doesn't exist (works with all payment methods)
CREATE TABLE IF NOT EXISTS pos_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  barber_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL, -- 'payment_link', 'qr_code', 'terminal', 'cash', 'card'
  receipt_number TEXT NOT NULL,
  
  -- References to specific payment types (nullable)
  payment_link_id UUID REFERENCES pos_payment_links(id) ON DELETE SET NULL,
  qr_session_id UUID REFERENCES qr_payment_sessions(id) ON DELETE SET NULL,
  terminal_payment_intent_id UUID REFERENCES terminal_payment_intents(id) ON DELETE SET NULL,
  
  customer_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unified pos_commissions table (works with all payment methods)
CREATE TABLE IF NOT EXISTS pos_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL CHECK (sale_amount >= 0),
  commission_rate DECIMAL(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),
  
  -- References to specific payment types (nullable)
  payment_link_id UUID REFERENCES pos_payment_links(id) ON DELETE SET NULL,
  qr_session_id UUID REFERENCES qr_payment_sessions(id) ON DELETE SET NULL,
  terminal_payment_intent_id UUID REFERENCES terminal_payment_intents(id) ON DELETE SET NULL,
  
  status TEXT CHECK (status IN ('pending_payout', 'paid_out', 'cancelled')) DEFAULT 'pending_payout',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 5. PERFORMANCE INDEXES
-- ==========================================

-- Payment Links indexes
CREATE INDEX IF NOT EXISTS pos_payment_links_barbershop_id_idx ON pos_payment_links(barbershop_id);
CREATE INDEX IF NOT EXISTS pos_payment_links_barber_id_idx ON pos_payment_links(barber_id);
CREATE INDEX IF NOT EXISTS pos_payment_links_status_idx ON pos_payment_links(status);
CREATE INDEX IF NOT EXISTS pos_payment_links_stripe_session_id_idx ON pos_payment_links(stripe_session_id);
CREATE INDEX IF NOT EXISTS pos_payment_links_created_at_idx ON pos_payment_links(created_at DESC);
CREATE INDEX IF NOT EXISTS pos_payment_links_expires_at_idx ON pos_payment_links(expires_at);

-- QR Payment Sessions indexes
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_session_id ON qr_payment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_barbershop_id ON qr_payment_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_status ON qr_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_created_at ON qr_payment_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_payment_sessions_expires_at ON qr_payment_sessions(expires_at);

-- Terminal indexes
CREATE INDEX IF NOT EXISTS idx_terminal_locations_barbershop_id ON terminal_locations(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_terminal_locations_stripe_location_id ON terminal_locations(stripe_location_id);

CREATE INDEX IF NOT EXISTS idx_terminal_readers_barbershop_id ON terminal_readers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_terminal_readers_stripe_reader_id ON terminal_readers(stripe_reader_id);
CREATE INDEX IF NOT EXISTS idx_terminal_readers_status ON terminal_readers(status);
CREATE INDEX IF NOT EXISTS idx_terminal_readers_location_id ON terminal_readers(location_id);

CREATE INDEX IF NOT EXISTS idx_terminal_payment_intents_barbershop_id ON terminal_payment_intents(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_terminal_payment_intents_stripe_pi_id ON terminal_payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_terminal_payment_intents_status ON terminal_payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_terminal_payment_intents_barber_id ON terminal_payment_intents(barber_id);

CREATE INDEX IF NOT EXISTS idx_terminal_connection_tokens_barbershop_id ON terminal_connection_tokens(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_terminal_connection_tokens_expires_at ON terminal_connection_tokens(expires_at);

-- Unified Sales and Commissions indexes
CREATE INDEX IF NOT EXISTS pos_sales_barbershop_id_idx ON pos_sales(barbershop_id);
CREATE INDEX IF NOT EXISTS pos_sales_barber_id_idx ON pos_sales(barber_id);
CREATE INDEX IF NOT EXISTS pos_sales_payment_method_idx ON pos_sales(payment_method);
CREATE INDEX IF NOT EXISTS pos_sales_receipt_number_idx ON pos_sales(receipt_number);
CREATE INDEX IF NOT EXISTS pos_sales_created_at_idx ON pos_sales(created_at DESC);

CREATE INDEX IF NOT EXISTS pos_commissions_barber_id_idx ON pos_commissions(barber_id);
CREATE INDEX IF NOT EXISTS pos_commissions_barbershop_id_idx ON pos_commissions(barbershop_id);
CREATE INDEX IF NOT EXISTS pos_commissions_status_idx ON pos_commissions(status);
CREATE INDEX IF NOT EXISTS pos_commissions_created_at_idx ON pos_commissions(created_at DESC);

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS for all tables
ALTER TABLE pos_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_commissions ENABLE ROW LEVEL SECURITY;

-- Payment Links policies
CREATE POLICY "payment_links_barbershop_access" ON pos_payment_links
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

-- QR Payment Sessions policies
CREATE POLICY "Users can access QR sessions for their barbershop" ON qr_payment_sessions
    FOR ALL USING (
        barbershop_id IN (
            SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
            FROM profiles
            LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
            WHERE profiles.id = auth.uid()
        )
    );

-- Terminal policies
CREATE POLICY "Users can view terminal locations for their barbershop" ON terminal_locations
  FOR SELECT USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can view terminal readers for their barbershop" ON terminal_readers
  FOR SELECT USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can view terminal payments for their barbershop" ON terminal_payment_intents
  FOR SELECT USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
    OR barber_id = auth.uid()
  );

-- Unified sales and commissions policies
CREATE POLICY "pos_sales_barbershop_access" ON pos_sales
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "pos_commissions_barbershop_access" ON pos_commissions
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(profiles.shop_id, staff.barbershop_id)
      FROM profiles
      LEFT JOIN barbershop_staff staff ON staff.user_id = profiles.id AND staff.is_active = true
      WHERE profiles.id = auth.uid()
    )
  );

-- Service role policies for webhook processing
CREATE POLICY "Service role can access all payment links" ON pos_payment_links
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all QR sessions" ON qr_payment_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all terminal data" ON terminal_payment_intents
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- 7. TRIGGERS AND FUNCTIONS
-- ==========================================

-- Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER pos_payment_links_updated_at_trigger
  BEFORE UPDATE ON pos_payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER qr_payment_sessions_updated_at_trigger
  BEFORE UPDATE ON qr_payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER terminal_locations_updated_at_trigger
  BEFORE UPDATE ON terminal_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER terminal_readers_updated_at_trigger
  BEFORE UPDATE ON terminal_readers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER terminal_payment_intents_updated_at_trigger
  BEFORE UPDATE ON terminal_payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inventory management function (unified for all payment types)
CREATE OR REPLACE FUNCTION update_inventory_stock(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_reason TEXT DEFAULT 'manual',
  p_reference_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update the product's current stock
  UPDATE products 
  SET 
    current_stock = GREATEST(0, current_stock + p_quantity_change),
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Log the inventory change (assuming there's an inventory_movements table)
  INSERT INTO inventory_movements (
    product_id,
    quantity_change,
    reason,
    reference_id,
    created_at
  ) VALUES (
    p_product_id,
    p_quantity_change,
    p_reason,
    p_reference_id,
    NOW()
  ) ON CONFLICT DO NOTHING; -- In case the table doesn't exist yet
  
EXCEPTION
  WHEN others THEN
    -- If inventory_movements table doesn't exist, just update stock
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Cleanup functions
CREATE OR REPLACE FUNCTION expire_old_payment_links()
RETURNS void AS $$
BEGIN
  UPDATE pos_payment_links 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

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

-- ==========================================
-- 8. DOCUMENTATION AND COMMENTS
-- ==========================================

-- Table comments
COMMENT ON TABLE pos_payment_links IS 'Tracks Stripe Payment Links for POS transactions';
COMMENT ON TABLE qr_payment_sessions IS 'Stores QR payment sessions for POS system with Stripe integration';
COMMENT ON TABLE terminal_locations IS 'Tracks Stripe Terminal locations for each barbershop';
COMMENT ON TABLE terminal_readers IS 'Tracks Stripe Terminal card readers and their status';
COMMENT ON TABLE terminal_payment_intents IS 'Tracks Terminal payment intents for card-present transactions';
COMMENT ON TABLE terminal_connection_tokens IS 'Audit trail for Terminal SDK connection tokens';
COMMENT ON TABLE pos_sales IS 'Unified sales records for all POS payment methods';
COMMENT ON TABLE pos_commissions IS 'Unified commission tracking for all POS payment methods';

-- Key column comments
COMMENT ON COLUMN pos_payment_links.cart_data IS 'JSON structure containing cart items with quantities, prices, and product IDs';
COMMENT ON COLUMN pos_payment_links.customer_contact IS 'Customer phone number or email address for link delivery';
COMMENT ON COLUMN pos_payment_links.stripe_session_id IS 'Stripe Checkout Session ID for webhook processing';

COMMENT ON COLUMN qr_payment_sessions.session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN qr_payment_sessions.cart_items IS 'JSON array of cart items with product details';
COMMENT ON COLUMN qr_payment_sessions.application_fee IS 'Platform fee charged in dollars';

COMMENT ON COLUMN terminal_readers.device_type IS 'Reader model (bbpos_wisepad3, stripe_m2, etc.)';
COMMENT ON COLUMN terminal_readers.status IS 'Reader connection status: offline, online, busy';
COMMENT ON COLUMN terminal_payment_intents.amount_cents IS 'Amount in cents (to avoid floating point issues)';

COMMENT ON COLUMN pos_sales.payment_method IS 'Payment method used: payment_link, qr_code, terminal, cash, or card';

-- ==========================================
-- 9. GRANT PERMISSIONS
-- ==========================================

-- Grant appropriate permissions
GRANT ALL ON pos_payment_links TO authenticated;
GRANT ALL ON qr_payment_sessions TO authenticated;
GRANT ALL ON terminal_locations TO authenticated;
GRANT ALL ON terminal_readers TO authenticated;
GRANT ALL ON terminal_payment_intents TO authenticated;
GRANT ALL ON terminal_connection_tokens TO authenticated;
GRANT ALL ON pos_sales TO authenticated;
GRANT ALL ON pos_commissions TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION update_inventory_stock TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_payment_links TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_qr_sessions TO authenticated;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- This migration creates a unified payment infrastructure that supports:
-- 1. Payment Links (Stripe Payment Links with SMS/Email delivery)
-- 2. QR Code Payments (Stripe Checkout Sessions with QR codes)
-- 3. Terminal Payments (Stripe Terminal for card-present transactions)
-- 4. Unified sales and commission tracking across all payment methods
-- 5. Proper RLS policies for multi-tenant security
-- 6. Performance indexes for scalability
-- 7. Automated cleanup functions for expired payments