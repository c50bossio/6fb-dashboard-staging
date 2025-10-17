-- Add webhook tracking columns to cin7_credentials table
-- These columns track the webhook registration status and URL

ALTER TABLE cin7_credentials 
ADD COLUMN IF NOT EXISTS webhook_status VARCHAR(50) DEFAULT 'pending' 
  CHECK (webhook_status IN ('pending', 'active', 'error', 'disabled')),
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_error TEXT;

-- Add index for webhook status queries
CREATE INDEX IF NOT EXISTS idx_cin7_credentials_webhook_status 
ON cin7_credentials(webhook_status);

-- Success message
SELECT 'Webhook tracking columns added successfully' AS status;