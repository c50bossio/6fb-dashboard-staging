-- Migration: Integrate Cin7 credentials directly into profiles table
-- This simplifies the system by storing credentials with the user profile
-- instead of in a separate table with complex associations

-- Step 1: Add Cin7 columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cin7_account_id TEXT,
ADD COLUMN IF NOT EXISTS cin7_api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS cin7_account_name TEXT,
ADD COLUMN IF NOT EXISTS cin7_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cin7_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cin7_sync_status TEXT CHECK (cin7_sync_status IN ('success', 'failed', 'syncing', 'never')),
ADD COLUMN IF NOT EXISTS cin7_last_sync_message TEXT,
ADD COLUMN IF NOT EXISTS cin7_webhook_registered BOOLEAN DEFAULT false;

-- Step 2: Ensure every profile has a barbershop association
-- First, update any profiles that have shop_id but not barbershop_id
UPDATE profiles 
SET barbershop_id = shop_id 
WHERE barbershop_id IS NULL AND shop_id IS NOT NULL;

-- For profiles without any barbershop, try to find one they own
UPDATE profiles p
SET barbershop_id = b.id
FROM barbershops b
WHERE p.barbershop_id IS NULL 
  AND b.owner_id = p.id
  AND NOT EXISTS (
    SELECT 1 FROM barbershops b2 
    WHERE b2.owner_id = p.id AND b2.id < b.id
  );

-- Step 3: Migrate existing cin7_credentials if they exist
-- This preserves any existing credentials during the transition
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cin7_credentials') THEN
        -- Migrate credentials to profiles table
        UPDATE profiles p
        SET 
            cin7_account_id = c.encrypted_account_id,
            cin7_api_key_encrypted = c.encrypted_api_key,
            cin7_account_name = c.account_name,
            cin7_sync_enabled = c.is_active,
            cin7_last_sync = c.last_sync,
            cin7_sync_status = CASE 
                WHEN c.last_sync_status = 'success' THEN 'success'
                WHEN c.last_sync_status = 'failed' THEN 'failed'
                ELSE 'never'
            END,
            cin7_webhook_registered = c.webhook_registered
        FROM cin7_credentials c
        WHERE p.barbershop_id = c.barbershop_id
          AND c.is_active = true;
        
        -- Log migration
        RAISE NOTICE 'Migrated % Cin7 credentials to profiles table', 
            (SELECT COUNT(*) FROM cin7_credentials WHERE is_active = true);
    END IF;
END $$;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_cin7_sync 
ON profiles(cin7_sync_enabled, cin7_last_sync) 
WHERE cin7_sync_enabled = true;

-- Step 5: Add helpful comments
COMMENT ON COLUMN profiles.cin7_account_id IS 'Encrypted Cin7/DEAR account ID';
COMMENT ON COLUMN profiles.cin7_api_key_encrypted IS 'AES-256 encrypted API key';
COMMENT ON COLUMN profiles.cin7_account_name IS 'Display name of connected Cin7 account';
COMMENT ON COLUMN profiles.cin7_sync_enabled IS 'Whether automatic inventory sync is enabled';
COMMENT ON COLUMN profiles.cin7_last_sync IS 'Timestamp of last successful sync';
COMMENT ON COLUMN profiles.cin7_sync_status IS 'Current status of Cin7 integration';

-- Step 6: Create a view for easy Cin7 status monitoring
CREATE OR REPLACE VIEW cin7_sync_status AS
SELECT 
    p.id as profile_id,
    p.email,
    p.full_name,
    b.name as barbershop_name,
    p.cin7_account_name,
    p.cin7_sync_enabled,
    p.cin7_last_sync,
    p.cin7_sync_status,
    CASE 
        WHEN p.cin7_last_sync IS NULL THEN 'Never synced'
        WHEN p.cin7_last_sync < NOW() - INTERVAL '1 hour' THEN 'Needs sync'
        ELSE 'Recently synced'
    END as sync_health
FROM profiles p
LEFT JOIN barbershops b ON p.barbershop_id = b.id
WHERE p.cin7_sync_enabled = true;

-- Step 7: Grant appropriate permissions
GRANT SELECT ON cin7_sync_status TO authenticated;