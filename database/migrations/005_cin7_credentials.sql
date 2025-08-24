-- Migration: Create cin7_credentials table for Cin7 API integration
-- Date: 2025-08-24
-- Purpose: Store encrypted Cin7 API credentials for inventory sync

CREATE TABLE IF NOT EXISTS cin7_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  encrypted_account_id TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  account_name TEXT,
  api_version TEXT DEFAULT 'v1',
  is_active BOOLEAN DEFAULT false,
  sync_settings JSONB DEFAULT '{}',
  webhook_url TEXT,
  webhook_status TEXT,
  last_sync TIMESTAMPTZ,
  last_sync_status TEXT,
  last_tested TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE cin7_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for barbershop owners
CREATE POLICY "barbershop_owners_access" ON cin7_credentials
  FOR ALL
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );

-- Create RLS policy for barbershop staff
CREATE POLICY "barbershop_staff_access" ON cin7_credentials
  FOR SELECT
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_barbershop_id 
  ON cin7_credentials(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_user_id 
  ON cin7_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_active 
  ON cin7_credentials(is_active);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at_cin7_credentials 
  BEFORE UPDATE ON cin7_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE cin7_credentials IS 'Stores encrypted Cin7 API credentials for inventory synchronization';
COMMENT ON COLUMN cin7_credentials.encrypted_account_id IS 'AES-256-GCM encrypted Cin7 Account ID';
COMMENT ON COLUMN cin7_credentials.encrypted_api_key IS 'AES-256-GCM encrypted Cin7 API Key';
COMMENT ON COLUMN cin7_credentials.sync_settings IS 'JSON configuration for sync behavior (auto_sync, intervals, etc.)';
COMMENT ON COLUMN cin7_credentials.webhook_status IS 'Status of webhook registration: active, failed, disabled';