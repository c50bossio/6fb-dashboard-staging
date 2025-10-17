-- Fix Subscription Tier Synchronization
-- This migration ensures role and subscription_tier fields are consistent across all profiles

-- First, let's see what inconsistencies we have
SELECT 
    id,
    email,
    full_name,
    role,
    subscription_tier,
    subscription_status,
    CASE 
        WHEN role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
        WHEN role = 'BARBER' THEN 'INDIVIDUAL'
        WHEN role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
        WHEN role = 'CLIENT' THEN 'FREE'
        ELSE 'FREE'
    END as expected_tier
FROM profiles
WHERE (
    (role = 'SHOP_OWNER' AND subscription_tier != 'PROFESSIONAL') OR
    (role = 'BARBER' AND subscription_tier != 'INDIVIDUAL') OR
    (role = 'ENTERPRISE_OWNER' AND subscription_tier != 'ENTERPRISE') OR
    (role = 'CLIENT' AND subscription_tier != 'FREE') OR
    subscription_tier IS NULL
);

-- Update Chris Bossio's account specifically (if found)
UPDATE profiles 
SET 
    subscription_tier = 'PROFESSIONAL',
    subscription_status = COALESCE(subscription_status, 'active'),
    updated_at = NOW()
WHERE email = 'c50bossio@gmail.com' 
    AND role = 'SHOP_OWNER' 
    AND subscription_tier != 'PROFESSIONAL';

-- Fix all SHOP_OWNER roles with incorrect subscription_tier
UPDATE profiles 
SET 
    subscription_tier = 'PROFESSIONAL',
    subscription_status = COALESCE(subscription_status, 'active'),
    updated_at = NOW()
WHERE role = 'SHOP_OWNER' 
    AND subscription_tier != 'PROFESSIONAL';

-- Fix all BARBER roles with incorrect subscription_tier
UPDATE profiles 
SET 
    subscription_tier = 'INDIVIDUAL',
    subscription_status = COALESCE(subscription_status, 'active'),
    updated_at = NOW()
WHERE role = 'BARBER' 
    AND subscription_tier != 'INDIVIDUAL';

-- Fix all ENTERPRISE_OWNER roles with incorrect subscription_tier
UPDATE profiles 
SET 
    subscription_tier = 'ENTERPRISE',
    subscription_status = COALESCE(subscription_status, 'active'),
    updated_at = NOW()
WHERE role = 'ENTERPRISE_OWNER' 
    AND subscription_tier != 'ENTERPRISE';

-- Fix CLIENT roles to have FREE tier
UPDATE profiles 
SET 
    subscription_tier = 'FREE',
    subscription_status = COALESCE(subscription_status, 'active'),
    updated_at = NOW()
WHERE role = 'CLIENT' 
    AND subscription_tier != 'FREE';

-- Handle any profiles with NULL subscription_tier
UPDATE profiles 
SET 
    subscription_tier = CASE 
        WHEN role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
        WHEN role = 'BARBER' THEN 'INDIVIDUAL'
        WHEN role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
        ELSE 'FREE'
    END,
    subscription_status = COALESCE(subscription_status, 'active'),
    updated_at = NOW()
WHERE subscription_tier IS NULL;

-- Verify the fixes
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'SHOP_OWNER' AND subscription_tier = 'PROFESSIONAL' THEN 1 END) as shop_owners_fixed,
    COUNT(CASE WHEN role = 'BARBER' AND subscription_tier = 'INDIVIDUAL' THEN 1 END) as barbers_fixed,
    COUNT(CASE WHEN role = 'ENTERPRISE_OWNER' AND subscription_tier = 'ENTERPRISE' THEN 1 END) as enterprise_fixed,
    COUNT(CASE WHEN role = 'CLIENT' AND subscription_tier = 'FREE' THEN 1 END) as clients_fixed
FROM profiles;

-- Check if there are any remaining inconsistencies
SELECT 
    id,
    email,
    role,
    subscription_tier,
    'INCONSISTENT' as status
FROM profiles
WHERE (
    (role = 'SHOP_OWNER' AND subscription_tier != 'PROFESSIONAL') OR
    (role = 'BARBER' AND subscription_tier != 'INDIVIDUAL') OR
    (role = 'ENTERPRISE_OWNER' AND subscription_tier != 'ENTERPRISE') OR
    (role = 'CLIENT' AND subscription_tier != 'FREE') OR
    subscription_tier IS NULL
);

-- Add a comment for future reference
COMMENT ON TABLE profiles IS 'Profiles table - role and subscription_tier should always be synchronized. Use profile-sync-service.js for ongoing maintenance.';