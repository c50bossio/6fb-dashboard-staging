-- Simple CIN7 Credentials Table - No Errors
CREATE TABLE IF NOT EXISTS cin7_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  encrypted_api_key TEXT NOT NULL,
  encrypted_account_id TEXT NOT NULL,
  account_name TEXT,
  api_version TEXT DEFAULT 'v2',
  is_active BOOLEAN DEFAULT true,
  last_tested TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  webhook_secret TEXT,
  webhook_registered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id)
);

-- Basic indexes only
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_barbershop_id ON cin7_credentials(barbershop_id);

-- Enable RLS
ALTER TABLE cin7_credentials ENABLE ROW LEVEL SECURITY;

-- Simple policy
CREATE POLICY "cin7_credentials_policy" ON cin7_credentials
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );