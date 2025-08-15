#!/usr/bin/env node

/**
 * Direct Supabase setup for Cin7 tables
 * This script creates the tables directly without using exec_sql
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCin7Tables() {
  console.log('🔧 Setting up Cin7 tables in Supabase...\n')
  
  let success = true
  
  console.log('📋 Checking existing tables...')
  
  const { error: conn_check } = await supabase
    .from('cin7_connections')
    .select('id')
    .limit(1)
  
  if (!conn_check) {
    console.log('✅ cin7_connections table already exists')
  } else if (conn_check.message.includes('does not exist')) {
    console.log('❌ cin7_connections table needs to be created')
    success = false
  }
  
  const { error: logs_check } = await supabase
    .from('cin7_sync_logs')
    .select('id')
    .limit(1)
  
  if (!logs_check) {
    console.log('✅ cin7_sync_logs table already exists')
  } else if (logs_check.message.includes('does not exist')) {
    console.log('❌ cin7_sync_logs table needs to be created')
    success = false
  }
  
  const { error: inv_check } = await supabase
    .from('inventory')
    .select('cin7_product_id')
    .limit(1)
  
  if (!inv_check) {
    console.log('✅ inventory table has Cin7 columns')
  } else if (inv_check.message.includes('column') && inv_check.message.includes('does not exist')) {
    console.log('❌ inventory table needs Cin7 columns added')
    success = false
  }
  
  if (!success) {
    console.log('\n⚠️  Some tables/columns are missing.')
    console.log('\n📝 To create them, copy this SQL and run it in Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql\n')
    console.log('=' + '='.repeat(70))
    console.log(`
-- Cin7 Integration Tables for Supabase

-- Create cin7_connections table
CREATE TABLE IF NOT EXISTS cin7_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  barbershop_id UUID,
  account_id TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_sync BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 15,
  webhook_url TEXT,
  webhook_secret TEXT,
  last_sync TIMESTAMPTZ,
  last_sync_status VARCHAR(20),
  last_error TEXT,
  sync_settings JSONB DEFAULT '{"sync_products": true, "sync_stock": true, "sync_sales": false}'::jsonb,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cin7_sync_logs table
CREATE TABLE IF NOT EXISTS cin7_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES cin7_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  sync_direction VARCHAR(20) DEFAULT 'pull',
  status VARCHAR(20) NOT NULL,
  items_synced INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Cin7 columns to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_product_id TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_sku TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_barcode TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_last_sync TIMESTAMPTZ;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_sync_enabled BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cin7_connections_user_id ON cin7_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_cin7_connections_barbershop_id ON cin7_connections(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_cin7_connections_active ON cin7_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_cin7_sync_logs_connection_id ON cin7_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_cin7_sync_logs_created ON cin7_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_cin7_product ON inventory(cin7_product_id);

-- Enable Row Level Security
ALTER TABLE cin7_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cin7_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cin7_connections
CREATE POLICY "Users can view own cin7 connections" ON cin7_connections
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own cin7 connections" ON cin7_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own cin7 connections" ON cin7_connections
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own cin7 connections" ON cin7_connections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for cin7_sync_logs
CREATE POLICY "Users can view own sync logs" ON cin7_sync_logs
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM cin7_connections WHERE user_id = auth.uid()
    )
  );
`)
    console.log('=' + '='.repeat(70))
    console.log('\n✂️  Copy the SQL above and paste it in the Supabase SQL Editor')
    console.log('   Then click "Run" to create the tables.\n')
  } else {
    console.log('\n🎉 All Cin7 tables are ready!')
    console.log('\n✅ You can now use the Cin7 integration:')
    console.log('   1. Go to the Inventory page')
    console.log('   2. Scroll to the bottom')
    console.log('   3. Click "Advanced: Connect warehouse system"')
    console.log('   4. Enter your Cin7 credentials')
  }
}

setupCin7Tables().catch(console.error)