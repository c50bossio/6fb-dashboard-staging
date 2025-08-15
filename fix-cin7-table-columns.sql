-- Add missing columns to cin7_credentials table
ALTER TABLE cin7_credentials 
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS webhook_registered BOOLEAN DEFAULT false;