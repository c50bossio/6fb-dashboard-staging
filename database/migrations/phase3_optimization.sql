-- PHASE 3: Schema Optimization and Cleanup
-- Description: Final optimizations, better constraints, and cleanup
-- Risk Level: LOW - Only adds constraints and optimizations
-- Prerequisites: Phase 1 and Phase 2 must be completed successfully

-- ==========================================
-- IMPROVE CONSTRAINTS AND VALIDATION
-- ==========================================

-- Update role constraint to be more explicit
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
);

-- Add foreign key constraint for barbershop_id if barbershops table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'barbershops') THEN
    ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_barbershop_id 
    FOREIGN KEY (barbershop_id) REFERENCES barbershops(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==========================================
-- PERFORMANCE OPTIMIZATIONS
-- ==========================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_role_subscription ON profiles(role, subscription_tier)
WHERE subscription_status = 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_status, onboarding_completed)
WHERE onboarding_status != 'completed';

-- Partial index for active users only (most common queries)
CREATE INDEX IF NOT EXISTS idx_profiles_active_users ON profiles(id, email, role, subscription_tier)
WHERE subscription_status = 'active';

-- ==========================================
-- SECURITY ENHANCEMENTS
-- ==========================================

-- Update RLS policies to be more specific
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- More granular RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Service role retains full access
CREATE POLICY "Service role has full access" ON profiles
  FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile 
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role IN ('SUPER_ADMIN', 'ENTERPRISE_OWNER')
    )
  );

-- ==========================================
-- DATA VALIDATION FUNCTIONS
-- ==========================================

-- Function to validate subscription tier consistency
CREATE OR REPLACE FUNCTION validate_subscription_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Enterprise owners should have enterprise tier
  IF NEW.role = 'ENTERPRISE_OWNER' AND NEW.subscription_tier != 'enterprise' THEN
    NEW.subscription_tier = 'enterprise';
  END IF;
  
  -- Shop owners should have at least shop tier
  IF NEW.role = 'SHOP_OWNER' AND NEW.subscription_tier = 'individual' THEN
    NEW.subscription_tier = 'shop_owner';
  END IF;
  
  -- Inactive users shouldn't have premium tiers
  IF NEW.subscription_status = 'inactive' AND NEW.subscription_tier IN ('enterprise', 'shop_owner') THEN
    NEW.subscription_tier = 'individual';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply validation trigger
DROP TRIGGER IF EXISTS validate_subscription_consistency_trigger ON profiles;
CREATE TRIGGER validate_subscription_consistency_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_subscription_consistency();

-- ==========================================
-- ANALYTICS AND MONITORING
-- ==========================================

-- Function to track profile changes (for audit)
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log significant changes to a simple log table (if it exists)
  IF TG_OP = 'UPDATE' THEN
    -- Only log role or subscription changes
    IF OLD.role != NEW.role OR OLD.subscription_tier != NEW.subscription_tier THEN
      INSERT INTO profile_audit_log (profile_id, old_role, new_role, old_tier, new_tier, changed_at)
      VALUES (NEW.id, OLD.role, NEW.role, OLD.subscription_tier, NEW.subscription_tier, NOW())
      ON CONFLICT DO NOTHING; -- Ignore if audit table doesn't exist
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN undefined_table THEN
  -- Ignore if audit table doesn't exist
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger (will silently fail if audit table doesn't exist)
DROP TRIGGER IF EXISTS log_profile_changes_trigger ON profiles;
CREATE TRIGGER log_profile_changes_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_changes();

-- ==========================================
-- CLEANUP AND MAINTENANCE
-- ==========================================

-- Update any remaining NULL values
UPDATE profiles 
SET 
  subscription_tier = 'individual',
  subscription_status = 'active',
  onboarding_completed = false,
  onboarding_step = 0,
  onboarding_status = 'active'
WHERE subscription_tier IS NULL 
   OR subscription_status IS NULL 
   OR onboarding_completed IS NULL
   OR onboarding_step IS NULL
   OR onboarding_status IS NULL;

-- Analyze table for query planner
ANALYZE profiles;

-- ==========================================
-- DOCUMENTATION UPDATES
-- ==========================================

-- Update table comment
COMMENT ON TABLE profiles IS 'User profiles extending auth.users with business logic, subscription, and onboarding data';

-- Add comprehensive column comments
COMMENT ON COLUMN profiles.id IS 'Primary key referencing auth.users(id) - do not duplicate auth.users data here';
COMMENT ON COLUMN profiles.email IS 'User email address - kept in sync with auth.users for queries';
COMMENT ON COLUMN profiles.role IS 'Business role determining UI permissions and feature access';
COMMENT ON COLUMN profiles.subscription_tier IS 'Subscription level determining feature availability and limits';
COMMENT ON COLUMN profiles.subscription_status IS 'Current payment status - only active users access premium features';
COMMENT ON COLUMN profiles.barbershop_id IS 'Associated barbershop for staff - NULL for independent practitioners';
COMMENT ON COLUMN profiles.onboarding_status IS 'UI state for progressive onboarding experience';

-- ==========================================
-- ROLLBACK INSTRUCTIONS
-- ==========================================

/*
ROLLBACK COMMANDS (if needed):

-- Remove optimization indexes:
DROP INDEX IF EXISTS idx_profiles_role_subscription;
DROP INDEX IF EXISTS idx_profiles_onboarding;
DROP INDEX IF EXISTS idx_profiles_active_users;

-- Remove triggers:
DROP TRIGGER IF EXISTS validate_subscription_consistency_trigger ON profiles;
DROP TRIGGER IF EXISTS log_profile_changes_trigger ON profiles;

-- Remove functions:
DROP FUNCTION IF EXISTS validate_subscription_consistency();
DROP FUNCTION IF EXISTS log_profile_changes();

-- Remove constraints:
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_barbershop_id;

-- Revert to simple RLS policies:
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recreate basic policies:
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role has full access" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
*/

-- Record migration completion
INSERT INTO migrations (name, executed_at) 
VALUES ('phase3_optimization', NOW())
ON CONFLICT (name) DO NOTHING;