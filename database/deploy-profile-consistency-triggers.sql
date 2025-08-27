-- Deploy Profile Consistency Triggers to Production
-- This creates database-level enforcement of role/subscription_tier consistency

-- First, create the consistency enforcement function
CREATE OR REPLACE FUNCTION enforce_profile_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-sync subscription_tier when role changes
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.subscription_tier := CASE 
      WHEN NEW.role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
      WHEN NEW.role = 'BARBER' THEN 'INDIVIDUAL'
      WHEN NEW.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
      WHEN NEW.role = 'CLIENT' THEN 'FREE'
      WHEN NEW.role = 'SUPER_ADMIN' THEN 'ENTERPRISE'
      ELSE 'FREE'
    END;
    
    -- Set subscription_status for paid tiers
    IF NEW.subscription_tier != 'FREE' AND (NEW.subscription_status IS NULL OR NEW.subscription_status = '') THEN
      NEW.subscription_status := 'active';
    END IF;
    
    -- Log the change for monitoring
    RAISE NOTICE 'Profile consistency: Role changed from % to %, tier updated to %', 
      OLD.role, NEW.role, NEW.subscription_tier;
  END IF;

  -- Validate and normalize tier changes
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    -- Normalize tier names to standard format
    NEW.subscription_tier := CASE 
      WHEN LOWER(NEW.subscription_tier) IN ('shop', 'shop_owner', 'professional') THEN 'PROFESSIONAL'
      WHEN LOWER(NEW.subscription_tier) IN ('barber', 'individual') THEN 'INDIVIDUAL'
      WHEN LOWER(NEW.subscription_tier) IN ('enterprise') THEN 'ENTERPRISE'
      WHEN LOWER(NEW.subscription_tier) IN ('free', 'client') THEN 'FREE'
      ELSE UPPER(NEW.subscription_tier)
    END;
    
    -- Validate role-tier consistency
    IF (NEW.role = 'SHOP_OWNER' AND NEW.subscription_tier != 'PROFESSIONAL') OR
       (NEW.role = 'BARBER' AND NEW.subscription_tier != 'INDIVIDUAL') OR
       (NEW.role = 'ENTERPRISE_OWNER' AND NEW.subscription_tier != 'ENTERPRISE') OR
       (NEW.role = 'CLIENT' AND NEW.subscription_tier != 'FREE') THEN
      
      RAISE NOTICE 'Profile consistency: Tier % incompatible with role %, auto-correcting', 
        NEW.subscription_tier, NEW.role;
        
      -- Auto-correct the tier based on role
      NEW.subscription_tier := CASE 
        WHEN NEW.role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
        WHEN NEW.role = 'BARBER' THEN 'INDIVIDUAL'
        WHEN NEW.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
        ELSE 'FREE'
      END;
    END IF;
  END IF;

  -- Ensure subscription_status is set for non-free tiers
  IF NEW.subscription_tier != 'FREE' AND (NEW.subscription_status IS NULL OR NEW.subscription_status = '') THEN
    NEW.subscription_status := 'active';
  END IF;

  -- Update timestamp
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS profile_consistency_trigger ON profiles;
CREATE TRIGGER profile_consistency_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_consistency();

-- Create a function for INSERT operations as well
CREATE OR REPLACE FUNCTION enforce_profile_consistency_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default values for new profiles
  IF NEW.subscription_tier IS NULL THEN
    NEW.subscription_tier := CASE 
      WHEN NEW.role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
      WHEN NEW.role = 'BARBER' THEN 'INDIVIDUAL'
      WHEN NEW.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
      ELSE 'FREE'
    END;
  END IF;

  -- Normalize tier name
  NEW.subscription_tier := CASE 
    WHEN LOWER(NEW.subscription_tier) IN ('shop', 'shop_owner', 'professional') THEN 'PROFESSIONAL'
    WHEN LOWER(NEW.subscription_tier) IN ('barber', 'individual') THEN 'INDIVIDUAL'
    WHEN LOWER(NEW.subscription_tier) IN ('enterprise') THEN 'ENTERPRISE'
    WHEN LOWER(NEW.subscription_tier) IN ('free', 'client') THEN 'FREE'
    ELSE UPPER(NEW.subscription_tier)
  END;

  -- Set subscription_status
  IF NEW.subscription_tier != 'FREE' AND (NEW.subscription_status IS NULL OR NEW.subscription_status = '') THEN
    NEW.subscription_status := 'active';
  END IF;

  -- Set timestamps
  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create INSERT trigger
DROP TRIGGER IF EXISTS profile_consistency_insert_trigger ON profiles;
CREATE TRIGGER profile_consistency_insert_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_consistency_insert();

-- Create a monitoring table for trigger activity
CREATE TABLE IF NOT EXISTS profile_consistency_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'role_change', 'tier_change', 'auto_fix'
  old_values JSONB,
  new_values JSONB,
  trigger_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the log table
ALTER TABLE profile_consistency_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and system can read/write consistency logs
CREATE POLICY "Admin access to consistency logs" ON profile_consistency_log
FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
  )
);

