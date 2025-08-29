-- Migration: Add unified Stripe tracking fields
-- Purpose: Enhance stripe_connected_accounts table for unified status management
-- Created: 2025-01-XX for UnifiedStripeManager system

-- Add new columns to stripe_connected_accounts table
ALTER TABLE stripe_connected_accounts 
ADD COLUMN IF NOT EXISTS setup_progress JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unified_status VARCHAR(50) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS setup_source VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for unified_status for faster queries
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_unified_status 
ON stripe_connected_accounts(unified_status);

-- Create index for barbershop_id + unified_status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_barbershop_status 
ON stripe_connected_accounts(barbershop_id, unified_status);

-- Create stripe_terminal_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_terminal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  location_id VARCHAR(255),
  terminal_configured BOOLEAN DEFAULT FALSE,
  reader_id VARCHAR(255),
  test_mode BOOLEAN DEFAULT TRUE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for barbershop_id on stripe_terminal_config
CREATE INDEX IF NOT EXISTS idx_stripe_terminal_config_barbershop 
ON stripe_terminal_config(barbershop_id);

-- Update existing records with default setup_progress
UPDATE stripe_connected_accounts 
SET setup_progress = jsonb_build_object(
  'account_created', CASE WHEN stripe_account_id IS NOT NULL THEN true ELSE false END,
  'onboarding_started', CASE WHEN details_submitted THEN true ELSE false END,
  'onboarding_completed', CASE WHEN charges_enabled AND payouts_enabled THEN true ELSE false END
)
WHERE setup_progress = '{}' OR setup_progress IS NULL;

-- Update unified_status based on current state
UPDATE stripe_connected_accounts 
SET unified_status = CASE
  WHEN stripe_account_id IS NULL THEN 'not_started'
  WHEN charges_enabled AND payouts_enabled THEN 'completed'
  WHEN details_submitted THEN 'in_progress'
  ELSE 'in_progress'
END
WHERE unified_status = 'not_started';

-- Add comment to document the unified system
COMMENT ON COLUMN stripe_connected_accounts.setup_progress IS 
'JSON object tracking setup progress across all entry points';

COMMENT ON COLUMN stripe_connected_accounts.unified_status IS 
'Overall status: not_started, in_progress, completed, error';

COMMENT ON COLUMN stripe_connected_accounts.setup_source IS 
'Which component initiated setup: onboarding, settings, dashboard, pos';

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_terminal_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stripe_terminal_config
DROP TRIGGER IF EXISTS trigger_update_stripe_terminal_config_updated_at ON stripe_terminal_config;
CREATE TRIGGER trigger_update_stripe_terminal_config_updated_at
  BEFORE UPDATE ON stripe_terminal_config
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_terminal_config_updated_at();