-- Cin7 Integration Schema for Supabase
-- This schema handles multi-tenant Cin7 connections for inventory management

-- Table for storing encrypted Cin7 API credentials per user/barbershop
CREATE TABLE IF NOT EXISTS cin7_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Encrypted Cin7 credentials
  account_id TEXT NOT NULL, -- Encrypted
  api_key_encrypted TEXT NOT NULL, -- Encrypted object with {encrypted, iv, authTag}
  
  -- Connection metadata
  account_name TEXT, -- Company name from Cin7
  webhook_url TEXT,
  webhook_secret TEXT, -- For webhook signature validation
  
  -- Status and settings
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT, -- 'success', 'failed', 'partial'
  last_error TEXT,
  
  -- Sync configuration
  sync_settings JSONB DEFAULT '{
    "auto_sync": true,
    "sync_interval_minutes": 15,
    "low_stock_alerts": true,
    "sync_products": true,
    "sync_stock_levels": true,
    "sync_purchase_orders": false
  }'::jsonb,
  
  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per user
  UNIQUE(user_id),
  UNIQUE(barbershop_id)
);

-- Table for tracking sync history and logs
CREATE TABLE IF NOT EXISTS cin7_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID REFERENCES cin7_connections(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'webhook'
  sync_direction VARCHAR(20) NOT NULL, -- 'pull', 'push', 'bidirectional'
  
  -- Results
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  
  -- Detailed information
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Index for performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extend existing inventory table to link with Cin7
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_product_id TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_sku TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_barcode TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_last_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_sync_enabled BOOLEAN DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cin7_connections_user_id ON cin7_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_cin7_connections_barbershop_id ON cin7_connections(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_cin7_connections_active ON cin7_connections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cin7_sync_logs_connection_id ON cin7_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_cin7_sync_logs_created ON cin7_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_cin7_product ON inventory(cin7_product_id) WHERE cin7_product_id IS NOT NULL;

-- Row Level Security (RLS) policies
ALTER TABLE cin7_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own Cin7 connections
CREATE POLICY "Users can view own cin7 connections" ON cin7_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cin7 connections" ON cin7_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cin7 connections" ON cin7_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cin7 connections" ON cin7_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only see sync logs for their connections
CREATE POLICY "Users can view own sync logs" ON cin7_sync_logs
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM cin7_connections WHERE user_id = auth.uid()
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cin7_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_cin7_connections_updated_at
  BEFORE UPDATE ON cin7_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_cin7_updated_at();

-- Function to check if user has Cin7 connected
CREATE OR REPLACE FUNCTION has_cin7_connection(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM cin7_connections 
    WHERE user_id = user_uuid 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get last sync status
CREATE OR REPLACE FUNCTION get_cin7_sync_status(user_uuid UUID)
RETURNS TABLE (
  is_connected BOOLEAN,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_status TEXT,
  items_synced INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.is_active,
    c.last_sync,
    c.last_sync_status,
    COALESCE(
      (SELECT l.items_synced 
       FROM cin7_sync_logs l 
       WHERE l.connection_id = c.id 
       ORDER BY l.created_at DESC 
       LIMIT 1), 
      0
    )
  FROM cin7_connections c
  WHERE c.user_id = user_uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;