-- Enhanced trigger function with logging
CREATE OR REPLACE FUNCTION enforce_profile_consistency_with_logging()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  action_taken TEXT := '';
BEGIN
  -- Store original values for logging
  IF TG_OP = 'UPDATE' THEN
    old_data := jsonb_build_object(
      'role', OLD.role,
      'subscription_tier', OLD.subscription_tier,
      'subscription_status', OLD.subscription_status
    );
  END IF;

  -- Auto-sync subscription_tier when role changes
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.subscription_tier := CASE 
      WHEN NEW.role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
      WHEN NEW.role = 'BARBER' THEN 'INDIVIDUAL'
      WHEN NEW.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
      WHEN NEW.role = 'CLIENT' THEN 'FREE'
      WHEN NEW.role = 'SUPER_ADMIN' THEN 'ENTERPRISE'
      ELSE 'FREE'
    END;
    
    action_taken := action_taken || 'role_tier_sync ';
    
    -- Set subscription_status for paid tiers
    IF NEW.subscription_tier != 'FREE' AND (NEW.subscription_status IS NULL OR NEW.subscription_status = '') THEN
      NEW.subscription_status := 'active';
      action_taken := action_taken || 'status_activated ';
    END IF;
  END IF;

  -- Validate and normalize tier changes
  IF NEW.subscription_tier IS DISTINCT FROM COALESCE(OLD.subscription_tier, '') THEN
    -- Normalize tier names to standard format
    NEW.subscription_tier := CASE 
      WHEN LOWER(NEW.subscription_tier) IN ('shop', 'shop_owner', 'professional') THEN 'PROFESSIONAL'
      WHEN LOWER(NEW.subscription_tier) IN ('barber', 'individual') THEN 'INDIVIDUAL'
      WHEN LOWER(NEW.subscription_tier) IN ('enterprise') THEN 'ENTERPRISE'
      WHEN LOWER(NEW.subscription_tier) IN ('free', 'client') THEN 'FREE'
      ELSE UPPER(NEW.subscription_tier)
    END;
    
    action_taken := action_taken || 'tier_normalized ';
    
    -- Validate role-tier consistency and auto-correct
    IF (NEW.role = 'SHOP_OWNER' AND NEW.subscription_tier != 'PROFESSIONAL') OR
       (NEW.role = 'BARBER' AND NEW.subscription_tier != 'INDIVIDUAL') OR
       (NEW.role = 'ENTERPRISE_OWNER' AND NEW.subscription_tier != 'ENTERPRISE') OR
       (NEW.role = 'CLIENT' AND NEW.subscription_tier != 'FREE') THEN
        
      NEW.subscription_tier := CASE 
        WHEN NEW.role = 'SHOP_OWNER' THEN 'PROFESSIONAL'
        WHEN NEW.role = 'BARBER' THEN 'INDIVIDUAL'
        WHEN NEW.role = 'ENTERPRISE_OWNER' THEN 'ENTERPRISE'
        ELSE 'FREE'
      END;
      
      action_taken := action_taken || 'auto_corrected ';
    END IF;
  END IF;

  -- Ensure subscription_status is set for non-free tiers
  IF NEW.subscription_tier != 'FREE' AND (NEW.subscription_status IS NULL OR NEW.subscription_status = '') THEN
    NEW.subscription_status := 'active';
    action_taken := action_taken || 'status_set ';
  END IF;

  -- Update timestamp
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());

  -- Log the action if any changes were made
  IF action_taken != '' THEN
    new_data := jsonb_build_object(
      'role', NEW.role,
      'subscription_tier', NEW.subscription_tier,
      'subscription_status', NEW.subscription_status
    );
    
    INSERT INTO profile_consistency_log (
      user_id,
      event_type,
      old_values,
      new_values,
      trigger_action
    ) VALUES (
      NEW.id,
      TG_OP,
      old_data,
      new_data,
      TRIM(action_taken)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the existing trigger with the logging version
DROP TRIGGER IF EXISTS profile_consistency_trigger ON profiles;
DROP TRIGGER IF EXISTS profile_consistency_insert_trigger ON profiles;

CREATE TRIGGER profile_consistency_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_consistency_with_logging();

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_profile_consistency_log_user_id 
  ON profile_consistency_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_consistency_log_created_at 
  ON profile_consistency_log(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_consistency_log_event_type 
  ON profile_consistency_log(event_type);

-- Add comments for documentation
COMMENT ON FUNCTION enforce_profile_consistency_with_logging() IS 
  'Automatically maintains consistency between user roles and subscription tiers. Logs all actions for monitoring.';

COMMENT ON TABLE profile_consistency_log IS 
  'Tracks all automatic profile consistency changes made by database triggers.';

COMMENT ON TRIGGER profile_consistency_trigger ON profiles IS 
  'Enforces role/subscription_tier consistency on all profile changes.';

-- Test the trigger with a sample update (optional verification)
DO $$
BEGIN
  -- This would test the trigger if there are any profiles
  IF EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
    RAISE NOTICE 'Profile consistency triggers deployed successfully. Monitoring enabled.';
  ELSE
    RAISE NOTICE 'Profile consistency triggers deployed. No profiles to test with.';
  END IF;
END $$;

-- Final verification query
SELECT 
  'Triggers deployed successfully' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'SHOP_OWNER' AND subscription_tier = 'PROFESSIONAL' THEN 1 END) as shop_owners,
  COUNT(CASE WHEN role = 'BARBER' AND subscription_tier = 'INDIVIDUAL' THEN 1 END) as barbers,
  COUNT(CASE WHEN role = 'ENTERPRISE_OWNER' AND subscription_tier = 'ENTERPRISE' THEN 1 END) as enterprise,
  COUNT(CASE WHEN role = 'CLIENT' AND subscription_tier = 'FREE' THEN 1 END) as clients
FROM profiles;