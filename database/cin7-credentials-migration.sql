-- Cin7 Credentials Table Migration
-- Creates the cin7_credentials table that the API endpoints expect

-- Create the cin7_credentials table with proper structure
CREATE TABLE IF NOT EXISTS cin7_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Encrypted Cin7 credentials (AES-256-GCM encrypted JSON objects)
  encrypted_api_key TEXT NOT NULL, -- JSON string: {encrypted, iv, authTag}
  encrypted_account_id TEXT NOT NULL, -- JSON string: {encrypted, iv, authTag}
  
  -- Connection metadata
  account_name TEXT, -- Company name from Cin7
  api_version TEXT DEFAULT 'v2', -- 'v1' or 'v2'
  
  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT, -- 'success', 'failed', 'partial'
  
  -- Webhook configuration
  webhook_secret TEXT, -- For webhook signature validation
  webhook_registered BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per barbershop
  UNIQUE(barbershop_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_barbershop_id ON cin7_credentials(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_active ON cin7_credentials(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_last_sync ON cin7_credentials(last_sync DESC);

-- Row Level Security (RLS) policies
ALTER TABLE cin7_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only access credentials for barbershops they own
CREATE POLICY "Users can view own barbershop credentials" ON cin7_credentials
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own barbershop credentials" ON cin7_credentials
  FOR INSERT WITH CHECK (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own barbershop credentials" ON cin7_credentials
  FOR UPDATE USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own barbershop credentials" ON cin7_credentials
  FOR DELETE USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cin7_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_cin7_credentials_updated_at
  BEFORE UPDATE ON cin7_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_cin7_credentials_updated_at();

-- Function to check if barbershop has Cin7 connected
CREATE OR REPLACE FUNCTION has_cin7_credentials(barbershop_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM cin7_credentials 
    WHERE barbershop_id = barbershop_uuid 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get last sync status for barbershop
CREATE OR REPLACE FUNCTION get_cin7_status(barbershop_uuid UUID)
RETURNS TABLE (
  is_connected BOOLEAN,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_status TEXT,
  account_name TEXT,
  api_version TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.is_active,
    c.last_sync,
    c.last_sync_status,
    c.account_name,
    c.api_version
  FROM cin7_credentials c
  WHERE c.barbershop_id = barbershop_uuid
  AND c.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;