-- Migration: Add Stripe Terminal Support
-- This adds Terminal-specific fields to existing tables and creates new Terminal tracking tables

-- Add Terminal-specific fields to pos_payment_links table
ALTER TABLE pos_payment_links 
ADD COLUMN IF NOT EXISTS terminal_reader_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_details JSONB;

-- Create Terminal locations tracking table
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

-- Create Terminal readers tracking table
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

-- Create Terminal payment intents tracking table
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

-- Create Terminal connection tokens table (for security audit trail)
CREATE TABLE IF NOT EXISTS terminal_connection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id),
  token_secret TEXT NOT NULL, -- hashed for security
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
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

-- Add RLS (Row Level Security) policies
ALTER TABLE terminal_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_readers ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_connection_tokens ENABLE ROW LEVEL SECURITY;

-- Terminal locations policies
CREATE POLICY "Users can view terminal locations for their barbershop" ON terminal_locations
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can manage terminal locations" ON terminal_locations
  FOR ALL USING (
    barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
  );

-- Terminal readers policies  
CREATE POLICY "Users can view terminal readers for their barbershop" ON terminal_readers
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can manage terminal readers" ON terminal_readers
  FOR ALL USING (
    barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
  );

-- Terminal payment intents policies
CREATE POLICY "Users can view terminal payments for their barbershop" ON terminal_payment_intents
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
    OR barber_id = auth.uid()
  );

CREATE POLICY "Authorized users can create terminal payments" ON terminal_payment_intents
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT barbershop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- Terminal connection tokens policies (restricted to shop owners and system)
CREATE POLICY "Shop owners can manage connection tokens" ON terminal_connection_tokens
  FOR ALL USING (
    barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
  );

-- Add triggers for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_terminal_locations_updated_at BEFORE UPDATE ON terminal_locations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terminal_readers_updated_at BEFORE UPDATE ON terminal_readers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terminal_payment_intents_updated_at BEFORE UPDATE ON terminal_payment_intents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE terminal_locations IS 'Tracks Stripe Terminal locations for each barbershop';
COMMENT ON TABLE terminal_readers IS 'Tracks Stripe Terminal card readers and their status';
COMMENT ON TABLE terminal_payment_intents IS 'Tracks Terminal payment intents for card-present transactions';
COMMENT ON TABLE terminal_connection_tokens IS 'Audit trail for Terminal SDK connection tokens';

COMMENT ON COLUMN terminal_locations.stripe_location_id IS 'Stripe Terminal location ID from Stripe API';
COMMENT ON COLUMN terminal_readers.stripe_reader_id IS 'Stripe Terminal reader ID from Stripe API';
COMMENT ON COLUMN terminal_readers.device_type IS 'Reader model (bbpos_wisepad3, stripe_m2, etc.)';
COMMENT ON COLUMN terminal_readers.status IS 'Reader connection status: offline, online, busy';
COMMENT ON COLUMN terminal_payment_intents.amount_cents IS 'Amount in cents (to avoid floating point issues)';
COMMENT ON COLUMN terminal_connection_tokens.token_secret IS 'Hashed connection token for security audit';