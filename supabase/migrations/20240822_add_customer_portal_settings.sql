-- Migration: Add customer portal settings to barbershops
-- Description: Adds JSONB column for storing customer portal configuration
-- Date: 2024-08-22

-- Add customer_portal_settings column if it doesn't exist
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS customer_portal_settings JSONB DEFAULT '{
  "allowPublicBooking": true,
  "requireAccountForBooking": false,
  "allowGuestCheckout": true,
  "enableProgressiveSignup": true,
  "enableCustomerPortal": false,
  "allowSelfRescheduling": false,
  "allowSelfCancellation": false,
  "cancellationWindowHours": 24,
  "enableLoyaltyProgram": false,
  "pointsPerDollar": 1,
  "rewardThreshold": 100,
  "enableReferralProgram": false,
  "referralBonus": 10,
  "enableAIInsights": false,
  "enableAutomatedMarketing": false,
  "enableCustomerSegmentation": false,
  "enablePredictiveBooking": false,
  "sendBookingConfirmations": true,
  "sendReminders": true,
  "reminderHoursBefore": 24,
  "sendMarketingEmails": false,
  "sendBirthdayOffers": false,
  "savePaymentMethods": false,
  "enableTipping": true,
  "defaultTipPercentages": [15, 18, 20, 25],
  "dataRetentionDays": 365,
  "allowDataExport": true,
  "requireConsent": true
}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN barbershops.customer_portal_settings IS 'Customer portal and self-service configuration settings';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_barbershops_customer_portal_settings 
ON barbershops USING gin(customer_portal_settings);

-- Update existing booking_settings to include new fields if they don't exist
UPDATE barbershops
SET booking_settings = booking_settings || '{
  "allowPublicBooking": true,
  "requireAuth": false,
  "enableProgressiveSignup": true
}'::jsonb
WHERE booking_settings IS NOT NULL
  AND NOT booking_settings ? 'allowPublicBooking';

-- Create a function to check if customer portal is enabled for a barbershop
CREATE OR REPLACE FUNCTION is_customer_portal_enabled(barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (customer_portal_settings->>'enableCustomerPortal')::boolean,
    false
  )
  FROM barbershops
  WHERE id = barbershop_id;
$$;

-- Create a function to check if public booking is allowed
CREATE OR REPLACE FUNCTION is_public_booking_allowed(barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (customer_portal_settings->>'allowPublicBooking')::boolean,
    true
  )
  FROM barbershops
  WHERE id = barbershop_id;
$$;

-- Grant permissions to use these functions
GRANT EXECUTE ON FUNCTION is_customer_portal_enabled(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_public_booking_allowed(UUID) TO authenticated, anon;